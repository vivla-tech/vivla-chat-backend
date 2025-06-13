import express from 'express';
import { getChat } from '../controllers/chatController.js';

const router = express.Router();

// Ruta para obtener o crear un chat
router.post('/get', getChat);

export default router; 