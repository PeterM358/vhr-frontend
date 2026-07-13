/**
 * Client drawer home — floating glass nav with menu, title, notifications, logout.
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Badge } from 'react-native-paper';
import AppNavigationBar from './AppNavigationBar';
import GlassNavIconButton from '../navigation/GlassNavIconButton';
import CompactLanguageSelector from './CompactLanguageSelector';

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
      showLanguageSelector={false}
      leftAction={
        <View style={styles.leftRow}>
          <GlassNavIconButton
            icon="menu"
            onPress={onMenuPress}
            accessibilityLabel="Open menu"
          />
          <CompactLanguageSelector
            variant="dark"
            compact
            presentation={Platform.OS === 'web' ? 'portalDropdown' : 'modal'}
            style={styles.languageSelector}
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
    flexWrap: 'wrap',
  },
  languageSelector: {
    maxWidth: 92,
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
