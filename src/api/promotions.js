import { API_BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getPromotions(token) {
  const response = await fetch(`${API_BASE_URL}/api/promotions/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch promotions');
  return await response.json();
}

export async function createPromotion(token, payload) {
  const shopId = await AsyncStorage.getItem('@current_shop_id');
  if (!shopId) {
    throw new Error('No current shop selected. Please choose a shop.');
  }
  payload.shop_profile_id = parseInt(shopId);

  const response = await fetch(`${API_BASE_URL}/api/promotions/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to create promotion');
  }

  return await response.json();
}

export async function bookPromotion(token, promotionId, vehicleId) {
  const url = `${API_BASE_URL}/api/promotions/${promotionId}/book/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vehicle_id : vehicleId }),
  });

  if (!response.ok) {
    let err = await response.json();
    throw new Error(err.detail || 'Booking promotion failed');
  }

  return await response.json();
}

export async function unbookPromotion(token, promotionId, vehicleId) {
  const url = `${API_BASE_URL}/api/promotions/${promotionId}/unbook/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vehicle_id: vehicleId }),
  });

  if (!response.ok) {
    let err = await response.json();
    throw new Error(err.detail || 'Unbooking promotion failed');
  }

  return await response.json();
}

export async function markPromotionSeen(token, promotionId) {
  const response = await fetch(`${API_BASE_URL}/api/promotions/${promotionId}/mark_seen/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to mark promotion as seen');
  }

  return await response.json();
}

export async function deletePromotion(token, promotionId) {
  const response = await fetch(`${API_BASE_URL}/api/promotions/${promotionId}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Delete promotion failed');
  }
}

export async function getPromotionBookings(token, promotionId) {
  const response = await fetch(`${API_BASE_URL}/api/promotions/${promotionId}/bookings/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch promotion bookings');
  }

  return await response.json(); // expected shape: { booked_vehicle_ids: [...] }
}