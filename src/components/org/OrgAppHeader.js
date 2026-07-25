/**
 * Org workspace chrome: menu + logout always visible (mirrors client/partner headers).
 */

import React, { useCallback, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import AppNavigationBar from '../common/AppNavigationBar';
import GlassNavIconButton from '../navigation/GlassNavIconButton';
import { AuthContext } from '../../context/AuthManager';
import { logout } from '../../api/auth';
import { useTranslation } from '../../i18n';

export default function OrgAppHeader({
  title,
  subtitle,
  mode = 'dashboard',
  onBack,
  showBack,
  iconOnlyBack = true,
  rightAction,
  scrolled = false,
  compact = false,
  style,
}) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);

  const handleLogout = useCallback(async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  }, [navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone]);

  const openMenu = useCallback(() => {
    const drawer = navigation.getParent?.() || navigation;
    if (typeof drawer.openDrawer === 'function') {
      drawer.openDrawer();
      return;
    }
    navigation.openDrawer?.();
  }, [navigation]);

  const logoutButton = (
    <GlassNavIconButton
      icon="logout"
      onPress={handleLogout}
      accessibilityLabel={t('common.logout')}
    />
  );

  if (mode === 'dashboard') {
    return (
      <AppNavigationBar
        showBack={false}
        title={title}
        subtitle={subtitle}
        scrolled={scrolled}
        compact={compact}
        style={style}
        leftAction={
          <GlassNavIconButton
            icon="menu"
            onPress={openMenu}
            accessibilityLabel={t('common.menu', null, 'Open menu')}
          />
        }
        rightAction={
          <View style={styles.rightRow}>
            {rightAction}
            {logoutButton}
          </View>
        }
      />
    );
  }

  return (
    <AppNavigationBar
      title={title}
      subtitle={subtitle}
      showBack={showBack != null ? showBack : Boolean(onBack)}
      onBack={onBack}
      iconOnlyBack={iconOnlyBack}
      scrolled={scrolled}
      compact={compact}
      style={style}
      rightAction={
        <View style={styles.rightRow}>
          {rightAction}
          {logoutButton}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
});
