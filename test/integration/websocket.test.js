const io = require('socket.io-client');
const app = require('../../server');
const { issueToken } = require('../../src/realtime/websocket/auth');
const http = require('http');
const { createWebSocketServer } = require('../../src/realtime/websocket');

let server;
let httpServer;
let port;

beforeAll(async () => {
  await app.init();
  httpServer = http.createServer(app);
  createWebSocketServer(httpServer, app);
  server = httpServer.listen(() => {
    port = server.address().port;
  });
});

afterAll(done => {
  server.close(done);
});

describe('WebSocket', () => {
  test('should connect with valid token', done => {
    const token = issueToken({ userId: 'test-user', role: 'ADMIN' });
    const socket = io(`http://localhost:${port}`, {
      path: '/ws',
      auth: { token }
    });

    socket.on('connect', () => {
      socket.disconnect();
      done();
    });
  });

  test('should reject invalid token', done => {
    const socket = io(`http://localhost:${port}`, {
      path: '/ws',
      auth: { token: 'invalid' }
    });

    socket.on('connect_error', err => {
      expect(err.message).toBe('Unauthorized');
      socket.disconnect();
      done();
    });
  });
});
