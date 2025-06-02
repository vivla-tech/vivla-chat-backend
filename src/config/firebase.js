import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Firebase Admin usando el archivo de credenciales
const app = initializeApp({
    credential: cert(path.join(__dirname, '../../firebase-credentials.json'))
});

export const auth = getAuth(app);
export default app; 