import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { getOfficialBattlefieldAssetComponentFootprintV1 }
  from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialBattlefieldTokenV1, verifyOfficialBattlefieldTokenV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { listOfficialOnFieldModelFootprintsV1 as modelBases, assertOfficialTokenPlacementSpaceV1 }
  from './official-battlefield-token-placement-space-v1.mjs';
import { createOfficialBattlefieldTokenPhysicalFootprintV1, doOfficialPhysicalFootprintsOverlapV1,
  evaluateOfficialWithinWhollyWithinV1, isOfficialPhysicalFootprintWhollyWithinRangeV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { recordOfficialBattlefieldAssetCreationV1, recordOfficialBattlefieldTokenRelocationV1,
  removeOfficialBattlefieldAssetV1 }
  from './official-battlefield-asset-family-adapter-v1.mjs';

export const OFFICIAL_FORCE_WALL_DEFINITION_ID = 'unit:tassadar/force-wall-movement-phase@1';
export const OFFICIAL_FORCE_WALL_PLACEMENT_ATOM_ID = 'rule-atom:source-bound-force-wall-pair-placement-v1';
export const OFFICIAL_FORCE_WALL_TRAVERSAL_ATOM_ID = 'rule-atom:source-bound-force-wall-traversal-v1';
export const OFFICIAL_TELEKINETIC_PUSH_DEFINITION_ID = 'unit:tassadar/telekinetic-push-assault-phase@1';
export const OFFICIAL_TELEKINETIC_PUSH_ATOM_ID = 'rule-atom:source-bound-force-wall-relative-placement-v1';
export const OFFICIAL_PSI_LIGHTNING_DEFINITION_ID = 'unit:tassadar/psi-lightning-assault-phase@1';
export const OFFICIAL_PSI_LIGHTNING_ATOM_ID = 'rule-atom:source-bound-force-wall-direct-damage-v1';
export const OFFICIAL_FORCE_WALL_TOKEN_COUNT = 2;

export function getOfficialForceWallFootprintV1(state) {
  return getOfficialBattlefieldAssetComponentFootprintV1(state.officialBattlefieldAssetComponentProfile, 'force_wall');
}

export function createOfficialForceWallTraversalPolicyV1(state, route) {
  if (route?.definitionId !== OFFICIAL_FORCE_WALL_DEFINITION_ID || route.effectKind !== 'force_wall_pair') {
    throw Error('FORCE_WALL_TRAVERSAL_SOURCE_REQUIRED');
  }
  const footprint = getOfficialForceWallFootprintV1(state);
  const body = { schema: 'starcraft_tmg_official_force_wall_traversal_policy_v1',
    definitionId: route.definitionId, sourceRouteHash: route.routeHash,
    sourceFeatureHash: route.sourceFeatureHash, componentEvidenceHash: footprint.evidenceHash,
    minimumCrossingSize: 3, expiresAt: route.expiresAt, trainingTruth: false };
  return Object.freeze({ ...body, policyHash: hash(body) });
}

export function readOfficialActiveForceWallFootprintsV1(state) {
  const policy = state.officialForceWallTraversalPolicy;
  if (!policy) return [];
  const tokens = (state.board.tokens || []).filter(token =>
    token.tokenKind === 'force_wall' && !token.isRemoved && !token.isDestroyed);
  if (!tokens.length) return [];
  const bindings = new Map((state.officialBattlefieldAssetBindings || []).map(row => [row.assetId, row]));
  const profile = getOfficialForceWallFootprintV1(state);
  return tokens.map(token => {
    const binding = bindings.get(token.tokenId);
    if (binding?.assetKind !== 'force_wall' || binding.consumed !== false
      || binding.assetHash !== token.tokenHash || binding.sourceDefinitionId !== policy.definitionId
      || binding.sourceFeatureHash !== policy.sourceFeatureHash || token.baseShape !== profile.baseShape
      || token.baseWidthMm !== profile.baseWidthMm || token.baseDepthMm !== profile.baseDepthMm) {
      throw Error('FORCE_WALL_TRAVERSAL_ASSET_BINDING_INVALID');
    }
    verifyOfficialBattlefieldTokenV1(token, state.officialBattlefieldTokenMarkerRegistry);
    return { token, binding, footprint: createOfficialBattlefieldTokenPhysicalFootprintV1(token) };
  });
}

export function consumeOfficialForceWallCrossingsV1(state, crossedTokenIds = []) {
  for (const id of crossedTokenIds) removeOfficialBattlefieldAssetV1(state, id);
}

export function expireOfficialForceWallsV1(state, eventKind) {
  if (eventKind !== 'cleanup_and_refresh') return [];
  const expired = readOfficialActiveForceWallFootprintsV1(state).filter(row => row.token.cleanupDisposition === 'remove');
  consumeOfficialForceWallCrossingsV1(state, expired.map(row => row.token.tokenId));
  return expired.map(({ token }) => ({ type: 'force_wall_expired', tokenId: token.tokenId, trainingTruth: false }));
}

function canonicalPosition({ xMilliInches, yMilliInches, rotationDegrees }) {
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches) || !Number.isFinite(rotationDegrees)) {
    throw Error('FORCE_WALL_POSITION_INVALID');
  }
  return { xMilliInches, yMilliInches,
    rotationDegrees: Number((((rotationDegrees % 180) + 180) % 180).toFixed(6)) % 180 };
}

