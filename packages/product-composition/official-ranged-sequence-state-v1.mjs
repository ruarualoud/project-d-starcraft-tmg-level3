import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';

// Shared persisted-sequence reader for attack execution and target modifiers.
// Keep the original validation and historical-room behavior in one place.
export function currentOfficialSelectedRosterRangedSequenceV1(state) {
  const pending = state.pendingCurrentProductRangedSequence;
  if (!pending) return null;
  if (typeof pending !== 'object' || Array.isArray(pending)) {
    throw Error('SELECTED_RANGED_PENDING_SEQUENCE_INVALID');
  }
  const body = Object.fromEntries(Object.entries(pending)
    .filter(([key]) => key !== 'sequenceHash'));
  if (pending.schema !== 'starcraft_tmg_official_current_product_ranged_sequence_v1'
    || pending.sequenceHash !== hashStarcraftTmgContract(body)) {
    throw Error('SELECTED_RANGED_PENDING_SEQUENCE_INVALID');
  }
  if (!Number.isSafeInteger(pending.round) || pending.round < 1
    || pending.round > Number(state.round) || pending.phase !== 'assault') {
    throw Error('SELECTED_RANGED_PENDING_SEQUENCE_SCOPE_INVALID');
  }
  // A completed earlier round's sequence remains historical stored data.
  if (pending.round < Number(state.round)) return null;
  if (state.phase !== pending.phase) {
    throw Error('SELECTED_RANGED_PENDING_SEQUENCE_PHASE_INVALID');
  }
  return pending;
}
