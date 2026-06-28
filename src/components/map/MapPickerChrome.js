/**
 * Full-screen map overlay header — single back control + readable title (no stack header).
 */

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function MapPickerChrome({ topInset, title, onBack }) {
  return (
    <View style={[styles.bar, { paddingTop: topInset + 8 }]} pointerEvents="box-none">
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingRight: 8,
  },
  backBtnPressed: { opacity: 0.85 },
  backLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 0,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  spacer: { width: 72 },
});
