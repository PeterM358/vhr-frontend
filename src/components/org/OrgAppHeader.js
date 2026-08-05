/**
 * Org workspace chrome: menu + calendar + notifications + profile + logout
 * (mirrors client/partner headers).
 *
 * Layout rule (match Bitulait home professionalism):
 * - Dashboard: hamburger + language on the left; action icons on the right — one row.
 * - Nested/detail: back on the left; language + action icons in one right cluster — no wrap/stack.
 */

import React, { useCallback, useContext } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import AppNavigationBar from '../common/AppNavigationBar';
import CompactLanguageSelector from '../common/CompactLanguageSelector';
import GlassNavIconButton from '../navigation/GlassNavIconButton';
import { AuthContext } from '../../context/AuthManager';
import { logout } from '../../api/auth';
import { useTranslation } from '../../i18n';
import useOrgHeaderChrome from '../../hooks/useOrgHeaderChrome';

export default function OrgAppHeader({
  title,
  subtitle,
  mode = 'dashboard',
  onBack,
  onTitlePress,
  showBack,
  backLabel,
  iconOnlyBack = true,
  rightAction,
  scrolled = false,
  compact = false,
  style,
  showCalendar = true,
  showNotifications = true,
  showProfile = true,
  loadCalendarBadge = true,
}) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const isDashboard = mode === 'dashboard';
  const chrome = useOrgHeaderChrome({
    loadCalendarBadge: showCalendar && loadCalendarBadge,
  });

  const handleLogout = useCallback(async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  }, [navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone]);

  const languageSelector = (
    <CompactLanguageSelector
      variant="dark"
      compact
      presentation={Platform.OS === 'web' ? 'portalDropdown' : 'modal'}
      style={styles.languageSelector}
    />
  );

  const iconActions = (
    <>
      {showCalendar ? (
        <View style={styles.iconWrap}>
          <GlassNavIconButton
            icon="calendar-month-outline"
            onPress={chrome.openCalendar}
            accessibilityLabel={t('org.chrome.calendar', null, 'Calendar')}
          />
          {chrome.calendarBadgeCount > 0 ? (
            <Badge style={styles.badge}>{chrome.calendarBadgeCount}</Badge>
          ) : null}
        </View>
      ) : null}
      {showNotifications ? (
        <View style={styles.iconWrap}>
          <GlassNavIconButton
            icon="bell-outline"
            onPress={chrome.openNotifications}
            accessibilityLabel={t('org.chrome.notifications', null, 'Notifications')}
          />
          {chrome.unreadCount > 0 ? <Badge style={styles.badge}>{chrome.unreadCount}</Badge> : null}
        </View>
      ) : null}
      {showProfile ? (
        <GlassNavIconButton
          icon="account-circle-outline"
          onPress={chrome.openProfile}
          accessibilityLabel={t('org.chrome.companyAccount', null, 'Company account')}
        />
      ) : null}
      {rightAction}
      <GlassNavIconButton
        icon="logout"
        onPress={handleLogout}
        accessibilityLabel={t('common.logout')}
      />
    </>
  );

  if (isDashboard) {
    return (
      <AppNavigationBar
        showBack={false}
        title={title}
        subtitle={subtitle}
        onTitlePress={onTitlePress}
        scrolled={scrolled}
        compact={compact}
        showLanguageSelector={false}
        style={style}
        leftAction={
          <View style={styles.leftRow}>
            <View style={styles.iconWrap}>
              <GlassNavIconButton
                icon="menu"
                onPress={chrome.openMenu}
                accessibilityLabel={t('common.menu', null, 'Open menu')}
              />
              {chrome.menuBadge > 0 ? <Badge style={styles.badge}>{chrome.menuBadge}</Badge> : null}
            </View>
            {languageSelector}
          </View>
        }
        rightAction={<View style={styles.rightRow}>{iconActions}</View>}
      />
    );
  }

  return (
    <AppNavigationBar
      title={title}
      subtitle={subtitle}
      showBack={showBack != null ? showBack : Boolean(onBack)}
      onBack={onBack}
      onTitlePress={onTitlePress}
      backLabel={backLabel}
      iconOnlyBack={iconOnlyBack}
      scrolled={scrolled}
      compact={compact}
      showLanguageSelector={false}
      style={style}
      rightAction={
        <View style={styles.rightRow}>
          {languageSelector}
          {iconActions}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  languageSelector: {
    maxWidth: 80,
    flexShrink: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
    justifyContent: 'flex-end',
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: 10,
    minWidth: 16,
    height: 16,
    lineHeight: 16,
  },
});
