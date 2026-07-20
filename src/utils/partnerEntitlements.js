/**
 * Partner subscription entitlements.
 *
 * Gate on feature flags / can_use_* from the API — never hardcode plan names
 * (trial / pro / premium / enterprise) for access decisions.
 *
 * Business rules (must match backend entitlements):
 * - Plans: Trial | PRO | Premium | Enterprise (Presence is NOT a plan)
 * - Account states: trial | active | grace_period | read_only | inactive_listing
 * - Inactive listing is a STATE — workshop stays listed; not accepting requests
 * - PRO = every core feature; Premium = visibility only (same ERP)
 * - Marketing is independent of subscription tiers
 * - Vehicle history (fleet / driver / owner) is always free
 * - Never lock existing repairs; never replace staff permissions
 */

export const UPGRADE_ACTION = 'upgrade_subscription';

export const ACCOUNT_STATES = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  GRACE_PERIOD: 'grace_period',
  READ_ONLY: 'read_only',
  INACTIVE_LISTING: 'inactive_listing',
};

/** Feature keys mirrored from backend entitlements registry. */
export const FEATURES = {
  MARKETPLACE_FULL: 'marketplace_full',
  MARKETPLACE_SEND_OFFER: 'marketplace_send_offer',
  MARKETPLACE_TEASER: 'marketplace_teaser',
  REPAIRS: 'repairs',
  CALENDAR: 'calendar',
  CHAT: 'chat',
  NOTIFICATIONS: 'notifications_workflow',
  VEHICLE_HISTORY: 'vehicle_history',
  ERP: 'erp',
  ERP_READ: 'erp_read',
  DOCUMENTS: 'documents',
  AI: 'ai_basic',
  CUSTOMER_CONTACTS: 'customer_contacts',
  FEATURED: 'featured',
  PREMIUM_BADGE: 'premium_badge',
  PRIORITY_RANKING: 'priority_ranking',
  HOMEPAGE_PROMO: 'homepage_promo',
};

/**
 * Normalize entitlements from shop profile payload or dedicated endpoint.
 */
export function getShopEntitlements(profileOrEntitlements) {
  if (!profileOrEntitlements) return null;
  if (profileOrEntitlements.features || profileOrEntitlements.can_use_marketplace != null) {
    return profileOrEntitlements.entitlements
      ? profileOrEntitlements.entitlements
      : profileOrEntitlements;
  }
  return profileOrEntitlements.entitlements || null;
}

export function shopHasFeature(profileOrEntitlements, featureKey) {
  const ents = getShopEntitlements(profileOrEntitlements);
  if (!ents) {
    // Legacy / missing payload: do not lock existing partners offline
    return true;
  }
  // Vehicle history is always free (fleet / driver / owner / shop-with-consent)
  if (featureKey === FEATURES.VEHICLE_HISTORY) {
    return true;
  }
  if (ents.features && featureKey in ents.features) {
    return Boolean(ents.features[featureKey]);
  }
  const canUseMap = {
    [FEATURES.MARKETPLACE_FULL]: ents.can_use_marketplace,
    [FEATURES.MARKETPLACE_SEND_OFFER]: ents.can_send_offers,
    [FEATURES.MARKETPLACE_TEASER]: ents.can_see_marketplace_teasers,
    [FEATURES.REPAIRS]: ents.can_use_repairs,
    [FEATURES.CALENDAR]: ents.can_use_calendar,
    [FEATURES.CHAT]: ents.can_use_chat,
    [FEATURES.NOTIFICATIONS]: ents.can_receive_notifications,
    [FEATURES.VEHICLE_HISTORY]: ents.can_use_vehicle_history,
    [FEATURES.ERP]: ents.can_use_erp,
    [FEATURES.ERP_READ]: ents.can_use_erp_read,
    [FEATURES.DOCUMENTS]: ents.can_use_documents,
    [FEATURES.AI]: ents.can_use_ai,
    [FEATURES.CUSTOMER_CONTACTS]: ents.can_view_customer_contacts,
    [FEATURES.FEATURED]: ents.can_be_featured,
    [FEATURES.PREMIUM_BADGE]: ents.has_premium_badge,
    [FEATURES.PRIORITY_RANKING]: ents.has_priority_ranking,
    [FEATURES.HOMEPAGE_PROMO]: ents.has_homepage_promo,
  };
  if (featureKey in canUseMap && canUseMap[featureKey] != null) {
    return Boolean(canUseMap[featureKey]);
  }
  return false;
}

export function canUseMarketplace(profile) {
  return shopHasFeature(profile, FEATURES.MARKETPLACE_FULL);
}

export function canSendPartnerOffers(profile) {
  return shopHasFeature(profile, FEATURES.MARKETPLACE_SEND_OFFER);
}

export function canUseRepairs(profile) {
  return shopHasFeature(profile, FEATURES.REPAIRS);
}

export function canUseCalendar(profile) {
  return shopHasFeature(profile, FEATURES.CALENDAR);
}

export function canUseErp(profile) {
  return shopHasFeature(profile, FEATURES.ERP);
}

export function canUseErpRead(profile) {
  const ents = getShopEntitlements(profile);
  if (!ents) return true;
  if (ents.can_use_erp_read != null) return Boolean(ents.can_use_erp_read);
  return shopHasFeature(profile, FEATURES.ERP_READ);
}

export function canUseVehicleHistory(_profile) {
  return true;
}

