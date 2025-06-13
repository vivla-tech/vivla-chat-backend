import express from 'express';
import { handleZendeskWebhook } from '../controllers/zendeskController.js';

const router = express.Router();

// Ruta para webhooks de Zendesk
router.post('/webhook', handleZendeskWebhook);

export default router; 