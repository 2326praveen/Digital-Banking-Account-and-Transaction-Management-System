const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const req = http.request({ port: address.port, path, method: options.method || 'GET', headers: options.headers }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        });
      });
      req.on('error', (error) => { server.close(); reject(error); });
      if (options.body) req.write(options.body);
      req.end();
    });
  });
}

test('health endpoint responds successfully', async () => {
  const response = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
});

test('protected endpoints reject missing JWT', async () => {
  const response = await request('/api/staff/dashboard');
  assert.equal(response.status, 401);
  assert.equal(response.body.errorCode, 'UNAUTHORIZED');
});

test('customers cannot access the staff dashboard', async () => {
  process.env.JWT_SECRET = 'smoke-secret';
  const token = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'CUSTOMER' }, process.env.JWT_SECRET);
  const response = await request('/api/staff/dashboard', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 403);
  assert.equal(response.body.errorCode, 'FORBIDDEN');
});

test('unknown routes return the standard error shape', async () => {
  const response = await request('/missing-route');
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, {
    success: false,
    message: 'Route not found',
    errorCode: 'ROUTE_NOT_FOUND'
  });
});