import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import * as fs from "node:fs";
import path from "path";

const swaggerDefinition = {
    swagger: "2.0",
    info: {
        title: "HomeConnect API v2",
        version: "1.0.0",
        description: `API cho hệ thống quản lý nhà thông minh HomeConnect

## Xác thực và Phân quyền

### 1. Loại Token
- **User Token**: Dành cho người dùng thông thường
  - Thời hạn: 1 giờ
  - Cấp qua API: /api/auth/login
  - Làm mới qua: /api/auth/refresh

- **Employee Token**: Dành cho nhân viên (Admin/Technician)
  - Thời hạn: 8 giờ
  - Cấp qua API: /api/auth/employee/login
  - Làm mới qua: /api/auth/employee/refresh

### 2. Middleware Xác thực (authMiddleware)
- Kiểm tra JWT token trong header Authorization
- Format: Bearer <token>
- Xác thực token và giải mã thông tin người dùng

### 3. Middleware Phân quyền (roleMiddleware)
- Kiểm tra vai trò của employee (ADMIN/TECHNICIAN)
- Chỉ cho phép truy cập nếu có đúng vai trò
- Áp dụng cho các API yêu cầu quyền quản trị

### 4. Middleware Nhóm (groupMiddleware)
- Kiểm tra quyền của người dùng trong nhóm
- Áp dụng cho các thao tác với nhóm thiết bị`,
        contact: {}
    },
    host: "localhost:3000",
    basePath: "/api",
    schemes: ["http"],
    securityDefinitions: {
        UserBearer: {
            type: "apiKey",
            name: "Authorization",
            in: "header",
            description: `JWT Token dành cho người dùng (User Token)
            
Thời hạn token: 1 giờ
Format: Bearer <token>

Token có thể được lấy từ:
- API đăng nhập: POST /api/auth/login
- API làm mới token: POST /api/auth/refresh

Ví dụ: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`,
        },
        EmployeeBearer: {
            type: "apiKey",
            name: "Authorization",
            in: "header",
            description: `JWT Token dành cho nhân viên (Employee Token)
            
Thời hạn token: 8 giờ
Format: Bearer <token>

Token có thể được lấy từ:
- API đăng nhập nhân viên: POST /api/auth/employee/login
- API làm mới token: POST /api/auth/employee/refresh

Ví dụ: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

Lưu ý: Chỉ có ADMIN và TECHNICIAN mới có quyền truy cập các API yêu cầu Employee Token`,
        }
    },
    tags: [
        {
            name: "Auth",
            description: "Xác thực và phân quyền người dùng và nhân viên"
        },
        {
            name: "Alert Type",
            description: "Quản lý các loại cảnh báo trong hệ thống"
        },
        {
            name: "Alert",
            description: "Quản lý cảnh báo trong hệ thống"
        },
        {
            name: "Device",
            description: "Quản lý thiết bị IoT"
        },
        {
            name: "Group",
            description: "Quản lý nhóm thiết bị"
        },
        {
            name: "House",
            description: "Quản lý thông tin nhà"
        },
        {
            name: "Space",
            description: "Quản lý không gian trong nhà"
        },
        {
            name: "Shared Permission",
            description: "Quản lý quyền chia sẻ thiết bị"
        },
        {
            name: "Share Request",
            description: "Quản lý yêu cầu chia sẻ thiết bị"
        },
        {
            name: "Firmware",
            description: "Quản lý phiên bản firmware"
        },
        {
            name: "Firmware Update History",
            description: "Lịch sử cập nhật firmware"
        },
        {
            name: "Notification",
            description: "Quản lý thông báo"
        },
        {
            name: "Ownership History",
            description: "Lịch sử quyền sở hũu thiết bị"
        },
        {
            name: "Sync Tracking",
            description: "Quản lý đồng bộ đăng nhập của người dùng"
        },
        {
            name: "User Devices",
            description: "Quản lý thiết bị đăng nhập của người dùng"
        },
        {
            name: "Ticket Type",
            description: "Quản lý các loại yêu cầu hỗ trợ"
        },
        {
            name: "Ticket",
            description: "Quản lý các yêu cầu hỗ trợ "
        },
        {
            name: "Component",
            description: "Quản lý các linh kiện sản xuất thiết bị"
        },
        {
            name: "Template Component",
            description: "Quản lý các Template cho các linh kiện sản xuất thiết bị"
        },
        {
            name: "Device Template",
            description: "Quản lý các Template cho các thiết bị IoT"
        },
        {
            name: "Production Component",
            description: "Quản lý các linh kiện dùng trong sản xuất"
        },
        {
            name: "Production Tracking",
            description: "Quản lý theo dõi quá trình sản xuất"
        },
        {
            name: "Production Batches",
            description: "Quản lý các lô sản xuất thiết bị"
        },
    ]
};

/**
 * Cấu hình và khởi tạo Swagger UI cho ứng dụng
 * @param app Express application instance
 */
export const configureSwagger = (app: Express): void => {
    try {
        const swaggerFilePath = path.join(process.cwd(), 'swagger', 'swagger.json');
        const swaggerJson = JSON.parse(fs.readFileSync(swaggerFilePath, "utf8"));

        // Gộp cấu hình cơ bản với routes từ swagger.json
        const mergedSwagger = {
            ...swaggerDefinition,
            paths: swaggerJson.paths || {},
            definitions: swaggerJson.definitions || {}
        };

        // Tạo route cho Swagger UI và JSON
        app.get('/api-docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(mergedSwagger);
        });

        // Cấu hình Swagger UI với các options
        const options = {
            explorer: true,
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                defaultModelsExpandDepth: 3,
                defaultModelExpandDepth: 3,
                docExpansion: 'none',
                filter: true,
                showExtensions: true
            }
        };

        app.use(
            "/api-docs",
            swaggerUi.serve,
            swaggerUi.setup(mergedSwagger, options)
        );

        console.log('Swagger documentation initialized at /api-docs');
    } catch (error) {
        console.error("Error setting up Swagger:", error);
        // Fallback to basic swagger if json file not found
        app.use(
            "/api-docs",
            swaggerUi.serve,
            swaggerUi.setup(swaggerDefinition, {
                explorer: true
            })
        );
    }
};

