import { isDeepStrictEqual } from 'node:util';
import {OFFICIAL_CORRODE_ARMOUR_ID} from '../source-data/official-corrode-armour-source-v1.mjs';
import {projectOfficialAfterRangedSourceTriggerV1,openOfficialAfterRangedSourceTriggerV1} from './official-after-ranged-reaction-trigger-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID, openOfficialRangedLungeWindowV1,
  consumeOfficialReactionFamilyResolutionV1, projectOfficialRangedLungeTriggerV1, openOfficialRangedLungeTriggerV1 }
  from './official-reaction-family-adapter-v1.mjs';
import { instantiateOfficialLungeMoveActionV1, applyOfficialLungeMoveActionV1, officialLungeMoveCanonicalParametersV1,
  searchOfficialLungeLeaderWitnessV1, searchOfficialLungeFormationCandidatesV1 }
  from './official-selected-roster-spatial-action-runtime-v1.mjs';

export const OFFICIAL_RANGED_LUNGE_CONTINUATION_KIND = 'ranged_lunge_continuation';
const parentKey = 'pendingOfficialRangedLungeReaction';
const deferredKey = 'deferredOfficialRangedLungeTrigger';
const seal = (value, key) => ({ ...value, [key]: hash(value) });
const pass = 'pass_reaction_family_window';

