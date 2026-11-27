import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_armour_roll_ordinal_policy_v1',
  version: '1.0.0',
  ruleAtomId: 'rule-atom:actual-armour-roll-ordinal-v1',
  countUnit: 'one_nonempty_armour_pool',
  commitBoundary: 'resolved_pools_before_damage_interrupts',
  activationScope: 'current_activation_identity_or_normal_round_phase_unit',
  duplicateRollPolicy: 'same_source_action_and_target_is_idempotent',
  trainingTruth: false,
});

const fail = code => { throw Error(code); };
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'historyHash'));

export function hasOfficialArmourRollOrdinalPolicyV1(state) {
  if (state.officialArmourRollOrdinalPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialArmourRollOrdinalPolicy, OFFICIAL_ARMOUR_ROLL_ORDINAL_POLICY_V1)) {
    fail('ARMOUR_ROLL_POLICY_INVALID');
  }
  return true;
}

function historyFor(state) {
  const history = state.officialArmourRollHistory;
  if (!history) return [];
  if (history.schema !== 'starcraft_tmg_armour_roll_history_v1'
    || !Array.isArray(history.rolls) || history.historyHash !== hash(withoutHash(history))) {
    fail('ARMOUR_ROLL_HISTORY_INVALID');
  }
  const ids = new Set();
  for (const row of history.rolls) {
    if (!row.rollId || ids.has(row.rollId) || !row.targetPieceId || !row.activationId
      || !Number.isSafeInteger(row.round) || row.round < 1
      || !Number.isSafeInteger(row.poolDice) || row.poolDice < 1) fail('ARMOUR_ROLL_HISTORY_ENTRY_INVALID');
    ids.add(row.rollId);
  }
  return history.rolls;
}

export function resolveOfficialArmourRollActivationIdV1(state, attackerPieceId) {
  const round = Number(state.round);
  const actor = state.pieces.find(piece => piece.id === attackerPieceId);
  if (!actor || !Number.isSafeInteger(round) || round < 1 || !state.phase) fail('ARMOUR_ROLL_ACTIVATION_REQUIRED');
  const window = state.selectedRosterActivationWindow || state.pendingCurrentProductRangedSequence;
  if (window && (window.round !== round || window.phase !== state.phase)) fail('ARMOUR_ROLL_ACTIVATION_STALE');
  const activationId = window?.activationId;
  if (activationId !== undefined && (typeof activationId !== 'string' || !activationId.trim())) {
    fail('ARMOUR_ROLL_ACTIVATION_ID_INVALID');
  }
  return activationId || `${round}:${state.phase}:${window?.sideKey || actor.sideKey}:${window?.pieceId || actor.id}`;
}

export function inspectOfficialArmourRollOrdinalsV1(state, { targetPieceId, attackerPieceId }) {
  if (!hasOfficialArmourRollOrdinalPolicyV1(state)) return null;
  if (!state.pieces.some(piece => piece.id === targetPieceId)) fail('ARMOUR_ROLL_TARGET_REQUIRED');
  const activationId = resolveOfficialArmourRollActivationIdV1(state, attackerPieceId);
  const rolls = historyFor(state).filter(row => row.round === Number(state.round) && row.targetPieceId === targetPieceId);
  return Object.freeze({ activationId, targetPieceId,
    armourRollOrdinalInRound: rolls.length + 1,
    armourRollOrdinalInActivation: rolls.filter(row => row.activationId === activationId).length + 1 });
}

// Querying never consumes an ordinal. The native damage consumer calls this
// after all saved defence pools resolve and before opening damage reactions or
// casualties. Those continuations retain the resolved pools and do not roll again.
export function recordOfficialArmourRollV1(state, { action, targetPieceId, poolDice }) {
  if (!hasOfficialArmourRollOrdinalPolicyV1(state)) return;
  if (!Number.isSafeInteger(poolDice) || poolDice < 0) fail('ARMOUR_ROLL_POOL_INVALID');
  if (poolDice === 0) return;
  const sourceActionHash = hash(action);
  const rollId = hash({ sourceActionHash, targetPieceId });
  const prior = historyFor(state);
  const duplicate = prior.find(row => row.rollId === rollId);
  if (duplicate) {
    if (duplicate.targetPieceId !== targetPieceId || duplicate.poolDice !== poolDice
      || duplicate.round !== Number(state.round) || duplicate.phase !== state.phase) fail('ARMOUR_ROLL_DUPLICATE_DRIFT');
    return;
  }
  const ordinals = inspectOfficialArmourRollOrdinalsV1(state, { targetPieceId, attackerPieceId: action.pieceId });
  const body = { schema: 'starcraft_tmg_armour_roll_history_v1', rolls: [...prior, {
    rollId, sourceActionHash, round: Number(state.round), phase: state.phase,
    ...ordinals, poolDice, trainingTruth: false,
  }], trainingTruth: false };
  state.officialArmourRollHistory = { ...body, historyHash: hash(body) };
}
