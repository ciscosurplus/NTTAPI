# CLAUDE.md - NTTAPI Documentation for AI Assistants

## Repository Overview

This repository contains the **NTTAPI** (NTTh AI Platform API) documentation and OpenAPI specifications. NTTAPI is a comprehensive AI platform that provides chat completions, RAG workspaces, image generation, function calling, and voice agent capabilities.

**Base URL**: `https://api.ntth.ai/v1`

## Repository Structure

```
NTTAPI/
├── README.md                # Basic project description
├── auth.json               # OpenAPI 3.0.2 spec for AuthX Service
├── chat.json               # OpenAPI 3.0.2 spec for Chat Client API
├── workspace.json          # OpenAPI 3.0.2 spec for Workspace Client API
├── ntth.md                 # Comprehensive developer documentation with examples
├── voice.md                # Voice Agent API documentation and examples
└── CLAUDE.md              # This file - AI assistant guide
```

### File Purposes

| File | Purpose | Key Contents |
|------|---------|--------------|
| `auth.json` | Authentication & authorization API spec | Login endpoints, token management, RBAC |
| `chat.json` | Chat API specification | Chat completions, models, user profiles, image generation |
| `workspace.json` | Workspace API specification | RAG workspaces, threads, file management |
| `ntth.md` | Developer documentation | Quick start guides, API examples, usage patterns |
| `voice.md` | Voice Agent documentation | Voice agent templates, configuration examples |

## Core API Services

### 1. AuthX Service (Authentication)

**Purpose**: Handle authentication and authorization for all API services.

**Key Endpoints**:
- `POST /auth/appLogin` - Application authentication (returns JWT token)
- `POST /auth/login` - User authentication
- `POST /auth/token` - Token verification
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - Session logout

**Authentication Flow**:
```bash
# 1. Authenticate with application credentials
curl -X POST https://api.ntth.ai/v1/auth/appLogin \
  -H 'Content-Type: application/json' \
  -d '{"id": "app-id", "secret": "app-secret"}'

# 2. Use returned token in subsequent requests
Authorization: Bearer <token>
```

**Token Management**:
- Tokens are JWT-based
- Include session start/end times and expiry
- Support RBAC with roles, grants, and scopes

### 2. Chat Client API

**Purpose**: Provide LLM chat completions, model management, and user profiles.

**Key Features**:
- OpenAI-compatible chat API
- Streaming and non-streaming responses
- Multiple LLM providers (Azure, AWS, Groq, etc.)
- Image generation support
- Function calling / tool use
- SafeGuard content moderation
- Follow-up question generation

**Key Endpoints**:
- `POST /chat` - Chat completion (streaming or non-streaming)
- `GET /chat/models` - List available models (filterable by capabilities)
- `POST /chat/follow-up` - Generate follow-up questions
- `GET /chat/chats` - List chat history
- `GET /chat/users/{id}/profile` - Get user profile

**Model Capabilities**:
- `text` - Text generation
- `image-generation` - Image creation (DALL-E, Titan, etc.)
- `vision` - Image understanding
- `tools` - Function calling support
- `reasoning` - Advanced reasoning models
- `workspace` - Workspace-enabled models

**Chat Request Structure**:
```json
{
  "id": "uuid-v4",
  "modelId": "model-uuid",
  "messages": [
    {"role": "system", "content": "System prompt"},
    {"role": "user", "content": "User message"}
  ],
  "stream": true,
  "temperature": 0.7,
  "maxTokens": 2000,
  "safeGuardSettings": {
    "status": "monitor",
    "configuration": {...}
  }
}
```

### 3. Workspace Client API

**Purpose**: Provide RAG (Retrieval-Augmented Generation) workspaces with file-based knowledge bases.

**Key Features**:
- Create and manage workspaces (assistant or RAG type)
- Upload files to workspaces (PDF, documents, etc.)
- Thread-based conversations per user
- File search and code interpreter tools
- Shared workspace access

