/**
 * Định nghĩa các route xác thực cho ứng dụng.
 * Sử dụng các middleware để xác thực, kiểm tra dữ liệu đầu vào và xử lý bất đồng bộ.
 * Bao gồm các chức năng: đăng nhập, đăng ký, làm mới token, đăng xuất, cập nhật device token.
 * @swagger
 * tags:
 *  name: Auth
 *  description: Quản lý xác thực và phân quyền người dùng
 */

import {Router, Request, Response, NextFunction} from 'express';
import AuthController from '../controllers/auth.controller';
import validateMiddleware from '../middleware/validate.middleware';
import authMiddleware from '../middleware/auth.middleware';
import {
    employeeRegisterSchema,
    loginSchema,
    refreshTokenSchema,
    userRegisterSchema
} from "../utils/schemas/auth.schema";

const router = Router();
const authController = new AuthController();

/**
 * Hàm helper để xử lý các controller bất đồng bộ và bắt lỗi.
 * @param fn Hàm controller bất đồng bộ
 * @returns Middleware Express xử lý lỗi bất đồng bộ
 */
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Đăng nhập người dùng.
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng nhập người dùng
 *     description: Xác thực người d��ng và cấp token truy cập
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin đăng nhập
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *           properties:
 *             username:
 *               type: string
 *               description: Tên đăng nhập
 *               example: "user123"
 *             password:
 *               type: string
 *               description: Mật khẩu
 *               example: "password123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về access token và refresh token
 *       400:
 *         description: Dữ liệu đăng nhập không hợp lệ
 *       401:
 *         description: Sai tên đăng nhập hoặc mật khẩu
 *       500:
 *         description: Lỗi server
 */
router.post('/login', validateMiddleware(loginSchema), asyncHandler(authController.loginUser));

/**
 * Đăng nhập nhân viên.
 * @swagger
 * /api/auth/employee/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng nhập nhân viên
 *     description: Xác thực nhân viên (ADMIN/TECHNICIAN) và cấp token truy cập
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin đăng nhập nhân viên
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *           properties:
 *             username:
 *               type: string
 *               description: Tên đăng nhập
 *               example: "admin123"
 *             password:
 *               type: string
 *               description: Mật khẩu
 *               example: "adminpass123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về access token và refresh token
 *       400:
 *         description: Dữ liệu đăng nhập không hợp lệ
 *       401:
 *         description: Sai tên đăng nhập hoặc mật khẩu
 *       403:
 *         description: Tài khoản không có quyền nhân viên
 *       500:
 *         description: Lỗi server
 */
router.post('/employee/login', validateMiddleware(loginSchema), asyncHandler(authController.loginEmployee));

