const { io } = require('socket.io-client');
const readline = require('readline');

const SOCKET_URL = 'http://localhost:7777';

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
  const gas = parseFloat(await promptInput(`Nhập giá trị gas [${DEFAULT_SENSOR_DATA.gas}]: `) || DEFAULT_SENSOR_DATA.gas);
  const temperature = parseFloat(await promptInput(`Nhập nhiệt độ [${DEFAULT_SENSOR_DATA.temperature}]: `) || DEFAULT_SENSOR_DATA.temperature);
  const humidity = parseFloat(await promptInput(`Nhập độ ẩm [${DEFAULT_SENSOR_DATA.humidity}]: `) || DEFAULT_SENSOR_DATA.humidity);

  const sensorData = {
    ...DEFAULT_SENSOR_DATA,
    deviceId,
    gas,
    temperature,
    humidity,
    timestamp: Date.now()
  };

  console.log('\n📤 Sending sensorData:', JSON.stringify(sensorData, null, 2));

  const socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('🔌 Socket.IO connected:', socket.id);
    socket.emit('sensorData', sensorData);
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