**Workspace Workflow**:
1. **Create Workspace** - `POST /workspace/workspaces`
2. **Upload Files** - `POST /workspace/workspaces/{id}/files`
3. **Create/Get Thread** - `GET /workspace/workspaces/{id}/thread`
4. **Run Query** - `POST /workspace/workspaces/{id}/thread/run`

**Key Endpoints**:
- `POST /workspace/workspaces` - Create workspace
- `GET /workspace/workspaces` - List workspaces
- `POST /workspace/workspaces/{id}/files` - Upload file
- `GET /workspace/workspaces/{id}/thread` - Get/create thread
- `POST /workspace/workspaces/{id}/thread/run` - Query workspace

**Workspace Types**:
- `assistant` - General purpose AI assistant
- `rag` - Retrieval-Augmented Generation with file search

### 4. Voice Agent API

**Purpose**: Create and manage voice-enabled AI agents for phone conversations.

**Key Features**:
- Template-based agent creation
- Configurable speech, behavior, and personality
- Knowledge base integration
- Call evaluation and human handoff
- Multi-language support

## Development Workflows

### 1. Basic Chat Integration

```bash
# Step 1: Authenticate
TOKEN=$(curl -X POST https://api.ntth.ai/v1/auth/appLogin \
  -H 'Content-Type: application/json' \
  -d '{"id":"app-id","secret":"secret"}' | jq -r '.token')

# Step 2: List models
curl -X GET https://api.ntth.ai/v1/chat/models \
  -H "Authorization: Bearer $TOKEN"

# Step 3: Send chat request
curl -X POST https://api.ntth.ai/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "id": "chat-uuid",
    "modelId": "model-uuid",
    "messages": [{"role":"user","content":"Hello!"}],
    "stream": true
  }'
```

### 2. RAG Workspace Setup

```bash
# Step 1: Create workspace
WORKSPACE_ID=$(curl -X POST https://api.ntth.ai/v1/workspace/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "modelId": "model-uuid",
    "type": "rag",
    "displayName": "My Knowledge Base",
    "description": "Project documentation",
    "configuration": {"temperature": 0.7, "topP": 0.3}
  }' | jq -r '.id')

# Step 2: Upload files
curl -X POST https://api.ntth.ai/v1/workspace/workspaces/$WORKSPACE_ID/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf" \
  -F "type=static" \
  -F "maxChunkSizeTokens=1000"

# Step 3: Create thread (auto-created on first GET)
curl -X GET https://api.ntth.ai/v1/workspace/workspaces/$WORKSPACE_ID/thread \
  -H "Authorization: Bearer $TOKEN"

# Step 4: Query workspace
curl -X POST https://api.ntth.ai/v1/workspace/workspaces/$WORKSPACE_ID/thread/run \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "role": "user",
    "content": [{"type":"text","text":{"value":"What is in the documentation?"}}]
  }'
```

### 3. Function Calling / Tool Use

**Finding Tool-Enabled Models**:
```bash
curl -X GET 'https://api.ntth.ai/v1/chat/models?capabilities=tools' \
  -H "Authorization: Bearer $TOKEN"
```

**Streaming Function Call**:
```json
{
  "id": "chat-uuid",
  "modelId": "model-uuid",
  "stream": true,
  "messages": [
    {"role": "user", "content": "What's the weather in Brisbane, Australia?"}
  ],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get current temperature for a location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {"type": "string"},
          "unit": {"type": "string", "enum": ["celsius","fahrenheit"]}
        },
        "required": ["location", "unit"]
      }
    }
  }]
}
```

**Response Handling**:
- Text responses: Standard SSE chunks
- Function calls: SSE data starting with `data: {` containing function name and arguments

### 4. Image Generation

