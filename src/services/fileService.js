import { storage } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sube una imagen a Firebase Storage
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {string} groupId - ID del grupo
 * @param {string} originalName - Nombre original del archivo
 * @returns {Promise<string>} URL de la imagen subida
 */
export const uploadImageToStorage = async (imageBuffer, groupId, originalName) => {
    try {
        // Generar un nombre único para el archivo
        const fileExtension = originalName.split('.').pop() || 'jpg';
        const fileName = `chat-images/${groupId}/${uuidv4()}.${fileExtension}`;

        // Obtener referencia al bucket y archivo
        const bucket = storage.bucket();
        const file = bucket.file(fileName);

        // Subir el archivo
        await file.save(imageBuffer, {
            metadata: {
                contentType: `image/${fileExtension}`,
                metadata: {
                    groupId: groupId,
                    uploadedAt: new Date().toISOString()
                }
            }
        });

        // Hacer el archivo público y obtener la URL
        await file.makePublic();

        // Construir la URL pública
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        console.log('Imagen subida exitosamente:', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('Error al subir imagen a Firebase Storage:', error);
        throw new Error('No se pudo subir la imagen');
    }
};