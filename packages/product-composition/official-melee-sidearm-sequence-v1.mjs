import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAttackProfileCatalogueV2 } from '../source-data/official-attack-profile-catalogue-v2.mjs';

export const OFFICIAL_MELEE_SIDEARM_ATOM_ID = 'rule-atom:source-bound-melee-sidearm-sequence-v1';
export const OFFICIAL_MELEE_SIDEARM_FINISH_ACTION = 'finish_melee_attack_sequence';
export const OFFICIAL_DEFILER_BITE_DEFINITION_ID = 'unit:defiler/cancerous-bite-combat-phase@1';
export const OFFICIAL_DEFILER_SIDEARM_DEFINITION_IDS = Object.freeze([
  'unit:defiler/claws-combat-phase@1', OFFICIAL_DEFILER_BITE_DEFINITION_ID,
]);
const coreHash = '27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54';
const clawsKey = 'army_units:defiler::combat::Claws', biteKey = 'army_units:defiler::combat::Cancerous Bite';
const biteText = 'RANGE: E | TARGET: Ground | RoA: 2 | HIT: 3+ | DMG: 2\nSURGE: - (-)\n\nCRITICAL HIT (1), SIDEARM';
const seal = body => ({ ...body, sequenceHash: hash(body) });
const fail = code => { throw Error(code); };
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'sequenceHash'));

function policyFor(catalogue) {
  verifyOfficialAttackProfileCatalogueV2(catalogue);
  const claws = catalogue.profilesByProfileKey[clawsKey], bite = catalogue.profilesByProfileKey[biteKey];
  if (!claws || !bite || bite.sourceTextHash !== hash(biteText)
    || bite.rateOfAttack !== 2 || bite.hitThreshold !== 3 || bite.damage !== 2
    || bite.costSmall !== 20 || bite.costLarge !== 20
    || !bite.effects.some(row => row.effectAtomId === 'attack-effect:sidearm-v1')
    || !bite.effects.some(row => row.effectAtomId === 'attack-effect:critical-hit-v1' && row.parameters.bypassArmourDice === 1)) {
    fail('MELEE_SIDEARM_SOURCE_UNSUPPORTED');
  }
  const body = { schema: 'starcraft_tmg_melee_sidearm_policy_v1', version: '1.0.0',
    sourceCoreByteHash: coreHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, carrierRecordKey: 'army_units:defiler', maximumCarrierModels: 1,
    ordinaryProfileKey: clawsKey, ordinaryProfileHash: claws.profileHash,
    sidearmProfileKey: biteKey, sidearmProfileHash: bite.profileHash,
    separateBatches: true, independentTargetChoices: true, closeRanksOnce: true,
    explicitVoluntaryStop: true, ruleAtomId: OFFICIAL_MELEE_SIDEARM_ATOM_ID };
  return { ...body, policyHash: hash(body) };
}
export function createOfficialMeleeSidearmPolicyV1({ context, catalogue }) {
  if (context.manifest.source.references.core.byteHash !== coreHash) fail('MELEE_SIDEARM_CORE_SOURCE_REQUIRED');
  return policyFor(catalogue);
}
export function hasOfficialMeleeSidearmPolicyV1(state) {
  if (state?.officialMeleeSidearmPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialMeleeSidearmPolicy, policyFor(state.officialAttackProfileCatalogueV2))) {
    fail('MELEE_SIDEARM_POLICY_MISMATCH');
  }
  return true;
}
export function isOfficialMeleeSidearmCarrierV1(state, piece) {
  return hasOfficialMeleeSidearmPolicyV1(state) && piece?.officialUnitRecordKey === 'army_units:defiler'
    && piece.maxModels === 1 && (piece.selectedUpgradeNames || []).some(name => String(name).toLowerCase() === 'cancerous bite');
}
export function readOfficialMeleeSidearmSequenceV1(state) {
  const sequence = state.pendingOfficialMeleeSidearmSequence;
  if (sequence === undefined) return null;
  if (!hasOfficialMeleeSidearmPolicyV1(state)) fail('MELEE_SIDEARM_SEQUENCE_POLICY_REQUIRED');
  const policy = state.officialMeleeSidearmPolicy, actor = state.pieces.find(row => row.id === sequence.pieceId);
  const allowed = [policy.ordinaryProfileKey, policy.sidearmProfileKey];
  if (sequence.schema !== 'starcraft_tmg_melee_sidearm_sequence_v1' || sequence.sequenceHash !== hash(withoutHash(sequence))
    || sequence.policyHash !== policy.policyHash || sequence.round !== Number(state.round) || sequence.phase !== 'combat'
    || state.phase !== 'combat' || sequence.sideKey !== actor?.sideKey || !isOfficialMeleeSidearmCarrierV1(state, actor)
    || !Array.isArray(sequence.usedProfileKeys) || !sequence.usedProfileKeys.length || sequence.usedProfileKeys.length > 2
    || new Set(sequence.usedProfileKeys).size !== sequence.usedProfileKeys.length || sequence.usedProfileKeys.some(key => !allowed.includes(key))
    || !Array.isArray(sequence.completedBatches) || sequence.completedBatches.length !== sequence.usedProfileKeys.length
    || !isDeepStrictEqual(sequence.completedBatches.map(row => row.profileKey).sort(), sequence.usedProfileKeys)
    || !['decline', 'move'].includes(sequence.closeRanksMode) || sequence.trainingTruth !== false
    || sequence.completedBatches.some(row => !sequence.usedProfileKeys.includes(row.profileKey)
      || !/^[a-f0-9]{64}$/u.test(row.attackPlanHash) || !Array.isArray(row.targetUnitIds) || !row.targetUnitIds.length)) {
    fail('MELEE_SIDEARM_SEQUENCE_INVALID');
  }
  return sequence;
}
export function isOfficialMeleeSidearmProfileAllowedV1(state, piece, profileKey) {
  const sequence = readOfficialMeleeSidearmSequenceV1(state);
  if (sequence && (sequence.pieceId !== piece.id || sequence.usedProfileKeys.includes(profileKey))) return false;
  if (!isOfficialMeleeSidearmCarrierV1(state, piece)) return !sequence;
  const policy = state.officialMeleeSidearmPolicy;
  return [policy.ordinaryProfileKey, policy.sidearmProfileKey].includes(profileKey);
}
export function recordOfficialMeleeSidearmBatchV1(state, action) {
  const previous = readOfficialMeleeSidearmSequenceV1(state);
  const actor = state.pieces.find(row => row.id === action.pieceId);
  if (!isOfficialMeleeSidearmCarrierV1(state, actor)
    || !isOfficialMeleeSidearmProfileAllowedV1(state, actor, action.meleePlan.profileKey)) fail('MELEE_SIDEARM_BATCH_NOT_AVAILABLE');
  const sequence = seal({ schema: 'starcraft_tmg_melee_sidearm_sequence_v1', policyHash: state.officialMeleeSidearmPolicy.policyHash,
    sideKey: action.sideKey, pieceId: action.pieceId, round: Number(state.round), phase: 'combat',
    usedProfileKeys: [...(previous?.usedProfileKeys || []), action.meleePlan.profileKey].sort(),
    completedBatches: [...(previous?.completedBatches || []), { profileKey: action.meleePlan.profileKey,
      attackPlanHash: action.meleePlan.fightPlanHash, targetUnitIds: action.meleePlan.allocations.map(row => row.targetUnitId) }],
    closeRanksMode: previous?.closeRanksMode || action.meleePlan.closeRanksMode, trainingTruth: false });
  state.pendingOfficialMeleeSidearmSequence = sequence;
  return sequence;
}
