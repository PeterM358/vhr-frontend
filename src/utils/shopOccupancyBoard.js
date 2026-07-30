/**
 * Shop adapter: map calendar repairs → OccupancyMonthBoard rows (bays × days).
 * @see vhr/docs/unified-occupancy-board-vision.md
 */

import { assignShopBayNumbers, getJobDayBounds } from './shopCalendarJob';

function isoDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * @param {Array<object>} scheduled shop-calendar scheduled jobs
 * @param {{ bayLabel?: (n:number)=>string, unassignedLabel?: string }} labels
 */
export function buildShopBayOccupancyRows(scheduled, labels = {}) {
  const bayLabel =
    labels.bayLabel || ((n) => `Bay ${n}`);
  const unassignedLabel = labels.unassignedLabel || 'Unassigned';
  const bayByJobId = assignShopBayNumbers(scheduled);
  const byBay = new Map();

  (scheduled || []).forEach((job) => {
    if (job?.id == null) return;
    const bounds = getJobDayBounds(job);
    if (!bounds) return;
    const start = isoDateOnly(bounds.startIso);
    const end = isoDateOnly(bounds.endIso) || start;
    if (!start) return;
    const bay = bayByJobId.get(job.id) || 0;
    if (!byBay.has(bay)) byBay.set(bay, []);
    byBay.get(bay).push({
      id: job.id,
      work_order_id: job.id,
      repair_id: job.id,
      title:
        job.vehicle_license_plate ||
        [job.vehicle_make, job.vehicle_model].filter(Boolean).join(' ') ||
        job.repair_type_name ||
        `#${job.id}`,
      status: job.pending_reschedule?.status === 'pending' ? 'assigned' : job.status || 'booked',
      start,
      end,
      scheduled_date: start,
      scheduled_end_date: end,
      job,
    });
  });

  const bayNumbers = [...byBay.keys()].filter((n) => n > 0).sort((a, b) => a - b);
  const rows = bayNumbers.map((bay) => ({
    id: `bay-${bay}`,
    bayNumber: bay,
    label: bayLabel(bay),
    spans: byBay.get(bay) || [],
  }));

  if (byBay.has(0) && byBay.get(0).length) {
    rows.push({
      id: 'bay-0',
      bayNumber: 0,
      label: unassignedLabel,
      spans: byBay.get(0),
    });
  }

  // Empty board still shows bay 1 placeholder so create/drop has a row.
  if (!rows.length) {
    rows.push({ id: 'bay-1', bayNumber: 1, label: bayLabel(1), spans: [] });
  }

  return { rows, bayByJobId };
}

/** Keep clock time from original ISO when moving to a new calendar day. */
export function applyDateKeepingTime(originalIso, newDayIso) {
  const day = String(newDayIso || '').slice(0, 10);
  if (!day) return originalIso;
  const orig = originalIso ? new Date(originalIso) : null;
  if (!orig || Number.isNaN(orig.getTime())) {
    return `${day}T09:00:00`;
  }
  const hh = String(orig.getHours()).padStart(2, '0');
  const mm = String(orig.getMinutes()).padStart(2, '0');
  const ss = String(orig.getSeconds()).padStart(2, '0');
  return `${day}T${hh}:${mm}:${ss}`;
}
