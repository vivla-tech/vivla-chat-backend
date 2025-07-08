import { DiffusionGroup, DiffusionGroupMember, DiffusionMessage, User } from '../models/index.js';

/**
 * Crear un nuevo grupo de difusión
 * @param {string} name - Nombre del grupo de difusión
 * @returns {Promise<Object>} - El grupo de difusión creado
 */
export const createDiffusionGroup = async (name) => {
    try {
        if (!name || name.trim() === '') {
            throw new Error('El nombre del grupo es requerido');
        }

        const diffusionGroup = await DiffusionGroup.create({
            name: name.trim()
        });

        return diffusionGroup;
    } catch (error) {
        console.error('Error al crear grupo de difusión:', error);
        throw error;
    }
};

/**
 * Añadir un usuario como miembro de un grupo de difusión
 * @param {number} diffusionGroupId - ID del grupo de difusión
 * @param {string} userId - ID del usuario (UUID)
 * @returns {Promise<Object>} - El miembro añadido
 */
export const addMemberToDiffusionGroup = async (diffusionGroupId, userId) => {
    try {
        // Verificar que el grupo de difusión existe
        const diffusionGroup = await DiffusionGroup.findByPk(diffusionGroupId);
        if (!diffusionGroup) {
            throw new Error('Grupo de difusión no encontrado');
        }

        // Verificar que el usuario existe
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Verificar si el usuario ya es miembro del grupo
        const existingMember = await DiffusionGroupMember.findOne({
            where: {
                diffusion_group_id: diffusionGroupId,
                user_id: userId
            }
        });

        if (existingMember) {
            throw new Error('El usuario ya es miembro de este grupo de difusión');
        }

        // Añadir el usuario como miembro
        const member = await DiffusionGroupMember.create({
            diffusion_group_id: diffusionGroupId,
            user_id: userId
        });

        return member;
    } catch (error) {
        console.error('Error al añadir miembro al grupo de difusión:', error);
        throw error;
    }
};

/**
 * Crear un mensaje de texto en un grupo de difusión
 * @param {number} diffusionGroupId - ID del grupo de difusión
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<Object>} - El mensaje creado
 */
export const createDiffusionMessage = async (diffusionGroupId, content) => {
    try {
        if (!content || content.trim() === '') {
            throw new Error('El contenido del mensaje es requerido');
        }

        // Verificar que el grupo de difusión existe
        const diffusionGroup = await DiffusionGroup.findByPk(diffusionGroupId);
        if (!diffusionGroup) {
            throw new Error('Grupo de difusión no encontrado');
        }

        // Crear el mensaje
        const message = await DiffusionMessage.create({
            diffusion_group_id: diffusionGroupId,
            content: content.trim(),
            message_type: 'text'
        });

        return message;
    } catch (error) {
        console.error('Error al crear mensaje de difusión:', error);
        throw error;
    }
};

/**
 * Obtener todos los grupos de difusión
 * @returns {Promise<Array>} - Lista de grupos de difusión
 */
export const getAllDiffusionGroups = async () => {
    try {
        const groups = await DiffusionGroup.findAll({
            include: [
                {
                    model: DiffusionGroupMember,
                    as: 'members',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return groups;
    } catch (error) {
        console.error('Error al obtener grupos de difusión:', error);
        throw error;
    }
};

/**
 * Obtener un grupo de difusión por ID
 * @param {number} diffusionGroupId - ID del grupo de difusión
 * @returns {Promise<Object>} - El grupo de difusión con sus miembros
 */
export const getDiffusionGroupById = async (diffusionGroupId) => {
    try {
        const group = await DiffusionGroup.findByPk(diffusionGroupId, {
            include: [
                {
                    model: DiffusionGroupMember,
                    as: 'members',
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name', 'email']
                        }
                    ]
                },
                {
                    model: DiffusionMessage,
                    as: 'messages',
                    order: [['created_at', 'DESC']],
                    limit: 50 // Limitar a los últimos 50 mensajes
                }
            ]
        });

        if (!group) {
            throw new Error('Grupo de difusión no encontrado');
        }

        return group;
    } catch (error) {
        console.error('Error al obtener grupo de difusión:', error);
        throw error;
    }
};

/**
 * Obtener mensajes de un grupo de difusión
 * @param {number} diffusionGroupId - ID del grupo de difusión
 * @param {number} limit - Límite de mensajes a obtener
 * @param {number} offset - Offset para paginación
 * @returns {Promise<Array>} - Lista de mensajes
 */
export const getDiffusionMessages = async (diffusionGroupId, limit = 50, offset = 0) => {
    try {
        // Verificar que el grupo de difusión existe
        const diffusionGroup = await DiffusionGroup.findByPk(diffusionGroupId);
        if (!diffusionGroup) {
            throw new Error('Grupo de difusión no encontrado');
        }

        const messages = await DiffusionMessage.findAll({
            where: { diffusion_group_id: diffusionGroupId },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return messages;
    } catch (error) {
        console.error('Error al obtener mensajes de difusión:', error);
        throw error;
    }
}; 