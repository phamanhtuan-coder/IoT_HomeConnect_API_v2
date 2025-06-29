// Cấu hình Redis cho test
process.env.REDIS_URL = 'redis://localhost:6379';

const HourlyValueService = require('../dist/services/hourly-value.service').default;
const redisClient = require('../dist/utils/redis').default;
const prisma = require('../dist/config/database').default;

/**
 * Script test hoàn thành 1 giờ và lưu vào database
 * Chạy: node scripts/test-hour-completion.js
 */

async function testHourCompletion() {
  console.log('🚀 Testing Hour Completion...\n');
  console.log('🔗 Redis URL:', process.env.REDIS_URL, '\n');

  try {
    // Kiểm tra kết nối Redis
    await redisClient.ping();
    console.log('✅ Redis connection successful\n');

    const hourlyValueService = new HourlyValueService();
    const TEST_DEVICE_SERIAL = 'SERL12JUN2501JXHMC17J1RPRY7P063E';
    const TEST_SPACE_ID = 16;

    // Mock device lookup để có thể lưu vào database
    const originalFindUnique = prisma.devices.findUnique;
    prisma.devices.findUnique = async () => ({
      serial_number: TEST_DEVICE_SERIAL,
      space_id: TEST_SPACE_ID,
    });

    // Mock hourly_values.create để log khi lưu thành công, và tự tăng id
    const originalCreate = prisma.hourly_values.create;
    let idCounter = 1;
    let databaseSaves = 0;
    prisma.hourly_values.create = async (data) => {
      databaseSaves++;
      const id = idCounter++;
      console.log('💾 SAVING TO DATABASE:', JSON.stringify(data, null, 2));
      return {
        hourly_value_id: id,
        device_serial: data.data.device_serial,
        space_id: data.data.space_id,
        hour_timestamp: data.data.hour_timestamp,
        avg_value: data.data.avg_value,
        sample_count: data.data.sample_count,
      };
    };

    // Cần gửi 360 samples để hoàn thành 1 giờ (6 samples/minute * 60 minutes)
    const totalSamples = 360;
    console.log(`📡 Sending ${totalSamples} samples to complete 1 hour...\n`);

    let hourCompleted = false;
    let sentCount = 0;
    let lastDatabaseSaves = 0;

    for (let i = 0; i < totalSamples; i++) {
      const temperature = 20 + Math.random() * 10; // 20-30°C
      const humidity = 50 + Math.random() * 20; // 50-70%
      const gas = 0.05 + Math.random() * 0.1; // 0.05-0.15
      
      const sensorData = { temperature, humidity, gas };
      
      try {
        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);
        sentCount++;
        
        // Kiểm tra xem có lưu database không (chỉ log khi có thay đổi)
        if (databaseSaves > lastDatabaseSaves) {
          console.log(`🎉 DATABASE SAVE #${databaseSaves} COMPLETED!`);
          lastDatabaseSaves = databaseSaves;
        }
        
        // Log progress
        if (sentCount % 60 === 0) {
          console.log(`  📡 Sent ${sentCount}/${totalSamples} samples (${Math.round(sentCount/totalSamples*100)}%)`);
          console.log(`  💾 Database saves: ${databaseSaves}`);
          
          // Kiểm tra hour data
          const hourKey = `device:${TEST_DEVICE_SERIAL}:hour`;
          const hourData = await redisClient.get(hourKey);
          if (hourData) {
            const parsed = JSON.parse(hourData);
            console.log(`  📊 Hour count: ${parsed.count}/60`);
            
            if (parsed.count >= 60 && !hourCompleted) {
              console.log('🎉 HOUR COMPLETED! Should save to database...');
              hourCompleted = true;
            }
          }
        }
        
        // Đợi 100ms giữa các samples
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`  ❌ Error sending sample ${i + 1}:`, error.message);
      }
    }

    console.log(`\n✅ Completed sending ${sentCount} samples`);
    console.log(`💾 Total database saves: ${databaseSaves}`);
    
    // Kiểm tra dữ liệu cuối cùng
    console.log('\n🔍 Final data inspection...');
    const minuteKey = `device:${TEST_DEVICE_SERIAL}:minute`;
    const hourKey = `device:${TEST_DEVICE_SERIAL}:hour`;
    
    const minuteData = await redisClient.get(minuteKey);
    const hourData = await redisClient.get(hourKey);
    
    console.log('📊 Final minute data:', minuteData);
    console.log('📊 Final hour data:', hourData);

    if (hourData) {
      const parsed = JSON.parse(hourData);
      console.log('📈 Hour data details:');
      console.log('  Count:', parsed.count);
      console.log('  Values:', parsed.values);
      console.log('  Timestamp:', new Date(parsed.timestamp));
      
      if (parsed.count >= 60) {
        console.log('\n🎉 SUCCESS: Hour data should be saved to database!');
        console.log('💡 Check your database for the new hourly_value record.');
        
        if (databaseSaves > 0) {
          console.log(`✅ CONFIRMED: ${databaseSaves} records saved to database!`);
        } else {
          console.log('⚠️  WARNING: No database saves detected. Check the logs above.');
        }
      } else {
        console.log(`\n⚠️  Hour not completed yet. Need ${60 - parsed.count} more minutes.`);
      }
    }

    // Restore original functions
    prisma.devices.findUnique = originalFindUnique;
    prisma.hourly_values.create = originalCreate;

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Cleanup
    try {
      const keys = await redisClient.keys('device:HOUR_TEST_DEVICE_001:*');
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
testHourCompletion(); 