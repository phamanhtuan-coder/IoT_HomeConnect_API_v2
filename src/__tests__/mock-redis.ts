import { TEST_REDIS_URL } from './test-config';

// Mock Redis client hoàn toàn để tránh kết nối thực tế
const mockRedisClient = {
  eval: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

// Mock Redis module
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisClient);
});

// Mock các function exports
export const blacklistToken = jest.fn();
export const isTokenBlacklisted = jest.fn();
export const setDeviceAccountMapping = jest.fn();
export const getDeviceAccountMapping = jest.fn();
export const removeDeviceAccountMapping = jest.fn();

export default mockRedisClient; 