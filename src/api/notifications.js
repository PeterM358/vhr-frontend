// PATH: src/api/notifications.js
import { API_BASE_URL } from './config';

export async function getNotifications(token) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to fetch notifications');

  return await response.json();
}

export async function markNotificationRead(token, id) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_read: true }),
  });

  if (!response.ok) throw new Error('Failed to mark as read');

  return await response.json();
}