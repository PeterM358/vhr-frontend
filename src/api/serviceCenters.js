import { API_BASE_URL } from './config';

/** Quick-pick vehicle filters; values are `VehicleType.code` (backend filter). */
export const VEHICLE_TYPE_FILTER_CHIPS = [
  { code: 'car', label: 'Car' },
  { code: 'van', label: 'Van' },
  { code: 'truck', label: 'Truck' },
  { code: 'motorcycle', label: 'Motorcycle' },
  { code: 'bicycle', label: 'Bicycle' },
  { code: 'ebike', label: 'E-bike' },
];

export async function getServiceCenters(filters = {}, init = {}) {
  const params = new URLSearchParams();

  if (filters.address) params.append('address', filters.address);
  if (filters.vehicle_type) params.append('vehicle_type', filters.vehicle_type);
  if (filters.category) params.append('category', filters.category);
  if (filters.repair_type) params.append('repair_type', filters.repair_type);

  const qs = params.toString();
  const url = `${API_BASE_URL}/api/service-centers/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, init);
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const err = new Error(data?.detail || 'Could not load service centers');
    err.response = response;
    err.data = data;
    throw err;
  }
  return Array.isArray(data) ? data : [];
}
