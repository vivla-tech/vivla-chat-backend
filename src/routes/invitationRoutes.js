import express from 'express';
import { createInvitation, validateInvitation, getGroupInvitations } from '../controllers/invitationController.js';

const router = express.Router();

// Crear una nueva invitación
router.post('/', createInvitation);

// Validar una invitación usando el token mágico y email
router.get('/validate/:magic_token', validateInvitation);

// Obtener todas las invitaciones de un grupo
router.get('/group/:groupId', getGroupInvitations);

export default router; 