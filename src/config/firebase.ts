import admin from "firebase-admin";

if (!process.env.FIREBASE_KEY_JSON) {
    throw new Error("Missing FIREBASE_KEY_JSON env variable");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
try {
    // Khởi tạo ứng dụng Firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
    console.log('Firebase Admin initialized successfully.');
} catch (e) {
    console.error('Failed to initialize Firebase Admin:', e); // Cải thiện log lỗi
    throw e; // Ném lỗi ra để dừng ứng dụng nếu cần
}


export default admin;
