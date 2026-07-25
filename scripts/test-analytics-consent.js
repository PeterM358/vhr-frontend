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
    version: CONSENT_POLICY_VERSION,
    decidedAt: partial.decidedAt || new Date().toISOString(),
  };
}

function hasAnalyticsConsent(state) {
  if (state === CONSENT_ACCEPTED) return true;
  if (state === CONSENT_REJECTED) return false;
  return Boolean(state?.analytics);
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

  const accepted = buildConsentState({ analytics: true, marketing: false });
  assert.strictEqual(accepted.version, CONSENT_POLICY_VERSION);
  assert.strictEqual(hasAnalyticsConsent(accepted), true);
  assert.strictEqual(hasAnalyticsConsent(CONSENT_ACCEPTED), true);
  assert.strictEqual(analyticsWouldInit(accepted, env), true, 'accept must allow GA4');

  assert.strictEqual(analyticsWouldInit(null, env), false, 'undecided must block GA4');

  const revoked = buildConsentState({ analytics: false, marketing: false });
  assert.strictEqual(analyticsWouldInit(revoked, env), false, 'revoke must stop future tracking');

  const disabledEnv = { ...env, EXPO_PUBLIC_ENABLE_ANALYTICS: 'false' };
  assert.strictEqual(analyticsWouldInit(accepted, disabledEnv), false, 'flag off must block GA4');

  console.log('analytics consent tests: OK');
}

main();
