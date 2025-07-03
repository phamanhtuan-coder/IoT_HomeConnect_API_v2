# IoT Device Simulator Tests

Bộ test để giả lập thiết bị IoT gửi dữ liệu cảm biến và kiểm tra quá trình xử lý từ Redis đến Database.

## 📁 Cấu trúc Test Files

```
src/__tests__/
├── setup.ts                           # Setup Jest configuration
├── hourly-value.service.test.ts       # Unit tests cho HourlyValueService
├── device-simulator.test.ts           # Test giả lập thiết bị gửi dữ liệu
├── device-simulator-script.ts         # Script giả lập thiết bị thực tế
├── integration.test.ts                # Integration tests end-to-end
└── README.md                          # Hướng dẫn này
```

## 🚀 Cách sử dụng

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Chạy tất cả tests

```bash
npm test
```

### 3. Chạy test với watch mode

```bash
npm run test:watch
```

### 4. Chạy test với coverage

```bash
npm run test:coverage
```

### 5. Chạy script giả lập thiết bị thực tế

```bash
# Chạy demo với nhiều thiết bị
npx ts-node src/__tests__/device-simulator-script.ts
```

## 📊 Các loại Test

### 1. Unit Tests (`hourly-value.service.test.ts`)

Test các chức năng cơ bản của `HourlyValueService`:

- ✅ Xử lý dữ liệu cảm biến hợp lệ
- ✅ Xử lý dữ liệu không hợp lệ
- ✅ Batch processing
- ✅ Error handling và retry mechanism
- ✅ Cleanup operations

### 2. Device Simulator Tests (`device-simulator.test.ts`)

Giả lập thiết bị gửi dữ liệu liên tục:

- ✅ Simulate 1 tiếng dữ liệu (360 samples)
- ✅ Multiple devices simultaneously
- ✅ Batch processing efficiency
- ✅ Data validation và edge cases
- ✅ Performance monitoring

### 3. Integration Tests (`integration.test.ts`)

Test toàn bộ flow từ Redis đến Database:

- ✅ End-to-end data flow
- ✅ Multiple devices với different patterns
- ✅ Error recovery và resilience
- ✅ Performance và scalability
- ✅ Data consistency và validation

### 4. Device Simulator Script (`device-simulator-script.ts`)

Script thực tế để giả lập thiết bị:

- 🔧 Tạo nhiều thiết bị giả lập
- 🚀 Gửi dữ liệu theo interval
- 📊 Monitor progress và statistics
- ⏹️ Graceful shutdown

## 🎯 Test Scenarios

### Scenario 1: Single Device - Full Hour
```typescript
// Giả lập 1 thiết bị gửi dữ liệu mỗi 10 giây trong 1 tiếng
// Kết quả: 360 samples, 60 minutes, 1 hour record trong database
```

### Scenario 2: Multiple Devices
```typescript
// Giả lập 3 thiết bị gửi dữ liệu đồng thời
// Mỗi thiết bị có pattern dữ liệu khác nhau
// Kết quả: 3 hourly records trong database
```

### Scenario 3: High Frequency Data
```typescript
// Test xử lý 1000 samples với high throughput
// Kiểm tra performance và scalability
```

### Scenario 4: Error Recovery
```typescript
// Test Redis failures và retry mechanism
// Test database failures và graceful handling
```

## 📈 Expected Results

### Performance Metrics
- **Throughput**: > 200 samples/second
- **Processing Time**: < 5 seconds cho 1000 samples
- **Memory Usage**: Stable trong quá trình test

### Data Accuracy
- **Sample Count**: Chính xác 360 samples/hour
- **Average Values**: Tính toán đúng từ accumulated data
- **Timestamp**: Aligned với hour boundaries

### Error Handling
- **Redis Failures**: Retry với exponential backoff
- **Database Failures**: Graceful degradation
- **Invalid Data**: Filtered và logged

## 🔧 Configuration

### Environment Variables
```bash
# Test environment
NODE_ENV=test
REDIS_URL=redis://localhost:6379
AIVEN_URL=your_test_database_url
```

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```bash
   # Kiểm tra Redis server
   redis-cli ping
   ```

2. **Database Connection Failed**
   ```bash
   # Kiểm tra database connection
   npx prisma db push
   ```

3. **Test Timeout**
   ```bash
   # Tăng timeout trong jest.config.js
   testTimeout: 60000
   ```

### Debug Mode
```bash
# Chạy test với debug logs
DEBUG=* npm test
```

## 📝 Test Data Examples

### Valid Sensor Data
```typescript
{
  temperature: 25.5,    // 20-30°C
  humidity: 60.2,       // 0-100%
  gas: 0.1             // 0-1.0
}
```

### Invalid Sensor Data
```typescript
{
  temperature: NaN,     // Invalid
  humidity: -10,        // Out of range
  gas: undefined        // Missing
}
```

## 🎬 Demo Script Usage

### Quick Demo (5 minutes)
```bash
# Chạy demo ngắn
npx ts-node src/__tests__/device-simulator-script.ts
```

### Custom Demo
```typescript
import { DeviceSimulator } from './device-simulator-script';

const simulator = new DeviceSimulator();

// Tạo thiết bị
simulator.createDevice('MY_DEVICE_001', 1);

// Bắt đầu gửi dữ liệu
simulator.startDevice('MY_DEVICE_001', 5000); // 5 giây

// Dừng sau 1 tiếng
setTimeout(() => {
  simulator.stopDevice('MY_DEVICE_001');
}, 3600000);
```

## 📊 Monitoring

### Real-time Metrics
- Sample count per device
- Minute/hour completions
- Database saves
- Error rates

### Performance Monitoring
- Processing time per sample
- Throughput (samples/second)
- Memory usage
- Redis/Database latency

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: IoT Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
- [Redis Testing](https://redis.io/topics/testing)
- [IoT Data Processing Patterns](https://docs.aws.amazon.com/iot/latest/developerguide/iot-data-processing.html) 