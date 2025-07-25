// src/services/ticket.service.ts
import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import NotificationService from './notification.service';
import { NotificationType } from '../types/notification';
import { generateTicketId } from "../utils/helpers";
import { executeSelectData } from '../utils/sql_query';
import { get_error_response } from '../utils/response.helper';
import { ERROR_CODES } from '../contants/error';
import { STATUS_CODE } from '../contants/status';
import { ROLE, TICKET_TYPE } from '../contants/info';
import { PermissionType } from '../types/share-request';
import { sendEmergencyAlertEmail } from './email.service';
import { GroupRole } from '../types/group';
import prisma from "../config/database";

const TICKET_STATUS = {
	PENDING: 'pending',
	IN_PROGRESS: 'in_progress',
	APPROVED: 'approved',
	REJECTED: 'rejected',
	RESOLVED: 'resolved',
	CANCELLED: 'cancelled',
} as const;

interface TicketStatusUpdate {
	status: typeof TICKET_STATUS.APPROVED | typeof TICKET_STATUS.REJECTED | typeof TICKET_STATUS.RESOLVED;
	resolve_solution: string;
}

class TicketService {
	private prisma: PrismaClient;
	private notificationService: NotificationService;

	constructor() {
		this.prisma = new PrismaClient();
		this.notificationService = new NotificationService();
	}

