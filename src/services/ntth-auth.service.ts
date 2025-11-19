import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import logger from '../config/logger';
import { redisClient } from '../config/redis';
import { NTTHAuthResponse } from '../types';

dotenv.config();

class NTTHAuthService {
  private axiosInstance: AxiosInstance;
  private authenticatedAxiosInstance: AxiosInstance | null = null;
  private baseURL: string;
  private appId: string;
  private appSecret: string;
  private currentToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private refreshMarginMinutes: number;

  constructor() {
    this.baseURL = process.env.NTTH_API_BASE_URL || 'https://api.ntth.ai/v1';
    this.appId = process.env.NTTH_APP_ID || '';
    this.appSecret = process.env.NTTH_APP_SECRET || '';
    this.refreshMarginMinutes = parseInt(
      process.env.NTTH_TOKEN_REFRESH_MARGIN_MINUTES || '60'
    );

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug('NTTH API Request:', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('NTTH API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('NTTH API Response:', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('NTTH API Response Error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate with NTTH API and get access token
   */
  async authenticate(): Promise<string> {
    try {
      logger.info('Authenticating with NTTH API...');

      const response = await this.axiosInstance.post<NTTHAuthResponse>(
        '/auth/appLogin',
        {
          id: this.appId,
          secret: this.appSecret,
        }
      );

      const authData = response.data;
      this.currentToken = authData.token;
      this.tokenExpiry = new Date(authData.expiry);

      // Cache token in Redis
      await this.cacheToken(authData);

      logger.info('Successfully authenticated with NTTH API', {
        applicationId: authData.applicationId,
        expiresIn: authData.expiresIn,
        expiry: authData.expiry,
      });

      return this.currentToken;
    } catch (error: any) {
      logger.error('Failed to authenticate with NTTH API:', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error('NTTH authentication failed');
    }
  }

  /**
   * Get valid NTTH token (refresh if needed)
   */
  async getToken(): Promise<string> {
    // Try to get from cache first
    const cachedToken = await this.getCachedToken();
    if (cachedToken) {
      this.currentToken = cachedToken;
      return cachedToken;
    }

    // Check if we need to refresh
    if (this.shouldRefreshToken()) {
      return await this.authenticate();
    }

    // If no token, authenticate
    if (!this.currentToken) {
      return await this.authenticate();
    }

    return this.currentToken;
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefreshToken(): boolean {
    if (!this.tokenExpiry || !this.currentToken) {
      return true;
    }

    const now = new Date();
    const refreshTime = new Date(
      this.tokenExpiry.getTime() - this.refreshMarginMinutes * 60 * 1000
    );

    return now >= refreshTime;
  }

  /**
   * Cache token in Redis
   */
  private async cacheToken(authData: NTTHAuthResponse): Promise<void> {
    try {
      const ttl = authData.expiresIn - this.refreshMarginMinutes * 60;
      await redisClient.setEx(
        'ntth:auth:token',
        ttl > 0 ? ttl : authData.expiresIn,
        authData.token
      );
      await redisClient.setEx(
        'ntth:auth:expiry',
        ttl > 0 ? ttl : authData.expiresIn,
        authData.expiry
      );
    } catch (error) {
      logger.error('Failed to cache NTTH token in Redis:', error);
    }
  }

  /**
   * Get cached token from Redis
   */
  private async getCachedToken(): Promise<string | null> {
    try {
      const token = await redisClient.get('ntth:auth:token');
      const expiry = await redisClient.get('ntth:auth:expiry');

      if (token && expiry) {
        this.currentToken = token;
        this.tokenExpiry = new Date(expiry);
        return token;
      }
    } catch (error) {
      logger.error('Failed to get cached NTTH token:', error);
    }
    return null;
  }

  /**
   * Get reusable authenticated axios instance for NTTH API calls
   * This is the preferred method - reuses a single instance with automatic token refresh
   */
  async getAuthenticatedClient(): Promise<AxiosInstance> {
    // Create the instance on first use
    if (!this.authenticatedAxiosInstance) {
      this.authenticatedAxiosInstance = axios.create({
        baseURL: this.baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Add request interceptor to inject current valid token
      this.authenticatedAxiosInstance.interceptors.request.use(
        async (config) => {
          // Get valid token (will refresh if needed)
          const token = await this.getToken();

          // Inject token into Authorization header
          if (config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
          }

          logger.debug('NTTH Authenticated API Request:', {
            method: config.method,
            url: config.url,
            hasToken: !!token,
          });

          return config;
        },
        (error) => {
          logger.error('NTTH Authenticated API Request Error:', error);
          return Promise.reject(error);
        }
      );

      // Add response interceptor for logging
      this.authenticatedAxiosInstance.interceptors.response.use(
        (response) => {
          logger.debug('NTTH Authenticated API Response:', {
            status: response.status,
            url: response.config.url,
          });
          return response;
        },
        (error) => {
          logger.error('NTTH Authenticated API Response Error:', {
            status: error.response?.status,
            message: error.message,
            url: error.config?.url,
          });
          return Promise.reject(error);
        }
      );
    }

    return this.authenticatedAxiosInstance;
  }

  /**
   * Create authenticated axios instance for NTTH API calls
   * @deprecated Use getAuthenticatedClient() instead for better performance
   */
  async createAuthenticatedClient(): Promise<AxiosInstance> {
    const token = await this.getToken();

    return axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Verify NTTH credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.appId && this.appSecret);
  }
}

export default new NTTHAuthService();
