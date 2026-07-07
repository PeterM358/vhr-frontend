import { API_BASE_URL } from './config';
import { formatDrfErrorMessage, messageFromApiResponseText } from '../utils/apiErrorMessage';
import { safeWarn } from '../utils/logger';

const repairsListCache = {
  key: null,
  data: null,
  fetchedAt: 0,
};
const REPAIRS_LIST_CACHE_TTL_MS = 60_000;

export function invalidateRepairsListCache() {
  repairsListCache.key = null;
  repairsListCache.data = null;
  repairsListCache.fetchedAt = 0;
}

async function throwApiError(response, fallback) {
  const errorText = await response.text();
  let message = fallback;
  try {
    message = formatDrfErrorMessage(JSON.parse(errorText), fallback);
  } catch {
    message = messageFromApiResponseText(errorText, fallback);
  }
  const error = new Error(message);
  error.status = response.status;
  error.responseText = errorText;
  throw error;
}

/**
 * List repairs with server-side filters.
 * @param {string} token
 * @param {string|{ status?: string, q?: string, makeId?: number, modelId?: number, vehicleYear?: number }} filtersOrStatus
 * @param {{ force?: boolean }} [options]
 */
export async function getRepairs(token, filtersOrStatus = null, options = {}) {
  const filters =
    typeof filtersOrStatus === 'string'
      ? { status: filtersOrStatus }
      : filtersOrStatus && typeof filtersOrStatus === 'object'
        ? filtersOrStatus
        : {};

  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', String(filters.q).trim());
  if (filters.makeId != null && filters.makeId !== '') {
    params.set('make_id', String(filters.makeId));
  }
  if (filters.modelId != null && filters.modelId !== '') {
    params.set('model_id', String(filters.modelId));
  }
  if (filters.vehicleYear != null && String(filters.vehicleYear).trim() !== '') {
    params.set('vehicle_year', String(filters.vehicleYear).trim());
  }
  if (filters.repairTypeId != null && filters.repairTypeId !== '') {
    params.set('repair_type_id', String(filters.repairTypeId));
  }
  if (filters.serviceYear != null && String(filters.serviceYear).trim() !== '') {
    params.set('service_year', String(filters.serviceYear).trim());
  }
  if (filters.clientId != null && filters.clientId !== '') {
    params.set('client_id', String(filters.clientId));
  }
  if (filters.paymentStatus != null && String(filters.paymentStatus).trim() !== '') {
    params.set('payment_status', String(filters.paymentStatus).trim());
  }
  if (filters.uninvoiced === true || String(filters.uninvoiced || '').toLowerCase() === 'true') {
    params.set('uninvoiced', 'true');
  }
  if (filters.shop_profile_id != null && String(filters.shop_profile_id).trim() !== '') {
    params.set('shop_profile_id', String(filters.shop_profile_id).trim());
  }

  const qs = params.toString();
  const cacheKey = qs || '__all__';
  const now = Date.now();
  if (
    !options.force &&
    repairsListCache.key === cacheKey &&
    repairsListCache.data &&
    now - repairsListCache.fetchedAt < REPAIRS_LIST_CACHE_TTL_MS
  ) {
    return repairsListCache.data;
  }

  const url = `${API_BASE_URL}/api/repairs/repair/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch repairs');
  const data = await response.json();
  repairsListCache.key = cacheKey;
  repairsListCache.data = data;
  repairsListCache.fetchedAt = now;
  return data;
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
    await throwApiError(response, 'Failed to create repair');
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
  if (!res.ok) {
    await throwApiError(res, 'Failed to update repair');
  }
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

export async function requestOwnerLoggedRepairConfirmation(token, repairId) {
  const res = await fetch(`${API_BASE_URL}/api/repairs/${repairId}/confirmation/request/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error('Failed to request service-center confirmation');
    error.status = res.status;
    error.responseText = errorText;
    throw error;
  }
  return res.json();
}

export async function respondOwnerLoggedRepairConfirmation(token, repairId, data) {
  const res = await fetch(`${API_BASE_URL}/api/repairs/${repairId}/confirmation/respond/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) {
    const errorText = await res.text();
    const error = new Error('Failed to respond to service-record confirmation');
    error.status = res.status;
    error.responseText = errorText;
    throw error;
  }
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

/**
 * Upload a photo or video for a repair (multipart).
 * @param {{ uri: string, mediaType: 'image' | 'video', fileName: string, mimeType: string }} mediaItem
 */
export async function uploadRepairMedia(token, repairId, mediaItem) {
  const formData = new FormData();
  formData.append('media_type', mediaItem.mediaType);
  formData.append('file', {
    uri: mediaItem.uri,
    name: mediaItem.fileName,
    type: mediaItem.mimeType,
  });
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/media/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    safeWarn('Media upload failed', `repair ${repairId}, HTTP ${response.status}`);
    throw new Error('Failed to upload media');
  }
  return response.json();
}

export async function getShopCalendar(token, { from, to, shopId, badgeOnly } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (shopId != null && shopId !== '') params.set('shop_id', String(shopId));
  if (badgeOnly) params.set('badge_only', '1');
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/repairs/shop-calendar/${qs ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    await throwApiError(response, 'Could not load shop calendar');
  }
  return response.json();
}

export async function declineDirectRepairRequest(token, repairId, { note } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/schedule/decline/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: note || '' }),
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not decline request');
  }
  return response.json();
}

export async function cancelScheduledAppointment(token, repairId, { note } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/schedule/cancel/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ note: note || '' }),
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not cancel appointment');
  }
  return response.json();
}

export async function dismissRepairFromScheduleQueue(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/schedule/dismiss/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not dismiss from queue');
  }
  return response.json();
}

export async function proposeRepairSchedule(token, repairId, { scheduledStart, scheduledEnd, note } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/schedule/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      note: note || '',
    }),
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not update schedule');
  }
  return response.json();
}

export async function respondRepairReschedule(token, repairId, { proposalId, action, note } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/reschedule/respond/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      proposal_id: proposalId,
      action,
      note: note || '',
    }),
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not respond to reschedule');
  }
  return response.json();
}

export async function counterRepairReschedule(token, repairId, { scheduledStart, scheduledEnd, note } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/reschedule/counter/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      note: note || '',
    }),
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not suggest a new time');
  }
  return response.json();
}

export async function shopRespondRepairReschedule(token, repairId, { proposalId, action, note } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/reschedule/shop-respond/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      proposal_id: proposalId,
      action,
      note: note || '',
    }),
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not respond to reschedule');
  }
  return response.json();
}

export async function shopConfirmVehicleArrival(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/arrival/shop/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not confirm arrival');
  }
  return response.json();
}

export async function clientReportVehicleArrival(token, repairId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/arrival/client/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    await throwApiError(response, 'Could not check in');
  }
  return response.json();
}

export async function getRelatedServiceHistory(token, repairId) {
  const response = await fetch(
    `${API_BASE_URL}/api/repairs/repair/${repairId}/related-service-history/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    await throwApiError(response, 'Could not load service history');
  }
  return response.json();
}

export async function deleteRepairMedia(token, repairId, mediaId) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/repair/${repairId}/media/${mediaId}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    safeWarn('Media delete failed', `repair ${repairId}, HTTP ${response.status}`);
    throw new Error('Failed to delete media');
  }
  return true;
}