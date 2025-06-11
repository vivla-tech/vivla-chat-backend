import { Message, User, Group, GroupMember } from '../models/index.js';
import { Op } from 'sequelize';
import { sendClientMessage, sendMessage as chatwootSendMessage } from '../services/chatwootService.js';


// // Obtener mensajes de un grupo
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
                    as: 'messageSender',
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

// // Eliminar un mensaje
// export const deleteMessage = async (req, res) => {
//     try {
//         const { messageId } = req.params;
//         const { firebase_uid } = req.body; // ID del usuario que intenta eliminar

//         const message = await Message.findByPk(messageId, {
//             include: [
//                 {
//                     model: Group,
//                     as: 'group',
//                     include: [
//                         {
//                             model: User,
//                             as: 'owner',
//                             attributes: ['firebase_uid']
//                         }
//                     ]
//                 }
//             ]
//         });

//         if (!message) {
//             return res.status(404).json({ error: 'Mensaje no encontrado' });
//         }

//         // Verificar permisos (solo el remitente o el dueño del grupo pueden eliminar)
//         const isOwner = message.group.owner.firebase_uid === firebase_uid;
//         const isSender = message.sender_firebase_uid === firebase_uid;

//         if (!isOwner && !isSender) {
//             return res.status(403).json({ error: 'No tienes permiso para eliminar este mensaje' });
//         }

//         await message.destroy();
//         return res.json({ message: 'Mensaje eliminado correctamente' });
//     } catch (error) {
//         console.error('Error al eliminar mensaje:', error);
//         return res.status(500).json({ error: 'Error al eliminar el mensaje' });
//     }
// };

// Actualizar un mensaje (solo el contenido)
// export const updateMessage = async (req, res) => {
//     try {
//         const { messageId } = req.params;
//         const { text_content, media_url, firebase_uid } = req.body;

//         const message = await Message.findByPk(messageId);
//         if (!message) {
//             return res.status(404).json({ error: 'Mensaje no encontrado' });
//         }

//         // Solo el remitente puede editar el mensaje
//         if (message.sender_firebase_uid !== firebase_uid) {
//             return res.status(403).json({ error: 'No tienes permiso para editar este mensaje' });
//         }

//         // Actualizar solo los campos permitidos
//         if (text_content !== undefined) message.text_content = text_content;
//         if (media_url !== undefined) message.media_url = media_url;

//         await message.save();
//         return res.json(message);
//     } catch (error) {
//         console.error('Error al actualizar mensaje:', error);
//         return res.status(500).json({ error: 'Error al actualizar el mensaje' });
//     }
// };

async function findUserInGroupByContent(group, owner, messageContent) {
    try {
        // Obtener todos los miembros del grupo incluyendo la información del usuario
        const groupMembers = await GroupMember.findAll({
            where: { group_id: group.group_id },
            include: [{
                model: User,
                as: 'member',
                attributes: ['id', 'name']
            }]
        });

        // Buscar el usuario cuyo nombre aparece en el mensaje
        for (const member of groupMembers) {
            const userName = member.member.name;
            // Buscar el patrón **nombre** en el mensaje
            if (messageContent.includes(`**${userName}**`)) {
                return member.member; // Devolver el usuario encontrado
            }
        }

        return owner; // Si no se encuentra ningún usuario que coincida devolvemos el dueño del grupo
    } catch (error) {
        console.error('Error en findUserInGroupByContent:', error);
        return null;
    }
}

function getMessageParts(content, defaultUserName) {
    // Verificar si el contenido sigue el patrón "**Nombre**\n\nContenido"
    const parts = content.split('**');
    
    // Si no hay suficientes partes o no sigue el patrón, devolver el default
    if (parts.length < 3) {
        return {
            name: defaultUserName,
            content: content
        };
    }

    // Extraer el nombre (está entre los primeros **)
    const name = parts[1].trim();
    
    // El contenido está después del segundo **
    // Eliminamos el nombre y los ** del contenido original
    const contentWithoutName = content.replace(`**${name}**\n\n`, '').trim();

    return {
        name: name || defaultUserName,
        content: contentWithoutName || content
    };
}

