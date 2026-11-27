import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialBattlefieldMarkerV1, verifyOfficialBattlefieldMarkerV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { alternateOfficialPhaseActivationV1, listOfficialPhaseActivationUnitIdsV1 }
  from '../rule-atoms/official-phase-activation-availability-v1.mjs';

export const OFFICIAL_EXECUTORS_WILL_DEFINITION_ID = 'unit:tassadar/executor-s-will-movement-phase@1';
const executorId = 'official-executors-will-continuation-v1';
const ruleAtomIds = ['rule-atom:source-bound-executors-will-activation-order-v1'];
const types = ['use_executors_will', 'decline_executors_will'];
const key = 'officialExecutorsWillEffects';
const schema = 'starcraft_tmg_official_executors_will_effect_v1';
const markerRole = 'executors_will_target';
const withoutHash = ({ effectHash, ...body }) => body;
const seal = body => ({ ...body, effectHash: hash(body) });

export function markOfficialExecutorsWillTargetsV1(state, route, action, actor) {
  const plan = action.characteristicStatusPlan;
  const targets = plan.canonicalParameters.targetUnitIds;
  const registry = state.officialBattlefieldTokenMarkerRegistry;
  const markers = targets.map(targetPieceId => createOfficialBattlefieldMarkerV1({
    registry, markerId: `executors-will:${state.round}:${actor.id}:${targetPieceId}`,
    markerKind: 'faction_indicator', markerRole, anchorId: targetPieceId, sideKey: actor.sideKey,
  }));
  (state.board.markers ??= []).push(...markers);
  const effect = seal({ schema, stage: 'marked', ownerSideKey: actor.sideKey, sourcePieceId: actor.id,
    sourceDefinitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash, sourceRouteHash: route.routeHash,
    sourcePlanHash: plan.planHash, round: Number(state.round),
    markByUnitId: Object.fromEntries(markers.map(marker => [marker.anchorId, marker.markerId])),
    completedUnitIds: [], trainingTruth: false });
  (state[key] ??= []).push(effect);
  return { type: 'executors_will_marked', pieceId: actor.id, effectHash: effect.effectHash,
    targetUnitIds: [...targets], markerIds: markers.map(marker => marker.markerId), trainingTruth: false };
}

function removeIndicators(state, effect) {
  const ids = new Set(Object.values(effect.markByUnitId));
  const removed = (state.board.markers || []).filter(marker => ids.has(marker.markerId));
  state.board.markers = (state.board.markers || []).filter(marker => !ids.has(marker.markerId));
  return removed.map(marker => marker.markerId).sort();
}

export function expireOfficialExecutorsWillV1(state, eventKind) {
  if (eventKind !== 'cleanup_and_refresh' || !state[key]?.length) return [];
  const events = state[key].map(effect => ({ type: 'executors_will_expired', effectHash: effect.effectHash,
    removedMarkerIds: removeIndicators(state, effect), trainingTruth: false }));
  state[key] = [];
  return events;
}

function stateRows(state, route) {
  const rows = state[key] || [];
  if (rows.some(row => row.schema !== schema || row.effectHash !== hash(withoutHash(row))
    || row.sourceDefinitionId !== route.definitionId || row.sourceFeatureHash !== route.sourceFeatureHash
    || row.sourceRouteHash !== route.routeHash || row.round !== Number(state.round)
    || !['marked', 'offered', 'granted'].includes(row.stage))) throw Error('EXECUTORS_WILL_STATE_INVALID');
  return rows;
}

function remainingUnits(state, effect) {
  return listOfficialPhaseActivationUnitIdsV1(state, effect.ownerSideKey, 'assault')
    .filter(id => !effect.completedUnitIds.includes(id));
}

function appendEvents(state, events) {
  if (!events.length) return;
  const latest = state.log?.at(-1);
  if (latest) latest.events = [...(latest.events || []), ...events];
}

