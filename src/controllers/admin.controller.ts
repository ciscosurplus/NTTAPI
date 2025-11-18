import { Request, Response } from 'express';
import tokenService from '../services/token.service';
import usageService from '../services/usage.service';
import logger from '../config/logger';

/**
 * Create a new user
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({
        error: 'Name and email are required',
      });
      return;
    }

    // Check if user exists
    const existingUser = await tokenService.getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({
        error: 'User with this email already exists',
      });
      return;
    }

    const user = await tokenService.createUser(name, email);

    logger.info('User created via admin API', { user_id: user.id, email });

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error: any) {
    logger.error('Failed to create user:', error);
    res.status(500).json({
      error: error.message || 'Failed to create user',
    });
  }
};

/**
 * Create a new API token
 */
export const createToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, name, rate_limit } = req.body;

    if (!user_id || !name) {
      res.status(400).json({
        error: 'user_id and name are required',
      });
      return;
    }

    // Verify user exists
    const user = await tokenService.getUserById(user_id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    const tokenData = await tokenService.createToken({
      user_id,
      name,
      rate_limit: rate_limit || 1000,
    });

    logger.info('Token created via admin API', {
      token_id: tokenData.id,
      user_id,
    });

    res.status(201).json({
      success: true,
      token: tokenData,
      warning: 'Save this token securely. It will not be shown again.',
    });
  } catch (error: any) {
    logger.error('Failed to create token:', error);
    res.status(500).json({
      error: error.message || 'Failed to create token',
    });
  }
};

/**
 * List all tokens
 */
export const listTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const tokens = await tokenService.listAllTokens(limit, offset);

    res.json({
      success: true,
      tokens,
      pagination: {
        limit,
        offset,
        count: tokens.length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to list tokens:', error);
    res.status(500).json({
      error: error.message || 'Failed to list tokens',
    });
  }
};

/**
 * Get token by ID
 */
export const getToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;

    const token = await tokenService.getTokenById(tokenId);

    if (!token) {
      res.status(404).json({
        error: 'Token not found',
      });
      return;
    }

    res.json({
      success: true,
      token,
    });
  } catch (error: any) {
    logger.error('Failed to get token:', error);
    res.status(500).json({
      error: error.message || 'Failed to get token',
    });
  }
};

/**
 * Update token
 */
export const updateToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;
    const { name, rate_limit } = req.body;

    const token = await tokenService.updateToken(tokenId, {
      name,
      rate_limit,
    });

    if (!token) {
      res.status(404).json({
        error: 'Token not found',
      });
      return;
    }

    logger.info('Token updated via admin API', { token_id: tokenId });

    res.json({
      success: true,
      token,
    });
  } catch (error: any) {
    logger.error('Failed to update token:', error);
    res.status(500).json({
      error: error.message || 'Failed to update token',
    });
  }
};

/**
 * Revoke token
 */
export const revokeToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;

    const success = await tokenService.revokeToken(tokenId);

    if (!success) {
      res.status(404).json({
        error: 'Token not found',
      });
      return;
    }

    logger.info('Token revoked via admin API', { token_id: tokenId });

    res.json({
      success: true,
      message: 'Token revoked successfully',
    });
  } catch (error: any) {
    logger.error('Failed to revoke token:', error);
    res.status(500).json({
      error: error.message || 'Failed to revoke token',
    });
  }
};

/**
 * Delete token
 */
export const deleteToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;

    const success = await tokenService.deleteToken(tokenId);

    if (!success) {
      res.status(404).json({
        error: 'Token not found',
      });
      return;
    }

    logger.info('Token deleted via admin API', { token_id: tokenId });

    res.json({
      success: true,
      message: 'Token deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete token:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete token',
    });
  }
};

/**
 * Get usage statistics
 */
export const getUsageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token_id, start_date, end_date } = req.query;

    const stats = await usageService.getUsageStats({
      token_id: token_id as string,
      start_date: start_date ? new Date(start_date as string) : undefined,
      end_date: end_date ? new Date(end_date as string) : undefined,
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('Failed to get usage stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to get usage stats',
    });
  }
};

/**
 * Get usage logs
 */
export const getUsageLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token_id, start_date, end_date, limit, offset } = req.query;

    const logs = await usageService.getUsageLogs({
      token_id: token_id as string,
      start_date: start_date ? new Date(start_date as string) : undefined,
      end_date: end_date ? new Date(end_date as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    logger.error('Failed to get usage logs:', error);
    res.status(500).json({
      error: error.message || 'Failed to get usage logs',
    });
  }
};

/**
 * Get connection logs
 */
export const getConnections = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const connections = await usageService.getRecentConnections(limit);

    res.json({
      success: true,
      connections,
      count: connections.length,
    });
  } catch (error: any) {
    logger.error('Failed to get connections:', error);
    res.status(500).json({
      error: error.message || 'Failed to get connections',
    });
  }
};

/**
 * Get usage trends
 */
export const getUsageTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token_id, days } = req.query;

    const trends = await usageService.getUsageTrends(
      token_id as string,
      days ? parseInt(days as string) : 7
    );

    res.json({
      success: true,
      trends,
    });
  } catch (error: any) {
    logger.error('Failed to get usage trends:', error);
    res.status(500).json({
      error: error.message || 'Failed to get usage trends',
    });
  }
};

/**
 * Get token usage summary
 */
export const getTokenUsageSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await usageService.getTokenUsageSummary();

    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    logger.error('Failed to get token usage summary:', error);
    res.status(500).json({
      error: error.message || 'Failed to get token usage summary',
    });
  }
};
