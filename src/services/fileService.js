import { storage } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sube un archivo multimedia (imagen o video) a Firebase Storage
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} groupId - ID del grupo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} fileType - Tipo de archivo ('image' o 'video')
 * @returns {Promise<string>} URL del archivo subido
 */
export const uploadFileToStorage = async (fileBuffer, groupId, originalName, fileType = 'image') => {
    try {
        // Generar un nombre único para el archivo
        const fileExtension = originalName.split('.').pop() || 'jpg';
        const fileName = `${fileType}s/${groupId}/${uuidv4()}.${fileExtension}`;

        // Obtener referencia al bucket y archivo
        const bucket = storage.bucket();
        const file = bucket.file(fileName);

        // Determinar el content type
        let contentType;
        if (fileType === 'video') {
            contentType = `video/${fileExtension}`;
        } else {
            contentType = `image/${fileExtension}`;
        }

        // Subir el archivo
        await file.save(fileBuffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                    groupId: groupId,
                    uploadedAt: new Date().toISOString(),
                    fileType: fileType
                }
            }
        });

        // Hacer el archivo público y obtener la URL
        await file.makePublic();

        // Construir la URL pública
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        console.log(`${fileType} subido exitosamente:`, publicUrl);
        return publicUrl;

    } catch (error) {
        console.error(`Error al subir ${fileType} a Firebase Storage:`, error);
        throw new Error(`No se pudo subir el ${fileType}`);
    }
};

// Función específica para imágenes (mantiene compatibilidad)
export const uploadImageToStorage = async (imageBuffer, groupId, originalName) => {
    return uploadFileToStorage(imageBuffer, groupId, originalName, 'image');
};

// Función específica para videos
export const uploadVideoToStorage = async (videoBuffer, groupId, originalName) => {
    return uploadFileToStorage(videoBuffer, groupId, originalName, 'video');
};