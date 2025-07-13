// PATH: /api/repairs.js

import { API_BASE_URL } from './config';

// ✅ Get all repairs
export async function getRepairs(token, status = null) {
  let url = `${API_BASE_URL}/api/repairs/repair/`;
  if (status) url += `?status=${status}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch repairs');
  return await response.json();
}

// ✅ Create a new repair
export async function createRepair(token, data) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(errorText);
    throw new Error('Failed to create repair');
  }
  return await response.json();
}

// ✅ Get single repair by ID
export async function getRepairById(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch repair');
  return await response.json();
}

// ✅ Update repair (PATCH)
export async function updateRepair(token, repairId, data) {
  const res = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update repair');
  return res.json();
}

// ✅ Confirm repair
export async function confirmRepair(token, repairId, data) {
  const res = await fetch(`${API_BASE_URL}/api/repairs/${repairId}/confirm/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to confirm repair');
  return res.json();
}

// ✅ Get all RepairParts for a repair
export async function getRepairParts(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/parts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch repair parts');
  return await response.json();
}

// ✅ Add a new RepairPart to a repair
export async function addRepairPart(token, repairId, data) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/parts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to add repair part');
  return await response.json();
}

// ✅ Delete a RepairPart from a repair
export async function deleteRepairPart(token, repairId, repairPartId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/parts/${repairPartId}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to delete repair part');
  return true;
}

// ✅ Update a RepairPart
export async function updateRepairPart(token, repairId, repairPartId, data) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/parts/${repairPartId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update repair part');
  return await response.json();
}