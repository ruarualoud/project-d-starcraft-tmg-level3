import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialBattlefieldMarkerV1, verifyOfficialBattlefieldMarkerV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';

const clone = value => structuredClone(value);
const seal = body => ({ ...body, effectHash: hash(body) });
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'effectHash'));
const fail = code => { throw Error(code); };

function markerFor(state, actor, coordinate, markerId) {
  if (!coordinate || Object.keys(coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
    || !Number.isSafeInteger(coordinate.xMilliInches) || !Number.isSafeInteger(coordinate.yMilliInches)) {
    fail('CHARACTERISTIC_AREA_COORDINATE_INVALID');
  }
  return createOfficialBattlefieldMarkerV1({ registry: state.officialBattlefieldTokenMarkerRegistry,
    markerId, markerKind: 'faction_indicator', markerRole: 'special_ability_area',
    coordinate: { x: coordinate.xMilliInches / 1000, y: coordinate.yMilliInches / 1000 },
    sideKey: actor.sideKey, anchorId: actor.id });
}

export function inspectOfficialCharacteristicAreaPlacementV1({ state, route, actor, coordinate }) {
  const marker = markerFor(state, actor, coordinate, 'characteristic-area-placement-preview');
  const projected = { ...state, board: { ...state.board,
    markers: [...(state.board.markers || []), marker] } };
  const range = evaluateOfficialWithinWhollyWithinV1({ state: projected,
    dataBundle: state.officialModelBaseGeometryDataBundle, source: { kind: 'marker', id: marker.markerId },
    targetUnitId: actor.id, rangeMilliInches: route.placementRangeMilliInches });
  if (!range.unitWithin) fail('CHARACTERISTIC_AREA_PLACEMENT_OUT_OF_RANGE');
  return { coordinate: clone(coordinate), range };
}

export function applyOfficialCharacteristicAreaEffectV1(state, route, actor, plan) {
  const coordinate = plan.canonicalParameters.coordinate;
  inspectOfficialCharacteristicAreaPlacementV1({ state, route, actor, coordinate });
  const effectId = hash({ definitionId: route.definitionId, sourcePlanHash: plan.planHash });
  const marker = markerFor(state, actor, coordinate, 'characteristic-area-' + effectId.slice(0, 24));
  const effect = seal({ schema: 'starcraft_tmg_characteristic_marker_area_effect_v1', effectId,
    effectKind: route.effectKind, sourceDefinitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    sourcePieceId: actor.id, sourceSideKey: actor.sideKey, sourcePlanHash: plan.planHash,
    markerId: marker.markerId, markerHash: marker.markerHash, roundApplied: Number(state.round),
    rangeMilliInches: route.rangeMilliInches, speedPenalty: route.speedPenalty,
    expiresAt: route.expiresAt, trainingTruth: false });
  state.board.markers = [...(state.board.markers || []), marker];
  state.characteristicAreaEffects = [...(state.characteristicAreaEffects || []), effect];
  return { marker, effect };
}

function currentAreas(bundle, state) {
  return (state.characteristicAreaEffects || []).map(effect => {
    const route = bundle.routes.find(row => row.definitionId === effect.sourceDefinitionId
      && row.sourceFeatureHash === effect.sourceFeatureHash && row.effectKind === 'marker_speed_debuff');
    const actor = state.pieces.find(piece => piece.id === effect.sourcePieceId);
    const marker = (state.board.markers || []).find(row => row.markerId === effect.markerId);
    if (!route || effect.schema !== 'starcraft_tmg_characteristic_marker_area_effect_v1'
      || effect.effectHash !== hash(withoutHash(effect)) || !actor
      || actor.officialUnitRecordKey !== route.recordKey || actor.sideKey !== effect.sourceSideKey
      || effect.rangeMilliInches !== route.rangeMilliInches || effect.speedPenalty !== route.speedPenalty
      || effect.expiresAt !== route.expiresAt || !marker || marker.markerHash !== effect.markerHash
      || marker.markerRole !== 'special_ability_area' || marker.anchorId !== actor.id || marker.sideKey !== actor.sideKey) {
      fail('CHARACTERISTIC_AREA_SOURCE_OR_MARKER_INVALID');
    }
    verifyOfficialBattlefieldMarkerV1(marker, state.officialBattlefieldTokenMarkerRegistry);
    return { effect, marker };
  });
}

export function projectOfficialCharacteristicAreaEffectsV1(bundle, state, piece) {
  const areas = currentAreas(bundle, state);
  if (!piece.isOnField || piece.isDestroyed || Number(piece.currentModels) <= 0) return [];
  return areas.filter(({ effect }) => effect.sourceSideKey !== piece.sideKey).map(({ effect, marker }) => {
    const range = evaluateOfficialWithinWhollyWithinV1({ state,
      dataBundle: state.officialModelBaseGeometryDataBundle, source: { kind: 'marker', id: marker.markerId },
      targetUnitId: piece.id, rangeMilliInches: effect.rangeMilliInches });
    return { markerId: marker.markerId, sourceDefinitionId: effect.sourceDefinitionId,
      effectHash: effect.effectHash, applies: range.unitWithin, speedPenalty: range.unitWithin ? effect.speedPenalty : 0,
      range };
  });
}

export function cleanupOfficialCharacteristicAreaEffectsV1(bundle, state, eventKind) {
  const areas = currentAreas(bundle, state);
  const expired = areas.filter(({ effect }) => effect.expiresAt === eventKind);
  return removeAreas(state, expired, eventKind, 'characteristic_area_expired');
}
export function removeOfficialCharacteristicAreasOnReserveReturnV1(bundle, state, sourcePieceId) {
  const owned = currentAreas(bundle, state).filter(({ effect, marker }) => effect.sourcePieceId === sourcePieceId
    && marker.stayInPlay !== true);
  return removeAreas(state, owned, 'return_to_reserves', 'characteristic_area_source_returned');
}
function removeAreas(state, expired, eventKind, eventType) {
  if (!expired.length) return [];
  const ids = new Set(expired.map(({ effect }) => effect.effectId));
  const markerIds = new Set(expired.map(({ marker }) => marker.markerId));
  state.characteristicAreaEffects = state.characteristicAreaEffects.filter(effect => !ids.has(effect.effectId));
  state.board.markers = state.board.markers.filter(marker => !markerIds.has(marker.markerId));
  return expired.map(({ effect, marker }) => ({ type: eventType,
    sourceDefinitionId: effect.sourceDefinitionId, markerId: marker.markerId, effectHash: effect.effectHash,
    eventKind, trainingTruth: false }));
}
