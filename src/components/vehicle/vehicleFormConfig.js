/**
 * Optional vehicle field groups for progressive create/edit UI.
 * Basic fields (type, make, model, year, plate, VIN, km) are handled by parent screens.
 */

export const ODOMETER_SOURCE_OPTIONS = [
  { value: 'owner', label: 'Owner entered' },
  { value: 'service_center', label: 'Service center verified' },
  { value: 'invoice_ocr', label: 'Invoice / OCR' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'imported', label: 'Imported' },
  { value: 'unknown', label: 'Unknown' },
];

export const VEHICLE_OPTIONAL_GROUPS = [
  {
    key: 'technical',
    title: 'Technical details',
    fields: [
      { key: 'fuel_type', label: 'Fuel type', kind: 'choice' },
      { key: 'engine_displacement', label: 'Engine displacement', kind: 'text', placeholder: 'e.g. 2.0, 625cc' },
      { key: 'engine_code', label: 'Engine code', kind: 'text' },
      { key: 'power_hp', label: 'Power (hp)', kind: 'int' },
      { key: 'power_kw', label: 'Power (kW)', kind: 'int' },
      { key: 'transmission_type', label: 'Transmission', kind: 'choice' },
      { key: 'drivetrain', label: 'Drivetrain', kind: 'choice' },
      { key: 'body_type', label: 'Body type', kind: 'choice' },
      { key: 'trim_version', label: 'Trim / version', kind: 'text' },
      { key: 'generation', label: 'Generation', kind: 'text' },
      { key: 'first_registration_date', label: 'First registration', kind: 'date', placeholder: 'YYYY-MM-DD' },
      { key: 'registration_country', label: 'Registration country', kind: 'text' },
    ],
  },
  {
    key: 'maintenance',
    title: 'Maintenance specifications',
    helperText: 'These are vehicle specifications, not service reminders.',
    fields: [
      { key: 'oil_specification', label: 'Oil specification', kind: 'text' },
      { key: 'battery_type', label: 'Battery type', kind: 'text' },
      { key: 'tire_size_front', label: 'Tire size (front)', kind: 'text' },
      { key: 'tire_size_rear', label: 'Tire size (rear)', kind: 'text' },
      { key: 'brake_disc_front', label: 'Brake disc (front)', kind: 'text' },
      { key: 'brake_disc_rear', label: 'Brake disc (rear)', kind: 'text' },
      { key: 'current_tire_set', label: 'Current tire set', kind: 'text', placeholder: 'e.g. Summer' },
    ],
  },
  {
    key: 'bike',
    title: 'Bike / e-bike / suspension',
    fields: [
      { key: 'frame_size', label: 'Frame size', kind: 'choice' },
      { key: 'wheel_size', label: 'Wheel size', kind: 'choice' },
      { key: 'fork_model', label: 'Fork model', kind: 'text' },
      { key: 'rear_shock_model', label: 'Rear shock model', kind: 'text' },
      { key: 'suspension_service_interval_hours', label: 'Suspension service interval (hours)', kind: 'int' },
      { key: 'suspension_last_service_hours', label: 'Suspension last service (hours)', kind: 'int' },
      { key: 'motor_brand', label: 'Motor brand', kind: 'choice' },
      { key: 'motor_model', label: 'Motor model', kind: 'text' },
      { key: 'battery_capacity_wh', label: 'Battery capacity (Wh)', kind: 'int' },
      { key: 'ebike_system', label: 'E-bike system', kind: 'choice' },
    ],
  },
  {
    key: 'ev',
    title: 'EV / hybrid',
    boolFields: [
      { key: 'is_ev', label: 'Electric vehicle (EV)' },
      { key: 'is_hybrid', label: 'Hybrid' },
    ],
    fields: [
      { key: 'hybrid_type', label: 'Hybrid type', kind: 'choice' },
      { key: 'ev_battery_capacity_kwh', label: 'Battery capacity (kWh)', kind: 'decimal' },
      { key: 'charging_type', label: 'Charging type', kind: 'choice' },
      { key: 'estimated_range_km', label: 'Estimated range (km)', kind: 'int' },
    ],
  },
  {
    key: 'trailer',
    title: 'Trailer / towed equipment',
    boolFields: [{ key: 'braked_trailer', label: 'Braked trailer' }],
    fields: [
      { key: 'trailer_type', label: 'Trailer type', kind: 'choice' },
      { key: 'axle_count', label: 'Axle count', kind: 'int' },
      { key: 'max_allowed_weight_kg', label: 'Max allowed weight (kg)', kind: 'int' },
      { key: 'payload_capacity_kg', label: 'Payload capacity (kg)', kind: 'int' },
      { key: 'coupling_type', label: 'Coupling type', kind: 'choice' },
    ],
  },
  {
    key: 'fleet',
    title: 'Fleet / business',
    fields: [
      { key: 'fleet_id', label: 'Fleet ID', kind: 'text' },
      { key: 'driver_name', label: 'Driver name', kind: 'text' },
      { key: 'department', label: 'Department', kind: 'text' },
      { key: 'lease_expiration_date', label: 'Lease expiration', kind: 'date', placeholder: 'YYYY-MM-DD' },
      { key: 'insurance_company', label: 'Insurance company', kind: 'text' },
      { key: 'warranty_expiration_date', label: 'Warranty expiration', kind: 'date', placeholder: 'YYYY-MM-DD' },
    ],
  },
  {
    key: 'odometer',
    title: 'Mileage evidence',
    helperText:
      'Higher confidence comes from receipts, service-center records, inspections, and before/after media.',
    boolFields: [{ key: 'odometer_verified', label: 'Odometer verified' }],
    fields: [
      { key: 'odometer_source', label: 'Odometer source', kind: 'odometer_picker' },
    ],
  },
];

