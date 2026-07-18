import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import ShopPublicPagePreview from './ShopPublicPagePreview';

const PREVIEW_TABS = [
  { key: 'desktop', enabled: true },
  { key: 'mobile', enabled: false },
  { key: 'google', enabled: false },
  { key: 'map_card', enabled: false },
];

/**
 * Future-ready public preview shell. Only Desktop is live; other tabs are placeholders.
 */
export default function ShopPublicPreviewTabs(props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('desktop');

  const tabLabel = (key) => {
    switch (key) {
      case 'desktop':
        return t('partnerProfile.previewTabDesktop');
      case 'mobile':
        return t('partnerProfile.previewTabMobile');
      case 'google':
        return t('partnerProfile.previewTabGoogle');
      case 'map_card':
        return t('partnerProfile.previewTabMapCard');
      default:
        return key;
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tabRow}>
        {PREVIEW_TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (!tab.enabled) return;
                setActiveTab(tab.key);
              }}
              style={[
                styles.tab,
                selected && styles.tabSelected,
                !tab.enabled && styles.tabDisabled,
              ]}
              accessibilityState={{ selected, disabled: !tab.enabled }}
            >
              <Text
                style={[
                  styles.tabText,
                  selected && styles.tabTextSelected,
                  !tab.enabled && styles.tabTextDisabled,
                ]}
              >
                {tabLabel(tab.key)}
              </Text>
              {!tab.enabled ? (
                <Text style={styles.soon}>{t('partnerProfile.comingSoon')}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'desktop' ? <ShopPublicPagePreview {...props} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  tabDisabled: {
    opacity: 0.72,
  },
  tabText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextSelected: {
    color: COLORS.PRIMARY,
  },
  tabTextDisabled: {
    color: COLORS.TEXT_MUTED,
  },
  soon: {
    color: COLORS.TEXT_MUTED,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
