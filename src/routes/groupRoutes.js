import express from 'express';
import { getGroupById } from '../controllers/groupController.js';

const router = express.Router();

// Obtener un grupo específico
router.get('/:groupId', getGroupById);

export default router; 