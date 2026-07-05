import { API_BASE_URL } from './config';

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
    `/api/public/seo/service-centers/${encodeURIComponent(locale)}/${encodeURIComponent(citySlug)}/${encodeURIComponent(centerSlug)}/`
  );
}

export function fetchSeoServiceCenters(params = {}) {
  return seoFetch('/api/public/seo/service-centers/', params);
}

export function resolveShopSeoPath(shopId, locale = 'en') {
  return seoFetch(`/api/public/seo/service-centers/resolve/${shopId}/`, { locale });
}

export function fetchSeoTaxonomy(locale = 'en') {
  return seoFetch('/api/public/seo/taxonomy/', { locale });
}
