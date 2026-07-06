import { API_BASE_URL } from './config';
import { buildServiceCenterPath } from '../utils/seo/seoPaths';

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

export function fetchSeoCitySegment(locale, citySlug, segment) {
  return seoFetch(
    `/api/public/seo/service-centers/${encodeURIComponent(locale)}/${encodeURIComponent(citySlug)}/${encodeURIComponent(segment)}/`
  );
}

export function resolveSeoPathSegment(locale, citySlug, segment) {
  return seoFetch('/api/public/seo/resolve-path/', { locale, city_slug: citySlug, segment });
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

export function buildShopPublicPathFromShop(shop, locale = 'en', shopId = null) {
  const citySlug = shop?.city_slug || shop?.city_slug_en;
  const centerSlug = shop?.public_slug || shop?.slug;
  if (citySlug && centerSlug) {
    return buildServiceCenterPath({ locale, citySlug, centerSlug });
  }
  if (shopId != null) {
    return buildFallbackShopPath(shopId);
  }
  if (shop?.id != null) {
    return buildFallbackShopPath(shop.id);
  }
  return null;
}

export function fetchSeoTaxonomy(locale = 'en') {
  return seoFetch('/api/public/seo/taxonomy/', { locale });
}

export async function loadShopDetailWithOptionalSeo({
  shopId,
  locale,
  citySlug,
  centerSlug,
  token,
  getShopById,
}) {
  if (locale && citySlug && centerSlug) {
    try {
      const seoPayload = await fetchSeoServiceCenterDetail(locale, citySlug, centerSlug);
      return { shop: seoPayload.service_center, seoPayload };
    } catch (err) {
      if (shopId && getShopById) {
        const shop = await getShopById(shopId, token || null);
        return { shop, seoPayload: null, seoFallback: true };
      }
      throw err;
    }
  }

  const shop = await getShopById(shopId, token || null);
  return { shop, seoPayload: null };
}

export function syncShopDetailWebUrl(shop, shopId, locale = 'en') {
  if (typeof window === 'undefined') {
    return buildFallbackShopPath(shopId);
  }
  const path = buildShopPublicPathFromShop(shop, locale, shopId) || buildFallbackShopPath(shopId);
  window.history.replaceState(window.history.state, '', path);
  return path;
}
