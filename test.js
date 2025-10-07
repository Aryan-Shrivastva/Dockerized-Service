// Simple test script for the Node.js service
const http = require('http');
const { spawn } = require('child_process');

const runTest = (testName, url, expectedStatus, expectedSubstring = null, auth = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1', // Use IPv4 explicitly instead of localhost
      port: process.env.PORT || 3000,
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
          console.log(`  Response: ${data}`);
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

const runTests = async () => {
  console.log('Running application tests...\n');
  
  try {
    // Test 1: Public route should return "Hello, world!"
    await runTest(
      'Public route test',
      '/',
      200,
      'Hello, world!'
    );

    // Test 2: Secret route without auth should return 401
    await runTest(
      'Secret route unauthorized test',
      '/secret',
      401,
      'Authentication required'
    );

    // Test 3: Secret route with correct auth should return secret message
    const authUser = process.env.APP_USERNAME || 'admin';
    const authPass = process.env.APP_PASSWORD || 'secretpassword123';
    
    await runTest(
      'Secret route authorized test',
      '/secret',
      200,
      'successfully authenticated',
      { username: authUser, password: authPass }
    );

    // Test 4: Invalid route should return 404
    await runTest(
      'Invalid route test',
      '/nonexistent',
      404,
      'Route not found'
    );

    console.log('\n✓ All tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.log('\n✗ Tests failed!');
    console.error(error.message);
    process.exit(1);
  }
};

// Start server for testing
const startServer = () => {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const server = spawn('node', ['app.js'], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: 'pipe'
    });

    let serverStarted = false;
    const timeout = setTimeout(() => {
      if (!serverStarted) {
        server.kill();
        reject(new Error('Server failed to start within timeout'));
      }
    }, 10000);

    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server is running')) {
        serverStarted = true;
        clearTimeout(timeout);
        console.log('Test server started successfully');
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

// Check if server is running
const checkServer = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1', // Use IPv4 explicitly instead of localhost
      port: process.env.PORT || 3000,
      path: '/',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
};

// Main test execution
const main = async () => {
  let server = null;
  
  try {
    const isServerRunning = await checkServer();
    
    if (!isServerRunning) {
      console.log('Server not running, starting test server...');
      server = await startServer();
      // Wait a bit for server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('Using existing running server');
    }
    
    await runTests();
    
    if (server) {
      console.log('\nStopping test server...');
      server.kill();
    }
    
  } catch (error) {
    if (server) {
      server.kill();
    }
    console.error('Error:', error.message);
    process.exit(1);
  }
};

main();