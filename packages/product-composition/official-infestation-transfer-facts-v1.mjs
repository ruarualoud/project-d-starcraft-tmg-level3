import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { allowsOfficialAbilityUnitRecipientV13 } from '../rule-atoms/official-structure-targeting-policy-v13.mjs';

export const OFFICIAL_INFESTATION_TRANSFER_DEFINITION_ID = 'unit:infested_missile_turret/infestation-any-phase@1';
export const officialInfestationStatusNameV1 = status => String(typeof status === 'string' ? status
  : status?.statusName || status?.name || '').trim().toLowerCase();
export const isOfficialInfestationTransferLiveUnitV1 = piece => piece?.isOnField === true
  && !piece.isDestroyed && Number(piece.currentModels) > 0;

export function resolveOfficialInfestationTransferTargetsV1(state, context, source) {
  const witness = context?.infestationWitness;
  if (!witness) return [];
  const { witnessHash, ...body } = witness;
  const fallen = witness.fallenPiece;
  if (witnessHash !== hash(body) || witness.round !== Number(state.round) || witness.phase !== state.phase
    || !fallen?.id || !isOfficialInfestationTransferLiveUnitV1(fallen)
    || !(fallen.statuses || []).some(status => officialInfestationStatusNameV1(status) === 'infestation')) {
    throw Error('INFESTATION_TRANSFER_WITNESS_INVALID');
  }
  if (!source || source.sideKey === fallen.sideKey || !isOfficialInfestationTransferLiveUnitV1(source)) return [];
  const measurement = { ...state, pieces: [...state.pieces.filter(piece => piece.id !== fallen.id), fallen] };
  return state.pieces.filter(target => target.id !== fallen.id && target.sideKey === fallen.sideKey
    && isOfficialInfestationTransferLiveUnitV1(target) && allowsOfficialAbilityUnitRecipientV13(state, target)
    && fallen.models.filter(model => model.isOnField !== false && !model.isDestroyed).some(model =>
      evaluateOfficialWithinWhollyWithinV1({ state: measurement, dataBundle: state.officialModelBaseGeometryDataBundle,
        source: { kind: 'model', unitId: fallen.id, modelId: model.id }, targetUnitId: target.id,
        rangeMilliInches: 8000 }).unitWithin)).map(target => target.id).sort();
}

export function applyOfficialInfestationTransferStatusV1(state, route, source, targetId, context) {
  if (!resolveOfficialInfestationTransferTargetsV1(state, context, source).includes(targetId)) {
    throw Error('INFESTATION_TRANSFER_TARGET_INVALID');
  }
  const target = state.pieces.find(piece => piece.id === targetId);
  const body = { statusName: 'INFESTATION', statusKind: 'DEBUFF', sourceDefinitionId: route.definitionId,
    sourceFeatureHash: route.sourceFeatureHash, sourcePieceId: source.id, sourceSideKey: source.sideKey,
    targetPieceId: target.id, sourceWitnessHash: context.infestationWitness.witnessHash,
    appliedRound: Number(state.round), appliedPhase: state.phase, trainingTruth: false };
  const status = { ...body, statusEffectHash: hash(body) };
  target.statuses = [...(target.statuses || []).filter(entry => officialInfestationStatusNameV1(entry) !== 'infestation'), status];
  return status;
}
