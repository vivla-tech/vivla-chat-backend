import { createContactIfNotExists, getContactConversation, createConversation } from '../services/chatwootService.js';
import { User, Group, InvitedGuest, GroupMember } from '../models/index.js';

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

         // Crear o obtener el contacto en Chatwoot usando los datos del owner
         const { contact, sourceId } = await createContactIfNotExists(
            name,
            email,
            null,
            firebase_uid
        );

        // Verificar si el usuario es un invitado
        const invitedGuest = await InvitedGuest.findOne({ where: { email } });
        let ownerUser;

        if (invitedGuest) {
            // Si es un invitado, buscar el grupo asociado
            const group = await Group.findByPk(invitedGuest.associated_group_id);
            if (!group) {
                return res.status(404).json({ error: 'Grupo no encontrado para el invitado' });
            }

            // Buscar el owner del grupo
            ownerUser = await User.findOne({ where: { firebase_uid: group.owner_firebase_uid } });
            if (!ownerUser) {
                return res.status(404).json({ error: 'owner_not_found' });
            }

            let invitedUser = await User.findOne({ where: { firebase_uid } });
            if (!invitedUser) {
                invitedUser = await User.create({
                    firebase_uid,
                    name,
                    email,
                    house_name: ownerUser.house_name,
                    cw_source_id: sourceId,
                    cw_contact_id: contact.id
                });
            } else {
                // Si existe, actualizamos los IDs de Chatwoot
                await invitedUser.update({
                    cw_source_id: sourceId,
                    cw_contact_id: contact.id
                });
            }
        } else {
            // Si no es invitado, usar el usuario actual
            ownerUser = await User.findOne({ where: { firebase_uid } });
            if (!ownerUser) {
                ownerUser = await User.create({
                    firebase_uid,
                    name,
                    email,
                    house_name: name,
                    cw_source_id: sourceId,
                    cw_contact_id: contact.id
                });
            } else {
                // Si existe, actualizamos los IDs de Chatwoot
                await ownerUser.update({
                    cw_source_id: sourceId,
                    cw_contact_id: contact.id
                });
            }
        }


        let conversation = await getContactConversation(ownerUser.cw_contact_id);

        // Si no hay conversación, creamos una nueva
        if (!conversation) {
            const newConversation = await createConversation({
                source_id: ownerUser.cw_source_id,
                contact_id: ownerUser.cw_contact_id
            });
            conversation = newConversation.payload;
        }

        // Buscar o crear el grupo para el usuario
        let group = await Group.findOne({ where: { owner_firebase_uid: ownerUser.firebase_uid } });
        
        if (!group) {
            // Si no existe el grupo, lo creamos
            group = await Group.create({
                name: `${ownerUser.name}'s Chat`,
                owner_firebase_uid: ownerUser.firebase_uid,
                cw_conversation_id: conversation.id
            });
        } else {
            // Si existe, actualizamos el cw_conversation_id
            await group.update({
                cw_conversation_id: conversation.id
            });
        }

        // Verificar si el usuario es miembro del grupo
        let groupMember = await GroupMember.findOne({
            where: {
                group_id: group.group_id,
                firebase_uid: firebase_uid
            }
        });

        // Si no es miembro, lo añadimos
        if (!groupMember) {
            await GroupMember.create({
                group_id: group.group_id,
                firebase_uid: firebase_uid,
                role: (invitedGuest) ? 'member' : 'owner'
            });
        }

        // Por ahora, devolvemos una estructura básica
        const chat = {
            id: contact.id,
            conversation_id: conversation.id,
            messages: conversation.messages,
            owner: {
                id: ownerUser.id,
                name: ownerUser.name,
                email: ownerUser.email,
                cw_source_id: ownerUser.cw_source_id,
                cw_contact_id: ownerUser.cw_contact_id
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