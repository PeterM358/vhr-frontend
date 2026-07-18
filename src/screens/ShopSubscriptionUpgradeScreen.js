/**
 * Upgrade screen — manual bank transfer (V1).
 * Gates must use entitlements from the API, not plan-name hardcoding.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Share,
} from 'react-native';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import {
  getMyShopProfiles,
  getSubscriptionPaymentOptions,
  createSubscriptionPaymentRequest,
} from '../api/profiles';
import { COLORS } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from '../i18n';
import {
  getShopEntitlements,
  planDisplayLabel,
  accountStateDisplayLabel,
  getListingMessage,
  isAcceptingRequests,
  FEATURES,
} from '../utils/partnerEntitlements';

const FEATURE_LABEL_KEYS = {
  [FEATURES.MARKETPLACE_FULL]: 'subscription.featureMarketplace',
  [FEATURES.MARKETPLACE_SEND_OFFER]: 'subscription.featureOffers',
  [FEATURES.REPAIRS]: 'subscription.featureRepairs',
  [FEATURES.CALENDAR]: 'subscription.featureCalendar',
  [FEATURES.CHAT]: 'subscription.featureChat',
  [FEATURES.ERP]: 'subscription.featureErp',
  [FEATURES.NOTIFICATIONS]: 'subscription.featureNotifications',
  [FEATURES.AI]: 'subscription.featureAi',
  [FEATURES.CUSTOMER_CONTACTS]: 'subscription.featureContacts',
  [FEATURES.DOCUMENTS]: 'subscription.featureDocuments',
};

const PLAN_OPTIONS = [
  { planKey: 'pro', billingInterval: 'monthly' },
  { planKey: 'pro', billingInterval: 'annual' },
  { planKey: 'premium', billingInterval: 'monthly' },
  { planKey: 'premium', billingInterval: 'annual' },
];

function findOption(options, planKey, billingInterval) {
  return (options || []).find(
    (o) => o.plan_key === planKey && o.billing_interval === billingInterval
  );
}

async function copyText(value) {
  const text = String(value || '');
  if (!text) return;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  try {
    await Share.share({ message: text });
  } catch {
    // no-op
  }
}

export default function ShopSubscriptionUpgradeScreen({ navigation }) {
  const { t } = useTranslation();
  const route = useRoute();
  const featureKey = route.params?.featureKey || null;
  const featureLabelParam = route.params?.featureLabel || null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [optionsPayload, setOptionsPayload] = useState(null);
  const [selected, setSelected] = useState({ planKey: 'pro', billingInterval: 'annual' });
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const shopId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      const profiles = await getMyShopProfiles();
      const row =
        profiles?.find((p) => String(p.id) === String(shopId)) || profiles?.[0] || null;
      setProfile(row);
      if (row?.id) {
        const opts = await getSubscriptionPaymentOptions(row.id);
        setOptionsPayload(opts);
      } else {
        setOptionsPayload(null);
      }
    } catch (e) {
      setProfile(null);
      setOptionsPayload(null);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ents = useMemo(() => getShopEntitlements(profile), [profile]);
  const planLabel = planDisplayLabel(ents, t);
  const stateLabel = accountStateDisplayLabel(ents, t);
  const listingMessage = getListingMessage(profile, t);
  const accepting = isAcceptingRequests(profile);
  const completion = ents?.profile_completion;
  const expiresAt = ents?.expires_at;
  const bank = optionsPayload?.bank || {};
  const bankIncomplete = Boolean(bank.incomplete || bank.configured === false);
  const featureRequested =
    featureLabelParam ||
    (featureKey && FEATURE_LABEL_KEYS[featureKey]
      ? t(FEATURE_LABEL_KEYS[featureKey])
      : null);

  const selectedOption = findOption(
    optionsPayload?.options,
    selected.planKey,
    selected.billingInterval
  );

  const requestPayment = async () => {
    if (!profile?.id || bankIncomplete) return;
    setSubmitting(true);
    setError(null);
    try {
      const row = await createSubscriptionPaymentRequest(profile.id, {
        planKey: selected.planKey,
        billingInterval: selected.billingInterval,
      });
      setPayment(row);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
      <PartnerAppHeader
        title={t('subscription.upgradeTitle')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.PRIMARY} />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroEyebrow}>{t('subscription.currentPlan')}</Text>
              <Text style={styles.heroPlan}>{planLabel}</Text>
              {stateLabel ? (
                <Text style={styles.heroState}>
                  {t('subscription.accountState')}: {stateLabel}
                </Text>
              ) : null}
              {expiresAt ? (
                <Text style={styles.heroState}>
                  {t('subscription.expiresAt')}: {String(expiresAt).slice(0, 10)}
                </Text>
              ) : null}
              {!accepting && listingMessage ? (
                <View style={styles.inactiveBanner}>
                  <MaterialCommunityIcons name="store-off-outline" size={16} color="#fff" />
                  <Text style={styles.inactiveBannerText}>{listingMessage}</Text>
                </View>
              ) : null}
              {featureRequested ? (
                <View style={styles.featurePill}>
                  <MaterialCommunityIcons name="lock-outline" size={16} color="#fff" />
                  <Text style={styles.featurePillText}>
                    {t('subscription.featureRequested', { feature: featureRequested })}
                  </Text>
                </View>
              ) : null}
              <Text style={styles.heroSub}>{t('subscription.upgradeSubtitle')}</Text>
            </View>

            {completion && !completion.ready_for_paid_plan ? (
              <View style={styles.completeCard}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={22} color={COLORS.PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.completeTitle}>{t('subscription.completeProfileTitle')}</Text>
                  <Text style={styles.completeBody}>
                    {completion.message || t('subscription.completeProfileBody')}
                  </Text>
                  <Button
                    mode="outlined"
                    style={{ marginTop: 10 }}
                    onPress={() => navigation.navigate('ShopProfile')}
                  >
                    {t('subscription.completeProfileCta')}
                  </Button>
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>{t('subscription.payByBankTransfer')}</Text>
            <Text style={styles.sectionBody}>{t('subscription.bankTransferIntro')}</Text>

            <View style={styles.optionGrid}>
              {PLAN_OPTIONS.map((row) => {
                const opt = findOption(optionsPayload?.options, row.planKey, row.billingInterval);
                const active =
                  selected.planKey === row.planKey &&
                  selected.billingInterval === row.billingInterval;
                const savings =
                  row.billingInterval === 'annual' && opt?.annual_savings
                    ? t('subscription.annualSavings', {
                        amount: opt.annual_savings,
                        currency: opt.currency || 'EUR',
                      })
                    : null;
                return (
                  <Pressable
                    key={`${row.planKey}-${row.billingInterval}`}
                    onPress={() => setSelected(row)}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                  >
                    <Text style={styles.optionTitle}>
                      {t(`subscription.planOption.${row.planKey}_${row.billingInterval}`)}
                    </Text>
                    <Text style={styles.optionPrice}>
                      {opt
                        ? `${opt.amount} ${opt.currency}`
                        : t('subscription.priceUnavailable')}
                    </Text>
                    {savings ? <Text style={styles.optionSavings}>{savings}</Text> : null}
                  </Pressable>
                );
              })}
            </View>

            {bankIncomplete ? (
              <View style={styles.warnCard}>
                <Text style={styles.warnTitle}>{t('subscription.bankConfigMissingTitle')}</Text>
                <Text style={styles.warnBody}>{t('subscription.bankConfigMissingBody')}</Text>
              </View>
            ) : (
              <Pressable
                onPress={requestPayment}
                disabled={submitting || !selectedOption}
                style={({ pressed }) => [
                  styles.cta,
                  (pressed || submitting) && { opacity: 0.9 },
                ]}
              >
                <View style={styles.ctaInner}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>{t('subscription.requestPaymentInstructions')}</Text>
                      <Text style={styles.ctaSub}>
                        {selectedOption
                          ? `${selectedOption.amount} ${selectedOption.currency}`
                          : ''}
                      </Text>
                    </>
                  )}
                </View>
              </Pressable>
            )}

            {payment ? (
              <View style={styles.instructions}>
                <Text style={styles.instructionsTitle}>{t('subscription.paymentInstructions')}</Text>
                <Text style={styles.instructionsHint}>{t('subscription.useExactReference')}</Text>
                <Text style={styles.instructionsHint}>{t('subscription.activatedAfterConfirm')}</Text>

                <CopyRow
                  label={t('subscription.paymentReference')}
                  value={payment.payment_reference}
                  onCopy={() => copyText(payment.payment_reference)}
                  emphasize
                />
                <CopyRow
                  label={t('subscription.amount')}
                  value={`${payment.amount} ${payment.currency}`}
                  onCopy={() => copyText(`${payment.amount} ${payment.currency}`)}
                />
                <CopyRow
                  label={t('subscription.beneficiary')}
                  value={payment.beneficiary || bank.beneficiary}
                  onCopy={() => copyText(payment.beneficiary || bank.beneficiary)}
                />
                <CopyRow
                  label={t('subscription.iban')}
                  value={payment.iban || bank.iban}
                  onCopy={() => copyText(payment.iban || bank.iban)}
                />
                {(payment.bic || bank.bic) ? (
                  <CopyRow
                    label={t('subscription.bic')}
                    value={payment.bic || bank.bic}
                    onCopy={() => copyText(payment.bic || bank.bic)}
                  />
                ) : null}
                <Text style={styles.metaLine}>
                  {t('subscription.period')}:{' '}
                  {(payment.period_start || '').slice(0, 10)} → {(payment.period_end || '').slice(0, 10)}
                </Text>
                <Text style={styles.metaLine}>
                  {t('subscription.paymentStatus')}: {payment.status}
                </Text>
                <Text style={styles.footnote}>{t('subscription.notAnInvoice')}</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

function CopyRow({ label, value, onCopy, emphasize }) {
  if (!value) return null;
  return (
    <Pressable onPress={onCopy} style={styles.copyRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={[styles.copyValue, emphasize && styles.copyValueEmphasize]}>{value}</Text>
      </View>
      <MaterialCommunityIcons name="content-copy" size={18} color={COLORS.PRIMARY} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  hero: {
    borderRadius: 20,
    padding: 24,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: COLORS.PRIMARY_DARK,
    overflow: 'hidden',
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroPlan: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'system-ui' }),
  },
  heroState: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(180,60,40,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  inactiveBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginTop: 12,
    lineHeight: 22,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
  },
  featurePillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  completeCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
  },
  completeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  completeBody: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginBottom: 14,
    lineHeight: 20,
  },
  optionGrid: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  optionCardActive: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.06)',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  optionPrice: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.PRIMARY_DARK,
  },
  optionSavings: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  warnCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(180,60,40,0.08)',
    marginBottom: 16,
  },
  warnTitle: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  warnBody: {
    marginTop: 4,
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
  },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.PRIMARY,
    marginBottom: 16,
  },
  ctaInner: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  instructions: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    gap: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  instructionsHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  copyLabel: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  copyValue: {
    marginTop: 2,
    fontSize: 15,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  copyValueEmphasize: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  metaLine: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  footnote: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  errorText: {
    marginTop: 12,
    color: '#b91c1c',
    fontSize: 13,
  },
});
