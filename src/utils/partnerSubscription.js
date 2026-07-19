/**
 * Partner subscription / activation gate.
 *
 * Re-exports entitlement helpers. Prefer partnerEntitlements.js for new code.
 */

export {
  isPartnerSubscriptionActive,
  canSendPartnerOffers,
  canUseMarketplace,
  canUseRepairs,
  canUseCalendar,
  canUseErp,
  canUseErpRead,
  canUseVehicleHistory,
  canSeeMarketplaceTeasers,
  isAcceptingRequests,
  getListingMessage,
  getAccountState,
  shopHasFeature,
  getShopEntitlements,
  isLeadTeaserLocked,
  upgradeNavigationParams,
  planDisplayLabel,
  accountStateDisplayLabel,
  FEATURES,
  ACCOUNT_STATES,
  UPGRADE_ACTION,
} from './partnerEntitlements';
