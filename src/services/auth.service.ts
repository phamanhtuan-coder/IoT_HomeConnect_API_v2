import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { appConfig } from '../config/app';
import { throwError, ErrorCodes } from '../utils/errors';
import type {
    LoginRequestBody,
    UserJwtPayload,
    EmployeeJwtPayload,
    TokenResponse,
    RefreshTokenPayload, UserRegisterRequestBody, EmployeeRegisterRequestBody,
} from '../types/auth';

import {
    EmployeeRole,
} from '../types/auth';
import {UserDeviceService} from "./user-device.service";
import {SyncTrackingService} from "./sync-tracking.service";


class AuthService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async loginUser({ email, password, rememberMe = false, deviceName, deviceId, deviceToken, ipAddress }: LoginRequestBody & { deviceName?: string; deviceId?: string; deviceToken?: string; ipAddress?: string }): Promise<TokenResponse> {
        const user = await this.prisma.users.findUnique({ where: { Email: email } });
        if (!user) throwError(ErrorCodes.INVALID_CREDENTIALS, 'User not found');
        const isPasswordValid = await bcrypt.compare(password, user!.PasswordHash);
        if (!isPasswordValid) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid password');

        const accessToken = jwt.sign(
            { userId: user!.UserID, email: user!.Email, role: 'user' } as UserJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );

        const response: TokenResponse = { accessToken };

        if (deviceName && deviceId) {
            const userDeviceService = new UserDeviceService();
            const syncTrackingService = new SyncTrackingService();
            const device = await userDeviceService.upsertDevice(user!.UserID, deviceName, deviceId, deviceToken);
            if (ipAddress) {
                await syncTrackingService.recordLogin(user!.UserID, device.UserDeviceID, ipAddress);
            }
        }

