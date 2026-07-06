/**
 * Apply SEO metadata on web from API page payloads and route-derived discovery context.
 */

import { Platform } from 'react-native';
import {
  repairFirstPath,
  serviceCentersCityPath,
  serviceCentersPath,
  vehicleRoutePrefixForCode,
  vehicleServiceCentersPath,
} from './seoPaths';

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

const VEHICLE_LABELS = {
  car: 'Car',
  truck: 'Truck',
  motorcycle: 'Motorcycle',
  bicycle: 'Bike',
  ebike: 'E-bike',
  scooter: 'Scooter',
};

export function buildDiscoverySeoMeta({ citySlug, vehicleType, repairType } = {}) {
  const city = citySlug ? titleCaseSlug(citySlug) : null;
  const repair = repairType ? titleCaseSlug(repairType) : null;
  const vehicle = vehicleType ? VEHICLE_LABELS[vehicleType] || titleCaseSlug(vehicleType) : null;

  let canonicalPath = serviceCentersPath();
  let title = 'Service Centers | Veversal';
  let h1 = 'Service Centers';
  let description = 'Discover service centers, compare services, and find trusted vehicle care on Veversal.';

  if (vehicle && city && repair) {
    canonicalPath = vehicleServiceCentersPath(vehicleType, citySlug, repairType);
    title = `${vehicle} ${repair} in ${city} | Veversal`;
    h1 = `${vehicle} ${repair} in ${city}`;
    description = `Find ${vehicle.toLowerCase()} service centers for ${repair.toLowerCase()} in ${city} on Veversal.`;
  } else if (vehicle && city) {
    canonicalPath = vehicleServiceCentersPath(vehicleType, citySlug);
    title = `${vehicle} Service Centers in ${city} | Veversal`;
    h1 = `${vehicle} Service Centers in ${city}`;
    description = `Find ${vehicle.toLowerCase()} service centers in ${city} on Veversal.`;
  } else if (vehicle) {
    canonicalPath = vehicleServiceCentersPath(vehicleType);
    title = `${vehicle} Service Centers | Veversal`;
    h1 = `${vehicle} Service Centers`;
    description = `Browse ${vehicle.toLowerCase()} service centers on Veversal.`;
  } else if (repair && city) {
    canonicalPath = repairFirstPath(repairType, citySlug);
    title = `${repair} in ${city} | Veversal`;
    h1 = `${repair} in ${city}`;
    description = `Find service centers for ${repair.toLowerCase()} in ${city} on Veversal.`;
  } else if (repair) {
    canonicalPath = repairFirstPath(repairType);
    title = `${repair} | Veversal`;
    h1 = repair;
    description = `Find service centers for ${repair.toLowerCase()} on Veversal.`;
  } else if (city) {
    canonicalPath = serviceCentersCityPath(citySlug);
    title = `Service Centers in ${city} | Veversal`;
    h1 = `Service Centers in ${city}`;
    description = `Find service centers in ${city} for repairs, maintenance, and verified vehicle care on Veversal.`;
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Veversal',
        item: typeof window !== 'undefined' ? window.location.origin : '',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: h1,
        item:
          typeof window !== 'undefined'
            ? `${window.location.origin}${canonicalPath}`
            : canonicalPath,
      },
    ],
  };

  return {
    title,
    meta_description: description,
    h1,
    canonical_path: canonicalPath,
    canonical_url:
      typeof window !== 'undefined'
        ? `${window.location.origin}${canonicalPath}`
        : canonicalPath,
    robots: 'index,follow',
    open_graph: {
      title,
      description,
      url:
        typeof window !== 'undefined'
          ? `${window.location.origin}${canonicalPath}`
          : canonicalPath,
      type: 'website',
    },
    structured_data: {
      breadcrumb_list: breadcrumb,
    },
    vehicle_route_prefix: vehicleType ? vehicleRoutePrefixForCode(vehicleType) : null,
  };
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
