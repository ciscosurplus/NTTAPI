# NTTH API Tests

This directory contains tests for verifying the NTTH API connection and authentication.

## Test Files

### `ntth-auth.test.ts`

Comprehensive Jest test suite that verifies:

- ✅ Configuration validation (API credentials are set)
- ✅ Backend connection to NTTH API
- ✅ Authentication flow
- ✅ Token validation and usage
- ✅ Error handling for various failure scenarios
- ✅ Complete API workflow

## Running Tests

### Prerequisites

1. **Configure Environment Variables**

   Copy `.env.example` to `.env` and fill in your NTTH API credentials:

   ```bash
   cp .env.example .env
   ```

   Update the following values in `.env`:
   ```env
   NTTH_API_BASE_URL=https://api.ntth.ai/v1
   NTTH_APP_ID=your-actual-app-id-here
   NTTH_APP_SECRET=your-actual-app-secret-here
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

### Running the Tests

**Option 1: Run all tests**
```bash
npm test
```

**Option 2: Run only authentication tests**
```bash
npm run test:auth
```

**Option 3: Run standalone connection test script**
```bash
npm run test:connection
```

The standalone script (`test:connection`) provides colored, detailed output and is useful for:
- Quick verification of API credentials
- Manual testing during development
- Debugging connection issues
- Viewing detailed API responses

### Expected Output

#### Successful Test Run

```
NTTH API Authentication and Connection Tests
  Configuration Tests
    ✓ should have NTTH API credentials configured
    ✓ should have valid NTTH API base URL
  Backend Connection Tests
    ✓ should successfully connect to NTTH API backend
      ✓ Authentication successful
        Application: Your App Name
        Application ID: app-123...
        Region: us-east-1
        Token expires in: 86400 seconds
  Token Validation Tests
    ✓ should be able to use token to fetch models
      ✓ Token validation successful
        Retrieved 50 available models
        Sample model: GPT-4 (azure)
  Error Handling Tests
    ✓ should handle invalid credentials gracefully
    ✓ should handle unauthorized API access
    ✓ should handle network timeout gracefully
  API Health Check
    ✓ should verify complete API workflow
      Step 1: ✓ Authentication successful
      Step 2: ✓ Retrieved 50 models
      Step 3: ✓ Token verification successful
```

#### Failed Test (Missing Credentials)

```
NTTH API Authentication and Connection Tests
  Configuration Tests
    ✗ should have NTTH API credentials configured
      Expected value to be truthy
```

## Test Coverage

The tests cover the following scenarios:

### ✅ Happy Path
- Valid credentials authenticate successfully
- Token can be used for API calls
- Models can be retrieved
- Token validation works

### ❌ Error Scenarios
- Invalid credentials are rejected (401/403)
- Invalid tokens are rejected (401/403)
- Network timeouts are handled gracefully
- Missing configuration is detected

### 🔍 Validation
- Response structure is validated
- Token format is validated
- Model data structure is validated
- API response codes are checked

## Troubleshooting

### Test Timeout

If tests timeout, check:
- Network connection to `https://api.ntth.ai`
- Firewall settings
- API endpoint availability

### Authentication Failed

If authentication fails, verify:
- `NTTH_APP_ID` is correct
- `NTTH_APP_SECRET` is correct
- Credentials have not expired
- Account has proper permissions

### No Models Returned

If model listing fails:
- Check token permissions
- Verify account has access to models
- Check RBAC grants in auth response

### Environment Variables Not Loaded

Ensure:
- `.env` file exists in project root
- `.env` file has proper format (no quotes needed)
- `dotenv` package is installed

## Continuous Integration

To run these tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run NTTH API Tests
  env:
    NTTH_APP_ID: ${{ secrets.NTTH_APP_ID }}
    NTTH_APP_SECRET: ${{ secrets.NTTH_APP_SECRET }}
  run: npm run test:auth
```

Add `NTTH_APP_ID` and `NTTH_APP_SECRET` as secrets in your CI/CD platform.

## Security Notes

⚠️ **IMPORTANT**: Never commit your `.env` file or expose your API credentials!

- Keep `.env` in `.gitignore`
- Use environment variables in production
- Rotate credentials regularly
- Use secrets management in CI/CD

## Support

For issues with the NTTH API:
- Check the API documentation in `ntth.md`
- Review the OpenAPI specs (`auth.json`, `chat.json`)
- Contact NTTH support

For issues with these tests:
- Check test output for detailed error messages
- Run with `npm run test:connection` for verbose output
- Verify environment configuration
