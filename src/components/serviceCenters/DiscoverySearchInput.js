/**
 * Local draft for discovery search so typing does not re-render the map / shop list
 * on every keystroke (critical on mobile web + Leaflet).
 */
import React, { forwardRef, memo, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const DiscoverySearchInput = forwardRef(function DiscoverySearchInput(
  {
    committedValue = '',
    onSubmit,
    placeholder,
    wrapStyle,
    inputStyle,
    iconColor = '#64748b',
    placeholderTextColor = '#94a3b8',
    returnKeyType = 'search',
    testID,
  },
  ref,
) {
  const [draft, setDraft] = useState(() => String(committedValue || ''));

  useEffect(() => {
    setDraft(String(committedValue || ''));
  }, [committedValue]);

  useImperativeHandle(
    ref,
    () => ({
      getDraft: () => draft,
      submit: () => onSubmit?.(draft),
    }),
    [draft, onSubmit],
  );

  return (
    <View style={wrapStyle}>
      <MaterialCommunityIcons name="magnify" size={18} color={iconColor} style={styles.searchIcon} />
      <TextInput
        testID={testID}
        placeholder={placeholder}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => onSubmit?.(draft)}
        style={inputStyle}
        returnKeyType={returnKeyType}
        placeholderTextColor={placeholderTextColor}
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  searchIcon: { marginRight: 6 },
});

export default memo(DiscoverySearchInput);
