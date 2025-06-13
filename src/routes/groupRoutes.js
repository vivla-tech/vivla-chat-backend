import express from 'express';
import { createGroup, getGroupById, getUserGroups, addUserToGroup } from '../controllers/groupController.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateUser);

// Crear un nuevo grupo
router.post('/', createGroup);

// Obtener un grupo específico
router.get('/:groupId', getGroupById);

// Obtener todos los grupos de un usuario
router.get('/user/:firebase_uid', getUserGroups);

router.post('/:groupId/members', addUserToGroup);

export default router; 