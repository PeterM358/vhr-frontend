// PATH: src/screens/PartnerOnboardingScreen.js
//
// Guided partner onboarding, built on the reusable Wizard Engine (src/wizard).
//
// Ships: Business type -> Vehicles -> Services -> Readiness. Each step auto-saves
// to the backend via PATCH /api/profiles/shop-profiles/{id}/ (existing endpoint),
// progress is restored from ShopProfile.onboarding_progress, and the readiness
// card reads the backend-computed profile_completion summary. Remaining partner
// steps (legal identity, working hours, photos, guided price list, publish) live
// in ShopProfileScreen today and are surfaced from the Readiness step.

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useTranslation } from '../i18n';
import { WizardEngine } from '../wizard';
import { usePartnerOnboardingData } from './partner/usePartnerOnboardingData';
import {
  PartnerBusinessTypeStep,
  PartnerVehiclesStep,
  PartnerServicesStep,
  PartnerHoursStep,
  PartnerLegalStep,
  PartnerReadinessStep,
  hasAnyOpenDay,
} from './partner/PartnerOnboardingSteps';

export default function PartnerOnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const { ready, error, adapter, initialValues, taxonomy, getCompletion } =
    usePartnerOnboardingData();

  const context = useMemo(() => ({ ...taxonomy, getCompletion }), [taxonomy, getCompletion]);

  const steps = useMemo(
    () => [
      {
        id: 'business',
        titleKey: 'partnerOnboarding.step.business',
        validate: (v) => {
          if (!String(v.name || '').trim()) {
            return { ok: false, message: t('partnerOnboarding.errors.nameRequired', null, 'Enter your business name.') };
          }
          if (v.primary_business_category_id == null) {
            return { ok: false, message: t('partnerOnboarding.errors.categoryRequired', null, 'Choose your business type.') };
          }
          return { ok: true };
        },
        Component: PartnerBusinessTypeStep,
      },
      {
        id: 'vehicles',
        titleKey: 'partnerOnboarding.step.vehicles',
        validate: (v) => {
          if (!(v.supported_vehicle_types || []).length) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.vehicleRequired', null, 'Select at least one vehicle type.'),
            };
          }
          return { ok: true };
        },
        Component: PartnerVehiclesStep,
      },
      {
        id: 'services',
        titleKey: 'partnerOnboarding.step.services',
        optional: true,
        Component: PartnerServicesStep,
      },
      {
        id: 'hours',
        titleKey: 'partnerOnboarding.step.hours',
        validate: (v) => {
          if (!hasAnyOpenDay(v.working_hours)) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.hoursRequired', null, 'Set opening hours for at least one day.'),
            };
          }
          return { ok: true };
        },
        Component: PartnerHoursStep,
      },
      {
        id: 'legal',
        titleKey: 'partnerOnboarding.step.legal',
        validate: (v) => {
          if (!String(v.legal_name || '').trim()) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.legalNameRequired', null, 'Enter your registered company name.'),
            };
          }
          const hasTaxId = v.vat_registered !== false
            ? String(v.vat_number || '').trim()
            : String(v.eik_number || '').trim() || String(v.vat_number || '').trim();
          if (!hasTaxId) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.taxIdRequired', null, 'Enter your VAT number or company ID.'),
            };
          }
          if (!String(v.invoice_address_line1 || '').trim()) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.invoiceAddressRequired', null, 'Enter an invoice address.'),
            };
          }
          return { ok: true };
        },
        Component: PartnerLegalStep,
      },
      {
        id: 'readiness',
        titleKey: 'partnerOnboarding.step.readiness',
        Component: PartnerReadinessStep,
      },
    ],
    [t]
  );

  const onFinish = useCallback(() => {
    // Back to the dashboard; the profile tile opens ShopProfile once ready.
    navigation.reset({ index: 0, routes: [{ name: 'ShopHome' }] });
  }, [navigation]);

  const onExit = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (!ready) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <ActivityIndicator animating size="large" color="#fff" />
          )}
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={{ flex: 1 }}>
        <AppNavigationBar
          title={t('partnerOnboarding.title', null, 'Set up your shop')}
          onBack={() => navigation.goBack()}
        />
        <WizardEngine
          steps={steps}
          adapter={adapter}
          initialValues={initialValues}
          context={context}
          onFinish={onFinish}
          onExit={onExit}
          finishLabelKey="partnerOnboarding.finish"
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#fff', fontSize: 15, textAlign: 'center' },
});
