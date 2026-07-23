import React, { useCallback } from 'react';
import { ScrollView, View, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';
import BaseStyles from '../styles/base';
import BrandLogo from '../components/BrandLogo';
import ScreenBackground from '../components/ScreenBackground';
import DashboardCard from '../components/dashboard/DashboardCard';

import { openServiceCenters } from '../navigation/serviceCentersNavigation';
import { navigateToSignIn, resetToClientDashboard, resetToSignIn } from '../navigation/authNavigation';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import { resolveIsPartnerSession } from '../utils/partnerSession';
import { useTranslation } from '../i18n';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';

export default function PublicHomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const topPad = insets.top + 16;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const token = await AsyncStorage.getItem('@access_token');
        if (cancelled) return;
        if (token && token !== 'null' && token !== 'undefined') {
          const isPartner = await resolveIsPartnerSession();
          if (cancelled) return;
          if (isPartner) {
            const route = await resolveShopEntryRoute();
            if (cancelled) return;
            navigation.reset(buildShopAuthReset(route));
            return;
          }
          resetToClientDashboard(navigation);
          return;
        }

        // Root (`/`) for unauthenticated web visitors should land on localized sign-in.
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          (window.location.pathname || '') === '/'
        ) {
          resetToSignIn(navigation);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [navigation])
  );

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: topPad,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
          },
        ]}
      >
        <DashboardCard style={styles.authPanel} contentStyle={styles.cardContent}>
          <Text style={styles.title}>{t('auth.welcomeToVeversal')}</Text>
          <View style={BaseStyles.logoContainer}>
            <BrandLogo width={160} height={160} />
          </View>
          <AuthLanguageSelector style={styles.langSelector} />
          <Text style={styles.subtitle}>{t('auth.publicSubtitle')}</Text>

          <Button
            mode="contained"
            onPress={() => openServiceCenters(navigation)}
            style={BaseStyles.loginButton}
            contentStyle={BaseStyles.loginButtonContent}
            labelStyle={BaseStyles.loginButtonLabel}
          >
            {t('public.findServiceCenters')}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigateToSignIn(navigation)}
            style={[BaseStyles.loginButton, styles.outlinedBtn]}
            textColor="#fff"
          >
            {t('auth.signIn')}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            textColor="#fff"
          >
            {t('auth.createAccount')}
          </Button>
        </DashboardCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  authPanel: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  cardContent: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  outlinedBtn: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
  langSelector: {
    marginBottom: 10,
  },
});
