/**
 * Upgrade screen — Stripe Checkout + manual bank transfer (V1).
 * Gates must use entitlements from the API, not plan-name hardcoding.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Share,
  Linking,
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
  createSubscriptionCheckout,
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

// PRO value checklist (business language, never limitations).
const PRO_FEATURE_KEYS = [
  'subscription.proFeatureRepairs',
  'subscription.proFeatureOffers',
  'subscription.proFeatureCalendar',
  'subscription.proFeatureErp',
  'subscription.proFeatureDocuments',
  'subscription.proFeatureCustomerHistory',
  'subscription.proFeatureVehicleHistory',
  'subscription.proFeatureNotifications',
  'subscription.proFeatureChat',
  'subscription.proFeatureAi',
];

// Premium growth benefits (everything in PRO, plus these).
const PREMIUM_BENEFIT_KEYS = [
  'subscription.premiumBenefitFeatured',
  'subscription.premiumBenefitRanking',
  'subscription.premiumBenefitMap',
  'subscription.premiumBenefitBadge',
  'subscription.premiumBenefitHomepage',
  'subscription.premiumBenefitVisibility',
  'subscription.premiumBenefitInsights',
  'subscription.premiumBenefitSupport',
];

const PLAN_TAGLINE_KEYS = {
  trial: 'subscription.planTaglineTrial',
  pro: 'subscription.planTaglinePro',
  premium: 'subscription.planTaglinePremium',
  enterprise: 'subscription.planTaglineEnterprise',
};

function findOption(options, planKey, billingInterval) {
  return (options || []).find(
    (o) => o.plan_key === planKey && o.billing_interval === billingInterval
  );
}

function fmtMoney(value) {
  const num = Number(value);
  if (!isFinite(num)) return '';
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function savingsPercent(annualOpt) {
  const total = Number(annualOpt?.monthly_equivalent_annual_total);
  const save = Number(annualOpt?.annual_savings);
  if (!total || !save) return null;
  return Math.round((save / total) * 100);
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
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [optionsPayload, setOptionsPayload] = useState(null);
  const [selected, setSelected] = useState({ planKey: 'premium', billingInterval: 'annual' });
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const paymentSectionY = useRef(0);

  const scrollToPayment = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(paymentSectionY.current - 12, 0),
      animated: true,
    });
  }, []);

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
  const cancelAtPeriodEnd = Boolean(optionsPayload?.cancel_at_period_end);
  const planKeyLower = String(ents?.plan_key || '').toLowerCase();
  const isActive =
    (ents?.account_state || ents?.subscription_state) === 'active';
  const bank = optionsPayload?.bank || {};
  const stripe = optionsPayload?.stripe || {};
  const options = optionsPayload?.options;
  const bankIncomplete = Boolean(bank.incomplete || bank.configured === false);
  const stripeIncomplete = Boolean(stripe.incomplete || stripe.configured === false);
  const featureRequested =
    featureLabelParam ||
    (featureKey && FEATURE_LABEL_KEYS[featureKey]
      ? t(FEATURE_LABEL_KEYS[featureKey])
      : null);

  const currentTagline = t(PLAN_TAGLINE_KEYS[planKeyLower] || 'subscription.planTaglinePro');
  const expiryLine = useMemo(() => {
    if (!expiresAt) return null;
    const date = String(expiresAt).slice(0, 10);
    if (cancelAtPeriodEnd) return t('subscription.accessUntil', { date });
    if (isActive) return t('subscription.renewsOn', { date });
    return `${t('subscription.expiresAt')}: ${date}`;
  }, [expiresAt, cancelAtPeriodEnd, isActive, t]);

  const isAnnual = selected.billingInterval === 'annual';
  const annualBadgePercent = useMemo(() => {
    const pcts = ['pro', 'premium']
      .map((k) => savingsPercent(findOption(options, k, 'annual')))
      .filter((n) => n != null);
    return pcts.length ? Math.max(...pcts) : null;
  }, [options]);

  const selectedOption = findOption(options, selected.planKey, selected.billingInterval);

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

  const payByCard = async () => {
    if (!profile?.id || stripeIncomplete) return;
    setCheckoutSubmitting(true);
    setError(null);
    try {
      const row = await createSubscriptionCheckout(profile.id, {
        planKey: selected.planKey,
        billingInterval: selected.billingInterval,
      });
      const url = row?.checkout_url;
      if (!url) {
        throw new Error(t('subscription.checkoutUrlMissing'));
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.assign(url);
      } else {
        await Linking.openURL(url);
        navigation.navigate('ShopSubscriptionSuccess', {
          paymentId: row.payment_id,
          sessionId: row.checkout_session_id,
        });
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const contactSales = () => {
    const subject = encodeURIComponent(t('subscription.enterpriseEmailSubject'));
    const body = encodeURIComponent(
      t('subscription.enterpriseEmailBody', { shop: profile?.name || '' })
    );
    Linking.openURL(`mailto:partners@veversal.com?subject=${subject}&body=${body}`);
  };

  const selectedPlanName = t(
    selected.planKey === 'premium' ? 'subscription.planPremium' : 'subscription.planPro'
  );
  const selectedIntervalName = t(
    isAnnual ? 'subscription.billingAnnual' : 'subscription.billingMonthly'
  );

  return (
    <ScreenBackground>
      <PartnerAppHeader
        title={t('subscription.upgradeTitle')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.PRIMARY} />
        ) : (
          <>
            {/* Current plan */}
            <View style={styles.hero}>
              <Text style={styles.heroEyebrow}>{t('subscription.currentPlan')}</Text>
              <Text style={styles.heroPlan}>{planLabel}</Text>
              <Text style={styles.heroTagline}>{currentTagline}</Text>
              <View style={styles.heroMetaRow}>
                {stateLabel ? (
                  <View style={styles.statusChip}>
                    <View style={[styles.statusDot, accepting ? styles.statusDotOk : styles.statusDotWarn]} />
                    <Text style={styles.statusChipText}>{stateLabel}</Text>
                  </View>
                ) : null}
                {expiryLine ? <Text style={styles.heroState}>{expiryLine}</Text> : null}
              </View>
              {!accepting ? (
                <View style={styles.inactiveBanner}>
                  <MaterialCommunityIcons name="store-alert-outline" size={18} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inactiveBannerText}>
                      {listingMessage || t('subscription.notAcceptingRequests')}
                    </Text>
                    <Text style={styles.inactiveBannerHelp}>{t('subscription.inactiveHelp')}</Text>
                  </View>
                </View>
              ) : null}
              {featureRequested ? (
                <View style={styles.featurePill}>
                  <MaterialCommunityIcons name="lock-open-variant-outline" size={16} color="#fff" />
                  <Text style={styles.featurePillText}>
                    {t('subscription.featureRequested', { feature: featureRequested })}
                  </Text>
                </View>
              ) : null}
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

            {/* Billing interval toggle */}
            <Text style={styles.sectionTitle}>{t('subscription.choosePlan')}</Text>
            <View style={styles.toggle}>
              <Pressable
                onPress={() => setSelected((s) => ({ ...s, billingInterval: 'monthly' }))}
                style={[styles.toggleBtn, !isAnnual && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, !isAnnual && styles.toggleTextActive]}>
                  {t('subscription.billingMonthly')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelected((s) => ({ ...s, billingInterval: 'annual' }))}
                style={[styles.toggleBtn, isAnnual && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, isAnnual && styles.toggleTextActive]}>
                  {t('subscription.billingAnnual')}
                </Text>
                {annualBadgePercent ? (
                  <View style={styles.toggleSaveBadge}>
                    <Text style={styles.toggleSaveBadgeText}>
                      {t('subscription.billingAnnualSave', { percent: annualBadgePercent })}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {/* PRO */}
            <PlanCard
              planKey="pro"
              title={t('subscription.planPro')}
              tagline={t('subscription.proTagline')}
              options={options}
              isAnnual={isAnnual}
              selected={selected.planKey === 'pro'}
              onSelect={() => setSelected((s) => ({ ...s, planKey: 'pro' }))}
              featuresTitle={t('subscription.proFeaturesTitle')}
              features={PRO_FEATURE_KEYS.map((k) => t(k))}
              selectLabel={t('subscription.selectLabel')}
              selectedLabel={t('subscription.selectedLabel')}
              t={t}
            />

            {/* Premium — visual standout */}
            <PlanCard
              planKey="premium"
              title={t('subscription.planPremium')}
              tagline={t('subscription.premiumTagline')}
              options={options}
              isAnnual={isAnnual}
              selected={selected.planKey === 'premium'}
              onSelect={() => setSelected((s) => ({ ...s, planKey: 'premium' }))}
              featuresTitle={t('subscription.premiumEverythingInPro')}
              features={PREMIUM_BENEFIT_KEYS.map((k) => t(k))}
              badge={t('subscription.premiumBadge')}
              highlight
              selectLabel={t('subscription.selectLabel')}
              selectedLabel={t('subscription.selectedLabel')}
              t={t}
            />

            {/* Enterprise — small, contact sales */}
            <View style={styles.enterpriseCard}>
              <View style={styles.enterpriseHeader}>
                <MaterialCommunityIcons name="office-building-outline" size={20} color={COLORS.PRIMARY_DARK} />
                <Text style={styles.enterpriseTitle}>{t('subscription.enterpriseTitle')}</Text>
              </View>
              <Text style={styles.enterpriseBody}>{t('subscription.enterpriseTagline')}</Text>
              <Button mode="outlined" onPress={contactSales} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                {t('subscription.enterpriseCta')}
              </Button>
            </View>

            {/* Payment */}
            <View
              onLayout={(e) => {
                paymentSectionY.current = e.nativeEvent.layout.y;
              }}
            />
            <View style={styles.paymentSummary}>
              <MaterialCommunityIcons name="cart-outline" size={18} color={COLORS.PRIMARY_DARK} />
              <Text style={styles.paymentSummaryText}>
                {t('subscription.selectedSummary', {
                  plan: selectedPlanName,
                  interval: selectedIntervalName,
                })}
                {selectedOption ? `  ·  ${selectedOption.amount} ${selectedOption.currency}` : ''}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>{t('subscription.payByCard')}</Text>
            <Text style={styles.sectionBody}>{t('subscription.cardCheckoutIntro')}</Text>
            {stripeIncomplete ? (
              <View style={styles.warnCard}>
                <Text style={styles.warnTitle}>{t('subscription.stripeConfigMissingTitle')}</Text>
                <Text style={styles.warnBody}>{t('subscription.stripeConfigMissingBody')}</Text>
              </View>
            ) : (
              <Pressable
                onPress={payByCard}
                disabled={checkoutSubmitting || !selectedOption}
                style={({ pressed }) => [
                  styles.cta,
                  styles.ctaCard,
                  (pressed || checkoutSubmitting) && { opacity: 0.9 },
                ]}
              >
                <View style={styles.ctaInner}>
                  {checkoutSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.ctaText}>{t('subscription.payByCardCta')}</Text>
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

            <Text style={styles.sectionTitle}>{t('subscription.payByBankTransfer')}</Text>
            <Text style={styles.sectionBody}>{t('subscription.bankTransferIntro')}</Text>

            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>{t('subscription.bankStepsTitle')}</Text>
              <StepRow index={1} text={t('subscription.bankStep1')} />
              <StepRow index={2} text={t('subscription.bankStep2')} />
              <StepRow index={3} text={t('subscription.bankStep3')} />
              <Text style={styles.stepsNote}>{t('subscription.bankAccountingNote')}</Text>
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
                  styles.ctaBank,
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
                <Text style={styles.footnote}>{t('subscription.bankAccountingNote')}</Text>
                <Text style={styles.footnote}>{t('subscription.notAnInvoice')}</Text>
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      {!loading && selectedOption ? (
        <View style={styles.stickyBar} pointerEvents="box-none">
          <Pressable
            onPress={scrollToPayment}
            style={({ pressed }) => [styles.stickyBtn, pressed && { opacity: 0.9 }]}
            accessibilityRole="button"
          >
            <View style={styles.stickyTextWrap}>
              <Text style={styles.stickyBtnLabel}>{t('subscription.continueToPayment')}</Text>
              <Text style={styles.stickyBtnSub}>
                {`${selectedPlanName} · ${selectedIntervalName}`}
              </Text>
            </View>
            <View style={styles.stickyPriceWrap}>
              <Text style={styles.stickyBtnPrice}>
                {`${selectedOption.amount} ${selectedOption.currency}`}
              </Text>
              <MaterialCommunityIcons name="arrow-down" size={20} color="#fff" />
            </View>
          </Pressable>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

function PlanCard({
  planKey,
  title,
  tagline,
  options,
  isAnnual,
  selected,
  onSelect,
  featuresTitle,
  features,
  badge,
  highlight,
  selectLabel,
  selectedLabel,
  t,
}) {
  const monthlyOpt = findOption(options, planKey, 'monthly');
  const annualOpt = findOption(options, planKey, 'annual');
  const activeOpt = isAnnual ? annualOpt : monthlyOpt;
  const currency = activeOpt?.currency || monthlyOpt?.currency || 'EUR';

  let priceMain = t('subscription.priceUnavailable');
  let priceSub = null;
  let savingsText = null;
  if (activeOpt) {
    if (isAnnual) {
      const perMonth = fmtMoney(Number(activeOpt.amount) / 12);
      priceMain = `${perMonth} ${currency}`;
      priceSub = t('subscription.billedAnnually', { amount: activeOpt.amount, currency });
      const pct = savingsPercent(activeOpt);
      if (activeOpt.annual_savings && pct != null) {
        savingsText = t('subscription.annualSavingsShort', {
          amount: activeOpt.annual_savings,
          currency,
          percent: pct,
        });
      }
    } else {
      priceMain = `${activeOpt.amount} ${currency}`;
      priceSub = t('subscription.billedMonthly');
    }
  }

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.planCard,
        highlight && styles.planCardHighlight,
        selected && styles.planCardSelected,
      ]}
    >
      {badge ? (
        <View style={styles.planBadge}>
          <MaterialCommunityIcons name="star-four-points" size={12} color="#fff" />
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      ) : null}

      <View style={styles.planHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planName}>{title}</Text>
          <Text style={styles.planTagline}>{tagline}</Text>
        </View>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceMain}>{priceMain}</Text>
        <Text style={styles.priceUnit}>{t('subscription.perMonth')}</Text>
      </View>
      {priceSub ? <Text style={styles.priceSub}>{priceSub}</Text> : null}
      {savingsText ? (
        <View style={styles.savingsPill}>
          <MaterialCommunityIcons name="tag-outline" size={13} color={COLORS.PRIMARY_DARK} />
          <Text style={styles.savingsPillText}>{savingsText}</Text>
        </View>
      ) : null}

      <Text style={styles.featuresTitle}>{featuresTitle}</Text>
      <View style={styles.featureList}>
        {features.map((label) => (
          <View key={label} style={styles.featureRow}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={highlight ? COLORS.PRIMARY : COLORS.PRIMARY_DARK}
            />
            <Text style={styles.featureText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.selectBtn, selected && styles.selectBtnOn, highlight && !selected && styles.selectBtnHighlight]}>
        <Text style={[styles.selectBtnText, selected && styles.selectBtnTextOn]}>
          {selected ? selectedLabel : selectLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function StepRow({ index, text }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{index}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
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
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    backgroundColor: COLORS.CARD_DARK,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  stickyTextWrap: {
    flex: 1,
  },
  stickyBtnLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  stickyBtnSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  stickyPriceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stickyBtnPrice: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
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
  heroTagline: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginTop: 6,
    lineHeight: 21,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOk: { backgroundColor: '#4ade80' },
  statusDotWarn: { backgroundColor: '#fbbf24' },
  statusChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  heroState: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(180,60,40,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
  },
  inactiveBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  inactiveBannerHelp: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    color: '#fff',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 14,
    lineHeight: 20,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 11,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  toggleTextActive: {
    color: COLORS.PRIMARY_DARK,
  },
  toggleSaveBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  toggleSaveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.1)',
  },
  planCardHighlight: {
    borderColor: COLORS.PRIMARY,
    borderWidth: 2,
  },
  planCardSelected: {
    borderColor: COLORS.PRIMARY,
    borderWidth: 2,
    // Solid opaque surface so the dark garage background never bleeds through
    // and washes out the dark card text when a plan is selected.
    backgroundColor: '#EEF2FF',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  planTagline: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    lineHeight: 19,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 16,
  },
  priceMain: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.PRIMARY_DARK,
  },
  priceUnit: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    marginBottom: 5,
  },
  priceSub: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginTop: 10,
  },
  savingsPillText: {
    color: COLORS.PRIMARY_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 18,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  featureList: {
    gap: 9,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    flex: 1,
  },
  selectBtn: {
    marginTop: 18,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  selectBtnHighlight: {
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  selectBtnOn: {
    backgroundColor: COLORS.PRIMARY,
  },
  selectBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.PRIMARY_DARK,
  },
  selectBtnTextOn: {
    color: '#fff',
  },
  enterpriseCard: {
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  enterpriseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enterpriseTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  enterpriseBody: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
    lineHeight: 19,
  },
  paymentSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  paymentSummaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  warnCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(180,60,40,0.12)',
    marginBottom: 16,
  },
  warnTitle: {
    fontWeight: '700',
    color: '#fff',
  },
  warnBody: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  cta: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ctaCard: {
    backgroundColor: COLORS.PRIMARY,
  },
  ctaBank: {
    backgroundColor: COLORS.PRIMARY_DARK,
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
  stepsCard: {
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    lineHeight: 20,
  },
  stepsNote: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
    marginTop: 2,
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
    color: '#fecaca',
    fontSize: 13,
  },
});
