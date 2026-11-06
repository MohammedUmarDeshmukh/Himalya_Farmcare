import { Router } from 'express';
import { handleChatMessage } from '../controllers/chatbotController.js';

const router = Router();

// Publicly accessible chatbot message endpoint
router.post('/message', handleChatMessage);

export default router;
