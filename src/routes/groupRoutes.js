import express from 'express';
import { createGroup, getGroupById, getUserGroups } from '../controllers/groupController.js';

const router = express.Router();

// Crear un nuevo grupo
router.post('/', createGroup);

// Obtener un grupo específico
router.get('/:groupId', getGroupById);

// Obtener todos los grupos de un usuario
router.get('/user/:firebase_uid', getUserGroups);

export default router; 