	// Tạo vấn đề mới
	async createTicket(input: {
		user_id: string;
		device_serial?: string;
		ticket_type_id: number;
		description?: string;
		evidence?: any;
		assigned_to?: string;
		permission_type?: PermissionType;
	}): Promise<any> {
		const { user_id, device_serial, ticket_type_id, description, evidence, assigned_to, permission_type } = input;
		let device: any = null;
		let is_franchise = false;
		let is_share_permission = false;

		let accountByAssignedTo: any = null;
		if (assigned_to) {
			accountByAssignedTo = await this.prisma.account.findFirst({
				where: { username: assigned_to, deleted_at: null },
			});
		}

		// 1. Kiểm tra tài khoản
		const account = await this.prisma.account.findFirst({
			where: { account_id: user_id, deleted_at: null },
		});
		if (!account) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy tài khoản');

		// 2. Kiểm tra thiết bị
		if (device_serial) {
			device = await this.prisma.devices.findFirst({
				where: { serial_number: device_serial, is_deleted: false },
			});
			if (!device) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy thiết bị');
		}

		// 3. Kiểm tra loại vấn đề
		const ticketType = await this.prisma.ticket_types.findFirst({
			where: { ticket_type_id, is_deleted: false },
		});
		if (!ticketType) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy loại vấn đề');

		let to_user: any = null;
		// 4. Kiểm tra người nhận thiết bị
		if (ticketType?.ticket_type_id === TICKET_TYPE.FRANCHISE) {
			if (!assigned_to) throwError(ErrorCodes.BAD_REQUEST, 'Không tìm thấy người nhận thiết bị được yêu cầu');

			// 4.1. Kiểm tra yêu cầu nhượng quyền thiết bị
			const ticket_franchise = await this.prisma.tickets.findFirst({
				where: {
					ticket_type_id: TICKET_TYPE.FRANCHISE,
					device_serial: device_serial,
					is_deleted: false,
					status: { notIn: [TICKET_STATUS.REJECTED, TICKET_STATUS.RESOLVED] }
				},
			});
			// 4.1.1. Nếu có yêu cầu nhượng quyền của thiết bị thì không tạo mới
			if (ticket_franchise) throwError(ErrorCodes.BAD_REQUEST, 'Đã có yêu cầu nhượng quyền thiết bị cho thiết bị này');

			// 4.2. Kiểm tra người nhận thiết bị
			const to_user = await this.prisma.account.findFirst({
				where: { account_id: assigned_to, deleted_at: null },
			});
			// 4.1.2. Kiểm tra người nhận thiết bị
			if (!to_user) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy người nhận thiết bị được yêu cầu');

			// 4.1.3. Kiểm tra người nhận thiết bị không phải là người tạo vấn đề
			if (to_user?.account_id === user_id) throwError(ErrorCodes.BAD_REQUEST, 'Bạn không thể nhượng quyền thiết bị cho chính mình');

			// Bật cờ - Đây là ticket nhượng quyền thiết bị
			is_franchise = true;
		} else if (ticketType?.ticket_type_id === TICKET_TYPE.SHARE_PERMISSION) {
			if (!assigned_to) throwError(ErrorCodes.BAD_REQUEST, 'Không tìm thấy người nhận thiết bị được yêu cầu');
			if (!device_serial) throwError(ErrorCodes.BAD_REQUEST, 'Không tìm thấy thiết bị');
		
			if (!accountByAssignedTo) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy người nhận thiết bị được yêu cầu');


			// 1. Kiểm tra người chia sẻ có trong nhóm và là owner hoặc vice
			const userGroup = await this.prisma.user_groups.findFirst({
				where: { account_id: user_id, group_id: device!.group_id, is_deleted: false },
			});

			if (device!.account_id !== user_id && (!userGroup || (userGroup.role !== GroupRole.OWNER && userGroup.role !== GroupRole.VICE))) {
				throwError(ErrorCodes.BAD_REQUEST, 'Bạn không có quyền chia sẻ thiết bị');
			} 

			// 2. Kiểm tra người nhận không thuộc nhóm này
			const toUserGroup = await this.prisma.user_groups.findFirst({
				where: { account_id: assigned_to, group_id: device!.group_id, is_deleted: false },
			});
			if (toUserGroup) throwError(ErrorCodes.BAD_REQUEST, 'Người được chia sẻ quyền phải là người ngoài nhóm');

			// 3. Kiểm tra mô tả vấn đề
			if (description !== PermissionType.CONTROL && description !== PermissionType.VIEW) throwError(ErrorCodes.BAD_REQUEST, 'Quyền chia sẻ không hợp lệ')

			
			// 4. Kiểm tra người nhận thiết bị
			to_user = await this.prisma.account.findFirst({
				where: { account_id: accountByAssignedTo?.account_id, deleted_at: null },
			});

			// 5. Kiểm tra người nhận thiết bị tồn tại
			if (!to_user) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy người nhận thiết bị được yêu cầu');
			if (to_user?.is_locked) throwError(ErrorCodes.BAD_REQUEST, 'Tài khoản đã bị khóa');

			is_share_permission = true;
		} else if (ticketType?.ticket_type_id === TICKET_TYPE.LOST_DEVICE) {
			if (!device_serial) throwError(ErrorCodes.BAD_REQUEST, 'Không tìm thấy thiết bị');

			if (device!.lock_status === 'locked') throwError(ErrorCodes.BAD_REQUEST, 'Thiết bị đã bị khóa');

			// 4.6. Kiểm tra người báo mất có phải là chủ hay không
			if (device!.account_id !== user_id) throwError(ErrorCodes.BAD_REQUEST, 'Bạn không phải là chủ sở hữu thiết bị');
		} else if (ticketType?.ticket_type_id === TICKET_TYPE.LOCK_DEVICE) {
			if (device!.lock_status === 'locked') throwError(ErrorCodes.BAD_REQUEST, 'Thiết bị đã bị khóa');

			// 4.6. Kiểm tra người báo mất có phải là chủ hay không
			if (device!.account_id !== user_id) throwError(ErrorCodes.BAD_REQUEST, 'Bạn không phải là chủ sở hữu thiết bị');
		}

		// 5. Tạo ID vấn đề
		let ticket_id: string;
		let attempts = 0;
		const maxAttempts = 5;
		do {
			ticket_id = generateTicketId();
			const idExists = await this.prisma.tickets.findFirst({ where: { ticket_id: ticket_id } });
			if (!idExists) break;
			attempts++;
			if (attempts >= maxAttempts) throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Không thể tạo ID duy nhất');
		} while (true);

		// 6. Tạo vấn đề
		const ticket = await this.prisma.tickets.create({
			data: {
				ticket_id: ticket_id,
				user_id,
				device_serial,
				ticket_type_id,
				description,
				evidence,
				status: TICKET_STATUS.PENDING,
				assigned_to: accountByAssignedTo?.account_id,
				created_at: new Date(),
				updated_at: new Date(),
			},
		});

		// THDB: Xử lý nhượng quyền thiết bị 
		// 7. Tạo yêu cầu nhượng quyền thiết bị
		if (is_franchise) {
			await this.prisma.ownership_history.create({
				data: {
					ticket_id: ticket_id,
					device_serial: device_serial,
					from_user_id: user_id,
					to_user_id: assigned_to,
					created_at: new Date(),
				},
			});
		} else if (is_share_permission) {
			// Gửi email hoặc notification cho người nhận
			await sendEmergencyAlertEmail(
				to_user!.email,
				`Bạn được chia sẻ quyền ${description === PermissionType.CONTROL ? 'kiểm soát' : 'xem'} thiết bị ${device_serial} từ ${account!.username}`
			);
			// Gửi notification cho cả người chia sẻ và người nhận
			await this.notificationService.createNotification({
				account_id: user_id,
				text: `Bạn đã chia sẻ quyền ${description} thiết bị ${device_serial} cho ${to_user!.username}`,
				type: NotificationType.TICKET,
			});
			await this.notificationService.createNotification({
				account_id: accountByAssignedTo?.account_id,
				text: `Bạn được chia sẻ quyền ${description} thiết bị ${device_serial}`,
				type: NotificationType.TICKET,
			});
		}

		// 8. Gửi thông báo đến người tạo vấn đề
		await this.notificationService.createNotification({
			account_id: user_id,
			text: `Tạo vấn đề mới: ${description || 'Không có mô tả'}`,
			type: NotificationType.TICKET,
		});

		return get_error_response(
			ERROR_CODES.SUCCESS,
			STATUS_CODE.CREATED,
			ticket
		);
	}

