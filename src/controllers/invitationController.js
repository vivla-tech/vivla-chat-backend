import { InvitedGuest, Group, User, GroupMember } from '../models/index.js';
import { auth } from '../config/firebase.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: '.env.local' });

// URL base para desarrollo local
const getBaseUrl = () => {
    return process.env.FRONTEND_URL || 'exp://192.168.1.43:8081';
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

        // Usar la URL del frontend desde las variables de entorno
        const frontendUrl = getBaseUrl();
        const inviteLink = `${frontendUrl}join/${token}?email=${email}`;

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
        const { token, email } = req.query;

        if (!token || !email) {
            return res.status(400).json({
                error: 'Token y email son requeridos',
                received: { token, email }
            });
        }

        const guest = await InvitedGuest.findOne({
            where: {
                magic_token: token,
                email: email
            },
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
            return res.status(404).json({
                error: 'Invitación no válida o expirada',
                details: 'No se encontró una invitación con el token y email proporcionados'
            });
        }

        // Verificar si la invitación ha expirado
        if (guest.expires_at && new Date(guest.expires_at) < new Date()) {
            return res.status(410).json({
                error: 'Invitación expirada',
                details: 'La invitación ha expirado'
            });
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
        return res.status(500).json({
            error: 'Error al validar la invitación',
            details: error.message
        });
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

export const processInvitation = async (req, res) => {
    try {
        const { token, email } = req.body;
        const authHeader = req.headers.authorization;

        if (!token || !email) {
            return res.status(400).json({
                error: 'Token y email son requeridos',
                received: { token, email }
            });
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Token de autorización requerido',
                details: 'Se requiere un token de Firebase válido'
            });
        }

        // Verificar el token de Firebase y obtener el usuario
        const firebaseToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(firebaseToken);
        const firebaseUid = decodedToken.uid;

        // Buscar el usuario en la base de datos
        const user = await User.findOne({
            where: { firebase_uid: firebaseUid }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                details: 'No se encontró un usuario asociado al token de Firebase'
            });
        }

        // Buscar la invitación
        const guest = await InvitedGuest.findOne({
            where: {
                magic_token: token,
                email: email,
                status: 'pending'
            },
            include: [{
                model: Group,
                as: 'group'
            }]
        });

        if (!guest) {
            return res.status(404).json({
                error: 'Invitación no válida o ya procesada',
                details: 'No se encontró una invitación pendiente con el token y email proporcionados'
            });
        }

        // Verificar si la invitación ha expirado
        if (guest.expires_at && new Date(guest.expires_at) < new Date()) {
            return res.status(410).json({
                error: 'Invitación expirada',
                details: 'La invitación ha expirado'
            });
        }

        // Actualizar el estado de la invitación
        guest.status = 'accepted';
        guest.accepted_at = new Date();
        guest.accepted_by_user_id = user.id;
        await guest.save();

        // Añadir el usuario al grupo usando GroupMember
        const group = await Group.findByPk(guest.group.group_id);
        const existing = await GroupMember.findOne({ 
            where: { 
                group_id: group.group_id, 
                user_id: user.id  // ← Cambiar firebase_uid por user.id
            } 
        });
        if (!existing) {
            await GroupMember.create({
                group_id: group.group_id,
                user_id: user.id
            });
        }

        return res.json({
            success: true,
            message: 'Invitación procesada exitosamente',
            group: {
                group_id: group.group_id,
                name: group.name
            }
        });
    } catch (error) {
        console.error('Error al procesar invitación:', error);
        return res.status(500).json({
            error: 'Error al procesar la invitación',
            details: error.message
        });
    }
}; 
