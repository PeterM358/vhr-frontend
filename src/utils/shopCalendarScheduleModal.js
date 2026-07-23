/**
 * Schedule-modal auto-open / session-dismiss helpers for ShopCalendarScreen.
 *
 * Policy: do not force the schedule modal on every calendar focus. Deep-link
 * focusRepairId may open once; Cancel dismisses for the current job status.
 */

export function scheduleModalStatusKey(job) {
  if (!job || job.id == null) return '';
  const pending = job.pending_reschedule?.status || '';
  return [
    Number(job.id),
    String(job.schedule_confirmed),
    job.scheduled_start || '',
    job.client_preferred_start || '',
    pending,
  ].join('|');
}

/** Jobs that previously triggered auto-open of the schedule modal. */
export function shouldAutoOpenScheduleModal(job) {
  if (!job) return false;
  if (job.schedule_confirmed === false) return true;
  if (!job.scheduled_start && job.client_preferred_start) return true;
  return false;
}

/**
 * Whether a deep-link focusRepairId should open the modal once.
 * Auto-open is off by default (list + tap Schedule). Kept for optional callers.
 */
export function canAutoOpenFocusedRepair({
  focusRepairId,
  job,
  sessionDismissedMap,
  alreadyOpenedKey,
  allowAutoOpen = false,
}) {
  if (!allowAutoOpen) return false;
  if (focusRepairId == null || !job) return false;
  if (!shouldAutoOpenScheduleModal(job)) return false;
  const statusKey = scheduleModalStatusKey(job);
  if (!statusKey) return false;
  if (sessionDismissedMap?.get(Number(focusRepairId)) === statusKey) return false;
  if (alreadyOpenedKey === statusKey) return false;
  return true;
}

export function sameCalendarDay(a, b) {
  if (!a || !b || typeof a.getTime !== 'function' || typeof b.getTime !== 'function') return false;
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
