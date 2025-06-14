import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { appConfig } from '../config/app';
import { ErrorCodes, throwError } from '../utils/errors'
import {generateAccountId, generateCustomerId, generateEmployeeId} from '../utils/helpers'
import type {
    EmployeeJwtPayload,
    EmployeeRegisterRequestBody,
    LoginRequestBody,
    RefreshTokenPayload,
    TokenResponse,
    UserJwtPayload,
    UserRegisterRequestBody,
} from '../types/auth';
import { UserDeviceService } from './user-device.service';
import { SyncTrackingService } from './sync-tracking.service';
import redisClient, { blacklistToken, isTokenBlacklisted } from '../utils/redis';

class AuthService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async loginUser({
                        username,
                        password,
                        rememberMe = false,
                        deviceName,
                        deviceId,
                        deviceUuid,
                        ipAddress,
                    }: LoginRequestBody & { deviceName: string; deviceId: string; deviceUuid?: string; ipAddress?: string }): Promise<TokenResponse> {
        const account = await this.prisma.account.findFirst({ where: { username } });
        if (!account) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Account not found');

        if (!account!.password) {
            throwError(ErrorCodes.INVALID_CREDENTIALS, 'Account password not set');
        } else {
            const isPasswordValid = await bcrypt.compare(password, account!.password);
            if (!isPasswordValid) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid password');
        }

        if (!deviceId || !deviceName) {
            throwError(ErrorCodes.BAD_REQUEST, 'Device ID and Name are required');
        }

        const userDeviceService = new UserDeviceService();
        const syncTrackingService = new SyncTrackingService();
        const device = await userDeviceService.upsertDevice(account!.account_id, deviceName, deviceId, deviceUuid || null);
        if (ipAddress) {
            await syncTrackingService.recordLogin(account!.account_id, device.user_device_id, ipAddress);
        }

        const accessToken = jwt.sign(
            { userId: account!.account_id, username: account!.username, role: account!.role_id || 'user' } as UserJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );

        const response: TokenResponse = {
            accessToken,
            userId: account!.account_id

        };

        if (rememberMe) {
            const refreshToken = jwt.sign(
                { userId: account!.account_id, type: 'refresh' } as RefreshTokenPayload,
                appConfig.jwtSecret,
                { expiresIn: '30d' }
            );
            const isBlacklisted = await isTokenBlacklisted(refreshToken);
            if (isBlacklisted) {
                throwError(ErrorCodes.FORBIDDEN, 'Refresh token is blacklisted');
            } else {
                response.refreshToken = refreshToken;
            }
        }

        if (device.device_uuid) {
            response.deviceUuid = device.device_uuid;
        }

        console.log("res", response)

        return response;
    }

    async loginEmployee({ username, password }: LoginRequestBody): Promise<TokenResponse> {
        const account = await this.prisma.account!.findFirst({ where: { username: username } });
        if (!account!) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Account not found');

        if (!account!.password) {
            throwError(ErrorCodes.INVALID_CREDENTIALS, 'Account password not set');
        } else {
            const isPasswordValid = await bcrypt.compare(password, account!.password);
            if (!isPasswordValid) throwError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid password');
        }

        const accessToken = jwt.sign(
            { employeeId: account!.account_id, username: account!.username, role: account!.role_id || 'employee' } as EmployeeJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '8h' }
        );

        const refreshToken = jwt.sign(
            { employeeId: account!.account_id, type: 'refresh' } as RefreshTokenPayload,
            appConfig.jwtSecret,
            { expiresIn: '8h' }
        );

        // Redis logic - có thể comment để disable
        const previousAccessToken = await redisClient.get(`employee:token:${account!.account_id}`);
        const previousRefreshToken = await redisClient.get(`employee:refresh:${account!.account_id}`);
        if (previousAccessToken) {
            await blacklistToken(previousAccessToken, 8 * 60 * 60);
        }
        if (previousRefreshToken) {
            await blacklistToken(previousRefreshToken, 8 * 60 * 60);
        }
        await redisClient.setex(`employee:token:${account!.account_id}`, 8 * 60 * 60, accessToken);
        await redisClient.setex(`employee:refresh:${account!.account_id}`, 8 * 60 * 60, refreshToken);

        return {
            accessToken,
            refreshToken,
            employeeId: account!.account_id
        };
    }

    async refreshEmployeeToken(refreshToken: string): Promise<string> {
        const decoded = jwt.verify(refreshToken, appConfig.jwtSecret) as RefreshTokenPayload;
        if (decoded.type !== 'refresh' || !decoded.employeeId) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token');
        }

        // Redis logic - có thể comment để disable
        const storedRefreshToken = await redisClient.get(`employee:refresh:${decoded.employeeId}`);
        if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Refresh token is invalid or expired');
        } else {
            const isBlacklisted = await isTokenBlacklisted(refreshToken);
            if (isBlacklisted) {
                throwError(ErrorCodes.UNAUTHORIZED, 'Refresh token is blacklisted');
            }
        }

        const account = await this.prisma.account!.findUnique({ where: { account_id: decoded.employeeId } });
        if (!account!) throwError(ErrorCodes.UNAUTHORIZED, 'Account not found');

        const newAccessToken = jwt.sign(
            { employeeId: account!.account_id,username: account!.username, role: account!.role_id || 'employee' } as EmployeeJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '8h' }
        );

        // Redis logic - có thể comment để disable
        await redisClient.setex(`employee:token:${account!.account_id}`, 8 * 60 * 60, newAccessToken);
        return newAccessToken;
    }

    async refreshToken(refreshToken: string): Promise<string> {
        const decoded = jwt.verify(refreshToken, appConfig.jwtSecret) as RefreshTokenPayload;
        if (decoded.type !== 'refresh') throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token');

        const accountId = decoded.userId || decoded.employeeId;
        if (!accountId) throwError(ErrorCodes.UNAUTHORIZED, 'Invalid refresh token payload');

        const account = await this.prisma.account!.findUnique({ where: { account_id: accountId } });
        if (!account!) throwError(ErrorCodes.UNAUTHORIZED, 'Account not found');

        // Redis logic - có thể comment để disable
        const isBlacklisted = await isTokenBlacklisted(refreshToken);
        if (isBlacklisted) {
            throwError(ErrorCodes.UNAUTHORIZED, 'Refresh token is blacklisted');
        }

        const role = account!.role_id || (decoded.userId ? 'user' : 'employee');
        const payload = decoded.userId
            ? { userId: account!.account_id, username: account!.username, role } as UserJwtPayload
            : { employeeId: account!.account_id, username: account!.username, role } as EmployeeJwtPayload;

        return jwt.sign(payload, appConfig.jwtSecret, { expiresIn: decoded.userId ? '1h' : '8h' });
    }

    async registerUser(data: UserRegisterRequestBody): Promise<any> {
        const { surname, lastname, image, phone, email, birthdate, gender, password, username } = data;

        // Check for existing username
        const existingUsername = await this.prisma.account.findFirst({ where: { username } });
        if (existingUsername) throwError(ErrorCodes.CONFLICT, 'Username already exists');

        let accountId: string='';
        let customerId: string='';
        let attempts = 0;
        const maxAttempts = 5;
        // Check for existing email if provided
        if (email) {
            do {
                accountId = generateAccountId();
                customerId = generateCustomerId();
                const idExists = await this.prisma.account.findFirst({ where: { account_id: accountId } });
                const customerExists = await this.prisma.customer.findFirst({ where: { customer_id: customerId } });
                if (!idExists && !customerExists) break;
                attempts++;
                if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
            } while (true);
            const existingEmail = await this.prisma.customer.findFirst({ where: { email } });
            if (existingEmail) throwError(ErrorCodes.CONFLICT, 'Email already exists');
        }



        const passwordHash = await bcrypt.hash(password, 12);
        const account = await this.prisma.account.create({
            data: {
                account_id: accountId,
                username,
                password: passwordHash,
                customer: {
                    create: {   
                        customer_id: customerId,
                        surname,
                        lastname: lastname || null,
                        image: image || null,
                        phone: phone || null,
                        email: email || null,
                        birthdate: birthdate ? new Date(birthdate) : null,
                        gender: gender !== undefined ? gender : null,
                    },
                },
            },
        });

        const accessToken = jwt.sign(
            { userId: account.account_id, username: account.username, role: 'user' } as UserJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );

        return {
            success: true,
            accessToken: accessToken,
        }
    }
    async registerEmployee(data: EmployeeRegisterRequestBody, adminId: string): Promise<any> {
        const { surname, lastname, image, email, password, birthdate, gender, phone, status, role, username } = data; // Thêm username

        const admin = await this.prisma.account.findFirst({ where: { account_id: adminId } });
        if (!admin) throwError(ErrorCodes.FORBIDDEN, 'Admin account not found');
        if (admin!.role_id !== 1) throwError(ErrorCodes.FORBIDDEN, 'Only admins can create employees');

        const existingAccount = await this.prisma.account.findFirst({ where: { username } }); // Kiểm tra username
        if (existingAccount) throwError(ErrorCodes.CONFLICT, 'Username already exists');

        const roleRecord = await this.prisma.role.findFirst({ where: { name: role } });
        if (!roleRecord) throwError(ErrorCodes.NOT_FOUND, `Role '${role}' not found`);

        let accountId: string='';
        let employeeId: string='';
        let attempts = 0;
        const maxAttempts = 5;
        do {
            accountId = generateAccountId();
            employeeId = generateEmployeeId();
            const idExists = await this.prisma.account.findFirst({ where: { account_id: accountId } });
            const employeeExists = await this.prisma.employee.findFirst({ where: { employee_id: employeeId } });
            if (!idExists && !employeeExists) break;
            attempts++;
            if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Unable to generate unique ID');
        } while (true);

        const passwordHash = await bcrypt.hash(password, 12);

        // Step 1: Create the account first
        const account = await this.prisma.account.create({
            data: {
                account_id: accountId,
                username,
                password: passwordHash,
                role_id: roleRecord!.id,
                // employee_id will be set after employee is created
            },
        });

        // Step 2: Create the employee and link to account
        const employee = await this.prisma.employee.create({
            data: {
                employee_id: employeeId,
                surname,
                lastname: lastname || null,
                image: image || null,
                email: email || null, // email là tùy chọn
                birthdate: birthdate ? new Date(birthdate) : null,
                gender: gender !== undefined ? gender : null,
                phone: phone || null,
                status: status !== undefined ? status : null,
            },
        });

        // Optionally update account with employee_id if needed
        await this.prisma.account.update({
            where: { account_id: accountId },
            data: { employee_id: employeeId },
        });


        const accessToken = jwt.sign(
            { employeeId: account.account_id, username: account.username, role } as EmployeeJwtPayload,
            appConfig.jwtSecret,
            { expiresIn: '1h' }
        );

        return {
            success: true,
            accessToken: accessToken,
        }
    }

    async logoutEmployee(employeeId: string) {
        // Redis logic - có thể comment để disable
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

    async updateDeviceToken(accountId: string, deviceToken: string): Promise<{ success: boolean; message: string }> {
        const userDeviceService = new UserDeviceService();

        const account = await this.prisma.account.findFirst({ where: { account_id: accountId } });
        if (!account) {
            return { success: false, message: 'Account not found' };
        }

        // Tìm thiết bị gần đây nhất của account để cập nhật token
        const latestDevice = await userDeviceService.getUserDevices(accountId);
        if (!latestDevice || latestDevice.length === 0) {
            return { success: false, message: 'No active devices found for this account' };
        }

        // Cập nhật token cho thiết bị gần đây nhất
        await this.prisma.user_devices.update({
            where: { user_device_id: latestDevice[0].user_device_id },
            data: { device_token: deviceToken, updated_at: new Date() },
        });

        return { success: true, message: 'Device token updated successfully' };
    }

    async checkEmailVerification(email: string): Promise<{
        exists: boolean;
        isVerified: boolean;
        message: string;
    }> {
        const customer = await this.prisma.customer.findFirst({
            where: {
                email,
                deleted_at: null
            },
            include: {
                account: {
                    where: {
                        is_locked: false,
                        deleted_at: null
                    }
                }
            }
        });

        if (!customer) {
            return {
                exists: false,
                isVerified: false,
                message: 'Email not found'
            };
        }

        if (customer.account.length === 0) {
            return {
                exists: true,
                isVerified: false,
                message: 'Account is locked or deleted'
            };
        }

        return {
            exists: true,
            isVerified: customer.email_verified || false,
            message: customer.email_verified ? 'Email is verified' : 'Email is not verified'
        };
    }

    async verifyEmail(email: string): Promise<{ success: boolean; message: string }> {
        const customer = await this.prisma.customer.findFirst({
            where: {
                email,
                deleted_at: null
            }
        });

        if (!customer) {
            throwError(ErrorCodes.NOT_FOUND, 'Email not found');
        }

        await this.prisma.customer.update({
            where: { customer_id: customer!.customer_id },
            data: {
                email_verified: true,
                updated_at: new Date()
            }
        });

        return {
            success: true,
            message: 'Email verified successfully'
        };
    }

    async updateUser(userId: string, data: {
        surname?: string;
        lastname?: string;
        phone?: string;
        email?: string;
        birthdate?: string;
        gender?: boolean;
        image?: string;
    }): Promise<any> {
        const account = await this.prisma.account.findFirst({
            where: { account_id: userId },
            include: { customer: true }
        });

        if (!account || !account.customer) {
            throwError(ErrorCodes.NOT_FOUND, 'User not found');
        }

        const updateData: any = { ...data };

        // Nếu email thay đổi, cập nhật trạng thái verified
        if (data.email && data.email !== account!.customer!.email) {
            // Kiểm tra email mới có tồn tại chưa
            const existingEmail = await this.prisma.customer.findFirst({
                where: {
                    email: data.email,
                    customer_id: { not: account!.customer!.customer_id }
                }
            });

            if (existingEmail) {
                throwError(ErrorCodes.CONFLICT, 'Email already exists');
            }

            updateData.email_verified = false;
        }

        if (data.birthdate) {
            updateData.birthdate = new Date(data.birthdate);
        }

        const customer = await this.prisma.customer.update({
            where: { customer_id: account!.customer!.customer_id },
            data: {
                ...updateData,
                updated_at: new Date()
            }
        });

        return {
            success: true,
            data: customer
        };
    }

    async recoveryPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        const customer = await this.prisma.customer.findFirst({
            where: {
                email,
                deleted_at: null
            },
            include: {
                account: {
                    where: {
                        deleted_at: null,
                        is_locked: false
                    }
                }
            }
        });

        if (!customer || customer.account.length === 0) {
            throwError(ErrorCodes.NOT_FOUND, 'Account not found or inactive');
        }

        if (!customer!.email_verified) {
            throwError(ErrorCodes.FORBIDDEN, 'Email not verified');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.account.update({
            where: { account_id: customer!.account[0].account_id },
            data: {
                password: passwordHash,
                updated_at: new Date()
            }
        });

        return {
            success: true,
            message: 'Password updated successfully'
        };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {

        const account = await this.prisma.account.findFirst({
            where: {
                account_id: userId,
            }
        })

        if (!account) {
            throwError(ErrorCodes.NOT_FOUND, 'Account not found');
        }

        const isMatch = await bcrypt.compare(currentPassword, account!.password!);

        if(!isMatch) {
            throwError(ErrorCodes.BAD_REQUEST, 'Incorrect password');
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await this.prisma.account.update({
            where: { account_id: userId },
            data: {
                password: passwordHash,
                updated_at: new Date()
            }
        });

        return {
            success: true,
            message: 'Password updated successfully'
        };
    }

    async getMe(userId: string) {

        try {
            const user = await this.prisma.account.findFirst({
                where: {
                    account_id: userId,
                    deleted_at: null
                },
                include: {
                    customer: {
                        select: {
                            customer_id: true,
                            lastname: true,
                            surname: true,
                            phone: true,
                            email: true,
                            gender: true,
                            image: true,
                            birthdate: true,
                            email_verified: true,
                        }
                    }
                }
            })

            const formatUser = {
                account_id: user?.account_id,
                customer_id: user?.customer_id,
                username: user?.username,
                fullname: user?.customer?.surname + " " + user?.customer?.lastname,
                birthdate: user?.customer?.birthdate,
                phone: user?.customer?.phone,
                email: user?.customer?.email,
                gender: user?.customer?.gender,
                image: user?.customer?.image,
                email_verified: user?.customer?.email_verified,
            }
    
            return {
                success: true,
                data: formatUser,
            }
        } catch (error) {
            console.error(error);
        }
    }
}

export default AuthService;
