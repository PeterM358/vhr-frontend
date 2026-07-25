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
  LOCALE: '@veversal_locale',
  /** 'accepted' | 'rejected' — web analytics/cookie consent choice */
  COOKIE_CONSENT: '@cookie_consent',
  logServiceRecordDraftKey: (vehicleId) => `@log_service_record_draft_${vehicleId}`,
  serviceRecordDraftKey: (vehicleId) => `serviceRecordDraft:${vehicleId}`,
  serviceRecordManualDraftKey: (vehicleId) => `serviceRecordManualDraft:${vehicleId}`,
};