import { v4 as uuidv4 } from 'uuid';
import { AxiosResponse } from 'axios';
import ntthAuthService from './ntth-auth.service';
import logger from '../config/logger';
import {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  NTTHChatRequest,
  NTTHModel,
  OpenAIModel,
} from '../types';

class NTTHProxyService {
  /**
   * Transform OpenAI chat request to NTTH format
   */
  private transformChatRequest(openaiRequest: OpenAIChatCompletionRequest): NTTHChatRequest {
    // Handle stop sequences - NTTH API only supports single stop string
    // Use first stop sequence if array provided
    let stopSequence: string | null = null;
    if (openaiRequest.stop) {
      if (Array.isArray(openaiRequest.stop)) {
        stopSequence = openaiRequest.stop.length > 0 ? openaiRequest.stop[0] : null;
        if (openaiRequest.stop.length > 1) {
          logger.warn('Multiple stop sequences provided, only using first one. NTTH API limitation.', {
            provided: openaiRequest.stop.length,
            using: stopSequence,
          });
        }
      } else {
        stopSequence = openaiRequest.stop;
      }
    }

    return {
      id: uuidv4(),
      modelId: openaiRequest.model, // Assume model ID is passed directly
      messages: openaiRequest.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name,
      })),
      maxTokens: openaiRequest.max_tokens,
      stream: openaiRequest.stream || false,
      presencePenalty: openaiRequest.presence_penalty,
      stop: stopSequence,
      frequencyPenalty: openaiRequest.frequency_penalty,
      topP: openaiRequest.top_p,
      temperature: openaiRequest.temperature,
    };
  }

  /**
   * Transform NTTH chat response to OpenAI format
   */
  private transformChatResponse(
    ntthResponse: any,
    modelId: string
  ): OpenAIChatCompletionResponse {
    // NTTH returns different formats, handle both
    const content = ntthResponse.choices?.[0]?.message?.content || ntthResponse.content || '';

    return {
      id: uuidv4(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: ntthResponse.usage?.promptTokens || ntthResponse.metadata?.usage?.promptTokens || 0,
        completion_tokens: ntthResponse.usage?.completionTokens || ntthResponse.metadata?.usage?.completionTokens || 0,
        total_tokens: ntthResponse.usage?.totalTokens || ntthResponse.metadata?.usage?.totalTokens || 0,
      },
    };
  }

  /**
   * Proxy chat completion request to NTTH API
   * For streaming requests, returns the raw axios response to be handled by controller
   */
  async chatCompletion(
    openaiRequest: OpenAIChatCompletionRequest
  ): Promise<OpenAIChatCompletionResponse | AxiosResponse> {
    try {
      const ntthRequest = this.transformChatRequest(openaiRequest);
      const client = await ntthAuthService.getAuthenticatedClient();

      logger.debug('Sending chat request to NTTH API', {
        model: ntthRequest.modelId,
        messages: ntthRequest.messages.length,
        stream: ntthRequest.stream,
      });

      // Handle streaming vs non-streaming differently
      if (ntthRequest.stream) {
        // For streaming, return raw response with stream
        const response = await client.post('/chat', ntthRequest, {
          headers: {
            Accept: 'text/event-stream',
          },
          responseType: 'stream', // Important: get stream, not parsed data
        });

        logger.debug('Streaming response initiated from NTTH API', {
          status: response.status,
        });

        // Return raw response for controller to handle streaming
        return response;
      } else {
        // For non-streaming, parse and transform response
        const response = await client.post('/chat', ntthRequest, {
          headers: {
            Accept: 'application/json',
          },
        });

        logger.debug('Received non-streaming response from NTTH API', {
          status: response.status,
        });

        return this.transformChatResponse(response.data, ntthRequest.modelId);
      }
    } catch (error: any) {
      logger.error('Failed to proxy chat completion to NTTH:', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error('Failed to complete chat request');
    }
  }

  /**
   * Transform NTTH model to OpenAI model format
   */
  private transformModel(ntthModel: NTTHModel): OpenAIModel {
    return {
      id: ntthModel.id,
      object: 'model',
      created: Math.floor(new Date(ntthModel.createdAt).getTime() / 1000),
      owned_by: ntthModel.provider,
    };
  }

  /**
   * Get list of available models from NTTH API
   */
  async listModels(): Promise<OpenAIModel[]> {
    try {
      const client = await ntthAuthService.getAuthenticatedClient();

      logger.debug('Fetching models from NTTH API');

      const response = await client.get('/chat/models');
      const ntthModels: NTTHModel[] = response.data;

      logger.debug('Received models from NTTH API', {
        count: ntthModels.length,
      });

      return ntthModels.map((model) => this.transformModel(model));
    } catch (error: any) {
      logger.error('Failed to fetch models from NTTH:', {
        error: error.message,
        response: error.response?.data,
      });
      throw new Error('Failed to fetch models');
    }
  }

  /**
   * Get specific model info
   */
  async getModel(modelId: string): Promise<OpenAIModel | null> {
    try {
      const models = await this.listModels();
      return models.find((m) => m.id === modelId) || null;
    } catch (error) {
      logger.error('Failed to get model info:', error);
      return null;
    }
  }
}

export default new NTTHProxyService();
