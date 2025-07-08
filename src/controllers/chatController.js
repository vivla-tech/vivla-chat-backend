import { createContactIfNotExists, getContactConversation, createConversation, getClientSingleConversation, createConversationFromClient } from '../services/chatwootService.js';
import { User, Group, InvitedGuest, GroupMember, DiffusionGroup, DiffusionGroupMember } from '../models/index.js';
import { getUserDeals } from '../services/dealService.js';

/**
 * Crea o actualiza un usuario con los datos proporcionados
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.firebase_uid - ID de Firebase
 * @param {string} userData.name - Nombre del usuario
 * @param {string} userData.email - Email del usuario
 * @param {string} sourceId - ID de fuente de Chatwoot
 * @param {string} contactId - ID de contacto de Chatwoot
 * @returns {Promise<User>} Usuario creado o actualizado
 */
const createOrUpdateUser = async (userData, sourceId, contactId) => {
    const { firebase_uid, name, email } = userData;
    let user = await User.findOne({ where: { firebase_uid } });

    if (!user) {
        user = await User.create({
            firebase_uid,
            name,
            email,
            house_name: name,
            cw_source_id: sourceId,
            cw_contact_id: contactId
        });
    } else {
        await user.update({
            cw_source_id: sourceId,
            cw_contact_id: contactId
        });
    }

    return user;
};

/**
 * Obtiene o crea una conversación para un usuario
 * @param {User} user - Usuario para el que obtener/crear la conversación
 * @returns {Promise<Object>} Conversación obtenida o creada
 */
const getOrCreateConversation = async (user) => {
    let conversation = await getContactConversation(user.cw_contact_id);

    if (!conversation) {
        const newConversation = await createConversation({
            source_id: user.cw_source_id,
            contact_id: user.cw_contact_id
        });
        conversation = newConversation;
    }

    return conversation;
};


/**
 * Obtiene o crea una conversación para un usuario usando el API Client
 * @param {User} user - Usuario para el que obtener/crear la conversación
 * @returns {Promise<Object>} Conversación obtenida o creada
 */
const getOrCreateClientConversation = async (user) => {

    let user_group = await Group.findOne({ where: { owner_firebase_uid: user.firebase_uid } });

    if (!user_group || !user_group.cw_conversation_id) {
        return await createConversationFromClient(user.cw_source_id);
    }

    let clientConversation = await getClientSingleConversation(user.cw_source_id, user_group.cw_conversation_id);
    if (!clientConversation) {
        return await createConversationFromClient(user.cw_source_id);
    }
    return clientConversation;

};

/**
 * Obtiene o crea un grupo para un usuario
 * @param {User} ownerUser - Usuario propietario del grupo
 * @param {string} conversationId - ID de la conversación de Chatwoot
 * @returns {Promise<Group>} Grupo obtenido o creado
 */
const getOrCreateGroup = async (ownerUser, conversationId) => {
    let group = await Group.findOne({ where: { user_id: ownerUser.id } });

    if (!group) {
        group = await Group.create({
            name: `${ownerUser.name}'s Chat`,
            cw_conversation_id: conversationId,
            user_id: ownerUser.id
        });

        // Crear el miembro del grupo
        await GroupMember.create({
            group_id: group.group_id,
            user_id: ownerUser.id,
            role: 'owner'
        });
    } else {
        await group.update({
            cw_conversation_id: conversationId
        });
    }

    return group;
};

/**
 * Añade un usuario como miembro de un grupo
 * @param {Group} group - Grupo al que añadir el miembro
 * @param {string} user_id - ID del usuario
 * @param {boolean} isInvited - Indica si el usuario es invitado
 * @returns {Promise<GroupMember>} Miembro del grupo creado
 */
