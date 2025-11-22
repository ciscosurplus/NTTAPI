import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { query } from '../config/database';
import logger from '../config/logger';
import { ApiToken, CreateTokenRequest, CreateTokenResponse, User } from '../types';

const BCRYPT_ROUNDS = 10;
const TOKEN_PREFIX = process.env.API_TOKEN_PREFIX || 'sk-ntth-';

class TokenService {
  /**
   * Generate a new API token
   */
  private generateToken(): string {
    const randomString = uuidv4().replace(/-/g, '');
    return `${TOKEN_PREFIX}${randomString}`;
  }

  /**
   * Hash token for storage
   */
  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, BCRYPT_ROUNDS);
  }

  /**
   * Verify token against hash
   */
  private async verifyToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }

  /**
   * Create a new API token
   */
  async createToken(data: CreateTokenRequest): Promise<CreateTokenResponse> {
    try {
      const token = this.generateToken();
      const tokenHash = await this.hashToken(token);

      const result = await query(
        `INSERT INTO api_tokens (user_id, token_hash, name, rate_limit)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, rate_limit, created_at`,
        [data.user_id, tokenHash, data.name, data.rate_limit || 1000]
      );

      const tokenData = result.rows[0];

      logger.info('API token created', {
        token_id: tokenData.id,
        user_id: data.user_id,
        name: data.name,
      });

      return {
        id: tokenData.id,
        token, // Return plain token only once
        name: tokenData.name,
        rate_limit: tokenData.rate_limit,
        created_at: tokenData.created_at,
      };
    } catch (error: any) {
      logger.error('Failed to create API token:', error);
      throw new Error('Failed to create API token');
    }
  }

  /**
   * Validate and get token details
   */
  async validateToken(token: string): Promise<ApiToken | null> {
    try {
      // Get all active tokens (we need to check hash for each)
      const result = await query(
        `SELECT t.*, u.name as user_name, u.email as user_email
         FROM api_tokens t
         JOIN users u ON t.user_id = u.id
         WHERE t.is_active = true`,
        []
      );

      // Check each token hash
      for (const row of result.rows) {
        const isValid = await this.verifyToken(token, row.token_hash);
        if (isValid) {
          // Update last_used_at
          await this.updateLastUsed(row.id);

          return {
            id: row.id,
            user_id: row.user_id,
            token_hash: row.token_hash,
            name: row.name,
            rate_limit: row.rate_limit,
            is_active: row.is_active,
            created_at: row.created_at,
            last_used_at: row.last_used_at,
          };
        }
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to validate token:', error);
      return null;
    }
  }

  /**
   * Update last_used_at timestamp
   */
  private async updateLastUsed(tokenId: string): Promise<void> {
    try {
      await query(
        `UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [tokenId]
      );
    } catch (error) {
      logger.error('Failed to update last_used_at:', error);
    }
  }

  /**
   * Get token by ID
   */
  async getTokenById(tokenId: string): Promise<ApiToken | null> {
    try {
      const result = await query(
        `SELECT * FROM api_tokens WHERE id = $1`,
        [tokenId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error: any) {
      logger.error('Failed to get token by ID:', error);
      return null;
    }
  }

  /**
   * List all tokens for a user
   */
  async listTokensByUser(userId: string): Promise<ApiToken[]> {
    try {
      const result = await query(
        `SELECT * FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to list tokens:', error);
      return [];
    }
  }

  /**
   * List all tokens (admin)
   */
  async listAllTokens(limit: number = 100, offset: number = 0): Promise<ApiToken[]> {
    try {
      const result = await query(
        `SELECT t.*, u.name as user_name, u.email as user_email
         FROM api_tokens t
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to list all tokens:', error);
      return [];
    }
  }

  /**
   * Revoke (deactivate) a token
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE api_tokens SET is_active = false WHERE id = $1 RETURNING id`,
        [tokenId]
      );

      if (result.rows.length > 0) {
        logger.info('API token revoked', { token_id: tokenId });
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Failed to revoke token:', error);
      return false;
    }
  }

  /**
   * Delete a token permanently
   */
  async deleteToken(tokenId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM api_tokens WHERE id = $1 RETURNING id`,
        [tokenId]
      );

      if (result.rows.length > 0) {
        logger.info('API token deleted', { token_id: tokenId });
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Failed to delete token:', error);
      return false;
    }
  }

  /**
   * Update token settings
   */
  async updateToken(
    tokenId: string,
    updates: { name?: string; rate_limit?: number }
  ): Promise<ApiToken | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.rate_limit !== undefined) {
        fields.push(`rate_limit = $${paramIndex++}`);
        values.push(updates.rate_limit);
      }

      if (fields.length === 0) {
        return this.getTokenById(tokenId);
      }

      values.push(tokenId);

      const result = await query(
        `UPDATE api_tokens
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        logger.info('API token updated', { token_id: tokenId });
        return result.rows[0];
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to update token:', error);
      return null;
    }
  }

  /**
   * Create a new user
   */
  async createUser(name: string, email: string): Promise<User> {
    try {
      const result = await query(
        `INSERT INTO users (name, email)
         VALUES ($1, $2)
         RETURNING *`,
        [name, email]
      );

      logger.info('User created', { user_id: result.rows[0].id, email });
      return result.rows[0];
    } catch (error: any) {
      logger.error('Failed to create user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to get user by email:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await query(
        `SELECT * FROM users WHERE id = $1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('Failed to get user by ID:', error);
      return null;
    }
  }

  /**
   * List all users
   */
  async listAllUsers(limit: number = 100, offset: number = 0): Promise<User[]> {
    try {
      const result = await query(
        `SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to list all users:', error);
      return [];
    }
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    updates: { name?: string; email?: string }
  ): Promise<User | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.email !== undefined) {
        fields.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }

      if (fields.length === 0) {
        return this.getUserById(userId);
      }

      values.push(userId);

      const result = await query(
        `UPDATE users
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        logger.info('User updated', { user_id: userId });
        return result.rows[0];
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to update user:', error);
      return null;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM users WHERE id = $1 RETURNING id`,
        [userId]
      );

      if (result.rows.length > 0) {
        logger.info('User deleted', { user_id: userId });
        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Failed to delete user:', error);
      return false;
    }
  }

  /**
   * Regenerate token (create new token, revoke old one)
   */
  async regenerateToken(tokenId: string): Promise<CreateTokenResponse | null> {
    try {
      // Get existing token info
      const existingToken = await this.getTokenById(tokenId);
      if (!existingToken) {
        return null;
      }

      // Generate new token
      const newToken = this.generateToken();
      const newTokenHash = await this.hashToken(newToken);

      // Update token hash
      const result = await query(
        `UPDATE api_tokens
         SET token_hash = $1, is_active = true
         WHERE id = $2
         RETURNING id, name, rate_limit, created_at`,
        [newTokenHash, tokenId]
      );

      if (result.rows.length > 0) {
        logger.info('API token regenerated', { token_id: tokenId });
        return {
          id: result.rows[0].id,
          token: newToken,
          name: result.rows[0].name,
          rate_limit: result.rows[0].rate_limit,
          created_at: result.rows[0].created_at,
        };
      }

      return null;
    } catch (error: any) {
      logger.error('Failed to regenerate token:', error);
      return null;
    }
  }
}

export default new TokenService();
