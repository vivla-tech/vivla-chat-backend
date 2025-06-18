import { uploadImageToStorage, uploadVideoToStorage } from '../services/fileService.js';

/**
 * Sube una imagen y devuelve la URL
 */
export const uploadImage = async (req, res) => {
    try {
        const { groupId } = req.body;
        const { buffer, originalname } = req.file;

        if (!buffer || !originalname) {
            return res.status(400).json({
                error: 'No se proporcionó ninguna imagen'
            });
        }

        if (!groupId) {
            return res.status(400).json({
                error: 'Se requiere el ID del grupo'
            });
        }

        // Validar el tipo de archivo
        const fileType = originalname.split('.').pop().toLowerCase();
        const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({
                error: 'Tipo de archivo no permitido. Solo se permiten: ' + allowedTypes.join(', ')
            });
        }

        // Validar tamaño (5MB máximo)
        const maxSize = 5 * 1024 * 1024; // 5MB en bytes
        if (buffer.length > maxSize) {
            return res.status(400).json({
                error: 'La imagen es demasiado grande. Máximo 5MB permitido.'
            });
        }

        const imageUrl = await uploadImageToStorage(buffer, groupId, originalname);

        res.json({
            url: imageUrl,
            type: 'image',
            name: originalname,
            size: buffer.length
        });

    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({
            error: error.message || 'Error al subir la imagen'
        });
    }
};

/**
 * Sube un video y devuelve la URL
 */
export const uploadVideo = async (req, res) => {
    try {
        const { groupId } = req.body;
        const { buffer, originalname } = req.file;

        if (!buffer || !originalname) {
            return res.status(400).json({
                error: 'No se proporcionó ningún video'
            });
        }

        if (!groupId) {
            return res.status(400).json({
                error: 'Se requiere el ID del grupo'
            });
        }

        // Validar el tipo de archivo
        const fileType = originalname.split('.').pop().toLowerCase();
        const allowedTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];

        if (!allowedTypes.includes(fileType)) {
            return res.status(400).json({
                error: 'Tipo de archivo no permitido. Solo se permiten: ' + allowedTypes.join(', ')
            });
        }

        // Validar tamaño (50MB máximo para videos)
        const maxSize = 50 * 1024 * 1024; // 50MB en bytes
        if (buffer.length > maxSize) {
            return res.status(400).json({
                error: 'El video es demasiado grande. Máximo 50MB permitido.'
            });
        }

        const videoUrl = await uploadVideoToStorage(buffer, groupId, originalname);

        res.json({
            url: videoUrl,
            type: 'video',
            name: originalname,
            size: buffer.length
        });

    } catch (error) {
        console.error('Error al subir video:', error);
        res.status(500).json({
            error: error.message || 'Error al subir el video'
        });
    }
}; 