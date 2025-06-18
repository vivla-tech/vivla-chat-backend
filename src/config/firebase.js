import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';

dotenv.config();

let app;
let auth;
let storage;

try {
    // Decodificar el service account desde base64
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountBase64) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT no está definida en las variables de entorno');
    }

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    if (!storageBucket) {
        throw new Error('FIREBASE_STORAGE_BUCKET no está definida en las variables de entorno');
    }

    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString());

    // Inicializar Firebase Admin usando el service account completo
    app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: storageBucket
    });

    auth = getAuth(app);
    storage = getStorage(app);
} catch (error) {
    console.error('Error al inicializar Firebase:', error);
    throw error;
}

export { auth, storage };
export default app; 