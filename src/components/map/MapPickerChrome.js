/**
 * Full-screen map overlay header — single back control + readable title (no stack header).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import BackHeaderButton from '../navigation/BackHeaderButton';

export default function MapPickerChrome({ topInset, title, onBack, rightAction = null }) {
  return (
    <View style={[styles.bar, { paddingTop: topInset + 8 }]} pointerEvents="box-none">
      <BackHeaderButton onPress={onBack} label="Back" variant="glass" />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.rightSlot}>{rightAction}</View>
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
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  rightSlot: {
    minWidth: 96,
    maxWidth: 120,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
