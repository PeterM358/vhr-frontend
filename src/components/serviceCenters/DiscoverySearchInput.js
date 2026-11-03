/**
 * Local draft for discovery search so typing does not re-render the map / shop list
 * on every keystroke. Optional city autocomplete while typing (BG/EN).
 */
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { searchDiscoveryCities } from '../../api/profiles';
import { formatCitySuggestionLabel } from '../../utils/discoverySearch';
import { useTranslation } from '../../i18n';

const SUGGEST_DEBOUNCE_MS = 280;

const DiscoverySearchInput = forwardRef(function DiscoverySearchInput(
  {
    committedValue = '',
    onSubmit,
    onSelectCity,
    placeholder,
    wrapStyle,
    inputStyle,
    iconColor = '#64748b',
    placeholderTextColor = '#94a3b8',
    returnKeyType = 'search',
    testID,
    enableCitySuggest = true,
  },
  ref,
) {
  const { t, locale } = useTranslation();
  const [draft, setDraft] = useState(() => String(committedValue || ''));
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setDraft(String(committedValue || ''));
  }, [committedValue]);

  useImperativeHandle(
    ref,
    () => ({
      getDraft: () => draft,
      submit: () => onSubmit?.(draft),
      clearSuggestions: () => {
        setSuggestions([]);
        setSuggestOpen(false);
      },
    }),
    [draft, onSubmit],
  );

  const fetchSuggestions = useCallback(
    async (term) => {
      const q = String(term || '').trim();
      if (!enableCitySuggest || q.length < 2) {
        setSuggestions([]);
        setSuggestOpen(false);
        setSuggestLoading(false);
        return;
      }
      const reqId = ++requestIdRef.current;
      setSuggestLoading(true);
      try {
        const cities = await searchDiscoveryCities(q, { country: 'BG', limit: 8 });
        if (reqId !== requestIdRef.current) return;
        setSuggestions(Array.isArray(cities) ? cities : []);
        setSuggestOpen(true);
      } catch {
        if (reqId !== requestIdRef.current) return;
        setSuggestions([]);
        setSuggestOpen(false);
      } finally {
        if (reqId === requestIdRef.current) setSuggestLoading(false);
      }
    },
    [enableCitySuggest],
  );

  const handleChangeText = useCallback(
    (text) => {
      setDraft(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(text).catch(() => {});
      }, SUGGEST_DEBOUNCE_MS);
    },
    [fetchSuggestions],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const handleSelectSuggestion = useCallback(
    (city) => {
      const label = city?.name || formatCitySuggestionLabel(city, locale) || '';
      setDraft(label);
      setSuggestions([]);
      setSuggestOpen(false);
      if (typeof onSelectCity === 'function') {
        onSelectCity(city);
        return;
      }
      onSubmit?.(label);
    },
    [locale, onSelectCity, onSubmit],
  );

  const handleSubmit = useCallback(() => {
    setSuggestOpen(false);
    onSubmit?.(draft);
  }, [draft, onSubmit]);

  return (
    <View style={wrapStyle}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="magnify" size={18} color={iconColor} style={styles.searchIcon} />
        <TextInput
          testID={testID}
          placeholder={placeholder}
          value={draft}
          onChangeText={handleChangeText}
          onSubmitEditing={handleSubmit}
          onFocus={() => {
            if (suggestions.length) setSuggestOpen(true);
          }}
          style={inputStyle}
          returnKeyType={returnKeyType}
          placeholderTextColor={placeholderTextColor}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {suggestLoading ? (
          <ActivityIndicator size="small" color={iconColor} style={styles.spinner} />
        ) : null}
      </View>
      {suggestOpen && suggestions.length ? (
        <View style={styles.suggestBox}>
          <Text style={styles.suggestHint}>{t('serviceCenters.citySuggestions')}</Text>
          {suggestions.map((city) => (
            <Pressable
              key={city.id || city.slug_en || city.name}
              onPress={() => handleSelectSuggestion(city)}
              style={({ pressed }) => [styles.suggestRow, pressed && styles.suggestRowPressed]}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#64748b" />
              <Text style={styles.suggestText} numberOfLines={1}>
                {formatCitySuggestionLabel(city, locale)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  searchIcon: { marginRight: 6 },
  spinner: { marginLeft: 6 },
  suggestBox: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.12)',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  suggestHint: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  suggestRowPressed: {
    backgroundColor: 'rgba(37,99,235,0.06)',
  },
  suggestText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
});

export default memo(DiscoverySearchInput);
