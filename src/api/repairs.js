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

// ✅ Get or create RepairChat
export async function getOrCreateRepairChat(token, repairId, shopId = null) {
  if (!shopId) {
    // Client fetching existing chats
    const response = await fetch(`${API_BASE_URL}/api/repairs/repair-chats/?repair=${repairId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to fetch repair chats');
    return await response.json();
  }

  // Shop creating chat
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair-chats/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repair: repairId, shop: shopId }),
  });
  if (!response.ok) throw new Error('Failed to get/create chat');
  return await response.json();
}

// ✅ Get messages for a chat
export async function getRepairChatMessages(token, chatId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair-chats/${chatId}/messages/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch chat messages');
  return await response.json();
}

// ✅ Send a message in chat
export async function sendRepairChatMessage(token, chatId, data) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair-chats/${chatId}/messages/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to send chat message');
  return await response.json();
}
// ✅ Get all chats for a repair (for client side)
export async function getRepairChatsByRepairId(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair-chats/?repair=${repairId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch repair chats');
  return await response.json();
}

// ✅ Get a specific chat by ID
export async function getRepairChatById(token, chatId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair-chats/${chatId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch repair chat');
  return await response.json();
}