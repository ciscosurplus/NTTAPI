import { Request, Response } from 'express';
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

    // Log usage
    const duration = Date.now() - startTime;
    if (authReq.token) {
      await usageService.logUsage({
        token_id: authReq.token.id,
        endpoint: '/v1/chat/completions',
        method: 'POST',
        status_code: 200,
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
        model_id: openaiRequest.model,
        request_duration_ms: duration,
        ip_address: req.ip || 'unknown',
        user_agent: req.get('user-agent') || 'unknown',
      });
    }

    logger.info('Chat completion successful', {
      model: openaiRequest.model,
      duration_ms: duration,
      tokens: response.usage.total_tokens,
    });

    res.json(response);
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
