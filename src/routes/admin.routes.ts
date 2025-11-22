import { Router } from 'express';
import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  createToken,
  listTokens,
  getToken,
  updateToken,
  revokeToken,
  deleteToken,
  regenerateToken,
  testNtthConnection,
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
router.get('/users', listUsers);
router.get('/users/:userId', getUser);
router.patch('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

/**
 * Token Management
 */
router.post('/tokens', createToken);
router.get('/tokens', listTokens);
router.get('/tokens/:tokenId', getToken);
router.patch('/tokens/:tokenId', updateToken);
router.post('/tokens/:tokenId/revoke', revokeToken);
router.post('/tokens/:tokenId/regenerate', regenerateToken);
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

/**
 * NTTH API Testing
 */
router.post('/test-ntth', testNtthConnection);

export default router;
