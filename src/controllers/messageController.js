import { Message, User, Group, InvitedGuest } from '../models/index.js';
import { Op } from 'sequelize';

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