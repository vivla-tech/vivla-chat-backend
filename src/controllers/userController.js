import { User } from '../models/index.js';

export const createUser = async (req, res) => {
    try {
        const { firebase_uid, name, email, house_name } = req.body;

        // Verificar que tenemos todos los datos necesarios
        if (!firebase_uid || !name || !email || !house_name) {
            return res.status(400).json({
                error: 'Faltan datos requeridos: firebase_uid, name, email, house_name'
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            where: { firebase_uid }
        });

        if (existingUser) {
            return res.status(409).json({
                error: 'El usuario ya existe'
            });
        }

        // Crear el nuevo usuario
        const user = await User.create({
            firebase_uid,
            name,
            email,
            house_name
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({
            error: 'Error al crear el usuario'
        });
    }
};

export const getUserByFirebaseUid = async (req, res) => {
    try {
        const { firebase_uid } = req.params;

        const user = await User.findOne({
            where: { firebase_uid }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        res.json(user);
    } catch (error) {
        console.error('Error al buscar usuario:', error);
        res.status(500).json({
            error: 'Error al buscar el usuario'
        });
    }
}; 