import { InvitedGuest, Group, User, GroupMember } from '../models/index.js';
import { auth } from '../config/firebase.js';
import crypto from 'crypto';

// URL base para desarrollo local
const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        return 'https://notifications-devs-74gq5b.web.app';
    }
    // En desarrollo, usar la IP local para que funcione en dispositivos móviles
    return 'exp://192.168.1.43:8081';
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

        // Calcular fecha de expiración (24 horas desde ahora)
        const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Guardar en la base de datos
        const guest = await InvitedGuest.create({
            email: email.toLowerCase(), // Normalizar email a minúsculas
            name,
            associated_group_id: group_id,
            magic_token: token,
            status: 'pending',
            expires_at
        });

        // Generar el link de invitación usando la URL base configurada
        const baseUrl = getBaseUrl();
        const inviteLink = `${baseUrl}/--/join/${token}?email=${encodeURIComponent(email)}`;

        console.log('Link de invitación generado:', inviteLink);

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
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                error: 'El email es requerido para validar la invitación'
            });
        }

        const guest = await InvitedGuest.findOne({
            where: {
                magic_token,
                email: email.toLowerCase() // Normalizar email a minúsculas
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
                error: 'Invitación no encontrada o email no coincide'
            });
        }

        // Verificar si la invitación ha expirado
        if (guest.expires_at && new Date(guest.expires_at) < new Date()) {
            return res.status(410).json({
                error: 'La invitación ha expirado'
            });
        }

        // Verificar si la invitación ya fue utilizada
        if (guest.status === 'accepted') {
            return res.status(409).json({
                error: 'Esta invitación ya fue utilizada'
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

export const acceptInvitation = async (req, res) => {
    try {
        const { token, email, password } = req.body;

        // Validar datos requeridos
        if (!token || !email) {
            return res.status(400).json({
                error: 'Token y email son requeridos'
            });
        }

        // Buscar y validar la invitación
        const guest = await InvitedGuest.findOne({
            where: {
                magic_token: token,
                email: email.toLowerCase(),
                status: 'pending'
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
                error: 'Invitación no encontrada o ya utilizada'
            });
        }

        // Verificar si la invitación ha expirado
        if (guest.expires_at && new Date(guest.expires_at) < new Date()) {
            return res.status(410).json({
                error: 'La invitación ha expirado'
            });
        }

        // Si no se proporciona contraseña, solo devolver la información de la invitación
        if (!password) {
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
        }

        // Si se proporciona contraseña, proceder con la creación de cuenta
        // Crear usuario en Firebase
        let firebaseUser;
        try {
            firebaseUser = await auth.createUser({
                email: email.toLowerCase(),
                password: password,
                displayName: guest.name
            });
        } catch (firebaseError) {
            console.error('Error al crear usuario en Firebase:', firebaseError);
            if (firebaseError.code === 'auth/email-already-exists') {
                return res.status(409).json({
                    error: 'Este email ya está registrado'
                });
            }
            throw firebaseError;
        }

        // Crear usuario en PostgreSQL
        const postgresUser = await User.create({
            firebase_uid: firebaseUser.uid,
            email: email.toLowerCase(),
            name: guest.name,
            house_name: guest.name
        });

        // Actualizar estado de la invitación
        guest.status = 'accepted';
        guest.last_seen_at = new Date();
        await guest.save();

        // Añadir usuario al grupo
        await GroupMember.create({
            group_id: guest.associated_group_id,
            firebase_uid: firebaseUser.uid,
            role: 'member'
        });

        // Generar token de sesión
        const customToken = await auth.createCustomToken(firebaseUser.uid);

        return res.json({
            user: {
                id: postgresUser.id,
                firebase_uid: postgresUser.firebase_uid,
                name: postgresUser.name,
                email: postgresUser.email,
                house_name: postgresUser.house_name
            },
            group: {
                group_id: guest.group.group_id,
                name: guest.group.name,
                owner: guest.group.owner
            },
            token: customToken
        });

    } catch (error) {
        console.error('Error al procesar invitación:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });

        // Si hubo error después de crear el usuario en Firebase, intentar limpiar
        if (error.firebaseUser) {
            try {
                await auth.deleteUser(error.firebaseUser.uid);
            } catch (deleteError) {
                console.error('Error al limpiar usuario de Firebase:', deleteError);
            }
        }

        return res.status(500).json({
            error: 'Error al procesar la invitación',
            details: error.message
        });
    }
}; 