/**
 * Apply SEO metadata on web from API page payloads and route-derived discovery context.
 */

import { Platform } from 'react-native';
import {
  repairFirstPath,
  serviceCentersCityPath,
  serviceCentersDiscoveryPath,
  serviceCentersPath,
  vehicleRoutePrefixForCode,
  vehicleServiceCentersPath,
} from './seoPaths';
import { localizeCanonicalPath, SUPPORTED_LANGUAGES } from '../../navigation/localizedRoutes';
import { t } from '../../i18n';

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

function titleCaseSlug(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function localizedDiscoveryCanonicalPath(canonicalPath, lang) {
  if (!canonicalPath) return serviceCentersPath();
  const locale = String(lang || 'en').trim().toLowerCase();
  return localizeCanonicalPath(canonicalPath, locale);
}

function buildHreflangAlternates(canonicalPath) {
  if (!canonicalPath || typeof window === 'undefined') return null;
  const origin = window.location.origin;
  const alternates = {};
  SUPPORTED_LANGUAGES.forEach((lang) => {
    alternates[lang] = `${origin}${localizedDiscoveryCanonicalPath(canonicalPath, lang)}`;
  });
  alternates['x-default'] = `${origin}${localizedDiscoveryCanonicalPath(canonicalPath, 'en')}`;
  return alternates;
}

const VEHICLE_LABELS = {
  car: 'seo.vehicleTypes.car',
  truck: 'seo.vehicleTypes.truck',
  motorcycle: 'seo.vehicleTypes.motorcycle',
  bicycle: 'seo.vehicleTypes.bicycle',
  ebike: 'seo.vehicleTypes.ebike',
  scooter: 'seo.vehicleTypes.scooter',
};

export function buildDiscoverySeoMeta({
  citySlug,
  vehicleType,
  repairType,
  brandSlug,
  lang,
} = {}) {
  const city = citySlug ? titleCaseSlug(citySlug) : null;
  const repair = repairType ? titleCaseSlug(repairType) : null;
  const brand = brandSlug ? titleCaseSlug(brandSlug) : null;
  const vehicleKey = vehicleType ? VEHICLE_LABELS[vehicleType] : null;
  const vehicle = vehicleType
    ? t(vehicleKey, null, titleCaseSlug(vehicleType))
    : null;
  const appName = t('common.appName');

  let canonicalPath = serviceCentersPath();
  let variant = 'root';

  if (vehicle && city && repair) {
    canonicalPath = vehicleServiceCentersPath(vehicleType, citySlug, repairType);
    variant = 'vehicleCityRepair';
  } else if (vehicle && city) {
    canonicalPath = vehicleServiceCentersPath(vehicleType, citySlug);
    variant = 'vehicleCity';
  } else if (vehicle) {
    canonicalPath = vehicleServiceCentersPath(vehicleType);
    variant = 'vehicle';
  } else if (brand && city && repair) {
    canonicalPath = serviceCentersDiscoveryPath({
      brandSlug,
      citySlug,
      repairSlug: repairType,
    });
    variant = 'brandCityRepair';
  } else if (brand && city) {
    canonicalPath = serviceCentersDiscoveryPath({ brandSlug, citySlug });
    variant = 'brandCity';
  } else if (brand && repair) {
    canonicalPath = serviceCentersDiscoveryPath({ brandSlug, repairSlug: repairType });
    variant = 'brandRepair';
  } else if (brand) {
    canonicalPath = serviceCentersDiscoveryPath({ brandSlug });
    variant = 'brand';
  } else if (repair && city) {
    canonicalPath = repairFirstPath(repairType, citySlug);
    variant = 'repairCity';
  } else if (repair) {
    canonicalPath = repairFirstPath(repairType);
    variant = 'repair';
  } else if (city) {
    canonicalPath = serviceCentersCityPath(citySlug);
    variant = 'city';
  }

  const localizedCanonicalPath = localizedDiscoveryCanonicalPath(canonicalPath, lang);
  const templateBase = `seo.serviceCentersMeta.discovery.${variant}`;
  const templateParams = { app: appName, vehicle, repair, city, brand };
  const title = t(`${templateBase}.title`, templateParams, `${appName} Service Centers`);
  const h1 = t(`${templateBase}.h1`, templateParams, t('public.serviceCenters', null, 'Service Centers'));
  const description = t(
    `${templateBase}.description`,
    templateParams,
    'Discover service centers, compare services, and find trusted vehicle care on Veversal.'
  );

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: appName,
      item: typeof window !== 'undefined' ? window.location.origin : '',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: t('seo.serviceCentersMeta.discovery.root.h1', { app: appName }, 'Service Centers'),
      item:
        typeof window !== 'undefined'
          ? `${window.location.origin}${localizedDiscoveryCanonicalPath(serviceCentersPath(), lang)}`
          : serviceCentersPath(),
    },
  ];

  if (variant !== 'root') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 3,
      name: h1,
      item:
        typeof window !== 'undefined'
          ? `${window.location.origin}${localizedCanonicalPath}`
          : localizedCanonicalPath,
    });
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const canonicalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${localizedCanonicalPath}`
      : localizedCanonicalPath;

  return {
    title,
    meta_description: description,
    h1,
    canonical_path: localizedCanonicalPath,
    canonical_url: canonicalUrl,
    robots: 'index,follow',
    hreflang: buildHreflangAlternates(canonicalPath),
    open_graph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    structured_data: {
      breadcrumb_list: breadcrumb,
    },
    vehicle_route_prefix: vehicleType ? vehicleRoutePrefixForCode(vehicleType) : null,
    breadcrumb_trail: buildDiscoveryBreadcrumbTrail({
      variant,
      appName,
      h1,
      citySlug,
      brandSlug,
      repairType,
      lang,
    }),
  };
}

function buildDiscoveryBreadcrumbTrail({
  variant,
  appName,
  h1,
  citySlug,
  brandSlug,
  repairType,
  lang,
}) {
  const rootLabel = t('seo.serviceCentersMeta.discovery.root.h1', { app: appName }, 'Service Centers');
  const trail = [{ label: appName, path: '/' }, { label: rootLabel, path: serviceCentersPath() }];

  if (variant === 'root') {
    return trail;
  }

  if (variant === 'city' && citySlug) {
    trail.push({ label: h1, path: serviceCentersCityPath(citySlug) });
    return trail;
  }

  if (variant === 'brand' && brandSlug) {
    trail.push({ label: h1, path: serviceCentersDiscoveryPath({ brandSlug }) });
    return trail;
  }

  if (variant === 'brandCity' && brandSlug && citySlug) {
    trail.push({
      label: titleCaseSlug(brandSlug),
      path: serviceCentersDiscoveryPath({ brandSlug }),
    });
    trail.push({
      label: h1,
      path: serviceCentersDiscoveryPath({ brandSlug, citySlug }),
    });
    return trail;
  }

  if (variant === 'brandCityRepair' && brandSlug && citySlug && repairType) {
    trail.push({
      label: titleCaseSlug(brandSlug),
      path: serviceCentersDiscoveryPath({ brandSlug }),
    });
    trail.push({
      label: t('seo.serviceCentersMeta.discovery.brandCity.h1', {
        brand: titleCaseSlug(brandSlug),
        city: titleCaseSlug(citySlug),
      }, `${titleCaseSlug(brandSlug)} — ${titleCaseSlug(citySlug)}`),
      path: serviceCentersDiscoveryPath({ brandSlug, citySlug }),
    });
    trail.push({ label: h1, active: true });
    return trail;
  }

  trail.push({ label: h1, active: true });
  return trail;
}

export function applyDiscoverySeoMeta(params = {}) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  const meta = buildDiscoverySeoMeta(params);
  applySeoPageMeta(meta, meta.structured_data);
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

  if (meta.twitter?.title || meta.title) {
    upsertMeta('name', 'twitter:card', meta.twitter?.card || 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.twitter?.title || meta.title || '');
    upsertMeta(
      'name',
      'twitter:description',
      meta.twitter?.description || meta.meta_description || ''
    );
  }

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
