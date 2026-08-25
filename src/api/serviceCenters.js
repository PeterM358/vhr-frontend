import { API_BASE_URL } from './config';

/** Quick-pick vehicle filters; values are `VehicleType.code` (backend filter). */
export const VEHICLE_TYPE_FILTER_CHIPS = [
  { code: 'car', label: 'Car' },
  { code: 'truck', label: 'Truck' },
  { code: 'motorcycle', label: 'Motorcycle' },
  { code: 'bicycle', label: 'Bike' },
  { code: 'ebike', label: 'E-bike' },
];

/** Visible quick-pick chips on discovery (subset of full vehicle list). */
export const DISCOVERY_QUICK_VEHICLE_CHIPS = VEHICLE_TYPE_FILTER_CHIPS;

/** Sofia fallback when GPS denied / before locate (matches backend default). */
export const DISCOVERY_DEFAULT_CENTER = { lat: 42.6977, lon: 23.3219 };
export const DISCOVERY_DEFAULT_RADIUS_KM = 100;

/**
 * Fetch nearby map pins.
 * @returns {Promise<{ results: Array, count: number, truncated: boolean, limit: number, scope: object|null }>}
 */
export async function getServiceCenters(filters = {}, init = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  else if (filters.address) params.append('search', filters.address);
  if (filters.vehicle_type) params.append('vehicle_type', filters.vehicle_type);
  if (filters.category) params.append('category', filters.category);
  if (filters.business_category) params.append('business_category', String(filters.business_category));
  if (filters.business_service) params.append('business_service', String(filters.business_service));
  if (filters.repair_type) params.append('repair_type', filters.repair_type);
  if (filters.city_slug) params.append('city_slug', filters.city_slug);
  if (filters.locale) params.append('locale', filters.locale);
  if (filters.verified) params.append('verified', 'true');
  if (filters.open_now) params.append('open_now', 'true');
  if (filters.min_rating != null) params.append('min_rating', String(filters.min_rating));
  if (filters.brand) params.append('brand', String(filters.brand));
  if (filters.offers_guarantee) params.append('offers_guarantee', 'true');
  if (filters.lat != null) params.append('lat', String(filters.lat));
  if (filters.lon != null) params.append('lon', String(filters.lon));
  if (filters.radius_km != null) params.append('radius_km', String(filters.radius_km));
  if (filters.min_lat != null) params.append('min_lat', String(filters.min_lat));
  if (filters.max_lat != null) params.append('max_lat', String(filters.max_lat));
  if (filters.min_lon != null) params.append('min_lon', String(filters.min_lon));
  if (filters.max_lon != null) params.append('max_lon', String(filters.max_lon));
  if (filters.limit != null) params.append('limit', String(filters.limit));
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.include_reported === false) params.append('include_reported', 'false');
  else params.append('include_reported', 'true');
  if (filters.show_inactive) params.append('show_inactive', 'true');
  if (filters.show_closed) params.append('show_closed', 'true');

  const qs = params.toString();
  const url = `${API_BASE_URL}/api/service-centers/${qs ? `?${qs}` : ''}`;

  const parseResponse = async (response) => {
    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    return { response, data };
  };

  let { response, data } = await parseResponse(await fetch(url, init));

  // Public list (AllowAny) — stale/invalid JWT must not block anonymous discovery.
  if (response.status === 401 && init.headers?.Authorization) {
    const retryInit = { ...init, headers: { ...init.headers } };
    delete retryInit.headers.Authorization;
    ({ response, data } = await parseResponse(await fetch(url, retryInit)));
  }

  if (!response.ok) {
    const err = new Error(data?.detail || 'Could not load service centers');
    err.response = response;
    err.data = data;
    throw err;
  }

  if (Array.isArray(data)) {
    return {
      results: data,
      count: data.length,
      truncated: false,
      limit: data.length,
      scope: null,
    };
  }

  return {
    results: Array.isArray(data?.results) ? data.results : [],
    count: Number(data?.count) || 0,
    truncated: Boolean(data?.truncated),
    limit: Number(data?.limit) || 0,
    scope: data?.scope || null,
  };
}
