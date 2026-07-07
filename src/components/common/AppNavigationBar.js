/**
 * Premium floating glass navigation — dark capsule over scrollable content.
 * Back bubble (BackHeaderButton) + centered title + optional right action.
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackHeaderButton from '../navigation/BackHeaderButton';
import {
  APP_NAV_BAR_CONTENT_HEIGHT,
  APP_NAV_BAR_LARGE_TITLE_EXTRA,
  APP_NAV_FLOAT_MARGIN_H,
  APP_NAV_FLOAT_PADDING_BOTTOM,
  APP_NAV_FLOAT_PADDING_TOP,
  APP_NAV_PILL_BORDER_RADIUS,
  appNavBarTotalHeight,
} from './appNavBarMetrics';

export { APP_NAV_BAR_CONTENT_HEIGHT, APP_NAV_BAR_LARGE_TITLE_EXTRA, appNavBarTotalHeight };

const VARIANT_STYLES = {
  glass: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    scrolledBackgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    scrolledBorderColor: 'rgba(255, 255, 255, 0.24)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255, 255, 255, 0.82)',
    backVariant: 'glass',
    showPill: true,
  },
  solid: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    scrolledBackgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    scrolledBorderColor: 'rgba(255, 255, 255, 0.26)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255, 255, 255, 0.82)',
    backVariant: 'glass',
    showPill: true,
  },
  transparent: {
    backgroundColor: 'transparent',
    scrolledBackgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderColor: 'transparent',
    scrolledBorderColor: 'rgba(255, 255, 255, 0.22)',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255, 255, 255, 0.82)',
    backVariant: 'glass',
    showPill: false,
  },
};

export default function AppNavigationBar({
  title,
  subtitle,
  showBack = true,
  backLabel = 'Back',
  onBack,
  leftAction,
  rightAction,
  variant = 'glass',
  largeTitle = false,
  scrolled = false,
  compact = false,
  style,
}) {
  const insets = useSafeAreaInsets();

  const theme = useMemo(() => VARIANT_STYLES[variant] || VARIANT_STYLES.glass, [variant]);

  const showPill = theme.showPill || scrolled;
  const pillBackground = scrolled ? theme.scrolledBackgroundColor : theme.backgroundColor;
  const pillBorder = scrolled ? theme.scrolledBorderColor : theme.borderColor;
  const showShadow = showPill && (scrolled || variant !== 'transparent');

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + (compact ? 6 : APP_NAV_FLOAT_PADDING_TOP),
          paddingHorizontal: compact ? 12 : APP_NAV_FLOAT_MARGIN_H,
          paddingBottom: compact ? 6 : APP_NAV_FLOAT_PADDING_BOTTOM,
        },
        style,
      ]}
      pointerEvents="box-none"
      accessibilityRole="header"
    >
      <View
        style={[
          styles.pill,
          compact && styles.pillCompact,
          showPill && {
            backgroundColor: pillBackground,
            borderColor: pillBorder,
          },
          !showPill && styles.pillBare,
          showShadow && styles.elevated,
        ]}
      >
        <View style={[styles.bar, compact && styles.barCompact, largeTitle && styles.barLarge]}>
          <View style={[styles.sideSlot, compact && styles.sideSlotCompact]}>
            {leftAction ??
              (showBack && onBack ? (
                <BackHeaderButton
                  onPress={onBack}
                  label={backLabel}
                  variant={theme.backVariant}
                  accessibilityLabel={`Back to ${backLabel}`}
                />
              ) : null)}
          </View>

          {!largeTitle ? (
            <View pointerEvents="none" style={styles.titleWrap}>
              <Text style={[styles.title, compact && styles.titleCompact, { color: theme.titleColor }]} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.subtitle, { color: theme.subtitleColor }]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.largeTitleSpacer} />
          )}

          <View style={[styles.sideSlot, styles.sideSlotRight, compact && styles.sideSlotCompact]}>
            {rightAction ?? null}
          </View>
        </View>

        {largeTitle && title ? (
          <View style={styles.largeTitleBlock}>
            <Text style={[styles.largeTitle, { color: theme.titleColor }]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.subtitle, styles.largeSubtitle, { color: theme.subtitleColor }]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 50,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { position: 'sticky', top: 0 },
      default: {},
    }),
  },
  pill: {
    borderRadius: APP_NAV_PILL_BORDER_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pillCompact: {
    borderRadius: 20,
  },
  pillBare: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
  },
  elevated: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {
      boxShadow: '0 8px 28px rgba(0, 0, 0, 0.32)',
    },
  }),
  bar: {
    minHeight: APP_NAV_BAR_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  barCompact: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  barLarge: {
    minHeight: 40,
  },
  sideSlot: {
    width: 112,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  sideSlotCompact: {
    width: 96,
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  titleCompact: {
    fontSize: 17,
    letterSpacing: -0.25,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  largeTitleSpacer: {
    flex: 1,
  },
  largeTitleBlock: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  largeSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});
