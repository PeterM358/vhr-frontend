// PATH: src/components/shop/NotificationsWithAppbar.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import NotificationsList from './NotificationsList';

export default function NotificationsWithAppbar({ navigation }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <NotificationsList navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});