// PATH: src/components/shop/NotificationsWithAppbar.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationsList from './NotificationsList';

export default function NotificationsWithAppbar({ navigation }) {
  return (
    <View style={styles.container}>
      <NotificationsList navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});