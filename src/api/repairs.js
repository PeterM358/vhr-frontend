// api/repairs.js
import { API_BASE_URL } from './config';

export async function getRepairs(token, status = null) {
  let url = `${API_BASE_URL}/api/repairs/`;
  if (status) {
    url += `?status=${status}`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch repairs');
  }

  return await response.json();
}

export async function getRepairById(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/${repairId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch repair');
  return await response.json();
}

export async function submitOfferForRepair(token, offerData) {
  const response = await fetch(`http://127.0.0.1:8000/api/offers/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(offerData),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to submit offer');
  }

  return await response.json();
}

export async function deleteOffer(token, offerId) {
  const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to delete offer');
  }

  return true;
}


// PATCH /api/repairs/<id>/
export async function updateRepair(token, repairId, data) {
  const res = await fetch(`${API_BASE_URL}/api/repairs/${repairId}/`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to update repair');
  }
  return res.json();
}

// POST /api/repairs/<id>/confirm/
export async function confirmRepair(token, repairId, data) {
  const res = await fetch(`${API_BASE_URL}/api/repairs/${repairId}/confirm/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to confirm repair');
  }
  return res.json();
}