const addUserToGroup = async (group, user_id, isInvited) => {
    let groupMember = await GroupMember.findOne({
        where: {
            group_id: group.group_id,
            user_id: user_id
        }
    });

    if (!groupMember) {
        groupMember = await GroupMember.create({
            group_id: group.group_id,
            user_id: user_id,
            role: isInvited ? 'member' : 'owner'
        });
    }

    return groupMember;
};

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
                error: 'Faltan datos requeridos: firebase_uid, name y email son necesarios.'
            });
        }

        // Crear o obtener el contacto en Chatwoot
        const { contact, sourceId } = await createContactIfNotExists(
            name,
            email,
            null,
            firebase_uid
        );

        // Verificar si el usuario es un invitado
        const invitedGuest = await InvitedGuest.findOne({ where: { email } });
        let ownerUser;
        let user_id;

        if (invitedGuest) {
            // Si es un invitado, buscar el grupo asociado
            const group = await Group.findByPk(invitedGuest.associated_group_id);
            if (!group) {
                return res.status(404).json({ error: 'Grupo no encontrado para el invitado' });
            }

            // Buscar el owner del grupo
            ownerUser = await User.findOne({ where: { id: group.user_id } });
            if (!ownerUser) {
                return res.status(404).json({ error: 'owner_not_found' });
            }

            // Crear o actualizar el usuario invitado
            const invitedUser = await createOrUpdateUser({ firebase_uid, name, email }, sourceId, contact.id);
            user_id = invitedUser.id;
        } else {
            // Si no es invitado, usar el usuario actual como owner
            ownerUser = await createOrUpdateUser({ firebase_uid, name, email }, sourceId, contact.id);
            user_id = ownerUser.id;
        }

        // Obtener o crear conversación
        const conversation = await getOrCreateConversation(ownerUser);

        // Obtener o crear grupo
        const group = await getOrCreateGroup(ownerUser, conversation.id);

        // Añadir usuario al grupo
        await addUserToGroup(group, user_id, !!invitedGuest);

        //Obtener la lista de deals del usuario
        let diffusion_groups = await getUserDiffusionGroups(ownerUser.email, user_id);

        // Devolver estructura del chat
        const chat = {
            user_id: user_id,
            cw_contact_id: contact.id,
            // cw_conversation_id: conversation.id,
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
            },  
            diffusion_groups: diffusion_groups
        };

        return res.json(chat);
    } catch (error) {
        console.error('Error al obtener chat:', error);
        return res.status(500).json({ error: 'Error al obtener el chat' + error.message });
    }
}; 

/**
 * Obtiene las listas de difusión del usuario y añade al usuario como miembro
 * @param {string} ownerEmail - Email del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de grupos de difusión encontrados
 */
async function getUserDiffusionGroups(ownerEmail, userId) {
    let diffusion_groups = [];
    
    try {
        // Obtener los deals del usuario
        const deals = await getUserDeals(ownerEmail);
        
        if (!deals.success || !deals.deals || deals.deals.length === 0) {
            console.log(`No se encontraron deals para el usuario: ${ownerEmail}`);
            return diffusion_groups;
        }

        // Procesar cada deal
        for (const deal of deals.deals) {
            try {
                // 1. Comprobar si existe un diffusion_group con el hid del deal
                const diffusionGroup = await DiffusionGroup.findOne({
                    where: { external_hid: deal.hid }
                });

                // 2. Si no existe, continuar al siguiente deal
                if (!diffusionGroup) {
                    console.log(`No se encontró diffusion_group para el hid: ${deal.hid}`);
                    continue;
                }

                // 3. Si existe, añadir al usuario como miembro si no lo es ya
                const existingMember = await DiffusionGroupMember.findOne({
                    where: {
                        diffusion_group_id: diffusionGroup.id,
                        user_id: userId
                    }
                });

                if (!existingMember) {
                    await DiffusionGroupMember.create({
                        diffusion_group_id: diffusionGroup.id,
                        user_id: userId
                    });
                    console.log(`Usuario ${userId} añadido como miembro del diffusion_group ${diffusionGroup.id}`);
                } else {
                    console.log(`Usuario ${userId} ya es miembro del diffusion_group ${diffusionGroup.id}`);
                }

                // 4. Añadir el grupo de difusión al array de resultados
                diffusion_groups.push({
                    id: diffusionGroup.id,
                    name: diffusionGroup.name,
                    external_hid: diffusionGroup.external_hid
                });

            } catch (dealError) {
                console.error(`Error procesando deal ${deal.id}:`, dealError);
                // Continuar con el siguiente deal en caso de error
                continue;
            }
        }

    } catch (error) {
        console.error('Error al obtener los deals:', error);
    }

    return diffusion_groups;
}