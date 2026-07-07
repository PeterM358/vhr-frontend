// Semi-transparent dark glass shell — matches dashboard hero / action tiles.
// Single source of truth for dark panels on ScreenBackground (dashboard + auth).

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

/** Shared shell tokens for dashboard-style dark cards. */
export const dashboardCardShell = {
  backgroundColor: COLORS.CARD_DARK,
  borderColor: COLORS.BORDER_SOFT,
  borderWidth: 1,
  borderRadius: 20,
  paddingVertical: 20,
  paddingHorizontal: 18,
};

export default function DashboardCard({ children, style, contentStyle, ...rest }) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {contentStyle ? <View style={contentStyle}>{children}</View> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...dashboardCardShell,
  },
});
