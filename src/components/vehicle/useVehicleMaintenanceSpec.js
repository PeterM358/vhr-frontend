import { useEffect, useState } from 'react';
import { lookupVehicleMaintenanceSpec } from '../../api/vehicles';

export function maintenanceSpecToFormStrings(spec) {
  if (!spec) return {};
  const oilParts = [spec.oil_viscosity, spec.oil_approval].filter(Boolean);
  const battery =
    spec.battery_type && spec.battery_capacity_ah
      ? `${spec.battery_type} ${spec.battery_capacity_ah}Ah`
      : spec.battery_type || '';
  return {
    oil_specification: oilParts.join(' / ') || '',
    battery_type: battery,
  };
}

export function useVehicleMaintenanceSpec({
  vehicleTypeId,
  catalogBrand,
  catalogModel,
  catalogGeneration,
  catalogEngine,
  year,
  fuelType,
  engineCode,
}) {
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const ready = catalogBrand && catalogModel && year && fuelType;
    if (!ready) {
      setFound(false);
      setSpec(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    lookupVehicleMaintenanceSpec({
      vehicleType: vehicleTypeId,
      catalogBrand,
      catalogModel,
      catalogGeneration,
      catalogEngine,
      year,
      fuelType,
      engineCode,
    })
      .then((result) => {
        if (cancelled) return;
        setFound(Boolean(result?.found));
        setSpec(result?.spec || null);
      })
      .catch(() => {
        if (cancelled) return;
        setFound(false);
        setSpec(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    vehicleTypeId,
    catalogBrand,
    catalogModel,
    catalogGeneration,
    catalogEngine,
    year,
    fuelType,
    engineCode,
  ]);

  return { loading, found, spec };
}

export function yearsFromGenerations(generations) {
  const years = new Set();
  const current = new Date().getFullYear();
  for (const generation of generations || []) {
    const from = generation.production_year_from;
    const to = generation.production_year_to || current;
    if (from) {
      for (let y = to; y >= from; y -= 1) {
        years.add(y);
      }
    }
  }
  if (!years.size) {
    for (let y = current; y >= 1980; y -= 1) {
      years.add(y);
    }
  }
  return [...years].sort((a, b) => b - a);
}

export function generationForYear(generations, year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return '';
  const match = (generations || []).find((g) => {
    const from = g.production_year_from;
    const to = g.production_year_to || new Date().getFullYear();
    if (!from) return false;
    return y >= from && y <= to;
  });
  return match ? String(match.id) : '';
}

export function enginesForFuel(engines, fuelType) {
  if (!fuelType) return engines || [];
  return (engines || []).filter(
    (e) => !e.fuel_type || String(e.fuel_type).toLowerCase() === String(fuelType).toLowerCase()
  );
}
