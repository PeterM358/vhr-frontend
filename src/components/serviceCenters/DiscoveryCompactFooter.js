import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CompactLanguageSelector from '../common/CompactLanguageSelector';
import { useTranslation } from '../../i18n';
import DISCOVERY_MOBILE from './discoveryMobileTokens';

/**
 * Scoped compact footer for discovery screens — does not affect global AppFooter.
 */
export default function DiscoveryCompactFooter({ style }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const links = [
    t('footer.privacy'),
    t('footer.terms'),
    t('footer.support'),
  ];

  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(insets.bottom, 10) },
        style,
      ]}
      accessibilityRole={Platform.OS === 'web' ? 'contentinfo' : undefined}
    >
      <View style={styles.row}>
        {links.map((label, idx) => (
          <React.Fragment key={label}>
            <Text style={styles.link}>{label}</Text>
            {idx < links.length - 1 ? <Text style={styles.sep}>·</Text> : null}
          </React.Fragment>
        ))}
      </View>
      <View style={styles.langWrap}>
        <CompactLanguageSelector variant="light" compact presentation="modal" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    backgroundColor: DISCOVERY_MOBILE.color.surface,
    paddingTop: 12,
    paddingHorizontal: DISCOVERY_MOBILE.space.screenX,
    alignItems: 'center',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    fontSize: DISCOVERY_MOBILE.type.meta,
    fontWeight: '500',
    color: DISCOVERY_MOBILE.color.textMuted,
    lineHeight: 16,
  },
  sep: {
    fontSize: DISCOVERY_MOBILE.type.meta,
    color: DISCOVERY_MOBILE.color.textSubtle,
    marginHorizontal: 8,
  },
  langWrap: {
    alignItems: 'center',
  },
});
