import { pendingOfficialSeekerControllersV1 } from '../rule-atoms/official-seeker-assault-timing-v1.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

const runtimeId = 'official-raven-seeker-phase-end-v1';
const parentKey = 'pendingOfficialRavenSeekerPhaseEnd';
const historyKey = 'officialRavenSeekerPhaseEndHistory';
const actionType = 'resolve_raven_seeker_phase_end';
const sides = ['player1', 'player2'];
const seal = (body, key) => ({ ...body, [key]: hash(body) });

export function createOfficialRavenSeekerPhaseEndRuntimeV1({ rules, includeSharedOrder = false }) {
  const rule = rules?.descriptor;
  if (!rule?.paidImpactQueryKind || !rule.impact.engagedTargetEvadeEligibility
    || rule.impact.phase !== 'assault' || typeof rules.query !== 'function') {
    throw Error('RAVEN_SEEKER_PHASE_END_PAID_SOURCE_REQUIRED');
  }
  const descriptor = seal({ runtimeId, runtimeVersion: includeSharedOrder ? '1.1.0' : '1.0.0', actionTypes: [actionType],
    sourceRulesHash: rule.profileHash, supportedScope: includeSharedOrder ? 'ordered_paid_declarations' : 'single_uncontested_declaration',
    productionRoomEligible: false, trainingTruth: false }, 'runtimeHash');

  function pending(state) {
    const parent = state[parentKey];
    if (!parent) return null;
    const { parentHash, ...body } = parent;
    if (parentHash !== hash(body) || parent.runtimeHash !== descriptor.runtimeHash
      || parent.round !== Number(state.round) || state.phase !== 'assault') {
      throw Error('RAVEN_SEEKER_PHASE_END_PARENT_INVALID');
    }
    return parent;
  }

  function pendingPlans(state) {
    const finished = new Set((state[historyKey] || []).map(row => row.planHash));
    const plans = (state.characteristicStatusAbilityHistory || [])
      .filter(row => row.round === Number(state.round) && row.definitionId === rule.definitionId
        && !finished.has(row.planHash)).map(row => row.planHash);
    if (new Set(plans).size !== plans.length) throw Error('RAVEN_SEEKER_PHASE_END_DUPLICATE_DECLARATION');
    return plans;
  }

  function canStart(state) {
    return state.phase === 'assault' && sides.includes(state.activeSideKey)
      && sides.every(side => state.players[side]?.passedPhases?.assault === true)
      && !pending(state) && !state.pendingAction && !state.selectedRosterActivationWindow
      && !state.pendingOfficialReactionWindow && !state.pendingOfficialAutomaticHits
      && !state.pendingOfficialHitsPoolChoice && pendingPlans(state).length > 0;
  }

  function listOrderedEffects(state) {
    return pendingPlans(state).map(planHash => ({ effectId: planHash,
      controllerSideKey: rules.readPaidDeclaration(state, planHash).sideKey }));
  }

  function candidate(state, planHash) {
    return { actionType, executorId: runtimeId, executorVersion: descriptor.runtimeVersion,
      phase: 'assault', sideKey: state.activeSideKey, stateHash: hash(state), planHash };
  }

  function orderedCandidate(state, id) {
    if (!canStart(state) || !listOrderedEffects(state).some(row => row.effectId === id
      && row.controllerSideKey === state.activeSideKey)) return null;
    return { ...candidate(state, id), orderedEffect: true, abilityName: 'Seeker Missile' };
  }

  function enumerate(state, options = {}) {
    if ((options.sideKey || state.activeSideKey) !== state.activeSideKey || !canStart(state)) {
      return { candidates: [], parameterDomains: [] };
    }
    const plans = pendingPlans(state);
    if (state.officialSeekerAssaultTiming) {
      const group = pendingOfficialSeekerControllersV1(state);
      if (group.controllerSideKey !== state.activeSideKey) throw Error('RAVEN_SEEKER_PHASE_END_CONTROLLER_STALE');
      return { candidates: group.availableEffectIds.map(id => candidate(state, id)), parameterDomains: [] };
    }
    if (plans.length !== 1) throw Error('RAVEN_SEEKER_PHASE_END_EFFECT_ORDER_UNRESOLVED');
    return { candidates: [candidate(state, plans[0])],
    parameterDomains: [] };
  }

  function record(state, planHash, outcome) {
    state[historyKey] = [...(state[historyKey] || []), { round: Number(state.round), planHash, outcome }];
  }

  function apply(state, action, options = {}) {
    const expected = includeSharedOrder && action.orderedEffect
      ? orderedCandidate(state, action.planHash) : enumerate(state).candidates.find(row => row.planHash === action.planHash);
    if (!expected || !isDeepStrictEqual(expected, action) || options.chanceReveals?.length) {
      throw Error('RAVEN_SEEKER_PHASE_END_ACTION_STALE');
    }
    const receipt = rules.query(state, { queryKind: rule.paidImpactQueryKind, planHash: action.planHash });
    const { declaration, impact } = receipt.result;
    const next = structuredClone(state);
    const events = [];
    if (!impact.qualifies) {
      record(next, action.planHash, 'condition_not_met');
      events.push({ type: 'raven_seeker_missile_skipped', planHash: action.planHash,
        targetUnitId: declaration.targetUnitId, impactReceiptHash: receipt.queryReceiptHash });
    } else {
      const parent = seal({ runtimeHash: descriptor.runtimeHash, round: Number(state.round), planHash: action.planHash,
        resumeSideKey: state.activeSideKey, sourceSideKey: declaration.sideKey,
        sourcePieceId: declaration.sourcePieceId, targetUnitId: declaration.targetUnitId,
        impactReceiptHash: receipt.queryReceiptHash, evadeGranted: impact.automaticHits.evadeEligibilityGrantedBySeeker,
      }, 'parentHash');
      next[parentKey] = parent;
      next.activeSideKey = parent.sourceSideKey;
      next.pendingOfficialAutomaticHits = seal({
        schema: 'starcraft_tmg_automatic_hits_source_checkpoint_v1', round: parent.round, phase: 'assault',
        sideKey: parent.sourceSideKey, pieceId: parent.sourcePieceId, definitionId: rule.definitionId,
        sourceFeatureHash: rule.sourceFeatureHash, sourceRouteHash: descriptor.runtimeHash,
        abilityName: 'Seeker Missile', sourcePlanHash: parent.planHash, stage: 'ready',
        automaticHits: { targetUnitIds: [parent.targetUnitId], hits: rule.impact.hits, damagePerHit: rule.impact.damagePerHit },
        seekerPhaseEndParentHash: parent.parentHash, trainingTruth: false,
      }, 'parentHash');
      events.push({ type: 'raven_seeker_missile_hits_declared', planHash: action.planHash,
        targetUnitId: parent.targetUnitId, impactReceiptHash: parent.impactReceiptHash });
    }
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round),
      phase: next.phase, action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, runtimeId, runtimeVersion: descriptor.runtimeVersion, state: next, action, events, trainingTruth: false };
  }

  function validate(state, hits) {
    const parent = pending(state);
    return Boolean(parent && hits.seekerPhaseEndParentHash === parent.parentHash
      && hits.definitionId === rule.definitionId && hits.sourceFeatureHash === rule.sourceFeatureHash
      && hits.sourceRouteHash === descriptor.runtimeHash && hits.sourcePlanHash === parent.planHash
      && hits.pieceId === parent.sourcePieceId && hits.sideKey === parent.sourceSideKey
      && hits.automaticHits?.hits === rule.impact.hits && hits.automaticHits.damagePerHit === rule.impact.damagePerHit
      && isDeepStrictEqual(hits.automaticHits.targetUnitIds, [parent.targetUnitId]));
  }

  const sourceAuthority = Object.freeze({
    schema: 'starcraft_tmg_automatic_hits_source_authority_v1', sourceBundleHash: descriptor.runtimeHash,
    reactionTiming: 'outside_activation', owns: hits => hits.definitionId === rule.definitionId, validate,
    evadeGrant: Object.freeze({ authorityHash: hash({ rule: rule.profileHash, grant: 'engaged_target_evade' }),
      applies: (state, hits, targetUnitId) => validate(state, hits)
        && pending(state).targetUnitId === targetUnitId && pending(state).evadeGranted === true }),
  });

  function afterHits(result) {
    const parent = pending(result.state);
    if (!parent || result.state.pendingOfficialAutomaticHits) return result;
    if (!result.events.some(event => event.type === 'automatic_hits_complete' && event.sourcePlanHash === parent.planHash)) {
      throw Error('RAVEN_SEEKER_PHASE_END_HITS_RECEIPT_REQUIRED');
    }
    const state = structuredClone(result.state);
    delete state[parentKey];
    state.activeSideKey = parent.resumeSideKey;
    record(state, parent.planHash, 'resolved');
    const events = [...result.events, { type: 'raven_seeker_missile_complete', planHash: parent.planHash,
      targetUnitId: parent.targetUnitId }];
    if (state.log?.length) state.log.at(-1).events = structuredClone(events);
    return { ...result, state, events };
  }

  return Object.freeze({ descriptor, sourceAuthority, canStart, pending, enumerate, apply, afterHits,
    ...(includeSharedOrder ? { listOrderedEffects, orderedCandidate } : {}) });
}
