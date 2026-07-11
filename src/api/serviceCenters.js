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

export async function getServiceCenters(filters = {}, init = {}) {
  const params = new URLSearchParams();

  if (filters.search) params.append('search', filters.search);
  else if (filters.address) params.append('search', filters.address);
  if (filters.vehicle_type) params.append('vehicle_type', filters.vehicle_type);
  if (filters.category) params.append('category', filters.category);
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
  if (filters.sort) params.append('sort', filters.sort);
  if (filters.include_reported === false) params.append('include_reported', 'false');
  else params.append('include_reported', 'true');

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
  return Array.isArray(data) ? data : [];
}
