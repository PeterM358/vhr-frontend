// PATH: src/screens/PartnerOnboardingScreen.js
//
// Guided partner onboarding — PRIMARY profile setup experience.
// Built on the reusable Wizard Engine (src/wizard).
//
// Full flow: Business → Location → Vehicles → Services → Prices → Hours →
// Photos → About → Legal → Preview → Publish.
// Each editable step autosaves via PATCH /api/profiles/shop-profiles/{id}/.
// Resume uses backend profile_completion.first_missing_required / current_step.

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useTranslation } from '../i18n';
import { WizardEngine } from '../wizard';
import { usePartnerOnboardingData } from './partner/usePartnerOnboardingData';
import {
  PartnerBusinessTypeStep,
  PartnerLocationStep,
  PartnerVehiclesStep,
  PartnerServicesStep,
  PartnerPricesStep,
  PartnerHoursStep,
  PartnerPhotosStep,
  PartnerAboutStep,
  PartnerLegalStep,
  PartnerPreviewStep,
  PartnerPublishStep,
  hasAnyOpenDay,
} from './partner/PartnerOnboardingSteps';

export default function PartnerOnboardingScreen({ navigation }) {
  const { t } = useTranslation();
  const route = useRoute();
  const preferredStepId = route?.params?.stepId || null;
  const { ready, error, adapter, initialValues, taxonomy, getCompletion, refreshProfile } =
    usePartnerOnboardingData({ preferredStepId });

  const context = useMemo(
    () => ({ ...taxonomy, getCompletion, refreshProfile }),
    [taxonomy, getCompletion, refreshProfile]
  );

  const steps = useMemo(
    () => [
      {
        id: 'business',
        titleKey: 'partnerOnboarding.step.business',
        dirtyFields: [
          'name',
          'primary_business_category_id',
          'secondary_business_category_ids',
          'business_service_ids',
        ],
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
        id: 'location',
        titleKey: 'partnerOnboarding.step.location',
        dirtyFields: [
          'address',
          'phone',
          'phone_country_code',
          'phone_national',
          'phone_e164',
          'latitude',
          'longitude',
          'country',
          'city',
          'postal_code',
        ],
        validate: (v) => {
          if (!String(v.address || '').trim()) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.addressRequired', null, 'Enter your street address.'),
            };
          }
          if (v.country == null || v.country === '') {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.countryRequired', null, 'Choose your country.'),
            };
          }
          if (v.city == null || v.city === '') {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.cityRequired', null, 'Choose your city.'),
            };
          }
          const hasPhone =
            String(v.phone_e164 || '').trim() ||
            String(v.phone || '').trim() ||
            (String(v.phone_national || '').trim() &&
              String(v.phone_country_code || '').trim());
          if (!hasPhone) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.phoneRequired', null, 'Enter a contact phone.'),
            };
          }
          if (v.latitude == null || v.longitude == null) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.mapPinRequired', null, 'Set your map pin.'),
            };
          }
          return { ok: true };
        },
        Component: PartnerLocationStep,
      },
      {
        id: 'vehicles',
        titleKey: 'partnerOnboarding.step.vehicles',
        dirtyFields: ['supported_vehicle_types'],
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
        dirtyFields: ['available_repairs'],
        validate: (v) => {
          if (!(v.available_repairs || []).length) {
            return {
              ok: false,
              message: t('partnerOnboarding.errors.operationsRequired', null, 'Select at least one operation.'),
            };
          }
          return { ok: true };
        },
        Component: PartnerServicesStep,
      },
      {
        id: 'prices',
        titleKey: 'partnerOnboarding.step.prices',
        optional: true,
        dirtyFields: [],
        Component: PartnerPricesStep,
      },
      {
        id: 'hours',
        titleKey: 'partnerOnboarding.step.hours',
        dirtyFields: ['working_hours'],
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
        id: 'photos',
        titleKey: 'partnerOnboarding.step.photos',
        optional: true,
        dirtyFields: [],
        Component: PartnerPhotosStep,
      },
      {
        id: 'about',
        titleKey: 'partnerOnboarding.step.about',
        optional: true,
        dirtyFields: ['description', 'short_description'],
        Component: PartnerAboutStep,
      },
      {
        id: 'legal',
        titleKey: 'partnerOnboarding.step.legal',
        dirtyFields: [
          'legal_name',
          'vat_registered',
          'vat_number',
          'eik_number',
          'invoice_branch_name',
          'invoice_address_line1',
          'invoice_city',
        ],
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
        id: 'preview',
        titleKey: 'partnerOnboarding.step.preview',
        optional: true,
        dirtyFields: [],
        Component: PartnerPreviewStep,
      },
      {
        id: 'publish',
        titleKey: 'partnerOnboarding.step.publish',
        dirtyFields: [],
        Component: PartnerPublishStep,
      },
    ],
    [t]
  );

  const onFinish = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'ShopHome' }] });
  }, [navigation]);

  const onExit = useCallback(() => {
    if (typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('ShopHome');
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
          onBack={onExit}
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
