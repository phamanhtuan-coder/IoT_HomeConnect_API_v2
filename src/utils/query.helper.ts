import { PrismaClient, Prisma } from '@prisma/client';
import prisma from "../config/database";

class QueryHelper {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma
    }

    // Hàm chạy truy vấn SELECT, trả về dữ liệu
    async queryRaw<T>(query: string, params: any[] = []): Promise<T[]> {
        const result = await this.prisma.$queryRawUnsafe<T[]>(query, ...params);
        return Array.isArray(result) ? result : [result];
    }

    /**
     * Kiểm tra xem một bản ghi có tồn tại theo ID trong một model Prisma.
     * @param id - ID của bản ghi cần kiểm tra.
     * @param model - Prisma model (VD: prisma.user, prisma.post, ...).
     * @returns Promise<object|undefined> - Trả về bản ghi nếu tồn tại, ngược lại trả về undefined.
     */
    async isExistId(id: string | number, model: any): Promise<any | undefined> {
        if (model && typeof model.findFirst === 'function') {
            // Convert id to integer if it's a string
            const numericId = typeof id === 'string' ? parseInt(id) : id;

            // Check if the conversion was successful
            if (isNaN(numericId)) {
                return undefined;
            }

            const existingRecord = await model.findFirst({
                where: {
                    id: numericId,
                    deleted_at: null
                }
            });
            return existingRecord || undefined;
        }
        return undefined;
    }

    async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }
}

export default new QueryHelper();
