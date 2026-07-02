export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function todayCalendarRange() {
  return {
    from: startOfToday().toISOString(),
    to: endOfToday().toISOString(),
  };
}

export function isSameLocalDay(isoA, isoB) {
  if (!isoA || !isoB) return false;
  const a = new Date(isoA);
  const b = new Date(isoB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isScheduledToday(job) {
  const start = job?.display_start || job?.scheduled_start || job?.client_preferred_start;
  if (!start) return false;
  return isSameLocalDay(start, startOfToday().toISOString());
}
