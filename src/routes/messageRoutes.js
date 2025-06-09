import express from 'express';
import {
    // createMessage,
    // getGroupMessages,
    // deleteMessage,
    // updateMessage,
    chatwootWebhook,
    sendMessage
} from '../controllers/messageController.js';

const router = express.Router();

// // Crear un nuevo mensaje
// router.post('/', createMessage);

// // Obtener mensajes de un grupo
// router.get('/group/:groupId', getGroupMessages);

// // Eliminar un mensaje
// router.delete('/:messageId', deleteMessage);

// // Actualizar un mensaje
// router.put('/:messageId', updateMessage);

// Nueva ruta para el webhook de Chatwoot
router.post('/chatwoot-webhook', chatwootWebhook);

// Ruta para enviar mensajes a Chatwoot usando el servicio existente
router.post('/send', sendMessage);

export default router; 