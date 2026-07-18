/**
 * Unified partner chrome: dashboard (menu/logout) or nested (back) + calendar + bell.
 * Wraps AppNavigationBar — does not replace DashboardHero.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Badge } from 'react-native-paper';

import AppNavigationBar from '../common/AppNavigationBar';
import CompactLanguageSelector from '../common/CompactLanguageSelector';
import GlassNavIconButton from '../navigation/GlassNavIconButton';
import usePartnerHeaderChrome from '../../hooks/usePartnerHeaderChrome';

export default function PartnerAppHeader({
  title,
  subtitle,
  mode = 'nested',
  showBack,
  backLabel = 'Back',
  onBack,
  iconOnlyBack = true,
  onTitlePress,
  showCalendar = true,
  showNotifications = true,
  showLogout = mode === 'dashboard',
  showMenu = mode === 'dashboard',
  calendarBadgeCount: calendarBadgeProp,
  unreadCount: unreadProp,
  onCalendarPress,
  onNotificationsPress,
  onLogoutPress,
  onMenuPress,
  rightAction,
  scrolled = false,
  compact = false,
  loadCalendarBadge = true,
  style,
  ...rest
}) {
  const isDashboard = mode === 'dashboard';
  const chrome = usePartnerHeaderChrome({
    loadCalendarBadge: showCalendar && loadCalendarBadge && calendarBadgeProp == null,
    refreshCalendarBadge: isDashboard,
  });

  const unreadCount = unreadProp != null ? unreadProp : chrome.unreadCount;
  const calendarBadgeCount =
    calendarBadgeProp != null ? calendarBadgeProp : chrome.calendarBadgeCount;
  const handleCalendar = onCalendarPress || chrome.openCalendar;
  const handleNotifications = onNotificationsPress || chrome.openNotifications;
  const handleMenu = onMenuPress || chrome.openMenu;

  const chromeActions = (
    <View style={styles.rightRow}>
      {showCalendar ? (
        <View style={styles.iconWrap}>
          <GlassNavIconButton
            icon="calendar-month-outline"
            onPress={handleCalendar}
            accessibilityLabel="Calendar"
          />
          {calendarBadgeCount > 0 ? (
            <Badge style={styles.badge}>{calendarBadgeCount}</Badge>
          ) : null}
        </View>
      ) : null}
      {showNotifications ? (
        <View style={styles.iconWrap}>
          <GlassNavIconButton
            icon="bell-outline"
            onPress={handleNotifications}
            accessibilityLabel="Notifications"
          />
          {unreadCount > 0 ? <Badge style={styles.badge}>{unreadCount}</Badge> : null}
        </View>
      ) : null}
      {onTitlePress ? (
        <GlassNavIconButton
          icon="storefront-outline"
          onPress={onTitlePress}
          accessibilityLabel="Open center details"
        />
      ) : null}
      {showLogout && onLogoutPress ? (
        <GlassNavIconButton
          icon="logout"
          onPress={onLogoutPress}
          accessibilityLabel="Log out"
        />
      ) : null}
      {rightAction}
    </View>
  );

  if (isDashboard) {
    return (
      <AppNavigationBar
        showBack={false}
        title={title}
        subtitle={subtitle}
        scrolled={scrolled}
        compact={compact}
        showLanguageSelector={false}
        style={style}
        leftAction={
          <View style={styles.leftRow}>
            {showMenu ? (
              <GlassNavIconButton
                icon="menu"
                onPress={handleMenu}
                accessibilityLabel="Open menu"
              />
            ) : null}
            <CompactLanguageSelector
              variant="dark"
              compact
              presentation={Platform.OS === 'web' ? 'portalDropdown' : 'modal'}
              style={styles.languageSelector}
            />
          </View>
        }
        rightAction={chromeActions}
        {...rest}
      />
    );
  }

  return (
    <AppNavigationBar
      title={title}
      subtitle={subtitle}
      showBack={showBack != null ? showBack : Boolean(onBack)}
      backLabel={backLabel}
      onBack={onBack}
      iconOnlyBack={iconOnlyBack}
      scrolled={scrolled}
      compact={compact}
      rightAction={chromeActions}
      style={style}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  languageSelector: {
    maxWidth: 92,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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