// Webhook para eventos de Chatwoot
export const chatwootWebhook = async (req, res) => {
    try {
        const { event, id, content, message_type, created_at, private: isPrivate, source_id, content_type, content_attributes, sender, account, conversation, inbox } = req.body;

        // Solo mostrar detalles completos para message_created
        if (event === 'message_created') {
            console.log('Chatwoot Message Created Event:', {
                id,
                content,
                message_type,
                created_at,
                private: isPrivate,
                source_id,
                content_type,
                content_attributes,
                sender: {
                    type: sender?.type,
                    id: sender?.id,
                    name: sender?.name,
                    email: sender?.email
                },
                account: {
                    id: account?.id,
                    name: account?.name
                },
                conversation: {
                    id: conversation?.id,
                    status: conversation?.status,
                    inbox_id: conversation?.inbox_id
                },
                inbox: {
                    id: inbox?.id,
                    name: inbox?.name,
                    channel_type: inbox?.channel_type
                }
            });
            if(message_type === 'incoming') {
                const ownerUser = await User.findOne({ where: { email: sender.email } });
                if(!ownerUser) {
                    return res.status(404).json({ error: 'Usuario no encontrado' });
                }
                const group = await Group.findOne({ where: { cw_conversation_id: conversation.id.toString() } });
                if(!group) {
                    return res.status(404).json({ error: 'Grupo no encontrado' });
                }

                const senderUser = await findUserInGroupByContent(group, ownerUser, content);
                const { name: senderName, content: messageContent } = getMessageParts(content, senderUser.name);
                
                // Crear un nuevo mensaje en la tabla de Messages
                const newMessage = await Message.create({
                    group_id: group.group_id,
                    sender_id: senderUser.id,
                    sender_name: senderName,
                    message_type: 'text',
                    direction: 'incoming',
                    content: messageContent
                });

                console.log('Nuevo mensaje creado:', {
                    message_id: newMessage.id,
                    group_id: group.id,
                    sender: senderUser.name,
                    content: content
                });

            }else if(message_type === 'outgoing') {
                const user = await User.findOne({ where: { firebase_uid: '0000' } });
                if(!user) {
                    return res.status(404).json({ error: 'Usuario VIVLA no encontrado' });
                }
                const group = await Group.findOne({ where: { cw_conversation_id: conversation.id.toString() } });
                if(!group) {
                    return res.status(404).json({ error: 'Grupo no encontrado' });
                }
                
                // Crear un nuevo mensaje en la tabla de Messages
                const newMessage = await Message.create({
                    group_id: group.group_id,
                    sender_id: user.id,
                    sender_name: 'VIVLA',
                    message_type: 'text',
                    direction: 'outgoing',
                    content: content
                });

                console.log('Nuevo mensaje creado:', {
                    message_id: newMessage.id,
                    group_id: group.id,
                    sender: sender.name,
                    content: content
                });
            }
            // console.log('Chatwoot Full Message Created Event:', req.body);
        } else {
            // Para otros eventos, solo mostrar el tipo
            console.log('Chatwoot Event:', { event });
        }

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

/**
 * Función auxiliar para enviar mensaje usando la API interna de Chatwoot
 * @param {string} conversation_id - ID de la conversación
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<Object>} Respuesta de Chatwoot
 */
async function sendInternalMessage(conversation_id, content) {
    if (!conversation_id || !content) {
        throw new Error('Faltan datos requeridos: conversation_id y content son necesarios');
    }

    console.log('Sending internal message to Chatwoot:', {
        conversation_id,
        content
    });

    return await chatwootSendMessage(conversation_id, content);
}

/**
 * Función auxiliar para enviar mensaje usando la API pública de Chatwoot
 * @param {string} client_id - ID del cliente
 * @param {string} conversation_id - ID de la conversación
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<Object>} Respuesta de Chatwoot
 */
async function sendPublicMessage(client_id, conversation_id, content) {
    if (!client_id || !conversation_id || !content) {
        throw new Error('Faltan datos requeridos: client_id, conversation_id y content son necesarios');
    }

    console.log('Sending public message to Chatwoot:', {
        client_id,
        conversation_id,
        content
    });

    return await sendClientMessage(client_id, conversation_id, content);
}

// Controlador principal para enviar mensajes
export const sendMessage = async (req, res) => {
    try {
        const { conversation_id, content, client_id, user_id } = req.body;

        // Buscar el usuario por su ID
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuario no encontrado'
            });
        }

        // Concatenar el nombre del usuario al contenido del mensaje
        const messageContent = `**${user.name}**\n\n${content}`;

        let response;
        if (client_id) {
            // Si viene client_id, usar la API pública
            response = await sendPublicMessage(client_id, conversation_id, messageContent);
        } else {
            // Si no viene client_id, usar la API interna
            response = await sendInternalMessage(conversation_id, messageContent);
        }

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
