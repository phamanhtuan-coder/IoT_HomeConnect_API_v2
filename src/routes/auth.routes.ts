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
import { rateLimiter, loginRateLimiter, afterSuccessfulLogin } from '../middleware/rate-limit.middleware';
import {
    employeeRegisterSchema,
    loginSchema,
    refreshTokenSchema,
    userRegisterSchema,
    checkEmailVerificationSchema,
    verifyEmailSchema,
    updateUserSchema,
    recoveryPasswordSchema
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
router.post('/login',
    // loginRateLimiter,
    validateMiddleware(loginSchema),
    asyncHandler(authController.loginUser),
    afterSuccessfulLogin
);

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
router.post('/employee/login',
    // loginRateLimiter,
    validateMiddleware(loginSchema),
    asyncHandler(authController.loginEmployee),
    afterSuccessfulLogin
);

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
router.post('/register',
    // rateLimiter('register', 5, 60),
    validateMiddleware(userRegisterSchema),
    asyncHandler(authController.registerUser)
);

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
    // rateLimiter('employee-register', 5, 60),
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
router.post('/refresh',
    // rateLimiter('refresh', 10, 60),
    validateMiddleware(refreshTokenSchema),
    asyncHandler(authController.refreshToken)
);

router.post('/employee/refresh',
    // rateLimiter('employee-refresh', 10, 60),
    validateMiddleware(refreshTokenSchema),
    asyncHandler(authController.refreshEmployeeToken)
);

/**
 * Đăng xuất người dùng (1 thiết bị).
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Đăng xuất khỏi thiết bị hiện tại
 *     description: Vô hiệu hóa token truy cập của thi��t bị hiện tại
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
 *     description: Vô hiệu hóa token truy cập của thiết bị hiện tại cho t��i khoản nhân viên
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

/**
 * Kiểm tra trạng thái verify email.
 * @swagger
 * /api/auth/check-email:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Kiểm tra trạng thái verify email
 *     description: Kiểm tra xem địa chỉ email có đã được xác thực hay chưa
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin kiểm tra email
 *         schema:
 *           type: object
 *           required:
 *             - email
 *           properties:
 *             email:
 *               type: string
 *               description: Địa chỉ email
 *               example: "user@example.com"
 *     responses:
 *       200:
 *         description: Trả về trạng thái xác thực của email
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng với email đã cho
 *       500:
 *         description: Lỗi server
 */
router.post('/check-email', validateMiddleware(checkEmailVerificationSchema), asyncHandler(authController.checkEmailVerification));

/**
 * Xác thực địa chỉ email.
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Xác thực địa chỉ email
 *     description: Xác thực địa chỉ email người dùng thông qua mã xác thực
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin xác thực email
 *         schema:
 *           type: object
 *           required:
 *             - email
 *             - verificationCode
 *           properties:
 *             email:
 *               type: string
 *               description: Địa chỉ email
 *               example: "user@example.com"
 *             verificationCode:
 *               type: string
 *               description: Mã xác thực được gửi đến email
 *               example: "123456"
 *     responses:
 *       200:
 *         description: Xác thực email thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng với email đã cho
 *       409:
 *         description: Email đã được xác thực trước đó
 *       500:
 *         description: Lỗi server
 */
router.post('/verify-email', validateMiddleware(verifyEmailSchema), asyncHandler(authController.verifyEmail));

/**
 * Khôi phục mật khẩu.
 * @swagger
 * /api/auth/recovery-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Khôi phục mật khẩu
 *     description: Khôi phục mật khẩu người dùng thông qua email và mã xác thực
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin khôi phục mật khẩu
 *         schema:
 *           type: object
 *           required:
 *             - email
 *             - verificationCode
 *             - newPassword
 *           properties:
 *             email:
 *               type: string
 *               description: Địa chỉ email
 *               example: "user@example.com"
 *             verificationCode:
 *               type: string
 *               description: Mã xác thực được gửi đến email
 *               example: "123456"
 *             newPassword:
 *               type: string
 *               description: Mật khẩu mới
 *               example: "newpassword123"
 *     responses:
 *       200:
 *         description: Khôi phục mật khẩu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng với email đã cho
 *       409:
 *         description: Mã xác thực không chính xác hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.post('/recovery-password',
    rateLimiter('recovery', 5, 60),
    validateMiddleware(recoveryPasswordSchema),
    asyncHandler(authController.recoveryPassword)
);

/**
 * Cập nhật thông tin người dùng.
 * @swagger
 * /api/auth/update-profile:
 *   patch:
 *     tags:
 *       - Auth
 *     summary: Cập nhật thông tin người dùng
 *     description: Cập nhật thông tin hồ sơ người dùng
 *     security:
 *       - UserBearer: []
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: body
 *         description: Thông tin người dùng cần cập nhật
 *         schema:
 *           type: object
 *           properties:
 *             username:
 *               type: string
 *               description: Tên đăng nhập
 *               example: "user123"
 *             email:
 *               type: string
 *               description: Địa chỉ email
 *               example: "user@example.com"
 *             birthdate:
 *               type: string
 *               format: date
 *               description: Ngày sinh (YYYY-MM-DD)
 *               example: "1990-01-01"
 *             phone:
 *               type: string
 *               description: Số điện thoại
 *               example: "0123456789"
 *             avatar:
 *               type: string
 *               description: URL ảnh đại diện
 *               example: "http://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: Cập nhật thông tin thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       500:
 *         description: Lỗi server
 */
router.patch('/update-profile', authMiddleware, validateMiddleware(updateUserSchema), asyncHandler(authController.updateUser));

router.get('/getMe', authMiddleware, asyncHandler(authController.getMe));

export default router;
