import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
import { readOfficialWave3MissionSourceV1 } from '../source-data/official-wave3-mission-source-v1.mjs';
import {
  createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from './official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialEngagementGraphV2, deriveOfficialMissionMarkerSurfacePlacementV2 } from './official-engagement-graph-v2.mjs';
import { officialRectangleUnionCoversBasesV1 } from './official-footprint-rectangle-union-geometry-v1.mjs';

const SCHEMA = 'starcraft_tmg_artefact_hunt_custody_v1';
const SIDES = ['player1', 'player2'];
const HASH = /^[0-9a-f]{64}$/u;
const TOLERANCE = 1;
const milli = value => Math.round(value * 1000);
const otherSide = side => side === 'player1' ? 'player2' : 'player1';
const fail = (code, detail = '') => { throw Error(detail ? code + ':' + detail : code); };
const hash = hashStarcraftTmgContract;
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true
  && piece.isInReserves !== true && piece.currentModels > 0;
const liveModels = piece => piece.models.filter(model => model.isOnField === true && model.isDestroyed !== true);

function seal(body) {
  return { ...body, custodyHash: hash(body) };
}

function markerFootprint(marker) {
  const diameter = Math.round(marker.diameterMillimeters / 2 / 25.4 * 1000) * 2;
  return createOfficialPhysicalFootprintV1({
    objectId: marker.id, kind: 'mission_marker', shape: 'round',
    center: { xMilliInches: milli(marker.xInches), yMilliInches: milli(marker.yInches) },
    widthMilliInches: diameter, depthMilliInches: diameter,
  });
}

function footprints(state, unit, models = liveModels(unit)) {
  return models.map(model => createOfficialModelBaseFootprintV1({
    piece: unit, model, dataBundle: state.officialModelBaseGeometryDataBundle,
  }));
}

function supply(piece) {
  if (!Number.isSafeInteger(piece?.currentSupply) || piece.currentSupply < 0) {
    fail('ARTEFACT_HUNT_CURRENT_SUPPLY_INVALID', piece?.id);
  }
  return piece.currentSupply;
}

function currentControl(state) {
  const events = (state.log || []).flatMap(entry => entry.events || []).filter(event =>
    event.type === 'mission_marker_control_determined' && Number(event.round) === state.round);
  if (events.length !== 1 || !HASH.test(events[0].controlResolutionHash)) fail('ARTEFACT_HUNT_CURRENT_CONTROL_REQUIRED');
  const [event] = events;
  return event;
}

function hasCurrentControlReceipt(state, event, marker) {
  if (marker.artefactDropRound === state.round && !marker.controlDeterminedAt) return false;
  const result = event.markerResults.find(entry => entry.markerId === marker.id);
  if (!result || result.nextControlSideKey !== (marker.controlSideKey ?? null)
    || marker.controlDeterminedAt?.round !== state.round
    || marker.controlDeterminedAt?.controlResolutionHash !== event.controlResolutionHash) {
    fail('ARTEFACT_HUNT_CURRENT_CONTROL_REQUIRED', marker.id);
  }
  return true;
}

function markerAffinity(state, marker) {
  const affinities = state.officialMissionDeploymentDraftBinding?.markerAffinityByNumber;
  if (!affinities || !Object.hasOwn(affinities, marker.number)
    || (affinities[marker.number] !== null && !SIDES.includes(affinities[marker.number]))) {
    fail('ARTEFACT_HUNT_MARKER_AFFINITY_REQUIRED', marker.id);
  }
  return affinities[marker.number];
}

function friendlyInfluenceCells(state, side) {
  const segments = state.officialDeploymentGeometryBinding?.entryEdgesByPlayer?.[side]?.segments;
  if (!segments?.length) fail('ARTEFACT_HUNT_FRIENDLY_INFLUENCE_GEOMETRY_REQUIRED', side);
  return segments.map(({ zoneRectangle: zone }) => ({
    shape: 'axis_aligned_rectangle',
    minXMilliInches: milli(zone.xMin), maxXMilliInches: milli(zone.xMax),
    minYMilliInches: milli(zone.yMin), maxYMilliInches: milli(zone.yMax),
  }));
}

export function createOfficialArtefactHuntKernelV1({ context, missionRecordKey }) {
  const source = readOfficialWave3MissionSourceV1(context);
  const entry = source.missions.find(row => row.family === 'artefact_hunt'
    && row.profile.recordKey === missionRecordKey);
  if (!entry) fail('ARTEFACT_HUNT_FROZEN_MISSION_REQUIRED');
  const rules = entry.rules;
  const binding = Object.freeze({ missionRecordKey, engagementScale: entry.profile.engagementScale,
    sourceProfileHash: entry.profile.profileHash, sourceBundleHash: source.bundleHash });

  function verify(state, custody) {
    const { custodyHash, ...body } = custody || {};
    if (body.schema !== SCHEMA || hash(body) !== custodyHash || hash(body.binding) !== hash(binding)
      || state.engagementScale !== binding.engagementScale
      || Object.keys(body.byMarkerId ?? {}).length !== state.board.missionMarkers.length
      || state.board.missionMarkers.some(marker => !Object.hasOwn(body.byMarkerId, marker.id))) {
      fail('ARTEFACT_HUNT_CUSTODY_BINDING_INVALID');
    }
    return body;
  }

  function initialize(state) {
    if (state.engagementScale !== binding.engagementScale) fail('ARTEFACT_HUNT_SCALE_MISMATCH');
    const byMarkerId = Object.fromEntries(state.board.missionMarkers.map(marker => [marker.id, null]));
    return seal({ schema: SCHEMA, binding, byMarkerId });
  }

  function claimOptions(state, custody, side) {
    verify(state, custody);
    if (!SIDES.includes(side) || state.phase !== 'cleanup' || state.round < rules.claim.startsRound
      || state.terminal === true || state.gameOver === true) return [];
    const control = currentControl(state);
    const claimedUnits = new Set(Object.values(custody.byMarkerId).filter(row => row?.status === 'carried')
      .map(row => row.carrierUnitId));
    const markers = state.board.missionMarkers.filter(marker => custody.byMarkerId[marker.id] === null
      && marker.isActivated === true && !marker.isRemoved && marker.controlSideKey === side
      && markerAffinity(state, marker) !== side && hasCurrentControlReceipt(state, control, marker));
    const options = [];
    for (const unit of state.pieces.filter(unit => active(unit) && unit.sideKey === side && !claimedUnits.has(unit.id))) {
      const bases = footprints(state, unit);
      for (const marker of markers) {
        const target = markerFootprint(marker);
        const distance = Math.min(...bases.map(left => evaluateOfficialPhysicalFootprintRelationV1({ left, right: target })
          .minimumSeparationMilliInches));
        if (distance <= rules.claim.rangeMilliInches + TOLERANCE) {
          options.push({ round: state.round, sideKey: side, markerId: marker.id, carrierUnitId: unit.id,
            distanceMilliInches: distance, controlResolutionHash: control.controlResolutionHash });
        }
      }
    }
    return options.sort((a, b) => a.carrierUnitId.localeCompare(b.carrierUnitId) || a.markerId.localeCompare(b.markerId));
  }

  function applyClaim(state, custody, option) {
    const body = verify(state, custody);
    const candidate = claimOptions(state, custody, option?.sideKey).find(row => hash(row) === hash(option));
    if (!candidate) fail('ARTEFACT_HUNT_CLAIM_UNAVAILABLE');
    return seal({ ...body, byMarkerId: { ...body.byMarkerId, [candidate.markerId]: { status: 'carried',
      carrierSideKey: candidate.sideKey, carrierUnitId: candidate.carrierUnitId, claimRound: state.round,
      controlResolutionHash: candidate.controlResolutionHash } } });
  }

  function applyClaimToBoard(state, custody, option) {
    const nextCustody = applyClaim(state, custody, option);
    const next = structuredClone(state);
    next.board.missionMarkers.find(marker => marker.id === option.markerId).isRemoved = true;
    return { state: next, custody: nextCustody };
  }

  function observeDropTriggers(before, after, custody, ruleEvent = {}) {
    const body = verify(before, custody);
    verify(after, custody);
    const graph = deriveOfficialEngagementGraphV2(after);
    const afterById = new Map(after.pieces.map(unit => [unit.id, unit]));
    const changed = { ...body.byMarkerId };
    for (const [markerId, held] of Object.entries(body.byMarkerId)) {
      if (held?.status !== 'carried') continue;
      const prior = before.pieces.find(unit => unit.id === held.carrierUnitId);
      if (!active(prior)) fail('ARTEFACT_HUNT_CARRIER_BEFORE_STATE_INVALID', held.carrierUnitId);
      const unit = afterById.get(held.carrierUnitId);
      const enemyIds = new Set(graph.modelEdges.filter(edge => edge.leftUnitId === held.carrierUnitId
        || edge.rightUnitId === held.carrierUnitId).map(edge =>
        edge.leftUnitId === held.carrierUnitId ? edge.rightUnitId : edge.leftUnitId));
      const enemySupply = [...enemyIds].reduce((total, id) => total + supply(afterById.get(id)), 0);
      const triggers = [];
      const placeTiming = ruleEvent.placeTimingByUnitId?.[held.carrierUnitId]
        ?? (ruleEvent.pieceId === held.carrierUnitId ? ruleEvent.placeTiming : undefined);
      if (placeTiming === rules.drop.placeTiming) triggers.push('place');
      const morphedModelId = ruleEvent.fullyMorphedModelIdByUnitId?.[held.carrierUnitId];
      if (morphedModelId) triggers.push('removed_from_battlefield');
      else if (unit?.isDestroyed) triggers.push('destroyed');
      else if (unit?.isInReserves) triggers.push('returned_to_reserves');
      else if (!active(unit)) triggers.push('removed_from_battlefield');
      if (active(unit) && supply(unit) < supply(prior)) triggers.push('current_supply_reduced');
      if (active(unit) && enemySupply > supply(unit)) triggers.push('engaged_with_greater_combined_enemy_current_supply');
      if (!triggers.length) continue;
      let bases;
      if (triggers.includes('place') && rules.drop.placeTiming === 'before_resolving_place') {
        bases = footprints(before, prior);
      } else if (active(unit)) {
        bases = footprints(after, unit);
      } else if (morphedModelId || triggers.includes('destroyed')) {
        const priorModels = liveModels(prior);
        const lastRemovedModelId = morphedModelId ?? ruleEvent.lastRemovedModelIdByUnitId?.[held.carrierUnitId]
          ?? ruleEvent.lastRemovedModelId;
        const last = priorModels.find(model => model.id === lastRemovedModelId)
          || (!morphedModelId && priorModels.length === 1 ? priorModels[0] : null);
        if (!last) fail('ARTEFACT_HUNT_LAST_REMOVED_MODEL_RECEIPT_REQUIRED', held.carrierUnitId);
        bases = footprints(before, prior, [last]);
      } else {
        bases = footprints(before, prior);
      }
      changed[markerId] = { ...held, status: 'pending_opponent_drop', triggers,
        placingSideKey: otherSide(held.carrierSideKey),
        rangeMilliInches: rules.drop.placementRangeMilliInches, referenceFootprints: bases };
    }
    return seal({ ...body, byMarkerId: changed });
  }

  function pendingOpponentDrops(state, custody) {
    const body = verify(state, custody);
    return Object.entries(body.byMarkerId).filter(([, held]) => held?.status === 'pending_opponent_drop')
      .map(([markerId, held]) => ({ markerId, ...held })).sort((a, b) => a.markerId.localeCompare(b.markerId));
  }

  function prepareOpponentDrop(state, custody, choice) {
    const body = verify(state, custody);
    const { sideKey, markerId, coordinate } = choice || {};
    const pending = body.byMarkerId[markerId];
    if (pending?.status !== 'pending_opponent_drop' || sideKey !== pending.placingSideKey) {
      fail('ARTEFACT_HUNT_DROP_PLACING_SIDE_INVALID');
    }
    if (!Number.isSafeInteger(coordinate?.xMilliInches) || !Number.isSafeInteger(coordinate?.yMilliInches)) {
      fail('ARTEFACT_HUNT_DROP_COORDINATE_INVALID');
    }
    const marker = state.board.missionMarkers.find(row => row.id === markerId);
    if (marker.isRemoved !== true) fail("ARTEFACT_HUNT_DROP_MARKER_NOT_IN_CUSTODY", markerId);
    const xInches = coordinate.xMilliInches / 1000;
    const yInches = coordinate.yMilliInches / 1000;
    const footprint = markerFootprint({ ...marker, xInches, yInches });
    const distance = Math.min(...pending.referenceFootprints.map(left =>
      evaluateOfficialPhysicalFootprintRelationV1({ left, right: footprint }).minimumSeparationMilliInches));
    if (distance > pending.rangeMilliInches + TOLERANCE) fail('ARTEFACT_HUNT_DROP_OUTSIDE_TWO_INCHES', markerId);
    const surface = deriveOfficialMissionMarkerSurfacePlacementV2(state, footprint);
    const action = { actionType: 'place_artefact_hunt_marker', markerId, sideKey,
      coordinate: { xMilliInches: coordinate.xMilliInches, yMilliInches: coordinate.yMilliInches },
      distanceMilliInches: distance, surface, preStateHash: hash(state), custodyHash: custody.custodyHash };
    return { ...action, actionHash: hash(action) };
  }

  function applyOpponentDrop(state, custody, action) {
    const expected = prepareOpponentDrop(state, custody, action);
    if (hash(expected) !== hash(action)) fail('ARTEFACT_HUNT_DROP_ACTION_STALE');
    const next = structuredClone(state);
    const marker = next.board.missionMarkers.find(row => row.id === expected.markerId);
    Object.assign(marker, { xInches: expected.coordinate.xMilliInches / 1000,
      yInches: expected.coordinate.yMilliInches / 1000, elevation: expected.surface.elevation,
      supportTerrainPieceId: expected.surface.supportTerrainIds[0] ?? null,
      isRemoved: false, artefactDropRound: state.round });
    delete marker.controlDeterminedAt;
    const body = verify(next, custody);
    const nextCustody = seal({ ...body, byMarkerId: { ...body.byMarkerId, [marker.id]: null } });
    return { state: next, custody: nextCustody };
  }

  function prepareFinalMarkerPoints(state, custody) {
    verify(state, custody);
    if (state.phase !== 'cleanup' || state.round !== rules.finalScoring.round) fail('ARTEFACT_HUNT_FINAL_SCORING_WINDOW_REQUIRED');
    const awards = { player1: 0, player2: 0 };
    for (const marker of state.board.missionMarkers) {
      const held = custody.byMarkerId[marker.id];
      if (held?.status === 'pending_opponent_drop') fail('ARTEFACT_HUNT_DROP_PLACEMENT_REQUIRED', marker.id);
      if (held?.status === 'carried') {
        const carrier = state.pieces.find(unit => unit.id === held.carrierUnitId);
        if (!active(carrier) || carrier.sideKey !== held.carrierSideKey) fail('ARTEFACT_HUNT_CARRIER_INVALID', marker.id);
        const cells = friendlyInfluenceCells(state, carrier.sideKey);
        const bases = footprints(state, carrier);
        if (bases.length && bases.every(base => officialRectangleUnionCoversBasesV1(cells, [base]))) {
          awards[carrier.sideKey] += rules.finalScoring.carrierWhollyWithinFriendlyInfluenceVp;
        }
      }
      const owner = markerAffinity(state, marker);
      if (owner && (!held || held.carrierSideKey === owner)) awards[owner] += rules.finalScoring.ownMarkerNotClaimedByEnemyVp;
    }
    return awards;
  }

  return Object.freeze({ binding, initialize, claimOptions, applyClaim, applyClaimToBoard,
    observeDropTriggers, pendingOpponentDrops, prepareOpponentDrop, applyOpponentDrop, prepareFinalMarkerPoints });
}
