import { Request, Response, NextFunction } from 'express';
import deviceCapabilitiesService from '../services/device-capabilities.service';

class DeviceCapabilitiesController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { keyword, note } = req.body;
            const data = await deviceCapabilitiesService.create({ keyword, note });
            res.status(201).json({
                message: 'Thêm capability thành công!',
                data
            });
        } catch (err: any) {
            res.status(err.status || 500).json({ message: err.message || 'Lỗi server!' });
        }
    }

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await deviceCapabilitiesService.list();
            res.json({
                message: 'Lấy danh sách capability thành công!',
                data
            });
        } catch (err) {
            next(err);
        }
    }

    async softDelete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const data = await deviceCapabilitiesService.softDelete(Number(id));
            res.json({
                message: 'Xóa capability thành công!',
                data
            });
        } catch (err: any) {
            res.status(err.status || 500).json({ message: err.message || 'Lỗi server!' });
        }
    }
}

export default new DeviceCapabilitiesController();
