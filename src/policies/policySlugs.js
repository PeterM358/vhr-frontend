/** Canonical URL slugs for public policy pages (locale-free paths). */
export const POLICY_SLUGS = {
  privacy: 'privacy',
  terms: 'terms',
  cookies: 'cookies',
  support: 'support',
  partnerTerms: 'partner-terms',
  dpa: 'dpa',
  subprocessors: 'subprocessors',
};

export const POLICY_SLUG_LIST = Object.values(POLICY_SLUGS);

export function isPolicySlug(value) {
  return POLICY_SLUG_LIST.includes(String(value || '').trim().toLowerCase());
}

export function policyPath(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  return normalized ? `/${normalized}` : '/';
}
