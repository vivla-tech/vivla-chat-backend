import { Message, User, Group, InvitedGuest } from '../db/models/index.js';
import { Op } from 'sequelize';

/**
 * Crea un nuevo mensaje en un grupo
 */
export const createMessage = async (req, res) => {
    try {
        const { group_id, sender_id, text_content, message_type, media_url, chatwoot_id } = req.body;

        // Validar datos requeridos
        if (!group_id || !sender_id || (!text_content && !media_url)) {
            return res.status(400).json({
                error: 'Faltan datos requeridos',
                details: 'Se requieren: grupo, remitente y contenido del mensaje'
            });
        }

        // Verificar que el grupo existe
        const group = await Group.findByPk(group_id);
        if (!group) {
            return res.status(404).json({
                error: 'Grupo no encontrado',
                details: `No existe un grupo con el ID: ${group_id}`
            });
        }

        // Obtener el nombre del remitente (puede ser usuario o invitado)
        let sender_display_name;
        const user = await User.findByPk(sender_id);
        const guest = await InvitedGuest.findByPk(sender_id);

        if (user) {
            sender_display_name = user.name;
        } else if (guest) {
            sender_display_name = guest.name;
        } else {
            return res.status(404).json({
                error: 'Remitente no encontrado',
                details: `No existe un usuario o invitado con el ID: ${sender_id}`
            });
        }

        // Crear el mensaje
        const message = await Message.create({
            group_id,
            sender_id,
            sender_display_name,
            message_type: message_type || 'text',
            text_content,
            media_url,
            chatwoot_id
        });

        return res.status(201).json({
            message_id: message.message_id,
            group_id: message.group_id,
            sender_id: message.sender_id,
            sender_display_name: message.sender_display_name,
            message_type: message.message_type,
            text_content: message.text_content,
            media_url: message.media_url,
            chatwoot_id: message.chatwoot_id,
            created_at: message.created_at
        });
    } catch (error) {
        console.error('Error al crear mensaje:', error);
        return res.status(500).json({
            error: 'Error al crear el mensaje',
            details: error.message
        });
    }
};

/**
 * Obtiene los mensajes de un grupo con paginación
 */
export const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, before } = req.query;

        // Verificar que el grupo existe
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({
                error: 'Grupo no encontrado',
                details: `No existe un grupo con el ID: ${groupId}`
            });
        }

        // Construir la consulta
        const where = { group_id: groupId };
        if (before) {
            where.created_at = { [Op.lt]: new Date(before) };
        }

        // Obtener mensajes con información del remitente
        const messages = await Message.findAll({
            where,
            include: [
                {
                    model: User,
                    as: 'userSender',
                    attributes: ['name', 'email']
                },
                {
                    model: InvitedGuest,
                    as: 'guestSender',
                    attributes: ['name', 'email']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit)
        });

        // Transformar la respuesta para incluir el remitente correcto
        const formattedMessages = messages.map(msg => ({
            message_id: msg.message_id,
            group_id: msg.group_id,
            sender_id: msg.sender_id,
            sender_display_name: msg.sender_display_name,
            message_type: msg.message_type,
            text_content: msg.text_content,
            media_url: msg.media_url,
            chatwoot_id: msg.chatwoot_id,
            created_at: msg.created_at,
            sender: msg.userSender || msg.guestSender
        }));

        return res.json({
            messages: formattedMessages,
            has_more: messages.length === parseInt(limit)
        });
    } catch (error) {
        console.error('Error al obtener mensajes:', error);
        return res.status(500).json({
            error: 'Error al obtener los mensajes',
            details: error.message
        });
    }
};

/**
 * Elimina un mensaje (solo el remitente o el dueño del grupo)
 */
export const deleteMessage = async (req, res) => {
    try {
        const { messageId, senderId } = req.params; // Cambiado de req.query a req.params

        const message = await Message.findByPk(messageId, {
            include: [
                {
                    model: Group,
                    as: 'group',
                    include: [
                        {
                            model: User,
                            as: 'owner',
                            attributes: ['id']
                        }
                    ]
                }
            ]
        });

        if (!message) {
            return res.status(404).json({
                error: 'Mensaje no encontrado',
                details: `No existe un mensaje con el ID: ${messageId}`
            });
        }

        // Verificar permisos (solo el remitente o el dueño del grupo pueden eliminar)
        const isOwner = message.group.owner.id === senderId;
        const isSender = message.sender_id === senderId;

        if (!isOwner && !isSender) {
            return res.status(403).json({
                error: 'No tienes permiso para eliminar este mensaje',
                details: 'Solo el remitente o el dueño del grupo pueden eliminar mensajes'
            });
        }

        await message.destroy();
        return res.json({
            message: 'Mensaje eliminado correctamente',
            message_id: messageId
        });
    } catch (error) {
        console.error('Error al eliminar mensaje:', error);
        return res.status(500).json({
            error: 'Error al eliminar el mensaje',
            details: error.message
        });
    }
};

/**
 * Actualiza un mensaje (solo el remitente puede editar)
 */
export const updateMessage = async (req, res) => {
    try {
        const { messageId, senderId } = req.params; // Cambiado de req.query a req.params
        const { text_content, media_url } = req.body; // Solo los datos a actualizar en el body

        // Validar que al menos un campo a actualizar esté presente
        if (text_content === undefined && media_url === undefined) {
            return res.status(400).json({
                error: 'No hay campos para actualizar',
                details: 'Se requiere al menos text_content o media_url en el body'
            });
        }

        // Buscar el mensaje con información del grupo y remitente
        const message = await Message.findOne({
            where: { message_id: messageId },
            include: [
                {
                    model: User,
                    as: 'userSender',
                    attributes: ['name', 'email']
                },
                {
                    model: InvitedGuest,
                    as: 'guestSender',
                    attributes: ['name', 'email']
                }
            ]
        });

        if (!message) {
            return res.status(404).json({
                error: 'Mensaje no encontrado',
                details: `No existe un mensaje con el ID: ${messageId}`
            });
        }

        // Solo el remitente puede editar el mensaje
        if (message.sender_id !== senderId) {
            return res.status(403).json({
                error: 'No tienes permiso para editar este mensaje',
                details: 'Solo el remitente puede editar sus mensajes'
            });
        }

        // Actualizar solo los campos permitidos
        const updates = {};
        if (text_content !== undefined) updates.text_content = text_content;
        if (media_url !== undefined) updates.media_url = media_url;

        // Si se está actualizando text_content, asegurarse de que no esté vacío
        if (updates.text_content === '') {
            return res.status(400).json({
                error: 'Contenido inválido',
                details: 'El contenido del mensaje no puede estar vacío'
            });
        }

        // Actualizar el mensaje
        await message.update(updates);

        // Obtener el remitente (usuario o invitado)
        const sender = message.userSender || message.guestSender;

        return res.json({
            message_id: message.message_id,
            group_id: message.group_id,
            sender_id: message.sender_id,
            sender_display_name: message.sender_display_name,
            message_type: message.message_type,
            text_content: message.text_content,
            media_url: message.media_url,
            chatwoot_id: message.chatwoot_id,
            created_at: message.created_at,
            sender: {
                name: sender.name,
                email: sender.email
            }
        });
    } catch (error) {
        console.error('Error al actualizar mensaje:', error);
        return res.status(500).json({
            error: 'Error al actualizar el mensaje',
            details: error.message
        });
    }
}; 