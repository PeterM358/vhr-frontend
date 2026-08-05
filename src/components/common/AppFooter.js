import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useTranslation } from '../../i18n';
import { localizedPolicyPath, openPolicyPath } from '../../policies/policyPaths';
import { POLICY_SLUGS } from '../../policies/policySlugs';

const CONTACT_HREF = 'mailto:[SUPPORT_EMAIL_PLACEHOLDER]';

/**
 * Lightweight, authenticated-only app footer.
 * Policy links open in-app public policy pages (web navigation + deep paths).
 */
export default function AppFooter() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { t, locale } = useTranslation();
  const isMobile = width < 768;

  const openHref = (href, { internalPolicySlug } = {}) => {
    if (internalPolicySlug) {
      openPolicyPath(internalPolicySlug, navigation);
      return;
    }
    if (!href) return;
    if (Platform.OS === 'web' && href.startsWith('/')) {
      window.location.assign(localizedPolicyPath(href.replace(/^\//, ''), locale));
      return;
    }
    Linking.openURL(href).catch(() => {});
  };

  const desktopMain = useMemo(
    () => [
      { label: t('footer.copyright') },
      { label: t('footer.privacy'), policySlug: POLICY_SLUGS.privacy },
      { label: t('footer.terms'), policySlug: POLICY_SLUGS.terms },
      { label: t('footer.cookiePolicy'), policySlug: POLICY_SLUGS.cookies },
      { label: t('footer.contact'), href: CONTACT_HREF },
      { label: t('footer.support'), policySlug: POLICY_SLUGS.support },
      { label: t('footer.version') },
    ],
    [t]
  );

  const mobileMain = useMemo(
    () => [
      { label: t('footer.privacy'), policySlug: POLICY_SLUGS.privacy },
      { label: t('footer.terms'), policySlug: POLICY_SLUGS.terms },
      { label: t('footer.cookiePolicy'), policySlug: POLICY_SLUGS.cookies },
      { label: t('footer.support'), policySlug: POLICY_SLUGS.support },
      { label: t('footer.versionMobile') },
    ],
    [t]
  );

  const mainItems = isMobile ? mobileMain : desktopMain;

  const renderItem = (item, idx, items, textStyle) => {
    const isLink = Boolean(item.href || item.policySlug);
    return (
      <React.Fragment key={`${item.label}-${idx}`}>
        <Text
          style={[textStyle, isLink ? styles.linkText : null]}
          onPress={
            isLink
              ? () =>
                  openHref(item.href, {
                    internalPolicySlug: item.policySlug,
                  })
              : undefined
          }
          accessibilityRole={isLink ? 'link' : undefined}
        >
          {item.label}
        </Text>
        {idx < items.length - 1 ? <Text style={styles.separator}>|</Text> : null}
      </React.Fragment>
    );
  };

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
          {mainItems.map((item, idx) => renderItem(item, idx, mainItems, styles.mainText))}
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
  linkText: {
    textDecorationLine: 'underline',
    cursor: 'pointer',
  },
  separator: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginHorizontal: 6,
  },
});
