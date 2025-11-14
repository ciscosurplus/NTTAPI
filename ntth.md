Overview
Welcome to the NTTh Playground Developer Portal Documentation!

This guide provides all the information you need to get started with the AI Playground APIs.

To begin, the first prerequisite is to create an application in Application Management. Simply follow these steps:


In the Playground, click on the Profile menu.
Navigate to the Developer section.
Click on New Application and fill out the required details.

If you have any questions or need further assistance, feel free to reach out. We're here to help! 

Note:
The API provided is an early version and is subject to continuous improvements and enhancements. While we strive to avoid breaking changes, there may be instances where they are unavoidable.

API Reference
This section contains detailed information about our APIs. We document our APIs using OpenAPI. The base path of the API is https://api.ntth.ai/v1. 


AuthX OpenAPI Specification
Chat OpenAPI Specification
Workspaces OpenAPI Specification
Quick Start
Following are some simple examples that illustrate how to login with your application key, how to create a chat request and how to setup and use workspaces. The examples use CURL.

## Experience Layer Update

Stage 4 introduces a turnkey experience layer that wraps the core services:

- **REST** â€“ `POST /api/chat/turn` orchestrates a full turn (intent resolution, guardrails, workspace enrichment). Requests must include an `Authorization: Bearer <token>` header issued by AuthX.
- **Session Lookup** â€“ `GET /api/chat/session/:sessionId` surfaces transcript, token budgets, and slot values for active sessions.
- **WebSocket** â€“ Connect to `ws://<host>/ws/chat` with the same `Authorization` header to exchange `chat_turn` and `typing` messages. Responses reuse the REST payload envelope and emit structured `error` events with the same error codes.
- **CORS** â€“ Allowed origins default to `http://localhost:5173` and can be overridden via `CORS_ALLOWED_ORIGINS` (comma-delimited). Tokens are introspected on every request through AuthX to keep scopes aligned.

### REST Example

```bash
curl -X POST http://localhost:3000/api/chat/turn \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "demo-session",
    "userId": "web-user",
    "workspaceId": "ws-123",
    "message": "Summarise workspace status"
  }'
```

Successful responses include `response` (assistant text + intent), `history` (roles/messages), and `tokens` (budget/usage/remaining). Error bodies expose a stable `error` code such as `rate_limited`, `profanity_detected`, or `chat_api_error` so clients can map UX copy directly.

### WebSocket Message Contract

```json
{
  "type": "chat_turn",
  "payload": {
    "sessionId": "demo-session",
    "userId": "web-user",
    "message": "Stream this over webs",
    "workspaceId": "ws-123"
  }
}
```

```json
{
  "type": "chat_response",
  "payload": {
    "sessionId": "demo-session",
    "response": {
      "type": "success",
      "response": "Assistant text",
      "intent": "chat.default"
    },
    "tokens": { "budget": 4000, "usage": 120, "remaining": 3880 }
  }
}
```

`typing` messages are echoed so channels can display live indicators. Guardrail and upstream failures are returned as `error` events using the same error codes as the REST layer.

### Web UI (React / Vite)

The repository now ships with `apps/web`, a Vite-powered front end that exercises the orchestration stack:

1. `npm run web:dev` â€“ launches the client at `http://localhost:5173` with proxies to the local API/WebSocket endpoints.
2. Paste an AuthX bearer token into the UIâ€™s credential field (stored locally for convenience).
3. Optionally enter a workspace ID; the UI surfaces token budgets, transcript history, and detailed error banners mapped from server error codes.
4. `npm run web:build` produces static assets under `apps/web/dist`. Set `STATIC_ASSETS_DIR` to this path and restart `npm run dev` to serve the UI from the Node server.

Environment knobs for the experience layer live in `.env.example` (`HTTP_PORT`, `CHAT_DEFAULT_MODEL_ID`, `SESSION_TOKEN_BUDGET`, etc.). Update them per environment to keep guardrails, token budgets, and allowed origins in sync with deployment targets.

Authentication
An authethenticated session is a pre-requisite for subsequent API calls. The token is passed as a HTTP header value. 

See here for more details.

Request
Auth Request
copy
curl --location 'https://api.ntth.ai/v1/auth/appLogin' \
-H 'Content-Type: application/json' \
--data '{
    "id": "ead07e3a-1a1f-4339-9fd5-8284df24f843",
    "secret": "application secret"
}'
Response
The response contains the token value that needs to be used in subsequent requests.

Auth Response
copy
{
  "token": "token that is used for subsquent requests",
  "region": "us",
  "applicationId": "ead07e3a-1a1f-4339-9fd5-8284df24f843",
  "applicationName": "API Client Application",
  "clientType": "application",
  "tenant": {
    "id": "399ff6db-0f5d-48f2-8024-6f5510ec8e43",
    "name": "ntth.ai"
  },
  "rbac": {
    "roles": [
      "b5bb5812-1e20-4b67-9827-57619bd5ecb5"
    ],
    "roleNames": [
      "Chat User"
    ],
    "scope": {
      "globalServices": "local",
      "ntthai": "local"
    },
    "grants": [
      {
        "name": "ntthai.chat.chat",
        "module": "ntthai",
        "resource": "chat",
        "scope": "chat"
      },
      {
        "name": "ntthai.chat.whisper",
        "module": "ntthai",
        "resource": "chat",
        "scope": "whisper"
      },
      {
        "name": "ntthai.chat.image",
        "module": "ntthai",
        "resource": "chat",
        "scope": "image"
      },
      {
        "name": "globalServices.user.read",
        "module": "globalServices",
        "resource": "user",
        "scope": "read"
      },
      {
        "name": "globalServices.tenant.read",
        "module": "globalServices",
        "resource": "tenant",
        "scope": "read"
      },
      {
        "name": "ntthai.workspace.read",
        "module": "ntthai",
        "resource": "workspace",
        "scope": "read"
      },
      {
        "name": "ntthai.workspace.create",
        "module": "ntthai",
        "resource": "workspace",
        "scope": "create"
      },
      {
        "name": "ntthai.workspace.update",
        "module": "ntthai",
        "resource": "workspace",
        "scope": "update"
      },
      {
        "name": "ntthai.workspace.delete",
        "module": "ntthai",
        "resource": "workspace",
        "scope": "delete"
      },
      {
        "name": "ntthai.workspace.chat",
        "module": "ntthai",
        "resource": "workspace",
        "scope": "chat"
      }
    ]
  },
  "sessionStart": "2025-01-28T14:24:34.233Z",
  "sessionEnd": "2025-01-29T14:24:34.233Z",
  "expiresIn": 86400,
  "expiry": "2025-01-29T14:24:34.233Z"
}
This sectiond details tips for using the Chat API service as well as various examples of how to use the API.
Chat Request
Following is a simple example that shows how to create a chat request.