const COMMERCIAL_TYPE_CODES = new Set(['van', 'truck', 'trailer', 'agricultural', 'construction']);
const BIKE_TYPE_CODES = new Set(['motorcycle', 'scooter', 'bicycle', 'e-bike', 'ebike']);
const BICYCLE_TYPE_CODES = new Set(['bicycle', 'e-bike', 'ebike']);
const TRAILER_TYPE_CODES = new Set(['trailer']);
const AGRI_CONSTRUCTION_TYPE_CODES = new Set(['agricultural', 'construction']);
const ROAD_CAR_TYPE_CODES = new Set(['car', 'van', 'truck']);

const EV_FUEL_VALUES = new Set(['electric', 'hybrid_petrol', 'hybrid_diesel']);
const BIKE_ONLY_TECH_FIELDS = new Set([
  'frame_size',
  'wheel_size',
  'fork_model',
  'rear_shock_model',
  'suspension_service_interval_hours',
  'suspension_last_service_hours',
  'motor_brand',
  'motor_model',
  'battery_capacity_wh',
  'ebike_system',
]);
const TRAILER_POWER_TECH_FIELDS = new Set([
  'fuel_type',
  'engine_displacement',
  'engine_code',
  'power_hp',
  'power_kw',
  'transmission_type',
  'drivetrain',
  'body_type',
]);
const FLEET_FIELDS = new Set([
  'fleet_id',
  'driver_name',
  'department',
  'lease_expiration_date',
  'insurance_company',
  'warranty_expiration_date',
]);
const EBIKE_DATA_FIELDS = new Set(['motor_brand', 'motor_model', 'battery_capacity_wh', 'ebike_system']);
const POWERED_TRAILER_DATA_FIELDS = new Set([
  'fuel_type',
  'engine_displacement',
  'engine_code',
  'power_hp',
  'power_kw',
  'motor_brand',
  'motor_model',
  'battery_capacity_wh',
  'ebike_system',
]);

function normalizeVehicleTypeCode(rawCode) {
  return String(rawCode || '').trim().toLowerCase();
}

function hasAnyValue(values, keys) {
  if (!values || typeof values !== 'object') return false;
  for (const key of keys) {
    const v = values[key];
    if (v == null) continue;
    if (typeof v === 'boolean') {
      if (v) return true;
      continue;
    }
    if (String(v).trim() !== '') return true;
  }
  return false;
}

function cloneGroup(group, fields) {
  return {
    ...group,
    fields,
  };
}

/**
 * Return relevant optional groups for create/edit based on vehicle type and current values.
 * currentValues can include:
 * - scalar fields (fuel_type, is_ev, is_hybrid, fleet_id, etc.)
 * - ui flag `powered_equipment_enabled`
 */
