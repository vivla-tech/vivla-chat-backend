import { Message, User, Group, InvitedGuest } from '../models/index.js';
import { Op } from 'sequelize';
import { sendMessage as chatwootSendMessage } from '../services/chatwootService.js';

// Crear un nuevo mensaje
export const createMessage = async (req, res) => {
    try {
        const { group_id, sender_firebase_uid, sender_guest_id, text_content, message_type, media_url } = req.body;

        // Validar datos requeridos
        if (!group_id || (!sender_firebase_uid && !sender_guest_id) || (!text_content && !media_url)) {
            return res.status(400).json({
                error: 'Faltan datos requeridos: grupo, remitente y contenido del mensaje son necesarios'
            });
        }

        // Verificar que el grupo existe
        const group = await Group.findByPk(group_id);
        if (!group) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }

        // Obtener el nombre del remitente
        let sender_display_name;
        if (sender_firebase_uid) {
            const user = await User.findOne({ where: { firebase_uid: sender_firebase_uid } });
            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            sender_display_name = user.name;
        } else {
            const guest = await InvitedGuest.findByPk(sender_guest_id);
            if (!guest) {
                return res.status(404).json({ error: 'Invitado no encontrado' });
            }
            sender_display_name = guest.name;
        }

        // Crear el mensaje
        const message = await Message.create({
            group_id,
            sender_firebase_uid,
            sender_guest_id,
            sender_display_name,
            message_type: message_type || 'text',
            text_content,
            media_url
        });

        return res.status(201).json(message);
    } catch (error) {
        console.error('Error al crear mensaje:', error);
        return res.status(500).json({ error: 'Error al crear el mensaje' });
    }
};

// Obtener mensajes de un grupo
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Verificar que el grupo existe
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }

        // Obtener mensajes con información del remitente
        const messages = await Message.findAll({
            where: { group_id: groupId },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['name', 'email', 'house_name']
                },
                {
                    model: InvitedGuest,
                    as: 'guestSender',
                    attributes: ['name', 'email']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return res.json(messages);
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        return res.status(500).json({ error: 'Error al obtener los mensajes' });
    }
};

// Eliminar un mensaje
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { firebase_uid } = req.body; // ID del usuario que intenta eliminar

        const message = await Message.findByPk(messageId, {
            include: [
                {
                    model: Group,
                    as: 'group',
                    include: [
                        {
                            model: User,
                            as: 'owner',
                            attributes: ['firebase_uid']
                        }
                    ]
                }
            ]
        });

        if (!message) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        // Verificar permisos (solo el remitente o el dueño del grupo pueden eliminar)
        const isOwner = message.group.owner.firebase_uid === firebase_uid;
        const isSender = message.sender_firebase_uid === firebase_uid;

        if (!isOwner && !isSender) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este mensaje' });
        }

        await message.destroy();
        return res.json({ message: 'Mensaje eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar mensaje:', error);
        return res.status(500).json({ error: 'Error al eliminar el mensaje' });
    }
};

// Actualizar un mensaje (solo el contenido)
export const updateMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text_content, media_url, firebase_uid } = req.body;

        const message = await Message.findByPk(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        // Solo el remitente puede editar el mensaje
        if (message.sender_firebase_uid !== firebase_uid) {
            return res.status(403).json({ error: 'No tienes permiso para editar este mensaje' });
        }

        // Actualizar solo los campos permitidos
        if (text_content !== undefined) message.text_content = text_content;
        if (media_url !== undefined) message.media_url = media_url;

        await message.save();
        return res.json(message);
    } catch (error) {
        console.error('Error al actualizar mensaje:', error);
        return res.status(500).json({ error: 'Error al actualizar el mensaje' });
    }
};

// Webhook para eventos de Chatwoot
export const chatwootWebhook = async (req, res) => {
    try {
        // Log de los headers para verificar la autenticación
        // console.log('Chatwoot Webhook Headers:', {
        //     'x-chatwoot-signature': req.headers['x-chatwoot-signature'],
        //     'content-type': req.headers['content-type'],
        //     'user-agent': req.headers['user-agent']
        // });

        // Log del body completo
        console.log('Chatwoot Webhook Body:', JSON.stringify(req.body, null, 2));

        // Log de los parámetros específicos que suelen venir en eventos de Chatwoot
        const {
            event,
            conversation,
            message,
            contact,
            account
        } = req.body;

        // console.log('Chatwoot Event Details:', {
        //     event,
        //     conversationId: conversation?.id,
        //     messageId: message?.id,
        //     contactId: contact?.id,
        //     accountId: account?.id
        // });

        // Respondemos con 200 para indicar que recibimos el webhook correctamente
        return res.status(200).json({ 
            status: 'success',
            message: 'Webhook received successfully'
        });
    } catch (error) {
        console.error('Error processing Chatwoot webhook:', error);
        return res.status(500).json({ 
            status: 'error',
            message: 'Error processing webhook',
            error: error.message
        });
    }
};

// Enviar mensaje a Chatwoot usando el servicio existente
export const sendMessage = async (req, res) => {
    try {
        const { conversation_id, content } = req.body;

        // Validar datos requeridos
        if (!conversation_id || !content) {
            return res.status(400).json({
                error: 'Faltan datos requeridos: conversation_id y content son necesarios'
            });
        }

        console.log('Sending message to Chatwoot:', {
            conversation_id,
            content
        });

        // Usar el servicio de Chatwoot para enviar el mensaje
        const response = await chatwootSendMessage(conversation_id, content);

        // Log de la respuesta para debugging
        // console.log('Chatwoot API Response:', {
        //     messageId: response.id,
        //     status: response.status
        // });

        // Devolver la respuesta de Chatwoot
        return res.status(200).json({
            status: 'success',
            message: 'Mensaje enviado correctamente a Chatwoot',
            data: response
        });

    } catch (error) {
        console.error('Error al enviar mensaje a Chatwoot:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Error al enviar mensaje a Chatwoot',
            error: error.message
        });
    }
}; 