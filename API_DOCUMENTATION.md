# NTTH API Gateway - API Documentation

## Table of Contents

1. [Authentication](#authentication)
2. [OpenAI-Compatible Endpoints](#openai-compatible-endpoints)
3. [Admin Endpoints](#admin-endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)

## Authentication

### Customer API Endpoints (OpenAI-Compatible)

All customer-facing endpoints require Bearer token authentication:

```
Authorization: Bearer sk-ntth-xxxxxxxxxxxxxxxx
```

### Admin API Endpoints

Admin endpoints use Basic authentication:

```
Authorization: Basic base64(username:password)
```

## OpenAI-Compatible Endpoints

Base URL: `http://localhost:3000/v1`

### Chat Completions

Create a chat completion using the NTTH API.

**Endpoint:** `POST /v1/chat/completions`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 150,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0,
  "stop": null
}
```

**Response:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  }
}
```

### List Models

Get a list of available models.

**Endpoint:** `GET /v1/models`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1677649963,
      "owned_by": "openai"
    },
    {
      "id": "gpt-3.5-turbo",
      "object": "model",
      "created": 1677649963,
      "owned_by": "openai"
    }
  ]
}
```

### Get Model

Retrieve information about a specific model.

**Endpoint:** `GET /v1/models/{model_id}`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "id": "gpt-4",
  "object": "model",
  "created": 1677649963,
  "owned_by": "openai"
}
```

## Admin Endpoints

Base URL: `http://localhost:3000/admin`

### User Management

#### Create User

**Endpoint:** `POST /admin/users`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Token Management

#### Create Token

**Endpoint:** `POST /admin/tokens`

**Headers:**
```
Authorization: Basic base64(admin:password)
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Production API Token",
  "rate_limit": 1000
}
```

**Response:**
```json
{
  "success": true,
  "token": {
    "id": "456e7890-e89b-12d3-a456-426614174111",
    "token": "sk-ntth-abc123def456ghi789jkl012mno345pqr",
    "name": "Production API Token",
    "rate_limit": 1000,
    "created_at": "2024-01-15T10:35:00.000Z"
  },
  "warning": "Save this token securely. It will not be shown again."
}
```

#### List Tokens

**Endpoint:** `GET /admin/tokens?limit=100&offset=0`

**Response:**
```json
{
  "success": true,
  "tokens": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174111",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Production API Token",
      "rate_limit": 1000,
      "is_active": true,
      "created_at": "2024-01-15T10:35:00.000Z",
      "last_used_at": "2024-01-15T12:00:00.000Z",
      "user_name": "John Doe",
      "user_email": "john@example.com"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "count": 1
  }
}
```

#### Get Token

**Endpoint:** `GET /admin/tokens/{tokenId}`

**Response:**
```json
{
  "success": true,
  "token": {
    "id": "456e7890-e89b-12d3-a456-426614174111",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Production API Token",
    "rate_limit": 1000,
    "is_active": true,
    "created_at": "2024-01-15T10:35:00.000Z",
    "last_used_at": "2024-01-15T12:00:00.000Z"
  }
}
```

#### Update Token

**Endpoint:** `PATCH /admin/tokens/{tokenId}`

**Request Body:**
```json
{
  "name": "Updated Token Name",
  "rate_limit": 2000
}
```

**Response:**
```json
{
  "success": true,
  "token": {
    "id": "456e7890-e89b-12d3-a456-426614174111",
    "name": "Updated Token Name",
    "rate_limit": 2000,
    "is_active": true
  }
}
```

#### Revoke Token

**Endpoint:** `POST /admin/tokens/{tokenId}/revoke`

**Response:**
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

#### Delete Token

**Endpoint:** `DELETE /admin/tokens/{tokenId}`

**Response:**
```json
{
  "success": true,
  "message": "Token deleted successfully"
}
```

### Usage Analytics

#### Get Usage Statistics

**Endpoint:** `GET /admin/usage/stats`

**Query Parameters:**
- `token_id` (optional): Filter by token ID
- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)

**Example:** `GET /admin/usage/stats?token_id=456e7890&start_date=2024-01-01&end_date=2024-01-31`

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_requests": 1500,
    "total_tokens": 75000,
    "average_duration_ms": 850.5,
    "error_rate": 0.02,
    "requests_by_model": {
      "gpt-4": 1000,
      "gpt-3.5-turbo": 500
    },
    "requests_by_status": {
      "200": 1470,
      "400": 15,
      "429": 10,
      "500": 5
    }
  }
}
```

#### Get Usage Logs

**Endpoint:** `GET /admin/usage/logs`

**Query Parameters:**
- `token_id` (optional): Filter by token ID
- `start_date` (optional): Start date (ISO 8601)
- `end_date` (optional): End date (ISO 8601)
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174222",
      "token_id": "456e7890-e89b-12d3-a456-426614174111",
      "endpoint": "/v1/chat/completions",
      "method": "POST",
      "status_code": 200,
      "prompt_tokens": 20,
      "completion_tokens": 50,
      "total_tokens": 70,
      "model_id": "gpt-4",
      "request_duration_ms": 1200,
      "ip_address": "192.168.1.1",
      "user_agent": "OpenAI-Python/1.0",
      "created_at": "2024-01-15T12:30:00.000Z"
    }
  ],
  "count": 1
}
```

