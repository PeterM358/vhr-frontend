import React, { useCallback, useMemo } from 'react';
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

function getLangAbbr(locale) {
  const key = String(locale || '').trim().toLowerCase();
  return LOCALE_ABBR[key] || key.toUpperCase();
}

export default function CompactLanguageSelector({ variant = 'dark', compact = true, style }) {
  const { locale, setLocale } = useTranslation();

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

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, { borderColor: colors.wrapBorder, backgroundColor: colors.wrapBg }, style]}>
      {LOCALE_ORDER.map((l, idx) => {
        const active = locale === l;
        return (
          <React.Fragment key={l}>
            <Pressable
              onPress={() => handleSelect(l)}
              accessibilityRole="button"
              accessibilityLabel={`Switch language to ${l}`}
              style={({ pressed }) => [
                styles.langBtn,
                compact && styles.langBtnCompact,
                active && { opacity: 1 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.langText,
                  { color: active ? colors.textActive : colors.textInactive },
                  compact && styles.langTextCompact,
                  active && { fontWeight: '800' },
                ]}
              >
                {getLangAbbr(l)}
              </Text>
            </Pressable>
            {idx < LOCALE_ORDER.length - 1 ? (
              <Text style={[styles.sepText, { color: colors.sep }, compact && styles.sepTextCompact]}>|</Text>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 2,
    columnGap: 6,
    maxWidth: 220,
  },
  wrapCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    maxWidth: 180,
  },
  langBtn: {
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  langBtnCompact: {
    paddingVertical: 1,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  langTextCompact: {
    fontSize: 11,
  },
  sepText: {
    fontSize: 12,
    marginHorizontal: 2,
    fontWeight: '700',
  },
  sepTextCompact: {
    fontSize: 11,
  },
});

