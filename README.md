# NTTAPI Repository

🚀 **NTTH AI Platform - API Documentation & OpenAI-Compatible Gateway**

This repository contains two primary components:
1. **NTTH API Documentation** - Complete OpenAPI specifications and developer guides for the NTTH AI Platform
2. **API Gateway Implementation** - Production-ready OpenAI-compatible gateway with token management and usage tracking

## 📋 Table of Contents

- [What's Inside](#-whats-inside)
- [Gateway Features](#-gateway-features)
- [Documentation](#-documentation)
  - [OpenAPI Specifications](#openapi-specifications)
- [Which Option Should I Use?](#-which-option-should-i-use)
- [Quick Start](#-quick-start)
  - [Option 1: Using NTTH API Directly](#option-1-using-ntth-api-directly)
  - [Option 2: Deploy API Gateway](#option-2-deploy-api-gateway-recommended-for-production)
- [API Endpoints](#-api-endpoints)
- [Usage with OpenAI SDK](#-usage-with-openai-sdk)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Security Best Practices](#-security-best-practices)
- [Support](#-support)

## 📦 What's Inside

### NTTH API Documentation
Complete documentation for the NTTH AI Platform API (`https://api.ntth.ai/v1`):

- **`auth.json`** - AuthX Service OpenAPI 3.0.2 specification (authentication & authorization)
- **`chat.json`** - Chat Client API OpenAPI spec (LLM chat completions, models, profiles)
- **`workspace.json`** - Workspace Client API spec (RAG workspaces, file management)
- **`ntth.md`** - Comprehensive developer documentation with examples
- **`voice.md`** - Voice Agent API documentation and templates
- **`CLAUDE.md`** - AI assistant integration guide

### API Gateway Implementation
Production-ready gateway that provides an OpenAI-compatible interface to NTTH API:

- **Token management** with rate limiting per key
- **Usage analytics** and request logging
- **OpenAI SDK compatibility** (drop-in replacement)
- **Docker deployment** with PostgreSQL and Redis
- **Admin endpoints** for user/token management

## ✨ Gateway Features

- **🔌 OpenAI-Compatible** - Drop-in replacement for OpenAI SDK clients
- **🔐 Token Management** - Secure API key generation and management
- **📊 Usage Analytics** - Track requests, tokens, and costs per customer
- **⚡ Rate Limiting** - Protect your NTTH API usage with customizable limits
- **📈 Analytics Dashboard** - Real-time usage statistics and trends (API endpoints)
- **🔍 Connection Logs** - Monitor all API requests with detailed logging
- **💾 Redis Caching** - Fast token validation and rate limiting
- **🗄️ PostgreSQL** - Reliable data persistence
- **🐳 Docker Ready** - Easy deployment with Docker Compose

## 📚 Documentation

### For NTTH API Users
- **[NTTH API Developer Guide](./ntth.md)** - Complete examples and usage patterns
- **[Voice Agent Guide](./voice.md)** - Voice assistant templates and configuration
- **[AI Assistant Guide](./CLAUDE.md)** - Context for AI-powered development

### For Gateway Deployment
- **[Setup Guide](./SETUP_README.md)** - Installation and configuration
- **[API Documentation](./API_DOCUMENTATION.md)** - Complete gateway API reference

### OpenAPI Specifications
The repository includes OpenAPI 3.0.2 specifications that can be imported into API tools:

```bash
# Import into Postman, Insomnia, or Swagger Editor
auth.json       # Authentication API specification
chat.json       # Chat/LLM API specification
workspace.json  # RAG Workspace API specification
```

**Using with API Clients:**
- **Postman**: Import → Select OpenAPI 3.0 → Choose auth.json, chat.json, or workspace.json
- **Insomnia**: Import/Export → Import from file → Select specification file
- **Swagger Editor**: File → Import file → Choose specification
- **OpenAPI Generator**: Generate client SDKs in any language

**Example: Generate Python client**
```bash
npm install -g @openapitools/openapi-generator-cli
openapi-generator-cli generate \
  -i chat.json \
  -g python \
  -o ./python-client
```

## 🤔 Which Option Should I Use?

### Use NTTH API Directly (Option 1) if:
- ✅ You want to integrate directly with NTTH AI Platform
- ✅ You're building a simple application or proof-of-concept
- ✅ You don't need usage analytics or token management
- ✅ You have your NTTH API credentials ready

### Use API Gateway (Option 2) if:
- ✅ You want OpenAI SDK compatibility (drop-in replacement)
- ✅ You need to manage multiple users/customers with separate API keys
- ✅ You require usage tracking, analytics, and rate limiting
- ✅ You want to control costs and monitor API consumption
- ✅ You're building a production SaaS application

## 🚀 Quick Start

### Option 1: Using NTTH API Directly

If you want to use the NTTH API directly without the gateway:

#### Prerequisites
- NTTH API credentials (Application ID and Secret)
- Access to `https://api.ntth.ai/v1`

#### Installation
```bash
# Clone the repository for documentation
git clone <repository-url>
cd NTTAPI

# Read the documentation
cat ntth.md        # Developer guide with examples
cat voice.md       # Voice agent documentation
cat CLAUDE.md      # AI assistant integration guide
```

#### Basic Usage
```bash
# 1. Authenticate with NTTH API
TOKEN=$(curl -X POST https://api.ntth.ai/v1/auth/appLogin \
  -H 'Content-Type: application/json' \
  -d '{"id":"your-app-id","secret":"your-app-secret"}' | jq -r '.token')

# 2. List available models
curl -X GET https://api.ntth.ai/v1/chat/models \
  -H "Authorization: Bearer $TOKEN"

# 3. Send a chat request
curl -X POST https://api.ntth.ai/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "id": "'$(uuidgen)'",
    "modelId": "your-model-uuid",
    "messages": [{"role":"user","content":"Hello!"}],
    "stream": true
  }'
```

See **[ntth.md](./ntth.md)** for comprehensive examples including:
- RAG workspace setup
- Function calling / tool use
- Image generation
- Voice agent configuration

---

### Option 2: Deploy API Gateway (Recommended for Production)

Deploy the OpenAI-compatible gateway for easier integration and usage tracking.

#### Prerequisites
- Docker and Docker Compose (recommended) OR
- Node.js 18+, PostgreSQL 14+, Redis 7+ (manual setup)
- NTTH API credentials (Application ID and Secret)

#### Using Docker (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd NTTAPI

# 2. Configure environment
cp .env.example .env
# Edit .env and set your NTTH_APP_ID and NTTH_APP_SECRET

# 3. Start services
docker-compose up -d

# 4. Initialize database
docker-compose exec app npm run migrate:up

# 5. Create your first user and token
curl -X POST http://localhost:3000/admin/users \
  -u admin:your-password \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com"}'

# 6. Test the API
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello!"}]}'
```

### Manual Setup

```bash
# Install dependencies
npm install

# Setup PostgreSQL and run migrations
psql -d ntth_gateway -f migrations/001_initial_schema.sql

# Start Redis
redis-server

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
npm run dev
```

## 🔌 API Endpoints

### OpenAI-Compatible Endpoints

```
POST   /v1/chat/completions    # Chat completion
GET    /v1/models              # List models
GET    /v1/models/:model       # Get model info
```

### Admin Endpoints (Basic Auth)

```
# User Management
POST   /admin/users            # Create user

# Token Management
POST   /admin/tokens           # Create token
GET    /admin/tokens           # List tokens
GET    /admin/tokens/:id       # Get token
PATCH  /admin/tokens/:id       # Update token
POST   /admin/tokens/:id/revoke # Revoke token
DELETE /admin/tokens/:id       # Delete token

# Analytics
GET    /admin/usage/stats      # Usage statistics
GET    /admin/usage/logs       # Usage logs
GET    /admin/usage/trends     # Usage trends
GET    /admin/usage/summary    # Token usage summary
GET    /admin/connections      # Connection logs
```

## 💻 Usage with OpenAI SDK

The gateway is fully compatible with the OpenAI SDK:

### Python

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-ntth-your-token",
    base_url="http://localhost:3000/v1"
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

### Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'sk-ntth-your-token',
  baseURL: 'http://localhost:3000/v1'
});

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
console.log(response.choices[0].message.content);
```

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└─────┬───────┘
      │ Bearer Token
      ▼
┌─────────────────────────────────┐
│      API Gateway (Express)       │
│  ┌─────────────────────────┐    │
│  │  Token Validation       │    │
│  │  Rate Limiting          │    │
│  │  Request Transformation │    │
│  └─────────────────────────┘    │
└─────┬───────────────────────────┘
      │
      ├──────────────┬──────────────┬──────────────┐
      ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   NTTH   │  │PostgreSQL│  │  Redis   │  │ Logging  │
│   API    │  │ Database │  │  Cache   │  │  System  │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

## 📊 Features Overview

### Token Management
- Generate secure API keys with custom prefixes
- Set individual rate limits per token
- Track token usage and last access
- Revoke or delete tokens instantly

### Usage Tracking
- Log every API request with full details
- Track token consumption per request
- Monitor request duration and status codes
- View usage by model, endpoint, and date

### Analytics
- Real-time usage statistics
- Usage trends over time
- Token usage summary
- Error rate monitoring
- Connection logs with IP and user agent

### Security
- bcrypt token hashing
- JWT for admin authentication
- Rate limiting per token
- HTTPS recommended for production
- Environment-based configuration

## 🔒 Security Best Practices

1. **Change default admin password** in production
2. **Use HTTPS** with a reverse proxy (nginx/Caddy)
3. **Rotate JWT secrets** regularly
4. **Enable rate limiting** to prevent abuse
5. **Monitor logs** for suspicious activity
6. **Backup database** regularly
7. **Use environment variables** for secrets

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Authentication**: bcrypt, JWT
- **Logging**: Winston
- **Deployment**: Docker, Docker Compose

## 📈 Performance

- **Token caching** in Redis for fast validation
- **Connection pooling** for database efficiency
- **Request logging** with minimal overhead
- **Graceful shutdown** handling
- **Health checks** for monitoring

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

## 🆘 Support

- 📖 [Setup Guide](./SETUP_README.md)
- 📚 [API Documentation](./API_DOCUMENTATION.md)
- 🐛 Issues: Create an issue on GitHub

## 🎯 Roadmap

- [ ] Web-based admin dashboard UI
- [ ] GraphQL API support
- [ ] Webhook notifications
- [ ] Multi-tenancy support
- [ ] Advanced analytics and reporting
- [ ] Cost estimation and budgeting
- [ ] API key rotation
- [ ] OAuth2 support

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!
