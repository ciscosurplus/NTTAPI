import { Request, Response } from 'express';
import { AxiosResponse } from 'axios';
import ntthProxyService from '../services/ntth-proxy.service';
import usageService from '../services/usage.service';
import logger from '../config/logger';
import { AuthenticatedRequest, OpenAIChatCompletionRequest } from '../types';

/**
 * Handle chat completion requests
 */
export const chatCompletion = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const authReq = req as AuthenticatedRequest;

  try {
    const openaiRequest: OpenAIChatCompletionRequest = req.body;

    // Validate request
    if (!openaiRequest.model || !openaiRequest.messages || !Array.isArray(openaiRequest.messages)) {
      res.status(400).json({
        error: {
          message: 'Invalid request: model and messages are required',
          type: 'invalid_request_error',
        },
      });
      return;
    }

    // Proxy to NTTH API
    const response = await ntthProxyService.chatCompletion(openaiRequest);

    // Check if this is a streaming response (AxiosResponse) or regular response
    if ('status' in response && 'data' in response && typeof response.data === 'object' && 'pipe' in response.data) {
      // This is a streaming response (AxiosResponse with stream)
      const streamResponse = response as AxiosResponse;

      logger.debug('Piping streaming response to client');

      // Set headers for SSE streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Pipe the stream from NTTH API to client
      streamResponse.data.pipe(res);

      // Handle stream end
      streamResponse.data.on('end', () => {
        const duration = Date.now() - startTime;

        // Log usage for streaming (we can't get token counts from stream easily)
        if (authReq.token) {
          usageService.logUsage({
            token_id: authReq.token.id,
            endpoint: '/v1/chat/completions',
            method: 'POST',
            status_code: 200,
            model_id: openaiRequest.model,
            request_duration_ms: duration,
            ip_address: req.ip || 'unknown',
            user_agent: req.get('user-agent') || 'unknown',
          }).catch(err => logger.error('Failed to log streaming usage:', err));
        }

        logger.info('Streaming chat completion successful', {
          model: openaiRequest.model,
          duration_ms: duration,
        });
      });

      // Handle stream errors
      streamResponse.data.on('error', (error: Error) => {
        logger.error('Stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              message: 'Stream error occurred',
              type: 'server_error',
            },
          });
        }
      });

    } else {
      // This is a regular non-streaming response
      const chatResponse = response as any;

      // Log usage
      const duration = Date.now() - startTime;
      if (authReq.token) {
        await usageService.logUsage({
          token_id: authReq.token.id,
          endpoint: '/v1/chat/completions',
          method: 'POST',
          status_code: 200,
          prompt_tokens: chatResponse.usage?.prompt_tokens,
          completion_tokens: chatResponse.usage?.completion_tokens,
          total_tokens: chatResponse.usage?.total_tokens,
          model_id: openaiRequest.model,
          request_duration_ms: duration,
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });
      }

      logger.info('Chat completion successful', {
        model: openaiRequest.model,
        duration_ms: duration,
        tokens: chatResponse.usage?.total_tokens,
      });

      res.json(chatResponse);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Chat completion failed:', {
      error: error.message,
      duration_ms: duration,
    });

    // Log error usage
    if (authReq.token) {
      await usageService.logUsage({
        token_id: authReq.token.id,
        endpoint: '/v1/chat/completions',
        method: 'POST',
        status_code: 500,
        request_duration_ms: duration,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      });
    }

    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'server_error',
      },
    });
  }
};

/**
 * List available models
 */
export const listModels = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const authReq = req as AuthenticatedRequest;

  try {
    const models = await ntthProxyService.listModels();

    const duration = Date.now() - startTime;

    // Log usage
    if (authReq.token) {
      await usageService.logUsage({
        token_id: authReq.token.id,
        endpoint: '/v1/models',
        method: 'GET',
        status_code: 200,
        request_duration_ms: duration,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      });
    }

    logger.info('Models list retrieved', {
      count: models.length,
      duration_ms: duration,
    });

    res.json({
      object: 'list',
      data: models,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Failed to list models:', error);

    if (authReq.token) {
      await usageService.logUsage({
        token_id: authReq.token.id,
        endpoint: '/v1/models',
        method: 'GET',
        status_code: 500,
        request_duration_ms: duration,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      });
    }

    res.status(500).json({
      error: {
        message: error.message || 'Failed to retrieve models',
        type: 'server_error',
      },
    });
  }
};

/**
 * Get specific model
 */
export const getModel = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const authReq = req as AuthenticatedRequest;
  const modelId = req.params.model;

  try {
    const model = await ntthProxyService.getModel(modelId);

    const duration = Date.now() - startTime;

    if (!model) {
      if (authReq.token) {
        await usageService.logUsage({
          token_id: authReq.token.id,
          endpoint: `/v1/models/${modelId}`,
          method: 'GET',
          status_code: 404,
          request_duration_ms: duration,
          ip_address: req.ip || 'unknown',
          user_agent: req.get('user-agent') || 'unknown',
        });
      }

      res.status(404).json({
        error: {
          message: 'Model not found',
          type: 'not_found_error',
        },
      });
      return;
    }

    if (authReq.token) {
      await usageService.logUsage({
        token_id: authReq.token.id,
        endpoint: `/v1/models/${modelId}`,
        method: 'GET',
        status_code: 200,
        request_duration_ms: duration,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      });
    }

    res.json(model);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Failed to get model:', error);

    if (authReq.token) {
      await usageService.logUsage({
        token_id: authReq.token.id,
        endpoint: `/v1/models/${modelId}`,
        method: 'GET',
        status_code: 500,
        request_duration_ms: duration,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      });
    }

    res.status(500).json({
      error: {
        message: error.message || 'Failed to retrieve model',
        type: 'server_error',
      },
    });
  }
};
