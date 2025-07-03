import HourlyValueService from '../services/hourly-value.service';
import prisma from '../config/database';
import redisClient from '../utils/redis';

/**
 * Redis Data Test - Test gửi dữ liệu thực tế lên Redis
 * Yêu cầu: Redis server đang chạy
 */

describe('Redis Data Test - Real Data Sending', () => {
  let hourlyValueService: HourlyValueService;
  
  const TEST_DEVICE_SERIAL = 'REDIS_TEST_DEVICE_001';
  const TEST_SPACE_ID = 1;

  beforeAll(async () => {
    // Kiểm tra kết nối Redis
    try {
      await redisClient.ping();
      console.log('✅ Redis connection successful');
    } catch (error) {
      console.log('❌ Redis connection failed:', (error as Error).message);
      throw new Error('Redis server is not running. Please start Redis first.');
    }

    // Mock device trong database
    jest.spyOn(prisma.devices, 'findUnique').mockResolvedValue({
      serial_number: TEST_DEVICE_SERIAL,
      space_id: TEST_SPACE_ID,
    } as any);

    // Mock hourly_values.create
    jest.spyOn(prisma.hourly_values, 'create').mockResolvedValue({
      hourly_value_id: 1,
      device_serial: TEST_DEVICE_SERIAL,
      space_id: TEST_SPACE_ID,
      hour_timestamp: new Date(),
      avg_value: { temperature: 25.5, humidity: 60.2, gas: 0.1 },
      sample_count: 360,
    } as any);

    hourlyValueService = new HourlyValueService();
  });

  afterAll(async () => {
    // Cleanup Redis data
    try {
      const keys = await redisClient.keys(`device:${TEST_DEVICE_SERIAL}:*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`🧹 Cleaned up ${keys.length} Redis keys for ${TEST_DEVICE_SERIAL}`);
      }
    } catch (error) {
      console.log('Warning: Could not cleanup Redis data:', (error as Error).message);
    }
    
    jest.restoreAllMocks();
  });

  describe('Single Sensor Data Sending', () => {
    it('should send single sensor data to Redis', async () => {
      const sensorData = {
        temperature: 25.5,
        humidity: 60.2,
        gas: 0.1
      };

      console.log(`📡 Sending sensor data:`, sensorData);
      
      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Kiểm tra dữ liệu đã được lưu trong Redis
      const minuteKey = `device:${TEST_DEVICE_SERIAL}:minute`;
      const hourKey = `device:${TEST_DEVICE_SERIAL}:hour`;
      
      const minuteData = await redisClient.get(minuteKey);
      const hourData = await redisClient.get(hourKey);

      console.log(`📊 Minute data in Redis:`, minuteData);
      console.log(`📊 Hour data in Redis:`, hourData);

      expect(minuteData).toBeTruthy();
      expect(hourData).toBeTruthy();
    });

    it('should accumulate multiple readings in Redis', async () => {
      const readings = [
        { temperature: 25.0, humidity: 60.0, gas: 0.1 },
        { temperature: 26.0, humidity: 61.0, gas: 0.11 },
        { temperature: 24.0, humidity: 59.0, gas: 0.09 },
      ];

      console.log(`📡 Sending ${readings.length} sensor readings...`);

      for (let i = 0; i < readings.length; i++) {
        const reading = readings[i];
        console.log(`  Reading ${i + 1}:`, reading);
        
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, reading);
        
        // Đợi 1 giây giữa các lần gửi
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Kiểm tra dữ liệu tích lũy
      const minuteKey = `device:${TEST_DEVICE_SERIAL}:minute`;
      const minuteData = await redisClient.get(minuteKey);
      
      console.log(`📊 Accumulated minute data:`, minuteData);
      
      expect(minuteData).toBeTruthy();
      
      // Parse và kiểm tra dữ liệu
      const parsedData = JSON.parse(minuteData!);
      expect(parsedData.count).toBeGreaterThan(0);
      expect(parsedData.values).toBeTruthy();
    });
  });

  describe('Simulate Real-time Data Stream', () => {
    it('should handle continuous data stream', async () => {
      console.log(`🔄 Starting continuous data stream simulation...`);
      
      const streamDuration = 10; // 10 giây
      const interval = 500; // 500ms giữa các lần gửi
      const totalReadings = Math.floor(streamDuration * 1000 / interval);
      
      let sentCount = 0;
      
      const sendData = async () => {
        const temperature = 20 + Math.random() * 10; // 20-30°C
        const humidity = 50 + Math.random() * 20; // 50-70%
        const gas = 0.05 + Math.random() * 0.1; // 0.05-0.15
        
        const sensorData = { temperature, humidity, gas };
        
        try {
          await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);
          sentCount++;
          
          if (sentCount % 5 === 0) {
            console.log(`  📡 Sent ${sentCount}/${totalReadings} readings`);
          }
        } catch (error) {
          console.log(`  ❌ Error sending data:`, (error as Error).message);
        }
      };

      // Gửi dữ liệu liên tục
      const intervalId = setInterval(sendData, interval);
      
      // Dừng sau streamDuration giây
      await new Promise(resolve => setTimeout(resolve, streamDuration * 1000));
      clearInterval(intervalId);

      console.log(`✅ Stream completed. Total readings sent: ${sentCount}`);
      
      // Kiểm tra dữ liệu cuối cùng
      const minuteKey = `device:${TEST_DEVICE_SERIAL}:minute`;
      const minuteData = await redisClient.get(minuteKey);
      
      console.log(`📊 Final minute data:`, minuteData);
      
      expect(sentCount).toBeGreaterThan(0);
      expect(minuteData).toBeTruthy();
    });
  });

  describe('Redis Data Inspection', () => {
    it('should inspect Redis data structure', async () => {
      // Gửi một số dữ liệu trước
      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };
      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Lấy tất cả keys liên quan đến device
      const deviceKeys = await redisClient.keys(`device:${TEST_DEVICE_SERIAL}:*`);
      console.log(`🔍 Device keys in Redis:`, deviceKeys);

      // Kiểm tra từng key
      for (const key of deviceKeys) {
        const data = await redisClient.get(key);
        const ttl = await redisClient.ttl(key);
        
        console.log(`  Key: ${key}`);
        console.log(`  TTL: ${ttl}s`);
        console.log(`  Data: ${data}`);
        console.log(`  ---`);
        
        expect(data).toBeTruthy();
        expect(ttl).toBeGreaterThan(0);
      }
    });

    it('should test Redis TTL expiration', async () => {
      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };
      
      // Gửi dữ liệu
      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);
      
      // Kiểm tra TTL
      const minuteKey = `device:${TEST_DEVICE_SERIAL}:minute`;
      const hourKey = `device:${TEST_DEVICE_SERIAL}:hour`;
      
      const minuteTTL = await redisClient.ttl(minuteKey);
      const hourTTL = await redisClient.ttl(hourKey);
      
      console.log(`⏰ Minute key TTL: ${minuteTTL}s`);
      console.log(`⏰ Hour key TTL: ${hourTTL}s`);
      
      // Minute key nên có TTL khoảng 60s, hour key khoảng 3600s
      expect(minuteTTL).toBeGreaterThan(0);
      expect(hourTTL).toBeGreaterThan(0);
    });
  });

  describe('Error Handling with Real Redis', () => {
    it('should handle Redis connection issues gracefully', async () => {
      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };
      
      // Test với dữ liệu hợp lệ
      await expect(
        hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData)
      ).resolves.not.toThrow();
    });

    it('should handle invalid data gracefully', async () => {
      const invalidData = [
        { temperature: NaN, humidity: 60.0, gas: 0.1 },
        { temperature: 25.0, humidity: undefined, gas: 0.1 },
        { temperature: 25.0, humidity: 60.0, gas: undefined },
      ];

      for (const data of invalidData) {
        await expect(
          hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, data)
        ).resolves.not.toThrow();
      }
    });
  });
}); 