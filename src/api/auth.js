import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearVehiclesCache } from './vehicles';
import { API_BASE_URL } from '../env';
import { syncPushDeviceToken, deactivatePushDeviceToken } from '../notifications/pushDeviceSync';
import { messageFromApiError } from '../utils/apiErrorMessage';
import { resetToPublicHome } from '../navigation/authNavigation';
import { safeError } from '../utils/logger';
import { getLocale } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { writeOrganizationMemberships } from '../utils/orgWorkspace';
import { buildE164Phone } from '../utils/phoneE164';

function isStoredToken(value) {
  return !!(value && value !== 'null' && value !== 'undefined');
}

let refreshInFlight = null;
const sessionInvalidListeners = new Set();

/** Subscribe to forced sign-out (expired / revoked session). Returns unsubscribe. */
export function onSessionInvalid(listener) {
  if (typeof listener !== 'function') return () => {};
  sessionInvalidListeners.add(listener);
  return () => sessionInvalidListeners.delete(listener);
}

function emitSessionInvalid(reason) {
  sessionInvalidListeners.forEach((listener) => {
    try {
      listener(reason);
    } catch (error) {
      safeError('Session invalid listener failed', error);
    }
  });
}

function decodeJwtPayload(token) {
  const part = String(token || '').split('.')[1];
  if (!part) return null;
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  try {
    const raw =
      typeof globalThis.atob === 'function'
        ? globalThis.atob(padded)
        : typeof Buffer !== 'undefined'
          ? Buffer.from(padded, 'base64').toString('utf8')
          : null;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** True when access JWT `exp` is past (30s skew). Unknown shape → false. */
export function isAccessTokenExpired(token, skewMs = 30_000) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Date.now() >= payload.exp * 1000 - skewMs;
}

async function clearStoredAuthTokens() {
  await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
}

async function clearStoredWorkspaceFlags() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.IS_SHOP,
    STORAGE_KEYS.IS_CLIENT,
    STORAGE_KEYS.SHOP_PROFILES,
    STORAGE_KEYS.SHOP_MEMBERSHIPS,
    STORAGE_KEYS.CURRENT_SHOP_ID,
    STORAGE_KEYS.ORGANIZATION_MEMBERSHIPS,
    STORAGE_KEYS.CURRENT_ORGANIZATION_ID,
    STORAGE_KEYS.WORKSPACE_MODE,
    STORAGE_KEYS.USER_ID,
    STORAGE_KEYS.EMAIL_VERIFIED,
  ]);
}

/**
 * Clear local auth and notify listeners (AppNavigator → Login).
 * Does not navigate by itself.
 */
export async function invalidateLocalSession(reason = 'expired') {
  await clearStoredAuthTokens();
  await clearStoredWorkspaceFlags();
  clearVehiclesCache();
  emitSessionInvalid(reason);
}

/**
 * Exchange refresh token for a new access token (single-flight).
 * @returns {Promise<string|null>} fresh access token, or null if refresh rejected
 * @throws on network / unexpected errors (caller may keep stale access)
 */
export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!isStoredToken(refresh)) return null;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
      const access = response.data?.access;
      if (!access) return null;
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
      if (response.data?.refresh) {
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refresh);
      }
      return access;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 400) {
        await clearStoredAuthTokens();
        return null;
      }
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Persist shop/org workspace flags from login or GET /api/users/session/.
 * Does not write tokens — callers that receive tokens write those separately.
 */
