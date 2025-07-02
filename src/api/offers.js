// src/api/offers.js
import { API_BASE_URL } from './config';

export async function getPromotions(token) {
  const response = await fetch(`${API_BASE_URL}/api/offers/?is_promotion=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch promotions');
  return await response.json();
}

export async function bookPromotion(token, offerId, vehicleId) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/book/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vehicle: vehicleId }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Booking failed');
  }

  return await response.json();
}


export async function unbookPromotion(token, offerId, vehicleId) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/unbook/${vehicleId}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Unbooking failed');
  }

  return true;
}

export async function getOffersForRepair(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/offers/repair/${repairId}/`, {
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
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Delete failed');
  }
}
