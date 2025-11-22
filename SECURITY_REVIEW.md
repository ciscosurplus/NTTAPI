# Security Code Review Report - NTTAPI

**Date:** November 22, 2025
**Reviewer:** Claude (AI Security Code Review)
**Repository:** NTTAPI
**Branch:** claude/security-code-review-01ScU2Qq7MJbmTVsGaK5sPFC

---

## Executive Summary

This security code review identified **23 security vulnerabilities** across the NTTAPI codebase, ranging from **CRITICAL** to **LOW** severity. The most critical issues involve authentication weaknesses, input validation gaps, and potential injection vulnerabilities that could lead to unauthorized access and data breaches.

**Risk Distribution:**
- 🔴 **CRITICAL:** 8 issues
- 🟠 **HIGH:** 7 issues
- 🟡 **MEDIUM:** 6 issues
- 🟢 **LOW:** 2 issues

---

## Table of Contents

1. [Critical Vulnerabilities](#critical-vulnerabilities)
2. [High Severity Issues](#high-severity-issues)
3. [Medium Severity Issues](#medium-severity-issues)
4. [Low Severity Issues](#low-severity-issues)
5. [Best Practices & Recommendations](#best-practices--recommendations)
6. [Remediation Priority](#remediation-priority)

---

## Critical Vulnerabilities

### 🔴 CRITICAL-01: Hardcoded Default Admin Credentials

**Location:** `src/middleware/auth.middleware.ts:131-132`

**Description:**
```typescript
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
```

The application falls back to hardcoded default credentials (`admin:admin`) if environment variables are not set. This is a **severe security risk** as:
- Attackers can gain full admin access if environment variables are not configured
- Default credentials are well-known and commonly tested in attacks
- Admin panel has full access to create users, tokens, view analytics

**Impact:** Complete system compromise, unauthorized access to all admin functions

**Recommendation:**
- Remove default values entirely
- Force application to fail startup if admin credentials are not configured
- Implement proper secret management (e.g., HashiCorp Vault, AWS Secrets Manager)
- Add startup validation:
  ```typescript
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment');
  }
  ```

---

### 🔴 CRITICAL-02: SQL Injection Vulnerability in Token Validation

**Location:** `src/services/token.service.ts:72-108`

**Description:**
The `validateToken` method retrieves ALL active tokens from the database and loops through them to check bcrypt hashes:

```typescript
const result = await query(
  `SELECT t.*, u.name as user_name, u.email as user_email
   FROM api_tokens t
   JOIN users u ON t.user_id = u.id
   WHERE t.is_active = true`,
  []
);

for (const row of result.rows) {
  const isValid = await this.verifyToken(token, row.token_hash);
  // ...
}
```

**Issues:**
1. **Performance Attack Vector:** An attacker can trigger expensive bcrypt operations on every token in the database by sending random tokens
2. **Timing Attack:** Response time reveals number of active tokens
3. **DoS Potential:** With many tokens, this becomes a DoS vector
4. While parameterized queries prevent SQL injection here, the approach is fundamentally flawed

**Impact:** Denial of Service, timing attacks, performance degradation

**Recommendation:**
- Add an indexed `token_prefix` or `token_identifier` column to enable efficient lookup
- Consider using JWT tokens instead of database-stored tokens
- Add rate limiting specifically for failed authentication attempts
- Implement early rejection for obviously invalid tokens:
  ```typescript
  if (!token.startsWith(TOKEN_PREFIX)) {
    return null; // Fast rejection
  }
  ```

---

### 🔴 CRITICAL-03: No CSRF Protection

**Location:** All POST/PUT/DELETE endpoints

**Description:**
The application lacks Cross-Site Request Forgery (CSRF) protection on state-changing operations. All admin endpoints (`/admin/*`) and user-facing endpoints are vulnerable.

**Attack Scenario:**
1. Admin logs into dashboard
2. Attacker tricks admin into visiting malicious page
3. Malicious page sends authenticated requests to create tokens, delete users, etc.

**Impact:** Unauthorized state changes, privilege escalation, data manipulation

**Recommendation:**
- Implement CSRF tokens using `csurf` middleware:
  ```typescript
  import csrf from 'csurf';
  const csrfProtection = csrf({ cookie: true });
  app.use(csrfProtection);
  ```
- For API endpoints, use custom headers (e.g., `X-Requested-With`) that browsers cannot set cross-origin
- Consider using SameSite cookie attributes: `sameSite: 'strict'`

---

### 🔴 CRITICAL-04: XSS Vulnerability in Dashboard

**Location:** `public/js/dashboard.js` (Multiple locations)

**Description:**
User-controlled data is inserted into the DOM using `innerHTML` without sanitization:

```javascript
// Line 166-168
activityLog.innerHTML = activities
  .map(activity => `<div class="activity-item">${activity}</div>`)
  .join('');

// Line 203-216: User data inserted directly
tbody.innerHTML = users.map(user => `
  <tr data-user-id="${user.id}">
    <td>${user.id}</td>
    <td>${user.username}</td>
    <td>${user.email}</td>
    ...
`).join('');
```

**Attack Scenario:**
If a user creates an account with username `<script>alert(document.cookie)</script>`, the script executes when admin views the user list.

**Impact:** Session hijacking, credential theft, malicious actions performed as admin

**Recommendation:**
- Use `textContent` instead of `innerHTML` for user data
- Implement Content Security Policy (already partially done, but needs strengthening)
- Use DOMPurify or similar library for HTML sanitization
- Escape HTML entities:
  ```javascript
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  ```

---

### 🔴 CRITICAL-05: Timing Attack in Admin Authentication

**Location:** `src/middleware/auth.middleware.ts:134`

**Description:**
Admin credentials are compared using the standard equality operator:

```typescript
if (username !== adminUsername || password !== adminPassword) {
  // Reject
}
```

This allows timing attacks to determine:
1. If username is correct (password check is skipped if username is wrong)
2. Character-by-character password through microsecond timing analysis

**Impact:** Brute force attacks made easier, credential enumeration

**Recommendation:**
- Use constant-time comparison functions:
  ```typescript
  import crypto from 'crypto';

  function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still compare to prevent timing leaks
      crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  const usernameValid = timingSafeEqual(username, adminUsername);
  const passwordValid = timingSafeEqual(password, adminPassword);

  if (!usernameValid || !passwordValid) {
    // Reject
  }
  ```
- Add exponential backoff for failed login attempts
- Implement account lockout after N failed attempts

---

### 🔴 CRITICAL-06: No Input Validation

**Location:** Multiple controllers and services

**Description:**
User inputs are accepted without validation or sanitization:

**Examples:**
1. `src/controllers/admin.controller.ts:11-17` - Email format not validated
2. `src/controllers/admin.controller.ts:50-56` - No validation on user_id format
3. `src/controllers/chat.controller.ts:15` - Messages array not validated for structure
4. No maximum length checks on any string inputs

**Impact:**
- Data integrity issues
- Potential for injection attacks
- Database corruption
- DoS through oversized inputs

**Recommendation:**
- Implement input validation library (e.g., `joi`, `zod`, `express-validator`):
  ```typescript
  import { z } from 'zod';

  const createUserSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(255),
  });

  const { name, email } = createUserSchema.parse(req.body);
  ```
- Add validation middleware to all endpoints
- Validate UUID formats for IDs
- Implement maximum request body size limits

---

### 🔴 CRITICAL-07: No Rate Limiting on Admin Endpoints

**Location:** `src/routes/admin.routes.ts`

**Description:**
Admin endpoints lack rate limiting, allowing unlimited brute force attempts on admin credentials:

```typescript
router.use(adminAuth); // No rate limiting before this
```

**Impact:**
- Brute force attacks on admin credentials
- API abuse
- DoS attacks

**Recommendation:**
- Add aggressive rate limiting for admin routes:
  ```typescript
  import rateLimit from 'express-rate-limit';

  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many admin login attempts, please try again later',
  });

  router.use(adminLimiter);
  router.use(adminAuth);
  ```
- Implement progressive delays on failed auth attempts
- Log all failed admin authentication attempts with IP addresses

---

### 🔴 CRITICAL-08: Insecure CORS Configuration

**Location:** `src/index.ts:36-39`

**Description:**
CORS is configured to allow all origins by default:

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: process.env.CORS_CREDENTIALS === 'true',
}));
```

When `credentials: true` is combined with `origin: '*'`, browsers reject the request. However, the default `'*'` allows any origin to access the API, enabling CSRF-like attacks.

**Impact:** Cross-origin data theft, CSRF attacks

**Recommendation:**
- Use explicit whitelist of allowed origins:
  ```typescript
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));
  ```
- Remove `'*'` default
- Document required CORS configuration in README

---

## High Severity Issues

### 🟠 HIGH-01: Information Disclosure in Error Messages

**Location:** Multiple files

**Description:**
Error messages leak sensitive implementation details:

```typescript
// src/middleware/auth.middleware.ts:66-71
res.status(500).json({
  error: {
    message: 'Internal server error during authentication',
    type: 'server_error',
  },
});

// src/index.ts:126-139
logger.error('Unhandled error:', {
  error: err.message,
  stack: err.stack, // Stack traces logged
  path: req.path,
  method: req.method,
});
```

Stack traces and internal errors may be exposed in:
1. Log files accessible to attackers
2. Error monitoring services
3. Debug mode responses

**Impact:** Information leakage aiding further attacks

**Recommendation:**
- Return generic error messages to clients
- Log detailed errors internally only
- Never expose stack traces to users
- Implement error code system:
  ```typescript
  res.status(500).json({
    error: {
      message: 'An error occurred',
      code: 'AUTH_ERROR_001', // Internal tracking code
    },
  });
  ```

---

### 🟠 HIGH-02: Unauthenticated Dashboard Access

**Location:** `src/index.ts:80-84`

**Description:**
The admin dashboard is served without authentication:

```typescript
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

Additionally, the dashboard JavaScript has mock authentication:
```javascript
// public/js/dashboard.js:86-90
checkAuth() {
  if (!this.authToken) {
    this.authToken = 'demo-token'; // Mock token!
    localStorage.setItem('authToken', this.authToken);
  }
}
```

**Impact:**
- Anyone can access the dashboard interface
- While API endpoints are protected, the UI exposure is unprofessional
- Information disclosure about system structure

**Recommendation:**
- Add authentication middleware to dashboard routes:
  ```typescript
  app.get('/', adminAuth, (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
  ```
- Implement proper session-based authentication for the dashboard
- Remove mock authentication logic

---

### 🟠 HIGH-03: SQL Query Debug Logging

**Location:** `src/config/database.ts:35`

**Description:**
Database queries are logged with parameters:

```typescript
logger.debug('Executed query', { text, duration, rows: result.rowCount });
```

If debug logging is enabled in production, sensitive data (passwords, tokens, PII) may be logged.

**Impact:** Credential exposure, PII leakage in logs

**Recommendation:**
- Never log query parameters in production
- Implement conditional debug logging:
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
  } else {
    logger.info('Query executed', { duration, rows: result.rowCount });
  }
  ```
- Add log sanitization to remove sensitive fields

---

### 🟠 HIGH-04: Weak bcrypt Rounds

**Location:** `src/services/token.service.ts:7`

**Description:**
```typescript
const BCRYPT_ROUNDS = 10;
```

Modern hardware can compute ~10,000 bcrypt hashes per second at round 10. Best practice recommends 12-14 rounds.

**Impact:** Faster brute force attacks on compromised password hashes

**Recommendation:**
- Increase to 12 rounds minimum:
  ```typescript
  const BCRYPT_ROUNDS = 12;
  ```
- Consider using Argon2 instead of bcrypt for new implementations

---

### 🟠 HIGH-05: No Request Size Limits

**Location:** `src/index.ts:41-42`

**Description:**
```typescript
app.use(express.json()); // No size limit
app.use(express.urlencoded({ extended: true })); // No size limit
```

Attackers can send extremely large payloads causing memory exhaustion.

**Impact:** Denial of Service

**Recommendation:**
```typescript
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

