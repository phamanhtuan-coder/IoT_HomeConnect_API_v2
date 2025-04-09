import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

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
