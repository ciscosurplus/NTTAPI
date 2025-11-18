import { Router } from 'express';
import {
  createUser,
  createToken,
  listTokens,
  getToken,
  updateToken,
  revokeToken,
  deleteToken,
  getUsageStats,
  getUsageLogs,
  getConnections,
  getUsageTrends,
  getTokenUsageSummary,
} from '../controllers/admin.controller';
import { adminAuth } from '../middleware/auth.middleware';

const router = Router();

// Apply admin authentication to all admin routes
router.use(adminAuth);

/**
 * User Management
 */
router.post('/users', createUser);

/**
 * Token Management
 */
router.post('/tokens', createToken);
router.get('/tokens', listTokens);
router.get('/tokens/:tokenId', getToken);
router.patch('/tokens/:tokenId', updateToken);
router.post('/tokens/:tokenId/revoke', revokeToken);
router.delete('/tokens/:tokenId', deleteToken);

/**
 * Usage Analytics
 */
router.get('/usage/stats', getUsageStats);
router.get('/usage/logs', getUsageLogs);
router.get('/usage/trends', getUsageTrends);
router.get('/usage/summary', getTokenUsageSummary);

/**
 * Connection Logs
 */
router.get('/connections', getConnections);

export default router;