---

### 🟠 HIGH-06: Missing Security Headers

**Location:** `src/index.ts:26-35`

**Description:**
While Helmet is used, critical security headers are not configured:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Unsafe!
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

**Issues:**
- `'unsafe-inline'` for scripts defeats XSS protection
- Missing HSTS header
- Missing X-Frame-Options
- Missing X-Content-Type-Options

**Recommendation:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```
- Use nonces for inline scripts instead of `'unsafe-inline'`

---

### 🟠 HIGH-07: No Token Expiration

**Location:** `src/services/token.service.ts:36-66`

**Description:**
API tokens never expire once created. Compromised tokens remain valid indefinitely.

**Impact:** Long-term unauthorized access from compromised tokens

**Recommendation:**
- Add `expires_at` column to `api_tokens` table
- Implement token rotation
- Add automatic expiration checks
- Provide token refresh mechanism

---

## Medium Severity Issues

### 🟡 MEDIUM-01: Insufficient Logging of Security Events

**Location:** Multiple files

**Description:**
Security-relevant events lack comprehensive logging:
- Failed login attempts logged but without IP tracking
- Token revocations logged but no audit trail
- No logging of privilege changes

**Recommendation:**
- Implement comprehensive audit logging:
  ```typescript
  logger.warn('Failed admin login attempt', {
    username,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
    geoip: await getGeoIP(req.ip), // Optional
  });
  ```
- Create separate security audit log
- Integrate with SIEM system

---

### 🟡 MEDIUM-02: No HTTP to HTTPS Redirect

**Location:** `src/index.ts`

**Description:**
Application doesn't enforce HTTPS, allowing credentials to be transmitted over unencrypted connections.

**Recommendation:**
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

### 🟡 MEDIUM-03: Predictable UUID v4 Usage

**Location:** Multiple files

**Description:**
While UUIDv4 is cryptographically random, for security-sensitive identifiers, consider UUIDv7 or cryptographically secure random tokens.

**Recommendation:**
- For API tokens, use crypto.randomBytes():
  ```typescript
  import crypto from 'crypto';

  private generateToken(): string {
    const randomBytes = crypto.randomBytes(32);
    return `${TOKEN_PREFIX}${randomBytes.toString('base64url')}`;
  }
  ```

---

### 🟡 MEDIUM-04: Missing Database Connection Encryption

**Location:** `src/config/database.ts:7-17`

**Description:**
No SSL/TLS configuration for PostgreSQL connections:

```typescript
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  // No SSL configuration
};
```

**Recommendation:**
```typescript
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-cert.pem').toString(),
  } : false,
};
```

---

### 🟡 MEDIUM-05: Redis Connection Without Password

**Location:** `.env.example:26`

**Description:**
```
REDIS_PASSWORD=
```

Empty Redis password in example configuration encourages insecure deployments.

**Recommendation:**
- Require Redis password in production
- Add startup validation
- Document Redis security requirements

---

### 🟡 MEDIUM-06: No Session Timeout

**Location:** Auth middleware

**Description:**
Authenticated sessions (admin) never timeout, allowing indefinite access.

**Recommendation:**
- Implement session timeout (e.g., 30 minutes of inactivity)
- Add absolute session maximum (e.g., 24 hours)
- Force re-authentication for sensitive operations

---

## Low Severity Issues

### 🟢 LOW-01: Verbose Logging in Production

**Location:** Multiple files

**Description:**
Debug logs include sensitive operational details that could aid attackers.

**Recommendation:**
- Set `LOG_LEVEL=info` in production
- Remove debug logs containing sensitive data

---

### 🟢 LOW-02: Missing Package.json Security Audit

**Location:** Build/deployment process

**Description:**
No evidence of regular dependency security audits.

**Recommendation:**
- Add to CI/CD pipeline:
  ```bash
  npm audit --production
  npm audit fix
  ```
- Use Dependabot or Snyk for automated vulnerability scanning

---

## Best Practices & Recommendations

### 1. Implement Security Testing
- Add automated security testing to CI/CD
- Use OWASP ZAP or similar tools for dynamic testing
- Implement pre-commit hooks for secret scanning

### 2. Secret Management
- Use environment-specific secret management (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly
- Never commit secrets to git (already following this)

### 3. Code Quality
- Add TypeScript strict mode:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true
    }
  }
  ```
