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
  Alert,
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
  cancelSubscriptionAtPeriodEnd,
} from '../api/profiles';
import { openPolicyPath } from '../policies/policyPaths';
import { POLICY_SLUGS } from '../policies/policySlugs';
import { COLORS } from '../constants/colors';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from '../i18n';
import {
  getShopEntitlements,
  getCurrentPlanDisplay,
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
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [optionsPayload, setOptionsPayload] = useState(null);
  const [selected, setSelected] = useState({ planKey: 'pro', billingInterval: 'annual' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

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
  const currentPlan = useMemo(() => getCurrentPlanDisplay(profile, t), [profile, t]);
  const planLabel = currentPlan.label;
  const stateLabel = accountStateDisplayLabel(ents, t);
  const listingMessage = getListingMessage(profile, t);
  const accepting = isAcceptingRequests(profile);
  const completion = ents?.profile_completion;
  const expiresAt = ents?.expires_at;
  const cancelAtPeriodEnd = Boolean(optionsPayload?.cancel_at_period_end);
  const planKeyLower = currentPlan.isAssigned ? String(currentPlan.key || '').toLowerCase() : '';
  const isActive =
    (ents?.account_state || ents?.subscription_state) === 'active';
  const bank = optionsPayload?.bank || {};
  const stripe = optionsPayload?.stripe || {};
  const options = optionsPayload?.options;
  const bankIncomplete = Boolean(bank.incomplete || bank.configured === false);
  const stripeIncomplete = Boolean(stripe.incomplete || stripe.configured === false);
  const stripeSubscriptionId = optionsPayload?.stripe_subscription_id;
  const featureRequested =
    featureLabelParam ||
    (featureKey && FEATURE_LABEL_KEYS[featureKey]
      ? t(FEATURE_LABEL_KEYS[featureKey])
      : null);

  const currentTagline = t(
    currentPlan.isAssigned
      ? PLAN_TAGLINE_KEYS[planKeyLower] || 'subscription.planTaglinePro'
      : 'subscription.planTaglineNone'
  );
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

  React.useEffect(() => {
    if (stripeIncomplete && !bankIncomplete) {
      setPaymentMethod('bank');
    }
  }, [stripeIncomplete, bankIncomplete]);

  React.useEffect(() => {
    setPayment(null);
  }, [selected.planKey, selected.billingInterval]);

  const priceDisplay = useMemo(() => {
    const opt = selectedOption;
    if (!opt) {
      return { main: t('subscription.priceUnavailable'), sub: '', savings: null };
    }
    const currency = opt.currency || 'EUR';
    if (isAnnual) {
      const pct = savingsPercent(opt);
      return {
        main: `${opt.amount} ${currency}`,
        sub: t('subscription.billedAnnually', { amount: opt.amount, currency }),
        savings: pct != null ? t('subscription.billingAnnualSave', { percent: pct }) : null,
      };
    }
    return {
      main: `${opt.amount} ${currency}`,
      sub: t('subscription.billedMonthly'),
      savings: null,
    };
  }, [selectedOption, isAnnual, t]);

  const planDetailFeatures = useMemo(() => {
    const keys =
      selected.planKey === 'premium'
        ? PREMIUM_BENEFIT_KEYS.slice(0, 4)
        : PRO_FEATURE_KEYS.slice(0, 5);
    return keys.map((k) => t(k));
  }, [selected.planKey, t]);

  const handlePrimaryPay = () => {
    if (paymentMethod === 'card') {
      payByCard();
      return;
    }
    requestPayment();
  };

  const primaryPayBusy = paymentMethod === 'card' ? checkoutSubmitting : submitting;
  const primaryPayDisabled =
    !selectedOption ||
    primaryPayBusy ||
    (paymentMethod === 'card' ? stripeIncomplete : bankIncomplete);

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
      scrollRef.current?.scrollToEnd({ animated: true });
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

  const showManageSubscription =
    isActive && currentPlan.isAssigned && planKeyLower && planKeyLower !== 'trial';

  const handleCancelAtPeriodEnd = () => {
    if (!profile?.id || cancelSubmitting) return;
    Alert.alert(t('subscription.cancelAtPeriodEndCta'), t('subscription.cancelAtPeriodEndConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('subscription.cancelAtPeriodEndCta'),
        style: 'destructive',
        onPress: async () => {
          setCancelSubmitting(true);
          setError(null);
          try {
            await cancelSubscriptionAtPeriodEnd(profile.id);
            await load();
            Alert.alert(t('common.notice'), t('subscription.cancelSuccess'));
          } catch (e) {
            setError(String(e?.message || e));
          } finally {
            setCancelSubmitting(false);
          }
        },
      },
    ]);
  };

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

            {showManageSubscription ? (
              <View style={styles.manageCard}>
                <Text style={styles.manageTitle}>{t('subscription.manageTitle')}</Text>
                <Text style={styles.manageBody}>{t('subscription.manageBody')}</Text>
                {cancelAtPeriodEnd ? (
                  <>
                    <Text style={styles.cancelScheduledTitle}>{t('subscription.cancelScheduledTitle')}</Text>
                    <Text style={styles.manageBody}>{t('subscription.cancelScheduledBody')}</Text>
                  </>
                ) : stripeSubscriptionId ? (
                  <Button
                    mode="outlined"
                    loading={cancelSubmitting}
                    disabled={cancelSubmitting}
                    onPress={handleCancelAtPeriodEnd}
                    style={styles.manageButton}
                  >
                    {cancelSubmitting ? t('subscription.cancelSubmitting') : t('subscription.cancelAtPeriodEndCta')}
                  </Button>
                ) : null}
                <Text style={[styles.manageBody, styles.manageRefundHint]}>
                  {t('subscription.refundRequestBody')}
                </Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => openPolicyPath(POLICY_SLUGS.refund, navigation)}
                  textColor={COLORS.PRIMARY}
                >
                  {t('subscription.refundPolicyLink')}
                </Button>
              </View>
            ) : null}

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

            <View style={styles.checkoutCard}>
              <Text style={styles.checkoutLabel}>{t('subscription.choosePlan')}</Text>
              <View style={styles.toggle}>
                <Pressable
                  onPress={() => setSelected((s) => ({ ...s, planKey: 'pro' }))}
                  style={[styles.toggleBtn, selected.planKey === 'pro' && styles.toggleBtnActiveLight]}
                >
                  <Text
                    style={[
                      styles.toggleTextDark,
                      selected.planKey === 'pro' && styles.toggleTextDarkActive,
                    ]}
                  >
                    {t('subscription.planPro')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelected((s) => ({ ...s, planKey: 'premium' }))}
                  style={[styles.toggleBtn, selected.planKey === 'premium' && styles.toggleBtnActiveLight]}
                >
                  <Text
                    style={[
                      styles.toggleTextDark,
                      selected.planKey === 'premium' && styles.toggleTextDarkActive,
                    ]}
                  >
                    {t('subscription.planPremium')}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.planHint}>
                {selected.planKey === 'premium'
                  ? t('subscription.premiumTagline')
                  : t('subscription.proTagline')}
              </Text>

              <Text style={[styles.checkoutLabel, styles.checkoutLabelSpaced]}>
                {t('subscription.billingIntervalLabel')}
              </Text>
              <View style={styles.toggle}>
                <Pressable
                  onPress={() => setSelected((s) => ({ ...s, billingInterval: 'monthly' }))}
                  style={[styles.toggleBtn, !isAnnual && styles.toggleBtnActiveLight]}
                >
                  <Text style={[styles.toggleTextDark, !isAnnual && styles.toggleTextDarkActive]}>
                    {t('subscription.billingMonthly')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelected((s) => ({ ...s, billingInterval: 'annual' }))}
                  style={[styles.toggleBtn, isAnnual && styles.toggleBtnActiveLight]}
                >
                  <Text style={[styles.toggleTextDark, isAnnual && styles.toggleTextDarkActive]}>
                    {t('subscription.billingAnnual')}
                  </Text>
                  {annualBadgePercent ? (
                    <View style={styles.toggleSaveBadgeDark}>
                      <Text style={styles.toggleSaveBadgeDarkText}>
                        {t('subscription.billingAnnualSave', { percent: annualBadgePercent })}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>

              <View style={styles.priceHero}>
                <Text style={styles.priceHeroAmount}>{priceDisplay.main}</Text>
                {priceDisplay.sub ? <Text style={styles.priceHeroSub}>{priceDisplay.sub}</Text> : null}
                {priceDisplay.savings ? (
                  <Text style={styles.priceHeroSavings}>{priceDisplay.savings}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => setShowPlanDetails((v) => !v)}
                style={styles.detailsToggle}
                accessibilityRole="button"
              >
                <Text style={styles.detailsToggleText}>
                  {showPlanDetails ? t('subscription.hidePlanDetails') : t('subscription.showPlanDetails')}
                </Text>
                <MaterialCommunityIcons
                  name={showPlanDetails ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.PRIMARY}
                />
              </Pressable>
              {showPlanDetails ? (
                <View style={styles.detailsList}>
                  {planDetailFeatures.map((label) => (
                    <View key={label} style={styles.featureRowCompact}>
                      <MaterialCommunityIcons name="check" size={16} color={COLORS.PRIMARY} />
                      <Text style={styles.featureTextCompact}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.checkoutLabel, styles.checkoutLabelSpaced]}>
                {t('subscription.paymentMethodLabel')}
              </Text>
              <View style={styles.toggle}>
                <Pressable
                  onPress={() => setPaymentMethod('card')}
                  disabled={stripeIncomplete}
                  style={[
                    styles.toggleBtn,
                    paymentMethod === 'card' && styles.toggleBtnActiveLight,
                    stripeIncomplete && styles.toggleBtnDisabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="credit-card-outline"
                    size={18}
                    color={paymentMethod === 'card' ? COLORS.PRIMARY_DARK : COLORS.TEXT_MUTED}
                  />
                  <Text
                    style={[
                      styles.toggleTextDark,
                      paymentMethod === 'card' && styles.toggleTextDarkActive,
                    ]}
                  >
                    {t('subscription.payWithCard')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setPaymentMethod('bank')}
                  disabled={bankIncomplete}
                  style={[
                    styles.toggleBtn,
                    paymentMethod === 'bank' && styles.toggleBtnActiveLight,
                    bankIncomplete && styles.toggleBtnDisabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bank-outline"
                    size={18}
                    color={paymentMethod === 'bank' ? COLORS.PRIMARY_DARK : COLORS.TEXT_MUTED}
                  />
                  <Text
                    style={[
                      styles.toggleTextDark,
                      paymentMethod === 'bank' && styles.toggleTextDarkActive,
                    ]}
                  >
                    {t('subscription.payWithBank')}
                  </Text>
                </Pressable>
              </View>

              {paymentMethod === 'card' && stripeIncomplete ? (
                <View style={styles.warnCardInline}>
                  <Text style={styles.warnTitle}>{t('subscription.stripeConfigMissingTitle')}</Text>
                  <Text style={styles.warnBody}>{t('subscription.stripeConfigMissingBody')}</Text>
                </View>
              ) : null}
              {paymentMethod === 'bank' && bankIncomplete ? (
                <View style={styles.warnCardInline}>
                  <Text style={styles.warnTitle}>{t('subscription.bankConfigMissingTitle')}</Text>
                  <Text style={styles.warnBody}>{t('subscription.bankConfigMissingBody')}</Text>
                </View>
              ) : null}
              {!(paymentMethod === 'card' ? stripeIncomplete : bankIncomplete) ? (
                <Text style={styles.payHint}>
                  {paymentMethod === 'card'
                    ? t('subscription.cardCheckoutIntroShort')
                    : t('subscription.bankTransferIntroShort')}
                </Text>
              ) : null}

              {payment && paymentMethod === 'bank' ? (
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
                  <Text style={styles.footnote}>{t('subscription.notAnInvoice')}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.enterpriseCardCompact}>
              <Text style={styles.enterpriseBody}>{t('subscription.enterpriseTagline')}</Text>
              <Button mode="text" compact onPress={contactSales} textColor={COLORS.PRIMARY}>
                {t('subscription.enterpriseCta')}
              </Button>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
      </ScrollView>

      {!loading && selectedOption ? (
        <View style={styles.stickyBar} pointerEvents="box-none">
          <Pressable
            onPress={handlePrimaryPay}
            disabled={primaryPayDisabled}
            style={({ pressed }) => [
              styles.stickyBtn,
              (pressed || primaryPayDisabled) && { opacity: primaryPayDisabled ? 0.55 : 0.92 },
            ]}
            accessibilityRole="button"
          >
            {primaryPayBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <View style={styles.stickyTextWrap}>
                  <Text style={styles.stickyBtnLabel}>
                    {paymentMethod === 'card'
                      ? t('subscription.payByCardCta')
                      : t('subscription.requestPaymentInstructions')}
                  </Text>
                  <Text style={styles.stickyBtnSub}>
                    {`${selectedPlanName} · ${selectedIntervalName}`}
                  </Text>
                </View>
                <Text style={styles.stickyBtnPrice}>
                  {`${selectedOption.amount} ${selectedOption.currency}`}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
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
    borderColor: 'rgba(15,76,129,0.2)',
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
  manageCard: {
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.2)',
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  manageBody: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
  },
  cancelScheduledTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
    marginTop: 12,
    marginBottom: 4,
  },
  manageButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  manageRefundHint: {
    marginTop: 12,
  },
  checkoutCard: {
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,76,129,0.14)',
  },
  checkoutLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  checkoutLabelSpaced: {
    marginTop: 18,
  },
  planHint: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
    marginTop: 10,
  },
  toggleBtnActiveLight: {
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toggleTextDark: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
  },
  toggleTextDarkActive: {
    color: COLORS.PRIMARY_DARK,
  },
  toggleBtnDisabled: {
    opacity: 0.45,
  },
  toggleSaveBadgeDark: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  toggleSaveBadgeDarkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  priceHero: {
    alignItems: 'center',
    paddingVertical: 18,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  priceHeroAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.PRIMARY_DARK,
    letterSpacing: -0.5,
  },
  priceHeroSub: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
    textAlign: 'center',
  },
  priceHeroSavings: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginTop: 6,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  detailsToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  detailsList: {
    gap: 8,
    marginBottom: 4,
  },
  featureRowCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureTextCompact: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    lineHeight: 19,
  },
  payHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 19,
    marginTop: 12,
  },
  warnCardInline: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  enterpriseCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
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
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 4,
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
    backgroundColor: 'rgba(15,76,129,0.1)',
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
    backgroundColor: 'rgba(15,76,129,0.12)',
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
