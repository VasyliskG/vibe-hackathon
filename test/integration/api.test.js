const request = require('supertest');
const app = require('../../server');

describe('API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    await app.init();
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('System Endpoints', () => {
    test('GET / should return service info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version', '5.0.0');
      expect(response.body).toHaveProperty('status', 'running');
    });

    test('GET /api/system/health should return health status', async () => {
      const response = await request(app).get('/api/system/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    test('GET /api/system/metrics should return metrics', async () => {
      const response = await request(app).get('/api/system/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('orders');
      expect(response.body.data).toHaveProperty('couriers');
      expect(response.body.data).toHaveProperty('system');
    });

    test('GET /api/system/info should return system info', async () => {
      const response = await request(app).get('/api/system/info');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('service');
      expect(response.body.data).toHaveProperty('features');
      expect(response.body.data.features).toContain('REST API');
    });
  });

  describe('Order Endpoints', () => {
    test('GET /api/orders should return all orders', async () => {
      const response = await request(app).get('/api/orders');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/orders should create new order', async () => {
      const orderData = {
        id: `test-order-${Date.now()}`,
        restaurantX: 10,
        restaurantY: 10,
        weight: 5
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', orderData.id);
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    test('POST /api/orders with invalid data should fail', async () => {
      const invalidData = {
        id: '',
        restaurantX: -1,
        restaurantY: 10
      };

      const response = await request(app)
        .post('/api/orders')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('GET /api/orders/:id should return specific order', async () => {
      // Create order first
      const orderData = {
        id: `test-order-get-${Date.now()}`,
        restaurantX: 10,
        restaurantY: 10,
        weight: 3
      };

      await request(app).post('/api/orders').send(orderData);

      const response = await request(app).get(`/api/orders/${orderData.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', orderData.id);
    });

    test('GET /api/orders/queue should return queue', async () => {
      const response = await request(app).get('/api/orders/queue');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Courier Endpoints', () => {
    test('GET /api/couriers should return all couriers', async () => {
      const response = await request(app).get('/api/couriers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('GET /api/couriers/:id should return specific courier', async () => {
      // Get first courier
      const couriersResponse = await request(app).get('/api/couriers');
      const courierId = couriersResponse.body.data[0].id;

      const response = await request(app).get(`/api/couriers/${courierId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', courierId);
    });

    test('POST /api/couriers should create new courier', async () => {
      const courierData = {
        id: `test-courier-${Date.now()}`,
        x: 20,
        y: 20,
        transportType: 'bicycle'
      };

      const response = await request(app)
        .post('/api/couriers')
        .send(courierData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', courierData.id);
    });

    test('GET /api/couriers?status=Free should filter free couriers', async () => {
      const response = await request(app).get('/api/couriers?status=Free');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.every(c => c.status === 'Free')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('GET /invalid-route should return 404', async () => {
      const response = await request(app).get('/invalid-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });

    test('GET /api/orders/nonexistent-id should return 404', async () => {
      const response = await request(app).get('/api/orders/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });

  describe('Auto-Assignment', () => {
    test('POST /api/system/auto-assign should assign orders', async () => {
      // Create a test order first
      const orderData = {
        id: `test-order-assign-${Date.now()}`,
        restaurantX: 15,
        restaurantY: 15,
        weight: 3
      };

      await request(app).post('/api/orders').send(orderData);

      const response = await request(app).post('/api/system/auto-assign');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('assigned');
      expect(response.body).toHaveProperty('results');
    });
  });
});

