# Security Fixes Implementation Guide

This document provides detailed implementation guidance for fixing the security vulnerabilities identified in the security code review.

---

## Quick Fix Checklist

### Phase 1: Immediate Critical Fixes (Deploy ASAP)

- [ ] Remove hardcoded admin credentials
- [ ] Add CSRF protection
- [ ] Fix timing attack in admin auth
- [ ] Add rate limiting to admin endpoints
- [ ] Fix CORS configuration
- [ ] Add input validation
- [ ] Fix XSS in dashboard
- [ ] Add request size limits

---

## Detailed Fix Implementation

### FIX-01: Remove Hardcoded Admin Credentials

**File:** `src/middleware/auth.middleware.ts`

**Current Code (INSECURE):**
```typescript
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
```

**Fixed Code:**
```typescript
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminUsername || !adminPassword) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set');
}
```

**Additional Changes:**

Add to `src/index.ts` before app initialization:
```typescript
// Validate critical environment variables at startup
function validateEnvironment() {
  const required = ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    throw new Error(`Missing required environment: ${missing.join(', ')}`);
  }

  // Validate admin password strength
  const adminPassword = process.env.ADMIN_PASSWORD!;
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  }
}

validateEnvironment();
```

**Update `.env.example`:**
```bash
# Admin Configuration - REQUIRED IN PRODUCTION
ADMIN_USERNAME=  # Set to secure admin username
ADMIN_PASSWORD=  # Set to strong password (min 12 chars, use mix of chars/numbers/symbols)
```

---

### FIX-02: Implement CSRF Protection

**Install Dependencies:**
```bash
npm install csurf cookie-parser
npm install --save-dev @types/cookie-parser @types/csurf
```

**File:** `src/index.ts`

Add after other middleware:
```typescript
import cookieParser from 'cookie-parser';
import csrf from 'csurf';

// Cookie parser (required for CSRF)
app.use(cookieParser());

// CSRF protection for state-changing operations
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Apply CSRF to all routes except API endpoints (use custom header check instead)
app.use((req, res, next) => {
  // Skip CSRF for API endpoints - they use Bearer tokens
  if (req.path.startsWith('/v1/')) {
    return next();
  }
  return csrfProtection(req, res, next);
});

// Endpoint to get CSRF token
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// CSRF error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      error: {
        message: 'Invalid CSRF token',
        type: 'csrf_error',
      },
    });
  } else {
    next(err);
  }
});
```

**For API endpoints, add custom header check:**

Create `src/middleware/api-csrf.middleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

/**
 * API CSRF protection using custom header
 */
export const apiCsrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only check for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const customHeader = req.get('X-Requested-With');

    if (customHeader !== 'XMLHttpRequest') {
      res.status(403).json({
        error: {
          message: 'Missing required anti-CSRF header',
          code: 'CSRF_HEADER_REQUIRED',
          type: 'security_error',
        },
      });
      return;
    }
  }

  next();
};
```

Update `src/routes/openai.routes.ts`:
```typescript
import { apiCsrfProtection } from '../middleware/api-csrf.middleware';

router.use(authenticate);
router.use(apiCsrfProtection); // Add this
router.use(rateLimitByToken);
```

---

### FIX-03: Fix Timing Attack in Admin Auth

**File:** `src/middleware/auth.middleware.ts`

**Install crypto (built-in Node.js module):**

Replace the admin authentication logic:
```typescript
import crypto from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // Ensure buffers are same length (prevents timing leak)
  if (bufA.length !== bufB.length) {
    // Still do comparison to prevent timing analysis
    const dummyBuffer = Buffer.alloc(bufA.length);
    crypto.timingSafeEqual(bufA, dummyBuffer);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

export const adminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new ApiError(401, 'Missing or invalid admin authorization', 'MISSING_ADMIN_AUTH');
    }

    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const adminUsername = process.env.ADMIN_USERNAME!;
    const adminPassword = process.env.ADMIN_PASSWORD!;

    // Use constant-time comparison
    const usernameValid = timingSafeEqual(username || '', adminUsername);
    const passwordValid = timingSafeEqual(password || '', adminPassword);

    if (!usernameValid || !passwordValid) {
      logger.warn('Failed admin login attempt', {
        username: username || 'undefined',
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString(),
      });

      // Add small delay to prevent rapid brute force
      await new Promise(resolve => setTimeout(resolve, 1000));

      throw new ApiError(401, 'Invalid admin credentials', 'INVALID_ADMIN_CREDENTIALS');
    }

    next();
  } catch (error: any) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        error: {
          message: error.message,
          code: error.code,
          type: 'authentication_error',
        },
      });
    } else {
      logger.error('Admin authentication error:', error);
      res.status(500).json({
        error: {
          message: 'Internal server error during admin authentication',
          type: 'server_error',
        },
      });
    }
  }
};
```

