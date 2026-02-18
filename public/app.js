const connectionDot = document.getElementById('connectionDot');
const connectionText = document.getElementById('connectionText');
const statsGrid = document.getElementById('statsGrid');
const feedList = document.getElementById('feedList');
const queueList = document.getElementById('queueList');
const mapCanvas = document.getElementById('mapCanvas');
const mapCtx = mapCanvas.getContext('2d');

let state = {
  orders: [],
  couriers: [],
  queue: [],
  metrics: {}
};

const feed = [];

function setConnectionStatus(connected, message) {
  connectionDot.style.background = connected ? '#2ecc71' : '#e74c3c';
  connectionText.textContent = message || (connected ? 'Connected' : 'Disconnected');
}

async function fetchToken() {
  const res = await fetch('/api/system/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'dashboard', role: 'ADMIN' })
  });

  const data = await res.json();
  return data.token;
}

function renderStats() {
  const metrics = state.metrics || {};
  const orders = metrics.orders || {};
  const couriers = metrics.couriers || {};
  const realtime = metrics.realtime || {};

  const items = [
    { label: 'Orders total', value: orders.total || 0 },
    { label: 'Orders active', value: (orders.pending || 0) + (orders.assigned || 0) + (orders.inTransit || 0) },
    { label: 'Couriers active', value: couriers.busy || 0 },
    { label: 'Queue size', value: orders.queueSize || 0 },
    { label: 'Orders/min', value: realtime.ordersPerMinute || 0 },
    { label: 'SLA violations', value: realtime.slaViolations || 0 }
  ];

  statsGrid.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div>`;
    statsGrid.appendChild(div);
  });
}

function addFeed(event) {
  const time = new Date(event.timestamp || Date.now()).toLocaleTimeString();
  feed.unshift({ time, event });
  if (feed.length > 50) {
    feed.pop();
  }

  feedList.innerHTML = '';
  feed.forEach(item => {
    const div = document.createElement('div');
    div.className = 'feed-item';
    const badge = eventBadge(item.event.type);
    div.innerHTML = `${badge}<strong>${item.event.type}</strong> <span class="muted">${item.time}</span>`;
    feedList.appendChild(div);
  });
}

function eventBadge(type) {
  let cls = 'info';
  if (type === 'ORDER_COMPLETED') cls = 'success';
  if (type === 'ORDER_CANCELLED' || type === 'SLA_VIOLATION') cls = 'error';
  if (type === 'QUEUE_UPDATED') cls = 'warning';
  return `<span class="badge ${cls}">${type}</span>`;
}

function renderQueue() {
  queueList.innerHTML = '';
  state.queue.forEach(order => {
    const div = document.createElement('div');
    div.className = 'queue-item';
    const waitMs = Date.now() - order.createdAt;
    div.innerHTML = `Order <strong>${order.id}</strong> | Wait: ${(waitMs / 1000).toFixed(0)}s`;
    queueList.appendChild(div);
  });
}

function drawMap() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.fillStyle = '#0b0f15';
  mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

  const scale = mapCanvas.width / 100;

  state.orders.forEach(order => {
    mapCtx.fillStyle = order.status === 'delivered' ? '#2ecc71' : '#f1c40f';
    mapCtx.fillRect(order.restaurantLocation.x * scale, order.restaurantLocation.y * scale, 4, 4);
  });

  state.couriers.forEach(courier => {
    mapCtx.fillStyle = courier.status === 'Busy' ? '#e74c3c' : '#3498db';
    mapCtx.beginPath();
    mapCtx.arc(courier.coordinates.x * scale, courier.coordinates.y * scale, 4, 0, Math.PI * 2);
    mapCtx.fill();
  });
}

async function init() {
  setConnectionStatus(false);
  if (typeof io === 'undefined') {
    setConnectionStatus(false, 'Socket.IO client missing');
    return;
  }

  const token = await fetchToken();

  const socket = io({
    path: '/ws',
    auth: { token },
    reconnection: true
  });

  socket.on('connect', () => setConnectionStatus(true));
  socket.on('disconnect', () => setConnectionStatus(false));

  socket.on('initial_state', payload => {
    state.orders = payload.orders || [];
    state.couriers = payload.couriers || [];
    state.queue = payload.queue || [];
    state.metrics = payload.metrics || {};
    renderStats();
    renderQueue();
    drawMap();
  });

  socket.on('event', event => {
    addFeed(event);
    if (event.type === 'QUEUE_UPDATED') {
      fetch('/api/orders/queue')
        .then(res => res.json())
        .then(data => {
          state.queue = data.data || [];
          renderQueue();
        });
    }

    if (event.type === 'ORDER_CREATED' || event.type === 'ORDER_COMPLETED' || event.type === 'ORDER_CANCELLED') {
      fetch('/api/orders')
        .then(res => res.json())
        .then(data => {
          state.orders = data.data || [];
          drawMap();
        });
    }

    if (event.type === 'COURIER_STATUS_CHANGED') {
      fetch('/api/couriers')
        .then(res => res.json())
        .then(data => {
          state.couriers = data.data || [];
          drawMap();
        });
    }

    fetch('/api/system/metrics')
      .then(res => res.json())
      .then(data => {
        state.metrics = data.data || {};
        renderStats();
      });
  });
}

init();
