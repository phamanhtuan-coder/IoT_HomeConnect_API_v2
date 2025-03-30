import { PrismaClient } from '@prisma/client';
import {ErrorCodes, throwError} from "../utils/errors";
import {UserRegisterRequestBody} from "../types/auth";

export class UserService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async getUser(userId: number) {
        const user = await this.prisma.users.findUnique({ where: { UserID: userId } });
        if (!user) throwError(ErrorCodes.NOT_FOUND, 'User not found');
        return user;
    }

    async getAllUsers(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const users = await this.prisma.users.findMany({
            where: { IsDeleted: false },
            skip,
            take: limit,
            orderBy: { CreatedAt: 'desc' },
        });
        const total = await this.prisma.users.count({ where: { IsDeleted: false } });
        return { users, total, page, limit };
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
}