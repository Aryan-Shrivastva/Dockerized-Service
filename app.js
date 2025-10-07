const express = require('express');
const basicAuth = require('basic-auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for Basic Authentication
const authenticate = (req, res, next) => {
  const credentials = basicAuth(req);
  
  console.log('Auth attempt:', {
    credentials: credentials ? { name: credentials.name, pass: '***' } : null,
    expectedUser: process.env.APP_USERNAME,
    expectedPass: process.env.APP_PASSWORD ? '***' : 'undefined'
  });
  
  if (!credentials || 
      credentials.name !== process.env.APP_USERNAME || 
      credentials.pass !== process.env.APP_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Secret Area"');
    return res.status(401).json({ 
      error: 'Authentication required. Please provide valid credentials.' 
    });
  }
  
  next();
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello, world!',
    timestamp: new Date().toISOString(),
    status: 'running'
  });
});

// Protected secret endpoint
app.get('/secret', authenticate, (req, res) => {
  const secretMessage = process.env.SECRET_MESSAGE || 'Default secret message';
  res.json({ 
    message: secretMessage,
    timestamp: new Date().toISOString(),
    authenticated: true
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableRoutes: ['/', '/secret']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Available routes:`);
  console.log(`  GET / - Public route`);
  console.log(`  GET /secret - Protected route (requires Basic Auth)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;