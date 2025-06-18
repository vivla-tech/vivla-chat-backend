import express from 'express';
import multer from 'multer';
import { uploadImage, uploadVideo } from '../controllers/fileController.js';
import { authenticateUser } from '../middleware/auth.js';


const router = express.Router();

// Configuración de multer para manejar archivos
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB máximo
    }
});

/**
 * @route POST /files/images
 * @description Sube una imagen y devuelve la URL
 * @access Private
 */
router.post('/images', authenticateUser, upload.single('file'), uploadImage);

/**
 * @route POST /files/videos
 * @description Sube un video y devuelve la URL
 * @access Private
 */
router.post('/videos', authenticateUser, upload.single('file'), uploadVideo);

export default router; 