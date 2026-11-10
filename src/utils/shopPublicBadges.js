/**
 * Public shop hero badges — keep claim/verify/subscription axes separate.
 *
 * Clients should NOT see “Claimed — profile in progress” (ownership ≠ readiness).
 * Prefer: not accepting work | verified partner | (nothing).
 * Owner preview gets actionable chips: finish profile | activate plan.
 */

import { FEATURES, isAcceptingRequests, upgradeNavigationParams } from './partnerEntitlements';

function shopAccepting(shop) {
  if (shop?.accepting_requests != null) return Boolean(shop.accepting_requests);
  return isAcceptingRequests(shop);
}

function shopVerified(shop) {
  return Boolean(
    shop?.is_verified || shop?.verification_status === 'verified_partner',
  );
}

function profileReady(shop) {
  const ready = shop?.profile_completion?.ready_to_publish;
  if (typeof ready === 'boolean') return ready;
  // Missing completion payload: do not block activate-plan path on accepts flag alone
  return null;
}

function shopPremium(shop) {
  const ents = shop?.entitlements;
  if (ents?.has_premium_badge) return true;
  const plan = String(
    ents?.plan_key || shop?.subscription_plan_key || ''
  )
    .trim()
    .toLowerCase();
  return plan === 'premium' || plan === 'enterprise';
}

/**
 * Client-facing badge (single primary).
 * @returns {{ kind: 'not_accepting'|'premium'|'verified'|'none', icon?: string }}
 */
export function resolveShopClientBadge(shop) {
  if (!shop || shop.is_claimed === false) {
    return { kind: 'none' };
  }
  if (!shopAccepting(shop)) {
    return { kind: 'not_accepting', icon: 'pause-circle-outline' };
  }
  // Premium visibility badge (subscription) — ahead of generic verified.
  if (shopPremium(shop)) {
    return { kind: 'premium', icon: 'star-circle' };
  }
  if (shopVerified(shop)) {
    return { kind: 'verified', icon: 'shield-check' };
  }
  return { kind: 'none' };
}

/**
 * Owner / public-preview action chip.
 * @returns {null | { kind: string, icon: string, target: string, navParams?: object }}
 */
export function resolveShopOwnerPreviewAction(shop) {
  if (!shop) return null;
  const ready = profileReady(shop);
  if (ready === false) {
    return {
      kind: 'complete_profile',
      icon: 'clipboard-list-outline',
      target: 'ShopProfile',
    };
  }
  if (!shopAccepting(shop)) {
    return {
      kind: 'activate_plan',
      icon: 'rocket-launch-outline',
      target: 'ShopSubscriptionUpgrade',
      navParams: upgradeNavigationParams({ featureKey: FEATURES.REPAIRS }),
    };
  }
  return null;
}
