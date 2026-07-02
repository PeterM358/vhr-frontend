import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import Logo from '../../assets/images/logo.svg';

export default function DashboardHero({
  title,
  subtitle,
  primaryLabel,
  onPrimaryPress,
  primaryIcon,
  secondaryLabel,
  onSecondaryPress,
  secondaryIcon,
  compact = false,
}) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Logo width={compact ? 56 : 72} height={compact ? 56 : 72} style={styles.logo} />
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {primaryLabel && onPrimaryPress ? (
        <Button
          mode="contained"
          icon={primaryIcon}
          onPress={onPrimaryPress}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          {primaryLabel}
        </Button>
      ) : null}

      {secondaryLabel && onSecondaryPress ? (
        <Button
          mode="outlined"
          icon={secondaryIcon}
          onPress={onSecondaryPress}
          style={styles.secondaryButton}
          textColor="#fff"
          labelStyle={styles.secondaryLabel}
        >
          {secondaryLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(5,15,30,0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardCompact: {
    paddingVertical: 14,
  },
  logo: {
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 14,
    maxWidth: 520,
  },
  primaryButton: {
    alignSelf: 'stretch',
    borderRadius: 12,
    marginBottom: 8,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    borderRadius: 12,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  buttonContent: {
    height: 48,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLabel: {
    fontWeight: '600',
  },
});
