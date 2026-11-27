import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialStatusStayInPlayDataBundleV1 }
  from '../source-data/official-status-stay-in-play-data-bundle-v1.mjs';

export const OFFICIAL_COORDINATED_STRIKE_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_coordinated_strike_policy_v1',
  version: '1.0.0',
  definitionId: 'unit:siege_tank/coordinated-strike-movement-phase@1',
  effectKind: 'coordinated_strike',
  weaponName: 'Shock Cannon',
  rangeMilliInches: 8000,
  expiresAt: 'cleanup_and_refresh',
  ruleAtomIds: Object.freeze([
    'rule-atom:coordinated-strike-selected-acting-model-v1',
    'rule-atom:faq-v1.3-coordinated-strike-latest-owner',
  ]),
  faqEntryId: 'faq-v1.3:76',
  faqAnswerHash: '2803af21e7cabf25c4259400cd9c39d7e88dcda15d3d8c06103008ec07d5f719',
  trainingTruth: false,
});

export const OFFICIAL_COORDINATED_STRIKE_POLICY_V2 = Object.freeze({
  ...OFFICIAL_COORDINATED_STRIKE_POLICY_V1,
  version: '1.1.0',
  requiresSiegeModeConsumer: true,
});

const policy = OFFICIAL_COORDINATED_STRIKE_POLICY_V1;
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true;
const liveModels = piece => (piece.models || []).filter(model =>
  model.isOnField !== false && model.isDestroyed !== true);

export function hasOfficialCoordinatedStrikeSourceV1(state) {
  return state.officialCharacteristicStatusFamilySourceBundle?.routes
    .some(route => route.definitionId === policy.definitionId
      && route.effectKind === policy.effectKind) === true;
}

export function hasOfficialCoordinatedStrikeCurrentConsumerV1(state) {
  const selected = state?.officialCoordinatedStrikeConsumerPolicy;
  if (!selected) return false;
  if (!hasOfficialCoordinatedStrikeSourceV1(state)
    || !isDeepStrictEqual(selected, OFFICIAL_COORDINATED_STRIKE_POLICY_V2)) {
    throw Error('COORDINATED_STRIKE_CONSUMER_POLICY_INVALID');
  }
  const bundle = state.officialSiegeModeDataBundle;
  if (!bundle) throw Error('COORDINATED_STRIKE_MODE_DATA_REQUIRED');
  verifyOfficialStatusStayInPlayDataBundleV1(bundle);
  const source = state.officialCharacteristicStatusFamilySourceBundle;
  const carrier = bundle.siegeModeCarrierRegistry.entries.find(row => row.recordKey === 'army_units:siege_tank');
  if (bundle.schema !== 'starcraft_tmg_official_siege_mode_data_bundle_v2'
    || bundle.sourceSnapshotHash !== source.sourceSnapshotHash
    || bundle.normalizedDatasetHash !== source.normalizedDatasetHash || !carrier
    || state.pieces.filter(piece => piece.officialUnitRecordKey === carrier.recordKey)
      .some(piece => piece.sourceRecordHash !== carrier.sourceRecordHash || piece.officialPayloadHash !== carrier.payloadHash)) {
    throw Error('COORDINATED_STRIKE_MODE_DATA_BINDING_INVALID');
  }
  return true;
}

function verifiedEffects(state) {
  hasOfficialCoordinatedStrikeCurrentConsumerV1(state);
  const route = state.officialCharacteristicStatusFamilySourceBundle?.routes
    .find(row => row.definitionId === policy.definitionId && row.effectKind === policy.effectKind);
  const results = [];
  for (const target of state.pieces || []) {
    const values = (target.officialAbilityEffects || []).filter(row => row.effectKind === policy.effectKind);
    if (values.length > 1) throw Error('COORDINATED_STRIKE_DUPLICATE_TARGET_OWNER');
    for (const value of values) {
      const { effectHash, ...body } = value;
      if (!route || hash(body) !== effectHash || value.sourceDefinitionId !== route.definitionId
        || value.sourceFeatureHash !== route.sourceFeatureHash || value.targetPieceId !== target.id
        || value.sourceSideKey !== target.sideKey || value.weaponScope !== policy.weaponName
        || value.rangeMilliInches !== policy.rangeMilliInches || value.expiresAt !== policy.expiresAt) {
        throw Error('COORDINATED_STRIKE_EFFECT_BINDING_INVALID');
      }
      results.push({ target, value });
    }
  }
  return results;
}

export function replaceOfficialCoordinatedStrikeEffectV1(state, target, effect) {
  verifiedEffects(state);
  const removed = (target.officialAbilityEffects || []).filter(row => row.effectKind === policy.effectKind);
  target.officialAbilityEffects = (target.officialAbilityEffects || [])
    .filter(row => row.effectKind !== policy.effectKind);
  target.officialAbilityEffects.push(effect);
  verifiedEffects(state);
  return removed.map(row => ({ sourcePieceId: row.sourcePieceId, effectHash: row.effectHash }));
}

export function listOfficialCoordinatedStrikeOriginsV1(state, pieceId) {
  const source = state.pieces?.find(piece => piece.id === pieceId);
  const effects = verifiedEffects(state);
  if (!active(source)) return [];
  return effects.filter(({ target, value }) => active(target)
    && value.sourcePieceId === source.id && value.sourceSideKey === source.sideKey
    && value.roundApplied === Number(state.round))
    .flatMap(({ target, value }) => liveModels(target).map(model => ({
      unitId: target.id, modelId: model.id, sourcePieceId: source.id,
      sourceDefinitionId: value.sourceDefinitionId, sourceEffectHash: value.effectHash,
      rangeMilliInches: value.rangeMilliInches,
    }))).sort((left, right) => left.modelId.localeCompare(right.modelId));
}

export function resolveOfficialCoordinatedStrikeOriginV1(state, pieceId, modelId) {
  const origin = listOfficialCoordinatedStrikeOriginsV1(state, pieceId)
    .find(row => row.modelId === modelId);
  if (!origin) throw Error('COORDINATED_STRIKE_ACTING_MODEL_UNAVAILABLE');
  const piece = state.pieces.find(row => row.id === origin.unitId);
  const model = liveModels(piece).find(row => row.id === modelId);
  return { ...origin, piece, model };
}
