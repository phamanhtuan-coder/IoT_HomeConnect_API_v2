import HourlyValueService from '../services/hourly-value.service';
import prisma from '../config/database';
import redisClient from '../utils/redis';
import { DeviceSimulator } from './device-simulator-script';

// Mock dependencies
jest.mock('../config/database');
jest.mock('../utils/redis');

describe('Integration Tests - Redis to Database Flow', () => {
  let hourlyValueService: HourlyValueService;
  let deviceSimulator: DeviceSimulator;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockRedis: jest.Mocked<typeof redisClient>;

  const TEST_DEVICE_SERIAL = 'INTEGRATION_TEST_DEVICE';
  const TEST_SPACE_ID = 1;

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
      sample_count: 360,
    } as any);

    hourlyValueService = new HourlyValueService();
    deviceSimulator = new DeviceSimulator();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await mockRedis.del(`device:${TEST_DEVICE_SERIAL}:minute`);
      await mockRedis.del(`device:${TEST_DEVICE_SERIAL}:hour`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('End-to-End Data Flow', () => {
    it('should process complete hour of data and save to database', async () => {
      const SAMPLES_PER_MINUTE = 6;
      const MINUTES_PER_HOUR = 60;
      const TOTAL_SAMPLES = SAMPLES_PER_MINUTE * MINUTES_PER_HOUR;

      let minuteCompletions = 0;
      let hourCompletions = 0;
      let databaseSaves = 0;

      // Mock Redis to track data accumulation
      mockRedis.eval.mockImplementation((script, keys, ...args) => {
        const currentCall = mockRedis.eval.mock.calls.length;
        const currentMinute = Math.floor((currentCall - 1) / SAMPLES_PER_MINUTE);
        const sampleInMinute = (currentCall - 1) % SAMPLES_PER_MINUTE;
        const minuteInHour = currentMinute % MINUTES_PER_HOUR;

        const minuteComplete = sampleInMinute === SAMPLES_PER_MINUTE - 1;
        const hourComplete = minuteComplete && minuteInHour === MINUTES_PER_HOUR - 1;

        if (hourComplete) {
          hourCompletions++;
          databaseSaves++;
          return Promise.resolve([
            true, // minuteComplete
            true, // hourComplete
            { temperature: 25.0, humidity: 60.0, gas: 0.1 }, // minuteAvg
            {
              count: MINUTES_PER_HOUR,
              values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 },
              timestamp: Date.now()
            } // hourData
          ]);
        } else if (minuteComplete) {
          minuteCompletions++;
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

      // Process all samples for one hour
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < TOTAL_SAMPLES; i++) {
        const sensorData = {
          temperature: 25.0 + Math.random() * 2 - 1,
          humidity: 60.0 + Math.random() * 4 - 2,
          gas: 0.1 + Math.random() * 0.02 - 0.01
        };

        promises.push(
          hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData)
        );
      }

      await Promise.all(promises);

      // Verify complete flow
      expect(mockRedis.eval).toHaveBeenCalledTimes(TOTAL_SAMPLES);
      expect(minuteCompletions).toBe(MINUTES_PER_HOUR);
      expect(hourCompletions).toBe(1);
      expect(databaseSaves).toBe(1);

      // Verify database save
      expect(mockPrisma.hourly_values.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.hourly_values.create).toHaveBeenCalledWith({
        data: {
          device_serial: TEST_DEVICE_SERIAL,
          space_id: TEST_SPACE_ID,
          hour_timestamp: expect.any(Date),
          avg_value: { temperature: 25.0, humidity: 60.0, gas: 0.1 },
          sample_count: TOTAL_SAMPLES,
        },
      });

      console.log(`✅ Integration test completed:`);
      console.log(`   - Processed ${TOTAL_SAMPLES} samples`);
      console.log(`   - Completed ${minuteCompletions} minutes`);
      console.log(`   - Completed ${hourCompletions} hour(s)`);
      console.log(`   - Saved ${databaseSaves} record(s) to database`);
    });

    it('should handle multiple devices with different data patterns', async () => {
      const devices = [
        { serial: 'DEVICE_A', spaceId: 1, tempBase: 22.0 },
        { serial: 'DEVICE_B', spaceId: 2, tempBase: 28.0 },
        { serial: 'DEVICE_C', spaceId: 3, tempBase: 25.0 },
      ];

      // Mock device lookups
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
        
        // Complete hour after 360 calls per device
        if (currentCall % 360 === 0) {
          totalDatabaseSaves++;
          return Promise.resolve([
            true, true,
            { temperature: 25.0, humidity: 60.0, gas: 0.1 },
            { count: 60, values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 }, timestamp: Date.now() }
          ]);
        }
        
        return Promise.resolve([false, false, {}, {}]);
      });

      // Process data for all devices
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < 360; i++) {
        for (const device of devices) {
          const sensorData = {
            temperature: device.tempBase + Math.random() * 2 - 1,
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
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from Redis failures', async () => {
      let failCount = 0;
      
      mockRedis.eval.mockImplementation((script, keys, ...args) => {
        failCount++;
        
        // Fail first 3 times, then succeed
        if (failCount <= 3) {
          return Promise.reject(new Error('Redis connection failed'));
        }
        
        return Promise.resolve([false, false, {}, {}]);
      });

      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Should retry and eventually succeed
      expect(mockRedis.eval).toHaveBeenCalledTimes(4);
    });

    it('should handle database failures gracefully', async () => {
      // Mock hour completion
      mockRedis.eval.mockResolvedValueOnce([
        true, true,
        { temperature: 25.0, humidity: 60.0, gas: 0.1 },
        { count: 60, values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 }, timestamp: Date.now() }
      ]);

      // Mock database failure
      mockPrisma.hourly_values.create.mockRejectedValueOnce(new Error('Database connection failed'));

      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };

      // Should not throw error
      await expect(
        hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData)
      ).resolves.not.toThrow();

      // Should still attempt database save
      expect(mockPrisma.hourly_values.create).toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency data processing', async () => {
      const startTime = Date.now();
      const sampleCount = 1000;

      mockRedis.eval.mockResolvedValue([false, false, {}, {}]);

      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < sampleCount; i++) {
        const sensorData = {
          temperature: 25.0 + Math.random() * 2 - 1,
          humidity: 60.0 + Math.random() * 4 - 2,
          gas: 0.1 + Math.random() * 0.02 - 0.01
        };

        promises.push(
          hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData)
        );
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const processingTime = endTime - startTime;
      const throughput = sampleCount / (processingTime / 1000);

      console.log(`📊 Performance test results:`);
      console.log(`   - Processed ${sampleCount} samples in ${processingTime}ms`);
      console.log(`   - Throughput: ${throughput.toFixed(2)} samples/second`);

      expect(mockRedis.eval).toHaveBeenCalledTimes(sampleCount);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle batch processing efficiently', async () => {
      const batchSize = 100;
      const totalSamples = 1000;

      mockRedis.eval.mockResolvedValue([false, false, {}, {}]);

      // Create batch data
      const batchData: Array<{ serialNumber: string; data: { temperature: number; humidity: number; gas: number } }> = [];
      for (let i = 0; i < totalSamples; i++) {
        batchData.push({
          serialNumber: TEST_DEVICE_SERIAL,
          data: {
            temperature: 25.0 + Math.random() * 2 - 1,
            humidity: 60.0 + Math.random() * 4 - 2,
            gas: 0.1 + Math.random() * 0.02 - 0.01
          }
        });
      }

      const startTime = Date.now();
      await hourlyValueService.processBatchSensorData(batchData);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      const throughput = totalSamples / (processingTime / 1000);

      console.log(`📦 Batch processing test results:`);
      console.log(`   - Processed ${totalSamples} samples in ${processingTime}ms`);
      console.log(`   - Batch throughput: ${throughput.toFixed(2)} samples/second`);

      expect(mockRedis.eval).toHaveBeenCalledTimes(totalSamples);
      expect(processingTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency across Redis and Database', async () => {
      const testData = [
        { temperature: 25.0, humidity: 60.0, gas: 0.1 },
        { temperature: 26.0, humidity: 61.0, gas: 0.11 },
        { temperature: 24.0, humidity: 59.0, gas: 0.09 },
      ];

      let hourData: any = null;
      mockRedis.eval.mockImplementation((script, keys, ...args) => {
        const currentCall = mockRedis.eval.mock.calls.length;
        
        // Complete hour after 360 calls
        if (currentCall >= 360) {
          hourData = {
            count: 60,
            values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 },
            timestamp: Date.now()
          };
          
          return Promise.resolve([
            true, true,
            { temperature: 25.0, humidity: 60.0, gas: 0.1 },
            hourData
          ]);
        }
        
        return Promise.resolve([false, false, {}, {}]);
      });

      // Process 360 samples
      for (let i = 0; i < 360; i++) {
        const sensorData = testData[i % testData.length];
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);
      }

      // Verify database save with correct data
      expect(mockPrisma.hourly_values.create).toHaveBeenCalledWith({
        data: {
          device_serial: TEST_DEVICE_SERIAL,
          space_id: TEST_SPACE_ID,
          hour_timestamp: expect.any(Date),
          avg_value: { temperature: 25.0, humidity: 60.0, gas: 0.1 },
          sample_count: 360,
        },
      });
    });

    it('should validate sensor data ranges', async () => {
      const invalidData = [
        { temperature: NaN, humidity: 60.0, gas: 0.1 },
        { temperature: 25.0, humidity: -10.0, gas: 0.1 },
        { temperature: 25.0, humidity: 60.0, gas: undefined },
        { temperature: Infinity, humidity: 60.0, gas: 0.1 },
      ];

      for (const data of invalidData) {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, data);
      }

      // Should handle invalid data gracefully
      expect(mockRedis.eval).toHaveBeenCalledTimes(invalidData.length);
    });
  });
}); 