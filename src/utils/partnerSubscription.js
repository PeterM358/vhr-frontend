/**
 * Partner subscription / activation gate.
 *
 * TODO(backend): replace placeholder with `partner_subscription_active` (or billing plan)
 * on ShopProfile when subscription API ships. Until then, unclaimed centers see activation CTA
 * while keeping open-request preview visible.
 */

export function isPartnerSubscriptionActive(profile) {
  if (!profile) return true;

  // Future backend field — takes precedence when present.
  if (profile.partner_subscription_active != null) {
    return Boolean(profile.partner_subscription_active);
  }

  if (profile.is_claimed === false) {
    return false;
  }

  return true;
}

export function canSendPartnerOffers(profile) {
  return isPartnerSubscriptionActive(profile);
}
