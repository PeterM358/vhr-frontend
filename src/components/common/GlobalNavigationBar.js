/**
 * Client drawer home — floating glass nav with menu, title, notifications, logout.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge } from 'react-native-paper';
import Logo from '../../assets/images/logo.svg';
import AppNavigationBar from './AppNavigationBar';
import GlassNavIconButton from '../navigation/GlassNavIconButton';

const NAV_LOGO_SIZE = 26;

export default function GlobalNavigationBar({
  title,
  unreadNotifications = 0,
  onMenuPress,
  onNotificationsPress,
  onLogoutPress,
  scrolled = false,
}) {
  return (
    <AppNavigationBar
      showBack={false}
      title={title}
      scrolled={scrolled}
      leftAction={
        <View style={styles.leftRow}>
          <GlassNavIconButton
            icon="menu"
            onPress={onMenuPress}
            accessibilityLabel="Open menu"
          />
          <Logo
            width={NAV_LOGO_SIZE}
            height={NAV_LOGO_SIZE}
            style={styles.navLogo}
            accessibilityLabel="Veversal"
          />
        </View>
      }
      rightAction={
        <View style={styles.rightRow}>
          <View style={styles.bellWrap}>
            <GlassNavIconButton
              icon="bell-outline"
              onPress={onNotificationsPress}
              accessibilityLabel="Notifications"
            />
            {unreadNotifications > 0 ? (
              <Badge style={styles.notificationBadge}>{unreadNotifications}</Badge>
            ) : null}
          </View>
          <GlassNavIconButton
            icon="logout"
            onPress={onLogoutPress}
            accessibilityLabel="Log out"
          />
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
  },
  navLogo: {
    opacity: 0.96,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bellWrap: {
    position: 'relative',
  },
  notificationBadge: {
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
