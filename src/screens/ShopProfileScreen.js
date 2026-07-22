import React, { useCallback, useContext, useLayoutEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { getMyShopProfiles } from '../api/profiles';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import {
  getProfileCompletion,
  openPartnerWizard,
  partnerSetupPercent,
} from '../utils/partnerSetupGate';
import { getShopProfileStrengthHints } from '../utils/shopProfileCompleteness';
import ShopProfileCompletionCard from '../components/shop/ShopProfileCompletionCard';
import ShopViewPublicProfileButton from '../components/shop/ShopViewPublicProfileButton';
import { useTranslation } from '../i18n';

/**
 * Partner Profile readiness hub.
 *
 * Editing lives in PartnerOnboarding (wizard). This screen only shows:
 *   - readiness %
 *   - numbered steps 1–11 (colored by profile_completion.step_states)
 *   - Continue setup → first incomplete required step
 *   - View public profile
 */
export default function ShopProfileScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = usePartnerDashboardBack(navigation);
  const requireSetup = Boolean(route?.params?.requireSetup);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        setProfile(null);
        return;
      }
      const rows = await getMyShopProfiles(token);
      const shop = Array.isArray(rows) && rows.length ? rows[0] : null;
      setProfile(shop);
    } catch (_err) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: requireSetup
        ? t('partnerProfile.completeCenterDetails')
        : t('partnerProfile.centerDetails'),
      headerBackVisible: !requireSetup,
      headerLeft: requireSetup ? () => null : undefined,
      headerRight: requireSetup
        ? () => (
            <Button
              mode="text"
              onPress={() =>
                logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone)
              }
              labelStyle={{ color: '#fff', fontSize: 16 }}
            >
              Log out
            </Button>
          )
        : undefined,
    });
  }, [
    navigation,
    requireSetup,
    t,
    setAuthToken,
    setIsAuthenticated,
    setUserEmailOrPhone,
  ]);

  const openWizard = useCallback(
    (stepId = null) => {
      const params = {};
      if (stepId && typeof stepId === 'string') {
        params.stepId = stepId;
      }
      openPartnerWizard(navigation, profile, params);
    },
    [navigation, profile]
  );

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!profile) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingCenter}>
          <Text style={{ color: '#fff' }}>{t('partnerProfile.noProfile')}</Text>
        </View>
      </ScreenBackground>
    );
  }

  const backendCompletion = getProfileCompletion(profile);
  const completionPercent = partnerSetupPercent(profile);
  const strengthHints = getShopProfileStrengthHints(profile, {
    photoCount: Array.isArray(profile?.images) ? profile.images.length : 0,
  });

  return (
    <ScreenBackground safeArea={false}>
      <PartnerAppHeader
        title={t('partnerProfile.title')}
        backLabel={t('navigation.backToDashboard')}
        onBack={handleBack}
        iconOnlyBack
        scrolled={scrolled}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[
          styles.container,
          { paddingTop: 12, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <ShopProfileCompletionCard
          percent={completionPercent}
          strengthHints={strengthHints}
          encourageText={t('partnerProfile.profileEncourage')}
          completion={backendCompletion}
          onContinueSetup={openWizard}
          onSectionPress={openWizard}
        />

        <ShopViewPublicProfileButton shop={profile} navigation={navigation} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 16,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
