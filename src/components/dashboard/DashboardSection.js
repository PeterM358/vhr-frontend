import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';

export default function DashboardSection({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
  style,
}) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onActionPress ? (
          <Button mode="text" compact onPress={onActionPress} labelStyle={styles.actionLabel}>
            {actionLabel}
          </Button>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    lineHeight: 18,
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
