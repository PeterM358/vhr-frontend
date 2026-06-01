/**
 * Pick the best VehicleReminder row when multiple rows share reminder_type
 * (e.g. auto placeholder + owner_manual). Prefer scheduled rows over empty placeholders.
 */
export function pickReminderForType(reminders, reminderType) {
  const matches = (Array.isArray(reminders) ? reminders : []).filter(
    (row) => String(row?.reminder_type) === String(reminderType)
  );
  if (!matches.length) return null;

  const score = (row) => {
    let s = 0;
    if (row?.due_date) s += 8;
    if (row?.due_kilometers != null && row.due_kilometers !== '') s += 4;
    if (row?.due_operating_hours != null && row.due_operating_hours !== '') s += 2;
    const src = String(row?.source || '').toLowerCase();
    if (src === 'owner_manual' || src === 'manual') s += 1;
    return s;
  };

  return [...matches].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (a.id || 0) - (b.id || 0);
  })[0];
}

export function remindersByTypeMap(reminders) {
  const list = Array.isArray(reminders) ? reminders : [];
  const types = new Set(list.map((row) => row?.reminder_type).filter(Boolean));
  const map = {};
  types.forEach((reminderType) => {
    map[reminderType] = pickReminderForType(list, reminderType);
  });
  return map;
}