export async function applyWorkspaceSessionFlags(data = {}, { fallbackDisplay } = {}) {
  const {
    is_client,
    is_shop,
    user_id,
    email,
    phone,
    shop_profiles,
    shop_memberships,
    organization_memberships,
    email_verified,
  } = data || {};

  let userDisplay = '';
  if (email && String(email).trim()) userDisplay = String(email).trim();
  else if (phone && String(phone).trim()) userDisplay = String(phone).trim();
  else if (fallbackDisplay) userDisplay = String(fallbackDisplay).trim();

  const hasShopProfiles = Array.isArray(shop_profiles) && shop_profiles.length > 0;
  const hasShopMemberships = Array.isArray(shop_memberships) && shop_memberships.length > 0;
  // Linked shop access counts as partner even if the API flag is briefly stale.
  const shopMode = Boolean(is_shop) || hasShopProfiles || hasShopMemberships;

  const itemsToStore = [
    [STORAGE_KEYS.IS_CLIENT, is_client ? 'true' : 'false'],
    [STORAGE_KEYS.IS_SHOP, shopMode ? 'true' : 'false'],
    [STORAGE_KEYS.USER_ID, user_id != null ? String(user_id) : ''],
    [STORAGE_KEYS.EMAIL_VERIFIED, email_verified ? 'true' : 'false'],
  ];

  if (userDisplay) {
    itemsToStore.push(['@user_email_or_phone', userDisplay]);
  }
  if (email && String(email).trim()) {
    itemsToStore.push(['@login_email', String(email).trim()]);
  }
  if (phone && String(phone).trim()) {
    itemsToStore.push(['@login_phone', String(phone).trim()]);
  }

  if (shopMode && hasShopProfiles) {
    itemsToStore.push([STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(shop_profiles)]);
    const shopId = shop_profiles[0]?.id;
    if (shopId != null) {
      itemsToStore.push([STORAGE_KEYS.CURRENT_SHOP_ID, String(shopId)]);
    }
  } else if (shopMode && hasShopMemberships) {
    const shopId = shop_memberships[0]?.shop_id ?? shop_memberships[0]?.shopId;
    if (shopId != null) {
      itemsToStore.push([STORAGE_KEYS.CURRENT_SHOP_ID, String(shopId)]);
    }
  } else {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SHOP_PROFILES,
      STORAGE_KEYS.SHOP_MEMBERSHIPS,
      STORAGE_KEYS.CURRENT_SHOP_ID,
    ]);
  }
  if (shopMode && hasShopMemberships) {
    itemsToStore.push([STORAGE_KEYS.SHOP_MEMBERSHIPS, JSON.stringify(shop_memberships)]);
  } else if (shopMode && !hasShopMemberships) {
    await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_MEMBERSHIPS);
  }

  const orgMemberships = Array.isArray(organization_memberships) ? organization_memberships : [];
  await writeOrganizationMemberships(orgMemberships);
  await AsyncStorage.multiSet(itemsToStore);
  return { shopMode, hasShopProfiles, hasShopMemberships };
}

/**
 * Re-read workspace flags from the server after token restore / tab resume.
 * @returns {Promise<object|null>} session payload, or null if session was invalidated
 */
