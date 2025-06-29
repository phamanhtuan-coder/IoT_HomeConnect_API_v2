import HourlyValueService from '../services/hourly-value.service';
import prisma from '../config/database';

// Mock dependencies
jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    devices: {
      findUnique: jest.fn(),
    },
    hourly_values: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../utils/redis', () => {
  const mockRedisClient = {
    eval: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    on: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockRedisClient,
    blacklistToken: jest.fn(),
    isTokenBlacklisted: jest.fn(),
    setDeviceAccountMapping: jest.fn(),
    getDeviceAccountMapping: jest.fn(),
    removeDeviceAccountMapping: jest.fn(),
  };
});

/**
 * Simple Device Test - Không cần Redis thực tế
 * Test cơ bản để verify logic xử lý dữ liệu
 */

describe('Simple Device Test - No Real Redis', () => {
  let hourlyValueService: HourlyValueService;
  let mockPrisma: any;
  let mockRedis: any;

  const TEST_DEVICE_SERIAL = 'SIMPLE_TEST_DEVICE';
  const TEST_SPACE_ID = 1;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import mock modules
    mockPrisma = require('../config/database').default;
    const redisModule = require('../utils/redis');
    mockRedis = redisModule.default;

    // Mock device lookup
    mockPrisma.devices.findUnique.mockResolvedValue({
      serial_number: TEST_DEVICE_SERIAL,
      space_id: TEST_SPACE_ID,
    });

    // Mock hourly_values.create
    mockPrisma.hourly_values.create.mockResolvedValue({
      hourly_value_id: 1,
      device_serial: TEST_DEVICE_SERIAL,
      space_id: TEST_SPACE_ID,
      hour_timestamp: new Date(),
      avg_value: { temperature: 25.5, humidity: 60.2, gas: 0.1 },
      sample_count: 360,
    });

    // Mock Redis operations
    mockRedis.eval.mockResolvedValue([false, false, {}, {}]);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.get.mockResolvedValue(null);

    hourlyValueService = new HourlyValueService();
  });

  describe('Basic Sensor Data Processing', () => {
    it('should process single sensor data', async () => {
      const sensorData = {
        temperature: 25.5,
        humidity: 60.2,
        gas: 0.1
      };

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

    it('should handle multiple sensor readings', async () => {
      const sensorReadings = [
        { temperature: 25.0, humidity: 60.0, gas: 0.1 },
        { temperature: 26.0, humidity: 61.0, gas: 0.11 },
        { temperature: 24.0, humidity: 59.0, gas: 0.09 },
      ];

      for (const reading of sensorReadings) {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, reading);
      }

      expect(mockRedis.eval).toHaveBeenCalledTimes(3);
    });

    it('should simulate hour completion', async () => {
      // Mock hour completion
      mockRedis.eval.mockResolvedValueOnce([
        true, // minuteComplete
        true, // hourComplete
        { temperature: 25.0, humidity: 60.0, gas: 0.1 }, // minuteAvg
        { 
          count: 60,
          values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 },
          timestamp: Date.now()
        } // hourData
      ]);

      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);

      // Should create hourly value record
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
  });

  describe('Data Validation', () => {
    it('should handle invalid sensor data', async () => {
      const invalidData = [
        { temperature: NaN, humidity: 60.0, gas: 0.1 },
        { temperature: 25.0, humidity: undefined, gas: 0.1 },
        { temperature: 25.0, humidity: 60.0, gas: undefined },
      ];

      for (const data of invalidData) {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, data);
      }

      // Should handle invalid data gracefully
      expect(mockRedis.eval).toHaveBeenCalledTimes(invalidData.length);
    });

    it('should handle empty data', async () => {
      const emptyData = {};

      await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, emptyData);

      // Should not call Redis for empty data
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });
  });

  describe('Batch Processing', () => {
    it('should process batch data', async () => {
      const batchData = [
        { serialNumber: 'DEVICE_001', data: { temperature: 25.0 } },
        { serialNumber: 'DEVICE_002', data: { humidity: 60.0 } },
        { serialNumber: 'DEVICE_003', data: { gas: 0.1 } },
      ];

      // Mock device lookups
      mockPrisma.devices.findUnique
        .mockResolvedValueOnce({ serial_number: 'DEVICE_001', space_id: 1 })
        .mockResolvedValueOnce({ serial_number: 'DEVICE_002', space_id: 2 })
        .mockResolvedValueOnce({ serial_number: 'DEVICE_003', space_id: 3 });

      await hourlyValueService.processBatchSensorData(batchData);

      expect(mockRedis.eval).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis errors', async () => {
      mockRedis.eval.mockRejectedValueOnce(new Error('Redis connection failed'));

      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };

      // Should not throw error
      await expect(
        hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData)
      ).resolves.not.toThrow();
    });

    it('should handle database errors', async () => {
      // Mock hour completion
      mockRedis.eval.mockResolvedValueOnce([
        true, true,
        { temperature: 25.0, humidity: 60.0, gas: 0.1 },
        { count: 60, values: { temperature: 1500.0, humidity: 3600.0, gas: 6.0 }, timestamp: Date.now() }
      ]);

      // Mock database error
      mockPrisma.hourly_values.create.mockRejectedValueOnce(new Error('Database error'));

      const sensorData = { temperature: 25.0, humidity: 60.0, gas: 0.1 };

      // Should not throw error
      await expect(
        hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData)
      ).resolves.not.toThrow();
    });
  });
});