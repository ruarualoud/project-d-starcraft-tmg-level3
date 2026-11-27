import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { hasOfficialFaqReactionPolicyV13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { isOfficialChargeSpeedDebuffRouteV1, OFFICIAL_CHARGE_DECLARATION_REACTION_ATOM_ID,
  materializeOfficialChargeSpeedDebuffV1 } from '../rule-atoms/official-charge-speed-debuff-policy-v1.mjs';
import { openOfficialSelectedRosterSpecialAbilityWindowV1 } from './official-selected-roster-ability-runtime-v1.mjs';

const runtimeId = 'official-charge-declaration-reaction-runtime-v1';
const parentKey = 'pendingOfficialChargeDeclaration';
const parentSchema = 'starcraft_tmg_charge_declaration_reaction_parent_v1';
const seal = (value, key) => ({ ...value, [key]: hash(value) });
const clone = value => structuredClone(value);
const withoutHash = parent => Object.fromEntries(Object.entries(parent).filter(([key]) => key !== 'parentHash'));

export function createOfficialChargeDeclarationReactionRuntimeV1({ state: initial, reactionAdapter, melee, projectReadyState = state => state }) {
  const bundle = initial.officialReactionFamilySourceBundle;
  if (!melee || !reactionAdapter || !hasOfficialFaqReactionPolicyV13(initial)
    || !bundle?.routes.some(isOfficialChargeSpeedDebuffRouteV1)) {
    throw Error('CHARGE_DECLARATION_REACTION_CONSUMERS_REQUIRED');
  }
  if (bundle.routes.some(route => route.triggerKind === 'charge_declared' && route.effectKind !== 'charge_speed_debuff')) {
    throw Error('CHARGE_DECLARATION_OTHER_REACTION_OWNER_REQUIRED');
  }
  const descriptor = seal({ runtimeId, runtimeVersion: '1.0.0',
    sourceBundleHash: bundle.bundleHash, actions: ['charge', 'roll_declared_charge'],
    ruleAtomIds: [OFFICIAL_CHARGE_DECLARATION_REACTION_ATOM_ID,
      'rule-atom:faq-v1-38-concussive-friendly-los', 'rule-atom:faq-v1-38-concussive-friendly-subject'],
    declarationBeforeDice: true, savedSemanticTargetsPreserved: true,
    fullMatchCoverage: false, trainingTruth: false }, 'runtimeHash');

  function pending(state) {
    const parent = state[parentKey];
    if (!parent) return null;
    if (parent.schema !== parentSchema || parent.parentHash !== hash(withoutHash(parent))
      || parent.sourceBundleHash !== bundle.bundleHash || parent.round !== Number(state.round)
      || parent.phase !== state.phase || parent.phase !== 'assault'
      || !['reaction', 'ready'].includes(parent.stage)
      || !state.pieces.some(piece => piece.id === parent.pieceId && piece.sideKey === parent.sideKey)
      || !parent.canonicalParameters?.leadingModelId || !parent.canonicalParameters.targets?.length) {
      throw Error('CHARGE_DECLARATION_REACTION_PARENT_INVALID');
    }
    return parent;
  }
  function rawCharge(state, parent) {
    const domain = melee.enumerate(state, { sideKey: parent.sideKey }).parameterDomains.find(row =>
      row.actionType === 'charge' && row.pieceId === parent.pieceId);
    if (!domain) throw Error('CHARGE_DECLARATION_SAVED_ACTION_UNAVAILABLE');
    return melee.instantiate(state, domain, parent.canonicalParameters);
  }
  function readyAction(state) {
    const parent = pending(state);
    if (parent?.stage !== 'ready' || state.pendingOfficialReactionWindow || state.activeSideKey !== parent.sideKey) {
      throw Error('CHARGE_DECLARATION_REACTION_NOT_READY');
    }
    const inner = rawCharge(projectReadyState(state, parent), parent).action;
    return { actionType: 'roll_declared_charge', sideKey: parent.sideKey, phase: state.phase,
      pieceId: parent.pieceId, parentHash: parent.parentHash, sourceAction: inner, sourceActionHash: hash(inner),
      chance: clone(inner.chance), executorId: runtimeId, executorVersion: '1.0.0',
      ruleAtomIds: descriptor.ruleAtomIds, trainingTruth: false };
  }
  function enumerate(state, options = {}) {
    const parent = pending(state);
    if (!parent || parent.stage !== 'ready'
      || options.sideKey && options.sideKey !== parent.sideKey) return { candidates: [], parameterDomains: [] };
    return { candidates: [{ ...readyAction(state), isEnabled: true }], parameterDomains: [] };
  }
  function instantiate(state, domain, parameters) {
    if (pending(state) || state.pendingAction || state.pendingOfficialReactionWindow || domain.actionType !== 'charge') {
      throw Error('CHARGE_DECLARATION_REACTION_WINDOW_UNAVAILABLE');
    }
    const raw = melee.instantiate(state, domain, parameters);
    const action = { actionType: 'charge', sideKey: domain.sideKey, phase: state.phase, pieceId: domain.pieceId,
      declarationDomainId: domain.domainId, sourceChargePlanHash: raw.action.chargePlan.chargePlanHash,
      canonicalParameters: clone(raw.canonicalParameters), chance: null,
      executorId: runtimeId, executorVersion: '1.0.0', ruleAtomIds: descriptor.ruleAtomIds, trainingTruth: false };
    return { canonicalParameters: clone(raw.canonicalParameters), action };
  }
  function advance(transition) {
    let state = clone(transition.state);
    const parent = pending(state);
    if (parent?.stage !== 'reaction') return transition;
    const extraEvents = [];
    for (let index = 0; index < 2 && state.pendingOfficialReactionWindow; index++) {
      const menu = reactionAdapter.legalSpace(state);
      if (menu.parameterDomains.some(row => row.actionType !== 'pass_reaction_family_window')) break;
      const domain = menu.parameterDomains.find(row => row.actionType === 'pass_reaction_family_window');
      if (!domain) throw Error('CHARGE_DECLARATION_REACTION_PASS_REQUIRED');
      const preview = reactionAdapter.preview(state, { domain, parameters: {} });
      const applied = reactionAdapter.apply(state, { action: preview.action });
      state = clone(applied.state);
      extraEvents.push(...applied.events);
    }
    const window = state.pendingOfficialReactionWindow;
    if (window) state.activeSideKey = window.prioritySideKeys[window.priorityIndex];
    else {
      const consumed = reactionAdapter.consumeReactionWindow(state, { triggerHash: parent.triggerHash });
      state = clone(consumed.state);
      const effects = materializeOfficialChargeSpeedDebuffV1(state, parent.triggerHash);
      state[parentKey] = seal({ ...withoutHash(parent), stage: 'ready' }, 'parentHash');
      state.activeSideKey = parent.sideKey;
      const event = { type: 'charge_declaration_reactions_completed', pieceId: parent.pieceId,
        triggerHash: parent.triggerHash, speedEffectHashes: effects.map(effect => effect.effectHash),
        targetsPreserved: clone(parent.canonicalParameters.targets), diceNotYetRolled: true, trainingTruth: false };
      extraEvents.push(event);
      state.log.push({ round: Number(state.round), phase: state.phase,
        action: { actionType: 'charge_declaration_reactions_completed' }, events: [clone(event)] });
    }
    return { ...transition, state, events: [...transition.events, ...extraEvents] };
  }
  function apply(state, action, options = {}) {
    if (action.actionType === 'roll_declared_charge') {
      if (!isDeepStrictEqual(action, readyAction(state))) throw Error('CHARGE_DECLARATION_ROLL_ACTION_STALE');
      const next = clone(projectReadyState(state, pending(state)));
      delete next[parentKey];
      return melee.apply(next, action.sourceAction, options);
    }
    const domain = melee.enumerate(state).parameterDomains.find(row => row.domainId === action.declarationDomainId);
    if (!domain || !isDeepStrictEqual(action, instantiate(state, domain, action.canonicalParameters).action)) {
      throw Error('CHARGE_DECLARATION_REACTION_ACTION_STALE');
    }
    let next = clone(state);
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, action.sideKey, action.pieceId, 'assault');
    const event = { type: 'charge_declared_before_reactions', pieceId: action.pieceId,
      sideKey: action.sideKey, targets: clone(action.canonicalParameters.targets), diceNotYetRolled: true, trainingTruth: false };
    next.log ||= [];
    next.log.push({ round: Number(next.round), phase: next.phase, action: clone(action), events: [clone(event)] });
    const opened = reactionAdapter.openReactionWindow(next, { triggerKind: 'charge_declared',
      activeSideKey: action.sideKey, phase: next.phase,
      activationId: resolveOfficialArmourRollActivationIdV1(next, action.pieceId), sourceActionHash: hash(action),
      context: { attackerPieceId: action.pieceId, targetPieceId: action.canonicalParameters.targets[0].unitId,
        declaredTargetUnitIds: action.canonicalParameters.targets.map(target => target.unitId) } });
    next = clone(opened.state);
    next[parentKey] = seal({ schema: parentSchema, stage: 'reaction', sideKey: action.sideKey,
      pieceId: action.pieceId, phase: next.phase, round: Number(next.round),
      sourceBundleHash: bundle.bundleHash, triggerHash: opened.events[0].triggerHash,
      canonicalParameters: clone(action.canonicalParameters), sourceChargePlanHash: action.sourceChargePlanHash }, 'parentHash');
    return advance({ ok: true, state: next, action: clone(action), events: [event, ...opened.events],
      runtimeId, runtimeVersion: '1.0.0', trainingTruth: false });
  }
  return Object.freeze({ descriptor, pending, enumerate, instantiate, apply, afterReaction: advance });
}
