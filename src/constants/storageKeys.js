// src/constants/storageKeys.js
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@access_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_ID: '@user_id',
  IS_SHOP: '@is_shop',
  IS_CLIENT: '@is_client',
  SHOP_PROFILES: '@shop_profiles',
  SHOP_MEMBERSHIPS: '@shop_memberships',
  CURRENT_SHOP_ID: '@current_shop_id',
  ORGANIZATION_MEMBERSHIPS: '@organization_memberships',
  CURRENT_ORGANIZATION_ID: '@current_organization_id',
  WORKSPACE_MODE: '@workspace_mode',
  AUTH_RETURN_URL: '@auth_return_url',
  EMAIL_VERIFIED: '@email_verified',
  /** 'person' | 'company' — set at sign-up to route company users to org onboarding */
  SIGNUP_ACCOUNT_KIND: '@signup_account_kind',
  LOCALE: '@veversal_locale',
  /** JSON ConsentState (or legacy 'accepted'|'rejected') — web analytics/cookie consent */
  COOKIE_CONSENT: '@cookie_consent',
  /** Soft org-home public-listing tip dismissed for this organization */
  orgListingCtaDismissedKey: (orgId) => `@org_listing_cta_dismissed_${orgId}`,
  /** Partner home shop-name context bar dismissed for this shop (compact only) */
  partnerShopContextBarDismissedKey: (shopId) =>
    `@partner_shop_context_bar_dismissed_${shopId}`,
  /** Combined shop name + partner intro card dismissed (replaces separate hero + context bar) */
  partnerHomeIntroDismissedKey: (shopId) => `@partner_home_intro_dismissed_${shopId}`,
  /** Paid plan celebration on Shop Home — dismissed once per shop (any paid plan) */
  partnerPaidPlanBadgeDismissedKey: (shopId, _planKey) =>
    `@partner_paid_plan_badge_dismissed_${shopId}`,
  /** Invoice numbering sub-option shown once before first issued tax invoice */
  invoiceSeriesSetupSeenKey: (shopId) => `@invoice_series_setup_seen_${shopId}`,
  /** Partner home analytics nudge after first completed repair */
  partnerAnalyticsNudgeDismissedKey: (shopId) => `@partner_analytics_nudge_dismissed_${shopId}`,
  logServiceRecordDraftKey: (vehicleId) => `@log_service_record_draft_${vehicleId}`,
  serviceRecordDraftKey: (vehicleId) => `serviceRecordDraft:${vehicleId}`,
  serviceRecordManualDraftKey: (vehicleId) => `serviceRecordManualDraft:${vehicleId}`,
};