	// Nhân viên xác nhận xử lý vấn đề
	async confirmTicket(ticketId: string, account_id: string): Promise<any> {
		const account = await this.prisma.account.findFirst({
			where: { account_id: account_id, deleted_at: null },
		});
		if (!account) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy tài khoản');


		// if (account!.role_id !== ROLE.CUSTOMER_SUPPORT) throwError(ErrorCodes.FORBIDDEN, 'Bạn không có quyền xác nhận vấn đề');

		const ticket = await this.prisma.tickets.findFirst({
			where: { ticket_id: ticketId, is_deleted: false },
		});
		if (!ticket) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy vấn đề');


		const updatedTicket = await this.prisma.tickets.update({
			where: { ticket_id: ticketId },
			data: { status: TICKET_STATUS.IN_PROGRESS, updated_at: new Date(), assigned_to: account_id },
		});

		return get_error_response(
			ERROR_CODES.SUCCESS,
			STATUS_CODE.OK,
			updatedTicket
		);
	}

	// Nhân viên cập nhật trạng thái vấn đề
	async updateTicketStatus(ticketId: string, account_id: string, data: TicketStatusUpdate): Promise<any> {
		const account = await this.prisma.account.findFirst({
			where: { account_id: account_id, deleted_at: null },
		});
		if (!account) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy tài khoản');

		// if (account!.role_id !== ROLE.CUSTOMER_SUPPORT) throwError(ErrorCodes.FORBIDDEN, 'Bạn không có quyền cập nhật trạng thái vấn đề');

		const ticket = await this.prisma.tickets.findFirst({
			where: { ticket_id: ticketId, is_deleted: false },
		});
		if (!ticket) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy vấn đề');


		// 1. Kiểm tra trạng thái vấn đề
		if (data.status !== TICKET_STATUS.RESOLVED && data.status !== TICKET_STATUS.REJECTED) {
			return get_error_response(
				ERROR_CODES.BAD_REQUEST,
				STATUS_CODE.BAD_REQUEST,
				'Trạng thái vấn đề không hợp lệ'
			);
		}

		// 2. Cập nhật trạng thái vấn đề
		const updatedTicket = await this.prisma.tickets.update({
			where: { ticket_id: ticketId },
			data: {
				status: data.status,
				resolve_solution: data.resolve_solution,
				resolved_at: new Date(),
				updated_at: new Date(),
			},
		});

		// 3. Xử lý vấn đề
		// 3.1. Xử lý vấn đề người dùng báo mất thiết bị
		if (ticket?.ticket_type_id === TICKET_TYPE.LOST_DEVICE && ticket?.device_serial) {
			await this.prisma.devices.update({
				where: { serial_number: ticket?.device_serial },
				data: {
					lock_status: 'locked',
					locked_at: new Date(),
					updated_at: new Date(),
				},
			});
		}

		// 3.2. Xử lý vấn đề mất tài khoản
		if (ticket?.ticket_type_id === TICKET_TYPE.LOST_ACCOUNT) {
			await this.prisma.account.update({
				where: { account_id: ticket?.user_id! },
				data: {
					is_locked: true,
					locked_at: new Date(),
					updated_at: new Date(),
				},
			});
		}

		return get_error_response(
			ERROR_CODES.SUCCESS,
			STATUS_CODE.OK,
			updatedTicket
		);
	}