---

### FIX-04: Add Rate Limiting to Admin Endpoints

**Install Dependencies:**
```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

**File:** `src/middleware/admin-rate-limit.middleware.ts` (NEW FILE)

```typescript
import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis';
import logger from '../config/logger';

/**
 * Aggressive rate limiting for admin endpoints
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: {
    error: {
      message: 'Too many admin requests from this IP, please try again later',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      type: 'rate_limit_error',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });

    res.status(429).json({
      error: {
        message: 'Too many admin requests, please try again later',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        type: 'rate_limit_error',
      },
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
});

/**
 * Track failed admin login attempts with exponential backoff
 */
export const adminLoginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 failed attempts per hour
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    error: {
      message: 'Too many failed login attempts, account temporarily locked',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      type: 'rate_limit_error',
    },
  },
});
```

**Update `src/routes/admin.routes.ts`:**
```typescript
import { adminRateLimiter } from '../middleware/admin-rate-limit.middleware';

const router = Router();

// Apply aggressive rate limiting FIRST
router.use(adminRateLimiter);

// Then apply admin authentication
router.use(adminAuth);

// Rest of routes...
```

---

### FIX-05: Fix CORS Configuration

**File:** `src/index.ts`

Replace CORS configuration:
```typescript
// Parse allowed origins from environment
const parseAllowedOrigins = (): string[] => {
  const origins = process.env.CORS_ORIGIN;

  if (!origins) {
    logger.warn('CORS_ORIGIN not set, defaulting to localhost only');
    return ['http://localhost:3000'];
  }

  if (origins === '*') {
    logger.error('CORS_ORIGIN set to *, this is insecure!');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CORS_ORIGIN cannot be * in production');
    }
  }

  return origins.split(',').map(o => o.trim());
};

const allowedOrigins = parseAllowedOrigins();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
}));
```

**Update `.env.example`:**
```bash
# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
CORS_CREDENTIALS=true
```

---

### FIX-06: Add Input Validation

**Install Dependencies:**
```bash
npm install zod
```

**Create `src/validators/admin.validators.ts`:**
```typescript
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, 'Name contains invalid characters'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),
});

export const createTokenSchema = z.object({
  user_id: z.string()
    .uuid('Invalid user ID format'),
  name: z.string()
    .min(1, 'Token name is required')
    .max(100, 'Token name must be less than 100 characters'),
  rate_limit: z.number()
    .int()
    .min(1)
    .max(100000)
    .optional()
    .default(1000),
});

export const updateTokenSchema = z.object({
  name: z.string()
    .min(1)
    .max(100)
    .optional(),
  rate_limit: z.number()
    .int()
    .min(1)
    .max(100000)
    .optional(),
}).refine(data => data.name !== undefined || data.rate_limit !== undefined, {
  message: 'At least one field must be provided',
});
```

**Create `src/validators/chat.validators.ts`:**
```typescript
import { z } from 'zod';

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']),
  content: z.string().max(50000, 'Message content too large'),
  name: z.string().max(100).optional(),
});

export const chatCompletionSchema = z.object({
  model: z.string()
    .uuid('Invalid model ID format')
    .or(z.string().min(1).max(100)), // Allow model names too
  messages: z.array(messageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages'),
  temperature: z.number()
    .min(0)
    .max(2)
    .optional(),
  max_tokens: z.number()
    .int()
    .min(1)
    .max(100000)
    .optional(),
  top_p: z.number()
    .min(0)
    .max(1)
    .optional(),
  presence_penalty: z.number()
    .min(-2)
    .max(2)
    .optional(),
  frequency_penalty: z.number()
    .min(-2)
    .max(2)
    .optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
});
```

**Create validation middleware `src/middleware/validate.middleware.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../config/logger';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and transform request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error:', {
          path: req.path,
          errors: error.errors,
        });

        res.status(400).json({
          error: {
            message: 'Validation failed',
            type: 'validation_error',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      } else {
        next(error);
      }
    }
  };
};
```

**Update controllers:**

`src/controllers/admin.controller.ts`:
```typescript
import { validate } from '../middleware/validate.middleware';
import { createUserSchema, createTokenSchema, updateTokenSchema } from '../validators/admin.validators';

