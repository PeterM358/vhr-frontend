/**
 * Brand card + public escape on Login/Register.
 * Back prefers history when appropriate; Browse always opens the map/public discovery.
 */
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import BackHeaderButton from '../navigation/BackHeaderButton';
import DashboardCard from '../dashboard/DashboardCard';
import AuthLanguageSelector from './AuthLanguageSelector';
import BrandLogo from '../BrandLogo';
import BaseStyles from '../../styles/base';
import { BRAND_LOCKUP_ASPECT, IMAGES } from '../../constants/images';
import {
  leaveAuthToPublic,
  resolveAuthPublicEscape,
} from '../../navigation/authNavigation';
import { useTranslation } from '../../i18n';

/** Full brand lockup width; height follows 512×720 intrinsic ratio. */
const LOGIN_BRAND_WIDTH = 220;
const LOGIN_BRAND_HEIGHT = Math.round(LOGIN_BRAND_WIDTH * BRAND_LOCKUP_ASPECT);

export default function AuthPublicEscape({ preferLoginBack = false, title }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();

  const escape = useMemo(() => resolveAuthPublicEscape(navigation), [navigation]);

  const onBack = useCallback(() => {
    if (preferLoginBack && navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    leaveAuthToPublic(navigation);
  }, [navigation, preferLoginBack]);

  const onBrowse = useCallback(() => {
    leaveAuthToPublic(navigation, { forceMap: true });
  }, [navigation]);

  const backLabel =
    escape.kind === 'map'
      ? t('auth.backToMap')
      : escape.kind === 'home'
        ? t('common.home')
        : t('navigation.back');

  return (
    <DashboardCard style={styles.brandCard}>
      <View style={styles.backRow}>
        <BackHeaderButton
          onPress={onBack}
          label={backLabel}
          variant="glass"
          iconOnly
          accessibilityLabel={backLabel}
        />
      </View>

      <View style={BaseStyles.logoContainer}>
        <BrandLogo
          source={IMAGES.brandLogin}
          width={LOGIN_BRAND_WIDTH}
          height={LOGIN_BRAND_HEIGHT}
          accessibilityLabel="Veversal"
        />
      </View>

      <AuthLanguageSelector style={styles.langSelector} />

      {title ? <Text style={styles.title}>{title}</Text> : null}

      <Button
        mode="contained"
        onPress={onBrowse}
        accessibilityRole="button"
        accessibilityLabel={t('auth.browseServiceCenters')}
        style={[BaseStyles.loginButton, styles.browseBtn]}
        contentStyle={BaseStyles.loginButtonContent}
        labelStyle={BaseStyles.loginButtonLabel}
        buttonColor={theme.colors.primary}
      >
        {t('auth.browseServiceCenters')}
      </Button>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    marginBottom: 14,
  },
  backRow: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    marginLeft: -4,
  },
  langSelector: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  browseBtn: {
    width: '100%',
    alignSelf: 'center',
    marginVertical: 0,
    marginTop: 4,
  },
});
