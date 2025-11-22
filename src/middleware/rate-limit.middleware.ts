import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import logger from '../config/logger';
import { AuthenticatedRequest, ApiError } from '../types';

const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED === 'true';
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute
const DEFAULT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

/**
 * Token-based rate limiting middleware
 */
export const rateLimitByToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!RATE_LIMIT_ENABLED) {
    next();
    return;
  }

  try {
    const authReq = req as AuthenticatedRequest;
    const token = authReq.token;

    if (!token) {
      // If no token, apply global rate limit
      await globalRateLimit(req, res, next);
      return;
    }

    const tokenId = token.id;
    const maxRequests = token.rate_limit || DEFAULT_MAX_REQUESTS;
    const windowMs = DEFAULT_WINDOW_MS;
    const now = Date.now();

    // Redis key for this token
    const key = `rate_limit:token:${tokenId}`;

    // Get current count
    const data = await redisClient.get(key);
    let rateLimitInfo: RateLimitInfo;

    if (data) {
      rateLimitInfo = JSON.parse(data);

      // Check if window has reset
      if (rateLimitInfo.resetAt <= now) {
        rateLimitInfo = {
          count: 1,
          resetAt: now + windowMs,
        };
      } else {
        rateLimitInfo.count += 1;
      }
    } else {
      rateLimitInfo = {
        count: 1,
        resetAt: now + windowMs,
      };
    }

    // Save updated count
    const ttlSeconds = Math.ceil((rateLimitInfo.resetAt - now) / 1000);
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(rateLimitInfo));

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitInfo.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitInfo.resetAt).toISOString());

    // Check if limit exceeded
    if (rateLimitInfo.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        token_id: tokenId,
        count: rateLimitInfo.count,
        limit: maxRequests,
      });

      throw new ApiError(
        429,
        `Rate limit exceeded. Maximum ${maxRequests} requests per minute.`,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          code: error.code,
          type: 'rate_limit_error',
        },
      });
    } else {
      logger.error('Rate limit error:', error);
      // Continue on error to not block requests
      next();
    }
  }
};

/**
 * Global rate limiting (for unauthenticated requests)
 */
const globalRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const maxRequests = DEFAULT_MAX_REQUESTS;
    const windowMs = DEFAULT_WINDOW_MS;
    const now = Date.now();

    const key = `rate_limit:ip:${ip}`;

    const data = await redisClient.get(key);
    let rateLimitInfo: RateLimitInfo;

    if (data) {
      rateLimitInfo = JSON.parse(data);

      if (rateLimitInfo.resetAt <= now) {
        rateLimitInfo = {
          count: 1,
          resetAt: now + windowMs,
        };
      } else {
        rateLimitInfo.count += 1;
      }
    } else {
      rateLimitInfo = {
        count: 1,
        resetAt: now + windowMs,
      };
    }

    const ttlSeconds = Math.ceil((rateLimitInfo.resetAt - now) / 1000);
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(rateLimitInfo));

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitInfo.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitInfo.resetAt).toISOString());

    if (rateLimitInfo.count > maxRequests) {
      logger.warn('Global rate limit exceeded', {
        ip,
        count: rateLimitInfo.count,
      });

      throw new ApiError(
        429,
        'Rate limit exceeded. Please authenticate or try again later.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          code: error.code,
          type: 'rate_limit_error',
        },
      });
    } else {
      logger.error('Global rate limit error:', error);
      next();
    }
  }
};

export default rateLimitByToken;
