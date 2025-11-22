import { query } from '../config/database';
import logger from '../config/logger';
import { UsageLog, UsageStats, UsageStatsQuery } from '../types';

class UsageService {
  /**
   * Log API usage
   */
  async logUsage(data: Omit<UsageLog, 'id' | 'created_at'>): Promise<void> {
    try {
      await query(
        `INSERT INTO usage_logs (
          token_id, endpoint, method, status_code,
          prompt_tokens, completion_tokens, total_tokens,
          model_id, request_duration_ms, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          data.token_id,
          data.endpoint,
          data.method,
          data.status_code,
          data.prompt_tokens || null,
          data.completion_tokens || null,
          data.total_tokens || null,
          data.model_id || null,
          data.request_duration_ms,
          data.ip_address,
          data.user_agent,
        ]
      );
    } catch (error: any) {
      logger.error('Failed to log usage:', error);
    }
  }

  /**
   * Get usage logs with filtering
   */
  async getUsageLogs(params: UsageStatsQuery): Promise<UsageLog[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (params.token_id) {
        conditions.push(`token_id = $${paramIndex++}`);
        values.push(params.token_id);
      }

      if (params.start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(params.start_date);
      }

      if (params.end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(params.end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = params.limit || 100;
      const offset = params.offset || 0;

      const result = await query(
        `SELECT * FROM usage_logs
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...values, limit, offset]
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to get usage logs:', error);
      return [];
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(params: UsageStatsQuery): Promise<UsageStats> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (params.token_id) {
        conditions.push(`token_id = $${paramIndex++}`);
        values.push(params.token_id);
      }

      if (params.start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(params.start_date);
      }

      if (params.end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(params.end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get aggregate stats
      const statsResult = await query(
        `SELECT
          COUNT(*) as total_requests,
          COALESCE(SUM(total_tokens), 0) as total_tokens,
          COALESCE(AVG(request_duration_ms), 0) as average_duration_ms,
          COALESCE(
            SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0),
            0
          ) as error_rate
         FROM usage_logs
         ${whereClause}`,
        values
      );

      // Get requests by model
      const modelResult = await query(
        `SELECT model_id, COUNT(*) as count
         FROM usage_logs
         ${whereClause} AND model_id IS NOT NULL
         GROUP BY model_id
         ORDER BY count DESC`,
        values
      );

      // Get requests by status code
      const statusResult = await query(
        `SELECT status_code, COUNT(*) as count
         FROM usage_logs
         ${whereClause}
         GROUP BY status_code
         ORDER BY count DESC`,
        values
      );

      const stats = statsResult.rows[0];
      const requestsByModel: Record<string, number> = {};
      const requestsByStatus: Record<string, number> = {};

      modelResult.rows.forEach((row) => {
        requestsByModel[row.model_id] = parseInt(row.count);
      });

      statusResult.rows.forEach((row) => {
        requestsByStatus[row.status_code.toString()] = parseInt(row.count);
      });

      return {
        total_requests: parseInt(stats.total_requests),
        total_tokens: parseInt(stats.total_tokens),
        average_duration_ms: parseFloat(stats.average_duration_ms),
        error_rate: parseFloat(stats.error_rate),
        requests_by_model: requestsByModel,
        requests_by_status: requestsByStatus,
      };
    } catch (error: any) {
      logger.error('Failed to get usage stats:', error);
      return {
        total_requests: 0,
        total_tokens: 0,
        average_duration_ms: 0,
        error_rate: 0,
        requests_by_model: {},
        requests_by_status: {},
      };
    }
  }

  /**
   * Get usage summary for all tokens
   */
  async getTokenUsageSummary(): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM usage_statistics ORDER BY total_requests DESC`,
        []
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to get token usage summary:', error);
      return [];
    }
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(
    tokenId?: string,
    days: number = 7
  ): Promise<{ date: string; requests: number; tokens: number }[]> {
    try {
      // Build query with proper parameterization
      let queryText: string;
      let values: any[];

      if (tokenId) {
        queryText = `SELECT
          DATE(created_at) as date,
          COUNT(*) as requests,
          COALESCE(SUM(total_tokens), 0) as tokens
         FROM usage_logs
         WHERE token_id = $1 AND created_at >= CURRENT_DATE - make_interval(days => $2)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`;
        values = [tokenId, days];
      } else {
        queryText = `SELECT
          DATE(created_at) as date,
          COUNT(*) as requests,
          COALESCE(SUM(total_tokens), 0) as tokens
         FROM usage_logs
         WHERE created_at >= CURRENT_DATE - make_interval(days => $1)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`;
        values = [days];
      }

      const result = await query(queryText, values);

      return result.rows.map((row) => ({
        date: row.date.toISOString().split('T')[0],
        requests: parseInt(row.requests),
        tokens: parseInt(row.tokens),
      }));
    } catch (error: any) {
      logger.error('Failed to get usage trends:', error);
      return [];
    }
  }

  /**
   * Get recent connection logs
   */
  async getRecentConnections(limit: number = 50): Promise<UsageLog[]> {
    try {
      const result = await query(
        `SELECT
          ul.*,
          t.name as token_name,
          u.name as user_name,
          u.email as user_email
         FROM usage_logs ul
         LEFT JOIN api_tokens t ON ul.token_id = t.id
         LEFT JOIN users u ON t.user_id = u.id
         ORDER BY ul.created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error: any) {
      logger.error('Failed to get recent connections:', error);
      return [];
    }
  }
}

export default new UsageService();