export function createOfficialExecutorsWillRuntimeV1(route) {
  const descriptor = { executorId, version: '1.0.0', actions: types, ruleAtomIds, sourceRouteHash: route.routeHash };

  function offer(state) {
    if (state.phase !== 'assault') return null;
    const rows = stateRows(state, route);
    if (rows.some(row => row.stage === 'granted')) return null;
    return rows.find(row => row.stage === 'offered' && row.ownerSideKey === state.activeSideKey) || null;
  }

  function candidates(state, options = {}) {
    const pending = offer(state);
    if (!pending || (options.sideKey || state.activeSideKey) !== pending.ownerSideKey) return [];
    const actionTypes = remainingUnits(state, pending).length >= 2 ? types : [types[1]];
    return actionTypes.map(actionType => ({ actionType, sideKey: pending.ownerSideKey, phase: 'assault',
      pieceId: pending.sourcePieceId, effectHash: pending.effectHash, stateHashBefore: hash(state),
      executorId, executorVersion: descriptor.version, ruleAtomIds, trainingTruth: false }));
  }

  function apply(stateInput, action) {
    if (!candidates(stateInput).some(row => isDeepStrictEqual(row, action))) throw Error('EXECUTORS_WILL_CHOICE_STALE');
    const state = structuredClone(stateInput);
    const pending = offer(state);
    const used = action.actionType === types[0];
    state[key] = state[key].flatMap(row => row !== pending ? [row]
      : used ? [seal({ ...withoutHash(row), stage: 'granted' })] : []);
    const event = { type: used ? 'executors_will_granted' : 'executors_will_declined',
      ownerSideKey: pending.ownerSideKey, triggeredByUnitId: pending.triggeredByUnitId,
      consecutiveActivations: used ? 2 : 0, trainingTruth: false };
    (state.log ??= []).push({ id: 'log-' + (state.log.length + 1),
      round: Number(state.round), phase: state.phase, action: structuredClone(action), events: [event] });
    return { ok: true, state, action, events: [event], trainingTruth: false };
  }

  function afterTransition(before, result) {
    if (before.phase !== 'assault' || result.state.phase !== 'assault' || !result.state[key]?.length) return result;
    const finished = result.events.find(event => event.type === 'unit_activation_finished' && event.phase === 'assault');
    if (!finished) return result;
    const state = structuredClone(result.state);
    const events = [];
    state[key] = stateRows(state, route).flatMap(row => {
      if (row.stage === 'granted' && row.ownerSideKey === finished.sideKey) {
        if (row.completedUnitIds.includes(finished.pieceId)) throw Error('EXECUTORS_WILL_REPEATED_FRIENDLY_ACTIVATION');
        const updated = seal({ ...withoutHash(row), completedUnitIds: [...row.completedUnitIds, finished.pieceId] });
        const continueGrant = updated.completedUnitIds.length < 2 && remainingUnits(state, updated).length > 0;
        events.push({ type: 'executors_will_activation_counted', pieceId: finished.pieceId,
          ownerSideKey: row.ownerSideKey, completedCount: updated.completedUnitIds.length,
          remainingConsecutiveActivations: continueGrant ? 1 : 0, trainingTruth: false });
        if (!continueGrant) alternateOfficialPhaseActivationV1(state, row.ownerSideKey, 'assault');
        return continueGrant ? [updated] : [];
      }
      if (row.stage !== 'marked' || row.ownerSideKey === finished.sideKey) return [row];
      const marker = (state.board.markers || []).find(entry => entry.markerId === row.markByUnitId[finished.pieceId]);
      if (marker) {
        verifyOfficialBattlefieldMarkerV1(marker, state.officialBattlefieldTokenMarkerRegistry);
        if (marker.markerRole !== markerRole || marker.anchorId !== finished.pieceId || marker.sideKey !== row.ownerSideKey) {
          throw Error('EXECUTORS_WILL_MARKER_BINDING_INVALID');
        }
      }
      const triggered = Boolean(marker) && remainingUnits(state, row).length >= 2;
      events.push({ type: 'executors_will_indicators_cleared', ownerSideKey: row.ownerSideKey,
        firstEnemyActivationPieceId: finished.pieceId, removedMarkerIds: removeIndicators(state, row),
        opportunityOpened: triggered, trainingTruth: false });
      return triggered ? [seal({ ...withoutHash(row), stage: 'offered', triggeredByUnitId: finished.pieceId })] : [];
    });
    if (!events.length) return result;
    const priority = state[key].find(row => row.stage === 'granted') || state[key].find(row => row.stage === 'offered');
    if (priority) state.activeSideKey = priority.ownerSideKey;
    appendEvents(state, events);
    return { ...result, state, events: [...result.events, ...events] };
  }

  return { descriptor, offer, candidates, apply, afterTransition };
}
