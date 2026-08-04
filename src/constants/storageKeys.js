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
  logServiceRecordDraftKey: (vehicleId) => `@log_service_record_draft_${vehicleId}`,
  serviceRecordDraftKey: (vehicleId) => `serviceRecordDraft:${vehicleId}`,
  serviceRecordManualDraftKey: (vehicleId) => `serviceRecordManualDraft:${vehicleId}`,
};