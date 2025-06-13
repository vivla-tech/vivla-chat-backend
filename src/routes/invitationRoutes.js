import express from 'express';
import { createInvitation, validateInvitation, getGroupInvitations, processInvitation } from '../controllers/invitationController.js';

const router = express.Router();

// Crear una nueva invitación
router.post('/', createInvitation);

// Validar una invitación usando query params
router.get('/validate', validateInvitation);

// Procesar una invitación (aceptar y añadir al grupo)
router.post('/process', processInvitation);

// Obtener todas las invitaciones de un grupo
router.get('/group/:groupId', getGroupInvitations);

export default router; 