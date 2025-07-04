// src/sockets/index.ts - UPDATED FOR UNIFIED HUB SYSTEM + CAMERA SYSTEM
import { Server } from 'socket.io';
import { setupDeviceSocket } from './device.socket';
import { setupHubSocket } from './hub.socket'; // Renamed from door.socket.ts
import { CameraSocket } from './camera.socket';

/**
 * Initialize all socket namespaces and handlers
 * Now supports unified hub system for Door + Garden + Central Hub + Camera System
 */
export const initSocket = (io: Server) => {
    console.log('🚀 Initializing Socket.IO with Unified Hub System + Camera System...');

    // 1. Device Socket - Fire alarm, LED control, sensor devices
    console.log('📡 Setting up Device Socket (Fire Alarm, LED, Sensors)...');
    setupDeviceSocket(io);

    // 2. Unified Hub Socket - Door + Garden + Central Hub system (with handlers)
    console.log('🏠 Setting up Unified Hub Socket (Door + Garden + Central Hub)...');
    setupHubSocket(io);

    // 3. Camera Socket - ESP32-CAM devices
    console.log('📷 Setting up Camera Socket (ESP32-CAM devices)...');
    new CameraSocket(io);

    console.log('✅ Socket.IO initialization completed');
    console.log('📋 Available Systems:');
    console.log('   - Device System: /device namespace (Fire alarms, LED controllers, Sensors)');
    console.log('   - Unified Hub System: Main namespace (Doors, Garden, Central Hub)');
    console.log('   - Camera System: /camera namespace (ESP32-CAM devices)');
    console.log('   - Client Apps: /client namespace (Mobile/Web applications)');
    console.log('');
    console.log('📁 Handler Files:');
    console.log('   - door.handlers.ts: Arduino Mega, ESP Door Hub, ESP-01, ESP8266 door devices');
    console.log('   - garden.handlers.ts: Mega Garden, ESP Master Garden, ESP07 Display');
    console.log('   - device.handlers.ts: Fire alarms, sensors, LED controllers');
    console.log('   - camera.socket.ts: ESP32-CAM devices with Mux streaming');
    console.log('');
    console.log('🔧 Supported Device Types:');
    console.log('   Hub System (door.handlers.ts + garden.handlers.ts):');
    console.log('     - Arduino Mega Hub (Central controller) → Both handlers');
    console.log('     - ESP Socket Hub (Door gateway) → Door handlers');
    console.log('     - ESP Master Garden (Garden controller) → Garden handlers');
    console.log('     - ESP07 Garden Display (Garden display) → Garden handlers');
    console.log('     - ESP-01 Door Controllers (Door devices) → Door handlers');
    console.log('     - ESP8266 Door Controllers (Door devices) → Door handlers');
    console.log('   Device System (device.handlers.ts):');
    console.log('     - ESP8266 Fire Alarms');
    console.log('     - ESP8266 LED Controllers');
    console.log('     - ESP8266 Sensor Nodes');
    console.log('   Camera System (camera.socket.ts):');
    console.log('     - ESP32-CAM devices with Mux video streaming');
    console.log('     - Photo capture and streaming capabilities');
    console.log('');
    console.log('📡 Socket Connection Examples:');
    console.log('   Arduino Mega Hub (uses both door + garden handlers):');
    console.log('     ?serialNumber=MEGA_HUB_GARDEN_001&isIoTDevice=true&hub_type=arduino_mega');
    console.log('   Garden Master (uses garden handlers):');
    console.log('     ?serialNumber=ESP_MASTER_GARDEN_001&isIoTDevice=true&system_type=garden&device_type=garden_master');
    console.log('   Garden Display (uses garden handlers):');
    console.log('     ?serialNumber=ESP07_GARDEN_001&isIoTDevice=true&system_type=garden&device_type=garden_display');
    console.log('   Door Hub (uses door handlers):');
    console.log('     ?serialNumber=ESP_SOCKET_HUB_001&isIoTDevice=true&hub_managed=true');
    console.log('   ESP-01 Door (uses door handlers):');
    console.log('     ?serialNumber=DOOR_DEVICE_001&isIoTDevice=true&device_type=ESP-01');
    console.log('   Fire Alarm (uses device handlers, connects to /device namespace):');
    console.log('     ?serialNumber=FIRE_ALARM_001&isIoTDevice=true&client_type=esp8266');
    console.log('   ESP32-CAM Camera (uses camera handlers, connects to /camera namespace):');
    console.log('     ?serialNumber=CAMERA_001&isIoTDevice=true&device_type=esp32_cam');
    console.log('');
};