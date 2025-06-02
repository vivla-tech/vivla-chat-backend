import express from 'express';
import { createUser, getUserByFirebaseUid } from '../controllers/userController.js';

const router = express.Router();

// POST /api/users - Crear un nuevo usuario
router.post('/', createUser);

// GET /api/users/:firebase_uid - Obtener usuario por firebase_uid
router.get('/:firebase_uid', getUserByFirebaseUid);

export default router; 