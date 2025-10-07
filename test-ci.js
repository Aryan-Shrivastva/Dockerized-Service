// CI/CD Test Script - Simplified version for automated testing
const http = require('http');
const { spawn } = require('child_process');

// Test configuration
const TEST_PORT = process.env.PORT || 3005; // Use 3005 as default
const AUTH_USER = process.env.APP_USERNAME || 'admin';
const AUTH_PASS = process.env.APP_PASSWORD || 'secretpassword123';

let testServer = null;

const runTest = (testName, url, expectedStatus, expectedSubstring = null, auth = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1', // Use IPv4 explicitly instead of localhost
      port: TEST_PORT, // Use TEST_PORT directly
      path: url,
      method: 'GET',
      timeout: 5000
    };

    if (auth) {
      const authString = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      options.headers = {
        'Authorization': `Basic ${authString}`
      };
    }

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const statusMatch = res.statusCode === expectedStatus;
        const contentMatch = expectedSubstring ? data.includes(expectedSubstring) : true;
        
        if (statusMatch && contentMatch) {
          console.log(`✓ ${testName}: PASSED`);
          resolve(true);
        } else {
          console.log(`✗ ${testName}: FAILED`);
          console.log(`  Expected status: ${expectedStatus}, got: ${res.statusCode}`);
          if (expectedSubstring) {
            console.log(`  Expected content to include: "${expectedSubstring}"`);
          }
          reject(new Error(`Test failed: ${testName}`));
        }
      });
    });

    req.on('error', (err) => {
      console.log(`✗ ${testName}: ERROR - ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`✗ ${testName}: TIMEOUT`);
      reject(new Error(`Test timeout: ${testName}`));
    });

    req.end();
  });
};

const startTestServer = () => {
  return new Promise((resolve, reject) => {
    console.log(`Starting test server on port ${TEST_PORT}...`);
    
    testServer = spawn('node', ['app.js'], {
      env: { ...process.env, PORT: TEST_PORT, NODE_ENV: 'test' },
      stdio: 'pipe'
    });

    let serverStarted = false;
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        testServer.kill();
        reject(new Error('Server failed to start within timeout'));
      }
    }, 15000);

    testServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server is running')) {
        serverStarted = true;
        clearTimeout(timeout);
        console.log('✓ Test server started successfully');
        // Wait longer for full initialization in CI environments
        setTimeout(() => resolve(), 3000);
      }
    });

    testServer.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    testServer.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    testServer.on('exit', (code) => {
      if (!serverStarted && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
};

const runAllTests = async () => {
  console.log('Running application tests...\n');
  
  try {
    // Test 1: Public route
    await runTest('Public route test', '/', 200, 'Hello, world!');

    // Test 2: Secret route without auth
    await runTest('Secret route unauthorized test', '/secret', 401, 'Authentication required');

    // Test 3: Secret route with correct auth
    await runTest(
      'Secret route authorized test',
      '/secret',
      200,
      'successfully authenticated',
      { username: AUTH_USER, password: AUTH_PASS }
    );

    // Test 4: Invalid route
    await runTest('Invalid route test', '/nonexistent', 404, 'Route not found');

    console.log('\n✓ All tests passed!');
    return true;
    
  } catch (error) {
    console.log('\n✗ Tests failed!');
    console.error('Error:', error.message);
    return false;
  }
};

const cleanup = () => {
  if (testServer) {
    console.log('Stopping test server...');
    testServer.kill('SIGTERM');
    
    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (testServer && !testServer.killed) {
        testServer.kill('SIGKILL');
      }
    }, 5000);
  }
};

const main = async () => {
  let success = false;
  
  try {
    await startTestServer();
    success = await runAllTests();
  } catch (error) {
    console.error('Test execution failed:', error.message);
  } finally {
    cleanup();
  }
  
  process.exit(success ? 0 : 1);
};

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

main();