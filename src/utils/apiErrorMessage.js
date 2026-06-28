/** Extract a user-facing message from API error bodies (JSON or Django HTML debug pages). */

const FIELD_LABELS = {
  vehicle: 'Vehicle',
  repair_type: 'Service type',
  description: 'Description',
  symptoms: 'Symptoms',
  client: 'Account',
  kilometers: 'Kilometers',
  source: 'Source',
  client_preferred_start: 'Preferred visit start',
  client_preferred_end: 'Preferred visit end',
  preferred_service_centers: 'Service centers',
  non_field_errors: 'Request',
};

function labelForField(key) {
  if (key === 'non_field_errors') return FIELD_LABELS.non_field_errors;
  return FIELD_LABELS[key] || key.replace(/_/g, ' ');
}

function extractHtmlExceptionMessage(html) {
  const text = String(html || '');
  const preMatch = text.match(/<pre class="exception_value">([^<]+)<\/pre>/i);
  if (preMatch?.[1]) {
    return preMatch[1].trim();
  }
  const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].trim();
    if (!/^<!DOCTYPE/i.test(title)) return title.replace(/\s+at\s+\/.*$/, '').trim();
  }
  return null;
}

export function formatDrfErrorMessage(parsed, fallback = 'Request failed') {
  if (typeof parsed === 'string') return parsed;
  if (parsed?.detail) return String(parsed.detail);
  if (Array.isArray(parsed) && parsed.length) return String(parsed[0]);
  if (typeof parsed === 'object' && parsed !== null) {
    const parts = Object.entries(parsed).flatMap(([key, val]) => {
      if (key === 'mileage_requires_odometer_photo') return [];
      const label = labelForField(key);
      if (Array.isArray(val)) {
        return val.map((v) => {
          const text = String(v);
          if (key === 'non_field_errors') return text;
          if (text.toLowerCase().includes('this field is required')) {
            return `${label} is required.`;
          }
          return `${label}: ${text}`;
        });
      }
      if (typeof val === 'string') {
        if (val.toLowerCase().includes('this field is required')) {
          return [`${label} is required.`];
        }
        return [`${label}: ${val}`];
      }
      return [];
    });
    if (parts.length) return parts.join('\n');
  }
  return fallback;
}

export function messageFromApiResponseText(rawText, fallback = 'Request failed') {
  const raw = String(rawText || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) {
    return extractHtmlExceptionMessage(raw) || fallback;
  }
  try {
    return formatDrfErrorMessage(JSON.parse(raw), fallback);
  } catch {
    return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
  }
}

export function messageFromApiError(error, fallback = 'Request failed.') {
  const fromBody = messageFromApiResponseText(error?.responseText, '');
  if (fromBody) return fromBody;
  const msg = String(error?.message || '').trim();
  if (!msg) return fallback;
  if (msg.startsWith('<!DOCTYPE') || msg.startsWith('<html')) {
    return extractHtmlExceptionMessage(msg) || fallback;
  }
  return msg;
}
