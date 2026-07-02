import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

/** Partner empty state — explanatory copy only (no duplicate primary CTAs). */
export default function PartnerEmptyRequestsState() {
  return (
    <FloatingCard accent={false}>
      <Text style={styles.title}>No open requests from customers yet</Text>
      <Text style={styles.body}>
        Your Veversal public page helps customers find your service center in every supported language.
        Complete your profile, publish services and opening hours to start receiving requests.
      </Text>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
});