export async function hydrateAuthSession(accessToken) {
  if (!isStoredToken(accessToken)) return null;
  try {
    const response = await axios.get(`${API_BASE_URL}/api/users/session/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await applyWorkspaceSessionFlags(response.data);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      await invalidateLocalSession('session_rejected');
      return null;
    }
    safeError('Auth session hydrate failed', error);
    throw error;
  }
}

/**
 * Cold-start / resume session like Facebook: refresh when possible so expired
 * access tokens (7d) do not leave the user "logged in" with broken API calls.
 * Always re-hydrates shop/org flags from GET /api/users/session/ so a stale
 * browser tab cannot land a partner on the empty client dashboard.
 */
export async function restoreSession() {
  const [access, refresh] = await AsyncStorage.multiGet([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
  ]).then((pairs) => pairs.map(([, v]) => v));

  const hasAccess = isStoredToken(access);
  const hasRefresh = isStoredToken(refresh);

  if (!hasAccess && !hasRefresh) {
    return { token: null, authenticated: false };
  }

  let token = null;

  if (hasRefresh) {
    try {
      const fresh = await refreshAccessToken();
      if (fresh) {
        token = fresh;
      } else {
        // Refresh rejected (401/400) — tokens already cleared; drop role flags too.
        await clearStoredWorkspaceFlags();
        emitSessionInvalid('refresh_rejected');
        return { token: null, authenticated: false };
      }
    } catch (error) {
      safeError('Session refresh failed (keeping local token if any)', error);
      if (hasAccess) {
        token = access;
      } else {
        await clearStoredWorkspaceFlags();
        return { token: null, authenticated: false };
      }
    }
  } else if (hasAccess) {
    token = access;
  }

  if (!token) {
    await clearStoredWorkspaceFlags();
    return { token: null, authenticated: false };
  }

  try {
    const workspace = await hydrateAuthSession(token);
    if (workspace === null) {
      return { token: null, authenticated: false };
    }
    return { token, authenticated: true, workspace };
  } catch {
    // Network / 5xx while hydrating — keep token; local flags may be used until next resume.
    return { token, authenticated: true };
  }
}

const normalizeAuthLanguage = (locale) => {
  const value = String(locale || getLocale() || 'en').trim().toLowerCase().split('-')[0];
  return value === 'bg' ? 'bg' : 'en';
};

const normalizeLoginPhone = (value) => {
  if (!value) return '';
  let trimmed = value.trim().replace(/\s+/g, '').replace(/-/g, '');
  if (trimmed.startsWith('00')) trimmed = `+${trimmed.slice(2)}`;
  if (!trimmed.startsWith('+')) return trimmed;
  // Re-parse via E.164 helper to drop trunk 0 after country code (+3590… → +359…).
  const digits = trimmed.slice(1);
  for (const ccLen of [1, 2, 3]) {
    if (digits.length <= ccLen + 1) continue;
    const prefix = `+${digits.slice(0, ccLen)}`;
    const national = digits.slice(ccLen);
    const rebuilt = buildE164Phone(prefix, national);
    if (rebuilt) return rebuilt;
  }
  return trimmed;
};

/** Build E.164 from login/register prefix + national fields. */
export const composeAuthPhone = (prefix, national) => {
  const e164 = buildE164Phone(prefix, national);
  if (e164) return e164;
  return normalizeLoginPhone(`${prefix || ''}${national || ''}`);
};

const buildLoginIdentifierBody = (emailOrPhone, password) => {
  const raw = (emailOrPhone || '').trim();
  const hasAt = raw.includes('@');
  if (hasAt) {
    return { email: raw.toLowerCase(), password };
  }
  return { phone: normalizeLoginPhone(raw), password };
};


// ✅ Register
export const register = async (emailOrPhone, password, isClient, isShop, language = getLocale()) => {
  try {
    let registerData;
    const raw = (emailOrPhone || '').trim();
    const loginData = buildLoginIdentifierBody(raw, password);
    const authLanguage = normalizeAuthLanguage(language);
    const phone = loginData.phone || '';

    if (raw.includes('@')) {
      registerData = {
        email: raw.toLowerCase(),
        password,
        is_client: isClient,
        is_shop: isShop,
        language: authLanguage,
      };
    } else {
      if (!phone.startsWith('+')) {
        throw new Error('Phone number must include country code prefix (e.g. +359).');
      }
      registerData = {
        phone,
        password,
        is_client: isClient,
        is_shop: isShop,
        language: authLanguage,
      };
    }

    await axios.post(`${API_BASE_URL}/api/users/register/`, registerData);

    const loginResponse = await axios.post(`${API_BASE_URL}/api/token/`, loginData);

    const storedId = raw.includes('@') ? raw.toLowerCase() : phone;
    await storeLoginData(loginResponse.data, storedId);
    await syncPushDeviceToken(loginResponse.data.access);

    return loginResponse.data;
  } catch (error) {
    safeError('Registration or login failed', error);
    if (error?.response) {
      throw new Error(messageFromApiError(error, 'Registration or login failed.'));
    }
    throw error instanceof Error
      ? error
      : new Error(messageFromApiError(error, 'Registration or login failed.'));
  }
};

function loginErrorMessage(error) {
  const data = error?.response?.data;
  const retry = Number(data?.retry_after_seconds);
  if (error?.response?.status === 429 || (Number.isFinite(retry) && retry > 0 && data?.detail)) {
    const minutes = Math.max(1, Math.ceil(retry / 60));
    const detail = typeof data?.detail === 'string' ? data.detail : 'Too many sign-in attempts. Please try again later.';
    return `${detail} (~${minutes} min)`;
  }
  return messageFromApiError(error, 'Login failed. Please check your credentials.');
}

// ✅ Login
export const login = async (emailOrPhone, password) => {
  try {
    const body = buildLoginIdentifierBody(emailOrPhone, password);

    const response = await axios.post(`${API_BASE_URL}/api/token/`, body);

    await storeLoginData(response.data, emailOrPhone.trim());
    await syncPushDeviceToken(response.data.access);

    return response.data;
  } catch (error) {
    safeError('Login failed', error);
    const err = new Error(loginErrorMessage(error));
    err.status = error?.response?.status;
    err.retryAfterSeconds = Number(error?.response?.data?.retry_after_seconds) || 0;
    throw err;
  }
};

// ✅ Store Login Data Helper
const storeLoginData = async (data, fallbackDisplay) => {
  const { access, refresh } = data || {};
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, access],
    [STORAGE_KEYS.REFRESH_TOKEN, refresh],
  ]);
  await applyWorkspaceSessionFlags(data, { fallbackDisplay });
};

// ✅ Example of an authenticated API call
export const getVehicles = async () => {
  const token = await AsyncStorage.getItem('@access_token');
  if (!token) throw new Error('No token found');

  try {
    const response = await axios.get(`${API_BASE_URL}/api/vehicles/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch vehicles');
  }
};

// ✅ Logout
export const logout = async (
  navigation,
  setAuthToken,
  setIsAuthenticated,
  setUserEmailOrPhone
) => {
  const accessToken = await AsyncStorage.getItem('@access_token');
  if (accessToken) {
    await deactivatePushDeviceToken(accessToken);
  }

  await AsyncStorage.clear();
  clearVehiclesCache();

  if (setAuthToken) setAuthToken(null);
  if (setIsAuthenticated) setIsAuthenticated(false);
  if (setUserEmailOrPhone) setUserEmailOrPhone('');

  resetToPublicHome(navigation);
};

// ✅ Resend email verification link
export const resendEmailVerification = async (email, language = getLocale()) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/email/verify/resend/`, {
      email: String(email || '').trim().toLowerCase(),
      language: normalizeAuthLanguage(language),
    });
    return response.data;
  } catch (error) {
    safeError('Email verification resend failed', error);
    throw new Error(messageFromApiError(error, 'Failed to send verification email.'));
  }
};

// ✅ Refresh authenticated session flags (email_verified, shop/org, etc.)
export const fetchAuthSession = async (accessToken) => {
  try {
    const data = await hydrateAuthSession(accessToken);
    if (data == null) {
      throw new Error('Session expired. Please sign in again.');
    }
    return data;
  } catch (error) {
    if (error?.message === 'Session expired. Please sign in again.') {
      throw error;
    }
    safeError('Auth session fetch failed', error);
    throw new Error(messageFromApiError(error, 'Failed to refresh account status.'));
  }
};

// ✅ Request Password Reset (send email)
export const requestPasswordReset = async (email, language = getLocale()) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/password/reset/`, {
      email,
      language: normalizeAuthLanguage(language),
    });
    return response.data;
  } catch (error) {
    safeError('Password reset request failed', error);
    throw new Error('Failed to send password reset email.');
  }
};