	async deleteTicket(ticketId: string): Promise<any> {
		const ticket = await this.prisma.tickets.findFirst({
			where: { ticket_id: ticketId, is_deleted: false },
		});
		if (!ticket) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy vấn đề');

		await this.prisma.tickets.update({
			where: { ticket_id: ticketId },
			data: { is_deleted: true, updated_at: new Date() },
		});

		await this.notificationService.createNotification({
			account_id: ticket!.user_id!,
			text: `Vấn đề #${ticketId} đã bị xóa.`,
			type: NotificationType.TICKET,
		});

		return get_error_response(
			ERROR_CODES.SUCCESS,
			STATUS_CODE.NO_CONTENT,
			null
		);
	}

	async getTicketById(ticketId: string): Promise<any> {
		const filters = {
			field: 'ticket_id',
			condition: '=',
			value: ticketId,
		}

		const get_attr = `
		tickets.device_serial, tickets.description, tickets.evidence,
		tickets.status, tickets.assigned_to, tickets.resolved_at, tickets.resolve_solution, ticket_types.type_name as ticket_type_name, 
		ticket_types.priority,
		customer.id as user_id,
		COALESCE(CONCAT_WS(' ', customer.surname, customer.lastname), 'N/A') as user_name,
		customer.phone as user_phone, customer.email as user_email,
		COALESCE(CONCAT_WS(' ', employee.surname, employee.lastname), 'N/A') as assigned_name,
		employee.phone as assigned_phone, employee.email as assigned_email,
		devices.name as device_name,
		groups.group_name,
		spaces.space_name,
		device_templates.name as template_name,
		houses.house_name
		-- detail_export.created_at AS export_date
		`

		const get_table = "tickets"

		const query_join = `
			LEFT JOIN ticket_types ON tickets.ticket_type_id = ticket_types.ticket_type_id
			LEFT JOIN account ON tickets.user_id = account.account_id
			LEFT JOIN customer ON account.customer_id = customer.id
			LEFT JOIN account assigned_account ON tickets.assigned_to = assigned_account.account_id
			LEFT JOIN employee ON assigned_account.employee_id = employee.id
			LEFT JOIN devices ON tickets.device_serial = devices.serial_number
			LEFT JOIN device_templates ON devices.template_id = device_templates.template_id
			LEFT JOIN spaces ON devices.space_id = spaces.space_id
			LEFT JOIN \`groups\` ON devices.group_id = groups.group_id
			LEFT JOIN houses ON spaces.house_id = houses.house_id
			-- LEFT JOIN batch_product_detail ON batch_product_detail.serial_number = devices.serial_number
			-- LEFT JOIN detail_export ON detail_export.batch_code = batch_product_detail.exp_batch_id
		`

		const result = await executeSelectData({
			table: get_table,
			queryJoin: query_join,
			strGetColumn: get_attr,
			filter: filters,
			sort: 'tickets.created_at',
			order: 'desc',
			idSpecial: 'ticket_id',
			isDeleteBoolean: true
		});

		return get_error_response(
			ERROR_CODES.SUCCESS,
			STATUS_CODE.OK,
			{
				data: result.data,
				total_page: result.total_page,
			}
		);
	}

