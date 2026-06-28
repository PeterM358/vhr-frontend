import {
  createReceivingSession,
  getReceivingSession,
  listReceivingSessions,
} from '../api/warehouse';

/** Resume the latest open pending batch for this kind, or start a new one. */
export async function loadOrCreateReceivingSession(
  token,
  { batchKind = 'receipt', forceNew = false, batchId = null } = {}
) {
  if (batchId) {
    return getReceivingSession(token, batchId);
  }
  if (!forceNew) {
    const sessions = await listReceivingSessions(token);
    const existing = (sessions || []).find(
      (row) => row.status === 'pending' && row.batch_kind === batchKind
    );
    if (existing?.id) {
      return getReceivingSession(token, existing.id);
    }
  }
  return createReceivingSession(token, { batchKind });
}

export function defaultPieceUnit(units = []) {
  return (
    units.find((u) => u.code === 'piece' || u.symbol === 'pcs') ||
    units.find((u) => u.dimension === 'count') ||
    units[0] ||
    null
  );
}
