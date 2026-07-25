import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenBackground from '../components/ScreenBackground';
import { buildShopAuthReset, resolveShopEntryRoute } from '../utils/shopAuthNavigation';
import {
  resetToClientDashboard,
  resetToSignIn,
  storeAuthReturnUrl,
  consumeAuthReturnUrl,
} from '../navigation/authNavigation';
import { isProtectedWebPath, resetNavigationToCanonicalPath } from '../navigation/webLinking';
import { toCanonicalAppPath } from '../navigation/localizedRoutes';
import { readOrganizationMemberships } from '../utils/orgWorkspace';

function isClientDashboardPath(path) {
  const pathOnly = String(path || '').split('?')[0];
  const canonical = toCanonicalAppPath(pathOnly) || pathOnly;
  const normalized = String(canonical).replace(/\/$/, '');
  return normalized === '/dashboard';
}

async function resolveSessionKind() {
  const token = await AsyncStorage.getItem('@access_token');
  if (!token) {
    return { token: null, isPartner: false, isOrgOnly: false };
  }
  const isShop = await AsyncStorage.getItem('@is_shop');
  const shopProfiles = await AsyncStorage.getItem('@shop_profiles');
  const shopMemberships = await AsyncStorage.getItem('@shop_memberships');
  const orgMemberships = await readOrganizationMemberships();
  const flaggedShop = String(isShop || '').trim().toLowerCase() === 'true';
  const hasShopLinks =
    flaggedShop ||
    (shopProfiles && shopProfiles !== '[]') ||
    (shopMemberships && shopMemberships !== '[]');
  const hasOrg = orgMemberships.length > 0;
  return {
    token,
    isPartner: hasShopLinks,
    isOrgOnly: hasOrg && !hasShopLinks,
  };
}

export default function AuthLoadingScreen({ navigation }) {
  useEffect(() => {
    const checkAuth = async () => {
      const { token, isPartner, isOrgOnly } = await resolveSessionKind();

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const currentPath = `${window.location.pathname}${window.location.search}`;
        const trimmed = currentPath.replace(/^\//, '');
        if (trimmed && trimmed !== 'AuthLoading') {
          if (!token) {
            if (isProtectedWebPath(trimmed)) {
              await storeAuthReturnUrl(currentPath);
              resetToSignIn(navigation);
              return;
            }
            if (resetNavigationToCanonicalPath(navigation, currentPath)) {
              return;
            }
            return;
          }

          // Shop users must not land in the client Home shell via /dashboard.
          if ((isPartner || isOrgOnly) && isClientDashboardPath(currentPath)) {
            const route = await resolveShopEntryRoute();
            navigation.reset(buildShopAuthReset(route));
            return;
          }

          if (resetNavigationToCanonicalPath(navigation, currentPath)) {
            return;
          }
        }
      }

      if (token) {
        if (isPartner || isOrgOnly) {
          const returnPath = await consumeAuthReturnUrl();
          if (returnPath && resetNavigationToCanonicalPath(navigation, returnPath)) {
            return;
          }
          const route = await resolveShopEntryRoute();
          navigation.reset(buildShopAuthReset(route));
        } else {
          resetToClientDashboard(navigation);
        }
      } else {
        // Unauthenticated web root should go to localized sign-in.
        resetToSignIn(navigation);
      }
    };

    checkAuth();
  }, [navigation]);

  return (
    <ScreenBackground>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
