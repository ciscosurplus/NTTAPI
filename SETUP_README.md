# NTTH API Gateway - Setup Guide

## Overview

This API Gateway provides an OpenAI-compatible interface to the NTTH API with built-in token management, usage tracking, and analytics.

## Features

- ✅ **OpenAI-Compatible API** - Drop-in replacement for OpenAI SDK
- ✅ **Token Management** - Create and manage customer API keys
- ✅ **Usage Tracking** - Track requests, tokens, and costs per customer
- ✅ **Rate Limiting** - Protect your NTTH API usage
- ✅ **Analytics Dashboard** - View usage statistics and trends
- ✅ **Connection Logs** - Monitor all API requests in real-time
- ✅ **Redis Caching** - Fast token validation and rate limiting
- ✅ **PostgreSQL Storage** - Reliable data persistence

## Architecture

```
Client Request → API Gateway → Token Validation → NTTH API → Response
                     ↓
              Usage Tracking
                     ↓
              PostgreSQL Database
```

## Prerequisites

- Node.js 18+ or Docker
- PostgreSQL 14+
- Redis 6+
- NTTH API credentials (Application ID and Secret)

## Quick Start with Docker

### 1. Clone and Configure

```bash
# Copy environment variables
cp .env.example .env

# Edit .env and set your NTTH API credentials
nano .env
```

**Required Configuration:**
```env
NTTH_APP_ID=your-ntth-application-id-here
NTTH_APP_SECRET=your-ntth-application-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-this-password
JWT_SECRET=your-secret-key-here
```

### 2. Start with Docker Compose

```bash
# Create docker-compose.yml (see below)
docker-compose up -d
```

### 3. Initialize Database

```bash
# Run migrations
docker-compose exec app npm run migrate:up
```

### 4. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Create a user and token
curl -X POST http://localhost:3000/admin/users \
  -u admin:your-admin-password \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com"
  }'

# Create an API token (use the user_id from above)
curl -X POST http://localhost:3000/admin/tokens \
  -u admin:your-admin-password \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID_HERE",
    "name": "Test Token",
    "rate_limit": 1000
  }'

# Test chat completion (use the token from above)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

## Manual Setup (Without Docker)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup PostgreSQL

```bash
# Create database
createdb ntth_gateway

# Run migrations
psql -d ntth_gateway -f migrations/001_initial_schema.sql
```

### 3. Setup Redis

```bash
# Start Redis (if not running)
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 5. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Documentation

### OpenAI-Compatible Endpoints

All endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer sk-ntth-xxxxxxxxxxxxxxxx
```

#### Chat Completions

```bash
POST /v1/chat/completions

{
  "model": "gpt-4",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 150
}
```

#### List Models

```bash
GET /v1/models
```

#### Get Model

```bash
GET /v1/models/{model_id}
```

### Admin API Endpoints

All admin endpoints require Basic authentication:

```
Authorization: Basic base64(username:password)
```

#### User Management

```bash
# Create user
POST /admin/users
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### Token Management

```bash
# Create token
POST /admin/tokens
{
  "user_id": "uuid",
  "name": "Production Token",
  "rate_limit": 1000
}

# List tokens
GET /admin/tokens?limit=100&offset=0

# Get token
GET /admin/tokens/{tokenId}

# Update token
PATCH /admin/tokens/{tokenId}
{
  "name": "Updated Name",
  "rate_limit": 2000
}

# Revoke token
POST /admin/tokens/{tokenId}/revoke

# Delete token
DELETE /admin/tokens/{tokenId}
```

#### Usage Analytics

```bash
# Get usage statistics
GET /admin/usage/stats?token_id={id}&start_date=2024-01-01&end_date=2024-12-31

# Get usage logs
GET /admin/usage/logs?token_id={id}&limit=100&offset=0

# Get usage trends
GET /admin/usage/trends?token_id={id}&days=7

# Get token usage summary
GET /admin/usage/summary

# Get connection logs
GET /admin/connections?limit=50
```

## Using with OpenAI SDK

The gateway is fully compatible with the OpenAI SDK. Just change the base URL:

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-ntth-your-token-here",
    base_url="http://localhost:3000/v1"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)
```

### Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-ntth-your-token-here',
  baseURL: 'http://localhost:3000/v1'
});

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello!' }
  ]
});

console.log(response.choices[0].message.content);
```

## Rate Limiting

Rate limits are enforced per token:

- Default: 100 requests per minute (configurable)
- Customizable per token via admin API
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: When the limit resets

## Monitoring

### Logs

Logs are written to:
- Console (structured JSON in production)
- `logs/app.log` (all logs)
- `logs/error.log` (errors only)

### Health Check

```bash
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 12345,
  "database": "connected",
  "redis": "connected",
  "ntth": "configured"
}
```

## Security Best Practices

1. **Change default admin password** in `.env`
2. **Use HTTPS** in production (reverse proxy like nginx)
3. **Rotate JWT secrets** regularly
4. **Enable rate limiting** to prevent abuse
5. **Monitor usage logs** for suspicious activity
6. **Backup database** regularly
7. **Use strong API tokens** (auto-generated)

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -d ntth_gateway -c "SELECT 1"
```

### Redis Connection Errors

```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### NTTH Authentication Errors

1. Verify `NTTH_APP_ID` and `NTTH_APP_SECRET` are correct
2. Check network connectivity to `api.ntth.ai`
3. Review logs in `logs/app.log`

### Token Not Working

1. Ensure token is active: `GET /admin/tokens/{tokenId}`
2. Check rate limits haven't been exceeded
3. Verify token format: `sk-ntth-xxxxxxxxxxxxx`

## Performance Tuning

### Database

```env
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Redis

```env
CACHE_TTL_SECONDS=300
CACHE_ENABLED=true
```

### Rate Limiting

```env
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

## Production Deployment

### Using Docker Compose

See `docker-compose.yml` for a complete production setup with:
- PostgreSQL with persistent storage
- Redis with persistent storage
- Automatic restarts
- Health checks
- Resource limits

### Environment Variables for Production

```env
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Support

For issues or questions:
1. Check the logs in `logs/app.log`
2. Review NTTH API documentation
3. Create an issue on GitHub

## License

MIT License - See LICENSE file for details