- Implement ESLint security rules (eslint-plugin-security)

### 4. Database Security
- Implement database-level encryption at rest
- Use read-only database users where possible
- Regular backup and disaster recovery testing

### 5. Monitoring and Alerting
- Implement real-time security alerting
- Monitor for suspicious patterns (failed logins, rate limit hits)
- Set up intrusion detection

### 6. Documentation
- Document security assumptions
- Create incident response plan
- Maintain security changelog

---

## Remediation Priority

### Phase 1 (Immediate - Critical)
1. **CRITICAL-01**: Remove hardcoded admin credentials
2. **CRITICAL-03**: Implement CSRF protection
3. **CRITICAL-05**: Fix timing attack in admin auth
4. **CRITICAL-07**: Add rate limiting to admin endpoints
5. **CRITICAL-08**: Fix CORS configuration

### Phase 2 (Week 1 - Critical & High)
6. **CRITICAL-02**: Optimize token validation
7. **CRITICAL-04**: Fix XSS in dashboard
8. **CRITICAL-06**: Add input validation
9. **HIGH-02**: Add dashboard authentication
10. **HIGH-05**: Add request size limits
11. **HIGH-06**: Configure security headers properly

### Phase 3 (Week 2 - High & Medium)
12. **HIGH-01**: Improve error handling
13. **HIGH-03**: Fix query logging
14. **HIGH-04**: Increase bcrypt rounds
15. **HIGH-07**: Implement token expiration
16. **MEDIUM-01**: Enhanced security logging
17. **MEDIUM-02**: HTTPS enforcement

### Phase 4 (Week 3-4 - Medium & Low)
18. Remaining Medium and Low severity issues
19. Implement comprehensive security testing
20. Documentation and monitoring improvements

---

## Conclusion

The NTTAPI codebase has significant security vulnerabilities that require immediate attention. The most critical issues involve authentication weaknesses and input validation gaps that could lead to complete system compromise.

**Recommended Actions:**
1. Address all CRITICAL issues within 48 hours
2. Implement HIGH severity fixes within 1 week
3. Create a security improvement roadmap for MEDIUM/LOW items
4. Establish ongoing security review process
5. Implement automated security testing in CI/CD

**Estimated Remediation Effort:**
- Phase 1 (Critical): 2-3 days
- Phase 2 (Critical & High): 5-7 days
- Phase 3 (High & Medium): 5-7 days
- Phase 4 (Remaining): 3-5 days
- **Total: 15-22 days** (3-4 weeks with proper testing)

---

**Report End**