export function canSeeMarketplaceTeasers(profile) {
  return shopHasFeature(profile, FEATURES.MARKETPLACE_TEASER);
}

export function isAcceptingRequests(profile) {
  const ents = getShopEntitlements(profile);
  if (!ents) return true;
  if (ents.accepting_requests != null) return Boolean(ents.accepting_requests);
  const state = ents.account_state || ents.subscription_state;
  return !['read_only', 'inactive_listing', 'limited', 'cancelled'].includes(state);
}

export function getListingMessage(profile, t) {
  const ents = getShopEntitlements(profile);
  const state = ents?.account_state || ents?.subscription_state;
  // Prefer our localized copy over the raw (English) API listing_message so the
  // BG UI never shows mixed English text for a known restricted state.
  if (state === ACCOUNT_STATES.INACTIVE_LISTING || state === 'limited' || state === 'cancelled') {
    return (
      t?.('subscription.notAcceptingRequests') ||
      ents?.listing_message ||
      'Not currently accepting requests through Veversal.'
    );
  }
  if (ents?.listing_message) return ents.listing_message;
  return null;
}

export function getAccountState(profile) {
  const ents = getShopEntitlements(profile);
  return ents?.account_state || ents?.subscription_state || null;
}

/**
 * @deprecated Prefer canSendPartnerOffers / shopHasFeature. Kept for call sites.
 */
export function isPartnerSubscriptionActive(profile) {
  if (!profile) return true;
  const ents = getShopEntitlements(profile);
  if (ents) {
    return Boolean(ents.can_use_repairs || ents.can_use_marketplace);
  }
  if (profile.partner_subscription_active != null) {
    return Boolean(profile.partner_subscription_active);
  }
  if (profile.is_claimed === false) {
    return false;
  }
  return true;
}

export function isLeadTeaserLocked(repairOrMeta) {
  if (!repairOrMeta) return false;
  const access = repairOrMeta.entitlement_access;
  return (
    Boolean(repairOrMeta.is_locked) ||
    access === 'teaser' ||
    access === 'unavailable'
  );
}

export function upgradeNavigationParams({ featureKey, featureLabel } = {}) {
  return {
    featureKey: featureKey || null,
    featureLabel: featureLabel || null,
  };
}

/** Real customer-facing commercial plans (Presence is not a plan). */
const REAL_PLAN_KEYS = ['trial', 'pro', 'premium', 'enterprise'];

function planKeyLabel(key, t) {
  const map = {
    trial: t?.('subscription.planTrial') || 'Trial',
    pro: t?.('subscription.planPro') || 'PRO',
    premium: t?.('subscription.planPremium') || 'Premium',
    enterprise: t?.('subscription.planEnterprise') || 'Enterprise',
    // Legacy display fallback (Presence is no longer a plan)
    presence: t?.('subscription.planInactiveListing') || 'Inactive listing',
  };
  return map[String(key).toLowerCase()] || key;
}

/** Human-readable plan label for display only — never use for gating. */
export function planDisplayLabel(ents, t) {
  const key = ents?.plan_key || ents?.plan_label;
  if (!key) return t?.('subscription.planNone') || 'No active plan';
  return planKeyLabel(key, t) || ents?.plan_label || key;
}

/**
 * Current plan for DISPLAY on the upgrade / hero card.
 *
 * Uses the RAW stored `subscription_plan_key` from the shop profile so an unset
 * plan is never shown as "PRO". The backend infers PRO for feature-gating legacy
 * shops (so they stay unlocked), but that inferred tier must not be presented as
 * a purchased plan on the "current plan" label.
 *
 * Returns { key, label, isAssigned } where isAssigned is false when the shop has
 * no real commercial plan (blank / null / legacy `presence`).
 */
export function getCurrentPlanDisplay(profile, t) {
  const ents = getShopEntitlements(profile);
  const state = ents?.account_state || ents?.subscription_state || null;
  const rawKey = String(
    profile?.subscription_plan_key ?? ents?.subscription_plan_key ?? ''
  )
    .trim()
    .toLowerCase();

  // Explicitly assigned commercial plan → show it as-is.
  if (REAL_PLAN_KEYS.includes(rawKey)) {
    return { key: rawKey, label: planKeyLabel(rawKey, t), isAssigned: true };
  }

  // Trial is a legitimate (unpaid) experience even without a stored plan key.
  if (state === ACCOUNT_STATES.TRIAL) {
    return { key: 'trial', label: planKeyLabel('trial', t), isAssigned: true };
  }

  // No stored plan (blank / null / legacy presence) and not on trial:
  // the shop has not subscribed — never present this as PRO.
  return {
    key: null,
    label: t?.('subscription.planNone') || 'No active plan',
    isAssigned: false,
  };
}

/** Human-readable account state for display only. */
export function accountStateDisplayLabel(ents, t) {
  const state = ents?.account_state || ents?.subscription_state;
  if (!state) return '';
  const map = {
    trial: t?.('subscription.stateTrial') || 'Trial',
    active: t?.('subscription.stateActive') || 'Active',
    grace_period: t?.('subscription.stateGrace') || 'Grace period',
    read_only: t?.('subscription.stateReadOnly') || 'Read only',
    inactive_listing: t?.('subscription.stateInactiveListing') || 'Inactive listing',
    limited: t?.('subscription.stateInactiveListing') || 'Inactive listing',
    cancelled: t?.('subscription.stateInactiveListing') || 'Inactive listing',
  };
  return map[String(state).toLowerCase()] || state;
}
