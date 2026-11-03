/**
 * Stable JSON snapshot of client profile fields saved via updateClientProfile.
 */
export function buildClientProfileSaveSnapshot({
  profile,
  phoneE164,
  contactPreference,
}) {
  if (!profile) return null;

  return JSON.stringify({
    country: profile.country ?? null,
    city: profile.city ?? null,
    phone: phoneE164 || '',
    contactPreference: contactPreference || 'phone',
    email_notifications_enabled: profile.email_notifications_enabled !== false,
    push_notifications_enabled: profile.push_notifications_enabled !== false,
  });
}