The chat request payload must include a unique uuidv4 value for the id value. This id is maintained for the duration of a single chat conversation or when it is resumed from the chat history. If you are starting a new chat then generate a new uuidv4 value. The system message can be tuned as you wish. The Authorization header uses the token value from the application login. 

See here for more details.

Request
Chat Request
copy
curl --location 'https://api.ntth.ai/v1/chat' \
--header 'Accept: text/event-stream' \
--header 'Content-Type: application/json' \
--header 'Authorization: token from application login' \
--data '{
    "id": "2677de2c-33df-4024-b257-35ca0cff83c5",
    "modelId": "cc5bab32-9ccf-472b-9d76-91fc2ec5b047",
    "messages": [
        {
        "role": "system",
        "content": "You are an AI assistant that helps answering questions"
        },
        {
        "role": "user",
        "content": "Why do cats purr?"
        }
    ],
    "maxTokens": 2000,
    "stream": true,
    "presencePenalty": 0,
    "stop": null,
    "frequencyPenalty": 0,
    "topP": 0.95,
    "temperature": 0.7,
    "safeGuardSettings": {
        "status": "monitor",
        "configurationStyle": "easy",
        "configuration": {
        "moderation": "one",
        "personalInformation": "one",
        "promptInjection": "one",
        "unknownLinks": "one"
        }
    },
    "locale": "en"
}'
Response
The response is streamed from the API.

Chat Response
copy
Cats purr for several reasons, and while the exact mechanisms and reasons are not fully understood,
there are some
widely accepted explanations:

1. **Communication**: Cats often purr to communicate with their owners and other cats. For example,
a mother cat will
purr to communicate with her kittens, and kittens will purr back. It's a form of bonding and
reassurance.

2. **Comfort and Contentment**: One of the most common reasons cats purr is because they are happy
and content. This can
occur when they are being petted, are in a comfortable environment, or are resting.

3. **Self-Healing**: Some studies suggest that purring has a therapeutic effect on cats. The
frequency of the vibrations
(between 25 and 150 Hertz) is thought to promote healing, relieve pain, and even strengthen bones.

4. **Stress and Anxiety**: Cats may also purr when they are anxious or stressed, as a way to calm
themselves. This is
similar to humans humming or talking to themselves when nervous.

5. **Seeking Attention**: Cats may purr to get attention from their owners, especially if they
associate purring with
getting fed or receiving affection.

Overall, purring is a multifaceted behavior that serves various purposes depending on the context
and the individual
cat.

finalResult:
{"requestStartTime":1738085058052,"providerStartTime":1738085058227,"requestEndTime":1738085062853}
Image Generation Request
Image Generation via the Playground API is a multi step process.


Identify a Model that supports image generation
Send an Image Chat Request
Download the image via the Playground API
1. List Models that Support Image Generation

Request
List Image Generation Models Request
copy
curl -X GET 'https://api.ntth.ai/v1/chat/models?capabilities=image-generation' \
--header 'Authorization: token from application login'
Response
The response will be a standard list of models filtered to only those that support image generation.

List Image Generation Models Response
copy

[
	{
		"priority": 0,
		"provider": "azure",
		"type": "openai",
		"name": "Dalle 3",
		"version": "3.0",
		"deploymentName": "Dalle3",
		"createdAt": "2024-08-27T16:45:09.569Z",
		"updatedAt": "2025-08-08T14:48:04.711Z",
		"keyName": "ai-eastus-openai-studio1",
		"capabilities": [
			"image-generation"
		],
		"classification": "image-generation",
		"providerPriority": 12,
		"id": "51ae3a72-d8ea-4944-aa17-f996992f3559"
	},
	{
		"provider": "aws",
		"type": "foundation",
		"name": "Titan Image",
		"version": "2.0",
		"deploymentName": "amazon.titan-image-generator-v2:0",
		"classification": "image-generation",
		"capabilities": [
			"image-generation"
		],
		"keyName": "aws",
		"createdAt": "2024-12-10T16:36:21.753Z",
		"updatedAt": "2025-08-05T19:48:16.961Z",
		"providerPriority": 8,
		"priority": 2,
		"id": "606a9431-9f51-4ca2-8695-c8767318489d"
	}
    .....
]
2. Send an Image Chat Request

Request
Image Chat Request
copy
curl --location 'https://api.ntth.ai/v1/chat' \
--header 'Accept: text/event-stream' \
--header 'Content-Type: application/json' \
--header "Authorization: token from application login" \
--data '{
    "id": "2677de2c-33df-4024-b257-35ca0cff83c5",
    "modelId": "606a9431-9f51-4ca2-8695-c8767318489d",
    "stream": true,
    "messages": [
        {
        "role": "system",
        "content": "You are an AI assistant that helps answering questions"
        },
        {
        "role": "user",
        "content": "Give me an image of Washington DC in cherry blossom season"
        }
    ]
}'
Response
Image Chat Response
copy

WAIT_FOR_IMAGEfd7d30d7a3326aec8138ffcddb9101e1a347c521c9eb8fcf

finalResult: {"requestStartTime":1756820762091,"providerStartTime":1756820762100,"requestEndTime":1756820772884}
3. Download the image via the Playground API

Request
Grab the image ID from the Image Chat Request that followed the WAIT_FOR_IMAGE text - In the example above this is 'fd7d30d7a3326aec8138ffcddb9101e1a347c521c9eb8fcf'

The output of this command is an image file that can be opened by an image-viewer

Download Image Request
copy

Workspaces
Following is a simple example that show the process of creating and using a workspace. 

The process is multi-step and you will need to:


create the workspace
upload some files
create a thread
query the workspace

See here for more details.

Create the workspace

Request
Create Workspace Request
copy
curl --location 'https://api.ntth.ai/v1/workspace/workspaces' \
--header 'Content-Type: application/json' \
--header 'Authorization: token from application login' \
--data '{
    "configuration": {
        "instructions": "You are a helpful assistant who answers queries and follows all system instructions.","temperature": 0.7,
        "topP": 0.3,
        "conversationPrimers": []
    },
    "displayName": "Sample Workspace",
    "description": "A short description",
    "modelId": "6c26a584-a988-4fed-92ea-f6501429fab9",
    "provider": "openai",
    "type": "rag"
}'
Response
The response will return the workspace id, an important piece of information that will be used in subsequent requests.

