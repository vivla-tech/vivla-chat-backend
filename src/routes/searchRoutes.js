import express from 'express';
import { searchMessagesByTags, getTagStats, searchMessagesByText, getAvailableTags } from '../controllers/searchController.js';

const router = express.Router();

/**
 * @route GET /api/search/messages
 * @desc Busca mensajes por tags específicos
 * @access Public (puede requerir autenticación según necesidades)
 */
router.get('/messages', searchMessagesByTags);

/**
 * @route GET /api/search/tags/stats
 * @desc Obtiene estadísticas de uso de tags
 * @access Public (puede requerir autenticación según necesidades)
 */
router.get('/tags/stats', getTagStats);

/**
 * @route GET /api/search/messages/text
 * @desc Busca mensajes por texto en el contenido
 * @access Public (puede requerir autenticación según necesidades)
 */
router.get('/messages/text', searchMessagesByText);

/**
 * @route GET /api/search/tags/available
 * @desc Obtiene la lista de tags disponibles en el sistema
 * @access Public
 */
router.get('/tags/available', getAvailableTags);

export default router; 