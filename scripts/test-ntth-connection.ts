#!/usr/bin/env ts-node
/**
 * NTTH API Connection Test Script
 *
 * This standalone script tests the NTTH API connection and authentication.
 * Run with: npm run test:connection
 * Or directly: ts-node scripts/test-ntth-connection.ts
 *
 * Requires environment variables:
 * - NTTH_API_BASE_URL (default: https://api.ntth.ai/v1)
 * - NTTH_APP_ID
 * - NTTH_APP_SECRET
 */

import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  baseURL: process.env.NTTH_API_BASE_URL || 'https://api.ntth.ai/v1',
  appId: process.env.NTTH_APP_ID || '',
  appSecret: process.env.NTTH_APP_SECRET || '',
  timeout: 30000,
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions
function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logSection(message: string) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(`  ${message}`, colors.bright + colors.blue);
  log(`${'='.repeat(60)}`, colors.blue);
}

// Test functions
async function testConfiguration(): Promise<boolean> {
  logSection('Configuration Check');

  let passed = true;

  // Check base URL
  if (!config.baseURL) {
    logError('NTTH_API_BASE_URL is not configured');
    passed = false;
  } else {
    logSuccess(`Base URL: ${config.baseURL}`);
  }

  // Check App ID
  if (!config.appId) {
    logError('NTTH_APP_ID is not configured');
    logInfo('Set NTTH_APP_ID in your .env file');
    passed = false;
  } else {
    logSuccess(`App ID: ${config.appId.substring(0, 8)}...`);
  }

  // Check App Secret
  if (!config.appSecret) {
    logError('NTTH_APP_SECRET is not configured');
    logInfo('Set NTTH_APP_SECRET in your .env file');
    passed = false;
  } else {
    logSuccess(`App Secret: ${'*'.repeat(config.appSecret.length)}`);
  }

  return passed;
}

async function testAuthentication(): Promise<string | null> {
  logSection('Authentication Test');

  try {
    logInfo('Attempting to authenticate with NTTH API...');

    const response = await axios.post(
      `${config.baseURL}/auth/appLogin`,
      {
        id: config.appId,
        secret: config.appSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: config.timeout,
      }
    );

    if (response.status === 200 && response.data.token) {
      const authData = response.data;

      logSuccess('Authentication successful!');
      console.log('');
      logInfo(`Application Name: ${authData.applicationName}`);
      logInfo(`Application ID: ${authData.applicationId}`);
      logInfo(`Region: ${authData.region}`);
      logInfo(`Client Type: ${authData.clientType}`);
      logInfo(`Tenant: ${authData.tenant.name} (${authData.tenant.id})`);
      logInfo(`Session Start: ${authData.sessionStart}`);
      logInfo(`Session End: ${authData.sessionEnd}`);
      logInfo(`Expires In: ${authData.expiresIn} seconds`);
      logInfo(`Expiry Time: ${authData.expiry}`);

      return authData.token;
    } else {
      logError('Authentication failed: Invalid response format');
      return null;
    }
  } catch (error) {
    handleError('Authentication failed', error as AxiosError);
    return null;
  }
}

async function testTokenValidation(token: string): Promise<boolean> {
  logSection('Token Validation Test');

  try {
    logInfo('Verifying token with /auth/token endpoint...');

    const response = await axios.post(
      `${config.baseURL}/auth/token`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: config.timeout,
      }
    );

    if (response.status === 200) {
      logSuccess('Token is valid!');

      if (response.data) {
        console.log('');
        logInfo('Token Details:');
        console.log(JSON.stringify(response.data, null, 2));
      }

      return true;
    } else {
      logError('Token validation failed');
      return false;
    }
  } catch (error) {
    handleError('Token validation failed', error as AxiosError);
    return false;
  }
}

async function testModelListing(token: string): Promise<boolean> {
  logSection('Model Listing Test');

  try {
    logInfo('Fetching available models from NTTH API...');

    const response = await axios.get(
      `${config.baseURL}/chat/models`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: config.timeout,
      }
    );

    if (response.status === 200 && Array.isArray(response.data)) {
      const models = response.data;

      logSuccess(`Successfully retrieved ${models.length} models`);
      console.log('');

      // Group models by provider
      const modelsByProvider: Record<string, any[]> = {};
      models.forEach(model => {
        if (!modelsByProvider[model.provider]) {
          modelsByProvider[model.provider] = [];
        }
        modelsByProvider[model.provider].push(model);
      });

      // Display summary
      logInfo('Models by Provider:');
      Object.entries(modelsByProvider).forEach(([provider, providerModels]) => {
        console.log(`  ${provider}: ${providerModels.length} models`);
      });

      // Show sample models
      console.log('');
      logInfo('Sample Models (first 5):');
      models.slice(0, 5).forEach((model, index) => {
        console.log(`  ${index + 1}. ${model.name}`);
        console.log(`     Provider: ${model.provider} | Type: ${model.type}`);
        console.log(`     Capabilities: ${model.capabilities.join(', ')}`);
        console.log(`     Classification: ${model.classification}`);
      });

      return true;
    } else {
      logError('Failed to retrieve models: Invalid response format');
      return false;
    }
  } catch (error) {
    handleError('Model listing failed', error as AxiosError);
    return false;
  }
}

