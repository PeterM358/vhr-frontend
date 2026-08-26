import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useTranslation } from '../../i18n';
import { openPolicyPath } from '../../policies/policyPaths';
import { POLICY_SLUGS } from '../../policies/policySlugs';

/**
 * Compact public legal links for Login / Register (AppFooter is auth-only).
 */
export default function AuthLegalLinks({ style, tone = 'dark' }) {
  const navigation = useNavigation();
  const { t } = useTranslation();

  const links = useMemo(
    () => [
      { slug: POLICY_SLUGS.privacy, label: t('footer.privacy') },
      { slug: POLICY_SLUGS.terms, label: t('footer.terms') },
      { slug: POLICY_SLUGS.refund, label: t('footer.refund') },
      { slug: POLICY_SLUGS.cookies, label: t('footer.cookiePolicy') },
    ],
    [t]
  );

  const isLight = tone === 'light';

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole={Platform.OS === 'web' ? 'contentinfo' : undefined}
    >
      <View style={styles.row}>
        {links.map((link, idx) => (
          <React.Fragment key={link.slug}>
            <Pressable
              onPress={() => openPolicyPath(link.slug, navigation)}
              accessibilityRole="link"
              accessibilityLabel={link.label}
            >
              <Text style={[styles.link, isLight ? styles.linkLight : null]}>{link.label}</Text>
            </Pressable>
            {idx < links.length - 1 ? (
              <Text style={[styles.sep, isLight ? styles.sepLight : null]}>·</Text>
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    marginTop: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  link: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(226,232,240,0.78)',
    textDecorationLine: 'underline',
    lineHeight: 18,
  },
  linkLight: {
    color: '#64748b',
  },
  sep: {
    fontSize: 12,
    color: 'rgba(148,163,184,0.45)',
    marginHorizontal: 8,
    lineHeight: 18,
  },
  sepLight: {
    color: '#94a3b8',
  },
});
