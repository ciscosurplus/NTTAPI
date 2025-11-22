import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import logger from './config/logger';
import { connectRedis, redisClient } from './config/redis';
import { pool } from './config/database';
import ntthAuthService from './services/ntth-auth.service';

// Routes
import openaiRoutes from './routes/openai.routes';
import adminRoutes from './routes/admin.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middleware
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
})); // Security headers with CSP for dashboard
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

/**
 * Health check endpoint
 */
app.get('/health', async (_req: Request, res: Response) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'disconnected',
    redis: 'disconnected',
    ntth: 'not configured',
  };

  let isHealthy = true;

  try {
    // Check database connection
    await pool.query('SELECT 1');
    health.database = 'connected';
  } catch (error: any) {
    logger.error('Database health check failed:', error);
    health.database = 'disconnected';
    isHealthy = false;
  }

  try {
    // Check Redis connection
    await redisClient.ping();
    health.redis = 'connected';
  } catch (error: any) {
    logger.error('Redis health check failed:', error);
    health.redis = 'disconnected';
    isHealthy = false;
  }

  // Check NTTH configuration
  health.ntth = ntthAuthService.isConfigured() ? 'configured' : 'not configured';

  if (isHealthy) {
    res.json(health);
  } else {
    health.status = 'unhealthy';
    res.status(503).json(health);
  }
});

/**
 * Root endpoint - Serve dashboard
 */
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * API info endpoint
 */
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    name: 'NTTH API Gateway',
    version: '1.0.0',
    description: 'OpenAI-compatible API gateway for NTTH API',
    endpoints: {
      health: '/health',
      dashboard: '/',
      openai: '/v1/*',
      admin: '/admin/*',
    },
    documentation: 'https://github.com/yourusername/ntth-api-gateway',
  });
});

/**
 * API Routes
 */
app.use('/v1', openaiRoutes); // OpenAI-compatible endpoints
app.use('/admin', adminRoutes); // Admin endpoints

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      type: 'not_found_error',
      path: req.path,
    },
  });
});

/**
 * Global error handler
 */
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: {
      message: 'Internal server error',
      type: 'server_error',
    },
  });
});

/**
 * Initialize and start server
 */
async function start() {
  try {
    logger.info('Starting NTTH API Gateway...');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connection established');

    // Test database connection
    await pool.query('SELECT 1');
    logger.info('Database connection established');

    // Verify NTTH configuration
    if (!ntthAuthService.isConfigured()) {
      logger.warn('NTTH API credentials not configured. Set NTTH_APP_ID and NTTH_APP_SECRET.');
    } else {
      // Pre-authenticate with NTTH API
      try {
        await ntthAuthService.authenticate();
        logger.info('Successfully authenticated with NTTH API');
      } catch (error) {
        logger.error('Failed to authenticate with NTTH API:', error);
        logger.warn('Server will start but NTTH API calls may fail');
      }
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`NTTH API Gateway is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Dashboard: http://localhost:${PORT}/`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`OpenAI API: http://localhost:${PORT}/v1/chat/completions`);
      logger.info(`Admin API: http://localhost:${PORT}/admin/tokens`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing connections gracefully');
  try {
    // Close database pool
    await pool.end();
    logger.info('Database pool closed');

    // Close Redis connection
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing connections gracefully');
  try {
    // Close database pool
    await pool.end();
    logger.info('Database pool closed');

    // Close Redis connection
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
  }
  process.exit(0);
});

// Start the server
start();

export default app;
