import express from 'express';
import {
    createMessage,
    getGroupMessages,
    deleteMessage,
    updateMessage
} from '../controllers/messageController.js';

const router = express.Router();

// Crear un nuevo mensaje
router.post('/', createMessage);

// Obtener mensajes de un grupo
router.get('/group/:groupId', getGroupMessages);

// Eliminar un mensaje
router.delete('/:messageId', deleteMessage);

// Actualizar un mensaje
router.put('/:messageId', updateMessage);

export default router; 