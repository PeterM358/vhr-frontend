import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, Text } from 'react-native';
import { useTranslation } from '../../i18n';
import { switchLanguageInPath } from '../../navigation/localizedRoutes';
import LanguageSelectorModal from './LanguageSelectorModal';
import {
  LOCALE_FLAGS,
  LOCALE_LABELS,
  LOCALE_ORDER,
  getLangAbbr,
} from './languageSelectorConstants';

export default function CompactLanguageSelector({
  variant = 'dark',
  compact = true,
  presentation = 'dropdown',
  style,
  showFullLabel = false,
}) {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isModal = presentation === 'modal';
  const dropdownWidth = showFullLabel ? 220 : 180;

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
      wrapBg: '#07111f',
      wrapBorder: 'rgba(148,163,184,0.35)',
      textInactive: 'rgba(226,232,240,0.65)',
      textActive: '#ffffff',
    };
  }, [variant]);

  const currentLocaleKey = useMemo(() => {
    const key = String(locale || '').trim().toLowerCase();
    return LOCALE_ORDER.includes(key) ? key : locale;
  }, [locale]);

  const handleSelect = useCallback(
    async (nextLocale) => {
      if (!nextLocale || nextLocale === locale) {
        setOpen(false);
        return;
      }
      const savedLocale = await setLocale(nextLocale);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const current = window.location.pathname + window.location.search + window.location.hash;
        const nextPath = switchLanguageInPath(current, savedLocale || nextLocale);
        window.history.replaceState(window.history.state, '', nextPath);
      }
      setOpen(false);
    },
    [locale, setLocale]
  );

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (isModal) return;
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
  }, [open, isModal]);

  const currentLabel = useMemo(() => {
    if (!currentLocaleKey) return '';
    const flag = LOCALE_FLAGS[currentLocaleKey] || '';
    if (showFullLabel) {
      const label = LOCALE_LABELS[currentLocaleKey] || LOCALE_LABELS[locale] || currentLocaleKey.toUpperCase();
      return flag ? `${flag} ${label}` : label;
    }
    const abbr = getLangAbbr(currentLocaleKey);
    return flag ? `${flag} ${abbr}` : abbr;
  }, [currentLocaleKey, locale, showFullLabel]);

  const modalTitle = t('language.label');

  return (
    <>
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
            {currentLabel} <Text style={styles.caret}>▾</Text>
          </Text>
        </Pressable>

        {!isModal && open ? (
          <View
            style={[
              styles.dropdown,
              {
                width: dropdownWidth,
                borderColor: colors.wrapBorder,
                backgroundColor: colors.wrapBg,
                left: showFullLabel ? '50%' : 0,
                transform: showFullLabel ? [{ translateX: -dropdownWidth / 2 }] : undefined,
                marginTop: showFullLabel ? 10 : 6,
              },
            ]}
          >
            {LOCALE_ORDER.map((l) => {
              const active = locale === l;
              const flag = LOCALE_FLAGS[l] || '';
              const label = LOCALE_LABELS[l] || l;
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
                  <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                    {flag} {label}
                  </Text>
                  <Text style={[styles.checkmark, !active && styles.checkmarkHidden]}>✓</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {isModal ? (
        <LanguageSelectorModal
          visible={open}
          onClose={closeModal}
          locale={locale}
          onSelect={handleSelect}
          title={modalTitle}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  wrapCompact: {
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 220,
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
  caret: {
    fontSize: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
    elevation: 25,
    zIndex: 9999,
    boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(15,76,129, 0.55)',
  },
  dropdownItemPressed: {
    opacity: 0.9,
  },
  dropdownItemText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    flex: 1,
    paddingRight: 8,
  },
  dropdownItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 13,
    color: '#ffffff',
    marginLeft: 10,
  },
  checkmarkHidden: {
    opacity: 0,
  },
});
