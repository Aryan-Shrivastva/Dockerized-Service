const http = require('http');

const options = {
  hostname: '127.0.0.1', // Use IPv4 explicitly
  port: process.env.PORT || 3000,
  path: '/',
  method: 'GET',
  timeout: 2000
};

const request = http.request(options, (response) => {
  if (response.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => {
  process.exit(1);
});

request.on('timeout', () => {
  request.destroy();
  process.exit(1);
});

request.end();