// In routes file (admin.routes.ts):
router.post('/users', validate(createUserSchema), createUser);
router.post('/tokens', validate(createTokenSchema), createToken);
router.patch('/tokens/:tokenId', validate(updateTokenSchema), updateToken);
```

`src/routes/openai.routes.ts`:
```typescript
import { validate } from '../middleware/validate.middleware';
import { chatCompletionSchema } from '../validators/chat.validators';

router.post('/chat/completions', validate(chatCompletionSchema), chatCompletion);
```

---

### FIX-07: Fix XSS in Dashboard

**File:** `public/js/dashboard.js`

Create helper function at top of file:
```javascript
/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
        unsafe = String(unsafe);
    }
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Create element safely with text content
 */
function createSafeElement(tag, text, className) {
    const elem = document.createElement(tag);
    if (text) {
        elem.textContent = text; // Use textContent, not innerHTML
    }
    if (className) {
        elem.className = className;
    }
    return elem;
}
```

Replace all `innerHTML` assignments with safe alternatives:

**Replace lines 166-168:**
```javascript
loadRecentActivity() {
    const activities = [
        'New user registered: john@example.com',
        'Token created for API access',
        'System backup completed successfully',
        'Rate limit adjusted for user: admin',
        'New API endpoint accessed: /chat/completions'
    ];

    const activityLog = document.getElementById('activityLog');
    activityLog.innerHTML = ''; // Clear first

    activities.forEach(activity => {
        const div = createSafeElement('div', activity, 'activity-item');
        activityLog.appendChild(div);
    });
}
```

**Replace lines 203-216 (users table):**
```javascript
async loadUsers() {
    try {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = ''; // Clear

        const users = [
            // ... user data
        ];

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.dataset.userId = user.id;

            // Use textContent for all user data
            tr.innerHTML = `
                <td>${escapeHtml(user.id)}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.role)}</td>
                <td><span class="badge ${escapeHtml(user.status)}">${escapeHtml(user.status)}</span></td>
                <td>${escapeHtml(user.created)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${escapeHtml(user.id)}">Edit</button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${escapeHtml(user.id)}">Delete</button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Add event delegation for buttons
        tbody.addEventListener('click', (e) => {
            const target = e.target;
            if (target.dataset.action === 'edit') {
                this.editUser(target.dataset.id);
            } else if (target.dataset.action === 'delete') {
                this.deleteUser(target.dataset.id);
            }
        });
    } catch (error) {
        console.error('Error loading users:', error);
        this.showError('Failed to load users');
    }
}
```

Apply similar fixes to `loadTokens()` and all other methods using `innerHTML`.

---

### FIX-08: Add Request Size Limits

**File:** `src/index.ts`

Update express middleware:
```typescript
// Parse JSON bodies with size limit
app.use(express.json({
  limit: '1mb',
  strict: true, // Only parse arrays and objects
}));

// Parse URL-encoded bodies with size limit
app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
  parameterLimit: 1000, // Limit number of parameters
}));

// Add additional protection against parameter pollution
import hpp from 'hpp';
app.use(hpp()); // npm install hpp
```

---

### FIX-09: Improve Security Headers

**File:** `src/index.ts`

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  dnsPrefetchControl: {
    allow: false
  },
  ieNoOpen: true,
  hidePoweredBy: true,
}));

// Add additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

---

### FIX-10: Optimize Token Validation

**File:** `src/services/token.service.ts`

Add database migration for token prefix index:

Create `migrations/003_add_token_prefix_index.sql`:
```sql
-- Add token prefix column for efficient lookup
ALTER TABLE api_tokens ADD COLUMN token_prefix VARCHAR(20);

-- Create index on token prefix
CREATE INDEX idx_api_tokens_prefix ON api_tokens(token_prefix) WHERE is_active = true;

-- Update existing tokens (if any) - extract first 20 chars of hash
UPDATE api_tokens SET token_prefix = SUBSTRING(token_hash, 1, 20);
```

