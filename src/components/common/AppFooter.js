import React from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
  const isMobile = width < 768;

  const desktopMain = ['© Veversal', 'Privacy', 'Terms', 'Contact', 'Support', 'Version'];
  const mobileMain = ['Privacy', 'Terms', 'Support', 'Version x.x.x'];

  // Placeholder labels only (no links / no click handlers).
  const placeholderLinks = [
    'Privacy Policy',
    'Terms of Service',
    'Cookie Policy',
    'Contact',
    'Help Center',
    'FAQ',
    'Careers',
    'About',
    // social icons names (placeholders)
    'Twitter',
    'Instagram',
    'LinkedIn',
    'Facebook',
    'YouTube',
    // other future placeholders
    'GitHub',
    'Blog',
    'API Documentation',
    'Language/Region selector',
  ];

  const mainItems = isMobile ? mobileMain : desktopMain;

  return (
    <View
      style={[
        styles.footer,
        isMobile ? styles.footerMobile : null,
        Platform.OS === 'web' ? styles.glass : null,
      ]}
      accessibilityRole="contentinfo"
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

