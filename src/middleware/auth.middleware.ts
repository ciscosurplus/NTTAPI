import { Request, Response, NextFunction } from 'express';
import tokenService from '../services/token.service';
import logger from '../config/logger';
import { AuthenticatedRequest, ApiError } from '../types';

/**
 * Authentication middleware to validate API tokens
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, 'Missing authorization header', 'MISSING_AUTH');
    }

    // Support both "Bearer token" and just "token" formats
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      throw new ApiError(401, 'Invalid authorization header format', 'INVALID_AUTH_FORMAT');
    }

    // Validate token
    const tokenData = await tokenService.validateToken(token);

    if (!tokenData) {
      logger.warn('Invalid or expired token attempt', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      throw new ApiError(401, 'Invalid or expired API token', 'INVALID_TOKEN');
    }

    if (!tokenData.is_active) {
      throw new ApiError(401, 'API token has been revoked', 'TOKEN_REVOKED');
    }

    // Attach token data to request
    (req as AuthenticatedRequest).token = tokenData;

    // Get user data
    const user = await tokenService.getUserById(tokenData.user_id);
    if (user) {
      (req as AuthenticatedRequest).user = user;
    }

    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          code: error.code,
          type: 'authentication_error',
        },
      });
    } else {
      logger.error('Authentication error:', error);
      res.status(500).json({
        error: {
          message: 'Internal server error during authentication',
          type: 'server_error',
        },
      });
    }
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;

      if (token) {
        const tokenData = await tokenService.validateToken(token);
        if (tokenData && tokenData.is_active) {
          (req as AuthenticatedRequest).token = tokenData;

          const user = await tokenService.getUserById(tokenData.user_id);
          if (user) {
            (req as AuthenticatedRequest).user = user;
          }
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Admin authentication middleware
 */
export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new ApiError(401, 'Missing or invalid admin authorization', 'MISSING_ADMIN_AUTH');
    }

    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

    if (username !== adminUsername || password !== adminPassword) {
      logger.warn('Failed admin login attempt', {
        username,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      throw new ApiError(401, 'Invalid admin credentials', 'INVALID_ADMIN_CREDENTIALS');
    }

    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          code: error.code,
          type: 'authentication_error',
        },
      });
    } else {
      logger.error('Admin authentication error:', error);
      res.status(500).json({
        error: {
          message: 'Internal server error during admin authentication',
          type: 'server_error',
        },
      });
    }
  }
};
