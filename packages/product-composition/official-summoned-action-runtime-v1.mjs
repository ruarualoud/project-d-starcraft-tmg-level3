import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialSummonDataBundleV1 } from '../source-data/official-summon-data-bundle-v1.mjs';
import { verifyOfficialSummonedCombatEligibilityPolicyV1 } from '../source-data/official-summoned-combat-eligibility-policy-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';

const runtimeId = 'official-summoned-action-runtime-v1';
const pendingKey = 'pendingOfficialSummonedAction';
const clone = value => structuredClone(value);
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));
const seal = (value, field) => ({ ...value, [field]: hash(value) });
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true && Number(piece.currentModels) > 0;
const fail = code => { throw Error(code); };

export function createOfficialSummonedActionRuntimeV1({ summonDataBundle, spatialRuntime, refreshState, combatEligibilityPolicy = null } = {}) {
  verifyOfficialSummonDataBundleV1(summonDataBundle);
  if (summonDataBundle.schema !== 'starcraft_tmg_official_summon_data_bundle_v2'
    || !spatialRuntime || typeof refreshState !== 'function') fail('SUMMONED_ACTION_CURRENT_CONSUMERS_REQUIRED');
  const definitions = summonDataBundle.currentDeploymentDefinitions;
  if (combatEligibilityPolicy) verifyOfficialSummonedCombatEligibilityPolicyV1(combatEligibilityPolicy);
  const ruleAtomIds = [...summonDataBundle.ruleClauses.map(row => row.atomId), 'rule-atom:source-authorized-summoned-move-v1'];
  const descriptor = { runtimeId, runtimeVersion: '1.0.0', sourceBundleHash: summonDataBundle.bundleHash,
    ruleAtomIds, immediateMoveOptional: true, linkedActivationAfterParent: true,
    ...(combatEligibilityPolicy ? { combatEligibilityPolicyHash: combatEligibilityPolicy.policyHash,
      combatEngagementRuleAtomId: combatEligibilityPolicy.ruleAtomId } : {}), trainingTruth: false };
  const owns = piece => piece?.isSummoned === true && definitions.some(row => row.sourceDefinitionId === piece.summonSourceDefinitionId);
  function pending(state) {
    const parent = state[pendingKey];
    if (!parent) return null;
    if (parent.schema !== 'starcraft_tmg_summoned_action_parent_v1' || parent.parentHash !== hash(withoutHash(parent))
      || parent.sourceBundleHash !== summonDataBundle.bundleHash || parent.round !== Number(state.round) || parent.phase !== state.phase
      || !['immediate_move', 'linked_activation'].includes(parent.purpose)
      || !Array.isArray(parent.childPieceIds) || !parent.childPieceIds.length
      || new Set(parent.childPieceIds).size !== parent.childPieceIds.length
      || parent.childPieceIds.some(id => {
        const piece = state.pieces.find(row => row.id === id);
        return !active(piece) || !owns(piece) || piece.sideKey !== parent.sideKey || piece.summonParentPieceId !== parent.parentPieceId;
      })) fail('SUMMONED_ACTION_PARENT_INVALID');
    return parent;
  }
  function projectedMoveState(state, parent) {
    if (parent.purpose !== 'immediate_move' || parent.childPieceIds.length !== 1 || state.phase !== 'movement'
      || state.activeSideKey !== parent.sideKey || !isDeepStrictEqual(state.selectedRosterActivationWindow, parent.parentActivationWindow)) {
      fail('SUMMONED_ACTION_MOVE_AUTHORIZATION_INVALID');
    }
    const projected = clone(state);
    const piece = projected.pieces.find(row => row.id === parent.childPieceIds[0]);
    if (piece.activatedPhases?.movement !== true || piece.summonActivationLock?.phase !== state.phase
      || piece.summonActivationLock?.round !== Number(state.round)) fail('SUMMONED_ACTION_PHASE_LOCK_REQUIRED');
    // A private, source-authorized execution scope for this one Move. The live
    // marker and Parent window are restored in the same accepted transition.
    piece.activatedPhases.movement = false;
    projected.selectedRosterActivationWindow = { ...clone(parent.parentActivationWindow), pieceId: piece.id, stage: 'before_action' };
    return projected;
  }
  function decline(state, parent) {
    return { actionType: 'decline_summoned_move', sideKey: parent.sideKey, phase: parent.phase,
      pieceId: parent.childPieceIds[0], executorId: runtimeId, executorVersion: '1.0.0', ruleAtomIds,
      parentHash: parent.parentHash, stateHash: hash(state), sourceBundleHash: summonDataBundle.bundleHash };
  }
  function enumerate(state, options = {}) {
    const parent = pending(state);
    if (parent?.purpose !== 'immediate_move') fail('SUMMONED_ACTION_IMMEDIATE_PARENT_REQUIRED');
    if (options.sideKey && options.sideKey !== parent.sideKey) return { candidates: [], parameterDomains: [] };
    const projected = projectedMoveState(state, parent);
    const menu = spatialRuntime.enumerate(projected, { sideKey: parent.sideKey });
    const source = menu.parameterDomains.find(row => row.actionType === 'move' && row.pieceId === parent.childPieceIds[0]);
    const domain = source ? seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_summoned_move_v1', actionType: 'move', sideKey: parent.sideKey, phase: parent.phase,
      pieceId: source.pieceId, executorId: runtimeId, executorVersion: '1.0.0', ruleAtomIds,
      parentHash: parent.parentHash, stateHash: hash(state), sourceDomain: source,
      parameterSchema: clone(source.parameterSchema), trainingTruth: false }, 'domainId') : null;
    return { candidates: [decline(state, parent)], parameterDomains: domain ? [domain] : [] };
  }
  function instantiate(state, domain, parameters) {
    const current = enumerate(state).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) fail('SUMMONED_ACTION_DOMAIN_STALE');
    const parent = pending(state);
    const value = spatialRuntime.instantiate(projectedMoveState(state, parent), domain.sourceDomain, parameters);
    const canonicalParameters = clone(value.canonicalParameters);
    return { canonicalParameters, action: {
      actionType: 'move', sideKey: parent.sideKey, phase: parent.phase, pieceId: domain.pieceId,
      executorId: runtimeId, executorVersion: '1.0.0', ruleAtomIds, parentHash: parent.parentHash,
      stateHash: hash(state), sourceBundleHash: summonDataBundle.bundleHash,
      parameters: clone(canonicalParameters), spatialAction: value.action } };
  }
  function apply(state, action, options = {}) {
    const parent = pending(state);
    if (parent?.purpose !== 'immediate_move') fail('SUMMONED_ACTION_IMMEDIATE_PARENT_REQUIRED');
    let moved = null;
    if (action.actionType === 'decline_summoned_move') {
      if (!isDeepStrictEqual(decline(state, parent), action)) fail('SUMMONED_ACTION_STALE');
    } else {
      const domain = enumerate(state).parameterDomains[0];
      if (!domain || !isDeepStrictEqual(instantiate(state, domain, action.parameters).action, action)) fail('SUMMONED_ACTION_STALE');
      moved = spatialRuntime.apply(projectedMoveState(state, parent), action.spatialAction, options);
    }
    const next = clone(moved?.state || state);
    const child = next.pieces.find(row => row.id === parent.childPieceIds[0]);
    child.activatedPhases[parent.phase] = true;
    next.selectedRosterActivationWindow = clone(parent.parentActivationWindow);
    next.activeSideKey = parent.sideKey;
    delete next[pendingKey];
    const event = { type: 'summoned_immediate_move_completed', pieceId: child.id, parentPieceId: parent.parentPieceId,
      sourceDefinitionId: child.summonSourceDefinitionId, declined: moved === null,
      parentHash: parent.parentHash, summonPhaseLockPreserved: true, trainingTruth: false };
    next.summonedActionHistory = [...(next.summonedActionHistory || []), event];
    const events = [...(moved?.events || []), event];
    if (moved) { next.log.at(-1).action = clone(action); next.log.at(-1).events = clone(events); }
    else next.log.push({ id: 'log-' + (next.log.length + 1), round: Number(next.round), phase: next.phase, action: clone(action), events: clone(events) });
    return { ...(moved || {}), ok: true, state: refreshState(next), action, events, runtimeId, runtimeVersion: '1.0.0', trainingTruth: false };
  }
  function blocked(state, pieceId) {
    const child = state.pieces.find(row => row.id === pieceId);
    return owns(child) && active(state.pieces.find(row => row.id === child.summonParentPieceId));
  }
  function filterEnumeration(state, menu) {
    const parent = pending(state);
    if (state.pendingOfficialReactionWindow) return menu;
    const allowed = row => parent?.purpose === 'linked_activation'
      ? parent.childPieceIds.includes(row.pieceId) : !blocked(state, row.pieceId);
    return { ...menu, candidates: menu.candidates.filter(allowed), parameterDomains: menu.parameterDomains.filter(allowed) };
  }
  function assertAction(state, action) {
    const parent = pending(state);
    if (state.pendingOfficialReactionWindow && action.sourceRuntimeKind === 'reaction') return;
    if (parent?.purpose === 'immediate_move' && action.sourceRuntimeKind !== 'summoned_action'
      || parent?.purpose === 'linked_activation' && !parent.childPieceIds.includes(action.pieceId)
      || !parent && blocked(state, action.pieceId)) fail('SUMMONED_ACTION_CONTINUATION_REQUIRED');
  }
  function afterTransition(before, transition) {
    const next = clone(transition.state);
    const events = [...transition.events];
    const previous = pending(before);
    const deployed = events.filter(row => row.type === 'summoned_unit_deployed'
      && definitions.some(definition => definition.sourceDefinitionId === row.sourceDefinitionId
        && definition.immediateMoveAuthorized === true));
    if (deployed.length) {
      if (deployed.length !== 1 || previous || next[pendingKey]) fail('SUMMONED_ACTION_PARENT_OVERLAP');
      const event = deployed[0];
      if (!next.selectedRosterActivationWindow || next.selectedRosterActivationWindow.pieceId !== event.parentPieceId) {
        fail('SUMMONED_ACTION_PARENT_ACTIVATION_REQUIRED');
      }
      next[pendingKey] = seal({ schema: 'starcraft_tmg_summoned_action_parent_v1', purpose: 'immediate_move',
        round: Number(next.round), phase: next.phase, sideKey: event.sideKey, sourceBundleHash: summonDataBundle.bundleHash,
        parentPieceId: event.parentPieceId, childPieceIds: [event.pieceId],
        parentActivationWindow: clone(next.selectedRosterActivationWindow), trainingTruth: false }, 'parentHash');
      events.push({ type: 'summoned_immediate_move_offered', pieceId: event.pieceId, parentPieceId: event.parentPieceId,
        parentHash: next[pendingKey].parentHash, optional: true, trainingTruth: false });
    } else if (previous?.purpose === 'linked_activation') {
      const finished = events.filter(row => row.type === 'unit_activation_finished').map(row => row.pieceId);
      const remaining = previous.childPieceIds.filter(id => !finished.includes(id));
      if (remaining.length) {
        next[pendingKey] = seal({ ...withoutHash(previous), childPieceIds: remaining }, 'parentHash');
        if (!next.pendingOfficialReactionWindow) next.activeSideKey = previous.sideKey;
      } else delete next[pendingKey];
    } else if (!previous) {
      const finished = events.find(row => row.type === 'unit_activation_finished');
      const children = finished ? next.pieces.filter(piece => active(piece) && owns(piece)
        && piece.summonParentPieceId === finished.pieceId && piece.activatedPhases?.[next.phase] !== true
        && !(piece.summonedInRound === Number(next.round) && piece.summonedInPhase === next.phase)) : [];
      const graph = combatEligibilityPolicy && next.phase === 'combat' && children.length
        ? deriveOfficialEngagementGraphV2(next) : null;
      const eligible = graph ? children.filter(piece => graph.engagedUnitIds.includes(piece.id)) : children;
      const skipped = children.filter(piece => !eligible.includes(piece));
      if (skipped.length) events.push({ type: 'summoned_linked_activation_ineligible',
        parentPieceId: finished.pieceId, childPieceIds: skipped.map(piece => piece.id).sort(),
        phase: next.phase, reason: 'combat_requires_engaged_unit', graphHash: graph.graphHash,
        policyHash: combatEligibilityPolicy.policyHash, ruleAtomId: combatEligibilityPolicy.ruleAtomId,
        trainingTruth: false });
      if (eligible.length) {
        next[pendingKey] = seal({ schema: 'starcraft_tmg_summoned_action_parent_v1', purpose: 'linked_activation',
          round: Number(next.round), phase: next.phase, sideKey: finished.sideKey, sourceBundleHash: summonDataBundle.bundleHash,
          parentPieceId: finished.pieceId, childPieceIds: eligible.map(row => row.id).sort(), trainingTruth: false }, 'parentHash');
        if (!next.pendingOfficialReactionWindow) next.activeSideKey = finished.sideKey;
        events.push({ type: 'summoned_linked_activation_required', parentPieceId: finished.pieceId,
          childPieceIds: next[pendingKey].childPieceIds, trainingTruth: false });
      }
    }
    if (events.length > transition.events.length) next.log.at(-1).events = clone(events);
    return { ...transition, state: next, events };
  }
  return Object.freeze({ descriptor, pending, enumerate, instantiate, apply, assertAction, filterEnumeration, afterTransition });
}
