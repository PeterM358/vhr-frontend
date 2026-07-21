// PATH: src/screens/CreateVehicleScreen.js
//
// Vehicle creation, migrated onto the reusable Wizard Engine (src/wizard).
//
// Design choice: there is no vehicle "draft" model on the backend, so the
// wizard COLLECTS steps locally (in-memory adapter) and performs a single-shot
// POST /api/vehicles/ on Finish. All validation + payload assembly lives in
// useVehicleCreateForm() and is identical to the pre-wizard screen, so vehicle
// creation behaves the same for customer self-add and shop-for-client contexts.
// Progress is therefore local; when a draft/ERP-import backend arrives, swap the
// memory adapter for an API/AsyncStorage adapter without touching the steps.

import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useVehicleListBack } from '../navigation/appNavBarBack';
import { useTranslation } from '../i18n';
import { showMessage } from '../utils/crossPlatformAlert';
import { WizardEngine, createMemoryAdapter } from '../wizard';
import { useVehicleCreateForm } from './vehicle/useVehicleCreateForm';
import {
  VehicleIdentityStep,
  VehicleDetailsStep,
  VehicleReviewStep,
} from './vehicle/VehicleWizardSteps';

export default function CreateVehicleScreen({ navigation, route }) {
  const { t } = useTranslation();
  const handleBack = useVehicleListBack(navigation);

  const clientEmail = route?.params?.clientEmail || null;
  const clientPhone = route?.params?.clientPhone || null;

  const form = useVehicleCreateForm({ clientEmail, clientPhone });

  const steps = useMemo(
    () => [
      {
        id: 'identity',
        titleKey: 'vehicleWizard.identityTitle',
        validate: () => form.validateIdentity(),
        Component: VehicleIdentityStep,
      },
      {
        id: 'details',
        titleKey: 'vehicleWizard.detailsTitle',
        optional: true,
        validate: () => form.validateDetails(),
        Component: VehicleDetailsStep,
      },
      {
        id: 'review',
        titleKey: 'vehicleWizard.reviewTitle',
        Component: VehicleReviewStep,
      },
    ],
    [form]
  );

  // Single-shot create: no cross-session persistence needed.
  const adapter = useMemo(() => createMemoryAdapter({}), []);

  const onFinish = useCallback(async () => {
    // submit() throws on validation/network failure -> engine surfaces the error.
    await form.submit();
    showMessage(
      t('common.success', null, 'Success'),
      t('createVehicle.errors.createdSuccess'),
      { variant: 'success' }
    );
    setTimeout(() => {
      navigation.goBack();
    }, 600);
  }, [form, navigation, t]);

  const onExit = useCallback(() => {
    handleBack();
  }, [handleBack]);

  if (form.loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator animating size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={{ flex: 1 }}>
        <AppNavigationBar
          title={t('createVehicle.title')}
          backLabel={t('vehicles.backToVehicles')}
          onBack={handleBack}
        />
        <WizardEngine
          steps={steps}
          adapter={adapter}
          context={form}
          onFinish={onFinish}
          onExit={onExit}
          finishLabelKey="vehicleWizard.createButton"
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
