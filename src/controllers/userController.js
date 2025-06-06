import { User, Group } from '../db/models/index.js';

export const createUser = async (req, res) => {
    try {
        const { firebase_uid, name, email } = req.body;

        // Validar datos requeridos
        if (!firebase_uid || !name || !email) {
            return res.status(400).json({
                error: 'firebase_uid, name y email son requeridos'
            });
        }

        // Verificar si el usuario ya existe
        let user = await User.findOne({ where: { firebase_uid } });
        if (user) {
            return res.status(409).json({
                error: 'El usuario ya existe',
                user: {
                    id: user.id,
                    firebase_uid: user.firebase_uid,
                    name: user.name,
                    email: user.email,
                    group_id: user.group_id
                }
            });
        }

        // Primero crear el usuario
        user = await User.create({
            firebase_uid,
            name,
            email: email.toLowerCase()
        });

        // Crear un grupo para el usuario usando su id
        const group = await Group.create({
            name: `Chat de ${name}`,
            owner_id: user.id
        });

        // Actualizar el usuario con el group_id del grupo creado
        await user.update({ group_id: group.group_id });

        // Cargar el usuario actualizado con su grupo
        user = await User.findOne({
            where: { id: user.id },
            include: [{
                model: Group,
                as: 'group',
                include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['name', 'email']
                }]
            }]
        });

        return res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: {
                id: user.id,
                firebase_uid: user.firebase_uid,
                name: user.name,
                email: user.email,
                group_id: user.group_id,
                group: user.group
            }
        });
    } catch (error) {
        console.error('Error en login/creación de usuario:', error);
        return res.status(500).json({
            error: 'Error al crear el usuario',
            details: error.message
        });
    }
};

export const getUserByFirebaseUid = async (req, res) => {
    try {
        const { firebase_uid } = req.params;

        const user = await User.findOne({
            where: { firebase_uid },
            include: [{
                model: Group,
                as: 'group',
                include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['name', 'email']
                }]
            }]
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        return res.json({
            id: user.id,
            firebase_uid: user.firebase_uid,
            name: user.name,
            email: user.email,
            group_id: user.group_id,
            group: user.group
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        return res.status(500).json({
            error: 'Error al obtener el usuario',
            details: error.message
        });
    }
}; 