Create Workspace Response
copy
{
  "providerId": "asst_8OEAGlQvNQDezb9cGRwWOcQF",
  "modelId": "6c26a584-a988-4fed-92ea-f6501429fab9",
  "displayName": "Sample Workspace",
  "description": "A short description",
  "tenantId": "********",
  "userId": "********",
  "contactEmail": "********",
  "provider": "openai",
  "type": "rag",
  "filesOnly": false,
  "access": {
    "shared": false,
    "tenantRestricted": false
  },
  "deleted": false,
  "configuration": {
    "instructions": "You are a helpful assistant who answers queries and follows all system instructions.","temperature": 0.7,
    "topP": 0.3,
    "conversationPrimers": [],
    "tools": [
      {
        "type": "file_search"
      }
    ],
    "toolResources": {
      "fileSearch": {
        "vectorStoreIds": [
          "********"
        ]
      }
    }
  },
  "createdAt": "2025-03-07T11:32:21.697Z",
  "updatedAt": "2025-03-07T11:32:21.697Z",
  "id": "workspace_id"
}
Upload a file

Uses the workspace_id for the workspace. One request needs to be made for each file in the workspace. File upload is a fast asynchronous process, you can use the GET /file API to get the status of uploads if required. 

Request
Upload Workspace File Request
copy
curl --location 'https://api.ntth.ai/v1/workspace/workspaces/workspace_id/files' \
--header 'Authorization: token from application login' \
--form 'file=@"/C:/Users/xxxx/Downloads/workspacefile.pdf"' \
--form 'maxChunkSizeTokens="1000"' \
--form 'chunkOverlapTokens="400"' \
--form 'type="static"'
Response
Upload Workspace File Response
copy
{
    "id": "file-BBAMuHtxqyb5TaajjELUiD",
    "filename": "workspacefile.pdf",
    "status": "in_progress",
    "bytes": 747956,
    "createdAt": 1741347660000
}
Create a thread

A thread is what allows multiple users to query a single workspace. Uses the workspace_id for the workspace. 

Request
Create a Workspace Thread Request
copy
curl --location 'https://api.ntth.ai/v1/workspace/workspaces/workspace_id/thread' \
--header 'Authorization: token from application login'
Response
Create a Workspace Thread Response
copy
{
    "providerId": "thread_EKhHhnpvXove1ncubyTzQdJQ",
    "workspaceId": "workspace_id",
    "tenantId": "********",
    "userId": "********",
    "deleted": false,
    "configuration": null,
    "createdAt": "2025-03-07T11:49:32.116Z",
    "updatedAt": "2025-03-07T11:49:32.116Z",
    "id": "thread_id"
}
Query the workspace

Accepts a single text value, the query, in the content field, the response is streamed. Uses the workspace_id for the workspace.

