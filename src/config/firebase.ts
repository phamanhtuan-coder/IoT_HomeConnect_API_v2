import * as admin from 'firebase-admin';
import * as path from 'path';

// Đường dẫn đến file khóa service account
const serviceAccountPath = path.join(__dirname, '../../.key/homeconnect-teamiot-firebase-adminsdk-7r0kf-c8b0fcfa05.json');

console.log('Service account path:', serviceAccountPath); // Thêm log để kiểm tra đường dẫn

try {
    // Khởi tạo ứng dụng Firebase
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('Firebase Admin initialized successfully.');
} catch (e) {
    console.error('Failed to initialize Firebase Admin:', e); // Cải thiện log lỗi
    throw e; // Ném lỗi ra để dừng ứng dụng nếu cần
}

export default admin;