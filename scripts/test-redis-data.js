// Cấu hình Redis cho test
process.env.REDIS_URL = 'redis://localhost:6379';      // Localhost

const HourlyValueService = require('../dist/services/hourly-value.service').default;
const redisClient = require('../dist/utils/redis').default;

/**
 * Script test gửi dữ liệu lên Redis
 * Chạy: node scripts/test-redis-data.js
 */

async function testRedisData() {
    console.log('🚀 Starting Redis Data Test...\n');
    console.log('🔗 Redis URL:', process.env.REDIS_URL, '\n');

    try {
        // Kiểm tra kết nối Redis
        await redisClient.ping();
        console.log('✅ Redis connection successful\n');

        const hourlyValueService = new HourlyValueService();
        const TEST_DEVICE_SERIAL = 'REDIS_TEST_DEVICE_001';

        // Test 1: Gửi dữ liệu đơn lẻ
        console.log('📡 Test 1: Sending single sensor data...');
        const sensorData = {
            temperature: 25.5,
            humidity: 60.2,
            gas: 0.1
        };

        await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);
        console.log('✅ Single data sent successfully\n');

        // Test 2: Gửi nhiều dữ liệu liên tiếp
        console.log('📡 Test 2: Sending multiple readings...');
        const readings = [
            { temperature: 25.0, humidity: 60.0, gas: 0.1 },
            { temperature: 26.0, humidity: 61.0, gas: 0.11 },
            { temperature: 24.0, humidity: 59.0, gas: 0.09 },
            { temperature: 27.0, humidity: 62.0, gas: 0.12 },
            { temperature: 23.0, humidity: 58.0, gas: 0.08 },
        ];

        for (let i = 0; i < readings.length; i++) {
            const reading = readings[i];
            console.log(`  Sending reading ${i + 1}:`, reading);
            await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, reading);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Đợi 1 giây
        }
        console.log('✅ Multiple readings sent successfully\n');

        // Test 3: Kiểm tra dữ liệu trong Redis
        console.log('🔍 Test 3: Inspecting Redis data...');
        const minuteKey = `device:${TEST_DEVICE_SERIAL}:minute`;
        const hourKey = `device:${TEST_DEVICE_SERIAL}:hour`;

        const minuteData = await redisClient.get(minuteKey);
        const hourData = await redisClient.get(hourKey);
        const minuteTTL = await redisClient.ttl(minuteKey);
        const hourTTL = await redisClient.ttl(hourKey);

        console.log('📊 Minute data:', minuteData);
        console.log('📊 Hour data:', hourData);
        console.log('⏰ Minute TTL:', minuteTTL, 'seconds');
        console.log('⏰ Hour TTL:', hourTTL, 'seconds\n');

        // Test 4: Simulate real-time stream
        console.log('🔄 Test 4: Simulating real-time data stream...');
        const streamDuration = 15; // 15 giây
        const interval = 500; // 500ms
        let sentCount = 0;

        const sendRandomData = async () => {
            const temperature = 20 + Math.random() * 10; // 20-30°C
            const humidity = 50 + Math.random() * 20; // 50-70%
            const gas = 0.05 + Math.random() * 0.1; // 0.05-0.15

            const sensorData = { temperature, humidity, gas };

            try {
                await hourlyValueService.processSensorData(TEST_DEVICE_SERIAL, sensorData);
                sentCount++;

                if (sentCount % 10 === 0) {
                    console.log(`  📡 Sent ${sentCount} readings...`);
                }
            } catch (error) {
                console.log(`  ❌ Error:`, error.message);
            }
        };

        const intervalId = setInterval(sendRandomData, interval);

        // Dừng sau streamDuration giây
        await new Promise(resolve => setTimeout(resolve, streamDuration * 1000));
        clearInterval(intervalId);

        console.log(`✅ Stream completed. Total readings sent: ${sentCount}\n`);

        // Test 5: Kiểm tra dữ liệu cuối cùng
        console.log('🔍 Test 5: Final data inspection...');
        const finalMinuteData = await redisClient.get(minuteKey);
        const finalHourData = await redisClient.get(hourKey);

        console.log('📊 Final minute data:', finalMinuteData);
        console.log('📊 Final hour data:', finalHourData);

        // Parse và hiển thị dữ liệu chi tiết
        if (finalMinuteData) {
            const parsedMinute = JSON.parse(finalMinuteData);
            console.log('📈 Minute data details:');
            console.log('  Count:', parsedMinute.count);
            console.log('  Values:', parsedMinute.values);
            console.log('  Timestamp:', new Date(parsedMinute.timestamp));
        }

        if (finalHourData) {
            const parsedHour = JSON.parse(finalHourData);
            console.log('📈 Hour data details:');
            console.log('  Count:', parsedHour.count);
            console.log('  Values:', parsedHour.values);
            console.log('  Timestamp:', new Date(parsedHour.timestamp));
        }

        console.log('\n✅ All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        // try {
        //     const keys = await redisClient.keys('device:REDIS_TEST_DEVICE_001:*');
        //     if (keys.length > 0) {
        //         await redisClient.del(...keys);
        //         console.log(`\n🧹 Cleaned up ${keys.length} test keys`);
        //     }
        // } catch (error) {
        //     console.log('\n⚠️  Could not cleanup test data:', error.message);
        // }

        process.exit(0);
    }
}

// Chạy test
testRedisData(); 