Request
Query Workspace Request
copy
curl --location 'https://api.ntth.ai/v1/workspace/workspaces/workspace_id/thread/run' \
--header 'Accept: text/event-stream' \
--header 'Content-Type: application/json' \
--header 'Authorization: token from application login' \
--data '{
    "role": "user",
    "content": [
        {
            "type": "text",
            "text": {
                "value": "Testing the workspace"
            }
        }
    ]
}'
Response
Query Workspace Response
copy
{"event":"delta","data":{"type":"text","value":"It","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" seems","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" like","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" you're","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" continuing","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" to","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" test","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" the","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" workspace","annotations":[]}}
{"event":"delta","data":{"type":"text","value":".","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" If","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" there's","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" anything","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" specific","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" you'd","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" like","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" to","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" try","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" or","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" any","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" questions","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" you","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" have","annotations":[]}}
{"event":"delta","data":{"type":"text","value":",","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" just","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" let","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" me","annotations":[]}}
{"event":"delta","data":{"type":"text","value":" know","annotations":[]}}
{"event":"delta","data":{"type":"text","value":"!","annotations":[]}}
{"event":"completed","data":null}
{"event":"final","data":{"threadMessageIds":{"user":"********","assistant":"********"},"metadata":{"provider":"openai","model":"gpt-4o","analytics":{"requestStartTime":1741348541225,"providerStartTime":1741348541581,"requestEndTime":1741348544731}}}}
Function Calls
The following example shows how to identify models that support Function calls and then use Function calling with the Playground API 

List Models that Support Functions

Request
List Tools Enabled Models Request
copy
curl -X GET 'https://api.ntth.ai/v1/chat/models?capabilities=tools' \
--header 'Authorization: token from application login'
Response
The response will be a standard list of models filtered to only those that support Functions.

List Tools Enabled Models Response
copy
[
	{
		"provider": "azure",
		"type": "openai",
		"name": "GPT-4o",
		"version": "2024-05-13",
		"deploymentName": "gpt-4o",
		"createdAt": "2024-06-03T15:05:38.994Z",
		"updatedAt": "2025-06-12T17:15:43.545Z",
		"keyName": "nttai-prod-default-oai",
		"classification": "omni",
		"capabilities": [
			"text",
			"vision",
			"tools"
		],
		"providerPriority": 2,
		"priority": 2,
		"id": "cc5bab32-9ccf-472b-9d76-91fc2ec5b047"
	},
	{
		"provider": "groq",
		"type": "google-gemma",
		"name": "gemma2-9b-it",
		"version": "2",
		"deploymentName": "gemma2-9b-it",
		"createdAt": "2024-06-14T23:21:50.514Z",
		"updatedAt": "2025-06-12T17:21:32.441Z",
		"keyName": "groq",
		"classification": "text",
		"capabilities": [
			"text",
			"tools"
		],
		"providerPriority": 4,
		"priority": 2,
		"id": "85e7b741-8d89-44d9-a806-789473996613"
	}
    
    ...
]
Function Usage - Non Streaming

The Playground API supports streaming and non streaming Function call requests. The simplest method of utilizing Functions is non streaming as it is a standard REST POST request with a single JSON response. 

Request
Function Call (Non Streaming) Request
copy
curl -X POST 'https://api.ntth.ai/v1/workspace/workspaces/workspace_id/thread/run' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--header 'Authorization: token from application login' \
--data '{
	"id": "{ ** Insert UUID v4 ** }",
	"modelId": "c7e6b665-2747-4b80-895d-05413d17d6ab",
	"stream": false,
	"messages": [
		{
			"role": "system",
			"content": "You are an AI assistant that helps answering questions"
		},
		{
			"role": "user",
			"content": "what is the weather"
		},
		{
			"role": "assistant",
			"content": "Could you please specify the city and country you would like to know the weather for?",
			"type": "text"
		},
		{
			"role": "user",
			"content": "Brisbane, Australia"
		}
	],
	"tools": [
		{
			"type": "function",
			"function": {
				"name": "get_weather",
				"description": "Get current temperature for a given location. The default unit is celsius",
				"parameters": {
					"type": "object",
					"properties": {
						"location": {
							"type": "string",
							"description": "City and country e.g. Seville, Spain"
						},
						"unit": {
							"type": "string",
							"enum": [
								"celsius",
								"fahrenheit"
							]
						}
					},
					"required": [
						"location",
						"unit"
					],
					"additionalProperties": false
				},
				"strict": true
			}
		}
	],
	"aiExpert": {
		"intentRouting": false
	}
}'
Response
The response will be JSON response payload.

Function Call (Non Streaming) Response
copy
{
	"metadata": {
		"provider": "azure",
		"model": "gpt-4o-mini",
		"analytics": {
			"requestStartTime": 1749749529556,
			"providerStartTime": 1749749529565,
			"requestEndTime": 1749749530294
		}
	},
	"role": "assistant",
	"content": "",
	"type": "text",
	"toolCalls": [
		{
			"type": "function",
			"function": {
				"name": "get_weather",
				"arguments": "\"location\":\"Brisbane, Australia\",\"unit\":\"celsius\"}"
			}
		}
	]
}
Function Usage - Streaming

Function calls can be made in conjunction with Server Side Events (SSE) streaming. When using streaming the SSE chunks must be parsed to determine if the SSE chunk contains plain text (chat) or a Function call payload. Example code is provided below on how to consume SSE events containing Function call responses. 

In the example below the Function is the OpenAI example get_weather scenario. The slight modification shows an example back and forth conversation and how you can use the LLM to recognize more information is required by the user before making the function call. The user first requests the weather but fails to provide a location. The LLM responds, requesting additional information. The user supplies the city and the country and the LLM completes the Function call. 

Request
Function Call (Streaming) Request
copy
curl -X POST 'https://api.ntth.ai/v1/workspace/workspaces/workspace_id/thread/run' \
--header 'Accept: text/event-stream' \
--header 'Content-Type: application/json' \
--header 'Authorization: token from application login' \
--data '{
	"id": "{ ** Insert UUID v4 ** }",
	"modelId": "b99a88f8-66b9-4f12-887a-ee6fc7c9d863",
	"stream": true,
	"messages": [
		{
			"role": "system",
			"content": "You are an AI assistant that helps answering questions"
		},
		{
			"role": "user",
			"content": "what is the weather in Brisbane, Australia"
		}
	],
	"tools": [
		{
			"type": "function",
			"function": {
				"name": "get_weather",
				"description": "Get current temperature for a given location. The default unit is celsius",
				"parameters": {
					"type": "object",
					"properties": {
						"location": {
							"type": "string",
							"description": "City and country e.g. BogotÃ¡, Colombia"
						},
						"unit": {
							"type": "string",
							"enum": [
								"celsius",
								"fahrenheit"
							]
						}
					},
					"required": [
						"location",
						"unit"
					],
					"additionalProperties": false
				},
				"strict": true
			}
		}
	],
	"aiExpert": {
		"intentRouting": false
	}
}'
Response
The response is a stream of SSEs. SSEs are strings and if the SSE starts with "data: {" then the payload should be considered a Function Tool SSE which can be parsed by functions like Javascript's JSON.parse(event)

Function Call (Streaming) Response
copy
finalResult: {"requestStartTime":1749749520080,"providerStartTime":1749749520093,"requestEndTime":1749749520557}

data: { [{"index":0,"function":{"name":"get_weather","arguments":"{\"location\":\"Brisbane, Australia\",\"unit\":\"celsius\"}"}}] }

data: { [{"index":0,"type":"function","function":{"name":"get_weather","arguments":""}}] }

AuthX Service (1.0.0)
Download OpenAPI specification:Download

Authentication and authorization middleware service

AuthxClient
Name for the autogenerated client code

checkHealth
Health check endpoint.

Responses
200
Service is OK

500
Service has issues and it is not working properly


get
/healthcheck
authLogin
Log in a entity that can be authenticated (user, robot) and return the token data.

Request Body schema: application/json
required
username	
string
password	
string
Responses
200
Login successful

400
Missing or invalid data provided


post
/auth/login
Request samples
Payload
Content type
application/json

Copy
{
"username": "string",
"password": "string"
}
Response samples
200400
Content type
application/json

Copy
Expand allCollapse all
{
"token": "string",
"mfa": true,
"region": "string",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"username": "user@example.com",
"clientType": "string",
"firstName": "string",
"lastName": "string",
"displayName": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "string",
"guestOf": []
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0,
"expiry": "string",
"passwordExpiresIn": 0
}
authAppLogin
Log in an application and return the token data.

Request Body schema: application/json
required
id	
string
secret	
string
Responses
200
Login successful

400
Missing or invalid data provided


post
/auth/appLogin
Request samples
Payload
Content type
application/json

Copy
{
"id": "string",
"secret": "string"
}
Response samples
200400
Content type
application/json

Copy
Expand allCollapse all
{
"token": "string",
"region": "string",
"applicationId": "97ab27fa-30e2-43e3-92a3-160e80f4c0d5",
"applicationName": "string",
"clientType": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "9ffa9185-7453-4fb2-aa6a-3105a6ae83a8"
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0,
"expiry": "string"
}
authToken
Verify a token was issued by the IDM service

Request Body schema: application/json
required
token	
string
Responses
200
Token successfully verified

400
Missing or invalid data provided


post
/auth/token
Request samples
Payload
Content type
application/json

Copy
{
"token": "string"
}
Response samples
200400
Content type
application/json
Example

UserTokenResponse
UserTokenResponse

Copy
Expand allCollapse all
{
"valid": true,
"token": "string",
"region": "string",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"primaryUserId": "71ee0341-a255-4df8-865b-49721c9acbd3",
"username": "user@example.com",
"clientType": "string",
"userType": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "string"
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0
}
authRefresh
Refresh token data with a refresh token.

Request Body schema: application/json
required
token	
string
Responses
200
Refresh successful

400
Missing or invalid data provided


post
/auth/refresh
Request samples
Payload
Content type
application/json

Copy
{
"token": "string"
}
Response samples
200400
Content type
application/json
Example

UserTokenResponse
UserTokenResponse

Copy
Expand allCollapse all
{
"valid": true,
"token": "string",
"region": "string",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"primaryUserId": "71ee0341-a255-4df8-865b-49721c9acbd3",
"username": "user@example.com",
"clientType": "string",
"userType": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "string"
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0
}
Session Logout
Responses
200
Logout susccessful

400
Missing or invalid data provided. Validation details included for specific properties

401
You are not authenticated to use this resource

403
You lack the proper permission set to use this resource


post
/auth/logout
Response samples
400
Content type
application/json

Copy
Expand allCollapse all
{
"message": "string",
"properties": [
{}
]
}
Logout all Sessions/Tokens for a user/applcation
Responses
200
Logout susccessful

400
Missing or invalid data provided. Validation details included for specific properties

401
You are not authenticated to use this resource

403
You lack the proper permission set to use this resource

Chat Client API specification (3.0.0)
Download OpenAPI specification:Download

Endpoints and resources available through the exposed interface API interface

ChatClient
chatCompletion
Authorizations:
bearerAuth
Request Body schema: application/json
required
Chat Completion

maxTokens	
number
The maximum tokens for the prompt

stream	
boolean
Default: true
Stream the response in real time

presencePenalty	
number
Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.

stop	
string or null
Up to 4 sequences where the API will stop generating further tokens.

frequencyPenalty	
number
Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.

topP	
number
An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.

temperature	
number
What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.

seed	
number
Seed used for sampling. The provider attempts to return the same response to the same request with an identical seed.

id
required
string
ID of the chat

modelId
required
string <uuid>
Model ID used for the chat

messages
required
Array of Message (object) or BasicMessage (object)
Messages in the chat

safeGuardSettings	
object (SafeGuardSettings)
The SafeGuard settings used for the chat

Responses
200
OK

400
Bad Request

403
Unauthorized

500
Message


post
/chat
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"maxTokens": 0,
"stream": true,
"presencePenalty": 0,
"stop": "string",
"frequencyPenalty": 0,
"topP": 0,
"temperature": 0,
"seed": 0,
"id": "string",
"modelId": "17563eeb-82d7-4210-ac9b-1a20c7d67278",
"messages": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
}
}
Response samples
200400403500
Content type
application/json

Copy
{ }
Get suggested follow-up questions for a prompt
Authorizations:
bearerAuth
Request Body schema: application/json
required
Chat Follow-Up Request

chatId	
string
ID of the chat

message
required
string
The message to generate the follow-up suggestions for

Responses
200
A array of follow-up questions

400
Bad Request

403
Unauthorized

500
Message


post
/chat/follow-up
Request samples
Payload
Content type
application/json

Copy
{
"chatId": "string",
"message": "string"
}
Response samples
200400403500
Content type
application/json

Copy
[
"string"
]
listModels
Authorizations:
bearerAuth
query Parameters
provider	
string
The model provider

type	
string
The model type

classification	
string (ModelClassification)
Enum: "text" "image-generation" "vision" "omni"
The model type

capabilities	
Array of strings (ModelCapabilities)
Items Enum: "image-generation" "text" "vision" "tools" "reasoning" "asr" "tts" "document" "workspace"
Responses
200
A JSON object containing an array of the summary of the supported LLM Models

400
Bad Request

403
Unauthorized

500
Message


get
/chat/models
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
[
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"provider": "azure",
"type": "openai",
"name": "gpt-4",
"deploymentName": "gpt-4",
"version": 613,
"classification": "text",
"capabilities": [],
"providerPriority": 100,
"priority": 100,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z"
}
]
listChats
Authorizations:
bearerAuth
query Parameters
search	
string
The text to search for in the chat history

tag	
string
The tag to search for in the chat history

Responses
200
A JSON object containing an array of the summary of the chats

400
Bad Request

403
Unauthorized

500
Message


get
/chat/chats
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
[
{
"id": "string",
"tenantId": "string",
"userId": "string",
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z",
"messages": [],
"tags": [],
"deleted": true,
"isSafeGuardFlagged": true,
"usage": {}
}
]
deleteChats
Authorizations:
bearerAuth
Request Body schema: application/json
required
Chat Completion

chatIds
required
Array of strings <uuid> [ items <uuid > ]
Responses
200
empty response

400
Bad Request

403
Unauthorized

500
Message


delete
/chat/chats
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"chatIds": [
"497f6eca-6276-4993-bfeb-53cbbbba6f08"
]
}
Response samples
400403500
Content type
application/json

