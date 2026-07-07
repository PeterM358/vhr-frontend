/**
 * Partner dashboard repair request lifecycle labels, sort order, and pill styling.
 */

export const PARTNER_LIFECYCLE = {
  WAITING_FOR_OFFER: 'WAITING_FOR_OFFER',
  OFFER_SENT: 'OFFER_SENT',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
};

export const LIFECYCLE_SORT_ORDER = {
  [PARTNER_LIFECYCLE.WAITING_FOR_OFFER]: 0,
  [PARTNER_LIFECYCLE.OFFER_SENT]: 1,
  [PARTNER_LIFECYCLE.OFFER_ACCEPTED]: 2,
  [PARTNER_LIFECYCLE.IN_PROGRESS]: 3,
  [PARTNER_LIFECYCLE.COMPLETED]: 4,
  [PARTNER_LIFECYCLE.DECLINED]: 5,
};

export const LIFECYCLE_PILL = {
  [PARTNER_LIFECYCLE.WAITING_FOR_OFFER]: {
    label: 'Waiting for your offer',
    bg: 'rgba(234,179,8,0.18)',
    fg: '#A16207',
  },
  [PARTNER_LIFECYCLE.OFFER_SENT]: {
    label: 'Offer sent',
    bg: 'rgba(37,99,235,0.16)',
    fg: '#1D4ED8',
  },
  [PARTNER_LIFECYCLE.OFFER_ACCEPTED]: {
    label: 'Offer accepted',
    bg: 'rgba(22,163,74,0.18)',
    fg: '#15803D',
  },
  [PARTNER_LIFECYCLE.IN_PROGRESS]: {
    label: 'Repair in progress',
    bg: 'rgba(245,158,11,0.18)',
    fg: '#B45309',
  },
  [PARTNER_LIFECYCLE.COMPLETED]: {
    label: 'Completed',
    bg: 'rgba(22,163,74,0.18)',
    fg: '#15803D',
  },
  [PARTNER_LIFECYCLE.DECLINED]: {
    label: 'Offer declined',
    bg: 'rgba(220,38,38,0.18)',
    fg: '#B91C1C',
  },
};

const FALLBACK_PILL = {
  label: 'Request',
  bg: 'rgba(100,116,139,0.18)',
  fg: '#334155',
};

export function resolvePartnerLifecycle(repair) {
  if (!repair || typeof repair !== 'object') {
    return PARTNER_LIFECYCLE.WAITING_FOR_OFFER;
  }

  const lifecycle = String(repair.partner_lifecycle_status || '').trim();
  if (lifecycle && LIFECYCLE_PILL[lifecycle]) {
    return lifecycle;
  }

  const status = String(repair.repair_status || repair.status || '').toLowerCase();
  if (status === 'done') return PARTNER_LIFECYCLE.COMPLETED;
  if (status === 'ongoing') return PARTNER_LIFECYCLE.IN_PROGRESS;
  if (status === 'denied' || status === 'canceled') return PARTNER_LIFECYCLE.DECLINED;
  if (repair?.has_offer_from_current_shop) {
    return PARTNER_LIFECYCLE.OFFER_SENT;
  }
  return PARTNER_LIFECYCLE.WAITING_FOR_OFFER;
}

export function getLifecyclePill(repair) {
  const key = resolvePartnerLifecycle(repair);
  return LIFECYCLE_PILL[key] || FALLBACK_PILL;
}

export function comparePartnerLifecycle(a, b) {
  const orderA = LIFECYCLE_SORT_ORDER[resolvePartnerLifecycle(a)] ?? 99;
  const orderB = LIFECYCLE_SORT_ORDER[resolvePartnerLifecycle(b)] ?? 99;
  if (orderA !== orderB) return orderA - orderB;
  const createdA = new Date(a?.created_at || 0).getTime();
  const createdB = new Date(b?.created_at || 0).getTime();
  return createdB - createdA;
}

export function countByLifecycle(repairs) {
  const counts = Object.values(PARTNER_LIFECYCLE).reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  (repairs || []).forEach((repair) => {
    const key = resolvePartnerLifecycle(repair);
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

export function formatLifecycleCounterLine(counts) {
  const segments = [
  ['Waiting for offer', counts[PARTNER_LIFECYCLE.WAITING_FOR_OFFER]],
  ['Offer sent', counts[PARTNER_LIFECYCLE.OFFER_SENT]],
  ['Accepted', counts[PARTNER_LIFECYCLE.OFFER_ACCEPTED]],
  ['In progress', counts[PARTNER_LIFECYCLE.IN_PROGRESS]],
  ['Completed', counts[PARTNER_LIFECYCLE.COMPLETED]],
  ['Declined', counts[PARTNER_LIFECYCLE.DECLINED]],
  ]
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label} (${count})`);

  return segments.join(' · ');
}

export function formatTimeSince(isoDate) {
  if (!isoDate) return '';
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
