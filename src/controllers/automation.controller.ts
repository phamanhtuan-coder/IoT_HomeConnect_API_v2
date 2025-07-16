import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { throwError, ErrorCodes } from '../utils/errors';
import AutomationService from '../services/automation.service';

const prisma = new PrismaClient();

class AutomationController {
    constructor() {
        // Bind methods to preserve 'this' context
        this.testAutomation = this.testAutomation.bind(this);
        this.getDeviceLinksInfo = this.getDeviceLinksInfo.bind(this);
        this.getDeviceLinksStats = this.getDeviceLinksStats.bind(this);
        this.getDeviceLinks = this.getDeviceLinks.bind(this);
    }

    /**
     * Test automation với dữ liệu giả
     */
    async testAutomation(req: Request, res: Response) {
        try {
            const { input_serial, test_data } = req.body;

            if (!input_serial || !test_data) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: input_serial, test_data'
                });
            }

            console.log(`🧪 Testing automation for device: ${input_serial}`);
            console.log('📊 Test data:', test_data);

            await AutomationService.testAutomation(input_serial, test_data);

            res.json({
                success: true,
                message: 'Automation test completed'
            });

        } catch (error) {
            console.error('Error testing automation:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lấy thông tin device links cho một device
     */
    async getDeviceLinksInfo(req: Request, res: Response) {
        try {
            const { serial_number } = req.params;

            if (!serial_number) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing serial_number parameter'
                });
            }

            const info = await AutomationService.getDeviceLinksInfo(serial_number);

            if (info.error) {
                return res.status(404).json({
                    success: false,
                    message: info.error
                });
            }

            res.json({
                success: true,
                data: info
            });

        } catch (error) {
            console.error('Error getting device links info:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lấy thống kê device links
     */
    async getDeviceLinksStats(req: Request, res: Response) {
        try {
            const { account_id } = req.user as any;

            // Lấy tổng số device links
            const totalLinks = await prisma.device_links.count({
                where: {
                    deleted_at: null
                }
            });

            // Lấy số links active
            const activeLinks = await prisma.device_links.count({
                where: {
                    deleted_at: null
                }
            });

            // Lấy top devices có nhiều links nhất
            const topInputDevices = await prisma.device_links.groupBy({
                by: ['input_device_id'],
                where: {
                    deleted_at: null
                },
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 5
            });

            const topOutputDevices = await prisma.device_links.groupBy({
                by: ['output_device_id'],
                where: {
                    deleted_at: null
                },
                _count: {
                    id: true
                },
                orderBy: {
                    _count: {
                        id: 'desc'
                    }
                },
                take: 5
            });

            // Lấy thông tin chi tiết cho top devices
            const topInputDevicesInfo = await Promise.all(
                topInputDevices.map(async (device) => {
                    const deviceInfo = await prisma.devices.findFirst({
                        where: { device_id: device.input_device_id },
                        select: { name: true, serial_number: true }
                    });
                    return {
                        device_id: device.input_device_id,
                        name: deviceInfo?.name || 'Unknown',
                        serial_number: deviceInfo?.serial_number || 'Unknown',
                        link_count: device._count.id
                    };
                })
            );

            const topOutputDevicesInfo = await Promise.all(
                topOutputDevices.map(async (device) => {
                    const deviceInfo = await prisma.devices.findFirst({
                        where: { device_id: device.output_device_id },
                        select: { name: true, serial_number: true }
                    });
                    return {
                        device_id: device.output_device_id,
                        name: deviceInfo?.name || 'Unknown',
                        serial_number: deviceInfo?.serial_number || 'Unknown',
                        link_count: device._count.id
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    total_links: totalLinks,
                    active_links: activeLinks,
                    top_input_devices: topInputDevicesInfo,
                    top_output_devices: topOutputDevicesInfo
                }
            });

        } catch (error) {
            console.error('Error getting device links stats:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lấy danh sách device links với filter
     */
    async getDeviceLinks(req: Request, res: Response) {
        try {
            const { page = 1, limit = 10, input_device, output_device } = req.query;
            const offset = (Number(page) - 1) * Number(limit);

            const where: any = {
                deleted_at: null
            };

            if (input_device) {
                where.input_device_id = input_device;
            }

            if (output_device) {
                where.output_device_id = output_device;
            }

            const links = await prisma.device_links.findMany({
                where,
                skip: offset,
                take: Number(limit),
                include: {
                    input_device: {
                        select: {
                            device_id: true,
                            serial_number: true,
                            name: true
                        }
                    },
                    output_device: {
                        select: {
                            device_id: true,
                            serial_number: true,
                            name: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            });

            const total = await prisma.device_links.count({ where });

            res.json({
                success: true,
                data: links,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });

        } catch (error) {
            console.error('Error getting device links:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

const automationController = new AutomationController();
export default automationController; 