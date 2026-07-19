#!/usr/bin/env node
/**
 * Lightweight checks for partner session helpers (no RN runtime).
 */
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

function parseStoredBoolean(raw) {
  if (raw == null) return false;
  const value = String(raw).trim().toLowerCase();
  return value === 'true' || value === '"true"';
}

assert(parseStoredBoolean('true') === true, 'true string');
assert(parseStoredBoolean('"true"') === true, 'json-quoted true');
assert(parseStoredBoolean('false') === false, 'false string');
assert(parseStoredBoolean(null) === false, 'null');
assert(parseStoredBoolean('True') === true, 'case');

/** Mirror localizedRoutes.toCanonicalAppPath for dashboard roots. */
const SUPPORTED = new Set(['bg', 'en', 'de', 'it', 'fr', 'es']);
function toCanonicalAppPath(localizedPath) {
  const segments = String(localizedPath || '')
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean);
  if (!segments.length) return '/';
  const [first, ...rest] = segments;
  const body = SUPPORTED.has(first) ? rest : segments;
  if (!body.length) return '/';
  if (body[0] === 'dashboard' || body[0] === 'partner') {
    return `/${body.join('/')}`;
  }
  return null;
}

function isClientDashboardCanonical(canonicalPath) {
  const normalized = String(canonicalPath || '')
    .replace(/\/$/, '')
    .split('?')[0];
  return normalized === '/dashboard';
}

assert(toCanonicalAppPath('/en/dashboard') === '/dashboard', 'en dashboard');
assert(toCanonicalAppPath('/dashboard') === '/dashboard', 'bare dashboard');
assert(toCanonicalAppPath('/en/partner/dashboard') === '/partner/dashboard', 'en partner');
assert(isClientDashboardCanonical('/dashboard') === true, 'client dash');
assert(isClientDashboardCanonical('/partner/dashboard') === false, 'partner dash');

console.log('partner-session parse checks ok');