export function getRelevantVehicleFieldGroups(vehicleTypeCode, currentValues = {}) {
  const code = normalizeVehicleTypeCode(vehicleTypeCode);
  const isRoadCar = ROAD_CAR_TYPE_CODES.has(code);
  const isBike = BIKE_TYPE_CODES.has(code);
  const isBicycle = BICYCLE_TYPE_CODES.has(code);
  const isTrailer = TRAILER_TYPE_CODES.has(code);
  const isAgriConstruction = AGRI_CONSTRUCTION_TYPE_CODES.has(code);

  const evRelevant =
    !!currentValues.is_ev ||
    !!currentValues.is_hybrid ||
    EV_FUEL_VALUES.has(String(currentValues.fuel_type || '').trim().toLowerCase());

  const hasEbikeData = hasAnyValue(currentValues, EBIKE_DATA_FIELDS);
  const isEbikeContext = code === 'e-bike' || code === 'ebike' || hasEbikeData;

  const hasPoweredTrailerData = hasAnyValue(currentValues, POWERED_TRAILER_DATA_FIELDS);
  const poweredEquipmentEnabled = !!currentValues.powered_equipment_enabled;
  const trailerTechEnabled = hasPoweredTrailerData || poweredEquipmentEnabled;

  const hasFleetData = hasAnyValue(currentValues, FLEET_FIELDS);
  const showFleet = COMMERCIAL_TYPE_CODES.has(code) || hasFleetData;

  const groups = [];
  for (const group of VEHICLE_OPTIONAL_GROUPS) {
    if (group.key === 'maintenance') {
      groups.push(group);
      continue;
    }
    if (group.key === 'technical') {
      if (isBicycle) {
        // Hide car-heavy technical inputs for bicycle/e-bike contexts.
        const filtered = (group.fields || []).filter((f) => !TRAILER_POWER_TECH_FIELDS.has(f.key));
        groups.push(cloneGroup(group, filtered));
        continue;
      }
      if (isTrailer) {
        if (!trailerTechEnabled) continue;
        groups.push(cloneGroup(group, (group.fields || []).filter((f) => TRAILER_POWER_TECH_FIELDS.has(f.key))));
        continue;
      }
      if (isRoadCar || isBike || isAgriConstruction || !code) {
        groups.push(group);
      }
      continue;
    }
    if (group.key === 'bike') {
      if (isBike || isEbikeContext) {
        // For non-e-bike motorcycle/scooter, keep full bike fields; for bicycle contexts preserve bike section.
        groups.push(group);
      }
      continue;
    }
    if (group.key === 'trailer') {
      if (isTrailer) groups.push(group);
      continue;
    }
    if (group.key === 'ev') {
      if (evRelevant) groups.push(group);
      continue;
    }
    if (group.key === 'fleet') {
      if (showFleet) groups.push(group);
      continue;
    }
    // Odometer trust remains globally useful when user wants to disclose source/verification.
    if (group.key === 'odometer') {
      groups.push(group);
      continue;
    }
    groups.push(group);
  }
  return groups;
}

const BACKEND_GROUP_KEY_TO_LOCAL = {
  technical: 'technical',
  maintenance: 'maintenance',
  bike_ebike_suspension: 'bike',
  ev_hybrid: 'ev',
  trailer: 'trailer',
  fleet_business: 'fleet',
  odometer: 'odometer',
};

/**
 * Prefer backend-provided relevance metadata, fallback to local rules.
 * @param {Array<{key:string,is_relevant:boolean}>} backendRows
 * @param {Array<any>} localGroups
 */
export function resolveRelevantVehicleFieldGroups(backendRows, localGroups) {
  const local = Array.isArray(localGroups) ? localGroups : VEHICLE_OPTIONAL_GROUPS;
  if (!Array.isArray(backendRows) || backendRows.length === 0) return local;

  const wanted = new Set();
  backendRows.forEach((row) => {
    if (!row || !row.is_relevant) return;
    const mapped = BACKEND_GROUP_KEY_TO_LOCAL[row.key];
    if (mapped) wanted.add(mapped);
  });
  if (!wanted.size) return local;

  return local.map((g) => {
    if (!wanted.has(g.key)) return null;
    const backendRow = backendRows.find((r) => BACKEND_GROUP_KEY_TO_LOCAL[r?.key] === g.key);
    if (!backendRow) return g;
    return {
      ...g,
      helperText: backendRow.helper_text || g.helperText || null,
    };
  }).filter(Boolean);
}

/** All keys used in optional groups (strings + bools) for serialization */
export function collectOptionalFieldKeys() {
  const keys = new Set();
  VEHICLE_OPTIONAL_GROUPS.forEach((g) => {
    (g.fields || []).forEach((f) => keys.add(f.key));
    (g.boolFields || []).forEach((f) => keys.add(f.key));
  });
  return keys;
}

