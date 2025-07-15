import { Message, User, Group, GroupMember } from '../models/index.js';
import { Op } from 'sequelize';
import { sendClientMessage, sendMessage as chatwootSendMessage, sendInternalNoteMessage, resetTicketCustomAttributes } from '../services/chatwootService.js';
import { emitToGroup } from '../services/websocketService.js';
import { createTicket } from '../services/zendeskService.js';


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
                    as: 'user',
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

function cleanBotMessage(content) {
    return content.replace('🤖', '').trim();
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

// Función para limpiar el mensaje del ticket eliminando las menciones
const cleanTicketMessage = (message) => {
    // Expresión regular que coincide con [@Zendesk](mention:xxxx) o [@Ticket](mention:xxxx)
    // Ignora mayúsculas/minúsculas y permite variaciones en el formato
    const mentionRegex = /\[@(?:Zendesk|Ticket|zendesk|ticket|ZENDESK|TICKET)\]\(mention:[^)]+\)\s*/i;
    
    // Reemplazar la mención con una cadena vacía
    return message.replace(mentionRegex, '').trim();
};

// ===== WEBHOOK EVENT HANDLERS =====

/**
 * Maneja eventos de mensajes creados (públicos)
 */
async function handleMessageCreatedEvent(webhookData) {
    const { content, message_type, sender, conversation, attachments } = webhookData;
    
    if (message_type === 'incoming') {
        await handleIncomingMessage(sender, conversation, content, attachments);
    } else if (message_type === 'outgoing') {
        await handleOutgoingMessage(sender, conversation, content, attachments);
    }
}

/**
 * Maneja eventos de mensajes privados (tickets)
 */
async function handlePrivateMessageEvent(webhookData) {
    const { content, sender, conversation } = webhookData;
    
    if (content.toLowerCase().includes('@ticket') || content.toLowerCase().includes('@zendesk')) {
        await handleTicketCreation(sender, conversation, content);
    }
}

// ===== MESSAGE TYPE HANDLERS =====

/**
 * Procesa mensajes entrantes de usuarios
 */
async function handleIncomingMessage(sender, conversation, content, attachments) {
    const ownerUser = await findUserByEmail(sender.email);
    const group = await findGroupByConversationId(conversation.id);
    
    const senderUser = await findUserInGroupByContent(group, ownerUser, content);
    const { name: senderName, content: messageContent } = getMessageParts(content, senderUser.name);

    if (attachments && attachments.length > 0) {
        await processAttachments(group.group_id, senderUser.id, senderName, 'incoming', attachments, messageContent);
    } else {
        await storeAndEmitTextMessage(group.group_id, senderUser.id, senderName, 'incoming', messageContent);
    }
    
    console.log('Nuevo mensaje creado y emitido.');
}

/**
 * Procesa mensajes salientes de agentes VIVLA
 */
async function handleOutgoingMessage(sender, conversation, content, attachments) {
    const group = await findGroupByConversationId(conversation.id);
    
    const { isBotMessage, agentName, cleanContent } = processAgentMessage(content, sender);
    const user = await getAgentUser(isBotMessage, sender);
    
    if (attachments && attachments.length > 0) {
        await processAttachments(group.group_id, user.id, agentName, 'outgoing', attachments, cleanContent);
    } else {
        await storeAndEmitTextMessage(group.group_id, user.id, agentName, 'outgoing', cleanContent);
    }
    
    console.log('Nuevo mensaje VIVLA creado y emitido.');
}

// ===== TICKET HANDLERS =====

/**
 * Maneja la creación de tickets desde mensajes privados
 */
