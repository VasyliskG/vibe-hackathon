#!/bin/bash

echo "🧪 Testing Stage 4 REST API"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"

# Test 1: Root endpoint
echo "✓ Test 1: GET /"
curl -s $BASE_URL/ | jq -c '{service, version, status}'
echo ""

# Test 2: Health check
echo "✓ Test 2: GET /api/system/health"
curl -s $BASE_URL/api/system/health | jq -c '{status, environment}'
echo ""

# Test 3: Get all couriers
echo "✓ Test 3: GET /api/couriers"
curl -s $BASE_URL/api/couriers | jq -c '{success, count}'
echo ""

# Test 4: Get all orders
echo "✓ Test 4: GET /api/orders"
curl -s $BASE_URL/api/orders | jq -c '{success, count}'
echo ""

# Test 5: Create new order
echo "✓ Test 5: POST /api/orders (Create Order)"
ORDER_ID="test-order-$(date +%s)"
curl -s -X POST $BASE_URL/api/orders \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ORDER_ID\",\"restaurantX\":10,\"restaurantY\":10,\"weight\":5}" \
  | jq -c '{success, message, orderId: .data.id, status: .data.status}'
echo ""

# Test 6: Get specific order
echo "✓ Test 6: GET /api/orders/:id"
curl -s $BASE_URL/api/orders/$ORDER_ID | jq -c '{success, orderId: .data.id, status: .data.status}'
echo ""

# Test 7: Get order queue
echo "✓ Test 7: GET /api/orders/queue"
curl -s $BASE_URL/api/orders/queue | jq -c '{success, count}'
echo ""

# Test 8: Auto-assign orders
echo "✓ Test 8: POST /api/system/auto-assign"
curl -s -X POST $BASE_URL/api/system/auto-assign | jq -c '{success, assigned, remaining}'
echo ""

# Test 9: Get metrics
echo "✓ Test 9: GET /api/system/metrics"
curl -s $BASE_URL/api/system/metrics | jq -c '{success, ordersTotal: .data.orders.total, couriersTotal: .data.couriers.total}'
echo ""

# Test 10: Create courier
echo "✓ Test 10: POST /api/couriers (Create Courier)"
COURIER_ID="test-courier-$(date +%s)"
curl -s -X POST $BASE_URL/api/couriers \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$COURIER_ID\",\"x\":20,\"y\":20,\"transportType\":\"bicycle\"}" \
  | jq -c '{success, message, courierId: .data.id}'
echo ""

# Test 11: Get free couriers
echo "✓ Test 11: GET /api/couriers?status=Free"
curl -s "$BASE_URL/api/couriers?status=Free" | jq -c '{success, count}'
echo ""

# Test 12: System info
echo "✓ Test 12: GET /api/system/info"
curl -s $BASE_URL/api/system/info | jq -c '{success, service: .data.service, stage: .data.stage}'
echo ""

echo ""
echo "================================"
echo "✅ All API tests completed!"