Update `token.service.ts`:
```typescript
/**
 * Generate a new API token
 */
private generateToken(): string {
  const randomString = uuidv4().replace(/-/g, '');
  return `${TOKEN_PREFIX}${randomString}`;
}

/**
 * Extract prefix from token for efficient lookup
 */
private getTokenPrefix(token: string): string {
  // Use first 20 characters after prefix for lookup
  return token.substring(0, 28); // sk-ntth- (8 chars) + 20 chars
}

/**
 * Create a new API token
 */
async createToken(data: CreateTokenRequest): Promise<CreateTokenResponse> {
  try {
    const token = this.generateToken();
    const tokenHash = await this.hashToken(token);
    const tokenPrefix = this.getTokenPrefix(token);

    const result = await query(
      `INSERT INTO api_tokens (user_id, token_hash, token_prefix, name, rate_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, rate_limit, created_at`,
      [data.user_id, tokenHash, tokenPrefix, data.name, data.rate_limit || 1000]
    );

    // ... rest of method
  }
}

/**
 * Validate and get token details - OPTIMIZED VERSION
 */
async validateToken(token: string): Promise<ApiToken | null> {
  try {
    // Fast rejection for invalid format
    if (!token.startsWith(TOKEN_PREFIX)) {
      return null;
    }

    const tokenPrefix = this.getTokenPrefix(token);

    // Only query tokens with matching prefix
    const result = await query(
      `SELECT t.*, u.name as user_name, u.email as user_email
       FROM api_tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.is_active = true
         AND t.token_prefix = $1
       LIMIT 10`, // Safety limit
      [tokenPrefix]
    );

    // Should only be 1-2 tokens with same prefix in practice
    for (const row of result.rows) {
      const isValid = await this.verifyToken(token, row.token_hash);
      if (isValid) {
        await this.updateLastUsed(row.id);
        return {
          id: row.id,
          user_id: row.user_id,
          token_hash: row.token_hash,
          name: row.name,
          rate_limit: row.rate_limit,
          is_active: row.is_active,
          created_at: row.created_at,
          last_used_at: row.last_used_at,
        };
      }
    }

    return null;
  } catch (error: any) {
    logger.error('Failed to validate token:', error);
    return null;
  }
}
```

---

## Testing Your Fixes

### 1. Test CSRF Protection

```bash
# This should fail with CSRF error
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Basic $(echo -n 'admin:newpassword' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","email":"test@test.com"}'

# This should work (with CSRF token)
# First get token, then include in request
```

### 2. Test Rate Limiting

```bash
# Try multiple rapid requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/admin/users \
    -H "Authorization: Basic $(echo -n 'wrong:wrong' | base64)"
done
# Should get rate limited after 5 attempts
```

### 3. Test Input Validation

```bash
# Invalid email should fail
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Basic $(echo -n 'admin:newpassword' | base64)" \
  -d '{"name":"test","email":"notanemail"}'

# Should return validation error with field details
```

### 4. Test XSS Protection

Try creating a user with XSS payload:
```javascript
name: "<script>alert('XSS')</script>"
```

View in dashboard - should display as text, not execute.

---

## Deployment Checklist

Before deploying these fixes:

- [ ] Update all environment variables with secure values
- [ ] Set strong admin password (min 12 chars, mixed case, numbers, symbols)
- [ ] Configure allowed CORS origins (no wildcards)
- [ ] Enable HTTPS in production
- [ ] Set `NODE_ENV=production`
- [ ] Run database migrations
- [ ] Test all critical flows
- [ ] Review logs for errors
- [ ] Update documentation
- [ ] Notify users of security update

---

## Monitoring After Deployment

Monitor these metrics:

1. **Failed authentication attempts** - spike indicates attack
2. **Rate limit hits** - normal behavior or attack?
3. **CSRF errors** - should be rare, investigate if frequent
4. **Validation errors** - watch for patterns
5. **Error rates** - should not increase after fixes

---

## Additional Recommendations

1. **Implement Security Audit Logging**
   - Log all admin actions
   - Log all failed auth attempts with IP
   - Store in separate audit database

2. **Add Automated Security Testing**
   ```bash
   npm install --save-dev @types/supertest supertest
   ```

   Create tests for security features in `tests/security/`

3. **Regular Security Reviews**
   - Schedule quarterly security audits
   - Keep dependencies updated
   - Monitor CVE databases for used packages

4. **Incident Response Plan**
   - Document steps for security incidents
   - Define escalation procedures
   - Test incident response annually

---

**Questions?** Review the detailed findings in `SECURITY_REVIEW.md`
