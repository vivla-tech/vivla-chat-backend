import express from 'express';
import {
    // createMessage,
    getGroupMessages,
    // deleteMessage,
    // updateMessage,
    chatwootWebhook,
    sendMessage
} from '../controllers/messageController.js';
import { Group, User, GroupMember } from '../models/index.js';

const router = express.Router();

// // Crear un nuevo mensaje
// router.post('/', createMessage);

// // Obtener mensajes de un grupo
router.get('/group/:groupId', getGroupMessages);

// // Eliminar un mensaje
// router.delete('/:messageId', deleteMessage);

// // Actualizar un mensaje
// router.put('/:messageId', updateMessage);

// Nueva ruta para el webhook de Chatwoot
router.post('/chatwoot-webhook', chatwootWebhook);

// Ruta para enviar mensajes a Chatwoot usando el servicio existente
router.post('/send', sendMessage);

// Ruta para simular webhook de Chatwoot en desarrollo
router.post('/simulate-webhook', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'No disponible en producción' });
    }

    try {
        // Buscar el grupo por su ID real
        const group = await Group.findByPk(req.body.group_id);
        if (!group) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }

        // Buscar el usuario por su ID real
        const user = await User.findByPk(req.body.user_id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Simular el webhook de Chatwoot con los datos reales
        const mockWebhookData = {
            event: 'message_created',
            id: Date.now(),
            content: `**${user.name}**\n\n${req.body.content}`,
            message_type: 'incoming',
            created_at: new Date().toISOString(),
            private: false,
            sender: {
                type: 'contact',
                id: user.cw_contact_id || '123',
                name: user.name,
                email: user.email
            },
            conversation: {
                id: group.cw_conversation_id || '123',
                status: 'open',
                inbox_id: '1'
            }
        };

        // Llamar al controlador de webhook con los datos simulados
        await chatwootWebhook({ body: mockWebhookData }, res);

        console.log('Webhook simulado procesado:', {
            group_id: group.group_id,
            user_id: user.id,
            content: req.body.content,
            sender: user.name
        });

    } catch (error) {
        console.error('Error en webhook simulado:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 