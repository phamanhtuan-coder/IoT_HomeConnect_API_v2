import { Request, Response, NextFunction } from 'express';

/**
 * Middleware ghi log cho mỗi request đến server.
 * Ghi lại phương thức HTTP, đường dẫn và thời gian hiện tại.
 *
 * @param req - Đối tượng Request của Express
 * @param res - Đối tượng Response của Express
 * @param next - Hàm callback để chuyển sang middleware tiếp theo
 */
const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
};

export default loggerMiddleware;