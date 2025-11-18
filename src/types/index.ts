import { Request } from 'express';

// User and Token types
export interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

export interface ApiToken {
  id: string;
  user_id: string;
  token_hash: string;
  name: string;
  rate_limit: number;
  is_active: boolean;
  created_at: Date;
  last_used_at?: Date;
}

export interface UsageLog {
  id: string;
  token_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  model_id?: string;
  request_duration_ms: number;
  ip_address: string;
  user_agent: string;
  created_at: Date;
}

// NTTH API types
export interface NTTHAuthResponse {
  token: string;
  region: string;
  applicationId: string;
  applicationName: string;
  clientType: string;
  tenant: {
    id: string;
    name: string;
  };
  rbac: any;
  sessionStart: string;
  sessionEnd: string;
  expiresIn: number;
  expiry: string;
}

export interface NTTHChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface NTTHChatRequest {
  id: string;
  modelId: string;
  messages: NTTHChatMessage[];
  maxTokens?: number;
  stream?: boolean;
  presencePenalty?: number;
  stop?: string | null;
  frequencyPenalty?: number;
  topP?: number;
  temperature?: number;
  seed?: number;
  safeGuardSettings?: any;
}

export interface NTTHModel {
  id: string;
  provider: string;
  type: string;
  name: string;
  deploymentName: string;
  version: string;
  classification: string;
  capabilities: string[];
  providerPriority: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

// OpenAI-compatible types
export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[] | null;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

// Extended Express Request with auth
export interface AuthenticatedRequest extends Request {
  token?: ApiToken;
  user?: User;
}

// Admin types
export interface CreateTokenRequest {
  user_id: string;
  name: string;
  rate_limit?: number;
}

export interface CreateTokenResponse {
  id: string;
  token: string;
  name: string;
  rate_limit: number;
  created_at: Date;
}

export interface UsageStatsQuery {
  token_id?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export interface UsageStats {
  total_requests: number;
  total_tokens: number;
  average_duration_ms: number;
  error_rate: number;
  requests_by_model: Record<string, number>;
  requests_by_status: Record<string, number>;
}

// Error types
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
