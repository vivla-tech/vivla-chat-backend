import { Group, User, InvitedGuest } from '../models/index.js';

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

        // Obtener grupos donde el usuario es propietario
        const ownedGroups = await Group.findAll({
            where: { owner_firebase_uid: firebase_uid },
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
                }
            ]
        });

        return res.json(ownedGroups);
    } catch (error) {
        console.error('Error al obtener grupos del usuario:', error);
        return res.status(500).json({ error: 'Error al obtener los grupos' });
    }
}; 