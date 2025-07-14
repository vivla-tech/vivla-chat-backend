import { Group, User, InvitedGuest, GroupMember } from '../models/index.js';
import { Op } from 'sequelize';
import { getConversationAssignee, getConversationAssigneeFullProfile } from '../services/chatwootService.js';

export const createGroup = async (req, res) => {
    try {
        const { name, owner_firebase_uid } = req.body;

        // Validar datos requeridos
        if (!name || !owner_firebase_uid) {
            return res.status(400).json({ error: 'Nombre del grupo y ID del propietario son requeridos' });
        }

        // Verificar que el usuario existe
        const user = await User.findOne({ where: { firebase_uid: owner_firebase_uid } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Crear el grupo
        const group = await Group.create({
            name,
            owner_firebase_uid
        });

        // Añadir al owner como miembro del grupo
        await GroupMember.create({
            group_id: group.group_id,
            firebase_uid: owner_firebase_uid,
            role: 'owner'
        });

        return res.status(201).json(group);
    } catch (error) {
        console.error('Error al crear grupo:', error);
        return res.status(500).json({ error: 'Error al crear el grupo' });
    }
};

export const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const firebase_uid = req.user?.uid;

        if (!firebase_uid) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        // Verificar que el usuario existe
        const user = await User.findOne({ where: { firebase_uid } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener el grupo con toda su información
        const group = await Group.findOne({
            where: { group_id: groupId },
            include: [
                {
                    model: GroupMember,
                    as: 'members',
                    include: [
                        {
                            model: User,
                            as: 'member',
                            attributes: ['id', 'name', 'email', 'house_name']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'name', 'email', 'house_name']
                }
            ]
        });

        if (!group) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }

        // Verificar que el usuario tiene acceso al grupo (es owner o miembro)
        const hasAccess = group.user_id === user.id ||
            group.members.some(m => m.user_id === user.id);

        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes acceso a este grupo' });
        }

        // Mapear los miembros con sus roles
        const members = group.members.map(member => ({
            id: member.member.id,
            name: member.member.name,
            email: member.member.email,
            role: member.role // 'owner' o 'member'
        }));

        // Crear una respuesta que incluya toda la información del grupo
        const response = {
            ...group.toJSON(),
            members
        };

        return res.json(response);
    } catch (error) {
        console.error('Error al obtener grupo:', error);
        return res.status(500).json({ error: 'Error al obtener el grupo' });
    }
};

export const getUserGroups = async (req, res) => {
    try {
        const { firebase_uid } = req.params;

        // Verificar que el usuario existe
        const user = await User.findOne({ where: { firebase_uid } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Obtener grupos donde el usuario es owner o miembro
        const groups = await Group.findAll({
            include: [
                {
                    model: GroupMember,
                    as: 'members',
                    where: { firebase_uid },
                    required: false, // Para que también incluya los grupos donde es owner
                    include: [
                        {
                            model: User,
                            as: 'member',
                            attributes: ['firebase_uid', 'name', 'email', 'house_name']
                        }
                    ]
                },
                {
                    model: User,
                    as: 'owner',
                    attributes: ['name', 'email', 'house_name']
                },
                {
                    model: InvitedGuest,
                    as: 'guests',
                    attributes: ['guest_id', 'name', 'email', 'last_seen_at']
                }
            ],
            where: {
                [Op.or]: [
                    { owner_firebase_uid: firebase_uid },
                    // Esto permite que también se incluyan los grupos donde es miembro
                    { '$members.firebase_uid$': firebase_uid }
                ]
            },
            distinct: true
        });

        return res.json(groups);
    } catch (error) {
        console.error('Error al obtener grupos del usuario:', error);
        return res.status(500).json({ error: 'Error al obtener los grupos' });
    }
};

export const addUserToGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { firebase_uid } = req.body;

        // Verifica que el grupo existe
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }

        // Verifica que el usuario existe
        const user = await User.findOne({ where: { firebase_uid } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verifica si ya es miembro
        const existing = await GroupMember.findOne({ where: { group_id: groupId, firebase_uid } });
        if (existing) {
            return res.status(200).json({ success: true, message: 'El usuario ya es miembro del grupo' });
        }

        // Añade el usuario como miembro
        await GroupMember.create({ group_id: groupId, firebase_uid, role: 'member' });

        return res.json({ success: true, message: 'Usuario añadido al grupo' });
    } catch (error) {
        console.error('Error al añadir usuario al grupo:', error);
        return res.status(500).json({ error: 'Error al añadir usuario al grupo' });
    }
};

/**
 * Obtiene información del agente asignado a un grupo
 */
export const getGroupAgent = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { fullProfile = true } = req.query;

        if (!groupId) {
            return res.status(400).json({
                status: 'error',
                message: 'groupId es requerido'
            });
        }

        // Paso 1: Buscar el grupo en la base de datos
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({
                status: 'error',
                message: 'Grupo no encontrado'
            });
        }

        // Paso 2: Verificar que el grupo tiene conversationId
        if (!group.cw_conversation_id) {
            return res.status(404).json({
                status: 'error',
                message: 'El grupo no tiene una conversación asociada en Chatwoot'
            });
        }

        // Paso 3: Obtener información del agente usando el conversationId
        let agentInfo;
        
        if (fullProfile === true) {
            // Obtener perfil completo del agente
            agentInfo = await getConversationAssigneeFullProfile(group.cw_conversation_id);
        } else {
            // Obtener solo información básica del agente
            agentInfo = await getConversationAssignee(group.cw_conversation_id);
        }

        if (!agentInfo) {
            return res.status(404).json({
                status: 'error',
                message: 'No hay agente asignado a esta conversación',
                data: null
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Información del agente obtenida correctamente',
            data: {
                agent: agentInfo,
                group: {
                    id: group.group_id,
                    name: group.name,
                    conversation_id: group.cw_conversation_id
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo información del agente:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener información del agente',
            error: error.message
        });
    }
}; 