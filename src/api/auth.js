// src/api/auth.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';  // Base URL for your API

// ✅ Updated register function
export const register = async (emailOrPhone, password, isClient, isShop) => {
  try {
    // Decide if it's phone or email
    let registerData, loginData;

    if (emailOrPhone.trim().startsWith('+')) {
      registerData = {
        phone: emailOrPhone.trim(),
        password,
        is_client: isClient,
        is_shop: isShop,
      };
      loginData = {
        phone: emailOrPhone.trim(),
        password,
      };
    } else {
      registerData = {
        email: emailOrPhone.trim(),
        password,
        is_client: isClient,
        is_shop: isShop,
      };
      loginData = {
        email: emailOrPhone.trim(),
        password,
      };
    }

    // Step 1: Register the user
    await axios.post(`${API_BASE_URL}api/users/register/`, registerData);

    // Step 2: Log in immediately
    const loginResponse = await axios.post(`${API_BASE_URL}api/token/`, loginData);

    const { access, refresh, is_client, is_shop } = loginResponse.data;

    // Step 3: Save tokens and user role
    await AsyncStorage.multiSet([
      ['@access_token', access],
      ['@refresh_token', refresh],
      ['@is_client', JSON.stringify(is_client)],
      ['@is_shop', JSON.stringify(is_shop)],
      ['@user_email_or_phone', emailOrPhone.trim()],
    ]);

    return true;
  } catch (error) {
    console.error('Registration or login failed:', error.response?.data || error.message);
    throw new Error('Registration or login failed.');
  }
};




// Login function (already implemented)
export const login = async (emailOrPhone, password) => {
  try {
    // Determine if input is phone (starts with '+')
    let body;
    if (emailOrPhone.trim().startsWith('+')) {
      body = { phone: emailOrPhone.trim(), password };
    } else {
      body = { email: emailOrPhone.trim(), password };
    }

    const response = await axios.post(`${API_BASE_URL}api/token/`, body);

    const { access, refresh, is_client, is_shop, user_id } = response.data;

    await AsyncStorage.multiSet([
      ['@access_token', access],
      ['@refresh_token', refresh],
      ['@is_client', JSON.stringify(is_client)],
      ['@is_shop', JSON.stringify(is_shop)],
      ['@user_id', user_id.toString()],
      ['@user_email_or_phone', emailOrPhone.trim()],
    ]);

    return response.data;
  } catch (error) {
    throw new Error('Login failed. Please check your credentials.');
  }
};

// Example of an authenticated API call
export const getVehicles = async () => {
  const token = await AsyncStorage.getItem('@access_token');
  if (!token) {
    throw new Error('No token found');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}api/vehicles/`, {
      headers: {
        Authorization: `Bearer ${token}`, // Attach the token as an Authorization header
      },
    });
    return response.data; // Vehicles data
  } catch (error) {
    throw new Error('Failed to fetch vehicles');
  }
};

// Logout function
export const logout = async (navigation) => {
  await AsyncStorage.clear();
  navigation.reset({
    index: 0,
    routes: [{ name: 'Home' }],
  });
};
