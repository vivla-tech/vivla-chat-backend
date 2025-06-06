import express from 'express';
import {
    createMessage,
    getGroupMessages,
    deleteMessage,
    updateMessage
} from '../controllers/messageController.js';

const router = express.Router();

router.post('/', createMessage);

router.get('/group/:groupId', getGroupMessages);

router.delete('/:messageId/:senderId', deleteMessage);

router.put('/:messageId/:senderId', updateMessage);

export default router; 