import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import logger from './config/logger';
import { connectRedis } from './config/redis';
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
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

/**
 * Health check endpoint
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      redis: 'connected',
      ntth: ntthAuthService.isConfigured() ? 'configured' : 'not configured',
    });
  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * Root endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'NTTH API Gateway',
    version: '1.0.0',
    description: 'OpenAI-compatible API gateway for NTTH API',
    endpoints: {
      health: '/health',
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
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
  logger.info('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

// Start the server
start();

export default app;