Copy
{
"message": "BAD_REQUEST"
}
getChat
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200
A JSON object containing the full record of the chat

400
Bad Request

403
Unauthorized

500
Message


get
/chat/chats/{id}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "string",
"tenantId": "string",
"userId": "string",
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z",
"messages": [
{}
],
"tags": [
"string"
],
"deleted": true,
"isSafeGuardFlagged": true,
"usage": {
"promptTokens": 0,
"responseTokens": 0
}
}
updateChat
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: application/json
required
Update chat request

tags	
Array of strings <= 16 items [ items <= 32 characters ]
Array of searchable tags

Responses
200
A JSON object containing the full record of the updated chat

400
Bad Request

403
Unauthorized

500
Message


put
/chat/chats/{id}
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"tags": [
"string"
]
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "string",
"tenantId": "string",
"userId": "string",
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z",
"messages": [
{}
],
"tags": [
"string"
],
"deleted": true,
"isSafeGuardFlagged": true,
"usage": {
"promptTokens": 0,
"responseTokens": 0
}
}
getChatTags
Authorizations:
bearerAuth
Responses
200
An array of string tags currently used by the user

400
Bad Request

403
Unauthorized

500
Message


get
/chat/chats/tags
Response samples
200400403500
Content type
application/json

Copy
[
"string"
]
getImageById
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
query Parameters
base64	
boolean
Encode the image using base64

Responses
200
A string response representing the image

400
Bad Request

403
Unauthorized

500
Message


get
/chat/image/get/{id}
Response samples
400403500
Content type
application/json

Copy
{
"message": "BAD_REQUEST"
}
setUserTermsOfService
Authorizations:
bearerAuth
Request Body schema: application/json
required
User Terms of Service Data

accepted
required
boolean
Default: false
Has the user accepted the terms of service

Responses
200
A JSON object containing the User Profile

400
Bad Request

403
Unauthorized

500
Message


put
/chat/users/termsofservice
Request samples
Payload
Content type
application/json

Copy
{
"accepted": false
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"tenantId": "f97df110-f4de-492e-8849-4a6af68026b0",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"termsOfService": {
"accepted": false,
"date": 1719519337123,
"version": "1.0"
},
"communicationsPreferences": {
"subscribeToNotifications": true
},
"sharedWorkspaces": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z",
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
getCurrentTermsOfService
Authorizations:
bearerAuth
Responses
200
A JSON object containing the latest terms of service

400
Bad Request

403
Unauthorized

500
Message


get
/chat/termsofservice/current
Response samples
200400403500
Content type
application/json

Copy
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"version": "1.0",
"current": true,
"filename": "string",
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z"
}
Add a Shared Workspace
Authorizations:
bearerAuth
Request Body schema: application/json
required
id
required
string <uuid>
type
required
string (WorkspaceType)
Enum: "assistant" "rag"
Responses
200
A JSON object containing the User Profile

400
Bad Request

403
Unauthorized

500
Message


put
/chat/users/profile/workspace
Request samples
Payload
Content type
application/json

Copy
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"type": "assistant"
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"tenantId": "f97df110-f4de-492e-8849-4a6af68026b0",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"termsOfService": {
"accepted": false,
"date": 1719519337123,
"version": "1.0"
},
"communicationsPreferences": {
"subscribeToNotifications": true
},
"sharedWorkspaces": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z",
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
Update a Shared Workspaces
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: application/json
required
nickName	
string
pinned	
boolean
Is the linked Workspace

