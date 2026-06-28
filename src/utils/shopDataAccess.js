/**
 * Service center data-access tiers shown to vehicle owners and shop users.
 */

export const ACCESS_JOB_SCOPED = 'job_scoped';
export const ACCESS_AUTHORIZED_MECHANICAL = 'authorized_mechanical';

const ACCESS_LEVELS = {
  [ACCESS_JOB_SCOPED]: {
    id: ACCESS_JOB_SCOPED,
    shortLabel: 'This job only',
    badgeLabel: 'Job access',
    title: 'Booked job access',
    summary:
      'Automatic when you book a repair. The center sees this job plus prior work in the same service area (e.g. brakes, oil).',
    canSee: [
      'This repair request and job details',
      'License plate (for the booked job)',
      'Prior completed services in the same category (e.g. brake history for a brake job)',
      'Parts used on those related services',
    ],
    cannotSee: [
      'Full vehicle service history',
      'Unrelated services (e.g. oil changes during a brake job)',
      'Your documents, insurance files, or personal notes',
      'Reminders and vehicle profile edits',
    ],
  },
  [ACCESS_AUTHORIZED_MECHANICAL]: {
    id: ACCESS_AUTHORIZED_MECHANICAL,
    shortLabel: 'Full mechanical history',
    badgeLabel: 'Authorized',
    title: 'Authorized service center',
    summary:
      'You explicitly shared this vehicle. The center can help with ongoing maintenance and see mechanical service history.',
    canSee: [
      'Full mechanical service history on this vehicle',
      'Completed repairs, parts, and odometer readings',
      'Service reminders and vehicle specs (where enabled)',
      'Jobs they book or perform going forward',
    ],
    cannotSee: [
      'Insurance policies and personal document vault (unless you share separately later)',
      'Other vehicles on your account',
      'Payment methods or account credentials',
    ],
  },
};

export function getAccessLevel(scope) {
  return ACCESS_LEVELS[scope] || null;
}

export function formatAccessScopeLabel(scope) {
  return getAccessLevel(scope)?.badgeLabel || 'Limited access';
}

export function formatAuthorizeConfirmMessage(shopName) {
  const level = ACCESS_LEVELS[ACCESS_AUTHORIZED_MECHANICAL];
  const name = shopName || 'This service center';
  const canSee = level.canSee.map((item) => `• ${item}`).join('\n');
  const cannotSee = level.cannotSee.map((item) => `• ${item}`).join('\n');
  return (
    `${name} will get **authorized** access to this vehicle.\n\n` +
    `They can:\n${canSee}\n\n` +
    `They cannot:\n${cannotSee}\n\n` +
    `You can remove access anytime from vehicle settings.`
  ).replace(/\*\*/g, '');
}

export function formatRevokeConfirmMessage(shopName) {
  const name = shopName || 'This service center';
  return (
    `${name} will no longer see your full vehicle history or reminders.\n\n` +
    'Repairs they already performed or quoted stay in their shop records.\n\n' +
    'Future bookings still grant job-only access for that repair.'
  );
}

export function formatBookingAccessHint() {
  const level = ACCESS_LEVELS[ACCESS_JOB_SCOPED];
  return level.summary;
}
