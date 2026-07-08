import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Platform } from 'react-native';
import { LOCALE_OPTIONS, useTranslation } from '../../i18n';
import { switchLanguageInPath } from '../../navigation/localizedRoutes';

export default function LanguagePicker({ style }) {
  const { t, locale, setLocale } = useTranslation();

  const handleChange = async (value) => {
    const nextLocale = await setLocale(value);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const current = window.location.pathname + window.location.search + window.location.hash;
      const nextPath = switchLanguageInPath(current, nextLocale);
      window.history.replaceState(window.history.state, '', nextPath);
    }
  };

  return (
    <View style={[styles.wrap, style]}>
      <Text variant="labelLarge" style={styles.label}>
        {t('language.label')}
      </Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={locale}
          onValueChange={handleChange}
          style={styles.picker}
        >
          {LOCALE_OPTIONS.map((option) => (
            <Picker.Item
              key={option.value}
              label={t(option.labelKey)}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  label: {
    marginBottom: 4,
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  picker: {
    width: '100%',
  },
});
