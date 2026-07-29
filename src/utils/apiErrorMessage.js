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

/** Strip DRF override hints; keep the human conflict sentence. */
function cleanOverlapFieldMessage(text) {
  return String(text || '')
    .replace(/\s*Confirm override with allow_vehicle_overlap=true if intentional\.?/gi, '')
    .replace(/\s*Confirm override with allow_assignee_overlap=true if intentional\.?/gi, '')
    .trim();
}

/** True for empty / HTTP status-only messages like "Bad Request". */
export function isGenericHttpStatusMessage(msg) {
  const s = String(msg || '').trim();
  if (!s) return true;
  return /^(bad request|unauthorized|forbidden|not found|internal server error|request failed with status code \d+)$/i.test(
    s,
  );
}

export function formatDrfErrorMessage(parsed, fallback = 'Request failed') {
  if (typeof parsed === 'string') {
    const cleaned = cleanOverlapFieldMessage(parsed);
    return isGenericHttpStatusMessage(cleaned) ? fallback : cleaned;
  }
  if (parsed?.detail) {
    const detail = cleanOverlapFieldMessage(parsed.detail);
    if (isGenericHttpStatusMessage(detail)) return fallback;
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
          const text = cleanOverlapFieldMessage(v);
          if (!text || isGenericHttpStatusMessage(text)) return '';
          if (key === 'non_field_errors') return text;
          if (key === 'vehicle_ids' || key === 'assignee_user_ids' || key === 'assignee') {
            return text;
          }
          if (text.toLowerCase().includes('this field is required')) {
            return `${label} is required.`;
          }
          return `${label}: ${text}`;
        }).filter(Boolean);
      }
      if (typeof val === 'string') {
        const text = cleanOverlapFieldMessage(val);
        if (!text || isGenericHttpStatusMessage(text)) return [];
        if (text.toLowerCase().includes('this field is required')) {
          return [`${label} is required.`];
        }
        if (key === 'vehicle_ids' || key === 'assignee_user_ids' || key === 'assignee') {
          return [text];
        }
        return [`${label}: ${text}`];
      }
      return [];
    });
    if (parts.length) return parts.join('\n');
  }
  return fallback;
}

/** License plates (or #id) from vehicle_overlap_conflicts payload. */
export function platesFromVehicleOverlapConflicts(conflicts) {
  const rows = Array.isArray(conflicts) ? conflicts : [];
  const plates = [
    ...new Set(
      rows.map((c) => {
        const plate = String(c?.license_plate || '').trim();
        if (plate) return plate;
        const id = c?.vehicle_id;
        return id != null && id !== '' ? `#${id}` : '';
      }).filter(Boolean),
    ),
  ];
  return plates.sort();
}

/** Map of field → first error string from a DRF validation body. */
export function extractDrfFieldErrors(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out = {};
  Object.entries(parsed).forEach(([key, val]) => {
    if (key === 'vehicle_overlap_conflicts' || key === 'assignee_overlap_conflicts' || key === 'detail' || key === 'code') return;
    if (Array.isArray(val) && val.length) {
      const first = val.find((v) => typeof v === 'string' || typeof v === 'number');
      if (first != null) out[key] = cleanOverlapFieldMessage(String(first));
      return;
    }
    if (typeof val === 'string') out[key] = cleanOverlapFieldMessage(val);
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
  const formatted = formatDrfErrorMessage(parsed, fallback);
  if (!error.message || isGenericHttpStatusMessage(error.message)) {
    error.message = formatted;
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
  if (!msg || isGenericHttpStatusMessage(msg)) return fallback;
  if (msg.startsWith('<!DOCTYPE') || msg.startsWith('<html')) {
    return extractHtmlExceptionMessage(msg) || fallback;
  }
  return msg;
}
