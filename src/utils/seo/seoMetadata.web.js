/**
 * Apply SEO metadata on web from API page payloads (SSR-ready shape).
 */

import { Platform } from 'react-native';

function upsertMeta(attrName, attrValue, content) {
  if (typeof document === 'undefined') return;
  let node = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attrName, attrValue);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content || '');
}

function upsertLink(rel, href, hreflang) {
  if (typeof document === 'undefined') return;
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    if (hreflang) node.setAttribute('hreflang', hreflang);
    document.head.appendChild(node);
  }
  node.setAttribute('href', href || '');
}

function upsertJsonLd(id, payload) {
  if (typeof document === 'undefined') return;
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement('script');
    node.type = 'application/ld+json';
    node.id = id;
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(payload);
}

export function applySeoPageMeta(meta = {}, structuredData = null) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  if (meta.title) {
    document.title = meta.title;
  }

  upsertMeta('name', 'description', meta.meta_description || '');
  upsertMeta('name', 'robots', meta.robots || 'index,follow');

  upsertMeta('property', 'og:title', meta.open_graph?.title || meta.title || '');
  upsertMeta('property', 'og:description', meta.open_graph?.description || meta.meta_description || '');
  upsertMeta('property', 'og:url', meta.open_graph?.url || meta.canonical_url || '');
  upsertMeta('property', 'og:type', meta.open_graph?.type || 'website');

  if (meta.canonical_url) {
    upsertLink('canonical', meta.canonical_url);
  }

  if (meta.hreflang && typeof meta.hreflang === 'object') {
    Object.entries(meta.hreflang).forEach(([lang, href]) => {
      upsertLink('alternate', href, lang);
    });
  }

  if (structuredData?.breadcrumb_list) {
    upsertJsonLd('veversal-seo-breadcrumb', structuredData.breadcrumb_list);
  }
  if (structuredData?.local_business) {
    upsertJsonLd('veversal-seo-local-business', structuredData.local_business);
  }
  if (structuredData?.service) {
    upsertJsonLd('veversal-seo-service', structuredData.service);
  }
}

export function resetSeoPageMeta(baseTitle = 'Veversal') {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  document.title = baseTitle;
}
