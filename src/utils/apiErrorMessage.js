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
  if (parsed?.detail) {
    const detail = String(parsed.detail);
    return parsed.code ? `${detail} (${parsed.code})` : detail;
  }
  if (Array.isArray(parsed) && parsed.length) return String(parsed[0]);
  if (typeof parsed === 'object' && parsed !== null) {
    const parts = Object.entries(parsed).flatMap(([key, val]) => {
      if (key === 'mileage_requires_odometer_photo') return [];
      if (key === 'vehicle_overlap_conflicts') return [];
      if (key === 'assignee_overlap_conflicts') return [];
      const label = labelForField(key);
      if (Array.isArray(val)) {
        return val.map((v) => {
          if (v && typeof v === 'object' && !Array.isArray(v)) return '';
          const text = String(v);
          if (key === 'non_field_errors') return text;
          if (text.toLowerCase().includes('this field is required')) {
            return `${label} is required.`;
          }
          return `${label}: ${text}`;
        }).filter(Boolean);
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

/** Map of field → first error string from a DRF validation body. */
export function extractDrfFieldErrors(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out = {};
  Object.entries(parsed).forEach(([key, val]) => {
    if (key === 'vehicle_overlap_conflicts' || key === 'assignee_overlap_conflicts' || key === 'detail' || key === 'code') return;
    if (Array.isArray(val) && val.length) {
      const first = val.find((v) => typeof v === 'string' || typeof v === 'number');
      if (first != null) out[key] = String(first);
      return;
    }
    if (typeof val === 'string') out[key] = val;
  });
  return out;
}

export function messageFromApiResponseText(rawText, fallback = 'Request failed') {
  const raw = String(rawText || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')) {
    return extractHtmlExceptionMessage(raw) || fallback;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.code === 'fleet_import_unavailable') {
      return parsed.detail || fallback;
    }
    return formatDrfErrorMessage(parsed, fallback);
  } catch {
    if (raw.length > 280) return fallback;
    return raw;
  }
}

export function enrichApiError(error, parsed, fallback) {
  if (!error) return error;
  if (parsed && typeof parsed === 'object') {
    error.fieldErrors = extractDrfFieldErrors(parsed);
    if (parsed.vehicle_overlap_conflicts) {
      error.vehicleOverlapConflicts = parsed.vehicle_overlap_conflicts;
    }
    if (parsed.assignee_overlap_conflicts) {
      error.assigneeOverlapConflicts = parsed.assignee_overlap_conflicts;
    }
    if (parsed.code) error.code = parsed.code;
  }
  if (!error.message) {
    error.message = formatDrfErrorMessage(parsed, fallback);
  }
  return error;
}

/** Map fleet upload HTTP status + parsed body to a friendly localized message. */
export function fleetUploadErrorMessage({ status, bodyText, locale = 'en', fallback }) {
  const isBg = String(locale || '').startsWith('bg');
  const parsedText = messageFromApiResponseText(bodyText, '');
  if (parsedText && !parsedText.startsWith('<!')) {
    return parsedText;
  }
  if (status === 503 || status >= 500) {
    return isBg
      ? 'Качването е временно недостъпно. Системата може да се актуализира — опитайте отново след малко.'
      : 'Upload is temporarily unavailable. The system may be updating — try again shortly.';
  }
  return fallback;
}

export function messageFromApiError(error, fallback = 'Request failed.') {
  const axiosData = error?.response?.data;
  if (axiosData != null) {
    const fromAxios = formatDrfErrorMessage(axiosData, '');
    if (fromAxios) return fromAxios;
  }
  const fromBody = messageFromApiResponseText(error?.responseText, '');
  if (fromBody) return fromBody;
  const msg = String(error?.message || '').trim();
  if (!msg) return fallback;
  if (msg.startsWith('<!DOCTYPE') || msg.startsWith('<html')) {
    return extractHtmlExceptionMessage(msg) || fallback;
  }
  // Axios default "Request failed with status code 400" — prefer fallback when no body parsed.
  if (/^Request failed with status code \d+$/i.test(msg)) {
    return fallback;
  }
  return msg;
}
