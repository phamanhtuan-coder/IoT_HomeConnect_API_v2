import HourlyValueService from '../services/hourly-value.service';
import prisma from '../config/database';
import redisClient from '../utils/redis';
import { Server } from 'socket.io';

// Mock dependencies
jest.mock('../config/database');
jest.mock('../utils/redis');
jest.mock('socket.io');

describe('HourlyValueService', () => {
  let hourlyValueService: HourlyValueService;
  let mockPrisma: jest.Mocked<typeof prisma>;
  let mockRedis: jest.Mocked<typeof redisClient>;
  let mockSocket: jest.Mocked<Server>;

  const TEST_DEVICE_SERIAL = 'SERL12JUN2501JXHMC17J1RPRY7P063E';
  const TEST_SPACE_ID = 16;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mocks
    mockPrisma = prisma as jest.Mocked<typeof prisma>;
    mockRedis = redisClient as jest.Mocked<typeof redisClient>;
    mockSocket = new Server() as jest.Mocked<Server>;

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

    // Mock Redis operations
    mockRedis.eval.mockResolvedValue([false, false, {}, {}]);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.get.mockResolvedValue(null);

    // Create service instance
    hourlyValueService = new HourlyValueService();
  });

  afterEach(async () => {
    // Cleanup Redis keys after each test
    try {
      await mockRedis.del(`device:${TEST_DEVICE_SERIAL}:minute`);
      await mockRedis.del(`device:${TEST_DEVICE_SERIAL}:hour`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('processSensorData', () => {
    it('should process valid sensor data successfully', async () => {
      const sensorData = {
        temperature: 25.5,
        humidity: 60.2,
        gas: 0.1
      };

      // Mock Redis eval to return minute data
      mockRedis.eval.mockResolvedValueOnce([false, false, {}, {}]);

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        2,
        `device:${TEST_DEVICE_SERIAL}:minute`,
        `device:${TEST_DEVICE_SERIAL}:hour`,
        JSON.stringify(sensorData),
        expect.any(String),
        '6',
        '60'
      );
    });

    it('should handle invalid sensor data gracefully', async () => {
      const invalidData = {
        temperature: NaN,
        humidity: undefined,
        gas: undefined
      };

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, invalidData);

      // Should not call Redis eval for invalid data
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('should handle missing serial number', async () => {
      const sensorData = { temperature: 25.5 };

      await hourlyValueService.processSensorData('', sensorData);

      expect(mockRedis.eval).not.toHaveBeenCalled();
    });
  });

  describe('Simulated Device Data Flow', () => {
    it('should accumulate minute data correctly', async () => {
      const sensorData = { temperature: 25.0, humidity: 60.0 };

      // Mock Redis to simulate minute data accumulation
      const mockMinuteData = {
        count: 5,
        values: { temperature: 125.0, humidity: 300.0 },
        timestamp: Date.now()
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockMinuteData));
      mockRedis.eval.mockResolvedValueOnce([false, false, {}, {}]);

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should complete minute and trigger hour processing', async () => {
      const sensorData = { temperature: 25.0, humidity: 60.0 };

      // Mock Redis to simulate minute completion
      mockRedis.eval.mockResolvedValueOnce([
        true, // minuteComplete
        false, // hourComplete
        { temperature: 25.0, humidity: 60.0 }, // minuteAvg
        {} // hourData
      ]);

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should complete hour and save to database', async () => {
      const sensorData = { temperature: 25.0, humidity: 60.0 };

      // Mock Redis to simulate hour completion
      const mockHourData = {
        count: 60,
        values: { temperature: 1500.0, humidity: 3600.0 },
        timestamp: Date.now()
      };

      mockRedis.eval.mockResolvedValueOnce([
        true, // minuteComplete
        true, // hourComplete
        { temperature: 25.0, humidity: 60.0 }, // minuteAvg
        mockHourData // hourData
      ]);

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Should create hourly value record
      expect(mockPrisma.hourly_values.create).toHaveBeenCalledWith({
        data: {
          device_serial: TEST_DEVICE_SERIAL,
          space_id: TEST_SPACE_ID,
          hour_timestamp: expect.any(Date),
          avg_value: { temperature: 25.0, humidity: 60.0 },
          sample_count: 360,
        },
      });

      // Should clear hour data from Redis
      expect(mockRedis.del).toHaveBeenCalledWith(`device:${TEST_DEVICE_SERIAL}:hour`);
    });
  });

  describe('Batch Processing', () => {
    it('should process batch sensor data', async () => {
      const batchData = [
        { serialNumber: 'DEVICE_001', data: { temperature: 25.0 } },
        { serialNumber: 'DEVICE_002', data: { humidity: 60.0 } },
        { serialNumber: 'DEVICE_003', data: { gas: 0.1 } },
      ];

      // Mock device lookups
      mockPrisma.devices.findUnique
        .mockResolvedValueOnce({ serial_number: 'DEVICE_001', space_id: 1 } as any)
        .mockResolvedValueOnce({ serial_number: 'DEVICE_002', space_id: 2 } as any)
        .mockResolvedValueOnce({ serial_number: 'DEVICE_003', space_id: 3 } as any);

      mockRedis.eval.mockResolvedValue([false, false, {}, {}]);

      await hourlyValueService.processBatchSensorData(batchData);

      expect(mockRedis.eval).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis errors with retry mechanism', async () => {
      const sensorData = { temperature: 25.0 };

      // Mock Redis to fail first, then succeed
      mockRedis.eval
        .mockRejectedValueOnce(new Error('Redis connection failed'))
        .mockResolvedValueOnce([false, false, {}, {}]);

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Should retry and eventually succeed
      expect(mockRedis.eval).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      const sensorData = { temperature: 25.0 };

      // Mock hour completion
      mockRedis.eval.mockResolvedValueOnce([
        true,
        true,
        { temperature: 25.0 },
        { count: 60, values: { temperature: 1500.0 }, timestamp: Date.now() }
      ]);

      // Mock database error
      mockPrisma.hourly_values.create.mockRejectedValueOnce(new Error('Database error'));

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Should handle error without crashing
      expect(mockPrisma.hourly_values.create).toHaveBeenCalled();
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup stale data from Redis', async () => {
      const staleKeys = [
        'device:DEVICE_001:minute',
        'device:DEVICE_002:minute',
        'device:DEVICE_003:minute'
      ];

      mockRedis.keys.mockResolvedValue(staleKeys);
      mockRedis.get.mockResolvedValue(JSON.stringify({
        count: 1,
        values: {},
        timestamp: Date.now() - 7200001 // Older than 2 hours
      }));

      await hourlyValueService.cleanupStaleData();

      expect(mockRedis.del).toHaveBeenCalledWith(...staleKeys);
    });
  });
}); 