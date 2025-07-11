import prisma from '../config/database'; // hoặc đường dẫn đúng tới prisma client

export class DeviceCapabilitiesService {
    async create({ keyword, note }: { keyword: string; note?: string }) {
        // Kiểm tra trùng keyword
        const existed = await prisma.device_capabilities.findFirst({
            where: { keyword, is_deleted: false }
        });
        if (existed) {
            throw { status: 409, message: 'Keyword đã tồn tại!' };
        }
        return prisma.device_capabilities.create({
            data: { keyword, note }
        });
    }

    async list() {
        const data = await prisma.device_capabilities.findMany({
            where: { is_deleted: false },
            orderBy: { id: 'asc' }
        });
        return data;
    }

    async softDelete(id: number) {
        const existed = await prisma.device_capabilities.findUnique({ where: { id } });
        if (!existed || existed.is_deleted) {
            throw { status: 404, message: 'ID không tồn tại!' };
        }
        return prisma.device_capabilities.update({
            where: { id },
            data: { is_deleted: true, updated_at: new Date() }
        });
    }
}

export default new DeviceCapabilitiesService(); 