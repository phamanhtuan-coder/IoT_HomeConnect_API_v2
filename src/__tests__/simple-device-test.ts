// src/sockets/hub.socket.ts - REFACTORED UNIFIED HUB SYSTEM
import { Server, Socket } from 'socket.io';
import prisma from '../config/database';
import { DoorService } from '../services/door.service';

// Import handlers
import {
  setupArduinoMegaHandlers,
  setupDoorHubHandlers,
  setupESP01EventHandlers,
  setupDoorDeviceHandlers
} from '../sockets/handlers/door.handlers';

import {
  setupMegaGardenHandlers,
  setupGardenSystemHandlers
} from '../sockets/handlers/garden.handlers';

const doorService = new DoorService();

/**
 * Detect device type with enhanced ESP-01 safety + Garden System support
 */
const detectDeviceType = (socket: Socket): {
  isESP8266: boolean;
  isGateway: boolean;
  isESP01: boolean;
  isGardenSystem: boolean;
  isArduinoMega: boolean;
  deviceType: string
} => {
  const userAgent = socket.handshake.headers['user-agent'] || '';
  const query = socket.handshake.query;

  const isESP8266 = userAgent.includes('ESP01S-ServoController') ||
      userAgent.includes('ESP8266') ||
      userAgent.includes('ESP8266-DoorController') ||
      query.isIoTDevice === 'true';

  const isGateway = userAgent.includes('ESP-Gateway') ||
      userAgent.includes('Gateway') ||
      query.gateway_managed === 'true';

  const isESP01 = userAgent.includes('ESP-01') ||
      socket.handshake.headers['x-esp-device'] === 'ESP-01' ||
      query.device_type === 'ESP-01';

  // Garden System Detection
  const isGardenSystem = userAgent.includes('ESP_MASTER_GARDEN') ||
      userAgent.includes('ESP07_GARDEN') ||
      query.system_type === 'garden' ||
      query.device_type === 'garden_master' ||
      query.device_type === 'garden_display';

  // Arduino Mega Hub Detection
  const isArduinoMega = userAgent.includes('MEGA_HUB_GARDEN') ||
      userAgent.includes('Arduino-Mega') ||
      query.device_type === 'mega_hub' ||
      query.hub_type === 'arduino_mega';

  let deviceType = 'Unknown';
  if (isArduinoMega) {
    deviceType = 'Arduino Mega Hub';
  } else if (isGateway) {
    deviceType = 'ESP Gateway';
  } else if (isGardenSystem) {
    if (userAgent.includes('ESP07_GARDEN')) {
      deviceType = 'ESP07 Garden Display';
    } else {
      deviceType = 'ESP Garden Master';
    }
  } else if (isESP01) {
    deviceType = 'ESP-01 Direct';
  } else if (isESP8266) {
    deviceType = 'ESP8266 Direct';
  }

  return { isESP8266, isGateway, isESP01, isGardenSystem, isArduinoMega, deviceType };
};

