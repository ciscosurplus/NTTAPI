import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ntth_gateway',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);

  // Only exit on critical connection errors
  // Check for specific error codes that indicate complete database failure
  const criticalErrors = [
    'ECONNREFUSED',  // Connection refused
    'ENOTFOUND',     // Host not found
    'ETIMEDOUT',     // Connection timeout
    '57P01',         // PostgreSQL: admin shutdown
    '57P02',         // PostgreSQL: crash shutdown
    '57P03',         // PostgreSQL: cannot connect now
  ];

  const errorCode = (err as any).code;
  const isCritical = criticalErrors.includes(errorCode);

  if (isCritical) {
    logger.error('Critical database error detected. Shutting down.', { code: errorCode });
    process.exit(1);
  } else {
    logger.warn('Non-critical database pool error. Connection may recover.', { code: errorCode });
  }
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error:', { text, error });
    throw error;
  }
};

export const getClient = () => pool.connect();

export default { pool, query, getClient };
