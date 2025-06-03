import { Group, User, InvitedGuest, GroupMember } from '../models/index.js';
import { Op } from 'sequelize';

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
        const group = await Group.findByPk(groupId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['name', 'email', 'house_name']
                },
                {
                    model: InvitedGuest,
                    as: 'guests',
                    attributes: ['guest_id', 'name', 'email', 'last_seen_at']
                },
                {
                    model: GroupMember,
                    as: 'members',
                    include: [
                        {
                            model: User,
                            as: 'member',
                            attributes: ['firebase_uid', 'name', 'email', 'house_name']
                        }
                    ]
                }
            ]
        });

        if (!group) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }

        return res.json(group);
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