const eventBus = require('../../src/realtime/eventBus/EventBus');

describe('EventBus', () => {
  test('should publish and subscribe', () => {
    const handler = jest.fn();
    const unsubscribe = eventBus.subscribe('ORDER_CREATED', handler);

    const event = eventBus.publish({ type: 'ORDER_CREATED', data: { orderId: 'test' } });

    expect(event.type).toBe('ORDER_CREATED');
    expect(handler).toHaveBeenCalled();

    unsubscribe();
  });

  test('should keep last 100 events', () => {
    for (let i = 0; i < 120; i++) {
      eventBus.publish({ type: 'QUEUE_UPDATED', data: { index: i } });
    }

    const recent = eventBus.getRecentEvents();
    expect(recent.length).toBeLessThanOrEqual(100);
  });
});

