import { PrismaClient } from '@prisma/client';
import { AppError, ErrorCodes, throwError } from '../utils/errors';
import { Device } from '../types/device';
import { Group } from '../types/group';
import { Prisma } from '@prisma/client';

export class CustomerSearchService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async searchCustomer(filters: {
        email?: string;
        phone?: string;
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
                                ...(customer ? [{ customer_id: customer.id }] : []),
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
                    is_deleted: account?.deleted_at !== null,
                    status: account?.status,
                    is_locked: account?.is_locked
                } : null,
                customer: account?.customer ? {
                    customer_id: account?.customer?.id,
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
                    group_id: device?.group_id,
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

    // Khóa tài khoản khách hàng
    async lockCustomer(customerId: string) {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: {
                    id: customerId
                },
                include: {
                    account: true
                }
            });

            if (!customer) {
                throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
            }

            if (customer?.account?.[0]?.is_locked) {
                throwError(ErrorCodes.BAD_REQUEST, 'Account is already locked');
            }

            const updatedAccount = await this.prisma.account.update({
                where: {
                    account_id: customer?.account[0].account_id
                },
                data: {
                    is_locked: true,
                    locked_at: new Date()
                }
            });

            return {
                success: true,
                message: 'Account locked successfully',
                data: updatedAccount
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Error locking account');
        }
    }

    // Mở khóa tài khoản khách hàng
    async unlockCustomer(customerId: string) {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: {
                    id: customerId
                },
                include: {
                    account: true
                }
            });

            if (!customer) {
                throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
            }

            if (!customer?.account?.[0].is_locked) {
                throwError(ErrorCodes.BAD_REQUEST, 'Account is not locked');
            }

            const updatedAccount = await this.prisma.account.update({
                where: {
                    account_id: customer?.account[0].account_id
                },
                data: {
                    is_locked: false,
                    locked_at: null
                }
            });

            return {
                success: true,
                message: 'Account unlocked successfully',
                data: updatedAccount
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Error unlocking account');
        }
    }

    // Cập nhật thông tin khách hàng
    async updateCustomer(customerId: string, updateData: {
        surname?: string;
        lastname?: string;
        email?: string;
        phone?: string;
        gender?: boolean;
        birthdate?: Date;

    }) {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: {
                    id: customerId
                }
            });

            if (!customer) {
                throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
            }

            const updatedCustomer = await this.prisma.customer.update({
                where: {
                    id: customerId
                },
                data: {
                    ...updateData,
                    updated_at: new Date()
                }
            });

            return {
                success: true,
                message: 'Customer updated successfully',
                data: updatedCustomer
            };
        } catch (error) {
            console.log('Looi', error)
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Error updating customer');
        }
    }

    // Xóa tài khoản khách hàng (soft delete)
    async deleteCustomer(customerId: string) {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: {
                    id: customerId
                },
                include: {
                    account: true
                }
            });

            if (!customer) {
                throwError(ErrorCodes.NOT_FOUND, 'Customer not found');
            }

            // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
            await this.prisma.$transaction(async (prisma) => {
                // Soft delete customer
                await prisma.customer.update({
                    where: {
                        id: customerId
                    },
                    data: {
                        deleted_at: new Date()
                    }
                });

                // Soft delete related account if exists
                if (customer?.account) {
                    await prisma.account.update({
                        where: {
                            account_id: customer.account[0].account_id
                        },
                        data: {
                            deleted_at: new Date()
                        }
                    });
                }

                // Soft delete related user_devices
                await prisma.user_devices.updateMany({
                    where: {
                        user_id: customer?.account[0].account_id
                    },
                    data: {
                        is_deleted: true,
                        updated_at: new Date()
                    }
                });

                // Soft delete related user_groups
                await prisma.user_groups.updateMany({
                    where: {
                        account_id: customer?.account[0].account_id
                    },
                    data: {
                        is_deleted: true,
                        updated_at: new Date()
                    }
                });
            });

            return {
                success: true,
                message: 'Customer deleted successfully'
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, 'Error deleting customer');
        }
    }

    async lockDevice(deviceId: string, serialNumber: string) {
        try {
            const device = await this.prisma.devices.findFirst({
                where: { device_id: deviceId, serial_number: serialNumber, is_deleted: false }
            });
            if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

            if (device?.lock_status === "locked") {
                throwError(ErrorCodes.BAD_REQUEST, "Device is already locked");
            }

            const updatedDevice = await this.prisma.devices.update({
                where: { device_id_serial_number: { device_id: deviceId, serial_number: serialNumber } },
                data: {
                    lock_status: "locked",
                    locked_at: new Date(),
                    updated_at: new Date()
                }
            });

            return {
                success: true,
                message: "Device locked successfully",
                data: updatedDevice
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, "Error locking device");
        }
    }


    async unlockDevice(deviceId: string, serialNumber: string) {
        try {
            const device = await this.prisma.devices.findFirst({
                where: { device_id: deviceId, serial_number: serialNumber, is_deleted: false }
            });
            if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

            if (device?.lock_status !== "locked") {
                throwError(ErrorCodes.BAD_REQUEST, "Device is not locked");
            }

            const updatedDevice = await this.prisma.devices.update({
                where: { device_id_serial_number: { device_id: deviceId, serial_number: serialNumber } },
                data: {
                    lock_status: "unlocked",
                    locked_at: null,
                    updated_at: new Date()
                }
            });

            return {
                success: true,
                message: "Device unlocked successfully",
                data: updatedDevice
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, "Error unlocking device");
        }
    }

    async updateDevice(deviceId: string, serialNumber: string, updateData: {
        name?: string;
        attribute?: any;
        wifi_ssid?: string;
        wifi_password?: string;
    }) {
        try {
            const device = await this.prisma.devices.findFirst({
                where: { device_id: deviceId, serial_number: serialNumber, is_deleted: false }
            });
            if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

            const updatedDevice = await this.prisma.devices.update({
                where: { device_id_serial_number: { device_id: deviceId, serial_number: serialNumber } },
                data: {
                    ...updateData,
                    updated_at: new Date()
                }
            });

            return {
                success: true,
                message: "Device updated successfully",
                data: updatedDevice
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, "Error updating device");
        }
    }


    async deleteDevice(deviceId: string, serialNumber: string) {
        try {
            const device = await this.prisma.devices.findFirst({
                where: { device_id: deviceId, serial_number: serialNumber, is_deleted: false }
            });
            if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

            await this.prisma.devices.update({
                where: { device_id_serial_number: { device_id: deviceId, serial_number: serialNumber } },
                data: {
                    is_deleted: true,
                    updated_at: new Date()
                }
            });

            return {
                success: true,
                message: "Device deleted successfully"
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, "Error deleting device");
        }
    }

    async unlinkDevice(deviceId: string, serialNumber: string) {
        try {
            const device = await this.prisma.devices.findFirst({
                where: { device_id: deviceId, serial_number: serialNumber, is_deleted: false }
            });
            if (!device) throwError(ErrorCodes.NOT_FOUND, "Device not found");

            if (device?.link_status === "unlinked") {
                throwError(ErrorCodes.BAD_REQUEST, "Device is already unlinked");
            }

            const updatedDevice = await this.prisma.devices.update({
                where: { device_id_serial_number: { device_id: deviceId, serial_number: serialNumber } },
                data: {
                    account_id: null,
                    space_id: null,
                    link_status: "unlinked",
                    runtime_capabilities: Prisma.JsonNull,
                    updated_at: new Date()
                }
            });

            return {
                success: true,
                message: "Device unlinked successfully",
                data: updatedDevice
            };
        } catch (error) {
            if (error instanceof AppError) throw error;
            throwError(ErrorCodes.INTERNAL_SERVER_ERROR, "Error unlinking device");
        }
    }
}