export function createOfficialRangedLungeContinuationV1(reactionAdapter, {
  deferBehindOwnedReaction = false, includeOverwatch = false, certifiedMultiModel = false, certifiedForwardDetour = false,
  certifiedMultiModelDetour = false, certifiedLeaderWitness = false, certifiedJointObstacles = false, certifiedAxisLeaderBound = false,
  includeCorrodeArmour = false,
} = {}) {
  const moveProofOptions = { certifiedMultiModel, certifiedForwardDetour, certifiedMultiModelDetour,
    certifiedLeaderWitness, certifiedJointObstacles, certifiedAxisLeaderBound };
  const projectTrigger=includeCorrodeArmour?projectOfficialAfterRangedSourceTriggerV1:projectOfficialRangedLungeTriggerV1;
  const openTrigger=includeCorrodeArmour?openOfficialAfterRangedSourceTriggerV1:openOfficialRangedLungeTriggerV1;
  function pending(state) {
    const parent = state[parentKey];
    if (!parent) return null;
    const { parentHash, ...body } = parent;
    const window = state.pendingOfficialReactionWindow;
    if (!window || window.triggerKind !== 'after_ranged_attack_resolved' || parentHash !== hash(body)
      || window.triggerHash !== parent.triggerHash || parent.activationId !== window.activationId
      || parent.sourceActionHash !== window.sourceActionHash || parent.round !== Number(state.round)
      || parent.phase !== state.phase || state.activeSideKey !== window.prioritySideKeys[window.priorityIndex]
      || !['player1', 'player2'].includes(parent.resumeSideKey)) throw Error('LUNGE_REACTION_CONTINUATION_INVALID');
    return parent;
  }

  function supportsSource(state, pieceId) {
    return state.pieces.some(piece => piece.id === pieceId
      && (piece.currentModels === 1 || certifiedMultiModel && piece.currentModels > 1));
  }

  function eligibleDomains(state, options) {
    return reactionAdapter.legalSpace(state, options).parameterDomains.filter(domain => domain.actionType === pass
      || includeCorrodeArmour&&domain.definitionId===OFFICIAL_CORRODE_ARMOUR_ID
      || domain.definitionId === OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID && supportsSource(state, domain.sourceInstanceId));
  }

  function enumerate(state, options = {}) {
    const parent = pending(state);
    const parameterDomains = !parent ? [] : eligibleDomains(state, options).map(reactionDomain => {
      const use = reactionDomain.definitionId===OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID;
      const { domainId: reactionDomainId, ...body } = reactionDomain;
      return seal({ ...body, reactionDomain, parentHash: parent.parentHash,
        parameterKind: 'official_ranged_lunge_continuation_v1',
        ...(use ? { pieceId: reactionDomain.sourceInstanceId, parameterSchema: {
          ...body.parameterSchema, required: [...body.parameterSchema.required, 'move'],
          move: { type: 'object', required: ['leadingModelId', 'path', 'placements'], coordinateUnit: 'milli-inch',
            ...(certifiedLeaderWitness ? { optional: ['leaderRouteWitness'],
              leaderRouteWitness: { type: 'object', required: ['leadingModelId', 'path', 'placements'],
                coordinateUnit: 'milli-inch', appliesMovement: false } } : {}) },
        } } : {}) }, 'domainId');
    });
    return { candidates: [], parameterDomains };
  }

  function applyReactionChoice(state, action, options) {
    const applied = reactionAdapter.apply(state, { action, options });
    const window = applied.state.pendingOfficialReactionWindow;
    if (!includeOverwatch || action.actionType === pass || window?.timing !== 'outside_activation') return applied;
    const sideKey = window.prioritySideKeys[window.priorityIndex];
    const domains = reactionAdapter.legalSpace(applied.state, { sideKey }).parameterDomains;
    if (domains.length !== 1 || domains[0].actionType !== pass) return applied;
    const automaticPass = reactionAdapter.preview(applied.state, { domain: domains[0], parameters: {} });
    const closed = reactionAdapter.apply(applied.state, { action: automaticPass.action, options });
    return { ...applied, state: closed.state, events: [...applied.events, ...closed.events] };
  }

  function currentDomain(state, domain) {
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) throw Error('LUNGE_REACTION_DOMAIN_STALE');
    return current;
  }

  function paidMovementState(state, action, triggerHash) {
    const payment = applyReactionChoice(state, action);
    if (payment.state.pendingOfficialReactionWindow) throw Error('LUNGE_REACTION_PAYMENT_ORDER_INVALID');
    return consumeOfficialReactionFamilyResolutionV1(payment.state, triggerHash).state;
  }

  function prepare(state, domain, parameters) {
    const current = currentDomain(state, domain);
    const use = current.definitionId===OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID;
    const { move, ...payment } = parameters || {};
    if (use !== Boolean(move)) throw Error('LUNGE_REACTION_MOVE_PARAMETERS_REQUIRED');
    const result = reactionAdapter.preview(state, { domain: current.reactionDomain, parameters: payment });
    const action = { actionType: current.actionType, sideKey: current.sideKey, phase: state.phase,
      ...(current.actionType!==pass ? { pieceId: current.pieceId||current.sourceInstanceId, abilityName: current.abilityName } : {}),
      domainId: current.domainId, parentHash: current.parentHash, reactionAction: result.action };
    const canonicalParameters = { ...result.action.reactionPlan.canonicalParameters };
    if (use) {
      const triggerHash = state[parentKey].triggerHash;
      const resolved = paidMovementState(state, result.action, triggerHash);
      action.moveAction = instantiateOfficialLungeMoveActionV1(resolved, triggerHash, move,
        moveProofOptions);
      canonicalParameters.move = officialLungeMoveCanonicalParametersV1(action.moveAction);
    }
    return { action, canonicalParameters };
  }

  function completeMove(state, domain, parameters) {
    const current = currentDomain(state, domain);
    if (current.definitionId !== OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID || !parameters?.move) {
      throw Error('LUNGE_REACTION_MOVE_PARAMETERS_REQUIRED');
    }
    const { move, ...payment } = parameters;
    const action = reactionAdapter.preview(state, { domain: current.reactionDomain, parameters: payment }).action;
    const triggerHash = state[parentKey].triggerHash;
    const resolved = paidMovementState(state, action, triggerHash);
    const formationGenerated = !Object.hasOwn(move, 'placements');
    const choices = formationGenerated
      ? searchOfficialLungeFormationCandidatesV1(resolved, triggerHash, move) : [move.placements];
    for (const placements of choices) {
      try {
        const candidate = { ...move, placements };
        const result = completeMovementCandidate(resolved, triggerHash, candidate);
        if (result) return {
          canonicalParameters: { ...action.reactionPlan.canonicalParameters, move: result.move },
          witnessGenerated: result.witnessGenerated, formationGenerated,
        };
      } catch (error) {
        if (!formationGenerated || !/^(?:SELECTED_SPATIAL_|MODEL_BASE_GEOMETRY_|SPECIAL_TERRAIN_|FORCE_WALL_|LUNGE_MOVE_)/u
          .test(error?.message || '')) throw error;
      }
    }
    return null;
  }

  function completeMovementCandidate(state, triggerHash, move) {
    const instantiate = candidate => officialLungeMoveCanonicalParametersV1(
      instantiateOfficialLungeMoveActionV1(state, triggerHash, candidate, moveProofOptions));
    try {
      return { move: instantiate(move), witnessGenerated: false };
    } catch (error) {
      if (error?.message !== 'LUNGE_MOVE_LEADER_OR_FORMATION_PROOF_REQUIRED'
        || Object.hasOwn(move, 'leaderRouteWitness')) throw error;
    }
    const witness = searchOfficialLungeLeaderWitnessV1(state, triggerHash, move, moveProofOptions);
    if (!witness) return null;
    try {
      return { move: instantiate({ ...move, leaderRouteWitness: witness }), witnessGenerated: true };
    } catch (error) {
      if (error?.message === 'LUNGE_MOVE_LEADER_OR_FORMATION_PROOF_REQUIRED') return null;
      throw error;
    }
  }

  function apply(state, action, options) {
    const parent = pending(state);
    const domain = enumerate(state, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!parent || !domain) throw Error('LUNGE_REACTION_ACTION_STALE');
    const parameters = { ...action.reactionAction.reactionPlan.canonicalParameters,
      ...(action.moveAction ? { move: officialLungeMoveCanonicalParametersV1(action.moveAction) } : {}) };
    const verified = prepare(state, domain, parameters);
    if (!isDeepStrictEqual(verified.action, action)) throw Error('LUNGE_REACTION_ACTION_STALE');
    const reaction = applyReactionChoice(state, action.reactionAction, options);
    const window = reaction.state.pendingOfficialReactionWindow;
    if (window) return { ...reaction, state: { ...reaction.state, activeSideKey: window.prioritySideKeys[window.priorityIndex] } };
    const resolved = consumeOfficialReactionFamilyResolutionV1(reaction.state, parent.triggerHash);
    const moved = action.moveAction
      ? applyOfficialLungeMoveActionV1(resolved.state, action.moveAction, options, moveProofOptions) : resolved;
    const next = { ...moved.state, activeSideKey: parent.resumeSideKey };
    delete next[parentKey];
    return { ...reaction, state: next, events: [...reaction.events, ...(action.moveAction ? moved.events : [])] };
  }

  function afterAttack(previous, result, { capture = true } = {}) {
    if (previous[parentKey] || result.state[parentKey]) return result;
    let opened;
    if (deferBehindOwnedReaction) {
      const saved = result.state[deferredKey];
      if (saved && (saved.triggerHash !== hash(saved.trigger)
        || saved.trigger.phase !== result.state.phase
        || (saved.trigger.context.rangedTargetDesignation||saved.trigger.context.corrodeRangedAttack).round !== Number(result.state.round))) {
        throw Error('LUNGE_DEFERRED_TRIGGER_INVALID');
      }
      const trigger = capture ? projectTrigger(previous, result, {
        scanNewLogEntries: true, includeOverwatch,
      }) : null;
      if (saved && trigger && saved.triggerHash !== hash(trigger)) throw Error('LUNGE_DEFERRED_TRIGGER_ALREADY_PENDING');
      const waiting = saved?.trigger || trigger;
      if (!waiting) return result;
      if (result.state.pendingOfficialReactionWindow) {
        if (saved) return result;
        return { ...result, state: { ...result.state, [deferredKey]: { trigger, triggerHash: hash(trigger) } } };
      }
      const state = { ...result.state };
      delete state[deferredKey];
      result = { ...result, state };
      opened = openTrigger(state, waiting);
    } else {
      opened = includeCorrodeArmour?openTrigger(result.state,projectTrigger(previous,result)):openOfficialRangedLungeWindowV1(previous, result);
    }
    if (!opened) return result;
    const window = opened.state.pendingOfficialReactionWindow;
    if (!window.context.corrodeRangedAttack&&!window.context.rangedTargetDesignation.sourceUnitIds.some(id => supportsSource(opened.state, id))) return result;
    const state = { ...opened.state, activeSideKey: window.prioritySideKeys[window.priorityIndex],
      [parentKey]: seal({ triggerHash: window.triggerHash, activationId: window.activationId,
        sourceActionHash: window.sourceActionHash, round: window.round, phase: window.phase,
        resumeSideKey: opened.resumeSideKey }, 'parentHash') };
    return { ...result, state, events: [...result.events, ...opened.events] };
  }
  return { pending, enumerate, prepare, apply, afterAttack,
    ...(certifiedLeaderWitness ? { completeMove } : {}),
    hasDeferredTrigger: state => deferBehindOwnedReaction && Boolean(state[deferredKey]) };
}
