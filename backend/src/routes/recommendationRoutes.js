import { Router } from 'express';
import { generateRecommendations } from '../controllers/recommendationController.js';

const router = Router();

router.post('/generate', generateRecommendations);

export default router;
