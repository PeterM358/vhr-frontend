/**
 * Strip likely PII from free-text discovery search queries before analytics.
 * Anonymous search intelligence only — never persist identifiers.
 */

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/g;
const VIN_RE = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;
/** Common BG / EU plate shapes — conservative to avoid stripping city names. */
const PLATE_RE = /\b[A-Z]{1,2}\s?\d{4}\s?[A-Z]{2,3}\b/gi;

const MAX_QUERY_LENGTH = 200;

function redactMatches(value, pattern, replacement = '[redacted]') {
  return String(value || '').replace(pattern, replacement);
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export function sanitizeSearchQuery(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;

  let sanitized = trimmed;
  sanitized = redactMatches(sanitized, EMAIL_RE);
  sanitized = redactMatches(sanitized, PHONE_RE);
  sanitized = redactMatches(sanitized, VIN_RE);
  sanitized = redactMatches(sanitized, PLATE_RE);
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  if (!sanitized || sanitized === '[redacted]') return null;
  if (sanitized.length > MAX_QUERY_LENGTH) {
    return sanitized.slice(0, MAX_QUERY_LENGTH);
  }
  return sanitized;
}