async function handleTicketCreation(sender, conversation, content) {
    console.log('Chatwoot Private Message Created Event:', { sender, conversation, content });
    
    const ticketData = extractTicketData(conversation);
    if (!isValidTicketData(ticketData)) {
        await sendInternalNote(conversation.id, 'ERROR CREANDO TICKET: Faltan datos requeridos para crear el ticket');
        return { status: 400, error: 'Faltan datos requeridos para crear el ticket' };
    }
    
    const group = await findGroupByConversationId(conversation.id);
    const groupOwner = await findUserById(group.user_id);
    
    const ticket = await createTicketFromMessage(groupOwner, sender, content, ticketData, conversation.id);
    await sendTicketConfirmation(conversation.id, sender.name, ticket, ticketData);
    
    return { status: 200 };
}

// ===== DATA EXTRACTION HELPERS =====

/**
 * Extrae datos del webhook de Chatwoot
 */
function extractWebhookData(req) {
    const { event, id, content, message_type, created_at, private: isPrivate, source_id, content_type, content_attributes, sender, account, conversation, inbox, attachments } = req.body;
    
    return {
        event, id, content, message_type, created_at, isPrivate, source_id, 
        content_type, content_attributes, sender, account, conversation, inbox, attachments
    };
}

/**
 * Extrae datos de ticket de la conversación
 */
function extractTicketData(conversation) {
    const { custom_attributes } = conversation;
    const { casa, zendesk_ticket_priority, zendesk_equipo_de_resolucin } = custom_attributes;
    
    return { casa, zendesk_ticket_priority, zendesk_equipo_de_resolucin };
}

/**
 * Procesa información del mensaje del agente
 */
function processAgentMessage(content, sender) {
    let isBotMessage = false;
    let agentName = 'VIVLA';
    
    if (content && content.includes('🤖')) {
        isBotMessage = true;
        agentName = '🤖 VIVLA';
    } else {
        agentName = `${capitalizeFirstLetter(sender.name)}`;
    }
    
    const cleanContent = isBotMessage ? cleanBotMessage(content) : content;
    
    return { isBotMessage, agentName, cleanContent };
}

// ===== DATABASE HELPERS =====

/**
 * Busca usuario por email
 */
async function findUserByEmail(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new Error('Usuario no encontrado');
    }
    return user;
}

/**
 * Busca grupo por ID de conversación
 */
async function findGroupByConversationId(conversationId) {
    const group = await Group.findOne({ where: { cw_conversation_id: conversationId.toString() } });
    if (!group) {
        throw new Error('Grupo no encontrado');
    }
    return group;
}

/**
 * Busca usuario por ID
 */
async function findUserById(userId) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
        throw new Error('Usuario no encontrado');
    }
    return user;
}

/**
 * Obtiene o crea usuario agente
 */
async function getAgentUser(isBotMessage, sender) {
    if (isBotMessage) {
        const user = await User.findOne({ where: { firebase_uid: '0000' } });
        if (!user) {
            throw new Error('Usuario VIVLA no encontrado');
        }
        return user;
    } else {
        return await createAgentUser(sender);
    }
}

// ===== VALIDATION HELPERS =====

/**
 * Valida datos de ticket
 */
function isValidTicketData(ticketData) {
    const { casa, zendesk_ticket_priority, zendesk_equipo_de_resolucin } = ticketData;
    return casa && zendesk_ticket_priority && zendesk_equipo_de_resolucin && 
           casa !== '--' && zendesk_ticket_priority !== '--' && zendesk_equipo_de_resolucin !== '--';
}

// ===== PROCESSING HELPERS =====

/**
 * Procesa attachments de mensajes
 */
async function processAttachments(groupId, senderId, senderName, direction, attachments, fallbackContent = '') {
    console.log('🔍 Procesando attachments:', attachments);
    console.log('🔍 Fallback content:', fallbackContent);
    for (const attachment of attachments) {
        if (attachment.data_url) {
            const cleanDataUrl = cleanChatwootDataUrl(attachment.data_url);
            const cleanThumbUrl = cleanChatwootDataUrl(attachment.thumb_url);
            await storeAndEmitMediaMessage(groupId, senderId, senderName, direction, attachment, cleanDataUrl, cleanThumbUrl, fallbackContent);
        } else if (fallbackContent) {
            await storeAndEmitTextMessage(groupId, senderId, senderName, direction, fallbackContent);
        }
    }
}

