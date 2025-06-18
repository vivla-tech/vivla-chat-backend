import express from 'express';
import { uploadImage } from '../controllers/fileController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Middleware para procesar archivos
import multer from 'multer';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB límite
    }
});

/**
 * @route POST /files/images
 * @description Sube una imagen y devuelve la URL
 * @access Private
 */
router.post('/images',
    authenticateUser,
    upload.single('file'),
    uploadImage
);

export default router; 