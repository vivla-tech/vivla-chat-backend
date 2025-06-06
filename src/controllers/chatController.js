import { createContactIfNotExists, getContactConversation, createConversation } from '../services/chatwootService.js';
import { User, Group } from '../models/index.js';

/**
 * Obtiene o crea un chat para un usuario
 * @param {Object} req - Request object
 * @param {string} req.body.firebase_uid - ID de Firebase del usuario
 * @param {string} req.body.name - Nombre del usuario
 * @param {string} req.body.email - Email del usuario
 * @param {Object} res - Response object
 */
export const getChat = async (req, res) => {
    try {
        const { firebase_uid, name, email } = req.body;

        // Validar datos requeridos
        if (!firebase_uid || !name || !email) {
            return res.status(400).json({
                error: 'Faltan datos requeridos: firebase_uid, name y email son necesarios'
            });
        }

        // Crear o obtener el contacto en Chatwoot
        const { contact, sourceId } = await createContactIfNotExists(
            name,
            email,
            null,
            firebase_uid
        );

        // Buscar o crear el usuario en la base de datos
        let user = await User.findOne({ where: { firebase_uid } });
        
        if (!user) {
            // Si el usuario no existe, lo creamos
            user = await User.create({
                firebase_uid,
                name,
                email,
                house_name: name,
                cw_source_id: sourceId,
                cw_contact_id: contact.id
            });
        } else {
            // Si existe, actualizamos los IDs de Chatwoot
            await user.update({
                cw_source_id: sourceId,
                cw_contact_id: contact.id
            });
        }

        let conversation = await getContactConversation(contact.id);

        // Si no hay conversación, creamos una nueva
        if (!conversation) {
            const newConversation = await createConversation({
                source_id: sourceId,
                contact_id: contact.id
            });
            conversation = newConversation.payload;
        }

        // Buscar o crear el grupo para el usuario
        let group = await Group.findOne({ where: { owner_firebase_uid: firebase_uid } });
        
        if (!group) {
            // Si no existe el grupo, lo creamos
            group = await Group.create({
                name: `${name}'s Chat`,
                owner_firebase_uid: firebase_uid,
                cw_conversation_id: conversation.id
            });
        } else {
            // Si existe, actualizamos el cw_conversation_id
            await group.update({
                cw_conversation_id: conversation.id
            });
        }

        // Por ahora, devolvemos una estructura básica
        const chat = {
            id: contact.id,
            conversation_id: conversation.id,
            messages: conversation.messages,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                cw_source_id: user.cw_source_id,
                cw_contact_id: user.cw_contact_id
            },
            group: {
                id: group.group_id,
                name: group.name,
                cw_conversation_id: group.cw_conversation_id
            }
        };

        return res.json(chat);
    } catch (error) {
        console.error('Error al obtener chat:', error);
        return res.status(500).json({ error: 'Error al obtener el chat' });
    }
}; 