export function vehicleToFormStrings(vehicle) {
  const out = {};
  const keys = collectOptionalFieldKeys();
  keys.forEach((k) => {
    if (k === 'is_ev' || k === 'is_hybrid' || k === 'braked_trailer' || k === 'odometer_verified') return;
    const v = vehicle?.[k];
    if (k === 'odometer_source' && (v == null || v === '')) {
      out[k] = 'owner';
      return;
    }
    if (v == null || v === '') {
      out[k] = '';
    } else {
      out[k] = String(v);
    }
  });
  return out;
}

export function vehicleToFormBools(vehicle) {
  return {
    is_ev: !!vehicle?.is_ev,
    is_hybrid: !!vehicle?.is_hybrid,
    braked_trailer: !!vehicle?.braked_trailer,
    odometer_verified: !!vehicle?.odometer_verified,
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOptionalPositiveInt(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { ok: true, value: null };
  const n = Number(s);
  if (!Number.isFinite(n) || Math.round(n) !== n) {
    return { ok: false, message: 'Use a whole number.' };
  }
  if (n < 0) return { ok: false, message: 'Must be zero or positive.' };
  return { ok: true, value: n };
}

export function parseOptionalDecimal(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { ok: true, value: null };
  const n = Number(s.replace(',', '.'));
  if (!Number.isFinite(n)) return { ok: false, message: 'Invalid number.' };
  return { ok: true, value: s.replace(',', '.') };
}

export function parseOptionalDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { ok: true, value: null };
  if (!DATE_RE.test(s)) return { ok: false, message: 'Use YYYY-MM-DD.' };
  const t = Date.parse(`${s}T12:00:00`);
  if (Number.isNaN(t)) return { ok: false, message: 'Invalid date.' };
  return { ok: true, value: s };
}

/**
 * Build PATCH/POST body fragment for optional fields. Omits empty strings.
 * @param {Record<string,string>} strings
 * @param {Record<string,boolean>} bools
 */
export function buildOptionalVehiclePayload(strings, bools) {
  const payload = {};
  const keys = collectOptionalFieldKeys();

  for (const group of VEHICLE_OPTIONAL_GROUPS) {
    for (const bf of group.boolFields || []) {
      if (keys.has(bf.key)) {
        payload[bf.key] = !!bools[bf.key];
      }
    }
    for (const field of group.fields || []) {
      const raw = strings[field.key];
      const kind = field.kind;

      if (kind === 'odometer_picker') {
        const v = String(raw ?? '').trim();
        if (v) payload[field.key] = v;
        continue;
      }

      if (kind === 'int') {
        const pr = parseOptionalPositiveInt(raw);
        if (!pr.ok) return { error: `${field.label}: ${pr.message}` };
        if (pr.value != null) payload[field.key] = pr.value;
        continue;
      }

      if (kind === 'decimal') {
        const pr = parseOptionalDecimal(raw);
        if (!pr.ok) return { error: `${field.label}: ${pr.message}` };
        if (pr.value != null) payload[field.key] = pr.value;
        continue;
      }

      if (kind === 'date') {
        const pr = parseOptionalDate(raw);
        if (!pr.ok) return { error: `${field.label}: ${pr.message}` };
        if (pr.value != null) payload[field.key] = pr.value;
        continue;
      }

      const t = String(raw ?? '').trim();
      if (t) payload[field.key] = t;
    }
  }

  return { payload };
}

/** For read-only detail: does this group have any non-empty display value? */
export function groupHasDisplayData(groupKey, vehicle) {
  const group = VEHICLE_OPTIONAL_GROUPS.find((g) => g.key === groupKey);
  if (!group || !vehicle) return false;
  if (groupKey === 'odometer') {
    if (vehicle.odometer_verified) return true;
    const os = vehicle.odometer_source;
    if (os && os !== 'owner') return true;
    return false;
  }
  for (const bf of group.boolFields || []) {
    if (vehicle[bf.key]) return true;
  }
  for (const f of group.fields || []) {
    const v = vehicle[f.key];
    if (v != null && v !== '') {
      if (typeof v === 'boolean' && !v) continue;
      return true;
    }
  }
  return false;
}

export function formatFieldValue(vehicle, field) {
  const v = vehicle?.[field.key];
  if (v == null || v === '') return null;
  if (field.kind === 'bool') return v ? 'Yes' : null;
  if (typeof v === 'boolean') return v ? 'Yes' : null;
  return String(v);
}

export function summarizeFilledGroups(vehicle) {
  return VEHICLE_OPTIONAL_GROUPS.filter((g) => groupHasDisplayData(g.key, vehicle)).map((g) => g.title);
}
