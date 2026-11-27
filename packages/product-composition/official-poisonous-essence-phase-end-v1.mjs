import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { listOfficialPoisonousEssenceMarksV1 } from '../rule-atoms/official-poisonous-essence-marks-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';
import { resolveOfficialNonLethalDamageV1 } from '../rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs';
import { hasOfficialNonLethalDamagePolicyV1, hasOfficialNonLethalStandardDamagePolicyV1 }
  from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { verifyOfficialCharacteristicStatusFamilySourceBundleV1, resolveOfficialEffectiveCombatProfileV1 }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { hasOfficialShieldedLifecyclePolicyV1 } from '../source-data/official-shielded-lifecycle-policy-v1.mjs';

export const OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID = 'card:defiler_mound/poisonous-essence-any@1';
export const OFFICIAL_POISONOUS_ESSENCE_ATOM_ID = 'rule-atom:source-bound-engaged-biological-phase-end-non-lethal-v1';
const runtimeId = 'official-poisonous-essence-phase-end-v1';
const actionType = 'resolve_poisonous_essence_phase_end';
const orderedAction = 'resolve_ordered_poisonous_essence_effect';
const live = piece => piece?.isOnField === true && !piece.isDestroyed && piece.currentModels > 0;
const liveModels = piece => (piece.models || []).filter(model => model.isOnField !== false && !model.isDestroyed);
const fail = code => { throw Error(code); };

function routeFor(source) {
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(source);
  const route = source.routes.find(row => row.definitionId === OFFICIAL_POISONOUS_ESSENCE_DEFINITION_ID);
  if (!route || route.effectKind !== 'poisonous_essence' || route.phase !== 'movement'
    || route.sourceKind !== 'card_feature' || route.resourceType !== null || route.resourceCost !== 0
    || route.nonLethalDamage !== 2 || route.expiresAt !== 'cleanup_and_refresh') fail('POISONOUS_ESSENCE_SOURCE_REQUIRED');
  return route;
}
export function createOfficialPoisonousEssencePolicyV1({ context, source }) {
  const route = routeFor(source);
  if (context.manifest.source.references.core.byteHash !== '27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54') {
    fail('POISONOUS_ESSENCE_CORE_SOURCE_REQUIRED');
  }
  const body = { schema: 'starcraft_tmg_poisonous_essence_policy_v1', version: '1.0.0',
    sourceSnapshotHash: source.sourceSnapshotHash, normalizedDatasetHash: source.normalizedDatasetHash,
    sourceBundleHash: source.bundleHash, sourceFeatureHash: route.sourceFeatureHash,
    definitionId: route.definitionId, printedPhase: 'movement', triggerPhase: 'assault',
    trigger: 'both_sides_finished_phase', originalCardExhaustionRequired: true, biomassCost: 0,
    consumeAlternativeAllowed: false, currentEngagementRequired: true, enemyBiologicalOnly: true,
    nonLethalDamage: 2, maximumTriggersPerMarkPerRound: 1, markerExpiresAt: 'cleanup_and_refresh',
    sameNamedAbilityDamageInstancesDoNotStack: true,
    simultaneousOwnContributionsCommuteWithoutCasualtyRemoval: true, trainingTruth: false };
  return { ...body, policyHash: hash(body) };
}

