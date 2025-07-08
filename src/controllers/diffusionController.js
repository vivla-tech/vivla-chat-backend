import {
    createDiffusionGroup,
    addMemberToDiffusionGroup,
    createDiffusionMessage,
    getAllDiffusionGroups,
    getDiffusionGroupById,
    getDiffusionMessages
} from '../services/diffusionService.js';

/**
 * Crear un nuevo grupo de difusión
 * POST /api/diffusion/groups
 */
export const createGroup = async (req, res) => {
    try {
        const { name, external_hid } = req.body;

        // Validar datos requeridos
        if (!name) {
            return res.status(400).json({ error: 'El nombre del grupo es requerido' });
        }

        const diffusionGroup = await createDiffusionGroup(name, external_hid);
        return res.status(201).json(diffusionGroup);
    } catch (error) {
        console.error('Error en createGroup:', error);
        return res.status(500).json({ error: error.message || 'Error al crear el grupo de difusión' });
    }
};

/**
 * Obtener todos los grupos de difusión
 * GET /api/diffusion/groups
 */
export const getGroups = async (req, res) => {
    try {
        const groups = await getAllDiffusionGroups();
        return res.json(groups);
    } catch (error) {
        console.error('Error en getGroups:', error);
        return res.status(500).json({ error: error.message || 'Error al obtener los grupos de difusión' });
    }
};

/**
 * Obtener un grupo de difusión por ID
 * GET /api/diffusion/groups/:groupId
 */
export const getGroupById = async (req, res) => {
    try {
        const { groupId } = req.params;
        const groupIdInt = parseInt(groupId);

        if (isNaN(groupIdInt)) {
            return res.status(400).json({ error: 'ID de grupo inválido' });
        }

        const group = await getDiffusionGroupById(groupIdInt);
        return res.json(group);
    } catch (error) {
        console.error('Error en getGroupById:', error);
        if (error.message === 'Grupo de difusión no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Error al obtener el grupo de difusión' });
    }
};

/**
 * Añadir un usuario como miembro de un grupo de difusión
 * POST /api/diffusion/groups/:groupId/members
 */
export const addMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { user_id } = req.body;

        const groupIdInt = parseInt(groupId);

        if (isNaN(groupIdInt)) {
            return res.status(400).json({ error: 'ID de grupo inválido' });
        }

        // Validar datos requeridos
        if (!user_id) {
            return res.status(400).json({ error: 'El ID del usuario es requerido' });
        }

        const member = await addMemberToDiffusionGroup(groupIdInt, user_id);
        return res.status(201).json(member);
    } catch (error) {
        console.error('Error en addMember:', error);
        if (error.message.includes('no encontrado')) {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('ya es miembro')) {
            return res.status(409).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Error al añadir miembro al grupo' });
    }
};

/**
 * Crear un mensaje de texto en un grupo de difusión
 * POST /api/diffusion/groups/:groupId/messages
 */
export const createMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { content } = req.body;

        const groupIdInt = parseInt(groupId);

        if (isNaN(groupIdInt)) {
            return res.status(400).json({ error: 'ID de grupo inválido' });
        }

        // Validar datos requeridos
        if (!content) {
            return res.status(400).json({ error: 'El contenido del mensaje es requerido' });
        }

        const message = await createDiffusionMessage(groupIdInt, content);
        return res.status(201).json(message);
    } catch (error) {
        console.error('Error en createMessage:', error);
        if (error.message === 'Grupo de difusión no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Error al crear el mensaje' });
    }
};

/**
 * Obtener mensajes de un grupo de difusión
 * GET /api/diffusion/groups/:groupId/messages
 */
export const getMessages = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        const groupIdInt = parseInt(groupId);

        if (isNaN(groupIdInt)) {
            return res.status(400).json({ error: 'ID de grupo inválido' });
        }

        const messages = await getDiffusionMessages(groupIdInt, limit, offset);
        return res.json(messages);
    } catch (error) {
        console.error('Error en getMessages:', error);
        if (error.message === 'Grupo de difusión no encontrado') {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: error.message || 'Error al obtener los mensajes' });
    }
}; 