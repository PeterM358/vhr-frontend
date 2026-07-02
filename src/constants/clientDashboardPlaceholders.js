/**
 * Placeholder content for client dashboard sections.
 * TODO(backend): replace with API-driven vehicle health, reminders, offers, and notification center.
 */

export const NOTIFICATION_SEVERITY = {
  critical: { label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  warning: { label: 'Attention', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
  info: { label: 'Info', color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  success: { label: 'Update', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
};

export const NOTIFICATION_CATEGORIES = [
  'Critical Alerts',
  'Maintenance Due',
  'Insurance Expiring',
  'Inspection Due',
  'Offers Received',
  'Bookings Confirmed',
  'Messages',
  'Safety Recalls',
  'Software Updates',
  'Documents Ready',
  'Service Completed',
];

/** Sample notifications for UI preview — backend will populate by category. */
export const NOTIFICATION_CENTER_PLACEHOLDERS = [
  {
    id: 'nc-1',
    category: 'Maintenance Due',
    severity: 'warning',
    title: 'Oil change recommended',
    description: 'Based on your mileage trend, schedule an oil change in the next 1,500 km.',
    actionLabel: 'View vehicle',
  },
  {
    id: 'nc-2',
    category: 'Offers Received',
    severity: 'info',
    title: 'New offer from a service center',
    description: 'A nearby center sent a quote for your open repair request.',
    actionLabel: 'Review offer',
  },
  {
    id: 'nc-3',
    category: 'Inspection Due',
    severity: 'warning',
    title: 'Annual inspection approaching',
    description: 'Keep your roadworthiness documents up to date before expiry.',
    actionLabel: 'See reminders',
  },
  {
    id: 'nc-4',
    category: 'Bookings Confirmed',
    severity: 'success',
    title: 'Visit confirmed',
    description: 'Your service center confirmed the appointment time.',
    actionLabel: 'Open booking',
  },
  {
    id: 'nc-5',
    category: 'Documents Ready',
    severity: 'success',
    title: 'Invoice uploaded',
    description: 'A repair document was added to your vehicle history.',
    actionLabel: 'View document',
  },
];

export const VEHICLE_HEALTH_STATUSES = {
  healthy: { label: 'Healthy', color: '#059669', icon: 'check-circle-outline' },
  maintenance: { label: 'Maintenance recommended', color: '#d97706', icon: 'wrench-clock' },
  urgent: { label: 'Urgent attention', color: '#dc2626', icon: 'alert-circle-outline' },
  unknown: { label: 'No history available', color: '#64748b', icon: 'help-circle-outline' },
};

export const UPCOMING_MAINTENANCE_ITEMS = [
  { id: 'm1', label: 'Oil change', detail: 'Est. in ~1,500 km', icon: 'oil' },
  { id: 'm2', label: 'Brake fluid', detail: 'Check every 2 years', icon: 'car-brake-fluid-level' },
  { id: 'm3', label: 'Timing belt', detail: 'Plan before 90,000 km', icon: 'cog-transfer' },
  { id: 'm4', label: 'Coolant', detail: 'Seasonal check suggested', icon: 'coolant-temperature' },
  { id: 'm5', label: 'Tyres', detail: 'Rotate & inspect tread', icon: 'tire' },
  { id: 'm6', label: 'Battery', detail: 'Test before winter', icon: 'car-battery' },
];

export const RECOMMENDED_OFFERS_PLACEHOLDERS = [
  {
    id: 'r1',
    title: 'Brake inspection',
    badge: '15% OFF',
    reason: 'Because your last brake replacement was over 30,000 km ago.',
  },
  {
    id: 'r2',
    title: 'Seasonal tyre check',
    badge: 'Recommended',
    reason: 'Based on your vehicle type and typical driving pattern.',
  },
];

/** Future smart-reminder examples — UI preview only, not live data. */
export const SMART_REMINDER_FUTURE_EXAMPLES = [
  'Oil change due',
  'Brake fluid interval',
  'Timing belt approaching',
  'Battery age warning',
  'Tyres below recommended age',
  'Brake pads estimated to need inspection',
  'Insurance expires soon',
  'Road tax reminder',
  'Annual inspection reminder',
  'Manufacturer recall',
  'Seasonal tyre recommendation',
  'Low mileage but old fluids',
  'Preventive checks before long trips',
];