	async getTicketsByUser(userId: string): Promise<any> {
		const account = await this.prisma.account.findFirst({
			where: { account_id: userId, deleted_at: null },
		});
		if (!account) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy tài khoản');

		const filters = [{
			logic: 'OR',
			filters: [
				{
					field: 'tickets.user_id',
					condition: '=',
					value: userId,
				},
				{
					field: 'tickets.assigned_to',
					condition: '=',
					value: userId,
				}
			]

		}]

		const result = await this.getAllTickets(filters, 1, 10);
		return result;
	}

	async getAllTickets(filters: any, page: number = 1, limit: number = 10, sort: string = 'created_at', order: string = 'desc'): Promise<any> {
		const get_attr = `
		tickets.ticket_id, tickets.device_serial, tickets.description,
		tickets.status, tickets.assigned_to, tickets.resolved_at, tickets.resolve_solution, tickets.is_deleted, tickets.ticket_type_id,
		ticket_types.type_name as ticket_type_name,
		ticket_types.priority,
		COALESCE(CONCAT_WS(' ', customer.surname, customer.lastname), 'N/A') as user_name,
		COALESCE(CONCAT_WS(' ', employee.surname, employee.lastname), 'N/A') as assigned_name,
		tickets.created_at, tickets.updated_at, tickets.is_deleted
		`

		const get_table = "tickets"

		const query_join = `
			LEFT JOIN ticket_types ON tickets.ticket_type_id = ticket_types.ticket_type_id
			LEFT JOIN account ON tickets.user_id = account.account_id
			LEFT JOIN customer ON account.customer_id = customer.id
			LEFT JOIN account assigned_account ON tickets.assigned_to = assigned_account.account_id
			LEFT JOIN employee ON assigned_account.employee_id = employee.id
		`

		const result = await executeSelectData({
			table: get_table,
			queryJoin: query_join,
			strGetColumn: get_attr,
			filter: filters,
			page: page,
			limit: limit,
			sort: 'tickets.created_at',
			order: 'desc',
			idSpecial: 'ticket_id',
			isDeleteBoolean: true
		});

		return get_error_response(
			ERROR_CODES.SUCCESS,
			STATUS_CODE.OK,
			{
				data: result.data,
				total_page: result.total_page,
			}
		);
	}

	async customerCancelTicket(ticketId: string, account_id: string): Promise<any> {
		const ticket = await this.prisma.tickets.findFirst({
			where: { ticket_id: ticketId, is_deleted: false },
		});
		if (!ticket) throwError(ErrorCodes.NOT_FOUND, 'Không tìm thấy vấn đề');

		if (ticket!.user_id !== account_id) throwError(ErrorCodes.FORBIDDEN, 'Bạn không có quyền hủy vấn đề này');

		await this.prisma.tickets.update({
			where: { ticket_id: ticketId },
			data: { status: TICKET_STATUS.CANCELLED, updated_at: new Date() },
		});

		return get_error_response(
			ERROR_CODES.SUCCESS,
			STATUS_CODE.OK,
			null
		);
	}

	async getPendingShareTicketsByUser(userId: string): Promise<any> {
		const filters = {
			logic: 'AND',
			filters: [
				{ field: 'tickets.user_id', condition: '=', value: userId },
				{ field: 'tickets.ticket_type_id', condition: '=', value: TICKET_TYPE.SHARE_PERMISSION },
				{ field: 'tickets.status', condition: '=', value: TICKET_STATUS.PENDING },
			],
		};

		const result = await this.getAllTickets(filters, 1, 20);
		return result;
	}
}

export default TicketService;