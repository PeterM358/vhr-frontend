import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTranslation } from '../../i18n';

/**
 * Lightweight, authenticated-only app footer.
 *
 * Notes for future expansion:
 * - All entries are plain text placeholders (no navigation logic).
 * - Grouping is done via arrays so you can later swap Text for Link components
 *   without changing the footer's layout structure.
 */
export default function AppFooter() {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const isMobile = width < 768;

  const desktopMain = useMemo(
    () => [
      t('footer.copyright'),
      t('footer.privacy'),
      t('footer.terms'),
      t('footer.contact'),
      t('footer.support'),
      t('footer.version'),
    ],
    [t]
  );

  const mobileMain = useMemo(
    () => [
      t('footer.privacy'),
      t('footer.terms'),
      t('footer.support'),
      t('footer.versionMobile'),
    ],
    [t]
  );

  const placeholderLinks = useMemo(
    () => [
      t('footer.privacyPolicy'),
      t('footer.termsOfService'),
      t('footer.cookiePolicy'),
      t('footer.contact'),
      t('footer.helpCenter'),
      t('footer.faq'),
      t('footer.careers'),
      t('footer.about'),
      t('footer.twitter'),
      t('footer.instagram'),
      t('footer.linkedin'),
      t('footer.facebook'),
      t('footer.youtube'),
      t('footer.github'),
      t('footer.blog'),
      t('footer.apiDocs'),
      t('footer.languageRegion'),
    ],
    [t]
  );

  const mainItems = isMobile ? mobileMain : desktopMain;

  return (
    <View
      style={[
        styles.footer,
        isMobile ? styles.footerMobile : null,
        Platform.OS === 'web' ? styles.glass : null,
      ]}
      accessibilityRole={Platform.OS === 'web' ? 'contentinfo' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.mainRow}>
          {mainItems.map((label, idx) => (
            <React.Fragment key={`${label}-${idx}`}>
              <Text style={styles.mainText}>{label}</Text>
              {idx < mainItems.length - 1 ? <Text style={styles.separator}>|</Text> : null}
            </React.Fragment>
          ))}
        </View>

        <View style={styles.placeholderRow}>
          {placeholderLinks.map((label, idx) => (
            <React.Fragment key={`${label}-${idx}`}>
              <Text style={styles.placeholderText}>{label}</Text>
              {idx < placeholderLinks.length - 1 ? <Text style={styles.separator}>|</Text> : null}
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(15, 23, 42, 0.54)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  footerMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  glass: {
    backdropFilter: 'saturate(180%) blur(18px)',
    WebkitBackdropFilter: 'saturate(180%) blur(18px)',
  },
  inner: {
    maxWidth: 1020,
    alignSelf: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  separator: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginHorizontal: 6,
  },
  placeholderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
});
