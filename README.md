# NTTH API Gateway

🚀 **OpenAI-compatible API Gateway for NTTH API**

A production-ready API gateway that provides an OpenAI-compatible interface to the NTTH API, with built-in token management, usage tracking, and analytics.

## ✨ Features

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

- **[Setup Guide](./SETUP_README.md)** - Installation and configuration
- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[NTTH API Specs](./ntth.md)** - Original NTTH API documentation

## 🚀 Quick Start

### Using Docker (Recommended)

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
