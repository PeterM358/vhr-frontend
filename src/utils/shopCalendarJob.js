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

/** UI label: client request vs confirmed booking vs needs a date. */
export function getCalendarJobKind(job) {
  if (isPendingAppointmentRequest(job)) {
    return 'client_request';
  }
  if (job?.schedule_confirmed === true || job?.scheduled_start) {
    return 'booked';
  }
  return 'needs_date';
}

export function calendarJobKindLabel(kind) {
  switch (kind) {
    case 'client_request':
      return 'Client request';
    case 'booked':
      return 'Booked';
    case 'needs_date':
      return 'Needs date';
    default:
      return '';
  }
}
