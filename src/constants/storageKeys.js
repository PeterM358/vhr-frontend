// src/constants/storageKeys.js
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@access_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_ID: '@user_id',
  IS_SHOP: '@is_shop',
  IS_CLIENT: '@is_client',
  SHOP_PROFILES: '@shop_profiles',
  CURRENT_SHOP_ID: '@current_shop_id',
  AUTH_RETURN_URL: '@auth_return_url',
  logServiceRecordDraftKey: (vehicleId) => `@log_service_record_draft_${vehicleId}`,
  serviceRecordDraftKey: (vehicleId) => `serviceRecordDraft:${vehicleId}`,
  serviceRecordManualDraftKey: (vehicleId) => `serviceRecordManualDraft:${vehicleId}`,
};