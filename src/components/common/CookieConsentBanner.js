import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useTranslation } from '../../i18n';
import { COLORS } from '../../constants/colors';
import {
  CONSENT_ACCEPTED,
  CONSENT_REJECTED,
  buildConsentState,
  getCookieConsent,
  loadConsentState,
  saveConsentState,
  setCookieConsent,
} from '../../services/cookieConsent';
import { initializeAnalytics } from '../../services/analytics';

/**
 * Web-only consent banner. GA4 loads only after analytics consent.
 * Reject is as easy as Accept; Manage opens preference toggles.
 */
export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let cancelled = false;
    (async () => {
      const consent = await getCookieConsent();
      if (cancelled) return;
      if (consent === CONSENT_ACCEPTED) {
        await initializeAnalytics(await loadConsentState());
        setVisible(false);
        return;
      }
      if (consent === CONSENT_REJECTED) {
        setVisible(false);
        return;
      }
      setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const accept = useCallback(async () => {
    await setCookieConsent(CONSENT_ACCEPTED);
    await initializeAnalytics(buildConsentState({ analytics: true }));
    setManaging(false);
    setVisible(false);
  }, []);

  const reject = useCallback(async () => {
    await setCookieConsent(CONSENT_REJECTED);
    setManaging(false);
    setVisible(false);
  }, []);

  const savePrefs = useCallback(async () => {
    const next = await saveConsentState({ analytics: analyticsOn, marketing: false });
    if (next.analytics) {
      await initializeAnalytics(next);
    }
    setManaging(false);
    setVisible(false);
  }, [analyticsOn]);

  if (Platform.OS !== 'web' || !visible) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityRole="dialog">
      <Text style={styles.text}>{t('cookieConsent.message')}</Text>
      {managing ? (
        <View style={styles.manageBlock}>
          <Text style={styles.hint}>{t('cookieConsent.necessaryAlways')}</Text>
          <Button
            mode={analyticsOn ? 'contained' : 'outlined'}
            compact
            buttonColor={analyticsOn ? COLORS.PRIMARY : undefined}
            textColor={analyticsOn ? '#fff' : '#e2e8f0'}
            onPress={() => setAnalyticsOn((v) => !v)}
          >
            {analyticsOn ? t('cookieConsent.analyticsOn') : t('cookieConsent.analyticsOff')}
          </Button>
          <View style={styles.actions}>
            <Button mode="text" textColor="#e2e8f0" onPress={() => setManaging(false)} compact>
              {t('common.cancel')}
            </Button>
            <Button mode="contained" onPress={savePrefs} compact buttonColor={COLORS.PRIMARY}>
              {t('cookieConsent.savePreferences')}
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <Button mode="text" textColor="#e2e8f0" onPress={() => setManaging(true)} compact>
            {t('cookieConsent.manage')}
          </Button>
          <Button mode="text" textColor="#e2e8f0" onPress={reject} compact>
            {t('cookieConsent.reject')}
          </Button>
          <Button mode="contained" onPress={accept} compact buttonColor="#38bdf8" textColor="#0f172a">
            {t('cookieConsent.accept')}
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'fixed',
    left: 12,
    right: 12,
    bottom: 12,
    zIndex: 10000,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: 720,
    marginHorizontal: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  text: {
    color: '#e2e8f0',
    lineHeight: 20,
    marginBottom: 10,
  },
  hint: {
    color: 'rgba(226,232,240,0.75)',
    fontSize: 12,
    marginBottom: 8,
  },
  manageBlock: {
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
