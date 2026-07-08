import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, Text } from 'react-native';
import { useTranslation } from '../../i18n';
import { switchLanguageInPath } from '../../navigation/localizedRoutes';

const LOCALE_ORDER = ['bg', 'en', 'de', 'it', 'fr', 'es'];
const LOCALE_ABBR = {
  bg: 'BG',
  en: 'EN',
  de: 'DE',
  it: 'IT',
  fr: 'FR',
  es: 'ES',
};

const LOCALE_LABELS = {
  bg: 'Български',
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
  fr: 'Français',
  es: 'Español',
};

function getLangAbbr(locale) {
  const key = String(locale || '').trim().toLowerCase();
  return LOCALE_ABBR[key] || key.toUpperCase();
}

export default function CompactLanguageSelector({
  variant = 'dark',
  compact = true,
  style,
  showFullLabel = false,
}) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const colors = useMemo(() => {
    if (variant === 'light') {
      return {
        wrapBg: 'rgba(255,255,255,0.92)',
        wrapBorder: '#cbd5e1',
        textInactive: 'rgba(15,23,42,0.65)',
        textActive: '#0f172a',
        sep: 'rgba(100,116,139,0.75)',
      };
    }

    return {
      wrapBg: 'rgba(15, 23, 42, 0.42)',
      wrapBorder: 'rgba(148, 163, 184, 0.35)',
      textInactive: 'rgba(255,255,255,0.72)',
      textActive: '#ffffff',
      sep: 'rgba(148, 163, 184, 0.9)',
    };
  }, [variant]);

  const currentLocaleKey = useMemo(() => {
    const key = String(locale || '').trim().toLowerCase();
    return LOCALE_ORDER.includes(key) ? key : locale;
  }, [locale]);

  const handleSelect = useCallback(
    async (nextLocale) => {
      if (!nextLocale || nextLocale === locale) return;
      const savedLocale = await setLocale(nextLocale);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const current = window.location.pathname + window.location.search + window.location.hash;
        const nextPath = switchLanguageInPath(current, savedLocale || nextLocale);
        // Replace URL (no history push) so browser back doesn’t jump.
        window.history.replaceState(window.history.state, '', nextPath);
      }
    },
    [locale, setLocale]
  );

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document === 'undefined') return;
    if (!open) return;

    const handleClickOutside = (event) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains?.(event.target)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const currentLabel = useMemo(() => {
    if (!currentLocaleKey) return '';
    if (showFullLabel) {
      return LOCALE_LABELS[currentLocaleKey] || LOCALE_LABELS[locale] || currentLocaleKey.toUpperCase();
    }
    return getLangAbbr(currentLocaleKey);
  }, [currentLocaleKey, locale, showFullLabel]);

  return (
    <View
      ref={rootRef}
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        { borderColor: colors.wrapBorder, backgroundColor: colors.wrapBg },
        style,
      ]}
    >
      <Pressable
        onPress={toggleOpen}
        accessibilityRole="button"
        accessibilityLabel="Open language selector"
        style={({ pressed }) => [
          styles.trigger,
          compact && styles.triggerCompact,
          pressed && styles.triggerPressed,
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            compact && styles.triggerTextCompact,
            { color: colors.textActive },
          ]}
          numberOfLines={1}
        >
          <Text style={styles.globe}>🌐 </Text>
          {currentLabel}{' '}
          <Text style={styles.caret}>▾</Text>
        </Text>
      </Pressable>

      {open ? (
        <View
          style={[
            styles.dropdown,
            {
              borderColor: colors.wrapBorder,
              backgroundColor: colors.wrapBg,
            },
          ]}
        >
          {LOCALE_ORDER.map((l) => {
            const active = locale === l;
            const label = showFullLabel ? LOCALE_LABELS[l] : getLangAbbr(l);
            return (
              <Pressable
                key={l}
                onPress={() => {
                  setOpen(false);
                  handleSelect(l);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Switch language to ${label}`}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  active && styles.dropdownItemActive,
                  pressed && styles.dropdownItemPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    active && styles.dropdownItemTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 200,
    position: 'relative',
    justifyContent: 'center',
  },
  wrapCompact: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 160,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerCompact: {},
  triggerPressed: {
    opacity: 0.9,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  triggerTextCompact: {
    fontSize: 11,
  },
  globe: {
    fontSize: 11,
  },
  caret: {
    fontSize: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    zIndex: 100,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
  },
  dropdownItemPressed: {
    opacity: 0.9,
  },
  dropdownItemText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.86)',
  },
  dropdownItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

