import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        // Return false to stop reconnecting
        return false;
      }
      // Exponential backoff: 100ms, 200ms, 300ms, etc.
      const delay = retries * 100;
      logger.debug(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
  },
});

redisClient.on('connect', () => {
  logger.info('Redis connection established');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

redisClient.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export { redisClient };
export default redisClient;
