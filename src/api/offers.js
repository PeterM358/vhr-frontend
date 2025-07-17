// src/api/offers.js
import { API_BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getPromotions(token) {
  const response = await fetch(`${API_BASE_URL}/api/offers/?is_promotion=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch promotions');
  return await response.json();
}

export async function bookOffer(token, offerId, vehicleId) {
  console.log("📣 bookOffer called with:", { offerId, vehicleId });
  const url = `${API_BASE_URL}/api/offers/${offerId}/book/`;
  console.log("📣 URL:", url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vehicle: vehicleId }),
  });

  if (!response.ok) {
    let err;
    try {
      err = await response.json();
    } catch (e) {
      console.error("❌ Failed to parse error JSON:", e);
      throw new Error('Booking failed');
    }
    throw new Error(err.detail || 'Booking failed');
  }

  return await response.json();
}

export async function unbookOffer(token, offerId) {
  const url = `${API_BASE_URL}/api/offers/${offerId}/unbook/`;
  console.log("📣 unbookOffer URL:", url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let err;
    try {
      err = await response.json();
    } catch (e) {
      console.error("❌ Failed to parse error JSON:", e);
      throw new Error('Unbooking failed');
    }
    throw new Error(err.detail || 'Unbooking failed');
  }

  return await response.json();
}

export async function getOffersForRepair(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/offers/?repair=${encodeURIComponent(repairId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to fetch offers for repair');
  return await response.json();
}

// Update an existing offer (for shop users)
export async function updateOffer(token, offerId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to update offer');
  }

  return await response.json();
}

export async function deleteOffer(token, offerId) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/delete/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Delete failed');
  }
}

export async function getMyOffers(token) {
  const shopId = await AsyncStorage.getItem('@current_shop_id');

  if (!shopId) {
    console.error('No current shop selected in AsyncStorage');
    throw new Error('No current shop selected. Please choose a shop.');
  }

  const response = await fetch(`${API_BASE_URL}/api/offers/?shop=${shopId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const err = await response.json();
      errorDetail = JSON.stringify(err);
    } catch (e) {
      errorDetail = await response.text();
    }
    console.error(`getMyOffers error: ${response.status} - ${errorDetail}`);
    throw new Error(errorDetail || 'Failed to fetch offers');
  }

  return await response.json();
}


export async function createOffer(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/offers/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to create offer');
  }

  return await response.json();
}

export async function getOfferMessages(token, offerId) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/messages/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch offer messages');
  return await response.json();
}

export async function sendOfferMessage(token, offerId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/messages/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let err = await response.json();
    throw new Error(err.detail || 'Failed to send message');
  }
  return await response.json();
}