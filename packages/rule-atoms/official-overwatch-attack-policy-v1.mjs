import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID = 'unit:auto_turret/overwatch-assault-phase@1';
export const OFFICIAL_AUTO_TURRET_GAUSS_CANNON_DEFINITION_ID = 'unit:auto_turret/gauss-cannon-assault-phase@1';
export const OFFICIAL_OVERWATCH_PARENT_KEY = 'pendingOfficialAutoTurretOverwatch';
export const OFFICIAL_OVERWATCH_ATOM_ID = 'rule-atom:source-bound-overwatch-outside-activation-attack-v1';
export const OFFICIAL_OVERWATCH_PROFILE_KEY = 'army_units:auto_turret::assault::Gauss Cannon';
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));

export function readOfficialOverwatchAttackGrantV1(state) {
  const parent = state[OFFICIAL_OVERWATCH_PARENT_KEY];
  if (!parent || parent.stage !== 'attack') return null;
  const bundle = state.officialReactionFamilySourceBundle;
  const route = bundle?.routes.find(row => row.definitionId === OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID);
  const resolution = state.officialReactionResolutionHistory?.find(row => row.triggerHash === parent.triggerHash);
  const effect = resolution?.effects.find(row => row.effectKind === 'overwatch_ranged_attack');
  const source = state.pieces.find(row => row.id === parent.sourcePieceId);
  if (parent.schema !== 'starcraft_tmg_auto_turret_overwatch_parent_v1'
    || parent.parentHash !== hash(withoutHash(parent)) || parent.round !== Number(state.round)
    || parent.phase !== 'assault' || state.phase !== 'assault'
    || !route || route.effectKind !== 'overwatch_ranged_attack'
    || parent.sourceBundleHash !== bundle.bundleHash
    || !resolution?.consumedByHost || resolution.triggerKind !== 'unit_activation_ended'
    || resolution.timing !== 'outside_activation' || resolution.resolutionHash !== parent.resolutionHash
    || !effect || effect.definitionId !== route.definitionId || effect.sourceFeatureHash !== route.sourceFeatureHash
    || effect.sourcePieceId !== source?.id || effect.targetPieceId !== parent.targetPieceId
    || effect.sideKey !== source?.sideKey || source.officialUnitRecordKey !== 'army_units:auto_turret'
    || parent.profileKey !== OFFICIAL_OVERWATCH_PROFILE_KEY) {
    throw Error('OVERWATCH_ATTACK_GRANT_INVALID');
  }
  return { sourcePieceId: source.id, sideKey: source.sideKey, targetPieceId: parent.targetPieceId,
    profileKey: parent.profileKey, sourceDefinitionId: route.definitionId, triggerHash: parent.triggerHash,
    parentHash: parent.parentHash };
}