export function createOfficialPoisonousEssencePhaseEndRuntimeV1({ context, source, state, includeSharedOrder = false }) {
  const route = routeFor(source), policy = createOfficialPoisonousEssencePolicyV1({ context, source });
  if (!isDeepStrictEqual(policy, state.officialPoisonousEssencePolicy)
    || !hasOfficialNonLethalDamagePolicyV1(state) || !hasOfficialNonLethalStandardDamagePolicyV1(state)) {
    fail('POISONOUS_ESSENCE_POLICY_MISMATCH');
  }
  const runtimeVersion = includeSharedOrder ? '1.1.0' : '1.0.0';
  const descriptor = { runtimeId, runtimeVersion, policyHash: policy.policyHash,
    ruleAtomIds: [OFFICIAL_POISONOUS_ESSENCE_ATOM_ID], actions: [actionType, ...(includeSharedOrder ? [orderedAction] : [])], trainingTruth: false };
  function marks(current) {
    if (!isDeepStrictEqual(policy, current.officialPoisonousEssencePolicy)
      || current.officialCharacteristicStatusFamilySourceBundle?.bundleHash !== source.bundleHash) {
      fail('POISONOUS_ESSENCE_POLICY_MISMATCH');
    }
    return listOfficialPoisonousEssenceMarksV1(current, policy);
  }
  function scope(current, orderedEffectId = null) {
    const graph = deriveOfficialEngagementGraphV2(current);
    const hitEarlier = new Set(orderedEffectId ? (current.poisonousEssencePhaseEndHistory || [])
      .filter(row => row.round === current.round && row.phase === current.phase)
      .flatMap(row => row.events.filter(event => event.type === 'poisonous_essence_non_lethal_damage')
        .map(event => event.targetPieceId)) : []);
    const groups = marks(current).filter(row => !row.resolved && (!orderedEffectId || row.status.statusEffectHash === orderedEffectId))
      .map(({ piece, status }) => {
      const enemyIds = new Set(live(piece) ? graph.modelEdges.filter(edge => edge.leftUnitId === piece.id || edge.rightUnitId === piece.id)
        .map(edge => edge.leftUnitId === piece.id ? edge.rightUnitId : edge.leftUnitId) : []);
      const targetUnitIds = current.pieces.filter(target => live(target) && target.sideKey !== piece.sideKey && enemyIds.has(target.id)
        && !hitEarlier.has(target.id) && [target.combatTag, ...(target.combatTags || [])].some(tag => String(tag).toLowerCase() === 'biological'))
        .map(target => target.id).sort();
      return { markedUnitId: piece.id, sideKey: piece.sideKey, markHash: status.statusEffectHash,
        markedUnitFielded: live(piece), targetUnitIds, nonLethalDamage: 2 };
    });
    const body = { schema: 'starcraft_tmg_poisonous_essence_phase_end_scope_v1', stateHash: hash(current),
      policyHash: policy.policyHash, sourceDefinitionId: route.definitionId, engagementGraphHash: graph.graphHash,
      groups, currentGeometryOnly: true, futureMovementOrCombatNotPredicted: true, trainingTruth: false };
    return { ...body, scopeHash: hash(body) };
  }
  function canStart(current) {
    return current.phase === 'assault' && ['player1', 'player2'].every(side => current.players[side]?.passedPhases?.assault === true)
      && !current.selectedRosterActivationWindow && !current.pendingAction && !current.pendingOfficialReactionWindow
      && !current.pendingOfficialAutomaticHits && !current.pendingOfficialHitsPoolChoice
      && marks(current).some(row => !row.resolved);
  }
  function makeAction(current) {
    return { actionType, sideKey: current.activeSideKey, phase: current.phase,
      scopeHash: scope(current).scopeHash, executorId: runtimeId, executorVersion: runtimeVersion,
      ruleAtomIds: descriptor.ruleAtomIds };
  }
  function enumerate(current, options = {}) {
    const allowed = (options.sideKey || current.activeSideKey) === current.activeSideKey && canStart(current);
    return { candidates: allowed ? [{ ...makeAction(current), isEnabled: true }] : [], parameterDomains: [] };
  }
  function listOrderedEffects(current) {
    return marks(current).filter(row => !row.resolved)
      .map(({ piece, status }) => ({ effectId: status.statusEffectHash, controllerSideKey: piece.sideKey }));
  }
  function orderedCandidate(current, effectId) {
    if (!canStart(current) || !listOrderedEffects(current).some(row => row.effectId === effectId
      && row.controllerSideKey === current.activeSideKey)) return null;
    const projection = scope(current, effectId);
    return { actionType: orderedAction, sideKey: current.activeSideKey, phase: current.phase, effectId,
      pieceId: projection.groups[0].markedUnitId, abilityName: 'Poisonous Essence', scopeHash: projection.scopeHash,
      executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: descriptor.ruleAtomIds };
  }
  function apply(current, action) {
    const isOrdered = includeSharedOrder && action.actionType === orderedAction;
    if (!canStart(current) || !isDeepStrictEqual(isOrdered ? orderedCandidate(current, action.effectId) : makeAction(current), action)) {
      fail('POISONOUS_ESSENCE_PHASE_END_STALE');
    }
    const projection = scope(current, isOrdered ? action.effectId : null), next = structuredClone(current), events = [];
    const targetIds = [...new Set(projection.groups.flatMap(group => group.targetUnitIds))].sort();
    for (const id of targetIds) {
      const contributors = projection.groups.filter(group => group.targetUnitIds.includes(id));
      const target = next.pieces.find(piece => piece.id === id), profile = resolveOfficialEffectiveCombatProfileV1(next, target);
      const resolution = resolveOfficialNonLethalDamageV1({ targetPieceId: id, targetModelId: liveModels(target)[0]?.id,
        abilityResolutionHash: projection.scopeHash, priorDamageMarker: Number(target.damageMarker || 0),
        amount: 2, targetHitPoints: profile.hitPoints });
      const shieldedBefore = target.statuses.some(status => String(typeof status === 'string'
        ? status : status.statusName || status.name).toLowerCase() === 'shielded');
      if (shieldedBefore && !hasOfficialShieldedLifecyclePolicyV1(next)) fail('POISONOUS_ESSENCE_SHIELDED_CONSUMER_REQUIRED');
      applyOfficialSelectedRosterResolvedDamageV1(next, target, profile, { casualtyModelIds: [],
        remainingModelIds: liveModels(target).map(model => model.id), targetDestroyed: false,
        postDamageMarker: resolution.postDamageMarker, shieldedBefore,
        shieldedAfter: shieldedBefore && resolution.postDamageMarker <= Number(profile.shield || 0) });
      events.push({ type: 'poisonous_essence_non_lethal_damage', pieceId: contributors[0].markedUnitId,
        targetPieceId: id, sourceDefinitionId: route.definitionId, markHashes: contributors.map(group => group.markHash),
        sourcePieceIds: contributors.map(group => group.markedUnitId), sameNamedAbilityDidNotStack: true, resolution,
        currentModels: target.currentModels, currentSupply: target.currentSupply, trainingTruth: false });
    }
    const body = { schema: 'starcraft_tmg_poisonous_essence_phase_end_resolution_v1', round: Number(next.round),
      phase: next.phase, scopeHash: projection.scopeHash, markHashes: projection.groups.map(row => row.markHash),
      groups: projection.groups, events: structuredClone(events), trainingTruth: false };
    const resolution = { ...body, resolutionHash: hash(body) };
    next.poisonousEssencePhaseEndHistory = [...(next.poisonousEssencePhaseEndHistory || []), resolution];
    events.push({ type: 'poisonous_essence_phase_end_completed', resolutionHash: resolution.resolutionHash,
      markHashes: resolution.markHashes, trainingTruth: false });
    next.log = [...(next.log || []), { id: 'log-' + ((next.log?.length || 0) + 1), round: next.round,
      phase: next.phase, action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, runtimeId, runtimeVersion, state: next,
      action: structuredClone(action), events, trainingTruth: false };
  }
  function query(current) {
    const body = { schema: 'starcraft_tmg_poisonous_essence_phase_end_query_v1', canStart: canStart(current),
      scope: scope(current), nonLethalCasualties: false, markerRemovedAtTrigger: false,
      mutationAuthority: false, trainingTruth: false };
    return { ...body, queryReceiptHash: hash(body) };
  }
  return { descriptor, canStart, enumerate, apply, query, ...(includeSharedOrder ? { listOrderedEffects, orderedCandidate } : {}) };
}
