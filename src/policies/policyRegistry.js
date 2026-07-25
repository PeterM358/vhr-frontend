import cookies from './content/cookies.js';
import dpa from './content/dpa.js';
import partnerTerms from './content/partnerTerms.js';
import privacy from './content/privacy.js';
import subprocessors from './content/subprocessors.js';
import support from './content/support.js';
import terms from './content/terms.js';

/** @type {Record<string, typeof privacy>} */
export const POLICY_DOCUMENTS = {
  privacy,
  terms,
  cookies,
  support,
  'partner-terms': partnerTerms,
  dpa,
  subprocessors,
};

export const POLICY_KEYS = Object.keys(POLICY_DOCUMENTS);

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

/** Simple deterministic checksum for content change detection (not cryptographic). */
export function computePolicyChecksum(document) {
  const payload = {
    key: document.key,
    version: document.version,
    en: document.en.sections.map((s) => s.id),
    bg: document.bg.sections.map((s) => s.id),
  };
  let hash = 0;
  const str = stableStringify(payload) + stableStringify(document.en) + stableStringify(document.bg);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
}

export function getPolicyDocument(policyKey) {
  const key = String(policyKey || '').trim().toLowerCase();
  return POLICY_DOCUMENTS[key] || null;
}

export function getPolicyLocaleContent(policyKey, locale) {
  const doc = getPolicyDocument(policyKey);
  if (!doc) return null;
  const lang = locale === 'bg' ? 'bg' : 'en';
  return {
    meta: {
      key: doc.key,
      slug: doc.slug,
      version: doc.version,
      effectiveDate: doc.effectiveDate,
      status: doc.status,
      leadingLanguage: doc.leadingLanguage,
      checksum: computePolicyChecksum(doc),
      published: doc.status === 'draft-beta',
    },
    content: doc[lang],
    alternateLocale: lang === 'en' ? 'bg' : 'en',
  };
}

/** Validate EN/BG section id parity for all registered policies. */
export function validatePolicyParity() {
  const errors = [];
  for (const doc of Object.values(POLICY_DOCUMENTS)) {
    const enIds = doc.en.sections.map((s) => s.id);
    const bgIds = doc.bg.sections.map((s) => s.id);
    if (enIds.join('|') !== bgIds.join('|')) {
      errors.push(`${doc.key}: section id mismatch EN [${enIds.join(', ')}] vs BG [${bgIds.join(', ')}]`);
    }
    if (doc.en.title.trim() === '' || doc.bg.title.trim() === '') {
      errors.push(`${doc.key}: missing title in one locale`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Intended acceptance record shape (not persisted in beta backend).
 * @typedef {{ policyKey: string, version: string, language: string, effectiveDate: string, contentChecksum: string, acceptedAt: string, userId: string|number }} PolicyAcceptanceRecord
 */

export const POLICY_ACCEPTANCE_GAP = {
  backendModel: false,
  registrationGate: false,
  materialChangeReacceptance: false,
  auditTrail: 'minimal — AuditAction exists; no PolicyAcceptance model found in codebase',
  cookieConsentSeparate: true,
};
