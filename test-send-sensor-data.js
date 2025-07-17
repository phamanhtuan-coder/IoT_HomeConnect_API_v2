const { io } = require('socket.io-client');
const readline = require('readline');

// Đảm bảo đúng URL và namespace nếu server dùng /device
const SOCKET_URL = 'http://localhost:7777/device';

// === Cấu hình mặc định ===
const DEFAULT_SENSOR_DATA = {
  deviceId: 'IOTD15JUL2501JZPGK9518SFKINUX56S',
  serialNumber: 'SERL12JUN2501JXHMC17J1RPRY7P063E',
  gas: 120,
  temperature: 28.5,
  humidity: 65.2,
  smoke_level: 120,
  flame_detected: false,
  alarmActive: false,
  buzzerOverride: false,
  muted: false,
  wifi_rssi: -55,
  free_memory: 123456,
  uptime: 3600,
  timestamp: Date.now()
};

// === Hàm nhập dữ liệu từ bàn phím ===
function promptInput(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log('=== Test gửi sensorData và nhận device_command ===');
  // Cho phép nhập deviceId và các giá trị sensor
  const deviceId = await promptInput(`Nhập deviceId [${DEFAULT_SENSOR_DATA.deviceId}]: `) || DEFAULT_SENSOR_DATA.deviceId;
  const serialNumber = await promptInput(`Nhập serialNumber [${DEFAULT_SENSOR_DATA.serialNumber}]: `) || DEFAULT_SENSOR_DATA.serialNumber;
  const gas = parseFloat(await promptInput(`Nhập giá trị gas [${DEFAULT_SENSOR_DATA.gas}]: `) || DEFAULT_SENSOR_DATA.gas);
  const temperature = parseFloat(await promptInput(`Nhập nhiệt độ [${DEFAULT_SENSOR_DATA.temperature}]: `) || DEFAULT_SENSOR_DATA.temperature);
  const humidity = parseFloat(await promptInput(`Nhập độ ẩm [${DEFAULT_SENSOR_DATA.humidity}]: `) || DEFAULT_SENSOR_DATA.humidity);

  const sensorData = {
    ...DEFAULT_SENSOR_DATA,
    deviceId,
    serialNumber,
    gas,
    temperature,
    humidity,
    timestamp: Date.now()
  };

  console.log('\n📤 Sending sensorData:', JSON.stringify(sensorData, null, 2));

  // Kết nối đúng namespace và truyền serialNumber trong query
  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    query: { serialNumber }
  });
  
  socket.on('connect', () => {
    setTimeout(() => {
      socket.emit('sensorData', sensorData);
      console.log('✅ Đã gửi event sensorData lên server!');
    }, 1000);
  });

  socket.on('device_command', (msg) => {
    console.log('\n📨 [device_command] Output received:', msg);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO disconnected:', reason);
    process.exit(0);
  });

  // Tự động thoát sau 10s
  setTimeout(() => {
    console.log('\n⏰ Kết thúc test. Đóng kết nối.');
    socket.disconnect();
  }, 10000);
}

if (require.main === module) {
  main().catch(console.error);
}
