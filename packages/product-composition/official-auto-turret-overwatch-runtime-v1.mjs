import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { hasOfficialFaqReactionPolicyV13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID, OFFICIAL_OVERWATCH_PARENT_KEY,
  OFFICIAL_OVERWATCH_ATOM_ID, readOfficialOverwatchAttackGrantV1, getOfficialOverwatchSourceSpecV1 }
  from '../rule-atoms/official-overwatch-attack-policy-v1.mjs';
import { inspectOfficialAutoTurretOverwatchShotV1, OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_ACTION_TYPE }
  from './official-selected-roster-ranged-action-runtime-v1.mjs';

const runtimeId = 'official-auto-turret-overwatch-runtime-v1';
const parentKey = OFFICIAL_OVERWATCH_PARENT_KEY;
const clone = value => structuredClone(value);
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));
const seal = value => ({ ...value, parentHash: hash(value) });
const live = piece => piece?.isOnField === true && !piece.isDestroyed && Number(piece.currentModels) > 0;

export function createOfficialAutoTurretOverwatchRuntimeV1({ state: initial, reactionAdapter, hasUnsettledAction }) {
  const bundle = initial.officialReactionFamilySourceBundle;
  const routes = bundle?.routes.filter(row => row.activationEndOwner === 'current_source_v1') || [];
  const spec = routes.length === 1 && getOfficialOverwatchSourceSpecV1(routes[0].definitionId);
  if (!reactionAdapter || !hasOfficialFaqReactionPolicyV13(initial) || typeof hasUnsettledAction !== 'function'
    || !spec) {
    throw Error('OVERWATCH_REACTION_CONSUMERS_REQUIRED');
  }
  const ocular = spec.definitionId !== OFFICIAL_AUTO_TURRET_OVERWATCH_DEFINITION_ID;
  const descriptor = { runtimeId, runtimeVersion: ocular ? '1.1.0' : '1.0.0', sourceBundleHash: bundle.bundleHash,
    sourceDefinitionId: spec.definitionId,
    actions: [], ruleAtomIds: [OFFICIAL_OVERWATCH_ATOM_ID, 'rule-atom:faq-v1.3-outside-activation-per-phase'],
    triggerKind: 'unit_activation_ended', outsideActivation: true, attackSource: 'shared_numeric_ranged',
    fullMatchCoverage: false, trainingTruth: false };
  function pending(state) {
    const parent = state[parentKey];
    if (!parent) return null;
    if (parent.schema !== 'starcraft_tmg_auto_turret_overwatch_parent_v1'
      || parent.parentHash !== hash(withoutHash(parent)) || parent.sourceBundleHash !== bundle.bundleHash
      || parent.round !== Number(state.round) || parent.phase !== state.phase || parent.phase !== 'assault'
      || !['reaction','attack'].includes(parent.stage)
      || !state.pieces.some(row => row.id === parent.targetPieceId)
      || !isDeepStrictEqual(state.officialReactionFamilySourceBundle, bundle)) {
      throw Error('OVERWATCH_PARENT_INVALID');
    }
    if (parent.stage === 'attack') readOfficialOverwatchAttackGrantV1(state);
    return parent;
  }
  function availability(state, targetPieceId) {
    return state.pieces.filter(piece => live(piece) && piece.officialUnitRecordKey === spec.recordKey)
      .map(piece => inspectOfficialAutoTurretOverwatchShotV1(state, { sourcePieceId: piece.id, targetPieceId }));
  }
  function restore(transition, parent, outcome) {
    const next = clone(transition.state);
    if (parent.sourcePieceId) {
      const source = next.pieces.find(row => row.id === parent.sourcePieceId);
      if (parent.actorHadActivationFlags) source.activatedPhases = clone(parent.actorActivationFlags);
      else delete source.activatedPhases;
    }
    next.activeSideKey = parent.resumeSideKey;
    if (parent.resumeActivationWindow) next.selectedRosterActivationWindow = clone(parent.resumeActivationWindow);
    else delete next.selectedRosterActivationWindow;
    delete next[parentKey];
    const event = { type: ocular ? 'ocular_overwatch_completed' : 'auto_turret_overwatch_completed', triggerHash: parent.triggerHash,
      targetPieceId: parent.targetPieceId, sourcePieceId: parent.sourcePieceId || null,
      outcome, resumedSideKey: parent.resumeSideKey, trainingTruth: false };
    const historyKey = ocular ? 'officialOcularOverwatchHistory' : 'officialAutoTurretOverwatchHistory';
    next[historyKey] = [...(next[historyKey] || []), event];
    next.log.push({ round: Number(next.round), phase: next.phase,
      action: { actionType: 'complete_auto_turret_overwatch' }, events: [clone(event)] });
    return { ...transition, state: next, events: [...transition.events, event] };
  }
  function advanceReaction(transition) {
    let next = clone(transition.state);
    const parent = pending(next);
    if (parent?.stage !== 'reaction') return transition;
    const events = [...transition.events];
    // There are two priority seats. Auto-pass only a seat with no legal ability.
    for (let seat = 0; seat < 2 && next.pendingOfficialReactionWindow; seat++) {
      const menu = reactionAdapter.legalSpace(next);
      if (menu.parameterDomains.some(row => row.actionType !== 'pass_reaction_family_window')) {
        next[parentKey] = seal({ ...withoutHash(parent), reactionOffered: true });
        break;
      }
      const domain = menu.parameterDomains.find(row => row.actionType === 'pass_reaction_family_window');
      if (!domain) throw Error('OVERWATCH_REACTION_PRIORITY_INVALID');
      const action = reactionAdapter.preview(next, { domain, parameters: {} }).action;
      const applied = reactionAdapter.apply(next, { action });
      next = clone(applied.state); events.push(...applied.events);
    }
    if (next.pendingOfficialReactionWindow) {
      next.activeSideKey = next.pendingOfficialReactionWindow.prioritySideKeys[next.pendingOfficialReactionWindow.priorityIndex];
      return { ...transition, state: next, events };
    }
    next = clone(reactionAdapter.consumeReactionWindow(next, { triggerHash: parent.triggerHash }).state);
    const resolution = next.officialReactionResolutionHistory.find(row => row.triggerHash === parent.triggerHash);
    const effect = resolution.effects.find(row => row.effectKind === 'overwatch_ranged_attack');
    if (!effect) return restore({ ...transition, state: next, events }, parent,
      parent.reactionOffered ? 'declined' : 'no_reaction_available');
    const source = next.pieces.find(row => row.id === effect.sourcePieceId);
    next[parentKey] = seal({ ...withoutHash(parent), stage: 'attack', sourcePieceId: source.id,
      profileKey: spec.profileKey, ...(ocular ? { sourceDefinitionId: spec.definitionId } : {}), resolutionHash: resolution.resolutionHash,
      actorHadActivationFlags: Object.hasOwn(source, 'activatedPhases'),
      actorActivationFlags: clone(source.activatedPhases || {}),
      attackHistoryLength: (next.rangedActionHistory || []).length });
    next.activeSideKey = source.sideKey;
    return { ...transition, state: next, events };
  }
  function open(transition, action) {
    const state = transition.state;
    const ended = transition.events.filter(event => event.type === 'unit_activation_finished' && event.phase === 'assault');
    if (!ended.length || state.phase !== 'assault' || state.gameOver || state.terminal) return transition;
    if (ended.length !== 1 || state.pendingOfficialReactionWindow || hasUnsettledAction(state)) {
      throw Error('OVERWATCH_ACTIVATION_END_BOUNDARY_INVALID');
    }
    const target = state.pieces.find(row => row.id === ended[0].pieceId);
    if (!live(target)) return transition;
    const eligible = availability(state, target.id).filter(row => row.legal).map(row => row.sourcePieceId);
    if (!eligible.length) return transition;
    const opened = reactionAdapter.openReactionWindow(state, { triggerKind: 'unit_activation_ended',
      activeSideKey: target.sideKey, phase: state.phase, activationId: null,
      sourceActionHash: hash(action), context: { targetPieceId: target.id, endedUnitId: target.id,
        eligibleOverwatchSourceIds: eligible, weaponProfileKey: spec.profileKey } });
    const next = clone(opened.state);
    next[parentKey] = seal({ schema: 'starcraft_tmg_auto_turret_overwatch_parent_v1',
      stage: 'reaction', round: Number(state.round), phase: state.phase, targetPieceId: target.id,
      triggerHash: opened.events[0].triggerHash, sourceBundleHash: bundle.bundleHash,
      reactionOffered: false,
      resumeSideKey: state.activeSideKey, resumeActivationWindow: clone(state.selectedRosterActivationWindow || null) });
    return advanceReaction({ ...transition, state: next, events: [...transition.events, ...opened.events] });
  }
  function afterTransition(before, transition, action) {
    const parent = pending(transition.state);
    if (!parent) return open(transition, action);
    if (parent.stage === 'reaction') return advanceReaction(transition);
    const completed = (transition.state.rangedActionHistory || []).slice(parent.attackHistoryLength)
      .some(row => row.pieceId === parent.sourcePieceId && row.targetId === parent.targetPieceId);
    return completed && !hasUnsettledAction(transition.state) ? restore(transition, parent, 'ranged_attack_completed') : transition;
  }
  function filterEnumeration(state, menu) {
    const parent = pending(state);
    if (parent?.stage !== 'attack') return menu;
    const allowed = new Set(['reaction','target_reaction','precision','point_defense','ranged']);
    const keep = row => allowed.has(row.sourceRuntimeKind)
      && (row.sourceRuntimeKind !== 'ranged' || row.pieceId === parent.sourcePieceId
        || row.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_ACTION_TYPE
          && row.pieceId === parent.targetPieceId
          && state.pendingCurrentProductRangedCasualtyChoice?.targetPieceId === parent.targetPieceId);
    return { ...menu, candidates: menu.candidates.filter(keep), parameterDomains: menu.parameterDomains.filter(keep),
      unsupportedDiagnostics: [] };
  }
  function assertContinuation(state, action) {
    const parent = pending(state);
    const casualty = action.sourceRuntimeKind === 'ranged'
      && action.sourceAction.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_CASUALTY_ACTION_TYPE
      && action.sourceAction.pieceId === parent?.targetPieceId
      && state.pendingCurrentProductRangedCasualtyChoice?.targetPieceId === parent?.targetPieceId;
    if (parent?.stage === 'reaction' && action.sourceRuntimeKind !== 'reaction'
      || parent?.stage === 'attack' && (!['reaction','target_reaction','precision','point_defense','ranged'].includes(action.sourceRuntimeKind)
        || action.sourceRuntimeKind === 'ranged' && action.sourceAction.pieceId !== parent.sourcePieceId && !casualty)) {
      throw Error('OVERWATCH_CONTINUATION_REQUIRED');
    }
  }
  function query(state, request) {
    if (Object.keys(request).some(key => !['queryKind','targetPieceId'].includes(key))) throw Error('OVERWATCH_QUERY_PARAMETERS_INVALID');
    const parent = pending(state);
    const targetPieceId = request.targetPieceId || parent?.targetPieceId;
    const shots = targetPieceId ? availability(state, targetPieceId) : [];
    const reactionSourceIds = new Set();
    if (parent?.stage === 'attack') reactionSourceIds.add(parent.sourcePieceId);
    else if (targetPieceId && state.phase === 'assault' && !hasUnsettledAction(state)) {
      const target = state.pieces.find(piece => piece.id === targetPieceId);
      let projected = clone(reactionAdapter.openReactionWindow(state, {
        triggerKind: 'unit_activation_ended', activeSideKey: target.sideKey, phase: state.phase, activationId: null,
        sourceActionHash: hash({ queryKind: 'auto_turret_overwatch', stateHash: hash(state), targetPieceId }),
        context: { targetPieceId, endedUnitId: targetPieceId,
          eligibleOverwatchSourceIds: shots.filter(row => row.legal).map(row => row.sourcePieceId),
           weaponProfileKey: spec.profileKey },
      }).state);
      for (let seat = 0; seat < 2 && projected.pendingOfficialReactionWindow; seat++) {
        const menu = reactionAdapter.legalSpace(projected);
        for (const domain of menu.parameterDomains.filter(row => row.definitionId === spec.definitionId)) {
          reactionSourceIds.add(domain.sourceInstanceId);
        }
        const pass = menu.parameterDomains.find(row => row.actionType === 'pass_reaction_family_window');
        projected = clone(reactionAdapter.apply(projected,
          { action: reactionAdapter.preview(projected, { domain: pass, parameters: {} }).action }).state);
      }
    } else if (parent?.stage === 'reaction') {
      for (const domain of reactionAdapter.legalSpace(state).parameterDomains.filter(row =>
        row.definitionId === spec.definitionId)) reactionSourceIds.add(domain.sourceInstanceId);
    }
    return { schema: 'starcraft_tmg_auto_turret_overwatch_query_v1', stateHash: hash(state),
      pending: clone(parent), conditionalShotAvailability: shots,
      conditionalReactionSourceIds: [...reactionSourceIds].sort(),
      conditionalTrigger: 'specified_enemy_unit_ends_assault_activation_in_current_state',
      mutationAuthority: false, trainingTruth: false };
  }
  return { descriptor, pending, filterEnumeration, assertContinuation, afterTransition, query };
}
