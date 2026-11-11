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

async function clearStoredAuthTokens() {
  await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
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
 * Cold-start / resume session like Facebook: refresh when possible so expired
 * access tokens (7d) do not leave the user "logged in" with broken API calls.
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

  if (hasRefresh) {
    try {
      const fresh = await refreshAccessToken();
      if (fresh) {
        return { token: fresh, authenticated: true };
      }
      return { token: null, authenticated: false };
    } catch (error) {
      safeError('Session refresh failed (keeping local token if any)', error);
      if (hasAccess) {
        return { token: access, authenticated: true };
      }
      return { token: null, authenticated: false };
    }
  }

  return { token: access, authenticated: hasAccess };
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
  const {
    access,
    refresh,
    is_client,
    is_shop,
    user_id,
    email,
    phone,
    shop_profiles,
    shop_memberships,
    organization_memberships,
    email_verified,
  } = data;

  let userDisplay = '';
  if (email && email.trim()) userDisplay = email.trim();
  else if (phone && phone.trim()) userDisplay = phone.trim();
  else userDisplay = fallbackDisplay;

  const hasShopProfiles = Array.isArray(shop_profiles) && shop_profiles.length > 0;
  const hasShopMemberships = Array.isArray(shop_memberships) && shop_memberships.length > 0;
  // Linked shop access counts as partner even if the API flag is briefly stale.
  const shopMode = Boolean(is_shop) || hasShopProfiles || hasShopMemberships;

  const itemsToStore = [
    ['@access_token', access],
    ['@refresh_token', refresh],
    ['@is_client', is_client ? 'true' : 'false'],
    ['@is_shop', shopMode ? 'true' : 'false'],
    ['@user_id', user_id?.toString() || ''],
    ['@user_email_or_phone', userDisplay],
    ['@login_email', email && String(email).trim() ? String(email).trim() : ''],
    ['@login_phone', phone && String(phone).trim() ? String(phone).trim() : ''],
    [STORAGE_KEYS.EMAIL_VERIFIED, email_verified ? 'true' : 'false'],
  ];

  if (shopMode && hasShopProfiles) {
    itemsToStore.push(['@shop_profiles', JSON.stringify(shop_profiles)]);
    const shopId = shop_profiles[0]?.id;
    if (shopId != null) {
      itemsToStore.push(['@current_shop_id', String(shopId)]);
    }
  } else if (shopMode && hasShopMemberships) {
    const shopId = shop_memberships[0]?.shop_id ?? shop_memberships[0]?.shopId;
    if (shopId != null) {
      itemsToStore.push(['@current_shop_id', String(shopId)]);
    }
  } else {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SHOP_PROFILES,
      STORAGE_KEYS.SHOP_MEMBERSHIPS,
      STORAGE_KEYS.CURRENT_SHOP_ID,
    ]);
  }
  if (shopMode && hasShopMemberships) {
    itemsToStore.push(['@shop_memberships', JSON.stringify(shop_memberships)]);
  }

  const orgMemberships = Array.isArray(organization_memberships) ? organization_memberships : [];
  await writeOrganizationMemberships(orgMemberships);

  await AsyncStorage.multiSet(itemsToStore);
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

// ✅ Refresh authenticated session flags (email_verified, etc.)
export const fetchAuthSession = async (accessToken) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/users/session/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
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