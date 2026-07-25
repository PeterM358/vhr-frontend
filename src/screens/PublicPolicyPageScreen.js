import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PolicyDocumentView from '../components/policies/PolicyDocumentView';
import ScreenBackground from '../components/ScreenBackground';
import DashboardCard from '../components/dashboard/DashboardCard';
import AuthLanguageSelector from '../components/auth/AuthLanguageSelector';
import { useTranslation } from '../i18n';
import { getPolicyLocaleContent } from '../policies/policyRegistry';
import { FOOTER_POLICY_LINKS, localizedPolicyPath, openPolicyPath } from '../policies/policyPaths';
import { applySeoPageMeta } from '../utils/seo/seoMetadata';

export default function PublicPolicyPageScreen({ route, navigation }) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const policyKey = String(route?.params?.policyKey || route?.params?.policySlug || '').trim().toLowerCase();
  const payload = useMemo(() => getPolicyLocaleContent(policyKey, locale), [policyKey, locale]);

  React.useEffect(() => {
    if (Platform.OS !== 'web' || !payload?.content?.title) return;
    applySeoPageMeta(
      {
        title: `${payload.content.title} | Veversal`,
        description: t('policies.seoDescription', { title: payload.content.title }),
        robots: 'index,follow',
      },
      null
    );
  }, [payload, t]);

  if (!payload) {
    return (
      <ScreenBackground routeName="PublicPolicyPage">
        <View style={[styles.centered, { paddingTop: insets.top + 24 }]}>
          <DashboardCard>
            <Text variant="titleMedium">{t('policies.notFound')}</Text>
            <Button mode="contained" onPress={() => navigation.navigate('PublicHome')} style={styles.button}>
              {t('policies.backToHome')}
            </Button>
          </DashboardCard>
        </View>
      </ScreenBackground>
    );
  }

  const switchLocalePath = localizedPolicyPath(policyKey, payload.alternateLocale);

  return (
    <ScreenBackground routeName="PublicPolicyPage" contentMaxWidth={840}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBar}>
          <Button mode="text" onPress={() => navigation.navigate('PublicHome')} textColor="#e2e8f0">
            {t('policies.backToHome')}
          </Button>
          <AuthLanguageSelector compact />
        </View>

        <DashboardCard style={styles.betaCard}>
          <Text variant="titleSmall" style={styles.betaTitle}>
            {t('policies.betaNoticeTitle')}
          </Text>
          <Text variant="bodySmall" style={styles.betaBody}>
            {t('policies.betaNoticeBody')}
          </Text>
        </DashboardCard>

        <DashboardCard>
          <Text variant="headlineSmall" style={styles.title}>
            {payload.content.title}
          </Text>
          <PolicyDocumentView content={payload.content} meta={payload.meta} />
        </DashboardCard>

        <DashboardCard>
          <Text variant="titleSmall" style={styles.relatedTitle}>
            {t('policies.relatedPolicies')}
          </Text>
          <View style={styles.linkRow}>
            {FOOTER_POLICY_LINKS.map((link) => (
              <Pressable key={link.slug} onPress={() => openPolicyPath(link.slug, navigation)}>
                <Text style={styles.link}>{t(link.labelKey)}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => openPolicyPath('partner-terms', navigation)}>
              <Text style={styles.link}>{t('policies.pageTitles.partner-terms')}</Text>
            </Pressable>
            <Pressable onPress={() => openPolicyPath('dpa', navigation)}>
              <Text style={styles.link}>{t('policies.pageTitles.dpa')}</Text>
            </Pressable>
            <Pressable onPress={() => openPolicyPath('subprocessors', navigation)}>
              <Text style={styles.link}>{t('policies.pageTitles.subprocessors')}</Text>
            </Pressable>
          </View>
          {Platform.OS === 'web' ? (
            <Text variant="bodySmall" style={styles.localeHint}>
              {t('policies.alternateLocale')}:{' '}
              <Text
                style={styles.link}
                onPress={() => {
                  window.location.assign(switchLocalePath);
                }}
              >
                {payload.alternateLocale.toUpperCase()}
              </Text>
            </Text>
          ) : null}
        </DashboardCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  betaCard: {
    marginBottom: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  betaTitle: {
    color: '#bfdbfe',
    marginBottom: 6,
  },
  betaBody: {
    color: 'rgba(226,232,240,0.88)',
    lineHeight: 20,
  },
  title: {
    color: '#f8fafc',
    marginBottom: 12,
  },
  relatedTitle: {
    color: '#e2e8f0',
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  link: {
    color: '#93c5fd',
    textDecorationLine: 'underline',
  },
  localeHint: {
    marginTop: 12,
    color: 'rgba(226,232,240,0.7)',
  },
  button: {
    marginTop: 12,
  },
});