export const setupHubSocket = (io: Server) => {
  console.log('[HUB] Initializing Unified Hub Socket with handlers...');

  // Enhanced connection handling with Garden System + Door System
  io.on('connection', async (socket: Socket) => {
    const {
      serialNumber,
      isIoTDevice,
      accountId,
      gateway_managed,
      hub_managed,
      system_type,
      device_type,
      hub_type
    } = socket.handshake.query as {
      serialNumber?: string;
      isIoTDevice?: string;
      accountId?: string;
      gateway_managed?: string;
      hub_managed?: string;
      system_type?: string;
      device_type?: string;
      hub_type?: string;
    };

    const { isESP8266, isGateway, isESP01, isGardenSystem, isArduinoMega, deviceType } = detectDeviceType(socket);

    // ✅ HANDLE ALL ESP/ARDUINO DEVICES with unified approach
    if ((isESP8266 || isGateway || isESP01 || isGardenSystem || isArduinoMega) && serialNumber && isIoTDevice === 'true' && !accountId) {
      console.log(`[HUB] ${deviceType} Device detected - Socket ID: ${socket.id}`);
      console.log(`[HUB] ${deviceType} params:`, {
        serialNumber,
        isIoTDevice,
        gateway_managed,
        hub_managed,
        system_type,
        device_type,
        hub_type
      });

      try {
        // ✅ ARDUINO MEGA HUB: Central controller for all systems
        if (isArduinoMega || hub_type === 'arduino_mega') {
          console.log(`[MEGA-HUB] ${serialNumber} connecting as Arduino Mega Central Hub`);

          socket.data = {
            serialNumber,
            isIoTDevice: true,
            isESP8266: false,
            isGateway: true,
            isHub: true,
            isArduinoMega: true,
            isGardenSystem: false,
            deviceType: 'Arduino Mega Hub',
            systemType: 'central_hub',
            capabilities: ['door_control', 'garden_automation', 'sensor_monitoring'],
            connectedAt: new Date()
          };

          socket.join(`mega-hub:${serialNumber}`);
          socket.join(`hub:${serialNumber}`);
          socket.join(`device:${serialNumber}`);
          console.log(`[MEGA-HUB] ${serialNumber} joined central hub rooms`);

          // Setup both door and garden handlers for Arduino Mega
          setupArduinoMegaHandlers(socket, io, serialNumber);
          setupMegaGardenHandlers(socket, io, serialNumber);

          setTimeout(() => {
            try {
              socket.emit('connection_welcome', {
                status: 'connected',
                namespace: 'mega-hub',
                serialNumber,
                deviceType,
                systemType: 'central_hub',
                capabilities: ['door_control', 'garden_automation', 'sensor_monitoring'],
                timestamp: new Date().toISOString()
              });
              console.log(`[MEGA-HUB] Welcome message sent to ${serialNumber}`);
            } catch (error) {
              console.error(`[MEGA-HUB] Welcome send failed:`, error);
            }
          }, 2000);

          console.log(`[MEGA-HUB] ${serialNumber} fully connected as Central Hub`);
          return;
        }

        // ✅ GARDEN SYSTEM: ESP Master Garden + ESP07 Display
        if (isGardenSystem || system_type === 'garden') {
          console.log(`[GARDEN] ${serialNumber} connecting as Garden System Device`);

          const isDisplay = deviceType.includes('Display') || device_type === 'garden_display';

          socket.data = {
            serialNumber,
            isIoTDevice: true,
            isESP8266: !isDisplay, // ESP07 is not ESP8266
            isGateway: false,
            isHub: false,
            isGardenSystem: true,
            isGardenDisplay: isDisplay,
            deviceType,
            systemType: 'garden',
            connectedAt: new Date()
          };

          socket.join(`garden:${serialNumber}`);
          socket.join(`device:${serialNumber}`);

          if (isDisplay) {
            socket.join(`garden-display:${serialNumber}`);
          } else {
            socket.join(`garden-master:${serialNumber}`);
          }

          console.log(`[GARDEN] ${serialNumber} joined garden system rooms`);

          // Use garden handlers
          setupGardenSystemHandlers(socket, io, serialNumber, isDisplay);

          setTimeout(() => {
            try {
              socket.emit('connection_welcome', {
                status: 'connected',
                namespace: 'garden-system',
                serialNumber,
                deviceType,
                systemType: 'garden',
                isDisplay,
                timestamp: new Date().toISOString()
              });
              console.log(`[GARDEN] Welcome sent to ${deviceType} ${serialNumber}`);
            } catch (error) {
              console.error(`[GARDEN] Welcome send failed:`, error);
            }
          }, 1500);

          console.log(`[GARDEN] ${deviceType} ${serialNumber} fully connected`);
          return;
        }

        // ✅ EXISTING DOOR SYSTEM: Keep all existing logic unchanged
        if (hub_managed === 'true' || gateway_managed === 'true') {
          console.log(`[DOOR-HUB] ${serialNumber} connecting as Door Hub/Gateway`);

          socket.data = {
            serialNumber,
            isIoTDevice: true,
            isESP8266: true,
            isGateway: true,
            isHub: hub_managed === 'true',
            isGardenSystem: false,
            deviceType: hub_managed === 'true' ? 'ESP Door Hub' : deviceType,
            systemType: 'door',
            gateway_managed: false,
            connectedAt: new Date()
          };

          // CRITICAL: Join rooms IMMEDIATELY before setting up handlers
          socket.join(`hub:${serialNumber}`);
          socket.join(`device:${serialNumber}`);
          console.log(`[DOOR-HUB] ${serialNumber} joined door hub rooms: hub:${serialNumber}, device:${serialNumber}`);

          // Use door hub handlers
          setupDoorHubHandlers(socket, io, serialNumber);

          // IMMEDIATE: Send welcome without delay for ESP Socket Hub
          try {
            socket.emit('connection_welcome', {
              status: 'connected',
              namespace: 'door-hub',
              serialNumber,
              deviceType,
              hub_managed: hub_managed === 'true',
              esp01_safety: true,
              rooms_joined: [`hub:${serialNumber}`, `device:${serialNumber}`],
              timestamp: new Date().toISOString()
            });
            console.log(`[DOOR-HUB] IMMEDIATE welcome message sent to ${serialNumber}`);
          } catch (error) {
            console.error(`[DOOR-HUB] Welcome send failed:`, error);
          }

          console.log(`[DOOR-HUB] ${serialNumber} fully connected as Door Hub`);
          return;
        }

        // ✅ EXISTING DOOR DEVICES: Keep all existing door logic unchanged
        console.log(`[DOOR-DEVICE] Looking up ${deviceType} ${serialNumber} in database...`);

        const device = await Promise.race([
          prisma.devices.findFirst({
            where: { serial_number: serialNumber, is_deleted: false },
          }),
          new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Database timeout')), 5000)
          )
        ]).catch(err => {
          console.error(`[DOOR-DEVICE] Database error for ${serialNumber}:`, err);
          throw new Error(`Database operation failed: ${err.message}`);
        });

        if (!device) {
          console.error(`[DOOR-DEVICE] Device ${serialNumber} not found in database`);
          socket.emit('connection_error', {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not registered',
            esp01_safe: true
          });
          setTimeout(() => socket.disconnect(true), 1000);
          return;
        }

        console.log(`[DOOR-DEVICE] ${deviceType} ${serialNumber} found, account: ${(device as any).account_id}`);

        socket.data = {
          serialNumber,
          isIoTDevice: true,
          isESP8266: !isESP01,
          isGateway: false,
          isESP01: isESP01,
          isGardenSystem: false,
          deviceType,
          systemType: 'door',
          gateway_managed: gateway_managed === 'true',
          connectedAt: new Date(),
          esp01_mode: isESP01
        };

        socket.join(`door:${serialNumber}`);
        socket.join(`device:${serialNumber}`);
        console.log(`[DOOR-DEVICE] ${serialNumber} joined door device rooms`);

        // Update database with device metadata
        const updateData: any = {
          updated_at: new Date(),
          runtime_capabilities: {
            ...(device as any).runtime_capabilities as any,
            last_socket_connection: new Date().toISOString(),
            connection_type: gateway_managed === 'true' ? 'gateway' :
                isESP01 ? 'esp01_direct' : 'esp8266_direct',
            socket_connected: true,
            device_type: deviceType,
            esp01_mode: isESP01
          }
        };

        if (gateway_managed === 'true') {
          updateData.hub_id = serialNumber;
        }

        prisma.devices.update({
          where: { serial_number: serialNumber },
          data: updateData
        }).catch(err => {
          console.error(`[DOOR-DEVICE] Metadata update failed for ${serialNumber}:`, err);
        });

        const welcomeDelay = isESP01 ? 3000 : 2000;
        setTimeout(() => {
          try {
            socket.emit('connection_welcome', {
              status: 'connected',
              namespace: isESP01 ? 'main-esp01' : 'main-door',
              serialNumber,
              deviceType,
              gateway_managed: gateway_managed === 'true',
              link_status: (device as any).link_status,
              esp01_mode: isESP01,
              safety_enabled: true,
              timestamp: new Date().toISOString()
            });
            console.log(`[DOOR-DEVICE] Welcome sent to ${deviceType} ${serialNumber}`);
          } catch (error) {
            console.error(`[DOOR-DEVICE] Welcome failed for ${serialNumber}:`, error);
          }
        }, welcomeDelay);

        // Setup device handlers based on type
        if (isESP01) {
          setupESP01EventHandlers(socket, io, serialNumber, device as any);
        } else {
          setupDoorDeviceHandlers(socket, io, serialNumber, device as any);
        }

        console.log(`[DOOR-DEVICE] ${deviceType} ${serialNumber} fully connected`);

      } catch (error) {
        console.error(`[ERROR] Critical setup error for ${deviceType} ${serialNumber}:`, error);

        try {
          socket.emit('connection_error', {
            code: 'SETUP_ERROR',
            message: (error as Error)?.message || 'Setup failed',
            deviceType,
            esp01_safe: true,
            timestamp: new Date().toISOString()
          });
        } catch (emitError) {
          console.error(`[ERROR] Error emit failed for ${serialNumber}:`, emitError);
        }

        setTimeout(() => socket.disconnect(true), 2000);
      }

      return;
    }
  });

  // ============= CLIENT NAMESPACE WITH UNIFIED COMMAND HANDLING =============
  const clientNamespace = io.of('/client');

  clientNamespace.on('connection', async (socket: Socket) => {
    const { serialNumber, accountId, systemType } = socket.handshake.query as {
      serialNumber?: string;
      accountId?: string;
      systemType?: string; // 'door', 'garden', 'central'
    };

    if (serialNumber && accountId) {
      console.log(`[CLIENT] Client connected for ${systemType || 'device'} ${serialNumber} by user ${accountId}`);

      // Join appropriate rooms based on system type
      if (systemType === 'garden') {
        socket.join(`garden:${serialNumber}`);
      } else if (systemType === 'central') {
        socket.join(`mega-hub:${serialNumber}`);
      } else {
        socket.join(`door:${serialNumber}`); // Default for backward compatibility
      }

      // ✅ CRITICAL: Validate device access for door system
      if (systemType === 'door' || !systemType) {
        try {
          // For door system, check if this is an ESP Socket Hub or target device
          console.log(`[CLIENT] Validating door system access for ${serialNumber}`);

          // If client connects to ESP Socket Hub serial, they control managed devices
          // If client connects to ESP-01 serial, direct control

        } catch (error) {
          console.error(`[CLIENT] Access validation failed for ${serialNumber}:`, error);
        }
      }

      // ✅ DOOR COMMAND ROUTING: Match exact format ESP Socket Hub expects
      socket.on('device_command', (commandData) => {
        try {
          console.log(`[CMD] Unified command from client for ${serialNumber}:`, JSON.stringify(commandData, null, 2));

          const enhancedCommand = {
            action: commandData.action,
            serialNumber: serialNumber,
            fromClient: accountId,
            systemType: systemType || 'door',
            esp01_safe: true, // ESP-01 compatibility flag như ESP code expects
            state: commandData.state || {},
            timestamp: new Date().toISOString()
          };

          console.log(`[CMD] Sending unified command:`, JSON.stringify(enhancedCommand, null, 2));

          // Route command to appropriate system
          if (systemType === 'garden') {
            // Garden system commands
            io.to(`garden:${serialNumber}`).emit('command', enhancedCommand);
            io.to(`garden-master:${serialNumber}`).emit('command', enhancedCommand);

          } else if (systemType === 'central') {
            // Central hub commands (Arduino Mega)
            io.to(`mega-hub:${serialNumber}`).emit('command', enhancedCommand);

          } else {
            // Door system commands - EXACT format ESP Socket Hub expects
            io.to(`device:${serialNumber}`).emit('command', enhancedCommand);
            io.to(`hub:${serialNumber}`).emit('command', enhancedCommand);
          }

          // Client acknowledgment
          socket.emit('device_command_sent', {
            success: true,
            serialNumber,
            systemType: systemType || 'door',
            command: enhancedCommand,
            esp01_compatible: true,
            timestamp: new Date().toISOString()
          });

          console.log(`[CMD] Unified command sent to ${systemType || 'door'} ${serialNumber}`);
        } catch (error) {
          console.error(`[CMD] Unified command error for ${serialNumber}:`, error);

          socket.emit('device_command_error', {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            serialNumber,
            systemType: systemType || 'door',
            timestamp: new Date().toISOString()
          });
        }
      });

      // ✅ BACKWARD COMPATIBILITY: Keep EXACT door_command format ESP Socket Hub expects
      socket.on('door_command', (commandData) => {
        try {
          console.log(`[CMD] Legacy door command for ${serialNumber}:`, typeof commandData, commandData);

          // CRITICAL: Handle both string and object formats from Postman
          let parsedCommand;
          if (typeof commandData === 'string') {
            try {
              parsedCommand = JSON.parse(commandData);
              console.log(`[CMD] Parsed string command:`, parsedCommand);
            } catch (parseError) {
              console.error(`[CMD] Failed to parse command string:`, parseError);
              socket.emit('door_command_error', {
                success: false,
                error: 'Invalid command format - must be valid JSON',
                serialNumber,
                timestamp: new Date().toISOString()
              });
              return;
            }
          } else {
            parsedCommand = commandData;
          }

          // Validate required fields
          if (!parsedCommand.action) {
            console.error(`[CMD] Missing action in command:`, parsedCommand);
            socket.emit('door_command_error', {
              success: false,
              error: 'Missing required field: action',
              serialNumber,
              timestamp: new Date().toISOString()
            });
            return;
          }

          // CRITICAL: Determine target device
          let targetSerial = serialNumber; // Default to connected client's device

          // If command specifies target device, use that
          if (parsedCommand.serialNumber && parsedCommand.serialNumber !== serialNumber) {
            targetSerial = parsedCommand.serialNumber;
            console.log(`[CMD] Command targets different device: ${targetSerial}`);
          }

          // ESP Socket Hub expects exactly this format in parseAndExecuteEnhancedCommand()
          const doorCommand = {
            action: parsedCommand.action,
            serialNumber: targetSerial, // Use determined target
            fromClient: accountId,
            esp01_safe: true, // Critical flag ESP Socket Hub checks
            state: parsedCommand.state || {},
            timestamp: new Date().toISOString()
          };

          console.log(`[CMD] Sending door command to target: ${targetSerial}`);
          console.log(`[CMD] Final command data:`, JSON.stringify(doorCommand, null, 2));

          // CRITICAL: Check if ESP Socket Hub is connected for the target
          const hubRooms = [`device:${serialNumber}`, `hub:${serialNumber}`];

          console.log(`[CMD] Checking ESP Socket Hub availability for ${serialNumber}...`);

          // Get all sockets in the hub room to check if ESP Socket Hub is connected
          const hubSockets = io.sockets.adapter.rooms.get(`hub:${serialNumber}`);
          const deviceSockets = io.sockets.adapter.rooms.get(`device:${serialNumber}`);

          console.log(`[CMD] Hub room ${serialNumber} has ${hubSockets?.size || 0} sockets`);
          console.log(`[CMD] Device room ${serialNumber} has ${deviceSockets?.size || 0} sockets`);

          if (!hubSockets || hubSockets.size === 0) {
            console.log(`[CMD] ❌ ESP Socket Hub ${serialNumber} not connected to rooms`);
            socket.emit('door_command_error', {
              success: false,
              error: 'ESP Socket Hub not connected',
              serialNumber: targetSerial,
              hubSerial: serialNumber,
              available_rooms: Array.from(io.sockets.adapter.rooms.keys()).filter(room => room.includes(serialNumber)),
              timestamp: new Date().toISOString()
            });
            return;
          }

          // Send to ESP Socket Hub in main namespace (not /client namespace)
          const roomsSent: string[] = [];

          // Send to the ESP Socket Hub managing this device
          io.to(`device:${serialNumber}`).emit('command', doorCommand);
          io.to(`hub:${serialNumber}`).emit('command', doorCommand);
          roomsSent.push(`device:${serialNumber}`, `hub:${serialNumber}`);

          console.log(`[CMD] ✅ Command sent to ESP Socket Hub rooms: ${roomsSent.join(', ')}`);

          // Client acknowledgment
          socket.emit('door_command_sent', {
            success: true,
            serialNumber: targetSerial,
            hubSerial: serialNumber,
            command: doorCommand,
            esp01_compatible: true,
            sent_to_rooms: roomsSent,
            hub_connected: true,
            command_format: 'fixed',
            timestamp: new Date().toISOString()
          });

          console.log(`[CMD] ✅ Door command sent - Hub: ${serialNumber}, Target: ${targetSerial}, Action: ${doorCommand.action}`);
        } catch (error) {
          console.error(`[CMD] Door command error for ${serialNumber}:`, error);

          socket.emit('door_command_error', {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            serialNumber,
            timestamp: new Date().toISOString()
          });
        }
      });

      // ✅ NEW: Garden specific commands
      socket.on('garden_command', (commandData) => {
        try {
          console.log(`[GARDEN-CMD] Garden command for ${serialNumber}:`, commandData);

          const gardenCommand = {
            action: commandData.action, // pump_on, pump_off, auto_toggle
            serialNumber,
            fromClient: accountId,
            systemType: 'garden',
            command: commandData.command, // For backward compatibility
            timestamp: new Date().toISOString()
          };

          // Send to Arduino Mega Hub (which controls garden)
          io.to(`mega-hub:${serialNumber}`).emit('garden_command', gardenCommand);

          socket.emit('garden_command_sent', {
            success: true,
            serialNumber,
            command: gardenCommand,
            timestamp: new Date().toISOString()
          });

          console.log(`[GARDEN-CMD] Garden command sent to Mega Hub`);
        } catch (error) {
          console.error(`[GARDEN-CMD] Garden command error:`, error);

          socket.emit('garden_command_error', {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on('disconnect', () => {
        console.log(`[CLIENT] Client disconnected from ${systemType || 'device'} ${serialNumber} (user: ${accountId})`);
      });
    }
  });

  console.log('[INIT] ✅ Unified Hub socket setup completed with refactored handlers');
  console.log('[INIT] 📁 Handlers loaded:');
  console.log('[INIT]   - Door handlers: Arduino Mega, ESP Hub, ESP-01, ESP8266');
  console.log('[INIT]   - Garden handlers: Mega Garden, ESP Master, ESP07 Display');
};