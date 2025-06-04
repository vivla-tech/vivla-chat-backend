import express from 'express';
import { createInvitation, acceptInvitation, getGroupInvitations } from '../controllers/invitationController.js';

const router = express.Router();

// Crear una nueva invitación
router.post('/', createInvitation);

// Procesar invitación (validar o aceptar)
router.post('/process', acceptInvitation);

// Obtener todas las invitaciones de un grupo
router.get('/group/:groupId', getGroupInvitations);

export default router; 