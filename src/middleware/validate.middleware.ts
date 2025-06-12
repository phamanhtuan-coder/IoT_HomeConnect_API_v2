// import { Request, Response, NextFunction } from 'express';
// import { AnyZodObject } from 'zod';

// /**
//  * Middleware xác thực dữ liệu request bằng schema Zod.
//  *
//  * @param schema - Schema Zod để kiểm tra dữ liệu request.
//  * @returns Middleware Express kiểm tra body, query, params của request.
//  * Nếu dữ liệu không hợp lệ, trả về lỗi 400 với thông báo lỗi.
//  */
// const validateMiddleware = (schema: AnyZodObject) => {
//     return (req: Request, res: Response, next: NextFunction) => {
//         try {
//             schema.parse({
//                 body: req.body,
//                 query: req.query,
//                 params: req.params,
//             });
//             next();
//         } catch (error) {
//             res.status(400).json({ error: (error as Error).message });
//         }
//     };
// };
// export default validateMiddleware;

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

interface ValidationError {
    path: string;
    content: string;
    field: string;
    message: string;
    error_code: number;
    code: string;
}

interface ValidationRequest {
    body: any;
    query: any;
    params: any;
}

const validateMiddleware = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): any => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            } as ValidationRequest);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                console.log('=== VALIDATION ERRORS ===');
                console.log('Raw errors:', JSON.stringify(error.errors, null, 2));
                
                const formattedErrors: ValidationError[] = error.errors.map(err => {
                    
                    const match = err.message.match(/\[(\d+)\](.+)/);
                    
                    let code: number;
                    let message: string;
                    
                    if (match) {
                        [code, message] = match.slice(1).map((val, index) => 
                            index === 0 ? Number(val) : String(val)
                        ) as [number, string];
                    } else {
                        code = 0;
                        message = err.message;
                    }
                    
                    return {
                        path: err.path.join('.'),
                        content: err.path[0] as string,
                        field: err.path[1] as string,
                        message,
                        error_code: code,
                        code: err.code,
                    };
                });

                console.log('Formatted errors:', JSON.stringify(formattedErrors, null, 2));
                console.log('=== END VALIDATION ERRORS ===');

                return res.status(400).json({
                    message: 'Dữ liệu không hợp lệ',
                    errors: formattedErrors,
                });
            }

            // Nếu là lỗi khác
            return res.status(500).json({ 
                message: 'Lỗi máy chủ', 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
        }
    };
}

export default validateMiddleware;