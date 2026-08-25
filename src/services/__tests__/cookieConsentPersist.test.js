/**
 * @jest-environment jsdom
 */
import {
  CONSENT_POLICY_VERSION,
  buildConsentState,
  isConsentCurrent,
  needsConsentPrompt,
  loadConsentState,
  setCookieConsent,
  CONSENT_ACCEPTED,
} from '../cookieConsent';

describe('cookie consent persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
    });
  });

  test('accept persists and does not re-prompt', async () => {
    await setCookieConsent(CONSENT_ACCEPTED);
    const state = await loadConsentState();
    expect(isConsentCurrent(state)).toBe(true);
    expect(needsConsentPrompt(state)).toBe(false);
    expect(state.analytics).toBe(true);
    expect(state.version).toBe(CONSENT_POLICY_VERSION);
  });

  test('cookie mirror restores when localStorage empty', async () => {
    await setCookieConsent(CONSENT_ACCEPTED);
    window.localStorage.clear();
    const state = await loadConsentState();
    expect(isConsentCurrent(state)).toBe(true);
    expect(state.analytics).toBe(true);
  });

  test('outdated version re-prompts', () => {
    const stale = buildConsentState({ analytics: true, version: 0 });
    expect(needsConsentPrompt(stale)).toBe(true);
  });
});