Responses
200
A JSON object containing the User Profile

400
Bad Request

403
Unauthorized

500
Message


patch
/chat/users/profile/workspace/{id}
Request samples
Payload
Content type
application/json

Copy
{
"nickName": "string",
"pinned": true
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"tenantId": "f97df110-f4de-492e-8849-4a6af68026b0",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"termsOfService": {
"accepted": false,
"date": 1719519337123,
"version": "1.0"
},
"communicationsPreferences": {
"subscribeToNotifications": true
},
"sharedWorkspaces": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z",
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
Delete a Shared Workspaces
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200
A JSON object containing the User Profile

400
Bad Request

403
Unauthorized

500
Message


delete
/chat/users/profile/workspace/{id}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"tenantId": "f97df110-f4de-492e-8849-4a6af68026b0",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"termsOfService": {
"accepted": false,
"date": 1719519337123,
"version": "1.0"
},
"communicationsPreferences": {
"subscribeToNotifications": true
},
"sharedWorkspaces": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z",
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
getUserProfile
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200
A JSON object containing the User Profile

400
Bad Request

403
Unauthorized

500
Message


get
/chat/users/{id}/profile
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"tenantId": "f97df110-f4de-492e-8849-4a6af68026b0",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"termsOfService": {
"accepted": false,
"date": 1719519337123,
"version": "1.0"
},
"communicationsPreferences": {
"subscribeToNotifications": true
},
"sharedWorkspaces": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z",
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
updateUserProfile
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: application/json
required
User Profile Data

communicationsPreferences	
object (CommunicationsPreferences)
Communications preferences for a user.

safeGuardSettings	
object (SafeGuardSettings)
The SafeGuard settings used for the chat

distractionFreeMode	
boolean
Default: false
Tells if Distraction Free Mode is activated or not

defaults	
object
The default settings for the user profile

Responses
200
A JSON object containing the User Profile

400
Bad Request

403
Unauthorized

500
Message


put
/chat/users/{id}/profile
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"communicationsPreferences": {
"subscribeToNotifications": true
},
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"tenantId": "f97df110-f4de-492e-8849-4a6af68026b0",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"termsOfService": {
"accepted": false,
"date": 1719519337123,
"version": "1.0"
},
"communicationsPreferences": {
"subscribeToNotifications": true
},
"sharedWorkspaces": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z",
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
patchUserProfile
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: application/json
required
User Profile Data

communicationsPreferences	
object (CommunicationsPreferences)
Communications preferences for a user.

safeGuardSettings	
object (SafeGuardSettings)
The SafeGuard settings used for the chat

distractionFreeMode	
boolean
Default: false
Tells if Distraction Free Mode is activated or not

defaults	
object
The default settings for the user profile

Responses
200
A JSON object containing the User Profile

400
Bad Request

403
Unauthorized

500
Message


patch
/chat/users/{id}/profile
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"communicationsPreferences": {
"subscribeToNotifications": true
},
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"tenantId": "f97df110-f4de-492e-8849-4a6af68026b0",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"termsOfService": {
"accepted": false,
"date": 1719519337123,
"version": "1.0"
},
"communicationsPreferences": {
"subscribeToNotifications": true
},
"sharedWorkspaces": [
{}
],
"safeGuardSettings": {
"status": "disabled",
"configurationStyle": "easy",
"configuration": {}
},
"distractionFreeMode": false,
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z",
"defaults": {
"provider": "azure",
"model": "gpt-4o",
"pastMessages": 10,
"enableAnalytics": false,
"language": "en",
"systemPrompt": "You are an AI assistant that helps answering questions",
"chatSettings": {}
}
}
listProviders
Authorizations:
bearerAuth
query Parameters
name	
string >= 3 characters
id	
string
The unique identifier of a data type

Responses
200
A JSON object containing an array of the supported LLM Providers

400
Bad Request

403
Unauthorized

500
Message


get
/chat/providers
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
[
{
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "openai",
"version": 613,
"versionOrTier": "API Tier5",
"termsOfUseUrl": "https://openai.com/policies/row-terms-of-use/",
"dataPrivacyUrl": "https://openai.com/enterprise-privacy/",
"contentModerationUrl": "https://platform.openai.com/docs/guides/moderation",
"trustSiteUrl": "https://trust.openai.com/",
"createdAt": "2020-08-04T16:02:44.591Z",
"updatedAt": "2020-08-04T16:02:44.591Z"
}
]
getProvider
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
199
A JSON object for websocket messages

200
A JSON object containing the Provider data

400
Bad Request

403
Unauthorized

500
Message

Workspace Client API specification (3.0.0)
Download OpenAPI specification:Download

Endpoints and resources available through the exposed interface API interface

WorkspaceClient
List all Workspaces for the user
Authorizations:
bearerAuth
query Parameters
provider	
string (WorkspaceProvider)
Value: "openai"
The Workspace provider

type	
string (WorkspaceType)
Enum: "assistant" "rag"
The Workspace type

Responses
200 A JSON object containing an array of Workspaces
400 Bad Request
403 Unauthorized
500 Message

get
/workspace/workspaces
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"totalItems": 0,
"itemsOnPage": 0,
"pageNumber": 0,
"pageSize": 0,
"items": [
{}
]
}
Create a Workspace
Authorizations:
bearerAuth
Request Body schema: application/json
required
Create Workspace request

provider
required
string (WorkspaceProvider)
Value: "openai"
modelId
required
string
type
required
string (WorkspaceType)
Enum: "assistant" "rag"
displayName
required
string
description
required
string
access
required
object (WorkspaceAccess)
filesOnly	
boolean or null
configuration
required
object
Responses
200 The newly created Workspace
400 Bad Request
403 Unauthorized
500 Message

post
/workspace/workspaces
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"provider": "openai",
"modelId": "string",
"type": "assistant",
"displayName": "string",
"description": "string",
"access": {
"shared": true,
"tenantRestricted": true
},
"filesOnly": true,
"configuration": {
"instructions": "string",
"tools": [],
"toolResources": {},
"temperature": 1,
"topP": 1,
"conversationPrimers": []
}
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "string",
"providerId": "string",
"tenantId": "string",
"userId": "string",
"contactEmail": "user@example.com",
"provider": "openai",
"modelId": "string",
"type": "assistant",
"displayName": "string",
"description": "string",
"filesOnly": true,
"access": {
"shared": true,
"tenantRestricted": true
},
"deleted": true,
"configuration": {
"instructions": "string",
"tools": [],
"toolResources": {},
"temperature": 1,
"topP": 1,
"conversationPrimers": []
},
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z"
}
Get a specific Workspace (must be the Workspace owner)
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200 A JSON object containing the full record of the workspace
400 Bad Request
403 Unauthorized
500 Message

