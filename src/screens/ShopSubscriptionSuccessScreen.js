/**
 * Informational Stripe Checkout success page.
 * Activation is webhook-driven — this screen polls entitlements and celebrates when active.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import { getMyShopProfiles, getShopEntitlementsApi } from '../api/profiles';
import { COLORS } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from '../i18n';
import {
  accountStateDisplayLabel,
  getCurrentPlanDisplay,
  getShopEntitlements,
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
  const plan = useMemo(() => getCurrentPlanDisplay(profile, t), [profile, t]);
  const planKey = String(plan.key || ents?.plan_key || '').toLowerCase();
  const isPremium = planKey === 'premium' || Boolean(ents?.has_premium_badge);
  const active =
    ents?.account_state === 'active' ||
    ents?.subscription_state === 'active' ||
    Boolean(ents?.can_use_marketplace && ents?.plan_key && ents.plan_key !== 'trial');

  useEffect(() => {
    if (active && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [active]);

  return (
    <ScreenBackground>
      <PartnerAppHeader
        title={t('subscription.successTitle')}
        onBack={() => navigation.navigate('ShopSubscriptionUpgrade')}
      />
      <ScrollView contentContainerStyle={styles.wrap} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, active ? styles.heroActive : styles.heroPending]}>
          <View style={styles.heroIconWrap}>
            <MaterialCommunityIcons
              name={active ? 'check-decagram' : 'timer-sand'}
              size={52}
              color={active ? '#4ade80' : COLORS.PRIMARY}
            />
          </View>
          <Text style={[styles.title, !active && styles.titlePending]}>
            {active
              ? t('subscription.successHeadlineActive')
              : t('subscription.successHeadline')}
          </Text>
          <Text style={[styles.body, !active && styles.bodyPending]}>
            {active
              ? isPremium
                ? t('subscription.successBodyPremium')
                : t('subscription.successBodyPro')
              : t('subscription.successBody')}
          </Text>

          {active ? (
            <View style={styles.planBadge}>
              <MaterialCommunityIcons
                name={isPremium ? 'star-circle' : 'wrench'}
                size={20}
                color="#fff"
              />
              <Text style={styles.planBadgeText}>
                {isPremium
                  ? t('subscription.successPremiumBadge')
                  : t('subscription.successProBadge')}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.meta, !active && styles.metaPending]}>
            {t('subscription.currentPlan')}: {plan.label}
          </Text>
          <Text style={[styles.meta, !active && styles.metaPending]}>
            {t('subscription.accountState')}:{' '}
            {accountStateDisplayLabel(ents, t) || (active ? t('subscription.stateActive') : '—')}
          </Text>
        </View>

        {!active ? (
          <View style={styles.pending}>
            <ActivityIndicator color={COLORS.PRIMARY} />
            <Text style={styles.pendingText}>{t('subscription.successPending')}</Text>
          </View>
        ) : (
          <View style={styles.perks}>
            <Text style={styles.perksTitle}>{t('subscription.successWhatNext')}</Text>
            <Text style={styles.perkLine}>• {t('subscription.successPerkRequests')}</Text>
            {isPremium ? (
              <Text style={styles.perkLine}>• {t('subscription.successPerkAds')}</Text>
            ) : null}
            <Text style={styles.perkLine}>• {t('subscription.successPerkCancel')}</Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          mode="contained"
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('ShopHome')}
        >
          {t('subscription.successBackHome')}
        </Button>
        {active ? (
          <Button
            mode="outlined"
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('ShopPublicPreview')}
          >
            {t('subscription.successViewPublic')}
          </Button>
        ) : (
          <Button mode="text" onPress={refresh}>
            {t('subscription.successRefresh')}
          </Button>
        )}
        <Button mode="text" onPress={() => navigation.navigate('ShopSubscriptionUpgrade')}>
          {t('subscription.successManageBilling')}
        </Button>

        <Text style={styles.footnote}>{t('subscription.notAnInvoice')}</Text>
        {!active ? (
          <Text style={styles.footnoteMuted}>
            {t('subscription.successPollNote', { polls })}
          </Text>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  hero: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
  },
  heroPending: {
    backgroundColor: COLORS.CARD_FLOATING,
    borderColor: 'rgba(15,76,129,0.16)',
  },
  heroActive: {
    backgroundColor: COLORS.PRIMARY_DARK,
    borderColor: 'rgba(74,222,128,0.35)',
  },
  heroIconWrap: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'system-ui' }),
  },
  titlePending: {
    color: COLORS.TEXT_DARK,
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  bodyPending: {
    color: COLORS.TEXT_MUTED,
  },
  planBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  planBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  meta: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  metaPending: {
    color: COLORS.TEXT_DARK,
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
  perks: {
    marginTop: 18,
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 16,
    padding: 16,
  },
  perksTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  perkLine: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  error: {
    marginTop: 12,
    color: '#b91c1c',
  },
  primaryBtn: {
    marginTop: 20,
    borderRadius: 12,
  },
  secondaryBtn: {
    marginTop: 10,
    borderRadius: 12,
  },
  footnote: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  footnoteMuted: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
});
