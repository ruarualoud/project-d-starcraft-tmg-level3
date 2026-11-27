import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash, canonicalStarcraftTmgJson } from '../authoritative-engine/referee-crypto-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { inspectOfficialBombardBindingsV1, OFFICIAL_BOMBARD_DEFINITION_ID } from './official-bombard-runtime-v1.mjs';

export const OFFICIAL_BOMBARD_TARGETING_ATOM_ID = 'rule-atom:bombard-source-bound-ranged-targeting-v1';

export function createOfficialBombardTargetingPolicyV1({ source }) {
  const { bundleHash, ...body } = source || {};
  if (source?.schema !== 'starcraft_tmg_bombard_source_v1' || bundleHash !== hash(body)
    || source.definitionId !== OFFICIAL_BOMBARD_DEFINITION_ID || source.tokenKind !== 'bile_bomb'
    || source.weaponName !== 'Bile Bomb' || source.targetRangeMilliInches !== 3000) {
    throw Error('BOMBARD_TARGETING_SOURCE_INVALID');
  }
  return { schema: 'starcraft_tmg_bombard_targeting_policy_v1', version: '1.0.0',
    ruleAtomId: OFFICIAL_BOMBARD_TARGETING_ATOM_ID, sourceBundleHash: source.bundleHash,
    targetRangeMilliInches: source.targetRangeMilliInches, ignoresPrintedRange: true,
    ignoresLineOfSightRequirement: true, ignoresHiddenTargetingRestriction: true, trainingTruth: false };
}

export function hasOfficialBombardTargetingPolicyV1(state) {
  if (!state.officialBombardTargetingPolicy) return false;
  if (!isDeepStrictEqual(state.officialBombardTargetingPolicy,
    createOfficialBombardTargetingPolicyV1({ source: state.officialBombardSourceBundle }))) {
    throw Error('BOMBARD_TARGETING_POLICY_INVALID');
  }
  return true;
}

export function findOfficialBombardTargetingBindingV1(state, piece, profile) {
  if (!hasOfficialBombardTargetingPolicyV1(state) || piece.officialUnitRecordKey !== state.officialBombardSourceBundle.recordKey
    || profile.recordKey !== piece.officialUnitRecordKey || profile.weaponName !== state.officialBombardSourceBundle.weaponName) return null;
  const bindings = inspectOfficialBombardBindingsV1(state).filter(binding => binding.sourcePieceId === piece.id
    && binding.sideKey === piece.sideKey && binding.round === Number(state.round));
  if (bindings.length > 1) throw Error('BOMBARD_MULTIPLE_CURRENT_BINDINGS_INVALID');
  return bindings[0] || null;
}

export function resolveOfficialBombardTargetingContextV1(state, piece, target, profile) {
  const binding = findOfficialBombardTargetingBindingV1(state, piece, profile);
  if (!binding) throw Error('BOMBARD_ATTACK_MODE_UNAVAILABLE');
  const measured = evaluateOfficialWithinWhollyWithinV1({ state, dataBundle: state.officialModelBaseGeometryDataBundle,
    source: { kind: 'token', id: binding.tokenId }, targetUnitId: target.id,
    rangeMilliInches: state.officialBombardTargetingPolicy.targetRangeMilliInches });
  // Use the native contract's canonical wire representation before embedding
  // the receipt in a domain/action. Optional undefined fields are not JSON data.
  const measurement = JSON.parse(canonicalStarcraftTmgJson(measured));
  if (!measurement.unitWithin) throw Error('BOMBARD_TARGET_OUTSIDE_AREA');
  return { tokenId: binding.tokenId, tokenHash: binding.tokenHash, sourceBindingHash: binding.bindingHash,
    sourceBundleHash: binding.sourceBundleHash, sourcePieceId: piece.id, round: binding.round,
    targetRangeMilliInches: state.officialBombardTargetingPolicy.targetRangeMilliInches,
    measurement, measurementHash: measurement.resultHash, printedRangeIgnored: true,
    lineOfSightRequirementIgnored: true, hiddenTargetingRestrictionIgnored: true, trainingTruth: false };
}