// ✅ Confirm email verification (returns login tokens when successful)
export const confirmEmailVerification = async (uid, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/email/verify/confirm/`, {
      uid,
      token,
    });
    const data = response.data;
    if (data?.access) {
      const identifier =
        (data.email && String(data.email).trim()) ||
        (data.phone && String(data.phone).trim()) ||
        '';
      await storeLoginData(data, identifier);
      await syncPushDeviceToken(data.access);
    }
    return data;
  } catch (error) {
    safeError('Email verification confirm failed', error);
    throw new Error(messageFromApiError(error, 'Failed to verify email.'));
  }
};

// ✅ Confirm Password Reset (set new password; returns login tokens when successful)
export const confirmPasswordReset = async (uid, token, newPassword) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/password/confirm/`, {
      uid,
      token,
      new_password: newPassword,
    });
    const data = response.data;
    if (data?.access) {
      const identifier = (data.email && String(data.email).trim()) || (data.phone && String(data.phone).trim()) || '';
      await storeLoginData(data, identifier);
      await syncPushDeviceToken(data.access);
    }
    return data;
  } catch (error) {
    safeError('Password reset confirm failed', error);
    throw new Error(messageFromApiError(error, 'Failed to reset password.'));
  }
};

export const googleLogin = async (idToken) => {
  const response = await axios.post('/users/google-login/', {
    id_token: idToken,
  });

  await storeLoginData(response.data, response.data.email);
  await syncPushDeviceToken(response.data.access);
  return response.data;
};