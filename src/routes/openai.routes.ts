import { Router } from 'express';
import { chatCompletion, listModels, getModel } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimitByToken } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply authentication and rate limiting to all OpenAI-compatible routes
router.use(authenticate);
router.use(rateLimitByToken);

/**
 * OpenAI-compatible endpoints
 */

// Chat completions
router.post('/chat/completions', chatCompletion);

// Models
router.get('/models', listModels);
router.get('/models/:model', getModel);

export default router;
