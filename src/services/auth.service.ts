import {PrismaClient} from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import {appConfig} from '../config/app';
import {ErrorCodes, throwError} from '../utils/errors';
import type {
    EmployeeJwtPayload,
    EmployeeRegisterRequestBody,
    LoginRequestBody,
    RefreshTokenPayload,
    TokenResponse,
    UserJwtPayload,
    UserRegisterRequestBody,
} from '../types/auth';
import {EmployeeRole,} from '../types/auth';
import {UserDeviceService} from "./user-device.service";
import {SyncTrackingService} from "./sync-tracking.service";
import redisClient, {blacklistToken, isTokenBlacklisted} from "../utils/redis";


class AuthService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async loginUser({ email, password, rememberMe = false, deviceName, deviceId, deviceType, fcmToken, ipAddress }: LoginRequestBody & { deviceName?: string; deviceId?: string; deviceType?: string; fcmToken?: string; ipAddress?: string }): Promise<TokenResponse> {
        const user = await this.prisma.users.findUnique({ where: { Email: email } });
        if (!user) throwError(ErrorCodes.INVALID_CREDENTIALS, 'User not found');
        const isPasswordValid = await bcrypt.compare(password, user!.PasswordHash);
        if (!isPasswordValid) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid password');

        if (!deviceId || !deviceName || !deviceType) throwError(ErrorCodes.BAD_REQUEST, 'Device ID, Name, and Type are required');

        const userDeviceService = new UserDeviceService();
        const syncTrackingService = new SyncTrackingService();
        const device = await userDeviceService.upsertDevice(user!.UserID, deviceName!, deviceId!, deviceType!, fcmToken);
        if (ipAddress) {
            await syncTrackingService.recordLogin(user!.UserID, device.UserDeviceID, ipAddress);
        }

        const accessToken = jwt.sign(
            { userId: user!.UserID, email: user!.Email, role: 'user' } as UserJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );

        const response: TokenResponse = { accessToken };

        if (rememberMe) {
            const refreshToken = jwt.sign(
                { userId: user!.UserID, type: 'refresh' } as RefreshTokenPayload,
                appConfig.jwtSecret,
                { expiresIn: '30d' }
            );
            if (await isTokenBlacklisted(refreshToken)) {
                throwError(ErrorCodes.FORBIDDEN, 'Refresh token is blacklisted');
            }
            response.refreshToken = refreshToken;
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
            { expiresIn: '8h' }
        );

        const refreshToken = jwt.sign(
            { employeeId: employee!.EmployeeID, type: 'refresh' } as RefreshTokenPayload,
            appConfig.jwtSecret,
            { expiresIn: '8h' }
        );

        // Invalidate previous session
        const previousAccessToken = await redisClient.get(`employee:token:${employee!.EmployeeID}`);
        const previousRefreshToken = await redisClient.get(`employee:refresh:${employee!.EmployeeID}`);
        if (previousAccessToken) {
            await blacklistToken(previousAccessToken, 8 * 60 * 60);
        }
        if (previousRefreshToken) {
            await blacklistToken(previousRefreshToken, 8 * 60 * 60);
        }

        // Store new tokens in Redis
        await redisClient.setEx(`employee:token:${employee!.EmployeeID}`, 8 * 60 * 60, accessToken);
        await redisClient.setEx(`employee:refresh:${employee!.EmployeeID}`, 8 * 60 * 60, refreshToken);

        return { accessToken, refreshToken };
    }

    async refreshEmployeeToken(refreshToken: string): Promise<string> {
        const decoded = jwt.verify(refreshToken, appConfig.jwtSecret) as RefreshTokenPayload;
        if (decoded.type !== 'refresh' || !decoded.employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token');
        }

        const storedRefreshToken = await redisClient.get(`employee:refresh:${decoded.employeeId}`);
        if (!storedRefreshToken || storedRefreshToken !== refreshToken || await isTokenBlacklisted(refreshToken)) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Refresh token is invalid, expired, or blacklisted');
        }

        const employee = await this.prisma.employees.findUnique({ where: { EmployeeID: decoded.employeeId } });
        if (!employee) throwError(ErrorCodes.UNAUTHORIZED, 'Employee not found');

        const newAccessToken = jwt.sign(
            { employeeId: employee!.EmployeeID, email: employee!.Email, role: employee!.Role } as EmployeeJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '8h' }
        );

        await redisClient.setEx(`employee:token:${employee!.EmployeeID}`, 8 * 60 * 60, newAccessToken);
        return newAccessToken;
    }

    async refreshToken(refreshToken: string): Promise<string> {
        const decoded = jwt.verify(refreshToken, appConfig.jwtSecret) as RefreshTokenPayload;
        if (decoded.type !== 'refresh') throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token');

        if (decoded.userId) {
            const user = await this.prisma.users.findUnique({ where: { UserID: decoded.userId } });
            if (!user) throwError(ErrorCodes.UNAUTHORIZED, 'User not found');
            if (await isTokenBlacklisted(refreshToken)) {
                throwError(ErrorCodes.UNAUTHORIZED, 'Refresh token is blacklisted');
            }
            return jwt.sign(
                { userId: user!.UserID, email: user!.Email, role: 'user' } as UserJwtPayload,
                appConfig.jwtSecret,
                { expiresIn: '1h' }
            );
        } else if (decoded.employeeId) {
            return this.refreshEmployeeToken(refreshToken);
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

        return jwt.sign(
            {userId: user!.UserID, email: user!.Email, role: 'user'} as UserJwtPayload,
            appConfig.jwtSecret,
            {expiresIn: '1h'}
        );
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

        return jwt.sign(
            {employeeId: employee!.EmployeeID, email: employee!.Email, role} as EmployeeJwtPayload,
            appConfig.jwtSecret,
            {expiresIn: '1h'}
        );
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



    async logoutDevice(userDeviceId: number, userId: number, ipAddress?: string) {
        const userDeviceService = new UserDeviceService();
        return userDeviceService.logoutDevice(userDeviceId, userId, ipAddress);
    }

    async logoutEmployee(employeeId: number) {
        const currentToken = await redisClient.get(`employee:token:${employeeId}`);
        const refreshToken = await redisClient.get(`employee:refresh:${employeeId}`);

        if (currentToken) {
            await blacklistToken(currentToken, 8 * 60 * 60);
            await redisClient.del(`employee:token:${employeeId}`);
        }
        if (refreshToken) {
            await blacklistToken(refreshToken, 8 * 60 * 60);
            await redisClient.del(`employee:refresh:${employeeId}`);
        }
    }


}

export default AuthService;