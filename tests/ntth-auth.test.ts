/**
 * NTTH API Authentication and Connection Test
 *
 * This test suite verifies:
 * 1. NTTH API credentials are properly configured
 * 2. Backend connection to NTTH API works
 * 3. Authentication flow succeeds
 * 4. Token is valid and can be used for API calls
 * 5. Error handling for various failure scenarios
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
const NTTH_API_BASE_URL = process.env.NTTH_API_BASE_URL || 'https://api.ntth.ai/v1';
const NTTH_APP_ID = process.env.NTTH_APP_ID || '';
const NTTH_APP_SECRET = process.env.NTTH_APP_SECRET || '';
const TEST_TIMEOUT = 30000; // 30 seconds

interface NTTHAuthResponse {
  token: string;
  region: string;
  applicationId: string;
  applicationName: string;
  clientType: string;
  tenant: {
    id: string;
    name: string;
  };
  rbac: any;
  sessionStart: string;
  sessionEnd: string;
  expiresIn: number;
  expiry: string;
}

interface NTTHModel {
  id: string;
  provider: string;
  type: string;
  name: string;
  deploymentName: string;
  version: string;
  classification: string;
  capabilities: string[];
  providerPriority: number;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

describe('NTTH API Authentication and Connection Tests', () => {
  let authToken: string | null = null;

  describe('Configuration Tests', () => {
    test('should have NTTH API credentials configured', () => {
      expect(NTTH_APP_ID).toBeTruthy();
      expect(NTTH_APP_ID.length).toBeGreaterThan(0);
      expect(NTTH_APP_SECRET).toBeTruthy();
      expect(NTTH_APP_SECRET.length).toBeGreaterThan(0);
    });

    test('should have valid NTTH API base URL', () => {
      expect(NTTH_API_BASE_URL).toBeTruthy();
      expect(NTTH_API_BASE_URL).toMatch(/^https?:\/\//);
    });
  });

  describe('Backend Connection Tests', () => {
    test('should successfully connect to NTTH API backend', async () => {
      try {
        const response = await axios.post(
          `${NTTH_API_BASE_URL}/auth/appLogin`,
          {
            id: NTTH_APP_ID,
            secret: NTTH_APP_SECRET,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: TEST_TIMEOUT,
          }
        );

        // Verify response status
        expect(response.status).toBe(200);

        // Verify response structure
        const authData: NTTHAuthResponse = response.data;
        expect(authData).toBeDefined();
        expect(authData.token).toBeDefined();
        expect(typeof authData.token).toBe('string');
        expect(authData.token.length).toBeGreaterThan(0);

        // Store token for subsequent tests
        authToken = authData.token;

        // Verify additional response fields
        expect(authData.applicationId).toBeDefined();
        expect(authData.applicationName).toBeDefined();
        expect(authData.expiresIn).toBeGreaterThan(0);
        expect(authData.expiry).toBeDefined();
        expect(authData.sessionStart).toBeDefined();
        expect(authData.sessionEnd).toBeDefined();

        console.log('✓ Authentication successful');
        console.log(`  Application: ${authData.applicationName}`);
        console.log(`  Application ID: ${authData.applicationId}`);
        console.log(`  Region: ${authData.region}`);
        console.log(`  Token expires in: ${authData.expiresIn} seconds`);
        console.log(`  Session start: ${authData.sessionStart}`);
        console.log(`  Session end: ${authData.sessionEnd}`);
      } catch (error: any) {
        if (error.response) {
          // Server responded with error
          console.error('✗ Authentication failed with server error:');
          console.error(`  Status: ${error.response.status}`);
          console.error(`  Message: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
          // Request made but no response
          console.error('✗ No response from NTTH API backend:');
          console.error(`  ${error.message}`);
        } else {
          // Other errors
          console.error('✗ Error setting up authentication request:');
          console.error(`  ${error.message}`);
        }
        throw error;
      }
    }, TEST_TIMEOUT);
  });

  describe('Token Validation Tests', () => {
    test('should be able to use token to fetch models', async () => {
      // Skip if no token from previous test
      if (!authToken) {
        throw new Error('No auth token available. Authentication test may have failed.');
      }

      try {
        const response = await axios.get(
          `${NTTH_API_BASE_URL}/chat/models`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            timeout: TEST_TIMEOUT,
          }
        );

        // Verify response
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);

        const models: NTTHModel[] = response.data;
        expect(models.length).toBeGreaterThan(0);

        // Verify model structure
        const firstModel = models[0];
        expect(firstModel.id).toBeDefined();
        expect(firstModel.provider).toBeDefined();
        expect(firstModel.name).toBeDefined();
        expect(Array.isArray(firstModel.capabilities)).toBe(true);

        console.log(`✓ Token validation successful`);
        console.log(`  Retrieved ${models.length} available models`);
        console.log(`  Sample model: ${firstModel.name} (${firstModel.provider})`);
        console.log(`  Capabilities: ${firstModel.capabilities.join(', ')}`);
      } catch (error: any) {
        if (error.response) {
          console.error('✗ Token validation failed:');
          console.error(`  Status: ${error.response.status}`);
          console.error(`  Message: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
          console.error('✗ No response from NTTH API:');
          console.error(`  ${error.message}`);
        } else {
          console.error('✗ Error using token:');
          console.error(`  ${error.message}`);
        }
        throw error;
      }
    }, TEST_TIMEOUT);
  });

  describe('Error Handling Tests', () => {
    test('should handle invalid credentials gracefully', async () => {
      try {
        await axios.post(
          `${NTTH_API_BASE_URL}/auth/appLogin`,
          {
            id: 'invalid-app-id',
            secret: 'invalid-secret',
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: TEST_TIMEOUT,
          }
        );

        // Should not reach here
        fail('Expected authentication to fail with invalid credentials');
      } catch (error: any) {
        // Should throw an error
        expect(error.response).toBeDefined();
        expect(error.response.status).toBeGreaterThanOrEqual(400);

        console.log('✓ Invalid credentials properly rejected');
        console.log(`  Status: ${error.response.status}`);
      }
    }, TEST_TIMEOUT);

    test('should handle unauthorized API access', async () => {
      try {
        await axios.get(
          `${NTTH_API_BASE_URL}/chat/models`,
          {
            headers: {
              'Authorization': 'Bearer invalid-token',
              'Content-Type': 'application/json',
            },
            timeout: TEST_TIMEOUT,
          }
        );

        // Should not reach here
        fail('Expected API call to fail with invalid token');
      } catch (error: any) {
        // Should throw an error
        expect(error.response).toBeDefined();
        expect(error.response.status).toBeGreaterThanOrEqual(400);

        console.log('✓ Invalid token properly rejected');
        console.log(`  Status: ${error.response.status}`);
      }
    }, TEST_TIMEOUT);

    test('should handle network timeout gracefully', async () => {
      try {
        await axios.get(
          `${NTTH_API_BASE_URL}/chat/models`,
          {
            headers: {
              'Authorization': `Bearer ${authToken || 'test-token'}`,
            },
            timeout: 1, // 1ms timeout to force timeout
          }
        );

        // Should not reach here
        fail('Expected request to timeout');
      } catch (error: any) {
        // Should be a timeout error
        expect(error.code === 'ECONNABORTED' || error.message.includes('timeout')).toBe(true);

        console.log('✓ Network timeout handled gracefully');
        console.log(`  Error: ${error.message}`);
      }
    }, TEST_TIMEOUT);
  });

  describe('API Health Check', () => {
    test('should verify complete API workflow', async () => {
      // This test combines authentication, token usage, and error handling
      // to ensure the complete workflow is functional

      let token: string;

      // Step 1: Authenticate
      try {
        const authResponse = await axios.post(
          `${NTTH_API_BASE_URL}/auth/appLogin`,
          {
            id: NTTH_APP_ID,
            secret: NTTH_APP_SECRET,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: TEST_TIMEOUT,
          }
        );

        token = authResponse.data.token;
        expect(token).toBeTruthy();
        console.log('  Step 1: ✓ Authentication successful');
      } catch (error: any) {
        console.error('  Step 1: ✗ Authentication failed');
        throw error;
      }

      // Step 2: Fetch models
      try {
        const modelsResponse = await axios.get(
          `${NTTH_API_BASE_URL}/chat/models`,
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: TEST_TIMEOUT,
          }
        );

        expect(modelsResponse.status).toBe(200);
        expect(Array.isArray(modelsResponse.data)).toBe(true);
        console.log(`  Step 2: ✓ Retrieved ${modelsResponse.data.length} models`);
      } catch (error: any) {
        console.error('  Step 2: ✗ Model fetch failed');
        throw error;
      }

      // Step 3: Verify token info
      try {
        const tokenResponse = await axios.post(
          `${NTTH_API_BASE_URL}/auth/token`,
          {},
          {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: TEST_TIMEOUT,
          }
        );

        expect(tokenResponse.status).toBe(200);
        console.log('  Step 3: ✓ Token verification successful');
      } catch (error: any) {
        console.error('  Step 3: ✗ Token verification failed');
        throw error;
      }

      console.log('\n✓ Complete API workflow verified successfully');
    }, TEST_TIMEOUT * 3);
  });
});
