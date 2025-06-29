import HourlyValueService from '../services/hourly-value.service';
import prisma from '../config/database';
import redisClient from '../utils/redis';
import { Server } from 'socket.io';

// Mock dependencies
jest.mock('../config/database');
jest.mock('../utils/redis');
jest.mock('socket.io');

describe('Device Simulator - Full Hour Data Flow', () => {
  let hourlyValueService: HourlyValueService;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockRedis: jest.Mocked<typeof redisClient>;

  const TEST_DEVICE_SERIAL = 'SIMULATED_DEVICE_001';
  const TEST_SPACE_ID = 1;

  // Constants from the service
  const SAMPLES_PER_MINUTE = 6;
  const MINUTES_PER_HOUR = 60;
  const TOTAL_SAMPLES_PER_HOUR = SAMPLES_PER_MINUTE * MINUTES_PER_HOUR; // 360 samples

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockRedis = redisClient as jest.Mocked<typeof redisClient>;

    // Mock device lookup
    mockPrisma.devices.findUnique.mockResolvedValue({
      serial_number: TEST_DEVICE_SERIAL,
      space_id: TEST_SPACE_ID,
    } as any);

    // Mock hourly_values.create
    mockPrisma.hourly_values.create.mockResolvedValue({
      hourly_value_id: 1,
      device_serial: TEST_DEVICE_SERIAL,
      space_id: TEST_SPACE_ID,
      hour_timestamp: new Date(),
      avg_value: { temperature: 25.5, humidity: 60.2, gas: 0.1 },
      sample_count: TOTAL_SAMPLES_PER_HOUR,
    } as any);

    hourlyValueService = new HourlyValueService();
  });

  afterEach(async () => {
    // Cleanup Redis keys
    try {
      await mockRedis.del(`device:${TEST_DEVICE_SERIAL}:minute`);
      await mockRedis.del(`device:${TEST_DEVICE_SERIAL}:hour`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Simulate Full Hour of Device Data', () => {
    it('should simulate device sending data every 10 seconds for 1 hour', async () => {
      const startTime = Date.now();
      let minuteCount = 0;
      let hourCount = 0;
      let databaseSaves = 0;

      // Track Redis calls
      const redisCalls: any[] = [];
      mockRedis.eval.mockImplementation((script, keys, ...args) => {
        redisCalls.push({ script, keys, args });
        
        // Simulate different stages of data accumulation
        const currentCall = redisCalls.length;
        const currentMinute = Math.floor((currentCall - 1) / SAMPLES_PER_MINUTE);
        const currentHour = Math.floor(currentMinute / MINUTES_PER_HOUR);
        const sampleInMinute = (currentCall - 1) % SAMPLES_PER_MINUTE;
        const minuteInHour = currentMinute % MINUTES_PER_HOUR;

        // Check if minute is complete
        const minuteComplete = sampleInMinute === SAMPLES_PER_MINUTE - 1;
        
        // Check if hour is complete
        const hourComplete = minuteComplete && minuteInHour === MINUTES_PER_HOUR - 1;

        if (hourComplete) {
          hourCount++;
          databaseSaves++;
          return Promise.resolve([
            true, // minuteComplete
            true, // hourComplete
            { temperature: 25.0, humidity: 60.0, gas: 0.1 }, // minuteAvg
            { 
              count: MINUTES_PER_HOUR,
              values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 },
              timestamp: startTime
            } // hourData
          ]);
        } else if (minuteComplete) {
          minuteCount++;
          return Promise.resolve([
            true, // minuteComplete
            false, // hourComplete
            { temperature: 25.0, humidity: 60.0, gas: 0.1 }, // minuteAvg
            {} // hourData
          ]);
        } else {
          return Promise.resolve([false, false, {}, {}]);
        }
      });

      // Simulate device sending data every 10 seconds for 1 hour
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < TOTAL_SAMPLES_PER_HOUR; i++) {
        const sensorData = {
          temperature: 25.0 + Math.random() * 2 - 1, // 24-26°C with some variation
          humidity: 60.0 + Math.random() * 4 - 2,    // 58-62% with some variation
          gas: 0.1 + Math.random() * 0.02 - 0.01     // 0.09-0.11 with some variation
        };

        promises.push(
          hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData)
        );

        // Add small delay to simulate real-time processing
        if (i < TOTAL_SAMPLES_PER_HOUR - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Wait for all processing to complete
      await Promise.all(promises);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify results
      expect(redisCalls.length).toBe(TOTAL_SAMPLES_PER_HOUR);
      expect(minuteCount).toBe(MINUTES_PER_HOUR);
      expect(hourCount).toBe(1);
      expect(databaseSaves).toBe(1);

      // Verify database was called once for the complete hour
      expect(mockPrisma.hourly_values.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.hourly_values.create).toHaveBeenCalledWith({
        data: {
          device_serial: TEST_DEVICE_SERIAL,
          space_id: TEST_SPACE_ID,
          hour_timestamp: expect.any(Date),
          avg_value: { temperature: 25.0, humidity: 60.0, gas: 0.1 },
          sample_count: TOTAL_SAMPLES_PER_HOUR,
        },
      });

      console.log(`✅ Simulated ${TOTAL_SAMPLES_PER_HOUR} samples in ${processingTime}ms`);
      console.log(`✅ Completed ${minuteCount} minutes and ${hourCount} hour(s)`);
      console.log(`✅ Saved ${databaseSaves} record(s) to database`);
    });

    it('should handle multiple devices simultaneously', async () => {
      const devices = [
        { serial: 'DEVICE_001', spaceId: 1 },
        { serial: 'DEVICE_002', spaceId: 2 },
        { serial: 'DEVICE_003', spaceId: 3 },
      ];

      // Mock device lookups for all devices
      devices.forEach(device => {
        mockPrisma.devices.findUnique.mockResolvedValue({
          serial_number: device.serial,
          space_id: device.spaceId,
        } as any);
      });

      let totalDatabaseSaves = 0;
      mockRedis.eval.mockImplementation((script, keys, ...args) => {
        const deviceSerial = args[0] as string;
        const currentCall = mockRedis.eval.mock.calls.length;
        
        // Simulate hour completion for each device after 360 calls
        if (currentCall % TOTAL_SAMPLES_PER_HOUR === 0) {
          totalDatabaseSaves++;
          return Promise.resolve([
            true, true,
            { temperature: 25.0, humidity: 60.0, gas: 0.1 },
            { count: MINUTES_PER_HOUR, values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 }, timestamp: Date.now() }
          ]);
        }
        
        return Promise.resolve([false, false, {}, {}]);
      });

      // Simulate all devices sending data simultaneously
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < TOTAL_SAMPLES_PER_HOUR; i++) {
        for (const device of devices) {
          const sensorData = {
            temperature: 25.0 + Math.random() * 2 - 1,
            humidity: 60.0 + Math.random() * 4 - 2,
            gas: 0.1 + Math.random() * 0.02 - 0.01
          };

          promises.push(
            hourlyValueService.processSensorData(device.serial, sensorData)
          );
        }
      }

      await Promise.all(promises);

      // Verify each device saved to database
      expect(mockPrisma.hourly_values.create).toHaveBeenCalledTimes(devices.length);
      expect(totalDatabaseSaves).toBe(devices.length);

      devices.forEach(device => {
        expect(mockPrisma.hourly_values.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              device_serial: device.serial,
              space_id: device.spaceId,
            })
          })
        );
      });
    });

    it('should handle batch processing efficiently', async () => {
      const batchSize = 50;
      const totalBatches = Math.ceil(TOTAL_SAMPLES_PER_HOUR / batchSize);
      
      let hourCompleted = false;
      mockRedis.eval.mockImplementation((script, keys, ...args) => {
        const currentCall = mockRedis.eval.mock.calls.length;
        
        // Complete hour after all samples
        if (currentCall >= TOTAL_SAMPLES_PER_HOUR) {
          hourCompleted = true;
          return Promise.resolve([
            true, true,
            { temperature: 25.0, humidity: 60.0, gas: 0.1 },
            { count: MINUTES_PER_HOUR, values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 }, timestamp: Date.now() }
          ]);
        }
        
        return Promise.resolve([false, false, {}, {}]);
      });

      // Create batch data
      const batchData: { serialNumber: string; data: { temperature: number; humidity: number; gas: number; } }[] = [];
      for (let i = 0; i < TOTAL_SAMPLES_PER_HOUR; i++) {
        batchData.push({
          serialNumber: TEST_DEVICE_SERIAL,
          data: {
            temperature: 25.0 + Math.random() * 2 - 1,
            humidity: 60.0 + Math.random() * 4 - 2,
            gas: 0.1 + Math.random() * 0.02 - 0.01
          }
        });
      }

      // Process in batches
      await hourlyValueService.processBatchSensorData(batchData);

      expect(mockRedis.eval).toHaveBeenCalledTimes(TOTAL_SAMPLES_PER_HOUR);
      expect(hourCompleted).toBe(true);
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle missing sensor values gracefully', async () => {
      const sensorData = {
        temperature: 25.0,
        humidity: undefined,
        gas: undefined
      };

      mockRedis.eval.mockResolvedValue([false, false, {}, {}]);

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Should only process valid values
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        2,
        `device:${TEST_DEVICE_SERIAL}:minute`,
        `device:${TEST_DEVICE_SERIAL}:hour`,
        JSON.stringify({ temperature: 25.0, humidity: null, gas: null }),
        expect.any(String),
        '6',
        '60'
      );
    });

    it('should handle extreme sensor values', async () => {
      const extremeData = [
        { temperature: -50.0, humidity: 0.0, gas: 0.0 },
        { temperature: 100.0, humidity: 100.0, gas: 1000.0 },
        { temperature: 0.0, humidity: 50.0, gas: 0.5 },
      ];

      mockRedis.eval.mockResolvedValue([false, false, {}, {}]);

      for (const data of extremeData) {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, data);
      }

      expect(mockRedis.eval).toHaveBeenCalledTimes(extremeData.length);
    });

    it('should handle invalid sensor data', async () => {
      const invalidData = [
        { temperature: NaN, humidity: 60.0, gas: 0.1 },
        { temperature: 25.0, humidity: undefined, gas: 0.1 },
        { temperature: 25.0, humidity: 60.0, gas: undefined },
      ];

      mockRedis.eval.mockResolvedValue([false, false, {}, {}]);

      for (const data of invalidData) {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, data);
      }

      expect(mockRedis.eval).toHaveBeenCalledTimes(invalidData.length);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track processing performance', async () => {
      const performanceMetrics: number[] = [];
      
      // Override console.warn to capture performance warnings
      const originalWarn = console.warn;
      console.warn = jest.fn((message) => {
        if (message.includes('Slow processing')) {
          const match = message.match(/(\d+)ms/);
          if (match) {
            performanceMetrics.push(parseInt(match[1]));
          }
        }
      });

      // Simulate some slow processing
      mockRedis.eval.mockImplementation(async () => {
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return [false, false, {}, {}];
      });

      // Process multiple samples
      for (let i = 0; i < 10; i++) {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, {
          temperature: 25.0,
          humidity: 60.0,
          gas: 0.1
        });
      }

      // Restore console.warn
      console.warn = originalWarn;

      // Should have processed all samples
      expect(mockRedis.eval).toHaveBeenCalledTimes(10);
      
      // Performance warnings should be captured if processing is slow
      if (performanceMetrics.length > 0) {
        console.log(`⚠️  Detected ${performanceMetrics.length} slow processing events`);
        console.log(`📊 Average slow processing time: ${performanceMetrics.reduce((a, b) => a + b, 0) / performanceMetrics.length}ms`);
      }
    });
  });
}); 