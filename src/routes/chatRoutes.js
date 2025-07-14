import express from 'express';
import { getChat, getConversationAgent } from '../controllers/chatController.js';

const router = express.Router();

// Ruta para obtener o crear un chat
router.post('/get', getChat);

// Ruta para obtener información del agente asignado a una conversación
router.get('/conversation/:conversationId/agent', getConversationAgent);

export default router; 