async function testErrorHandling(): Promise<void> {
  logSection('Error Handling Tests');

  // Test 1: Invalid credentials
  try {
    logInfo('Test 1: Testing invalid credentials...');

    await axios.post(
      `${config.baseURL}/auth/appLogin`,
      {
        id: 'invalid-id',
        secret: 'invalid-secret',
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: config.timeout,
      }
    );

    logWarning('Invalid credentials were accepted (unexpected)');
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response && axiosError.response.status >= 400) {
      logSuccess('Invalid credentials properly rejected');
      logInfo(`  Response: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
    } else {
      logError('Unexpected error response for invalid credentials');
    }
  }

  // Test 2: Invalid token
  try {
    logInfo('Test 2: Testing invalid token...');

    await axios.get(
      `${config.baseURL}/chat/models`,
      {
        headers: { 'Authorization': 'Bearer invalid-token-12345' },
        timeout: config.timeout,
      }
    );

    logWarning('Invalid token was accepted (unexpected)');
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response && axiosError.response.status >= 400) {
      logSuccess('Invalid token properly rejected');
      logInfo(`  Response: ${axiosError.response.status}`);
    } else {
      logError('Unexpected error response for invalid token');
    }
  }
}

function handleError(context: string, error: AxiosError): void {
  logError(context);

  if (error.response) {
    // Server responded with error status
    console.log('');
    logInfo('Error Details:');
    console.log(`  Status: ${error.response.status} ${error.response.statusText}`);
    console.log(`  Response:`, JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    // Request made but no response received
    console.log('');
    logInfo('Error Details:');
    console.log(`  No response received from server`);
    console.log(`  Message: ${error.message}`);

    if (error.code === 'ECONNABORTED') {
      logInfo('  Reason: Request timeout');
    } else if (error.code === 'ENOTFOUND') {
      logInfo('  Reason: DNS resolution failed - check base URL');
    } else if (error.code === 'ECONNREFUSED') {
      logInfo('  Reason: Connection refused - server may be down');
    }
  } else {
    // Error setting up request
    console.log('');
    logInfo('Error Details:');
    console.log(`  ${error.message}`);
  }
}

// Main execution
async function main() {
  log('\n', colors.reset);
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                                                            ║', colors.cyan);
  log('║        NTTH API Connection & Authentication Test          ║', colors.cyan);
  log('║                                                            ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝', colors.cyan);

  let exitCode = 0;

  try {
    // Step 1: Configuration check
    const configOk = await testConfiguration();
    if (!configOk) {
      logError('\nConfiguration check failed. Please configure your environment variables.');
      logInfo('Copy .env.example to .env and fill in your NTTH API credentials.');
      process.exit(1);
    }

    // Step 2: Authentication
    const token = await testAuthentication();
    if (!token) {
      logError('\nAuthentication failed. Please check your credentials.');
      exitCode = 1;
    } else {
      // Step 3: Token validation
      const tokenValid = await testTokenValidation(token);
      if (!tokenValid) {
        logWarning('\nToken validation failed, but continuing with other tests...');
      }

      // Step 4: Model listing
      const modelsOk = await testModelListing(token);
      if (!modelsOk) {
        logWarning('\nModel listing failed.');
        exitCode = 1;
      }
    }

    // Step 5: Error handling tests
    await testErrorHandling();

    // Summary
    logSection('Test Summary');
    if (exitCode === 0) {
      logSuccess('All tests passed! ✓');
      logInfo('Your NTTH API connection is properly configured and working.');
    } else {
      logWarning('Some tests failed. Please review the errors above.');
    }

  } catch (error) {
    logError('\nUnexpected error during test execution:');
    console.error(error);
    exitCode = 1;
  }

  log('\n');
  process.exit(exitCode);
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { testConfiguration, testAuthentication, testTokenValidation, testModelListing };
