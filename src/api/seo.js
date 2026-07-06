import { API_BASE_URL } from './config';
import { serviceCenterProfilePath } from '../utils/seo/seoPaths';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      qs.set(key, String(value));
    }
  });
  const raw = qs.toString();
  return raw ? `?${raw}` : '';
}

async function seoFetch(path, params = {}) {
  const response = await fetch(`${API_BASE_URL}${path}${buildQuery(params)}`);
  if (!response.ok) {
    const err = new Error('SEO request failed');
    err.status = response.status;
    try {
      err.body = await response.json();
    } catch {
      err.body = null;
    }
    throw err;
  }
  return response.json();
}

export function fetchSeoCityDirectory(locale, citySlug) {
  return seoFetch(`/api/public/seo/cities/${encodeURIComponent(locale)}/${encodeURIComponent(citySlug)}/`);
}

export function fetchSeoServiceCity(locale, repairSlug, citySlug) {
  return seoFetch(
    `/api/public/seo/services/${encodeURIComponent(locale)}/${encodeURIComponent(repairSlug)}/cities/${encodeURIComponent(citySlug)}/`
  );
}

export function fetchSeoVehicleServiceCity(locale, vehicleSlug, repairSlug, citySlug) {
  return seoFetch(
    `/api/public/seo/vehicle-services/${encodeURIComponent(locale)}/${encodeURIComponent(vehicleSlug)}/${encodeURIComponent(repairSlug)}/cities/${encodeURIComponent(citySlug)}/`
  );
}

export function fetchSeoCompositeLanding(locale, landingSlug, citySlug) {
  return seoFetch(
    `/api/public/seo/landing/${encodeURIComponent(locale)}/${encodeURIComponent(landingSlug)}/${encodeURIComponent(citySlug)}/`
  );
}

export function fetchSeoServiceCenterDetail(locale, citySlug, centerSlug) {
  return seoFetch(
    `/api/public/seo/service-centers/${encodeURIComponent(locale)}/${encodeURIComponent(citySlug)}/c/${encodeURIComponent(centerSlug)}/`
  );
}

export function fetchSeoProfileBySlug(centerSlug, locale = 'en') {
  return seoFetch(`/api/public/seo/service-center/${encodeURIComponent(centerSlug)}/`, { locale });
}

export function fetchSeoCitySegment(locale, citySlug, segment) {
  return seoFetch(
    `/api/public/seo/service-centers/${encodeURIComponent(locale)}/${encodeURIComponent(citySlug)}/${encodeURIComponent(segment)}/`
  );
}

export function resolveSeoPathSegment(locale, citySlug, segment) {
  return seoFetch('/api/public/seo/resolve-path/', { locale, city_slug: citySlug, segment });
}

export function resolveSeoWebPath(path, locale = 'en') {
  return seoFetch('/api/public/seo/resolve-web-path/', { path, locale });
}

export function fetchSeoServiceCenters(params = {}) {
  return seoFetch('/api/public/seo/service-centers/', params);
}

export function resolveShopSeoPath(shopId, locale = 'en') {
  return seoFetch(`/api/public/seo/service-centers/resolve/${shopId}/`, { locale });
}

export function buildFallbackShopPath(shopId) {
  return `/service-centers/${shopId}`;
}

export function buildShopPublicPathFromShop(shop) {
  const slug = shop?.public_slug || shop?.slug;
  if (slug) {
    return serviceCenterProfilePath(slug);
  }
  if (shop?.id != null) {
    return buildFallbackShopPath(shop.id);
  }
  return null;
}

export function fetchSeoTaxonomy(locale = 'en') {
  return seoFetch('/api/public/seo/taxonomy/', { locale });
}

function isNumericSegment(value) {
  return /^\d+$/.test(String(value || '').trim());
}

export async function loadShopDetailWithOptionalSeo({
  shopId,
  locale = 'en',
  citySlug,
  centerSlug,
  token,
  getShopById,
}) {
  const numericSlug = centerSlug && isNumericSegment(centerSlug);
  const effectiveShopId =
    shopId != null ? shopId : numericSlug ? parseInt(String(centerSlug).trim(), 10) : null;
  const slugForSeo = centerSlug && !numericSlug ? centerSlug : null;

  if (slugForSeo) {
    try {
      const seoPayload = await fetchSeoProfileBySlug(slugForSeo, locale);
      return { shop: seoPayload.service_center, seoPayload };
    } catch (err) {
      if (effectiveShopId && getShopById) {
        const shop = await getShopById(effectiveShopId, token || null);
        return { shop, seoPayload: null, seoFallback: true };
      }
      throw err;
    }
  }

  if (locale && citySlug && centerSlug && !numericSlug) {
    try {
      const seoPayload = await fetchSeoServiceCenterDetail(locale, citySlug, centerSlug);
      return { shop: seoPayload.service_center, seoPayload };
    } catch (err) {
      if (effectiveShopId && getShopById) {
        const shop = await getShopById(effectiveShopId, token || null);
        return { shop, seoPayload: null, seoFallback: true };
      }
      throw err;
    }
  }

  if (!effectiveShopId || !getShopById) {
    const err = new Error('Missing service center identifier.');
    throw err;
  }

  const shop = await getShopById(effectiveShopId, token || null);
  return { shop, seoPayload: null };
}

export function syncShopDetailWebUrl(shop, shopId) {
  if (typeof window === 'undefined') {
    return buildFallbackShopPath(shopId);
  }
  const path = buildShopPublicPathFromShop(shop) || buildFallbackShopPath(shopId);
  window.history.replaceState(window.history.state, '', path);
  return path;
}

export async function resolveLegacyShopPath(shopId, locale = 'en') {
  try {
    const resolved = await resolveShopSeoPath(shopId, locale);
    return resolved.canonical_path || buildFallbackShopPath(shopId);
  } catch {
    return buildFallbackShopPath(shopId);
  }
}
