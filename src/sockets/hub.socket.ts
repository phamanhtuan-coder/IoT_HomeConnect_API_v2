// src/sockets/hub.socket.ts - DATABASE-DRIVEN HUB MANAGEMENT
import { Server, Socket } from 'socket.io';
import prisma from '../config/database';
import {
    setupDoorDeviceHandlers,
    setupDoorHubHandlers,
    setupESP01EventHandlers,
    createEnhancedCommand
} from './handlers/door.handlers';

// ===== DYNAMIC HUB DEVICE REGISTRY =====
interface HubDevice {
    hubSerial: string;
    hubSocket: Socket;
    managedDevices: string[];
    isOnline: boolean;
    lastSeen: Date;
}

interface ManagedDevice {
    serialNumber: string;
    hubSerial: string;
    isOnline: boolean;
    lastSeen: Date;
}

// Global registries
const hubRegistry = new Map<string, HubDevice>();
const managedDeviceRegistry = new Map<string, ManagedDevice>();
const socketToHub = new Map<string, string>(); // socketId -> hubSerial
const connectedSockets = new Map<string, Socket>();

export const setupHubSocket = (io: Server) => {
    console.log('[HUB] Initializing Database-Driven Hub Socket...');

    io.on('connection', async (socket: Socket) => {
        const {
            serialNumber,
            isIoTDevice,
            accountId,
            hub_managed,
            optimized
        } = socket.handshake.query as {
            serialNumber?: string;
            isIoTDevice?: string;
            accountId?: string;
            hub_managed?: string;
            optimized?: string;
        };

        const userAgent = socket.handshake.headers['user-agent'] || '';

        // Detect device type
        const isHub = userAgent.includes('ESP-Hub-Opt') ||
            hub_managed === 'true' ||
            optimized === 'true';

        const isESP01 = userAgent.includes('ESP-01') ||
            socket.handshake.headers['x-esp-device'] === 'ESP-01';

        // ✅ IMPROVED DIRECT DEVICE DETECTION
        const isDirectDevice = (userAgent.includes('ESP8266') || userAgent.includes('ESP32')) &&
            !isHub && !isESP01 && isIoTDevice === 'true' && !accountId;

        const isDevice = userAgent.includes('ESP8266') ||
            userAgent.includes('ESP-01') ||
            userAgent.includes('ESP32') ||
            isIoTDevice === 'true';

        // Handle ESP Socket Hub
        if (isHub && serialNumber && isIoTDevice === 'true' && !accountId) {
            console.log(`[HUB] ESP Socket Hub connecting: ${serialNumber}`);

            try {
                // ✅ VERIFY HUB EXISTS IN DATABASE
                const hubDevice = await prisma.devices.findFirst({
                    where: { serial_number: serialNumber, is_deleted: false }
                });

                if (!hubDevice) {
                    console.error(`[HUB] Hub ${serialNumber} not found in database`);
                    socket.emit('connection_error', { message: 'Hub not registered' });
                    socket.disconnect(true);
                    return;
                }

                // ✅ QUERY MANAGED DEVICES FROM DATABASE
                const managedDevices = await prisma.devices.findMany({
                    where: {
                        hub_id: serialNumber,
                        is_deleted: false
                    },
                    select: {
                        serial_number: true,
                        name: true,
                        power_status: true,
                        attribute: true
                    }
                });

                console.log(`[HUB] Found ${managedDevices.length} managed devices for hub ${serialNumber}:`);
                managedDevices.forEach(device => {
                    console.log(`[HUB]   - ${device.serial_number} (${device.name})`);
                });

                // ✅ REGISTER HUB AND MANAGED DEVICES
                const hubData: HubDevice = {
                    hubSerial: serialNumber,
                    hubSocket: socket,
                    managedDevices: managedDevices.map(d => d.serial_number),
                    isOnline: true,
                    lastSeen: new Date()
                };

                hubRegistry.set(serialNumber, hubData);
                socketToHub.set(socket.id, serialNumber);
                connectedSockets.set(socket.id, socket);

                // Register managed devices
                managedDevices.forEach(device => {
                    const deviceData: ManagedDevice = {
                        serialNumber: device.serial_number,
                        hubSerial: serialNumber,
                        isOnline: true,
                        lastSeen: new Date()
                    };
                    managedDeviceRegistry.set(device.serial_number, deviceData);
                    console.log(`[HUB] Registered device ${device.serial_number} under hub ${serialNumber}`);
                });

                // Set socket data
                socket.data = {
                    serialNumber,
                    deviceType: 'ESP_SOCKET_HUB',
                    isHub: true,
                    managedDevices: managedDevices.map(d => d.serial_number)
                };

                // Join rooms
                await socket.join(`hub:${serialNumber}`);
                await socket.join(`device:${serialNumber}`);

                console.log(`[HUB] ${serialNumber} connected successfully with ${managedDevices.length} managed devices`);

                // Setup handlers
                setupDoorHubHandlers(socket, io, serialNumber);

            } catch (error) {
                console.error(`[HUB] Setup error for ${serialNumber}:`, error);
                socket.emit('connection_error', { message: 'Setup failed' });
                socket.disconnect(true);
            }

            return;
        }

        // ✅ Handle ESP8266/ESP32 Direct Devices (Rolling/Sliding doors)
        if (isDirectDevice && serialNumber) {
            console.log(`[DIRECT_DEVICE] ESP Direct Device connecting: ${serialNumber}`);
            console.log(`[DIRECT_DEVICE] User-Agent: ${userAgent}`);

            try {
                // ✅ VERIFY DEVICE EXISTS AND IS NOT HUB-MANAGED
                const device = await prisma.devices.findFirst({
                    where: { serial_number: serialNumber, is_deleted: false },
                });

                if (!device) {
                    console.error(`[DIRECT_DEVICE] Device ${serialNumber} not found in database`);
                    socket.emit('connection_error', { message: 'Device not registered' });
                    socket.disconnect(true);
                    return;
                }

                // ✅ CHECK IF DEVICE SHOULD BE DIRECT (not hub-managed)
                if (device.hub_id && device.hub_id.trim() !== '') {
                    console.log(`[DIRECT_DEVICE] ${serialNumber} is hub-managed by ${device.hub_id} - rejecting direct connection`);
                    socket.emit('connection_error', {
                        message: 'Device is hub-managed, connect via hub',
                        hub_id: device.hub_id
                    });
                    socket.disconnect(true);
                    return;
                }

                // ✅ DETECT DEVICE TYPE FROM USER-AGENT
                let deviceType = 'ESP_DEVICE';
                if (userAgent.includes('Rolling-Door') || (userAgent.includes('ESP32') && userAgent.includes('Door'))) {
                    deviceType = 'ESP32_ROLLING_DOOR';
                } else if (userAgent.includes('Sliding-Door') || (userAgent.includes('ESP8266') && userAgent.includes('Door'))) {
                    deviceType = 'ESP8266_SLIDING_DOOR';
                }

                // Set socket data
                socket.data = {
                    serialNumber,
                    deviceType: deviceType,
                    isDevice: true,
                    isDirect: true
                };

                // Join rooms
                await socket.join(`door:${serialNumber}`);
                await socket.join(`device:${serialNumber}`);

                console.log(`[DIRECT_DEVICE] ${serialNumber} connected successfully as ${deviceType}`);

                // ✅ SETUP DOOR DEVICE HANDLERS (same as rolling door)
                setupDoorDeviceHandlers(socket, io, serialNumber);

            } catch (error) {
                console.error(`[DIRECT_DEVICE] Setup error for ${serialNumber}:`, error);
                socket.emit('connection_error', { message: 'Setup failed' });
                socket.disconnect(true);
            }

            return;
        }

        // Handle ESP01/ESP8266 Devices (hub-managed or special cases)
        if (isDevice && serialNumber && isIoTDevice === 'true' && !accountId && !isDirectDevice) {
            console.log(`[DEVICE] ESP Device connecting: ${serialNumber}`);

            try {
                // ✅ VERIFY DEVICE EXISTS AND CHECK HUB RELATIONSHIP
                const device = await prisma.devices.findFirst({
                    where: { serial_number: serialNumber, is_deleted: false },
                });

                if (!device) {
                    console.error(`[DEVICE] Device ${serialNumber} not found in database`);
                    socket.emit('connection_error', { message: 'Device not registered' });
                    socket.disconnect(true);
                    return;
                }

                // Check if device is hub-managed by checking hub_id field
                if (device.hub_id && device.hub_id.trim() !== '') {
                    console.log(`[DEVICE] ${serialNumber} is managed by hub ${device.hub_id} - should connect via hub`);
                    socket.emit('connection_error', {
                        message: 'Device is hub-managed, connect via hub',
                        hub_id: device.hub_id
                    });
                    socket.disconnect(true);
                    return;
                }

                // Set socket data
                socket.data = {
                    serialNumber,
                    deviceType: isESP01 ? 'ESP_01_DEVICE' : 'ESP_8266_DEVICE',
                    isDevice: true,
                    isESP01: isESP01
                };

                // Join rooms
                await socket.join(`door:${serialNumber}`);
                await socket.join(`device:${serialNumber}`);

                console.log(`[DEVICE] ${serialNumber} connected successfully (direct connection)`);

                // Setup handlers based on device type
                if (isESP01) {
                    setupESP01EventHandlers(socket, io, serialNumber, device);
                } else {
                    setupDoorDeviceHandlers(socket, io, serialNumber);
                }

            } catch (error) {
                console.error(`[DEVICE] Setup error for ${serialNumber}:`, error);
                socket.emit('connection_error', { message: 'Setup failed' });
                socket.disconnect(true);
            }

            return;
        }
    });

    // Client namespace for mobile/web apps
    const clientNamespace = io.of('/client');

    clientNamespace.on('connection', async (socket: Socket) => {
        const { serialNumber, accountId } = socket.handshake.query as {
            serialNumber?: string;
            accountId?: string;
        };

        console.log(`[CLIENT] New client connection attempt...`);
        console.log(`[CLIENT] Query params:`, { serialNumber, accountId });

        if (serialNumber && accountId) {
            console.log(`[CLIENT] ✅ Client connected for ${serialNumber} by user ${accountId}`);

            // Join client room
            await socket.join(`door:${serialNumber}`);
            console.log(`[CLIENT] Joined room: door:${serialNumber}`);

            // Handle door commands from clients
            socket.on('door_command', async (commandData) => {
                try {
                    console.log(`[CLIENT] 📨 Door command received for ${serialNumber}:`, commandData);

                    const targetSerial = commandData.serialNumber || serialNumber;

                    // ✅ DYNAMIC HUB LOOKUP FROM DATABASE
                    const isHubManaged = await isDeviceManagedByHub(targetSerial);
                    let routedViaHub = false;

                    if (isHubManaged.managed) {
                        const hubSerial = isHubManaged.hubSerial;
                        const hub = hubRegistry.get(hubSerial!);

                        if (hub && hub.isOnline) {
                            // Create enhanced command
                            const doorCommand = createEnhancedCommand(
                                commandData.action,
                                targetSerial,
                                commandData.state || {},
                                commandData.door_type || "SERVO"
                            );

                            console.log(`[CLIENT] 🔄 Created door command via hub ${hubSerial}:`, doorCommand);

                            // Send via hub
                            io.to(`hub:${hubSerial}`).emit('command', doorCommand);
                            console.log(`[CLIENT] ✅ Command sent via hub ${hubSerial} to ${targetSerial}`);
                            routedViaHub = true;
                        } else {
                            console.log(`[CLIENT] ❌ Hub ${hubSerial} not connected or offline`);
                        }
                    }

                    if (!routedViaHub) {
                        // Try direct connection
                        const deviceRoom = io.sockets.adapter.rooms.get(`device:${targetSerial}`);

                        if (deviceRoom && deviceRoom.size > 0) {
                            const doorCommand = createEnhancedCommand(
                                commandData.action,
                                targetSerial,
                                commandData.state || {},
                                commandData.door_type || "SERVO"
                            );

                            io.to(`device:${targetSerial}`).emit('command', doorCommand);
                            console.log(`[CLIENT] ✅ Command sent directly to ${targetSerial}`);
                        } else {
                            console.log(`[CLIENT] ❌ Device ${targetSerial} not connected`);
                            socket.emit('door_command_error', {
                                success: false,
                                error: 'Device not connected',
                                serialNumber: targetSerial,
                                hub_managed: isHubManaged.managed,
                                hub_serial: isHubManaged.hubSerial
                            });
                            return;
                        }
                    }

                    // Acknowledge command sent
                    socket.emit('door_command_sent', {
                        success: true,
                        serialNumber: targetSerial,
                        routed_via: routedViaHub ? isHubManaged.hubSerial : 'direct',
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[CLIENT] ✅ Command acknowledgment sent`);

                } catch (error) {
                    console.error(`[CLIENT] ❌ Door command error:`, error);
                    socket.emit('door_command_error', {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        serialNumber
                    });
                }
            });

            // Handle status requests
            socket.on('door_status_request', async (requestData) => {
                try {
                    const targetSerial = requestData.serialNumber || serialNumber;

                    const statusRequest = {
                        action: 'status_request',
                        serialNumber: targetSerial,
                        timestamp: new Date().toISOString()
                    };

                    // Check if device is hub-managed
                    const isHubManaged = await isDeviceManagedByHub(targetSerial);

                    if (isHubManaged.managed && isHubManaged.hubSerial) {
                        io.to(`hub:${isHubManaged.hubSerial}`).emit('status_request', statusRequest);
                        console.log(`[CLIENT] Status request sent via hub ${isHubManaged.hubSerial} for ${targetSerial}`);
                    } else {
                        io.to(`device:${targetSerial}`).emit('status_request', statusRequest);
                        console.log(`[CLIENT] Status request sent directly to ${targetSerial}`);
                    }
                } catch (error) {
                    console.error(`[CLIENT] Status request error:`, error);
                }
            });

            // Handle config requests
            socket.on('door_config_request', async (requestData) => {
                try {
                    const targetSerial = requestData.serialNumber || serialNumber;

                    const configRequest = {
                        action: 'CFG',
                        serialNumber: targetSerial,
                        timestamp: new Date().toISOString()
                    };

                    // Check if device is hub-managed
                    const isHubManaged = await isDeviceManagedByHub(targetSerial);

                    if (isHubManaged.managed && isHubManaged.hubSerial) {
                        io.to(`hub:${isHubManaged.hubSerial}`).emit('command', configRequest);
                        console.log(`[CLIENT] Config request sent via hub ${isHubManaged.hubSerial} for ${targetSerial}`);
                    } else {
                        io.to(`device:${targetSerial}`).emit('command', configRequest);
                        console.log(`[CLIENT] Config request sent directly to ${targetSerial}`);
                    }
                } catch (error) {
                    console.error(`[CLIENT] Config request error:`, error);
                }
            });

            socket.on('disconnect', () => {
                console.log(`[CLIENT] Client disconnected from ${serialNumber} (user: ${accountId})`);
            });
        } else {
            console.log(`[CLIENT] ❌ Invalid client connection - missing serialNumber or accountId`);
            console.log(`[CLIENT] Received:`, { serialNumber, accountId });
            socket.disconnect(true);
        }
    });

    // Health monitoring
    setInterval(() => {
        const connectedDevices = io.sockets.adapter.rooms;
        const deviceCount = Array.from(connectedDevices.keys()).filter((room: string) => room.startsWith('device:')).length;
        const hubCount = Array.from(connectedDevices.keys()).filter((room: string) => room.startsWith('hub:')).length;

        console.log(`[MONITOR] Connected - Devices: ${deviceCount}, Hubs: ${hubCount}`);

        io.of('/client').emit('system_status', {
            connected_devices: deviceCount,
            connected_hubs: hubCount,
            total_managed_devices: managedDeviceRegistry.size,
            timestamp: new Date().toISOString()
        });
    }, 60000); // Every minute

    console.log('[HUB] ✅ Database-Driven Hub Socket setup completed');
    console.log('[HUB] 🎯 Ready for dynamic ESP01 door control operations!');
};

// ===== DATABASE-DRIVEN HELPER FUNCTIONS =====

/**
 * ✅ Check if device is managed by a hub using database query
 */
async function isDeviceManagedByHub(deviceSerial: string): Promise<{managed: boolean, hubSerial?: string}> {
    try {
        const device = await prisma.devices.findFirst({
            where: {
                serial_number: deviceSerial,
                is_deleted: false
            },
            select: {
                hub_id: true
            }
        });

        if (device && device.hub_id && device.hub_id.trim() !== '') {
            return {
                managed: true,
                hubSerial: device.hub_id
            };
        }

        return { managed: false };
    } catch (error) {
        console.error(`[HUB] Error checking hub relationship for ${deviceSerial}:`, error);
        return { managed: false };
    }
}

/**
 * ✅ Get all devices managed by a specific hub
 */
export async function getHubManagedDevices(hubSerial: string): Promise<string[]> {
    try {
        const devices = await prisma.devices.findMany({
            where: {
                hub_id: hubSerial,
                is_deleted: false
            },
            select: {
                serial_number: true
            }
        });

        return devices.map(d => d.serial_number);
    } catch (error) {
        console.error(`[HUB] Error getting managed devices for hub ${hubSerial}:`, error);
        return [];
    }
}

/**
 * ✅ Update hub online status in database
 */
export async function updateHubStatus(hubSerial: string, isOnline: boolean): Promise<void> {
    try {
        await prisma.devices.update({
            where: { serial_number: hubSerial },
            data: {
                link_status: isOnline ? 'linked' : 'unlinked',
                updated_at: new Date(),
                attribute: {
                    device_type: 'ESP_SOCKET_HUB',
                    status: isOnline ? 'online' : 'offline',
                    last_seen: new Date().toISOString(),
                    managed_devices_count: isOnline ? await getHubManagedDevices(hubSerial).then(devices => devices.length) : 0
                }
            }
        });

        console.log(`[HUB] Updated hub ${hubSerial} status: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
        console.error(`[HUB] Error updating hub status for ${hubSerial}:`, error);
    }
}

/**
 * ✅ Get hub status information
 */
export function getHubStatus(): { hubs: HubDevice[], devices: ManagedDevice[] } {
    return {
        hubs: Array.from(hubRegistry.values()),
        devices: Array.from(managedDeviceRegistry.values())
    };
}

/**
 * ✅ Check if device is online (direct or via hub)
 */
export function isDeviceOnline(deviceSerial: string): boolean {
    // Check direct connection
    if (connectedSockets.has(deviceSerial)) {
        return true;
    }

    // Check via hub
    const managedDevice = managedDeviceRegistry.get(deviceSerial);
    if (managedDevice && managedDevice.isOnline) {
        const hub = hubRegistry.get(managedDevice.hubSerial);
        return hub ? hub.isOnline : false;
    }

    return false;
}

/**
 * ✅ Handle hub disconnection
 */
export async function handleHubDisconnection(hubSerial: string): Promise<void> {
    const hub = hubRegistry.get(hubSerial);
    if (hub) {
        hub.isOnline = false;

        // Mark all managed devices as offline
        hub.managedDevices.forEach(deviceSerial => {
            const device = managedDeviceRegistry.get(deviceSerial);
            if (device) {
                device.isOnline = false;
            }
        });

        console.log(`[HUB] Hub ${hubSerial} disconnected, marked ${hub.managedDevices.length} devices as offline`);
    }

    // Update database
    await updateHubStatus(hubSerial, false);
}