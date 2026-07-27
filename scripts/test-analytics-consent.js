#!/usr/bin/env node
/**
 * Cookie/analytics consent invariants (web GA4 gate).
 * Logic mirrored from src/services/cookieConsent.js and src/services/analytics.js.
 * Run: node scripts/test-analytics-consent.js
 */

const assert = require('assert');

const CONSENT_ACCEPTED = 'accepted';
const CONSENT_REJECTED = 'rejected';
const CONSENT_POLICY_VERSION = 1;

function buildConsentState(partial = {}) {
  return {
    necessary: true,
    analytics: Boolean(partial.analytics),
    marketing: Boolean(partial.marketing),
    version: Number.isFinite(Number(partial.version))
      ? Number(partial.version)
      : CONSENT_POLICY_VERSION,
    decidedAt: partial.decidedAt || new Date().toISOString(),
  };
}

function isConsentCurrent(state) {
  if (!state || typeof state !== 'object') return false;
  return Number(state.version) === CONSENT_POLICY_VERSION;
}

function needsConsentPrompt(state) {
  return !isConsentCurrent(state);
}

function hasAnalyticsConsent(state) {
  if (state === CONSENT_ACCEPTED) return true;
  if (state === CONSENT_REJECTED) return false;
  return Boolean(state?.analytics);
}

function parseStored(raw) {
  if (!raw) return null;
  if (raw === CONSENT_ACCEPTED) {
    return buildConsentState({ analytics: true, marketing: false });
  }
  if (raw === CONSENT_REJECTED) {
    return buildConsentState({ analytics: false, marketing: false });
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const versionRaw = Number(parsed.version);
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      version: Number.isFinite(versionRaw) ? versionRaw : 0,
      decidedAt: String(parsed.decidedAt || ''),
    };
  } catch {
    return null;
  }
}

function analyticsWouldInit(consent, env) {
  const enabled = env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true';
  const id = String(env.EXPO_PUBLIC_GA_MEASUREMENT_ID || '').trim();
  return enabled && id.length > 0 && hasAnalyticsConsent(consent);
}

function main() {
  const env = {
    EXPO_PUBLIC_ENABLE_ANALYTICS: 'true',
    EXPO_PUBLIC_GA_MEASUREMENT_ID: 'G-TEST123',
  };

  const rejected = buildConsentState({ analytics: false, marketing: false });
  assert.strictEqual(rejected.version, CONSENT_POLICY_VERSION);
  assert.strictEqual(hasAnalyticsConsent(rejected), false);
  assert.strictEqual(hasAnalyticsConsent(CONSENT_REJECTED), false);
  assert.strictEqual(analyticsWouldInit(rejected, env), false, 'reject must block GA4');
  assert.strictEqual(needsConsentPrompt(rejected), false, 'current reject must not re-prompt');

  const accepted = buildConsentState({ analytics: true, marketing: false });
  assert.strictEqual(accepted.version, CONSENT_POLICY_VERSION);
  assert.strictEqual(hasAnalyticsConsent(accepted), true);
  assert.strictEqual(hasAnalyticsConsent(CONSENT_ACCEPTED), true);
  assert.strictEqual(analyticsWouldInit(accepted, env), true, 'accept must allow GA4');
  assert.strictEqual(needsConsentPrompt(accepted), false, 'current accept must not re-prompt');

  assert.strictEqual(analyticsWouldInit(null, env), false, 'undecided must block GA4');
  assert.strictEqual(needsConsentPrompt(null), true, 'undecided must prompt');

  const outdated = buildConsentState({ analytics: true, version: 0 });
  assert.strictEqual(needsConsentPrompt(outdated), true, 'version bump must re-prompt');

  const legacyAccepted = parseStored(CONSENT_ACCEPTED);
  assert.strictEqual(needsConsentPrompt(legacyAccepted), false);
  assert.strictEqual(hasAnalyticsConsent(legacyAccepted), true);

  const legacyRejected = parseStored(CONSENT_REJECTED);
  assert.strictEqual(needsConsentPrompt(legacyRejected), false);
  assert.strictEqual(hasAnalyticsConsent(legacyRejected), false);

  const jsonMissingVersion = parseStored(JSON.stringify({ analytics: true }));
  assert.strictEqual(jsonMissingVersion.version, 0);
  assert.strictEqual(needsConsentPrompt(jsonMissingVersion), true);

  const revoked = buildConsentState({ analytics: false, marketing: false });
  assert.strictEqual(analyticsWouldInit(revoked, env), false, 'revoke must stop future tracking');

  const disabledEnv = { ...env, EXPO_PUBLIC_ENABLE_ANALYTICS: 'false' };
  assert.strictEqual(analyticsWouldInit(accepted, disabledEnv), false, 'flag off must block GA4');

  console.log('analytics consent tests: OK');
}

main();
