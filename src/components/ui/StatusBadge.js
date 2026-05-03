// PATH: src/components/ui/StatusBadge.js
//
// Small pill that displays a repair / offer status with a sensible color.
// The color map only covers UI styling — it never alters or invents status
// values; unknown statuses simply fall back to the muted neutral style.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PALETTE = {
  open:      { bg: 'rgba(37,99,235,0.16)',  fg: '#1D4ED8' }, // primary blue
  ongoing:   { bg: 'rgba(245,158,11,0.18)', fg: '#B45309' }, // amber
  done:      { bg: 'rgba(22,163,74,0.18)',  fg: '#15803D' }, // green
  completed: { bg: 'rgba(22,163,74,0.18)',  fg: '#15803D' },
  closed:    { bg: 'rgba(100,116,139,0.18)', fg: '#334155' }, // slate
  cancelled: { bg: 'rgba(220,38,38,0.18)',  fg: '#B91C1C' }, // red
  rejected:  { bg: 'rgba(220,38,38,0.18)',  fg: '#B91C1C' },
  pending:   { bg: 'rgba(2,132,199,0.18)',  fg: '#075985' },
};

const FALLBACK = { bg: 'rgba(100,116,139,0.18)', fg: '#334155' };

export default function StatusBadge({ status, style, textStyle }) {
  const key = String(status ?? '').toLowerCase().trim();
  const tone = PALETTE[key] ?? FALLBACK;

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }, style]}>
      <Text style={[styles.text, { color: tone.fg }, textStyle]}>
        {String(status ?? '').toUpperCase() || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
