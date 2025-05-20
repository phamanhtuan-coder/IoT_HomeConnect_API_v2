import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Middleware xác thực dữ liệu request bằng schema Zod.
 *
 * @param schema - Schema Zod để kiểm tra dữ liệu request.
 * @returns Middleware Express kiểm tra body, query, params của request.
 * Nếu dữ liệu không hợp lệ, trả về lỗi 400 với thông báo lỗi.
 */
const validateMiddleware = (schema: AnyZodObject) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    };
};
export default validateMiddleware;