        if (rememberMe) {
            const refreshToken = jwt.sign(
                { userId: user!.UserID, type: 'refresh' } as RefreshTokenPayload,
                appConfig.jwtSecret,
                { expiresIn: '30d' }
            );
            response.refreshToken = refreshToken;
            if (deviceId) {
                await this.prisma.user_devices.updateMany({
                    where: { UserID: user!.UserID, DeviceID: deviceId, IsDeleted: false },
                    data: { DeviceToken: refreshToken },
                });
            }
        }
        return response;
    }

    async loginEmployee({ email, password }: LoginRequestBody): Promise<TokenResponse> {
        const employee = await this.prisma.employees.findUnique({ where: { Email: email } });
        if (!employee) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Employee not found');
        const isPasswordValid = await bcrypt.compare(password, employee!.PasswordHash);
        if (!isPasswordValid) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid password');

        const accessToken = jwt.sign(
            { employeeId: employee!.EmployeeID, email: employee!.Email, role: employee!.Role } as EmployeeJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );

        // No persistent refresh token stored; client must re-login after session ends
        return { accessToken };
    }

    async refreshEmployeeToken(refreshToken: string): Promise<string> {
        const decoded = jwt.verify(refreshToken, appConfig.jwtSecret) as RefreshTokenPayload;
        if (decoded.type !== 'refresh' || !decoded.employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token');
        }

        const employee = await this.prisma.employees.findUnique({ where: { EmployeeID: decoded.employeeId } });
        if (!employee) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not found');

        return jwt.sign(
            { employeeId: employee!.EmployeeID, email: employee!.Email, role: employee!.Role } as EmployeeJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );
    }

    async refreshToken(refreshToken: string): Promise<string> {
        const decoded = jwt.verify(refreshToken, appConfig.jwtSecret) as RefreshTokenPayload;
        if (decoded.type !== 'refresh') throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token');

        if (decoded.userId) {
            const user = await this.prisma.users.findUnique({ where: { UserID: decoded.userId } });
            if (!user) throwError(ErrorCodes.UNAUTHORIZED, 'User not found');
            return jwt.sign(
                { userId: user!.UserID, email: user!.Email, role: 'user' } as UserJwtPayload,
                appConfig.jwtSecret,
                { expiresIn: '1h' }
            );
        } else {
         return throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token payload');
        }
    }

    async registerUser(data: UserRegisterRequestBody): Promise<string> {
        const { email, password, name, phone, address, dateOfBirth } = data;

        const existingUser = await this.prisma.users.findUnique({ where: { Email: email } });
        if (existingUser) throwError(ErrorCodes.CONFLICT, 'User already exists');

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.prisma.users.create({
            data: {
                Email: email,
                PasswordHash: passwordHash,
                Name: name,
                Phone: phone,
                Address: address,
                DateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            },
        });

        const token = jwt.sign(
            { userId: user!.UserID, email: user!.Email, role: 'user' } as UserJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );
        return token;
    }

    async registerEmployee(data: EmployeeRegisterRequestBody, adminId: number): Promise<string> {
        const { name, email, password, role = EmployeeRole.EMPLOYEE, phone } = data;

        const admin = await this.prisma.employees.findUnique({ where: { EmployeeID: adminId } });
        if (!admin || admin.Role !== EmployeeRole.ADMIN) {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can create employees');
        }

        const existingEmployee = await this.prisma.employees.findUnique({ where: { Email: email } });
        if (existingEmployee) throwError(ErrorCodes.CONFLICT, 'Employee already exists');

        const passwordHash = await bcrypt.hash(password, 10);
        const employee = await this.prisma.employees.create({
            data: { Name: name, Email: email, PasswordHash: passwordHash, Role: role, Phone: phone },
        });

        const permissionType = this.getPermissionTypeForRole(role);
        await this.prisma.employeepermissions.create({
            data: { EmployeeID: employee!.EmployeeID, PermissionType: permissionType },
        });

        const token = jwt.sign(
            { employeeId: employee!.EmployeeID, email: employee!.Email, role } as EmployeeJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );
        return token;
    }

    private getPermissionTypeForRole(role: EmployeeRole): string {
        switch (role) {
            case EmployeeRole.ADMIN:
                return 'all';
            case EmployeeRole.PRODUCTION:
                return 'edit_production';
            case EmployeeRole.TECHNICIAN:
                return 'view_hub';
            case EmployeeRole.RND:
                return 'edit_rnd';
            case EmployeeRole.EMPLOYEE:
                return 'view_only';
            default:
                return 'view_only';
        }
    }

    // CRUD for Users
    async getUser(userId: number) {
        const user = await this.prisma.users.findUnique({ where: { UserID: userId } });
        if (!user) throwError(ErrorCodes.NOT_FOUND, 'User not found');
        return user;
    }

    async updateUser(userId: number, data: Partial<UserRegisterRequestBody>) {
        const user = await this.prisma.users.update({
            where: { UserID: userId },
            data: {
                Name: data.name,
                Phone: data.phone,
                Address: data.address,
                DateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            },
        });
        return user;
    }

    async deleteUser(userId: number) {
        await this.prisma.users.update({
            where: { UserID: userId },
            data: { IsDeleted: true },
        });
    }

    // CRUD for Employees
    async getEmployee(employeeId: number) {
        const employee = await this.prisma.employees.findUnique({ where: { EmployeeID: employeeId } });
        if (!employee) throwError(ErrorCodes.NOT_FOUND, 'Employee not found');
        return employee;
    }

    async updateEmployee(employeeId: number, data: Partial<EmployeeRegisterRequestBody>, adminId: number) {
        const admin = await this.prisma.employees.findUnique({ where: { EmployeeID: adminId } });
        if (!admin || admin.Role !== EmployeeRole.ADMIN) {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can update employees');
        }

        const employee = await this.prisma.employees.update({
            where: { EmployeeID: employeeId },
            data: {
                Name: data.name,
                Phone: data.phone,
                Role: data.role,
            },
        });
        return employee;
    }

    async deleteEmployee(employeeId: number, adminId: number) {
        const admin = await this.prisma.employees.findUnique({ where: { EmployeeID: adminId } });
        if (!admin || admin.Role !== EmployeeRole.ADMIN) {
            throwError(ErrorCodes.FORBIDDEN, 'Only admins can delete employees');
        }

        await this.prisma.employees.update({
            where: { EmployeeID: employeeId },
            data: { IsDeleted: true },
        });
    }


}

export default AuthService;