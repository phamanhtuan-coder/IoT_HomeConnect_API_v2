import { PrismaClient } from '@prisma/client';
import { AppError, ErrorCodes, throwError } from '../utils/errors';
import { Device } from '../types/device';
import { Group } from '../types/group';

export class CustomerSearchService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async searchCustomer(filters: {
        email?: string;
        phone?: string;
        name?: string;
        customerId?: string;
        username?: string;
        deviceType?: string | number;
        status?: string;
        role?: string;
    }) {
        try {
            // 1. Tìm customer trước (nếu có filter liên quan)
            let customer: any = null;
            if (filters.email || filters.phone) {
                customer = await this.prisma.customer.findFirst({
                    where: {
                        AND: [
                            filters.email ? { email: filters.email } : {},
                            filters.phone ? { phone: filters.phone } : {},
                            { deleted_at: null }
                        ].filter(condition => Object.keys(condition).length > 0)
                    }
                });

                // Nếu tìm theo email/phone mà không thấy customer thì throw error ngay
                if (!customer) {
                    throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
                }
            }

            // 2. Tìm account dựa trên customer_id hoặc username/customerId
            const account = await this.prisma.account.findFirst({
                where: {
                    AND: [
                        {
                            OR: [
                                ...(customer ? [{ customer_id: customer.customer_id }] : []),
                                ...(filters.username ? [{ username: { contains: filters.username } }] : []),
                                ...(filters.customerId ? [{ customer_id: filters.customerId }] : [])
                            ]
                        },
                        { deleted_at: null }
                    ]
                },
                include: {
                    customer: true,
                    devices: {
                        where: {
                            is_deleted: false,
                            ...(filters.deviceType && {
                                device_templates: {
                                    device_type_id: Number(filters.deviceType)
                                }
                            }),
                            ...(filters.status && { link_status: filters.status })
                        },
                        include: {
                            device_templates: true,
                            spaces: true
                        }
                    },
                    user_groups: {
                        where: {
                            is_deleted: false,
                            ...(filters.role && { role: filters.role })
                        },
                        include: {
                            groups: {
                                where: { is_deleted: false }
                            }
                        }
                    }
                }
            });

            if (!account) {
                throwError(ErrorCodes.NOT_FOUND, 'No account found');
            }

            // Kiểm tra xem account có khớp với tất cả các điều kiện tìm kiếm không
            if (filters.email && account?.customer?.email !== filters.email) {
                throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
            }
            if (filters.phone && account?.customer?.phone !== filters.phone) {
                throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
            }
            if (filters.name) {
                const searchName = filters.name.toLowerCase().trim();
                const customerFullName = `${account?.customer?.surname} ${account?.customer?.lastname}`.toLowerCase().trim();

                // Kiểm tra nhiều trường hợp
                const isMatch =
                    // Trường hợp 1: Tìm chính xác chuỗi
                    customerFullName.includes(searchName) ||
                    // Trường hợp 2: Tìm từng từ riêng lẻ
                    searchName.split(' ').every(word => customerFullName.includes(word)) ||
                    // Trường hợp 3: Tìm kết hợp họ và tên
                    (searchName.split(' ').length > 1 &&
                        customerFullName.includes(searchName.split(' ')[0]) &&
                        customerFullName.includes(searchName.split(' ').slice(1).join(' ')));

                if (!isMatch) {
                    throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
                }
            }
            if (filters.username && account?.username !== filters.username) {
                throwError(ErrorCodes.NOT_FOUND, 'No account found');
            }
            if (filters.customerId && account?.customer_id !== filters.customerId) {
                throwError(ErrorCodes.NOT_FOUND, 'No account found');
            }

            // 3. Lấy houses và spaces
            const groupIds = account?.user_groups
                ?.map(ug => ug?.groups?.group_id)
                ?.filter((id): id is number => id !== null && id !== undefined) ?? [];

            const houses = groupIds.length > 0
                ? await this.prisma.houses.findMany({
                    where: {
                        group_id: { in: groupIds },
                        is_deleted: false
                    },
                    include: {
                        spaces: {
                            where: {
                                is_deleted: false
                            }
                        }
                    }
                })
                : [];

            const houseIds = houses?.map(h => h?.house_id)?.filter(Boolean) ?? [];
            const spaces = houseIds.length > 0
                ? await this.prisma.spaces.findMany({
                    where: {
                        house_id: { in: houseIds },
                        is_deleted: false
                    }
                })
                : [];

            // 4. Trả về kết quả
            return {
                account: account ? {
                    account_id: account?.account_id,
                    username: account?.username,
                    created_at: account?.created_at,
                    updated_at: account?.updated_at,
                    is_deleted: account?.deleted_at !== null
                } : null,
                customer: account?.customer ? {
                    customer_id: account?.customer?.customer_id,
                    email: account?.customer?.email,
                    phone: account?.customer?.phone,
                    full_name: `${account?.customer?.surname ?? ''} ${account?.customer?.lastname ?? ''}`.trim(),
                    avatar: account?.customer?.image,
                    birthdate: account?.customer?.birthdate,
                    email_verified: account?.customer?.email_verified,
                    gender: account?.customer?.gender,
                    created_at: account?.customer?.created_at,
                    updated_at: account?.customer?.updated_at,
                    is_deleted: account?.customer?.deleted_at !== null
                } : null,
                devices: account?.devices?.map(device => ({
                    device_id: device?.device_id,
                    serial_number: device?.serial_number,
                    template_id: device?.template_id,
                    space_id: device?.space_id,
                    account_id: device?.account_id,
                    hub_id: device?.hub_id,
                    firmware_id: device?.firmware_id,
                    name: device?.name,
                    power_status: device?.power_status,
                    attribute: device?.attribute,
                    wifi_ssid: device?.wifi_ssid,
                    wifi_password: device?.wifi_password,
                    current_value: device?.current_value,
                    link_status: device?.link_status,
                    last_reset_at: device?.last_reset_at,
                    lock_status: device?.lock_status,
                    locked_at: device?.locked_at,
                    created_at: device?.created_at,
                    updated_at: device?.updated_at,
                    is_deleted: device?.is_deleted
                } as Device)) ?? [],
                groups: account?.user_groups
                    ?.map(ug => ({
                        user_group_id: ug?.user_group_id,
                        account_id: ug?.account_id,
                        role: ug?.role,
                        joined_at: ug?.joined_at,
                        updated_at: ug?.updated_at,
                        is_deleted: ug?.is_deleted,
                        group: ug?.groups ? {
                            group_id: ug.groups.group_id,
                            group_name: ug.groups.group_name,
                            group_description: ug.groups.group_description,
                            icon_color: ug.groups.icon_color,
                            icon_name: ug.groups.icon_name,
                            created_at: ug.groups.created_at,
                            updated_at: ug.groups.updated_at,
                            is_deleted: ug.groups.is_deleted
                        } : null
                    }))
                    ?.filter(group => group !== null && !group.is_deleted) ?? [],
                houses: houses?.map(house => ({
                    house_id: house.house_id,
                    group_id: house.group_id,
                    house_name: house.house_name,
                    address: house.address,
                    icon_name: house.icon_name,
                    icon_color: house.icon_color,
                    created_at: house.created_at,
                    updated_at: house.updated_at,
                    is_deleted: house.is_deleted,
                    spaces: house.spaces?.map(space => ({
                        space_id: space.space_id,
                        space_name: space.space_name,
                        space_description: space.space_description,
                        icon_name: space.icon_name,
                        icon_color: space.icon_color,
                        created_at: space.created_at,
                        updated_at: space.updated_at,
                        is_deleted: space.is_deleted
                    })) ?? []
                })) ?? [],
                spaces: spaces ?? []
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Error searching customer');
        }
    }
}
