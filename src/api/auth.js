import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../env';
import { getFirebaseToken } from '../notifications/firebaseMessaging';
import { sendFirebaseTokenToBackend } from './notifications';

const normalizeLoginPhone = (value) => {
  if (!value) return '';
  const trimmed = value.trim().replace(/\s+/g, '').replace(/-/g, '');
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;
  return trimmed;
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
export const register = async (emailOrPhone, password, isClient, isShop) => {
  try {
    let registerData;
    const raw = (emailOrPhone || '').trim();
    const loginData = buildLoginIdentifierBody(raw, password);

    if (raw.includes('@')) {
      registerData = { email: raw.toLowerCase(), password, is_client: isClient, is_shop: isShop };
    } else {
      registerData = { phone: normalizeLoginPhone(raw), password, is_client: isClient, is_shop: isShop };
    }

    await axios.post(`${API_BASE_URL}/api/users/register/`, registerData);

    const loginResponse = await axios.post(`${API_BASE_URL}/api/token/`, loginData);

    await storeLoginData(loginResponse.data, emailOrPhone.trim());

    return true;
  } catch (error) {
    console.error('❌ Registration/Login error:', error.response?.data || error.message);
    throw new Error('Registration or login failed.');
  }
};

// ✅ Login
export const login = async (emailOrPhone, password) => {
  try {
    const body = buildLoginIdentifierBody(emailOrPhone, password);

    console.log('🟢 Logging in with:', body);

    const response = await axios.post(`${API_BASE_URL}/api/token/`, body);
    console.log('🟢 Login response received:', response.data);

    await storeLoginData(response.data, emailOrPhone.trim());

    // Retrieve token from AsyncStorage after it's saved
    const access = await AsyncStorage.getItem('@access_token');
    const userId = response.data.user_id;
    const isShop = response.data.is_shop;
    const shopProfiles = response.data.shop_profiles;

    const fcmToken = await getFirebaseToken();
    console.log('📲 FCM Token:', fcmToken);
    console.log('🔐 Retrieved access token:', access);

    if (fcmToken && access) {
      const shopProfileId = isShop && Array.isArray(shopProfiles) && shopProfiles.length > 0 ? shopProfiles[0].id : null;
      await sendFirebaseTokenToBackend(fcmToken, userId, shopProfileId, access);
    }

    return response.data;
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    throw new Error('Login failed. Please check your credentials.');
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
    shop_profiles
  } = data;

  let userDisplay = '';
  if (email && email.trim()) userDisplay = email.trim();
  else if (phone && phone.trim()) userDisplay = phone.trim();
  else userDisplay = fallbackDisplay;

  console.log('✅ Storing user_display:', userDisplay);

  const itemsToStore = [
    ['@access_token', access],
    ['@refresh_token', refresh],
    ['@is_client', JSON.stringify(is_client)],
    ['@is_shop', JSON.stringify(is_shop)],
    ['@user_id', user_id?.toString() || ''],
    ['@user_email_or_phone', userDisplay],
  ];

  // Only for shops with valid shop_profiles
  if (is_shop && Array.isArray(shop_profiles) && shop_profiles.length > 0) {
    itemsToStore.push(['@shop_profiles', JSON.stringify(shop_profiles)]);
  }

  await AsyncStorage.multiSet(itemsToStore);
  console.log('✅ Tokens saved to AsyncStorage');
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
  console.log('🟠 Logging out, clearing AsyncStorage...');
  await AsyncStorage.clear();

  if (setAuthToken) setAuthToken(null);
  if (setIsAuthenticated) setIsAuthenticated(false);
  if (setUserEmailOrPhone) setUserEmailOrPhone('');

  navigation.reset({
    index: 0,
    routes: [{ name: 'PublicHome' }],
  });
};

// ✅ Request Password Reset (send email)
export const requestPasswordReset = async (email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/password/reset/`, {
      email,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Password reset request failed:', error.response?.data || error.message);
    throw new Error('Failed to send password reset email.');
  }
};

// ✅ Confirm Password Reset (set new password)
export const confirmPasswordReset = async (uid, token, newPassword) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/users/password/confirm/`, {
      uid,
      token,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Password reset confirm failed:', error.response?.data || error.message);
    throw new Error('Failed to reset password.');
  }
};

export const googleLogin = async (idToken) => {
  const response = await axios.post('/users/google-login/', {
    id_token: idToken,
  });

  await storeLoginData(response.data, response.data.email);
  return response.data;
};