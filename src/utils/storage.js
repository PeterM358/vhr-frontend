import { AsyncStorage } from 'react-native';

// Store the token
export const storeToken = async (token) => {
  try {
    await AsyncStorage.setItem('access_token', token);
  } catch (e) {
    console.error('Failed to save the token', e);
  }
};

// Retrieve the token
export const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    return token;
  } catch (e) {
    console.error('Failed to load the token', e);
  }
};

// Clear the token
export const clearToken = async () => {
  try {
    await AsyncStorage.removeItem('access_token');
  } catch (e) {
    console.error('Failed to clear the token', e);
  }
};
