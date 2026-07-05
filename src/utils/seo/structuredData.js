/**
 * JSON-LD helpers mirroring backend structured_data payloads.
 * Kept client-side for future SSR/pre-render reuse.
 */

export function buildBreadcrumbList(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildLocalBusinessPlaceholder({ name, url, city, country }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city || '',
      addressCountry: country || '',
    },
  };
}

export function buildServicePlaceholder({ name, city, providerName = 'Veversal', providerUrl }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    areaServed: {
      '@type': 'City',
      name: city || '',
    },
    provider: {
      '@type': 'Organization',
      name: providerName,
      url: providerUrl,
    },
  };
}