/**
 * Crea ticket desde mensaje
 */
async function createTicketFromMessage(groupOwner, sender, content, ticketData, conversationId) {
    const cleanedMessage = cleanTicketMessage(content);
    const { casa, zendesk_ticket_priority, zendesk_equipo_de_resolucin } = ticketData;
    
    const ticket = await createTicket(
        groupOwner.name, 
        groupOwner.email, 
        sender.name, 
        cleanedMessage, 
        zendesk_ticket_priority, 
        casa, 
        zendesk_equipo_de_resolucin, 
        conversationId, 
        true
    );
    
    console.log('Ticket creado');
    return ticket;
}

/**
 * Envía confirmación de ticket
 */
async function sendTicketConfirmation(conversationId, senderName, ticket, ticketData) {
    const ticketUrl = `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/agent/tickets/${ticket.id}`;
    const { casa, zendesk_ticket_priority, zendesk_equipo_de_resolucin } = ticketData;
    
    const ticketMessage = `👋 Hola ${senderName}\n\nTicket creado:\n - 🆔 Id: **${ticket.id}**\n - 📝 Prioridad: **${zendesk_ticket_priority}**\n - 📍 Casa: **${casa}**\n - 🔍 Equipo de resolución: **${zendesk_equipo_de_resolucin}**\n - 🔗 Puedes verlo en: ${ticketUrl}\n\nAgur!`;
    
    await sendInternalNote(conversationId, ticketMessage);
    console.log('Nota interna enviada');
    
    await resetTicketCustomAttributes(conversationId);
    console.log('Custom attributes reseteados');
}

// ===== MAIN WEBHOOK FUNCTION =====

/**
 * Webhook principal para eventos de Chatwoot
 */
