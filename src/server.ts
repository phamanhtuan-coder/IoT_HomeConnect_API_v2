import { initApp } from './app';
import { initSocket } from './sockets';
import { appConfig } from './config/app';
import admin from './config/firebase';

// Kiểm tra Firebase Admin có khởi tạo thành công không
console.log('Firebase Admin SDK version:', admin.SDK_VERSION);

// Thử gửi một thông báo test (nếu bạn dùng FCM)
// admin.messaging().send({
//     notification: {
//         title: 'Test Notification',
//         body: 'Firebase Admin is working!',
//     },
//     topic: 'test',
// }).then((response) => {
//     console.log('Test message sent successfully:', response);
// }).catch((error) => {
//     console.error('Error sending test message:', error.message);
// });

const { app, io } = initApp();

initSocket(io);

app.listen(appConfig.port, () => {
    console.log(`Server is running on port ${appConfig.port}`);
});