```bash
# Step 1: Find image generation models
curl -X GET 'https://api.ntth.ai/v1/chat/models?capabilities=image-generation' \
  -H "Authorization: Bearer $TOKEN"

# Step 2: Request image
curl -X POST https://api.ntth.ai/v1/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "chat-uuid",
    "modelId": "dalle-3-uuid",
    "messages": [{"role":"user","content":"A cat in space"}]
  }'

# Step 3: Response contains image ID after "WAIT_FOR_IMAGE"
# Extract ID and download: /chat/image/get/{imageId}
```

## Key Conventions for AI Assistants

### 1. Authentication

- **Always authenticate first** using `/auth/appLogin` or `/auth/login`
- Store and reuse tokens (they expire after `expiresIn` seconds)
- Include token in all requests: `Authorization: Bearer <token>`
- Check token validity with `/auth/token` endpoint

### 2. UUID Management

- Chat IDs must be UUIDv4 format
- Use same chat ID to continue conversations
- Generate new UUID for new conversations
- Model IDs are UUIDs from `/chat/models` response

### 3. Streaming Responses

- Set `Accept: text/event-stream` header
- Set `"stream": true` in request body
- Parse SSE format: `data: <content>\n\n`
- Look for `finalResult:` marker with metadata
- Function calls in SSE: `data: { [...] }` format

### 4. Error Handling

**Common HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (invalid data)
- `403` - Unauthorized (insufficient permissions)
- `500` - Server Error

**Error Response Format**:
```json
{
  "message": "ERROR_TYPE",
  "properties": [...]  // Optional validation details
}
```

### 5. SafeGuard Settings

The API includes content moderation capabilities:

```json
{
  "safeGuardSettings": {
    "status": "disabled|monitor|enforced",
    "configurationStyle": "easy|advanced",
    "configuration": {
      "moderation": "disabled|one|two|three|four",
      "personalInformation": "disabled|one|two|three|four",
      "promptInjection": "disabled|one|two|three|four",
      "unknownLinks": "disabled|one|two|three|four"
    }
  }
}
```

**Levels**:
- `disabled` - No checking
- `one` to `four` - Increasing strictness

### 6. File Operations (Workspaces)

**Supported File Types**:
- Documents: PDF, DOCX, TXT
- Code files
- Spreadsheets

**Chunking Strategies**:
- `auto` - Automatic chunking by provider
- `static` - Custom chunk sizes with overlap

**Upload Parameters**:
- `maxChunkSizeTokens` - 100 to 4096 tokens per chunk
- `chunkOverlapTokens` - Overlap between chunks (minimum 1)

### 7. RBAC and Permissions

**Grant Structure**:
```json
{
  "module": "ntthai",
  "resource": "chat",
  "scope": "chat|whisper|image|read|create|update|delete"
}
```

**Common Scopes**:
- Chat: `chat`, `whisper`, `image`
- Workspace: `read`, `create`, `update`, `delete`, `chat`
- User: `read`

## Common Patterns and Best Practices

### 1. Conversation Management

```javascript
// Maintain conversation history
const messages = [
  {role: "system", content: "You are a helpful assistant"},
  {role: "user", content: "First question"},
  {role: "assistant", content: "First answer"},
  {role: "user", content: "Follow-up question"}
];
```

### 2. Model Selection

```javascript
// Filter models by capability
GET /chat/models?capabilities=text,vision
GET /chat/models?capabilities=tools
GET /chat/models?classification=omni
GET /chat/models?provider=azure&type=openai
```

### 3. Temperature and Sampling

- `temperature` (0.0 - 2.0): Higher = more random, Lower = more focused
- `topP` (0.0 - 1.0): Nucleus sampling probability mass
- `presencePenalty` (-2.0 to 2.0): Penalize repeated tokens
- `frequencyPenalty` (-2.0 to 2.0): Penalize frequent tokens
- `seed`: For reproducible outputs

### 4. Workspace File Status Tracking

```javascript
// File upload is asynchronous
// Check status with GET /workspace/workspaces/{id}/files
{
  "status": "in_progress|completed|cancelled|failed|unknown"
}
```

### 5. Thread Management