function placementParameters(positions) {
  if (!Array.isArray(positions) || positions.length !== OFFICIAL_FORCE_WALL_TOKEN_COUNT) {
    throw Error('FORCE_WALL_PAIR_REQUIRED');
  }
  return positions.map(position => {
    if (!position || Object.keys(position).sort().join(',') !== 'rotationDegrees,xMilliInches,yMilliInches') {
      throw Error('FORCE_WALL_POSITION_INVALID');
    }
    return canonicalPosition(position);
  }).sort((a, b) => a.xMilliInches - b.xMilliInches || a.yMilliInches - b.yMilliInches
    || a.rotationDegrees - b.rotationDegrees);
}

function assertUnoccupied(state, casterBases, placements, ignoredTokenIds) {
  for (const [i, placement] of placements.entries()) {
    if (placements.slice(i + 1).some(other => doOfficialPhysicalFootprintsOverlapV1(placement, other))) {
      throw Error('FORCE_WALL_PAIR_OVERLAP');
    }
  }
  assertOfficialTokenPlacementSpaceV1(state, casterBases, placements, 'FORCE_WALL_POSITION_OCCUPIED', ignoredTokenIds);
}

export function prepareOfficialForceWallPairV1(state, route, actor, rawPositions) {
  const positions = placementParameters(rawPositions);
  const { baseShape, baseWidthMm, baseDepthMm } = getOfficialForceWallFootprintV1(state);
  const tokens = positions.map((position, index) => createOfficialBattlefieldTokenV1({
    registry: state.officialBattlefieldTokenMarkerRegistry, tokenKind: route.tokenKind,
    tokenId: `force-wall:${state.round}:${actor.id}:${index + 1}`,
    coordinate: { x: position.xMilliInches / 1000, y: position.yMilliInches / 1000 },
    baseShape, baseWidthMm, baseDepthMm, baseRotationDegrees: position.rotationDegrees,
    createdByPieceId: actor.id, createdRound: state.round,
  }));
  const footprints = tokens.map(token => createOfficialBattlefieldTokenPhysicalFootprintV1(token));
  const casterBases = modelBases(actor, state.officialModelBaseGeometryDataBundle);
  if (footprints.some(target => !casterBases.some(source =>
    isOfficialPhysicalFootprintWhollyWithinRangeV1({ source, target, rangeMilliInches: route.rangeMilliInches })))) {
    throw Error('FORCE_WALL_WHOLE_BASE_OUT_OF_RANGE');
  }
  assertUnoccupied(state, casterBases, footprints);
  return { positions, tokens };
}

export function applyOfficialForceWallPairV1(state, route, action, actor, events) {
  const { tokens } = prepareOfficialForceWallPairV1(state, route, actor, action.characteristicStatusPlan.canonicalParameters.positions);
  (state.board.tokens ??= []).push(...tokens);
  for (const token of tokens) {
    recordOfficialBattlefieldAssetCreationV1(state, route, action, actor, events, token, token.tokenId, token.coordinate);
  }
}

