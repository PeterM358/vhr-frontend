/**
 * Locale-aware notification timestamps.
 * Uses medium date style so en-US does not render ambiguous M/D/Y like 7/12/2026.
 */

function localeTag(locale) {
  const raw = String(locale || '').trim().toLowerCase();
  if (raw.startsWith('bg')) return 'bg-BG';
  if (raw.startsWith('de')) return 'de-DE';
  if (raw.startsWith('fr')) return 'fr-FR';
  if (raw.startsWith('es')) return 'es-ES';
  if (raw.startsWith('it')) return 'it-IT';
  // Prefer day-month order for English in this product (BG market + clarity).
  if (raw.startsWith('en')) return 'en-GB';
  return raw || undefined;
}

export function formatNotificationTimestamp(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(localeTag(locale), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch (_) {
    return d.toLocaleString();
  }
}
