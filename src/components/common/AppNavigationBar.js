/**
 * Global glass navigation bar — iOS Settings style.
 * Sticky on web; safe-area aware on native. Readable title over light content.
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BackHeaderButton from '../navigation/BackHeaderButton';

export const APP_NAV_BAR_CONTENT_HEIGHT = 44;
export const APP_NAV_BAR_LARGE_TITLE_EXTRA = 28;

const VARIANT_STYLES = {
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderColor: 'rgba(15, 23, 42, 0.08)',
    titleColor: '#0f172a',
    subtitleColor: '#475569',
    backVariant: 'light',
  },
  solid: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderColor: 'rgba(15, 23, 42, 0.1)',
    titleColor: '#0f172a',
    subtitleColor: '#475569',
    backVariant: 'light',
  },
  transparent: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    titleColor: '#ffffff',
    subtitleColor: 'rgba(255, 255, 255, 0.82)',
    backVariant: 'glass',
  },
};

const SCROLLED_VARIANT_STYLES = {
  transparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(15, 23, 42, 0.1)',
    titleColor: '#0f172a',
    subtitleColor: '#475569',
    backVariant: 'light',
  },
};

export function appNavBarTotalHeight(insets, { largeTitle = false } = {}) {
  const top = insets?.top ?? 0;
  const extra = largeTitle ? APP_NAV_BAR_LARGE_TITLE_EXTRA : 0;
  return top + APP_NAV_BAR_CONTENT_HEIGHT + extra;
}

export default function AppNavigationBar({
  title,
  subtitle,
  showBack = true,
  backLabel = 'Back',
  onBack,
  rightAction,
  variant = 'glass',
  sticky = true,
  largeTitle = false,
  scrolled = false,
  style,
}) {
  const insets = useSafeAreaInsets();

  const theme = useMemo(() => {
    const base = VARIANT_STYLES[variant] || VARIANT_STYLES.glass;
    if (scrolled && SCROLLED_VARIANT_STYLES[variant]) {
      return { ...base, ...SCROLLED_VARIANT_STYLES[variant] };
    }
    return base;
  }, [variant, scrolled]);

  const showElevated = scrolled || variant === 'solid' || (variant === 'glass' && scrolled);

  return (
    <View
      style={[
        styles.root,
        sticky && styles.sticky,
        {
          paddingTop: insets.top,
          backgroundColor: theme.backgroundColor,
          borderBottomColor: showElevated ? theme.borderColor : 'transparent',
        },
        showElevated && styles.elevated,
        style,
      ]}
      accessibilityRole="header"
    >
      <View style={[styles.bar, largeTitle && styles.barLarge]}>
        <View style={styles.sideSlot}>
          {showBack && onBack ? (
            <BackHeaderButton
              onPress={onBack}
              label={backLabel}
              variant={theme.backVariant}
              accessibilityLabel={`Back to ${backLabel}`}
            />
          ) : null}
        </View>

        {!largeTitle ? (
          <View pointerEvents="none" style={styles.titleWrap}>
            <Text style={[styles.title, { color: theme.titleColor }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.subtitleColor }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.largeTitleSpacer} />
        )}

        <View style={[styles.sideSlot, styles.sideSlotRight]}>{rightAction ?? null}</View>
      </View>

      {largeTitle && title ? (
        <View style={styles.largeTitleBlock}>
          <Text style={[styles.largeTitle, { color: theme.titleColor }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, styles.largeSubtitle, { color: theme.subtitleColor }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sticky: Platform.select({
    web: { position: 'sticky', top: 0 },
    default: {},
  }),
  elevated: Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {
      boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
    },
  }),
  bar: {
    minHeight: APP_NAV_BAR_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  barLarge: {
    minHeight: 40,
  },
  sideSlot: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
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
    paddingBottom: 8,
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
