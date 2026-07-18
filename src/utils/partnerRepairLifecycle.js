/**
 * Partner dashboard repair request lifecycle labels, sort order, and pill styling.
 */

import { t as defaultT } from '../i18n';

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

const LIFECYCLE_PILL_STYLE = {
  [PARTNER_LIFECYCLE.WAITING_FOR_OFFER]: {
    bg: 'rgba(234,179,8,0.18)',
    fg: '#A16207',
    labelKey: 'partnerDashboard.status.waitingForOffer',
  },
  [PARTNER_LIFECYCLE.OFFER_SENT]: {
    bg: 'rgba(37,99,235,0.16)',
    fg: '#1D4ED8',
    labelKey: 'partnerDashboard.status.offerSent',
  },
  [PARTNER_LIFECYCLE.OFFER_ACCEPTED]: {
    bg: 'rgba(22,163,74,0.18)',
    fg: '#15803D',
    labelKey: 'partnerDashboard.status.offerAccepted',
  },
  [PARTNER_LIFECYCLE.IN_PROGRESS]: {
    bg: 'rgba(245,158,11,0.18)',
    fg: '#B45309',
    labelKey: 'partnerDashboard.status.inProgress',
  },
  [PARTNER_LIFECYCLE.COMPLETED]: {
    bg: 'rgba(22,163,74,0.18)',
    fg: '#15803D',
    labelKey: 'partnerDashboard.status.completed',
  },
  [PARTNER_LIFECYCLE.DECLINED]: {
    bg: 'rgba(220,38,38,0.18)',
    fg: '#B91C1C',
    labelKey: 'partnerDashboard.status.declined',
  },
};

const FALLBACK_PILL_STYLE = {
  bg: 'rgba(100,116,139,0.18)',
  fg: '#334155',
  labelKey: 'partnerDashboard.status.request',
};

const LIFECYCLE_COUNTER_KEYS = [
  ['partnerDashboard.lifecycleCounter.waitingForOffer', PARTNER_LIFECYCLE.WAITING_FOR_OFFER],
  ['partnerDashboard.lifecycleCounter.offerSent', PARTNER_LIFECYCLE.OFFER_SENT],
  ['partnerDashboard.lifecycleCounter.accepted', PARTNER_LIFECYCLE.OFFER_ACCEPTED],
  ['partnerDashboard.lifecycleCounter.inProgress', PARTNER_LIFECYCLE.IN_PROGRESS],
  ['partnerDashboard.lifecycleCounter.completed', PARTNER_LIFECYCLE.COMPLETED],
  ['partnerDashboard.lifecycleCounter.declined', PARTNER_LIFECYCLE.DECLINED],
];

export function resolvePartnerLifecycle(repair) {
  if (!repair || typeof repair !== 'object') {
    return PARTNER_LIFECYCLE.WAITING_FOR_OFFER;
  }

  const lifecycle = String(repair.partner_lifecycle_status || '').trim();
  if (lifecycle && LIFECYCLE_PILL_STYLE[lifecycle]) {
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

export function getLifecyclePill(repair, translateFn = defaultT) {
  const key = resolvePartnerLifecycle(repair);
  const style = LIFECYCLE_PILL_STYLE[key] || FALLBACK_PILL_STYLE;
  return {
    label: translateFn(style.labelKey),
    bg: style.bg,
    fg: style.fg,
  };
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

export function formatLifecycleCounterLine(counts, translateFn = defaultT) {
  const segments = LIFECYCLE_COUNTER_KEYS.filter(([, lifecycleKey]) => counts[lifecycleKey] > 0).map(
    ([labelKey, lifecycleKey]) =>
      `${translateFn(labelKey)} (${counts[lifecycleKey]})`
  );

  return segments.join(' · ');
}

/**
 * Partner repair detail — context card title/body for shop view on open requests.
 * Returns null when a dedicated section already covers the state (e.g. awaiting arrival).
 */
export function getPartnerRequestGuide(
  repair,
  { offers = [], shopProfileId, vehicleAtShop, isMyShopRepair } = {},
  translateFn = defaultT
) {
  if (!repair) return null;

  const status = String(repair.status || '').toLowerCase();
  if (status === 'done') {
    return {
      title: translateFn('partnerDashboard.guide.completedTitle'),
      body: translateFn('partnerDashboard.guide.completedBody'),
    };
  }
  if (status === 'ongoing' || vehicleAtShop) {
    return {
      title: translateFn('partnerDashboard.guide.inProgressTitle'),
      body: translateFn('partnerDashboard.guide.inProgressBody'),
    };
  }

  const shopId = shopProfileId != null ? Number(shopProfileId) : null;
  const shopOffers = (offers || []).filter(
    (o) => shopId != null && !Number.isNaN(shopId) && Number(o.shop) === shopId
  );
  const assignedShopId = Number(repair.shop_profile ?? repair.shop_profile_id);
  const assignedToThisShop =
    shopId != null && !Number.isNaN(shopId) && Number.isFinite(assignedShopId) && assignedShopId === shopId;
  // Prefer offer.is_booked; also treat assigned shop as booked so we never show
  // "waiting for customer to book" alongside Awaiting arrival / job access.
  const bookedOffer = shopOffers.some((o) => o.is_booked) || assignedToThisShop;
  const sentOffer = shopOffers.length > 0;

  if (bookedOffer) {
    if (repair.scheduled_start && !vehicleAtShop && isMyShopRepair) {
      return null;
    }
    return {
      title: translateFn('partnerDashboard.guide.confirmedTitle'),
      body: translateFn('partnerDashboard.guide.confirmedBody'),
    };
  }

  if (sentOffer) {
    return {
      title: translateFn('partnerDashboard.guide.offerSentTitle'),
      body: translateFn('partnerDashboard.guide.offerSentBody'),
    };
  }

  return {
    title: translateFn('partnerDashboard.guide.reviewTitle'),
    body: translateFn('partnerDashboard.guide.reviewBody'),
  };
}

export function formatTimeSince(isoDate, translateFn = defaultT) {
  if (!isoDate) return '';
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return translateFn('partnerDashboard.timeSince.justNow');
  if (minutes < 60) return translateFn('partnerDashboard.timeSince.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translateFn('partnerDashboard.timeSince.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return translateFn('partnerDashboard.timeSince.daysAgo', { count: days });
  return new Date(isoDate).toLocaleDateString();
}
