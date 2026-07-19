function dayStartLocal(value) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPendingAppointmentRequest(job) {
  if (!job || job.scheduled_start) {
    return false;
  }
  if (job.status && job.status !== 'open') {
    return false;
  }
  if (job.is_pending_appointment === true) {
    return true;
  }
  if (job.client_preferred_start) {
    return true;
  }
  return (job.availability_notes || '').toLowerCase().includes('pending shop confirmation');
}

export function isPendingReschedule(job) {
  return job?.pending_reschedule?.status === 'pending';
}

/**
 * Bring→ready window used for calendar occupancy (prefers pending proposal display).
 * @returns {{ startIso: string, endIso: string, startDay: Date, endDay: Date } | null}
 */
export function getJobDayBounds(job) {
  if (!job) return null;
  const startIso = job.display_start || job.scheduled_start || job.client_preferred_start;
  if (!startIso) return null;
  // Prefer display/proposal end; fall back to start when scheduled_end is null.
  const endIso = job.display_end || job.scheduled_end || job.client_preferred_end || startIso;
  const startDay = dayStartLocal(startIso);
  let endDay = dayStartLocal(endIso);
  if (!startDay) return null;
  if (!endDay || Number.isNaN(endDay.getTime()) || endDay < startDay) endDay = startDay;
  return { startIso, endIso, startDay, endDay };
}

export function isMultiDayJob(job) {
  const bounds = getJobDayBounds(job);
  if (!bounds) return false;
  return bounds.endDay.getTime() > bounds.startDay.getTime();
}

/**
 * Role of this job on a specific calendar day.
 * @returns {'single'|'bring'|'stay'|'ready'|null}
 */
export function getOccupancyRoleForDay(job, dayDate) {
  const bounds = getJobDayBounds(job);
  if (!bounds || !dayDate) return null;
  const day = dayStartLocal(dayDate);
  if (!day) return null;
  const t = day.getTime();
  const start = bounds.startDay.getTime();
  const end = bounds.endDay.getTime();
  if (t < start || t > end) return null;
  if (start === end) return 'single';
  if (t === start) return 'bring';
  if (t === end) return 'ready';
  return 'stay';
}

/** UI label: client request vs pending confirm vs confirmed booking vs needs a date. */
export function getCalendarJobKind(job) {
  if (isPendingAppointmentRequest(job)) {
    return 'client_request';
  }
  if (isPendingReschedule(job)) {
    return 'pending_confirm';
  }
  if (job?.schedule_confirmed === true || job?.scheduled_start) {
    return 'booked';
  }
  return 'needs_date';
}

export function calendarJobKindLabel(kind) {
  switch (kind) {
    case 'client_request':
      return 'Request';
    case 'pending_confirm':
      return 'Pending';
    case 'booked':
      return 'Booked';
    case 'needs_date':
      return 'Needs date';
    default:
      return '';
  }
}

/**
 * Subtle accent colors for bay chips / stay rows.
 * Index by (bayNumber - 1) % length — stable per bay slot, not per job forever.
 */
export const BAY_ACCENT_PALETTE = [
  { border: '#2563EB', bg: 'rgba(37,99,235,0.10)', text: '#1D4ED8' },
  { border: '#0D9488', bg: 'rgba(13,148,136,0.12)', text: '#0F766E' },
  { border: '#C2410C', bg: 'rgba(194,65,12,0.10)', text: '#9A3412' },
  { border: '#7C3AED', bg: 'rgba(124,58,237,0.10)', text: '#6D28D9' },
  { border: '#B45309', bg: 'rgba(180,83,9,0.12)', text: '#92400E' },
  { border: '#0369A1', bg: 'rgba(3,105,161,0.10)', text: '#075985' },
];

export function getBayAccent(bayNumber) {
  const n = Number(bayNumber);
  if (!Number.isFinite(n) || n < 1) return BAY_ACCENT_PALETTE[0];
  return BAY_ACCENT_PALETTE[(n - 1) % BAY_ACCENT_PALETTE.length];
}

/**
 * Assign shop-local bay slot numbers (1…N) for concurrent calendar occupancy.
 *
 * These are ephemeral floor slots for the current overlapping stays — not repair IDs
 * and not persisted. Greedy interval coloring: sort by start, give each stay the
 * smallest free bay among jobs whose bring→ready window still overlaps. When a stay
 * ends (ready day passed / job leaves the set), its bay recycles for the next job.
 *
 * @param {Array<object>} jobs calendar scheduled rows (visible range load is enough)
 * @returns {Map<number|string, number>} job id → bay number
 */
export function assignShopBayNumbers(jobs) {
  const intervals = [];
  (jobs || []).forEach((job) => {
    if (job?.id == null) return;
    const bounds = getJobDayBounds(job);
    if (!bounds) return;
    intervals.push({
      id: job.id,
      startMs: bounds.startDay.getTime(),
      endMs: bounds.endDay.getTime(),
      startSort: new Date(bounds.startIso).getTime(),
    });
  });

  intervals.sort((a, b) => a.startSort - b.startSort || Number(a.id) - Number(b.id));

  const assignment = new Map();
  /** @type {{ endMs: number, bay: number }[]} */
  const active = [];

  intervals.forEach((iv) => {
    // Day-inclusive overlap: free bays whose ready day is strictly before this bring day.
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endMs < iv.startMs) active.splice(i, 1);
    }
    const used = new Set(active.map((a) => a.bay));
    let bay = 1;
    while (used.has(bay)) bay += 1;
    assignment.set(iv.id, bay);
    active.push({ endMs: iv.endMs, bay });
  });

  return assignment;
}
