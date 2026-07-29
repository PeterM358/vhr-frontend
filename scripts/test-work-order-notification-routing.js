#!/usr/bin/env node
/**
 * Work-order notification deep-link detection invariants.
 * Run: node scripts/test-work-order-notification-routing.js
 */

const assert = require('assert');

const WORK_ORDER_EVENTS = new Set([
  'work_order_assigned',
  'work_order_updated',
  'work_order_start_nag',
  'work_order_start_overdue',
  'work_order_at_address',
  'work_order_course_finished',
]);

function notificationEventType(item) {
  return (
    item?.event_type ||
    item?.notification_type ||
    item?.data?.event_type ||
    item?.data?.notification_type ||
    ''
  );
}

function workOrderIdsFromNotification(item) {
  const workOrderId =
    item?.data?.work_order_id ??
    item?.work_order_id ??
    item?.data?.taskId ??
    item?.data?.task_id ??
    null;
  const organizationId =
    item?.data?.organization_id ??
    item?.organization_id ??
    item?.data?.orgId ??
    null;
  if (workOrderId == null || workOrderId === '') return null;
  return {
    taskId: Number(workOrderId) || workOrderId,
    orgId: organizationId != null && organizationId !== '' ? organizationId : undefined,
  };
}

function isWorkOrderNotification(item) {
  const t = String(notificationEventType(item)).toLowerCase();
  if (WORK_ORDER_EVENTS.has(t)) return true;
  return workOrderIdsFromNotification(item) != null && t.startsWith('work_order_');
}

assert.equal(
  isWorkOrderNotification({
    data: { event_type: 'work_order_assigned', work_order_id: 12, organization_id: 3 },
  }),
  true,
);
assert.equal(
  isWorkOrderNotification({
    data: { event_type: 'work_order_at_address', work_order_id: 9 },
  }),
  true,
);
assert.equal(
  isWorkOrderNotification({ data: { event_type: 'repair_scheduled', repair_id: 1 } }),
  false,
);

const ids = workOrderIdsFromNotification({
  data: { event_type: 'work_order_assigned', work_order_id: '42', organization_id: '7' },
});
assert.deepEqual(ids, { taskId: 42, orgId: '7' });

console.log('work-order notification routing tests passed');
