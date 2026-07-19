/**
 * Informational Stripe Checkout success page.
 * Activation is webhook-driven — this screen only polls entitlements.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import { getMyShopProfiles, getShopEntitlementsApi } from '../api/profiles';
import { COLORS } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from '../i18n';
import {
  accountStateDisplayLabel,
  getShopEntitlements,
  planDisplayLabel,
} from '../utils/partnerEntitlements';

const POLL_MS = 2500;
const MAX_POLLS = 24;

export default function ShopSubscriptionSuccessScreen({ navigation }) {
  const { t } = useTranslation();
  const route = useRoute();
  const [profile, setProfile] = useState(null);
  const [entsPayload, setEntsPayload] = useState(null);
  const [polls, setPolls] = useState(0);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const shopId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      const profiles = await getMyShopProfiles();
      const row =
        profiles?.find((p) => String(p.id) === String(shopId)) || profiles?.[0] || null;
      setProfile(row);
      if (row?.id) {
        const ents = await getShopEntitlementsApi(row.id);
        setEntsPayload(ents);
      }
      setError(null);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(async () => {
      setPolls((n) => {
        const next = n + 1;
        if (next >= MAX_POLLS) {
          clearInterval(timerRef.current);
        }
        return next;
      });
      await refresh();
    }, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refresh]);

  const ents = entsPayload || getShopEntitlements(profile);
  const active =
    ents?.account_state === 'active' ||
    ents?.subscription_state === 'active' ||
    Boolean(ents?.can_use_marketplace && ents?.plan_key && ents.plan_key !== 'trial');

  return (
    <ScreenBackground>
      <PartnerAppHeader
        title={t('subscription.successTitle')}
        onBack={() => navigation.navigate('ShopSubscriptionUpgrade')}
      />
      <View style={styles.wrap}>
        <Text style={styles.title}>{t('subscription.successHeadline')}</Text>
        <Text style={styles.body}>{t('subscription.successBody')}</Text>
        <Text style={styles.meta}>
          {t('subscription.currentPlan')}: {planDisplayLabel(ents, t)}
        </Text>
        <Text style={styles.meta}>
          {t('subscription.accountState')}: {accountStateDisplayLabel(ents, t)}
        </Text>
        {route.params?.sessionId ? (
          <Text style={styles.metaMuted}>session: {String(route.params.sessionId).slice(0, 24)}…</Text>
        ) : null}
        {!active ? (
          <View style={styles.pending}>
            <ActivityIndicator color={COLORS.PRIMARY} />
            <Text style={styles.pendingText}>{t('subscription.successPending')}</Text>
          </View>
        ) : (
          <Text style={styles.activeText}>{t('subscription.successActive')}</Text>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button mode="contained" style={{ marginTop: 20 }} onPress={() => navigation.navigate('ShopHome')}>
          {t('subscription.successBackHome')}
        </Button>
        <Button mode="text" onPress={refresh}>
          {t('subscription.successRefresh')}
        </Button>
        <Text style={styles.footnote}>{t('subscription.notAnInvoice')}</Text>
        <Text style={styles.footnoteMuted}>
          {t('subscription.successPollNote', { polls })}
        </Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'system-ui' }),
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.TEXT_MUTED,
  },
  meta: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  metaMuted: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  pending: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingText: {
    color: COLORS.TEXT_MUTED,
    flex: 1,
  },
  activeText: {
    marginTop: 20,
    color: '#15803d',
    fontWeight: '700',
  },
  error: {
    marginTop: 12,
    color: '#b91c1c',
  },
  footnote: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  footnoteMuted: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
});
