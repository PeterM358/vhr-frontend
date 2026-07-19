#!/usr/bin/env node
/**
 * Partner entitlement helper checks (mirrors partnerEntitlements.js).
 * Run: npm run test:partner-entitlements
 */

const assert = require('assert');

const FEATURES = {
  MARKETPLACE_FULL: 'marketplace_full',
  MARKETPLACE_SEND_OFFER: 'marketplace_send_offer',
  MARKETPLACE_TEASER: 'marketplace_teaser',
  ERP: 'erp',
  ERP_READ: 'erp_read',
  REPAIRS: 'repairs',
  VEHICLE_HISTORY: 'vehicle_history',
};

function getShopEntitlements(profileOrEntitlements) {
  if (!profileOrEntitlements) return null;
  if (profileOrEntitlements.features || profileOrEntitlements.can_use_marketplace != null) {
    return profileOrEntitlements.entitlements
      ? profileOrEntitlements.entitlements
      : profileOrEntitlements;
  }
  return profileOrEntitlements.entitlements || null;
}

function shopHasFeature(profileOrEntitlements, featureKey) {
  const ents = getShopEntitlements(profileOrEntitlements);
  if (!ents) return true;
  if (featureKey === FEATURES.VEHICLE_HISTORY) return true;
  if (ents.features && featureKey in ents.features) {
    return Boolean(ents.features[featureKey]);
  }
  const canUseMap = {
    [FEATURES.MARKETPLACE_FULL]: ents.can_use_marketplace,
    [FEATURES.MARKETPLACE_SEND_OFFER]: ents.can_send_offers,
    [FEATURES.MARKETPLACE_TEASER]: ents.can_see_marketplace_teasers,
    [FEATURES.ERP]: ents.can_use_erp,
    [FEATURES.ERP_READ]: ents.can_use_erp_read,
    [FEATURES.REPAIRS]: ents.can_use_repairs,
  };
  if (featureKey in canUseMap && canUseMap[featureKey] != null) {
    return Boolean(canUseMap[featureKey]);
  }
  return false;
}

function canSendPartnerOffers(profile) {
  return shopHasFeature(profile, FEATURES.MARKETPLACE_SEND_OFFER);
}

function canUseErp(profile) {
  return shopHasFeature(profile, FEATURES.ERP);
}

function canUseVehicleHistory() {
  return true;
}

function isAcceptingRequests(profile) {
  const ents = getShopEntitlements(profile);
  if (!ents) return true;
  if (ents.accepting_requests != null) return Boolean(ents.accepting_requests);
  return true;
}

function isLeadTeaserLocked(repairOrMeta) {
  if (!repairOrMeta) return false;
  const access = repairOrMeta.entitlement_access;
  return (
    Boolean(repairOrMeta.is_locked) ||
    access === 'teaser' ||
    access === 'unavailable'
  );
}

const inactive = {
  plan_key: 'pro',
  account_state: 'inactive_listing',
  accepting_requests: false,
  can_use_marketplace: false,
  can_send_offers: false,
  can_use_erp: false,
  can_use_erp_read: true,
  can_use_repairs: false,
  can_see_marketplace_teasers: false,
  can_use_vehicle_history: true,
  listing_message: 'Not currently accepting requests.',
  features: {
    marketplace_full: false,
    marketplace_send_offer: false,
    erp: false,
    erp_read: true,
    repairs: false,
    marketplace_teaser: false,
    vehicle_history: true,
  },
};

const trial = {
  plan_key: 'trial',
  account_state: 'trial',
  accepting_requests: true,
  can_use_marketplace: true,
  can_send_offers: true,
  can_use_erp: true,
  can_use_repairs: true,
  features: {
    marketplace_full: true,
    marketplace_send_offer: true,
    erp: true,
    repairs: true,
  },
};

const pro = {
  plan_key: 'pro',
  account_state: 'active',
  accepting_requests: true,
  can_use_marketplace: true,
  can_send_offers: true,
  can_use_erp: true,
  can_use_repairs: true,
  features: {
    marketplace_full: true,
    marketplace_send_offer: true,
    erp: true,
    repairs: true,
  },
};

assert.strictEqual(canSendPartnerOffers(inactive), false);
assert.strictEqual(canSendPartnerOffers(pro), true);
assert.strictEqual(canSendPartnerOffers(trial), true);
assert.strictEqual(canUseErp(inactive), false);
assert.strictEqual(shopHasFeature(inactive, FEATURES.ERP_READ), true);
assert.strictEqual(canUseErp(pro), true);
assert.strictEqual(shopHasFeature(inactive, FEATURES.MARKETPLACE_TEASER), false);
assert.strictEqual(shopHasFeature(inactive, FEATURES.MARKETPLACE_FULL), false);
assert.strictEqual(canUseVehicleHistory(inactive), true);
assert.strictEqual(shopHasFeature(inactive, FEATURES.VEHICLE_HISTORY), true);
assert.strictEqual(isAcceptingRequests(inactive), false);
assert.strictEqual(isAcceptingRequests(pro), true);
assert.strictEqual(isLeadTeaserLocked({ is_locked: true }), true);
assert.strictEqual(isLeadTeaserLocked({ entitlement_access: 'unavailable' }), true);
assert.strictEqual(isLeadTeaserLocked({ entitlement_access: 'full' }), false);
assert.strictEqual(canSendPartnerOffers({ entitlements: inactive }), false);
assert.strictEqual(canSendPartnerOffers({}), true, 'legacy missing entitlements stay open');
assert.strictEqual(canSendPartnerOffers(null), true);

// FE must not gate on plan_key string — features decide
assert.strictEqual(inactive.plan_key, 'pro');
assert.strictEqual(shopHasFeature(inactive, FEATURES.ERP), false);
assert.strictEqual(shopHasFeature({ plan_key: 'enterprise', features: { erp: false } }, FEATURES.ERP), false);

console.log('partner-entitlements: ok');