export const chatwootWebhook = async (req, res) => {
    try {
        const webhookData = extractWebhookData(req);
        const { event, isPrivate, content } = webhookData;
        
        // Log detallado solo para message_created
        if (event === 'message_created' && !isPrivate) {
            logMessageCreatedEvent(webhookData);
            await handleMessageCreatedEvent(webhookData);
        } else if (event === 'message_created' && isPrivate) {
            const result = await handlePrivateMessageEvent(webhookData);
            if (result && result.status !== 200) {
                return res.status(result.status).json({ error: result.error });
            }
        } else {
            console.log('Chatwoot Event:', { event });
        }

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
 * Log detallado para eventos de mensajes creados
 */
function logMessageCreatedEvent(webhookData) {
    const { id, content, message_type, created_at, isPrivate, source_id, content_type, content_attributes, sender, account, conversation, inbox, attachments } = webhookData;
    
    console.log('Chatwoot Message Created Event:', {
        id, content, message_type, created_at, private: isPrivate, source_id, 
        content_type, content_attributes,
        sender: {
            type: sender?.type, id: sender?.id, name: sender?.name, email: sender?.email
        },
        account: { id: account?.id, name: account?.name },
        conversation: {
            id: conversation?.id, status: conversation?.status, inbox_id: conversation?.inbox_id
        },
        inbox: {
            id: inbox?.id, name: inbox?.name, channel_type: inbox?.channel_type
        },
        attachments
    });
}

async function createAgentUser(sender) {
    let user;
    try{
        // console.log('🔍 Buscando usuario con email:', sender.email, 'y cw_contact_id:', sender.id.toString());
        user = await User.findOne({ where: { email: sender.email, cw_contact_id: sender.id.toString() } });
        // console.log('🔍 Resultado de búsqueda:', user ? 'encontrado' : 'no encontrado');
        
        if (!user) {
            console.log('➕ Creando nuevo usuario agente...');
            user = await User.create({
                firebase_uid: '0000#'+ sender.id.toString(),
                name: sender.name,
                email: sender.email,
                house_name: 'VIVLA',
                cw_source_id: 'dac670c8-7f59-4827-92c5-7f2efbf65cde',
                cw_contact_id: sender.id
            });
            // console.log('✅ Usuario creado exitosamente');
        }
        // console.log(' Retornando usuario desde try');
        return user;
    }catch(error){
        console.error('❌ Error al crear usuario agente:', error);
        console.log('🔄 Intentando buscar usuario con firebase_uid: 0000');
        user = await User.findOne({ where: { firebase_uid: '0000' } });
        console.log('🔍 Usuario 0000 encontrado:', user ? 'sí' : 'no');
        if (!user) {
            console.log('❌ No se encontró usuario 0000, retornando null');
            return null;
        }
        console.log('✅ Retornando usuario 0000 desde catch');
        return user;
    }
}

async function storeAndEmitTextMessage(group_id, sender_id, sender_name, direction, content) {
    // Crear un nuevo mensaje en la tabla de Messages
    const newMessage = await Message.create({
        group_id: group_id,
        sender_id: sender_id,
        sender_name: sender_name,
        message_type: 'text',
        direction: direction,
        content: content
    });

    // Emitir el mensaje por WebSocket a todos los usuarios del grupo
    emitToGroup(group_id, 'chat_message', {
        groupId: group_id,
        userId: sender_id,
        message: content,
        sender_name: sender_name,
        message_type: 'text',
        timestamp: newMessage.created_at
    });
}

async function storeAndEmitMediaMessage(group_id, sender_id, sender_name, direction, attachment, media_url, thumb_url, content = '') {
    
    const file_size = obtainFileSizeFromAttachment(attachment);
    const file_name = obtainFileNameFromAttachment(attachment);
    const file_type = obtainFileTypeFromAttachment(attachment);
    const message_type = attachment.file_type;

    const newMessage = await Message.create({
        group_id: group_id,
        sender_id: sender_id,
        sender_name: sender_name,
        message_type: message_type,
        direction: direction,
        content: content,
        media_url: media_url,
        thumb_url: thumb_url,
        file_size: file_size,
        file_name: file_name,
        file_type: file_type,
    });

    emitToGroup(group_id, 'chat_message', {
        groupId: group_id,
        userId: sender_id,
        message: content,
        sender_name: sender_name,
        media_url: media_url,
        thumb_url: thumb_url,
        message_type: message_type,
        file_size: file_size,
        file_name: file_name,
        file_type: file_type,
        timestamp: newMessage.created_at
    });
}

function obtainFileSizeFromAttachment(attachment) {
    try {
        const fileSize = attachment.file_size;
        return fileSize;
    } catch (error) {
        console.error('Error al obtener el tamaño del archivo:', error);
        console.log('Attachment:', attachment);
        return '';
    }
}

function obtainFileNameFromAttachment(attachment) {
    try {
        const fileName = attachment.data_url.split('/').pop();
        return fileName;
    } catch (error) {
        console.error('Error al obtener el nombre del archivo:', error);
        console.log('Attachment:', attachment);
        return '';
    }
}

function obtainFileTypeFromAttachment(attachment) {
    try { 
        const fileExtension = attachment.data_url.split('.').pop();
        if(fileExtension === 'pdf') {
            return 'application/pdf';
        }else if(fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png' || fileExtension === 'gif' || fileExtension === 'bmp' || fileExtension === 'tiff' || fileExtension === 'ico' || fileExtension === 'webp') {
            return 'image/jpeg';
        }else if(fileExtension === 'mp4' || fileExtension === 'mov' || fileExtension === 'avi' || fileExtension === 'wmv' || fileExtension === 'flv' || fileExtension === 'mkv') {
            return 'video/mp4';
        }else if(fileExtension === 'mp3' || fileExtension === 'wav' || fileExtension === 'ogg' || fileExtension === 'm4a' || fileExtension === 'aac') {
            return 'audio/mpeg';
        }else if(fileExtension === 'txt' || fileExtension === 'csv' || fileExtension === 'tsv' || fileExtension === 'json' || fileExtension === 'xml' || fileExtension === 'html' || fileExtension === 'css' || fileExtension === 'js') {
            return 'text/plain';
        }else{
            return 'application/octet-stream';
        }
    } catch (error) {
        console.error('Error al obtener el tipo de archivo:', error);
        console.log('Attachment:', attachment);
        return '';
    }
}

async function sendInternalNote(conversation_id, content) {
    if (!conversation_id || !content) {
        throw new Error('Faltan datos requeridos: conversation_id y content son necesarios');
    }

    return await sendInternalNoteMessage(conversation_id, content);
}
/**
 * Función auxiliar para enviar mensaje usando la API interna de Chatwoot
 * @param {string} conversation_id - ID de la conversación
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<Object>} Respuesta de Chatwoot
 */
async function sendMessageWithAdminAPI(conversation_id, content) {
    if (!conversation_id || !content) {
        throw new Error('Faltan datos requeridos: conversation_id y content son necesarios');
    }

    return await chatwootSendMessage(conversation_id, content);
}

/**
 * Función auxiliar para enviar mensaje usando la API pública de Chatwoot
 * @param {string} client_id - ID del cliente
 * @param {string} conversation_id - ID de la conversación
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<Object>} Respuesta de Chatwoot
 */
async function sendMessageWithClientAPI(client_id, conversation_id, content) {
    if (!client_id || !conversation_id || !content) {
        throw new Error('Faltan datos requeridos: client_id, conversation_id y content son necesarios');
    }

    return await sendClientMessage(client_id, conversation_id, content);
}

// Controlador principal para enviar mensajes
export const sendMessage = async (req, res) => {
    try {
        const { group_id, content, client_id, user_id } = req.body;

        // Buscar el grupo por su ID
        const group = await Group.findByPk(group_id);
        if (!group) {
            return res.status(404).json({
                status: 'error',
                message: 'Grupo no encontrado'
            });
        }
        const conversation_id = group.cw_conversation_id;

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
            response = await sendMessageWithClientAPI(client_id, conversation_id, messageContent);
        } else {
            // Si no viene client_id, usar la API interna
            response = await sendMessageWithAdminAPI(conversation_id, messageContent);
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

/**
 * Limpia y corrige el formato de data_url de Chatwoot
 * Convierte URLs mal formateadas como "http://https/..." a la URL base de Chatwoot
 * @param {string} dataUrl - La URL mal formateada
 * @returns {string} - La URL corregida
 */
function cleanChatwootDataUrl(dataUrl) {
    if (!dataUrl) return dataUrl;
    
    console.log(`🔧 Limpiando data_url mal formateado: ${dataUrl}`);
    
    // Si la URL comienza con "http://https/", la corregimos
    if (dataUrl.startsWith('http://https/')) {
        // Extraemos la parte después de "http://https/"
        const pathPart = dataUrl.replace('http://https/', '');
        
        // Obtenemos la base URL de Chatwoot del .env y removemos "api/v1" si está presente
        let baseUrl = process.env.CHATWOOT_BASE_URL || 'https://chatwoot-chatwoot.nx8jix.easypanel.host';
        
        // Removemos "api/v1" del final si está presente
        if (baseUrl.endsWith('/api/v1')) {
            baseUrl = baseUrl.replace('/api/v1', '');
        } else if (baseUrl.endsWith('api/v1')) {
            baseUrl = baseUrl.replace('api/v1', '');
        }
        
        // Aseguramos que la base URL termine con /
        if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
        }
        
        // Construimos la URL correcta
        const cleanUrl = `${baseUrl}${pathPart}`;
        
        console.log(`✅ URL corregida: ${cleanUrl}`);
        return cleanUrl;
    }
    
    // Si ya tiene el formato correcto, la devolvemos tal como está
    return dataUrl;
}