get
/workspace/workspaces/{id}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "string",
"providerId": "string",
"tenantId": "string",
"userId": "string",
"contactEmail": "user@example.com",
"provider": "openai",
"modelId": "string",
"type": "assistant",
"displayName": "string",
"description": "string",
"filesOnly": true,
"access": {
"shared": true,
"tenantRestricted": true
},
"deleted": true,
"configuration": {
"instructions": "string",
"tools": [],
"toolResources": {},
"temperature": 1,
"topP": 1,
"conversationPrimers": []
},
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z"
}
Update a specific Workspace (must be the Workspace owner)
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: application/json
required
Update workspace request

modelId	
string or null
type	
string (WorkspaceType)
Enum: "assistant" "rag"
displayName	
string or null
description	
string or null
access	
object (WorkspaceAccess)
filesOnly	
boolean or null
configuration	
object or null
Responses
200 A JSON object containing the full record of the updated workspace
400 Bad Request
403 Unauthorized
500 Message

patch
/workspace/workspaces/{id}
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"modelId": "string",
"type": "assistant",
"displayName": "string",
"description": "string",
"access": {
"shared": true,
"tenantRestricted": true
},
"filesOnly": true,
"configuration": {
"instructions": "string",
"tools": [],
"toolResources": {},
"temperature": 1,
"topP": 1,
"conversationPrimers": []
}
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "string",
"providerId": "string",
"tenantId": "string",
"userId": "string",
"contactEmail": "user@example.com",
"provider": "openai",
"modelId": "string",
"type": "assistant",
"displayName": "string",
"description": "string",
"filesOnly": true,
"access": {
"shared": true,
"tenantRestricted": true
},
"deleted": true,
"configuration": {
"instructions": "string",
"tools": [],
"toolResources": {},
"temperature": 1,
"topP": 1,
"conversationPrimers": []
},
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z"
}
Delete a specific Workspace (must be the Workspace owner)
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200 empty response
400 Bad Request
403 Unauthorized
500 Message

delete
/workspace/workspaces/{id}
Response samples
400403500
Content type
application/json

Copy
{
"message": "BAD_REQUEST"
}
List all files for a Workspace
List all files for the Workspace. This will update the status for the files from the provider in real-time.

Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200 A list of all files associated with the Workspace and their real-time status from the provider
400 Bad Request
403 Unauthorized
500 Message

get
/workspace/workspaces/{id}/files
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
[
{
"id": "string",
"filename": "string",
"status": "in_progress",
"bytes": 1500,
"createdAt": 0
}
]
Add a file to the Workspace
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: multipart/form-data
required
file
required
string <binary>
type	
string
Enum: "auto" "static"
maxChunkSizeTokens	
number [ 100 .. 4096 ]
chunkOverlapTokens	
number >= 1
Responses
199 Workaround to include FileChunkingType
200 The newly uploaded file and its real-time status from the provider
400 Bad Request
403 Unauthorized
500 Message

post
/workspace/workspaces/{id}/files
Response samples
199200400403500
Content type
application/json
Example

FileChunkingType
FileChunkingType

Copy
"auto"
Delete a file from the Workspace
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
fileId
required
string
Responses
200 empty response
400 Bad Request
403 Unauthorized
500 Message

delete
/workspace/workspaces/{id}/files/{fileId}
Response samples
400403500
Content type
application/json

Copy
{
"message": "BAD_REQUEST"
}
Get/Create a Thread for the user for the Workspace
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200 Get the user Thread for this Workspace if allowed - will auto create one if no Thread currently exists
400 Bad Request
403 Unauthorized
500 Message

get
/workspace/workspaces/{id}/thread
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "string",
"providerId": "string",
"workspaceId": "string",
"tenantId": "string",
"userId": "string",
"configuration": {
"tools_resources": {}
},
"deleted": true,
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z"
}
Delete the user's Thread for this Workspace
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200 empty response
400 Bad Request
403 Unauthorized
500 Message

delete
/workspace/workspaces/{id}/thread
Response samples
400403500
Content type
application/json

Copy
{
"message": "BAD_REQUEST"
}
List all messages for the user and this Workspace
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200 List of ThreadMessages
400 Bad Request
403 Unauthorized
500 Message

get
/workspace/workspaces/{id}/thread/messages
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"totalItems": 0,
"itemsOnPage": 0,
"pageNumber": 0,
"pageSize": 0,
"items": [
{}
]
}
Delete a specific message from a Workspace
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: application/json
required
Delete ThreadMessages Request

threadMessageIds
required
Array of strings <uuid> [ 1 .. 10 ] [ items <uuid > ]
An array of ThreadMessage GUIDs to delete

Responses
200 empty response
400 Bad Request
403 Unauthorized
500 Message

delete
/workspace/workspaces/{id}/thread/messages
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"threadMessageIds": [
"497f6eca-6276-4993-bfeb-53cbbbba6f08"
]
}
Response samples
400403500
Content type
application/json

Copy
{
"message": "BAD_REQUEST"
}
Run a Thread with the new Prompt/Message against the Workspace
Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Request Body schema: application/json
required
Run the Thread against the Workspace

role	
string (ThreadMessageRole)
Enum: "user" "assistant"
Role of the message in the thread

content	
Array of ThreadRequestTextMessageContent (object) or ThreadImageFileMessageContent (object) or ThreadImageUrlMessageContent (object) (ThreadMessageRequestContent)
stream	
boolean
temperature	
number
topP	
number
Responses
200 A stream of responses
400 Bad Request
403 Unauthorized
500 Message

post
/workspace/workspaces/{id}/thread/run
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"role": "user",
"content": [
{}
],
"stream": true,
"temperature": 0,
"topP": 0
}
Response samples
400403500
Content type
application/json

Copy
{
"message": "BAD_REQUEST"
}
List the accessible shared (non-owned) Workspaces
List all non-owned Workspaces shared availabled to the user based on the supplied list of Workspace IDs

Authorizations:
bearerAuth
Request Body schema: application/json
required
List Shared Workspaces request

workspaceIds	
Array of strings
Responses
200 A JSON object containing an array of shared Workspaces
400 Bad Request
403 Unauthorized
500 Message

post
/workspace/workspaces/shared
Request samples
Payload
Content type
application/json

Copy
Expand allCollapse all
{
"workspaceIds": [
"string"
]
}
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
[
{
"id": "string",
"displayName": "string",
"type": "assistant",
"contactEmail": "user@example.com",
"deleted": true
}
]
Get the accessible shared (non-owned) Workspace
Get a shared Workspace for chat usage

