import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { officialRangedDefenderContinuationSideV1,
  OFFICIAL_RANGED_CHOICE_PARENT_KEY } from './official-ranged-choice-context-v1.mjs';

export const OFFICIAL_POINT_DEFENSE_PARENT_KEY = 'pendingOfficialPointDefenseAttack';
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export function officialPointDefenseFactsHashV1(state) {
  const facts = without(state, ['log', OFFICIAL_POINT_DEFENSE_PARENT_KEY, OFFICIAL_RANGED_CHOICE_PARENT_KEY]);
  const parent = state[OFFICIAL_POINT_DEFENSE_PARENT_KEY];
  if (parent && officialRangedDefenderContinuationSideV1(state, parent)) facts.activeSideKey = parent.sideKey;
  if (facts.gameClock) facts.gameClock = { ...facts.gameClock, transition: 0 };
  return hash(facts);
}

export function readOfficialPointDefenseParentV1(state) {
  const parent = state[OFFICIAL_POINT_DEFENSE_PARENT_KEY];
  if (!parent) return null;
  if (parent.schema !== 'starcraft_tmg_point_defense_attack_checkpoint_v1'
    || parent.parentHash !== hash(without(parent, ['parentHash']))
    || parent.round !== Number(state.round) || parent.phase !== state.phase
    || parent.factsHash !== officialPointDefenseFactsHashV1(state)
    || !['choice', 'ready'].includes(parent.stage)
    || state.activeSideKey !== (parent.stage === 'choice' ? parent.defenderSideKey
      : officialRangedDefenderContinuationSideV1(state, parent) || parent.sideKey)
    || !Array.isArray(parent.triggeredSourcePieceIds) || !Array.isArray(parent.completed)
    || new Set(parent.triggeredSourcePieceIds).size !== parent.triggeredSourcePieceIds.length
    || new Set(parent.completed.map(row => row.sourcePieceId)).size !== parent.completed.length
    || parent.completed.some(row => !parent.triggeredSourcePieceIds.includes(row.sourcePieceId)
      || !Array.isArray(row.removedDieIds) || row.removedDieIds.length > 2)
    || parent.completed.flatMap(row => row.removedDieIds).some(id => !parent.originalDieIds.includes(id))
    || new Set(parent.completed.flatMap(row => row.removedDieIds)).size !== parent.completed.flatMap(row => row.removedDieIds).length
    || (parent.stage === 'ready') !== (parent.completed.length === parent.triggeredSourcePieceIds.length)) {
    throw Error('POINT_DEFENSE_PARENT_INVALID');
  }
  return parent;
}

export function projectOfficialCompletedPointDefenseV1(state, context) {
  const parent = readOfficialPointDefenseParentV1(state);
  if (!parent || parent.stage !== 'ready' || context.templateSpillover
    || context.attackerPieceId !== parent.pieceId || context.targetPieceId !== parent.targetId
    || context.profileKey !== parent.profileKey) return null;
  return { sourcePieceIds: parent.completed.map(row => row.sourcePieceId),
    removedDieIds: parent.completed.flatMap(row => row.removedDieIds).sort() };
}
