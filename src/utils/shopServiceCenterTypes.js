/** Common service center type labels stored in ShopProfile.service_center_type. */

export const SERVICE_CENTER_TYPE_PRESETS = [
  'Auto Service',
  'Motorcycle Service',
  'Bike Service',
  'E-bike Service',
  'Truck Service',
  'Van Service',
  'Scooter Service',
  'Tire Service',
  'Body Shop',
  'Detailing',
];

export const SERVICE_CENTER_TYPE_OTHER = '__other__';

export function isPresetServiceCenterType(value) {
  const t = String(value || '').trim();
  if (!t) return false;
  return SERVICE_CENTER_TYPE_PRESETS.some((p) => p.toLowerCase() === t.toLowerCase());
}

export function serviceCenterTypePickerValue(value) {
  const t = String(value || '').trim();
  if (!t) return '';
  return isPresetServiceCenterType(t) ? t : SERVICE_CENTER_TYPE_OTHER;
}