- One thread per user per workspace
- Threads maintain conversation history
- Use `DELETE /workspace/workspaces/{id}/thread` to reset

## API Response Formats

### Chat Completion (Streaming)

```
data: {"role":"assistant","content":"Hello"}

finalResult: {"requestStartTime":123,"providerStartTime":456,"requestEndTime":789}
```

### Chat Completion (Non-Streaming)

```json
{
  "metadata": {
    "provider": "azure",
    "model": "gpt-4o",
    "analytics": {...},
    "usage": {"promptTokens": 100, "responseTokens": 200}
  },
  "role": "assistant",
  "content": "Response text",
  "type": "text"
}
```

### Function Call Response

```json
{
  "role": "assistant",
  "content": "",
  "toolCalls": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "arguments": "{\"location\":\"Brisbane\",\"unit\":\"celsius\"}"
    }
  }]
}
```

### Workspace Thread Response (Streaming)

```
{"event":"delta","data":{"type":"text","value":"Word","annotations":[]}}
{"event":"completed","data":null}
{"event":"final","data":{"threadMessageIds":{...},"metadata":{...}}}
```

## Important Notes for AI Development

### 1. Rate Limiting
- The API may implement rate limiting
- Handle 429 (Too Many Requests) responses gracefully
- Implement exponential backoff for retries

### 2. Token Budget Management
- Monitor `usage` in responses for token consumption
- Track `promptTokens` and `responseTokens`
- Set appropriate `maxTokens` limits

### 3. Workspace Best Practices
- Upload files before querying workspace
- Wait for file processing to complete (`status: "completed"`)
- Use appropriate chunking strategy for document type
- Configure `temperature` and `topP` per use case

### 4. Security Considerations
- Never commit authentication credentials
- Rotate application secrets regularly
- Use HTTPS for all API calls
- Validate and sanitize user inputs before sending to API

### 5. Model Capabilities Matrix

| Classification | Capabilities | Use Cases |
|---------------|--------------|-----------|
| `text` | text | General chat, Q&A |
| `image-generation` | image-generation | DALL-E, Stable Diffusion |
| `vision` | text, vision | Image understanding |
| `omni` | text, vision, tools | Multi-modal tasks |

### 6. Workspace vs Chat Decision Tree

**Use Chat API when**:
- Simple Q&A without document context
- Image generation
- Function calling / tool use
- Streaming conversations

**Use Workspace API when**:
- RAG over documents
- Multi-user access to knowledge base
- Persistent file-based context
- Code interpreter needs

## Testing and Development

### Environment Variables

```bash
export NTTAPI_BASE_URL="https://api.ntth.ai/v1"
export NTTAPI_APP_ID="your-app-id"
export NTTAPI_APP_SECRET="your-app-secret"
```

### Quick Test Script

```bash
#!/bin/bash
# Authenticate
TOKEN=$(curl -s -X POST $NTTAPI_BASE_URL/auth/appLogin \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$NTTAPI_APP_ID\",\"secret\":\"$NTTAPI_APP_SECRET\"}" | jq -r '.token')

# Test chat
curl -X POST $NTTAPI_BASE_URL/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "'$(uuidgen)'",
    "modelId": "model-uuid",
    "messages": [{"role":"user","content":"Test"}],
    "stream": false
  }'
```

## Additional Resources

- **Base URL**: `https://api.ntth.ai/v1`
- **OpenAPI Specs**: See `auth.json`, `chat.json`, `workspace.json`
- **Examples**: See `ntth.md` for comprehensive examples
- **Voice Agents**: See `voice.md` for voice assistant documentation

## Changelog and Version Info

- **OpenAPI Version**: 3.0.2
- **API Version**: 1.0.0 (AuthX), 3.0.0 (Chat, Workspace)
- **Last Updated**: 2025-11-18

---

This documentation is designed to provide AI assistants with comprehensive context about the NTTAPI codebase structure, API capabilities, development workflows, and best practices for building applications that integrate with the NTTh AI Platform.
