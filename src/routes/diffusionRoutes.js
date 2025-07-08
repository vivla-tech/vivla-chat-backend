import express from 'express';
import {
    createGroup,
    getGroups,
    getGroupById,
    addMember,
    createMessage,
    getMessages
} from '../controllers/diffusionController.js';

const router = express.Router();


// Rutas para grupos de difusión
router.post('/groups', createGroup);
router.get('/groups', getGroups);
router.get('/groups/:groupId', getGroupById);

// Rutas para miembros de grupos de difusión
router.post('/groups/:groupId/members', addMember);

// Rutas para mensajes de difusión
router.post('/groups/:groupId/messages', createMessage);
router.get('/groups/:groupId/messages', getMessages);

export default router; 