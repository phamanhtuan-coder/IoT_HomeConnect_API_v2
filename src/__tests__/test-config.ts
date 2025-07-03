// Test Configuration
// Cấu hình Redis cho testing

// Thay đổi IP và port theo máy chủ Redis của bạn

// Hoặc nếu Redis chạy trên localhost với port khác
export const TEST_REDIS_URL = 'redis://localhost:6379';

// Hoặc nếu Redis có password
// export const TEST_REDIS_URL = 'redis://:password@192.168.1.100:6379';

export const TEST_CONFIG = {
  redis: {
    url: TEST_REDIS_URL,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },
  test: {
    timeout: 30000,
    deviceSerial: 'TEST_DEVICE_001',
    spaceId: 1,
  }
}; 