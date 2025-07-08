import { DiffusionGroup, DiffusionGroupMember, DiffusionMessage, User } from '../models/index.js';

/**
 * Crear un nuevo grupo de difusión
 * @param {string} name - Nombre del grupo de difusión
 * @param {string} externalHid - ID externo de referencia a una casa (opcional)
 * @returns {Promise<Object>} - El grupo de difusión creado
 */
export const createDiffusionGroup = async (name, externalHid = null) => {
    try {
        if (!name || name.trim() === '') {
            throw new Error('El nombre del grupo es requerido');
        }

        const diffusionGroup = await DiffusionGroup.create({
            name: name.trim(),
            external_hid: externalHid ? externalHid.trim() : null
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

/**
 * Obtener grupos de difusión del usuario basados en sus deals y añadir al usuario como miembro
 * @param {string} ownerEmail - Email del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} Lista de grupos de difusión encontrados
 */
export const getUserDiffusionGroups = async (ownerEmail, userId) => {
    let diffusion_groups = [];
    
    try {
        // Importar el servicio de deals dinámicamente para evitar dependencias circulares
        const { getUserDeals } = await import('./dealService.js');
        
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
}; 