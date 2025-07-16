import { Message, Group, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { getAllAvailableTags } from '../services/tagService.js';

/**
 * Busca mensajes por tags específicos
 * @route GET /api/search/messages
 * @param {string} tags - Tags separados por comas (ej: "Estancias,Incidencias")
 * @param {string} groupId - ID del grupo (opcional, para filtrar por grupo)
 * @param {number} limit - Número máximo de resultados (por defecto 50)
 * @param {number} offset - Número de resultados a saltar (por defecto 0)
 * @returns {Object} Lista de mensajes que coinciden con los tags
 */
export const searchMessagesByTags = async (req, res) => {
    try {
        const { tags, groupId, limit = 50, offset = 0 } = req.query;

        // Validar que se proporcionen tags
        if (!tags) {
            return res.status(400).json({
                status: 'error',
                message: 'El parámetro "tags" es requerido',
                example: '?tags=Estancias,Incidencias'
            });
        }

        // Parsear los tags (separados por comas)
        const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        if (tagArray.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Debe proporcionar al menos un tag válido'
            });
        }

        console.log(`🔍 Buscando mensajes con tags: [${tagArray.join(', ')}]`);

        // Construir la consulta base usando OR para buscar cada tag individualmente
        const whereClause = {
            [Op.or]: tagArray.map(tag => 
                sequelize.literal(`tags @> '["${tag}"]'::jsonb`)
            )
        };

        // Añadir filtro por grupo si se proporciona
        if (groupId) {
            whereClause.group_id = groupId;
        }

        // Realizar la búsqueda
        const messages = await Message.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Group,
                    as: 'group',
                    attributes: ['group_id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Contar total de resultados para paginación
        const totalCount = await Message.count({
            where: whereClause
        });

        console.log(`✅ Encontrados ${messages.length} mensajes de ${totalCount} totales`);

        return res.status(200).json({
            status: 'success',
            message: 'Búsqueda completada exitosamente',
            data: {
                messages,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + messages.length) < totalCount
                },
                search: {
                    tags: tagArray,
                    groupId: groupId || null
                }
            }
        });

    } catch (error) {
        console.error('Error en búsqueda de mensajes por tags:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al realizar la búsqueda',
            error: error.message
        });
    }
};

/**
 * Obtiene estadísticas de tags en mensajes
 * @route GET /api/search/tags/stats
 * @param {string} groupId - ID del grupo (opcional)
 * @returns {Object} Estadísticas de uso de tags
 */
export const getTagStats = async (req, res) => {
    try {
        const { groupId } = req.query;

        // Construir la consulta base
        const whereClause = groupId ? { group_id: groupId } : {};

        // Obtener todos los mensajes con tags
        const messages = await Message.findAll({
            where: {
                ...whereClause,
                tags: {
                    [Op.ne]: null // Solo mensajes que tienen tags
                }
            },
            attributes: ['tags']
        });

        // Contar frecuencia de cada tag
        const tagStats = {};
        messages.forEach(message => {
            if (message.tags && Array.isArray(message.tags)) {
                message.tags.forEach(tag => {
                    tagStats[tag] = (tagStats[tag] || 0) + 1;
                });
            }
        });

        // Ordenar por frecuencia
        const sortedStats = Object.entries(tagStats)
            .sort(([,a], [,b]) => b - a)
            .map(([tag, count]) => ({ tag, count }));

        return res.status(200).json({
            status: 'success',
            message: 'Estadísticas de tags obtenidas',
            data: {
                totalMessages: messages.length,
                tagStats: sortedStats,
                groupId: groupId || null
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de tags:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener estadísticas de tags',
            error: error.message
        });
    }
};

/**
 * Busca mensajes por texto en el contenido
 * @route GET /api/search/messages/text
 * @param {string} query - Texto a buscar
 * @param {string} groupId - ID del grupo (opcional)
 * @param {number} limit - Número máximo de resultados
 * @param {number} offset - Número de resultados a saltar
 * @returns {Object} Lista de mensajes que contienen el texto
 */
export const searchMessagesByText = async (req, res) => {
    try {
        const { query, groupId, limit = 50, offset = 0 } = req.query;

        if (!query) {
            return res.status(400).json({
                status: 'error',
                message: 'El parámetro "query" es requerido'
            });
        }

        console.log(`🔍 Buscando mensajes con texto: "${query}"`);

        const whereClause = {
            content: {
                [Op.iLike]: `%${query}%` // Búsqueda case-insensitive
            }
        };

        if (groupId) {
            whereClause.group_id = groupId;
        }

        const messages = await Message.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Group,
                    as: 'group',
                    attributes: ['group_id', 'name']
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const totalCount = await Message.count({
            where: whereClause
        });

        return res.status(200).json({
            status: 'success',
            message: 'Búsqueda de texto completada',
            data: {
                messages,
                pagination: {
                    total: totalCount,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: (parseInt(offset) + messages.length) < totalCount
                },
                search: {
                    query,
                    groupId: groupId || null
                }
            }
        });

    } catch (error) {
        console.error('Error en búsqueda de texto:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al realizar la búsqueda de texto',
            error: error.message
        });
    }
};

/**
 * Obtiene la lista de tags disponibles en el sistema
 * @route GET /api/search/tags/available
 * @returns {Object} Lista de tags disponibles
 */
export const getAvailableTags = async (req, res) => {
    try {
        console.log('🏷️ Obteniendo lista de tags disponibles...');
        
        const availableTags = getAllAvailableTags();
        
        console.log(`✅ Tags disponibles: [${availableTags.join(', ')}]`);
        
        return res.status(200).json({
            status: 'success',
            message: 'Lista de tags disponibles obtenida correctamente',
            data: {
                tags: availableTags,
                total: availableTags.length,
                description: 'Tags disponibles para búsqueda y análisis de mensajes'
            }
        });

    } catch (error) {
        console.error('Error obteniendo tags disponibles:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la lista de tags disponibles',
            error: error.message
        });
    }
}; 