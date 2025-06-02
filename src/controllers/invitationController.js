import { InvitedGuest, Group, User } from '../models/index.js';
import { auth } from '../config/firebase.js';
import crypto from 'crypto';

// URL base para desarrollo local
const getBaseUrl = () => {
    // Siempre usar el dominio de Firebase Hosting que ya está autorizado
    return 'https://notifications-devs-74gq5b.web.app';
};

// Función auxiliar para generar token mágico
const generateMagicToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

export const createInvitation = async (req, res) => {
    try {
        const { group_id, email, name } = req.body;

        // Generar token único
        const token = crypto.randomBytes(32).toString('hex');

        // Guardar en la base de datos
        const guest = await InvitedGuest.create({
            email,
            name,
            associated_group_id: group_id,
            magic_token: token,
            status: 'pending',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        // Usando tu IP local
        const inviteLink = `exp://192.168.1.40:8081/--/join/${token}?email=${email}`;

        return res.status(201).json({
            success: true,
            inviteLink,
            guest: guest.toJSON()
        });
    } catch (error) {
        console.error('Error completo al crear invitación:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return res.status(500).json({
            error: 'Error al crear la invitación',
            details: error.message,
            code: error.code
        });
    }
};

export const validateInvitation = async (req, res) => {
    try {
        const { magic_token } = req.params;

        const guest = await InvitedGuest.findOne({
            where: { magic_token },
            include: [{
                model: Group,
                as: 'group',
                include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['name', 'email', 'house_name']
                }]
            }]
        });

        if (!guest) {
            return res.status(404).json({ error: 'Invitación no válida o expirada' });
        }

        // Actualizar last_seen_at
        guest.last_seen_at = new Date();
        await guest.save();

        return res.json({
            guest: {
                guest_id: guest.guest_id,
                name: guest.name,
                email: guest.email
            },
            group: {
                group_id: guest.group.group_id,
                name: guest.group.name,
                owner: guest.group.owner
            }
        });
    } catch (error) {
        console.error('Error al validar invitación:', error);
        return res.status(500).json({ error: 'Error al validar la invitación' });
    }
};

export const getGroupInvitations = async (req, res) => {
    try {
        const { groupId } = req.params;

        // Verificar que el grupo existe
        const group = await Group.findByPk(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Grupo no encontrado' });
        }

        const guests = await InvitedGuest.findAll({
            where: { associated_group_id: groupId },
            order: [['created_at', 'DESC']]
        });

        return res.json(guests);
    } catch (error) {
        console.error('Error al obtener invitaciones:', error);
        return res.status(500).json({ error: 'Error al obtener las invitaciones' });
    }
}; 