/**
 * Đăng ký người dùng.
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng ký tài khoản người dùng mới
 *     description: Tạo tài khoản người dùng mới trong hệ thống
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin đăng ký tài khoản
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *             - email
 *           properties:
 *             username:
 *               type: string
 *               description: Tên đăng nhập (4-20 ký tự)
 *               example: "newuser123"
 *             password:
 *               type: string
 *               description: Mật khẩu (ít nhất 8 ký tự)
 *               example: "password123"
 *             email:
 *               type: string
 *               description: Địa chỉ email
 *               example: "user@example.com"
 *             birthdate:
 *               type: string
 *               format: date
 *               description: Ngày sinh (YYYY-MM-DD)
 *               example: "1990-01-01"
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 *       400:
 *         description: Dữ liệu đăng ký không hợp lệ
 *       409:
 *         description: Tên đăng nhập hoặc email đã tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/register', validateMiddleware(userRegisterSchema), asyncHandler(authController.registerUser));

/**
 * Đăng ký nhân viên.
 * @swagger
 * /api/auth/employee/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng ký tài khoản nhân viên mới
 *     description: Tạo tài khoản nhân viên mới, yêu cầu quyền ADMIN
 *     security:
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin đăng ký nhân viên
 *         schema:
 *           type: object
 *           required:
 *             - username
 *             - password
 *             - email
 *             - role
 *           properties:
 *             username:
 *               type: string
 *               description: Tên đăng nhập (4-20 ký tự)
 *               example: "newadmin"
 *             password:
 *               type: string
 *               description: Mật khẩu (ít nhất 8 ký tự)
 *               example: "adminpass123"
 *             email:
 *               type: string
 *               description: Địa chỉ email
 *               example: "admin@company.com"
 *             role:
 *               type: string
 *               enum: [ADMIN, TECHNICIAN]
 *               description: Vai trò của nhân viên
 *               example: "ADMIN"
 *             surname:
 *               type: string
 *               description: Họ
 *               example: "Nguyễn"
 *             lastname:
 *               type: string
 *               description: Tên
 *               example: "Văn A"
 *             phone:
 *               type: string
 *               description: Số điện thoại
 *               example: "0123456789"
 *     responses:
 *       201:
 *         description: Tạo tài khoản nhân viên thành công
 *       400:
 *         description: Dữ liệu đăng ký không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Không đủ quyền hạn (yêu cầu quyền ADMIN)
 *       409:
 *         description: Tên đăng nhập hoặc email đã tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post(
    '/employee/register',
    authMiddleware,
    validateMiddleware(employeeRegisterSchema),
    asyncHandler(authController.registerEmployee)
);

/**
 * Làm mới token cho người dùng.
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Làm mới access token
 *     description: Sử dụng refresh token để lấy access token mới
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Refresh token
 *         schema:
 *           type: object
 *           required:
 *             - refreshToken
 *           properties:
 *             refreshToken:
 *               type: string
 *               description: Refresh token đã được cấp khi đăng nhập
 *     responses:
 *       200:
 *         description: Làm mới token thành công, trả về access token mới
 *       400:
 *         description: Refresh token không hợp lệ
 *       401:
 *         description: Refresh token đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post('/refresh', validateMiddleware(refreshTokenSchema), asyncHandler(authController.refreshToken));

/**
 * Làm mới token cho nhân viên.
 * @swagger
 * /api/auth/employee/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Làm mới access token cho nhân viên
 *     description: Sử dụng refresh token để lấy access token mới cho tài khoản nhân viên
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Refresh token
 *         schema:
 *           type: object
 *           required:
 *             - refreshToken
 *           properties:
 *             refreshToken:
 *               type: string
 *               description: Refresh token đã được cấp khi đăng nhập
 *     responses:
 *       200:
 *         description: Làm mới token thành công, trả về access token mới
 *       400:
 *         description: Refresh token không hợp lệ
 *       401:
 *         description: Refresh token đã hết hạn
 *       403:
 *         description: Token không phải của tài khoản nhân viên
 *       500:
 *         description: Lỗi server
 */
router.post('/employee/refresh', validateMiddleware(refreshTokenSchema), asyncHandler(authController.refreshEmployeeToken));

/**
 * Đăng xuất người dùng (1 thiết bị).
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng xuất khỏi thiết bị hiện tại
 *     description: Vô hiệu hóa token truy cập của thiết bị hiện tại
 *     security:
 *       - UserBearer: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post('/logout', authMiddleware, authController.logoutUser);

/**
 * Đăng xuất nhân viên (1 thiết bị).
 * @swagger
 * /api/auth/employee/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng xuất nhân viên khỏi thiết bị hiện tại
 *     description: Vô hiệu hóa token truy cập của thiết bị hiện tại cho tài khoản nhân viên
 *     security:
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Token không phải của tài khoản nhân viên
 *       500:
 *         description: Lỗi server
 */
router.post('/employee/logout', authMiddleware, authController.logoutEmployee);

/**
 * Đăng xuất nhiều thiết bị.
 * @swagger
 * /api/auth/logout/multiple:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng xuất khỏi nhiều thiết bị
 *     description: Vô hiệu hóa token truy cập của nhiều thiết bị chỉ định
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Danh sách ID thiết bị cần đăng xuất
 *         schema:
 *           type: object
 *           required:
 *             - userDeviceIds
 *           properties:
 *             userDeviceIds:
 *               type: array
 *               items:
 *                 type: number
 *               description: Mảng các ID thiết bị
 *               example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Đăng xuất thành công khỏi các thiết bị đã chọn
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post('/logout/multiple', authMiddleware, authController.logoutMultipleDevices);

/**
 * Đăng xuất tất cả thiết bị.
 * @swagger
 * /api/auth/logout/all:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng xuất khỏi tất cả thiết bị
 *     description: Vô hiệu hóa token truy cập của tất cả thiết bị đã đăng nhập
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công khỏi tất cả thiết bị
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post('/logout/all', authMiddleware, authController.logoutAllDevices);

/**
 * Cập nhật device token.
 * @swagger
 * /api/auth/update-device-token:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Cập nhật device token cho thông báo đẩy
 *     description: Cập nhật device token (FCM) cho thiết bị hiện tại
 *     security:
 *       - UserBearer: []
 *       - EmployeeBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Device token mới
 *         schema:
 *           type: object
 *           required:
 *             - deviceToken
 *           properties:
 *             deviceToken:
 *               type: string
 *               description: Device token từ Firebase Cloud Messaging
 *     responses:
 *       200:
 *         description: Cập nhật device token thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post('/update-device-token', authMiddleware, authController.updateDeviceToken);

export default router;