#### Get Usage Trends

**Endpoint:** `GET /admin/usage/trends`

**Query Parameters:**
- `token_id` (optional): Filter by token ID
- `days` (optional): Number of days (default: 7)

**Response:**
```json
{
  "success": true,
  "trends": [
    {
      "date": "2024-01-15",
      "requests": 150,
      "tokens": 7500
    },
    {
      "date": "2024-01-14",
      "requests": 200,
      "tokens": 10000
    }
  ]
}
```

#### Get Token Usage Summary

**Endpoint:** `GET /admin/usage/summary`

**Response:**
```json
{
  "success": true,
  "summary": [
    {
      "token_id": "456e7890-e89b-12d3-a456-426614174111",
      "token_name": "Production API Token",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "total_requests": 1500,
      "successful_requests": 1470,
      "failed_requests": 30,
      "total_tokens_used": 75000,
      "avg_duration_ms": 850.5,
      "last_request_at": "2024-01-15T12:30:00.000Z"
    }
  ]
}
```

### Connection Logs

#### Get Recent Connections

**Endpoint:** `GET /admin/connections`

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)

**Response:**
```json
{
  "success": true,
  "connections": [
    {
      "id": "789e0123-e89b-12d3-a456-426614174222",
      "token_id": "456e7890-e89b-12d3-a456-426614174111",
      "token_name": "Production API Token",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "endpoint": "/v1/chat/completions",
      "method": "POST",
      "status_code": 200,
      "request_duration_ms": 1200,
      "ip_address": "192.168.1.1",
      "user_agent": "OpenAI-Python/1.0",
      "created_at": "2024-01-15T12:30:00.000Z"
    }
  ],
  "count": 1
}
```

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "type": "error_type"
  }
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Invalid request format or parameters |
| 401 | MISSING_AUTH | Missing authorization header |
| 401 | INVALID_TOKEN | Invalid or expired API token |
| 401 | TOKEN_REVOKED | Token has been revoked |
| 401 | INVALID_ADMIN_CREDENTIALS | Invalid admin credentials |
| 404 | NOT_FOUND | Resource not found |
| 429 | RATE_LIMIT_EXCEEDED | Rate limit exceeded |
| 500 | SERVER_ERROR | Internal server error |

### Example Error Response

```json
{
  "error": {
    "message": "Rate limit exceeded. Maximum 1000 requests per minute.",
    "code": "RATE_LIMIT_EXCEEDED",
    "type": "rate_limit_error"
  }
}
```

## Rate Limiting

Rate limits are enforced per API token. Each response includes rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 2024-01-15T12:31:00.000Z
```

When the rate limit is exceeded, you'll receive a 429 status code:

```json
{
  "error": {
    "message": "Rate limit exceeded. Maximum 1000 requests per minute.",
    "code": "RATE_LIMIT_EXCEEDED",
    "type": "rate_limit_error"
  }
}
```

### Rate Limit Configuration

- Default: 100 requests per minute
- Configurable per token via admin API
- Window: 60 seconds (configurable)

## Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:30:00.000Z",
  "uptime": 12345,
  "database": "connected",
  "redis": "connected",
  "ntth": "configured"
}
```

## Best Practices

1. **Token Security**: Never expose your API tokens in client-side code
2. **Error Handling**: Always check for error responses and handle them appropriately
3. **Rate Limits**: Monitor rate limit headers and implement backoff strategies
4. **Logging**: Use request IDs for debugging and tracking
5. **Timeouts**: Set appropriate timeouts for your HTTP client (30s recommended)

## SDK Examples

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-ntth-your-token",
    base_url="http://localhost:3000/v1"
)

try:
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "user", "content": "Hello!"}
        ]
    )
    print(response.choices[0].message.content)
except Exception as e:
    print(f"Error: {e}")
```

### Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-ntth-your-token',
  baseURL: 'http://localhost:3000/v1'
});

try {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Hello!' }
    ]
  });
  console.log(response.choices[0].message.content);
} catch (error) {
  console.error('Error:', error);
}
```

### cURL

```bash
# Chat completion
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-ntth-your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'

# List models
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer sk-ntth-your-token"

# Admin: Create token
curl -X POST http://localhost:3000/admin/tokens \
  -u admin:password \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "name": "My Token",
    "rate_limit": 1000
  }'
```
