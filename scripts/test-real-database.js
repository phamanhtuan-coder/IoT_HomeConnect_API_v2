// Cấu hình Redis cho test
process.env.REDIS_URL = 'redis://localhost:6379';

const HourlyValueService = require('../dist/services/hourly-value.service').default;
const redisClient = require('../dist/utils/redis').default;
const prisma = require('../dist/config/database').default;

/**
 * Script test lưu vào database THẬT (không mock)
 * Chạy: node scripts/test-real-database.js
 */

async function testRealDatabase() {
  console.log('🚀 Testing REAL Database Save...\n');
  console.log('🔗 Redis URL:', process.env.REDIS_URL, '\n');

  try {
    // Kiểm tra kết nối Redis
    await redisClient.ping();
    console.log('✅ Redis connection successful\n');

    // Kiểm tra device có tồn tại không
    const TEST_DEVICE_SERIAL = 'SERL12JUN2501JXHMC17J1RPRY7P063E';
    const device = await prisma.devices.findUnique({
      where: { serial_number: TEST_DEVICE_SERIAL, is_deleted: false },
      select: { serial_number: true, space_id: true }
    });

    if (!device) {
      console.log('❌ Device not found in database!');
      console.log('Available devices:');
      const allDevices = await prisma.devices.findMany({
        where: { is_deleted: false },
        select: { serial_number: true, space_id: true },
        take: 5
      });
      console.log(allDevices);
      return;
    }

    console.log('✅ Device found:', device);

    const hourlyValueService = new HourlyValueService();

    // Gửi đủ samples để hoàn thành 1 giờ (5 phút * 6 samples = 30 samples)
    // Để test nhanh, ta chỉ cần 5 phút hoàn thành
    const totalSamples = 30; // 5 minutes * 6 samples per minute
    console.log(`📡 Sending ${totalSamples} samples to complete 5 minutes...\n`);

    for (let i = 0; i < totalSamples; i++) {
      const temperature = 20 + Math.random() * 10; // 20-30°C
      const humidity = 50 + Math.random() * 20; // 50-70%
      const gas = 0.05 + Math.random() * 0.1; // 0.05-0.15
      
      const sensorData = { temperature, humidity, gas };
      
      try {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);
        
        // Log progress
        if ((i + 1) % 6 === 0) {
          const minute = Math.floor((i + 1) / 6);
          console.log(`  📡 Completed minute ${minute}/5`);
          
          // Kiểm tra hour data
          const hourKey = `device:${TEST_DEVICE_SERIAL}:hour`;
          const hourData = await redisClient.get(hourKey);
          if (hourData) {
            const parsed = JSON.parse(hourData);
            console.log(`  📊 Hour count: ${parsed.count}/5`);
            
            if (parsed.count >= 5) {
              console.log('🎉 5 MINUTES COMPLETED! Should save to database...');
            }
          }
        }
        
        // Đợi 100ms giữa các samples
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`  ❌ Error sending sample ${i + 1}:`, error.message);
      }
    }

    console.log(`\n✅ Completed sending ${totalSamples} samples`);
    
    // Đợi 1 giây để đảm bảo database operation hoàn thành
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Kiểm tra database xem có record mới không
    console.log('\n🔍 Checking database for new records...');
    const recentRecords = await prisma.hourly_values.findMany({
      where: { 
        device_serial: TEST_DEVICE_SERIAL,
        created_at: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // last 5 minutes
        }
      },
      orderBy: { created_at: 'desc' },
      take: 5
    });

    console.log(`📊 Found ${recentRecords.length} recent records:`);
    recentRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ID: ${record.hourly_value_id}, Time: ${record.hour_timestamp}, Samples: ${record.sample_count}`);
      console.log(`     Values: ${JSON.stringify(record.avg_value)}`);
    });

    if (recentRecords.length > 0) {
      console.log('\n🎉 SUCCESS: Data was saved to real database!');
    } else {
      console.log('\n⚠️  No new records found. Check if 5 minutes were completed.');
    }

    // Kiểm tra dữ liệu cuối cùng trong Redis
    console.log('\n🔍 Final Redis data...');
    const minuteKey = `device:${TEST_DEVICE_SERIAL}:minute`;
    const hourKey = `device:${TEST_DEVICE_SERIAL}:hour`;
    
    const minuteData = await redisClient.get(minuteKey);
    const hourData = await redisClient.get(hourKey);
    
    console.log('📊 Final minute data:', minuteData);
    console.log('📊 Final hour data:', hourData);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    try {
      const keys = await redisClient.keys(`device:${TEST_DEVICE_SERIAL}:*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        console.log(`\n🧹 Cleaned up ${keys.length} test keys`);
      }
    } catch (error) {
      console.log('\n⚠️  Could not cleanup test data:', error.message);
    }
    
    process.exit(0);
  }
}

// Chạy test
testRealDatabase(); 