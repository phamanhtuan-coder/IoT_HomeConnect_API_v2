import HourlyValueService from '../services/hourly-value.service';
import prisma from '../config/database';
import redisClient from '../utils/redis';
import { Server } from 'socket.io';

/**
 * Device Simulator Script
 * Giả lập thiết bị IoT gửi dữ liệu cảm biến liên tục
 * Mô phỏng quá trình xử lý từ Redis đến Database
 */

class DeviceSimulator {
  private hourlyValueService: HourlyValueService;
  private devices: Array<{
    serial: string;
    spaceId: number;
    interval: NodeJS.Timeout | null;
    sampleCount: number;
    minuteCount: number;
    hourCount: number;
  }> = [];

  constructor() {
    this.hourlyValueService = new HourlyValueService();
  }

  /**
   * Tạo thiết bị giả lập
   */
  createDevice(serial: string, spaceId: number) {
    const device = {
      serial,
      spaceId,
      interval: null,
      sampleCount: 0,
      minuteCount: 0,
      hourCount: 0,
    };

    this.devices.push(device);
    console.log(`🔧 Created simulated device: ${serial} (Space ID: ${spaceId})`);
    return device;
  }

  /**
   * Bắt đầu giả lập thiết bị gửi dữ liệu
   */
  startDevice(serial: string, intervalMs: number = 10000) {
    const device = this.devices.find(d => d.serial === serial);
    if (!device) {
      console.error(`❌ Device ${serial} not found`);
      return;
    }

    if (device.interval) {
      console.warn(`⚠️  Device ${serial} is already running`);
      return;
    }

    console.log(`🚀 Starting device ${serial} - sending data every ${intervalMs}ms`);

    device.interval = setInterval(async () => {
      try {
        // Tạo dữ liệu cảm biến giả lập với biến động thực tế
        const sensorData = this.generateSensorData();
        
        await this.hourlyValueService.processSensorData(serial, sensorData);
        
        device.sampleCount++;
        
        // Log progress
        if (device.sampleCount % 6 === 0) {
          device.minuteCount++;
          console.log(`📊 ${serial}: Completed minute ${device.minuteCount} (${device.sampleCount} samples)`);
        }
        
        if (device.sampleCount % 360 === 0) {
          device.hourCount++;
          console.log(`⏰ ${serial}: Completed hour ${device.hourCount} (${device.sampleCount} samples total)`);
        }

      } catch (error) {
        console.error(`❌ Error processing data for ${serial}:`, error);
      }
    }, intervalMs);

    console.log(`✅ Device ${serial} started successfully`);
  }

  /**
   * Dừng giả lập thiết bị
   */
  stopDevice(serial: string) {
    const device = this.devices.find(d => d.serial === serial);
    if (!device) {
      console.error(`❌ Device ${serial} not found`);
      return;
    }

    if (device.interval) {
      clearInterval(device.interval);
      device.interval = null;
      console.log(`⏹️  Stopped device ${serial}`);
      console.log(`📈 Final stats for ${serial}:`);
      console.log(`   - Total samples: ${device.sampleCount}`);
      console.log(`   - Minutes completed: ${device.minuteCount}`);
      console.log(`   - Hours completed: ${device.hourCount}`);
    }
  }

  /**
   * Dừng tất cả thiết bị
   */
  stopAllDevices() {
    this.devices.forEach(device => {
      if (device.interval) {
        this.stopDevice(device.serial);
      }
    });
  }

  /**
   * Tạo dữ liệu cảm biến giả lập với biến động thực tế
   */
  private generateSensorData() {
    // Base values với biến động ngẫu nhiên
    const baseTemp = 25.0;
    const baseHumidity = 60.0;
    const baseGas = 0.1;

    // Thêm biến động theo thời gian (simulate daily patterns)
    const hour = new Date().getHours();
    const timeVariation = Math.sin((hour - 6) * Math.PI / 12) * 3; // ±3°C variation

    // Thêm noise ngẫu nhiên
    const tempNoise = (Math.random() - 0.5) * 2; // ±1°C
    const humidityNoise = (Math.random() - 0.5) * 4; // ±2%
    const gasNoise = (Math.random() - 0.5) * 0.02; // ±0.01

    return {
      temperature: baseTemp + timeVariation + tempNoise,
      humidity: Math.max(0, Math.min(100, baseHumidity + humidityNoise)), // Clamp 0-100%
      gas: Math.max(0, baseGas + gasNoise), // Clamp >= 0
    };
  }

  /**
   * Hiển thị trạng thái tất cả thiết bị
   */
  getStatus() {
    console.log('\n📊 Device Status Report:');
    console.log('='.repeat(50));
    
    this.devices.forEach(device => {
      const status = device.interval ? '🟢 Running' : '🔴 Stopped';
      console.log(`${status} | ${device.serial} | Samples: ${device.sampleCount} | Minutes: ${device.minuteCount} | Hours: ${device.hourCount}`);
    });
    
    console.log('='.repeat(50));
  }

  /**
   * Chạy demo với nhiều thiết bị
   */
  async runDemo() {
    console.log('🎬 Starting Device Simulator Demo...\n');

    // Tạo nhiều thiết bị
    this.createDevice('DEMO_DEVICE_001', 1);
    this.createDevice('DEMO_DEVICE_002', 2);
    this.createDevice('DEMO_DEVICE_003', 3);

    // Bắt đầu thiết bị với khoảng thời gian khác nhau
    this.startDevice('DEMO_DEVICE_001', 10000); // 10 giây
    this.startDevice('DEMO_DEVICE_002', 15000); // 15 giây
    this.startDevice('DEMO_DEVICE_003', 20000); // 20 giây

    // Hiển thị trạng thái mỗi phút
    const statusInterval = setInterval(() => {
      this.getStatus();
    }, 60000);

    // Chạy trong 2 giờ (7200 giây)
    console.log('⏰ Demo will run for 2 hours...');
    
    setTimeout(() => {
      console.log('\n🛑 Stopping demo...');
      clearInterval(statusInterval);
      this.stopAllDevices();
      console.log('✅ Demo completed!');
      process.exit(0);
    }, 7200000); // 2 hours
  }
}

// Export cho testing
export { DeviceSimulator };

// Chạy demo nếu file được execute trực tiếp
if (require.main === module) {
  const simulator = new DeviceSimulator();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    simulator.stopAllDevices();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    simulator.stopAllDevices();
    process.exit(0);
  });

  // Bắt đầu demo
  simulator.runDemo().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
} 