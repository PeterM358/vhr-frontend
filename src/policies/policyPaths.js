import { Platform } from 'react-native';

import { getLocale } from '../i18n';
import { localizeCanonicalPath } from '../navigation/localizedRoutes';
import { policyPath, POLICY_SLUGS } from './policySlugs';

/** Localized absolute web path for a policy page. */
export function localizedPolicyPath(slug, locale = getLocale()) {
  return localizeCanonicalPath(policyPath(slug), locale);
}

export function openPolicyPath(slug, navigation) {
  const policyKey = String(slug || '').trim().toLowerCase();
  if (!policyKey) return;

  if (navigation?.navigate) {
    navigation.navigate('PublicPolicyPage', { policyKey });
    return;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(localizedPolicyPath(policyKey));
  }
}

export const FOOTER_POLICY_LINKS = [
  { slug: POLICY_SLUGS.privacy, labelKey: 'footer.privacyPolicy' },
  { slug: POLICY_SLUGS.terms, labelKey: 'footer.termsOfService' },
  { slug: POLICY_SLUGS.cookies, labelKey: 'footer.cookiePolicy' },
  { slug: POLICY_SLUGS.support, labelKey: 'footer.support' },
];