export function readOfficialFriendlyForceWallsV1(state, sideKey) {
  return readOfficialActiveForceWallFootprintsV1(state).filter(row => row.binding.sideKey === sideKey)
    .sort((a, b) => a.token.tokenId.localeCompare(b.token.tokenId));
}

export function prepareOfficialForceWallPushV1(state, route, actor, rawPositions) {
  const friendly = readOfficialFriendlyForceWallsV1(state, actor.sideKey);
  if (!friendly.length || !Array.isArray(rawPositions) || rawPositions.length !== friendly.length) {
    throw Error('FORCE_WALL_PUSH_ALL_FRIENDLY_WALLS_REQUIRED');
  }
  const parameters = new Map(rawPositions.map(position => {
    if (!position || Object.keys(position).sort().join(',') !== 'rotationDegrees,tokenId,xMilliInches,yMilliInches'
      || typeof position.tokenId !== 'string') throw Error('FORCE_WALL_POSITION_INVALID');
    return [position.tokenId, canonicalPosition(position)];
  }));
  if (parameters.size !== friendly.length || !friendly.every(row => parameters.has(row.token.tokenId))) {
    throw Error('FORCE_WALL_PUSH_ALL_FRIENDLY_WALLS_REQUIRED');
  }
  const registry = state.officialBattlefieldTokenMarkerRegistry;
  const moves = friendly.map(({ token, footprint }) => {
    const position = parameters.get(token.tokenId);
    const updated = createOfficialBattlefieldTokenV1({ ...token, registry,
      coordinate: { x: position.xMilliInches / 1000, y: position.yMilliInches / 1000 },
      baseRotationDegrees: position.rotationDegrees,
    });
    const destination = createOfficialBattlefieldTokenPhysicalFootprintV1(updated);
    if (!isOfficialPhysicalFootprintWhollyWithinRangeV1({
      source: footprint, target: destination, rangeMilliInches: route.rangeMilliInches,
    })) throw Error('FORCE_WALL_PUSH_WHOLE_BASE_OUT_OF_RANGE:' + token.tokenId);
    return { tokenId: token.tokenId, position, original: token, updated, destination };
  });
  assertUnoccupied(state, modelBases(actor, state.officialModelBaseGeometryDataBundle),
    moves.map(row => row.destination), new Set(parameters.keys()));
  return { positions: moves.map(row => ({ tokenId: row.tokenId, ...row.position })), moves };
}

export function applyOfficialForceWallPushV1(state, route, action, actor, events) {
  const { moves } = prepareOfficialForceWallPushV1(state, route, actor,
    action.characteristicStatusPlan.canonicalParameters.positions);
  for (const { original, updated } of moves) {
    const binding = recordOfficialBattlefieldTokenRelocationV1(state, original, updated);
    events.push({ type: 'force_wall_relocated', tokenId: updated.tokenId,
      previousTokenHash: original.tokenHash, tokenHash: updated.tokenHash, bindingHash: binding.bindingHash,
      coordinate: updated.coordinate, baseRotationDegrees: updated.baseRotationDegrees,
      sourceDefinitionId: route.definitionId, trainingTruth: false });
  }
}

export function inspectOfficialPsiLightningCoverageV1(state, route, actor) {
  const friendly = readOfficialFriendlyForceWallsV1(state, actor.sideKey);
  const dataBundle = state.officialModelBaseGeometryDataBundle;
  return state.pieces.filter(unit => unit.isOnField === true && unit.isDestroyed !== true
    && unit.models.some(model => model.isOnField !== false && model.isDestroyed !== true)).flatMap(unit => {
    const wallEvidence = friendly.flatMap(({ token }) => {
      const assessment = evaluateOfficialWithinWhollyWithinV1({ state, dataBundle,
        source: { kind: 'token', id: token.tokenId }, targetUnitId: unit.id, rangeMilliInches: route.rangeMilliInches });
      return assessment.unitWithin ? [{ tokenId: token.tokenId, tokenHash: token.tokenHash,
        nearestDistanceMilliInches: Math.min(...assessment.assessments.map(model => model.minimumDistanceMilliInches)),
      }] : [];
    });
    return wallEvidence.length ? [{ unitId: unit.id, sideKey: unit.sideKey, incomingDamage: route.damageAmount, wallEvidence }] : [];
  }).sort((a, b) => a.unitId.localeCompare(b.unitId));
}