Authorizations:
bearerAuth
path Parameters
id
required
string <uuid>
Responses
200 A JSON object containing an array of shared Workspaces
Response Schema: application/json
id
required
string
displayName
required
string
type
required
string (WorkspaceType)
Enum: "assistant" "rag"
contactEmail	
string <email>
deleted
required
boolean
description	
string
configuration	
object
createdAt	
string <date-time>
updatedAt	
string <date-time>
400 Bad Request
Response Schema: application/json
message	
string
403 Unauthorized
Response Schema: application/json
message	
string
500 Message
Response Schema: application/json
message	
string

get
/workspace/workspaces/{id}/shared
Response samples
200400403500
Content type
application/json

Copy
Expand allCollapse all
{
"id": "string",
"displayName": "string",
"type": "assistant",
"contactEmail": "user@example.com",
"deleted": true,
"description": "string",
"configuration": {
"instructions": "string",
"conversationPrimers": []
},
"createdAt": "2019-08-24T14:15:22Z",
"updatedAt": "2019-08-24T14:15:22Z"
}
List all Threads (one per Workspace) for a user
Authorizations:
bearerAuth
 HTTP: bearerAuth
HTTP Authorization Scheme: bearer
Bearer format: JWT
Responses
200 A list of all threads for the given user
Response Schema: application/json
totalItems	
number
The total number of items for the query

itemsOnPage	
number
The number of items in this response

pageNumber	
number
The current page

pageSize	
number
How many items per page

items	
Array of objects (Thread)
400 Bad Request
Response Schema: application/json
message	
string
403 Unauthorized
Response Schema: application/json
message	
string
500 Message
Response Schema: application/json
message	
string
AuthX Service (1.0.0)
Download OpenAPI specification:Download

Authentication and authorization middleware service

AuthxClient
Name for the autogenerated client code

checkHealth
Health check endpoint.

Responses
200
Service is OK

500
Service has issues and it is not working properly


get
/healthcheck
authLogin
Log in a entity that can be authenticated (user, robot) and return the token data.

Request Body schema: application/json
required
username	
string
password	
string
Responses
200
Login successful

Response Schema: application/json
One of UserLoginResponse
token	
string
mfa	
boolean
region	
string
userId	
string <uuid>
username	
string <email>
clientType	
string
firstName	
string
lastName	
string
displayName	
string
tenant	
object
rbac	
object
sessionStart	
string
sessionEnd	
string
expiresIn	
number
expiry	
string
passwordExpiresIn	
number
400
Missing or invalid data provided

Response Schema: application/json
message	
string

post
/auth/login
Request samples
Payload
Content type
application/json

Copy
{
"username": "string",
"password": "string"
}
Response samples
200400
Content type
application/json

Copy
Expand allCollapse all
{
"token": "string",
"mfa": true,
"region": "string",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"username": "user@example.com",
"clientType": "string",
"firstName": "string",
"lastName": "string",
"displayName": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "string",
"guestOf": []
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0,
"expiry": "string",
"passwordExpiresIn": 0
}
authAppLogin
Log in an application and return the token data.

Request Body schema: application/json
required
id	
string
secret	
string
Responses
200
Login successful

Response Schema: application/json
token	
string
region	
string
applicationId	
string <uuid>
applicationName	
string
clientType	
string
tenant	
object
rbac	
object
sessionStart	
string
sessionEnd	
string
expiresIn	
number
expiry	
string
400
Missing or invalid data provided


post
/auth/appLogin
Request samples
Payload
Content type
application/json

Copy
{
"id": "string",
"secret": "string"
}
Response samples
200400
Content type
application/json

Copy
Expand allCollapse all
{
"token": "string",
"region": "string",
"applicationId": "97ab27fa-30e2-43e3-92a3-160e80f4c0d5",
"applicationName": "string",
"clientType": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "9ffa9185-7453-4fb2-aa6a-3105a6ae83a8"
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0,
"expiry": "string"
}
authToken
Verify a token was issued by the IDM service

Request Body schema: application/json
required
token	
string
Responses
200
Token successfully verified

Response Schema: application/json
One of UserTokenResponseApplicationTokenResponse
valid	
boolean
token	
string
region	
string
userId	
string <uuid>
primaryUserId	
string <uuid>
username	
string <email>
clientType	
string
userType	
string
tenant	
object
rbac	
object
sessionStart	
string
sessionEnd	
string
expiresIn	
number
400
Missing or invalid data provided

Response Schema: application/json
message	
string

post
/auth/token
Request samples
Payload
Content type
application/json

Copy
{
"token": "string"
}
Response samples
200400
Content type
application/json
Example

UserTokenResponse
UserTokenResponse

Copy
Expand allCollapse all
{
"valid": true,
"token": "string",
"region": "string",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"primaryUserId": "71ee0341-a255-4df8-865b-49721c9acbd3",
"username": "user@example.com",
"clientType": "string",
"userType": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "string"
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0
}
authRefresh
Refresh token data with a refresh token.

Request Body schema: application/json
required
token	
string
Responses
200
Refresh successful

Response Schema: application/json
One of UserTokenResponseApplicationTokenResponse
valid	
boolean
token	
string
region	
string
userId	
string <uuid>
primaryUserId	
string <uuid>
username	
string <email>
clientType	
string
userType	
string
tenant	
object
rbac	
object
sessionStart	
string
sessionEnd	
string
expiresIn	
number
400
Missing or invalid data provided

Response Schema: application/json
message	
string

post
/auth/refresh
Request samples
Payload
Content type
application/json

Copy
{
"token": "string"
}
Response samples
200400
Content type
application/json
Example

UserTokenResponse
UserTokenResponse

Copy
Expand allCollapse all
{
"valid": true,
"token": "string",
"region": "string",
"userId": "2c4a230c-5085-4924-a3e1-25fb4fc5965b",
"primaryUserId": "71ee0341-a255-4df8-865b-49721c9acbd3",
"username": "user@example.com",
"clientType": "string",
"userType": "string",
"tenant": {
"id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
"name": "string"
},
"rbac": {
"roles": [],
"roleNames": [],
"grants": [],
"scope": {}
},
"sessionStart": "string",
"sessionEnd": "string",
"expiresIn": 0
}
Session Logout
Responses
200
Logout susccessful

400
Missing or invalid data provided. Validation details included for specific properties

Response Schema: application/json
message	
string
properties	
Array of objects
401
You are not authenticated to use this resource

403
You lack the proper permission set to use this resource


post
/auth/logout
Response samples
400
Content type
application/json

Copy
Expand allCollapse all
{
"message": "string",
"properties": [
{}
]
}
Logout all Sessions/Tokens for a user/applcation
Responses
200
Logout susccessful

400
Missing or invalid data provided. Validation details included for specific properties

Response Schema: application/json
message	
string
properties	
Array of objects
401
You are not authenticated to use this resource

403
You lack the proper permission set to use this resource
