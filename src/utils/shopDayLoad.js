/**
 * Daily booking load from shop calendar (offer / schedule pickers).
 */

import { formatDurationMinutes } from './laborDuration';

export function dateKeyLocal(d) {
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildDailyLoadMap(dailyLoad = []) {
  const map = new Map();
  (dailyLoad || []).forEach((row) => {
    if (!row?.date) return;
    map.set(row.date, {
      bookedCount: Number(row.booked_count) || 0,
      bookedLaborMinutes: Number(row.booked_labor_minutes) || 0,
      availableLaborMinutes:
        row.available_labor_minutes != null ? Number(row.available_labor_minutes) : null,
      remainingLaborMinutes:
        row.remaining_labor_minutes != null ? Number(row.remaining_labor_minutes) : null,
    });
  });
  return map;
}

export function getDayLoadRow(loadMap, date) {
  const key = dateKeyLocal(date);
  if (!key || !loadMap) return null;
  return loadMap.get(key) || null;
}

/** @returns {boolean} true when backend sent per-day labor capacity */
export function dayLoadUsesLaborCapacity(row) {
  return row != null && row.availableLaborMinutes != null && row.availableLaborMinutes > 0;
}

/** Group calendar `scheduled` rows by local calendar day. */
export function buildScheduledByDayMap(scheduled = []) {
  const map = new Map();
  (scheduled || []).forEach((item) => {
    const startIso = item.display_start || item.scheduled_start || item.client_preferred_start;
    if (!startIso) return;
    const key = dateKeyLocal(new Date(startIso));
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  map.forEach((items, key) => {
    items.sort((a, b) => {
      const aT = new Date(a.display_start || a.scheduled_start || 0).getTime();
      const bT = new Date(b.display_start || b.scheduled_start || 0).getTime();
      return aT - bT;
    });
    map.set(key, items);
  });
  return map;
}

export function getBookingsForDate(scheduledByDay, date) {
  const key = dateKeyLocal(date);
  if (!key || !scheduledByDay) return [];
  return scheduledByDay.get(key) || [];
}

export function formatCalendarBookingTime24(item) {
  const iso = item?.display_start || item?.scheduled_start || item?.client_preferred_start;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function formatCalendarBookingTime(item) {
  return formatCalendarBookingTime24(item) || '—';
}

export function formatBookingCountLabel(count) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  return n === 1 ? '1 booking' : `${n} bookings`;
}

export function formatBookedTimesShort(bookings = [], max = 3) {
  const times = [
    ...new Set(
      (bookings || [])
        .map((item) => formatCalendarBookingTime24(item))
        .filter(Boolean)
    ),
  ].sort();
  if (!times.length) return null;
  if (times.length <= max) return times.join(', ');
  return `${times.slice(0, max).join(', ')} +${times.length - max}`;
}

export function formatRepairTypeLabel(item) {
  const name = String(item?.repair_type_name || '').trim();
  return name || 'Not selected';
}

function pluralVehicleType(name, count) {
  const base = String(name || 'vehicle').trim().toLowerCase() || 'vehicle';
  if (count === 1) return base;
  if (base.endsWith('s')) return base;
  return `${base}s`;
}

export function summarizeBookingsByVehicleType(bookings = []) {
  const counts = new Map();
  (bookings || []).forEach((b) => {
    const typeName = String(b?.vehicle_type_name || 'vehicle').trim() || 'vehicle';
    const key = typeName.toLowerCase();
    const prev = counts.get(key) || { label: typeName, count: 0 };
    counts.set(key, { label: prev.label, count: prev.count + 1 });
  });
  return Array.from(counts.values())
    .map(({ label, count }) => `${count} ${pluralVehicleType(label, count)}`)
    .join(', ');
}

export function formatCalendarVehicleLabel(item) {
  const make = String(item?.vehicle_make || '').trim();
  const model = String(item?.vehicle_model || '').trim();
  const typeName = String(item?.vehicle_type_name || '').trim();
  let vehicle = 'Vehicle';
  if (make && model) vehicle = `${make} ${model}`;
  else if (make) vehicle = make;
  else if (item?.vehicle_license_plate) vehicle = item.vehicle_license_plate;
  if (typeName) return `${vehicle} (${typeName})`;
  return vehicle;
}

export function summarizeBookingsByService(bookings = []) {
  const counts = new Map();
  (bookings || []).forEach((b) => {
    const name = formatRepairTypeLabel(b);
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, count]) => (count > 1 ? `${count}× ${name}` : name))
    .join(', ');
}

/** Hero / peek line: labor-aware when backend sends capacity. */
export function formatDayLoadPeekLine(bookedCount, bookings = [], laborRow = null) {
  const laborPeek = formatLaborLoadPeekLine(laborRow, bookings);
  if (laborPeek) return laborPeek;
  const count = Number(bookedCount) || 0;
  if (count <= 0) return null;
  const bookingLabel = formatBookingCountLabel(count);
  const times = formatBookedTimesShort(bookings);
  if (times) return `${bookingLabel} · ${times}`;
  return bookingLabel;
}

export function formatDayLoadChipHint(bookedCount, bookings = [], laborRow = null) {
  const laborHint = formatLaborLoadChipHint(laborRow);
  if (laborHint) return laborHint;
  const count = Number(bookedCount) || 0;
  if (count <= 0) return null;
  const times = formatBookedTimesShort(bookings, 2);
  if (count === 1 && times) return `1 · ${times}`;
  if (times) return `${count} · ${times}`;
  return count === 1 ? '1 booking' : `${count} bookings`;
}

export function getBookedTimeSet(bookings = []) {
  return new Set(
    (bookings || [])
      .map((item) => formatCalendarBookingTime24(item))
      .filter(Boolean)
  );
}

/** @returns {'free'|'some'|'busy'|'full'} */
export function getLaborLoadLevel(bookedMinutes, availableMinutes) {
  const booked = Number(bookedMinutes) || 0;
  const available = availableMinutes != null ? Number(availableMinutes) : null;
  if (booked <= 0) return 'free';
  if (available != null && available > 0) {
    if (booked >= available) return 'full';
    if (booked >= Math.max(60, Math.ceil(available * 0.75))) return 'busy';
  }
  return 'some';
}

export function formatLaborLoadLabel(row) {
  if (!dayLoadUsesLaborCapacity(row)) return null;
  const booked = row.bookedLaborMinutes || 0;
  const available = row.availableLaborMinutes;
  if (booked <= 0) return `${formatDurationMinutes(available)} workday`;
  return `${formatDurationMinutes(booked)} / ${formatDurationMinutes(available)} labor`;
}

export function formatLaborLoadHeroLine(row, { jobMinutes } = {}) {
  if (!dayLoadUsesLaborCapacity(row)) return null;
  const booked = row.bookedLaborMinutes || 0;
  const remaining = row.remainingLaborMinutes;
  const available = row.availableLaborMinutes;
  if (booked <= 0) {
    if (jobMinutes && remaining != null && remaining >= jobMinutes) {
      return `No labor booked · ${formatDurationMinutes(remaining)} free for this job`;
    }
    return `No labor booked · ${formatDurationMinutes(available)} workday available`;
  }
  if (remaining != null && remaining <= 0) {
    return `${formatDurationMinutes(booked)} labor booked · day full`;
  }
  if (jobMinutes && remaining != null && remaining < jobMinutes) {
    return `${formatDurationMinutes(booked)} booked · tight for a ${formatDurationMinutes(jobMinutes)} job`;
  }
  if (remaining != null) {
    return `${formatDurationMinutes(booked)} labor booked · ${formatDurationMinutes(remaining)} still free`;
  }
  return `${formatDurationMinutes(booked)} labor booked this day`;
}

export function formatLaborLoadChipHint(row) {
  if (!dayLoadUsesLaborCapacity(row)) return null;
  const booked = row.bookedLaborMinutes || 0;
  const remaining = row.remainingLaborMinutes;
  if (booked <= 0 && remaining != null) {
    return `${formatDurationMinutes(remaining)} free`;
  }
  if (remaining != null) {
    return `${formatDurationMinutes(booked)} · ${formatDurationMinutes(remaining)} left`;
  }
  if (booked > 0) return formatDurationMinutes(booked);
  return null;
}

export function formatLaborLoadPeekLine(row, bookings = []) {
  if (!dayLoadUsesLaborCapacity(row)) return null;
  const booked = row.bookedLaborMinutes || 0;
  if (booked <= 0) return null;
  const count = row.bookedCount || bookings.length || 0;
  const times = formatBookedTimesShort(bookings);
  const labor = formatDurationMinutes(booked);
  if (count > 0 && times) return `${count} jobs · ${labor} · ${times}`;
  if (count > 0) return `${count} jobs · ${labor}`;
  return labor;
}

/** @returns {'free'|'some'|'busy'|'full'} */
export function getDayLoadLevel(bookedCount, capacity, laborRow = null) {
  if (dayLoadUsesLaborCapacity(laborRow)) {
    return getLaborLoadLevel(laborRow.bookedLaborMinutes, laborRow.availableLaborMinutes);
  }
  const count = Number(bookedCount) || 0;
  if (count <= 0) return 'free';
  if (capacity != null && capacity > 0) {
    if (count >= capacity) return 'full';
    if (count >= Math.max(1, Math.ceil(capacity * 0.75))) return 'busy';
  }
  return 'some';
}

export function formatDayLoadLabel(bookedCount, capacity, laborRow = null) {
  if (dayLoadUsesLaborCapacity(laborRow)) {
    return formatLaborLoadLabel(laborRow);
  }
  const count = Number(bookedCount) || 0;
  if (count <= 0) return null;
  const bookingWord = count === 1 ? 'booking' : 'bookings';
  if (capacity != null && capacity > 0 && count >= capacity) {
    return `${count}/${capacity} full`;
  }
  if (capacity != null && capacity > 0) {
    return `${count}/${capacity} ${bookingWord}`;
  }
  return formatBookingCountLabel(count);
}

export function formatDayLoadHeroLine(bookedCount, capacity, laborRow = null, options = {}) {
  if (dayLoadUsesLaborCapacity(laborRow)) {
    return formatLaborLoadHeroLine(laborRow, options);
  }
  const count = Number(bookedCount) || 0;
  if (count <= 0) {
    if (capacity != null && capacity > 0) {
      return `No bookings yet · you can take up to ${capacity} per day`;
    }
    return null;
  }
  const base = formatBookingCountLabel(count);
  const suffix = base ? `${base} already this day` : null;
  if (capacity != null && capacity > 0) {
    if (count >= capacity) {
      return `${suffix} · at your daily limit (${capacity})`;
    }
    return `${suffix} · your limit is ${capacity} per day`;
  }
  return suffix;
}

export const DAY_LOAD_CHIP_STYLES = {
  free: {},
  some: { borderColor: 'rgba(100,116,139,0.45)' },
  busy: { borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.12)' },
  full: { borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.14)' },
};

export const DAY_LOAD_TEXT_STYLES = {
  free: {},
  some: { color: '#64748b' },
  busy: { color: '#b45309' },
  full: { color: '#b91c1c', fontWeight: '700' },
};
