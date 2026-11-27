import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { removeOfficialPointDefenseSourceV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { OFFICIAL_POINT_DEFENSE_PARENT_KEY as parentKey, officialPointDefenseFactsHashV1,
  readOfficialPointDefenseParentV1 } from './official-point-defense-attack-context-v1.mjs';

const runtimeId = 'starcraft-tmg-point-defense-choice-v1';
const runtimeVersion = '1.0.0';
const declareType = 'declare_ranged_attack_before_point_defense';
const choiceType = 'choose_point_defense_dice';
const atomId = 'rule-atom:point-defense-passive-before-hit-roll-v1';
const clone = value => structuredClone(value);
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const withoutHash = parent => Object.fromEntries(Object.entries(parent).filter(([key]) => key !== 'parentHash'));
const fail = code => { throw Error(code); };
const attackTypes = new Set(['ranged_attack', 'blast_template_attack']);

export function createOfficialPointDefenseChoiceRuntimeV1({ delegates }) {
  const descriptor = Object.freeze(seal({ runtimeId, runtimeVersion, actions: [declareType, choiceType],
    ruleAtomIds: [atomId], passiveTriggerMandatory: true, maximumRemovedDicePerSource: 2,
    sourceRemovedBeforeHitRoll: true, sourceOrderOwnedByDefender: true,
    productionRoomEligible: false, trainingTruth: false }, 'runtimeHash'));

  function action(body) {
    return { ...body, executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: [atomId] };
  }
  function intercept(state, kind, sourceAction) {
    if (!attackTypes.has(sourceAction.actionType) || !sourceAction.rangedPlan) return null;
    if (readOfficialPointDefenseParentV1(state)) return null;
    const context = delegates[kind].inspectContext(state, sourceAction);
    const sources = context.profileForBatch.attackPoolRemoval.pointDefenseAvailableSourcePieceIds;
    if (context.profileForBatch.instant || !sources.length) return null;
    const parameters = kind === 'template' ? sourceAction.canonicalParameters : sourceAction.rangedPlan.canonicalParameters;
    if (parameters.pointDefenseSourcePieceIds?.length || parameters.pointDefenseRemovedDieIds?.length) {
      fail('POINT_DEFENSE_SELECTION_OWNED_BY_DEFENDER');
    }
    return action({ actionType: declareType, sideKey: sourceAction.sideKey, phase: sourceAction.phase,
      pieceId: sourceAction.pieceId, targetId: sourceAction.targetId, weaponName: sourceAction.weaponName,
      delegateKind: kind, declarationParameters: clone(parameters),
      sourceAction: clone(sourceAction), sourceActionHash: hash(sourceAction) });
  }
  function saveParent(state, parent) {
    const body = { ...withoutHash(parent), factsHash: officialPointDefenseFactsHashV1(state) };
    state[parentKey] = seal(body, 'parentHash');
  }
  function readyAttack(state, parent = readOfficialPointDefenseParentV1(state)) {
    if (!parent || parent.stage !== 'ready') fail('POINT_DEFENSE_ATTACK_NOT_READY');
    const delegate = delegates[parent.delegateKind];
    const domain = delegate.enumerate(state, { sideKey: parent.sideKey }).parameterDomains
      .find(row => row.pieceId === parent.pieceId && row.weaponName === parent.weaponName);
    if (!domain) fail('POINT_DEFENSE_DECLARED_ATTACK_UNAVAILABLE');
    const result = delegate.instantiate(state, domain, parent.declarationParameters);
    const context = delegate.inspectContext(state, result.action);
    const completed = context.profileForBatch.attackPoolRemoval.pointDefenseSourcesConsumedBeforeRoll;
    if (context.profile.profileHash !== parent.sourceProfileHash
      || !isDeepStrictEqual(completed, parent.completed.map(row => row.sourcePieceId))) {
      fail('POINT_DEFENSE_COMPLETED_REMOVAL_NOT_CONSUMED');
    }
    return { kind: parent.delegateKind, action: result.action };
  }
  function enumerate(state, options = {}) {
    const result = { candidates: [], parameterDomains: [], trainingTruth: false };
    const parent = readOfficialPointDefenseParentV1(state);
    if (!parent || (options.sideKey || state.activeSideKey) !== state.activeSideKey) return result;
    if (parent.stage === 'ready') {
      result.readyAttack = readyAttack(state, parent);
      return result;
    }
    const remainingSources = parent.triggeredSourcePieceIds.filter(id => !parent.completed.some(row => row.sourcePieceId === id));
    const removed = parent.completed.flatMap(row => row.removedDieIds);
    const remainingDice = parent.originalDieIds.filter(id => !removed.includes(id));
    result.parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_point_defense_dice_selection_v1', actionType: choiceType,
      sideKey: parent.defenderSideKey, phase: parent.phase, pieceId: parent.targetId,
      executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: [atomId],
      parameterSchema: { type: 'object', required: ['sourcePieceId', 'removedDieIds'],
        sourcePieceId: { enum: remainingSources },
        removedDieIds: { type: 'array', uniqueItems: true, maxItems: 2, items: { enum: remainingDice } } },
      constraints: { parentHash: parent.parentHash, passiveSourcesMustResolve: true,
        zeroDiceRemovalAllowed: true, sourceAlwaysRemoved: true, diceRolled: false },
      confirmationClass: 'agent_owned_legal_action_auto_apply_or_human_direct_choice',
      trainingTruth: false }, 'domainId'));
    return result;
  }
  function instantiate(state, domain, parameters) {
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains[0];
    if (!current || !isDeepStrictEqual(current, domain)) fail('POINT_DEFENSE_DOMAIN_STALE');
    const ids = parameters?.removedDieIds;
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)
      || Object.keys(parameters).sort().join(',') !== 'removedDieIds,sourcePieceId'
      || !domain.parameterSchema.sourcePieceId.enum.includes(parameters.sourcePieceId)
      || !Array.isArray(ids) || ids.length > 2 || new Set(ids).size !== ids.length
      || ids.some(id => !domain.parameterSchema.removedDieIds.items.enum.includes(id))) {
      fail('POINT_DEFENSE_SELECTION_INVALID');
    }
    const canonicalParameters = { sourcePieceId: parameters.sourcePieceId, removedDieIds: [...ids].sort() };
    return { canonicalParameters, action: action({ actionType: choiceType, sideKey: domain.sideKey,
      phase: domain.phase, pieceId: domain.pieceId, parentHash: readOfficialPointDefenseParentV1(state).parentHash,
      canonicalParameters }) };
  }
  function transition(state, appliedAction, events, options) {
    state.log ||= [];
    state.log.push({ id: 'log-' + (state.log.length + 1), round: Number(state.round),
      phase: state.phase, action: clone(appliedAction), events: clone(events) });
    return { ok: true, schemaVersion: 'starcraft_tmg_point_defense_transition_v1', runtimeId, runtimeVersion,
      postRevision: Number(options.postRevision || 0), state, action: appliedAction, events, trainingTruth: false };
  }
  function apply(stateInput, appliedAction, options = {}) {
    if (options.chanceReveals?.length) fail('POINT_DEFENSE_CHOICE_MUST_NOT_ROLL');
    const parent = readOfficialPointDefenseParentV1(stateInput);
    if (!parent) {
      const expected = intercept(stateInput, appliedAction.delegateKind, appliedAction.sourceAction);
      if (!expected || !isDeepStrictEqual(expected, appliedAction)) fail('POINT_DEFENSE_DECLARATION_STALE');
      const context = delegates[appliedAction.delegateKind].inspectContext(stateInput, appliedAction.sourceAction);
      const state = clone(stateInput);
      const defenderSideKey = state.pieces.find(row => row.id === appliedAction.targetId).sideKey;
      state.activeSideKey = defenderSideKey;
      saveParent(state, { schema: 'starcraft_tmg_point_defense_attack_checkpoint_v1',
        round: Number(state.round), phase: state.phase, sideKey: appliedAction.sideKey, defenderSideKey,
        stage: 'choice', pieceId: appliedAction.pieceId, targetId: appliedAction.targetId,
        profileKey: context.profile.profileKey, sourceProfileHash: context.profile.profileHash,
        weaponName: appliedAction.weaponName, delegateKind: appliedAction.delegateKind,
        declarationParameters: clone(appliedAction.declarationParameters),
        originalDieIds: context.profileForBatch.hitDice.map(row => row.dieId),
        triggeredSourcePieceIds: clone(context.profileForBatch.attackPoolRemoval.pointDefenseAvailableSourcePieceIds),
        completed: [] });
      return transition(state, appliedAction, [{ type: 'ranged_attack_declared_pending_point_defense',
        pieceId: appliedAction.pieceId, targetId: appliedAction.targetId, defenderSideKey,
        diceRolled: false }], options);
    }
    const domain = enumerate(stateInput).parameterDomains[0];
    const current = domain && instantiate(stateInput, domain, appliedAction.canonicalParameters);
    if (!current || !isDeepStrictEqual(current.action, appliedAction)) fail('POINT_DEFENSE_CHOICE_STALE');
    const state = clone(stateInput);
    const selected = current.canonicalParameters;
    const event = removeOfficialPointDefenseSourceV1(state, selected.sourcePieceId, parent.targetId, selected.removedDieIds.length);
    if (!event) fail('POINT_DEFENSE_TRIGGERED_SOURCE_UNAVAILABLE');
    const completed = [...parent.completed, clone(selected)];
    const stage = completed.length === parent.triggeredSourcePieceIds.length ? 'ready' : 'choice';
    state.activeSideKey = stage === 'ready' ? parent.sideKey : parent.defenderSideKey;
    saveParent(state, { ...parent, completed, stage });
    return transition(state, appliedAction, [{ ...event, removedDieIds: selected.removedDieIds,
      passiveResolvedBeforeHitRoll: true, diceRolled: false }], options);
  }
  function assertReadyAttack(state, kind, sourceAction) {
    const current = readyAttack(state);
    if (current.kind !== kind || !isDeepStrictEqual(current.action, sourceAction)) fail('POINT_DEFENSE_READY_ATTACK_STALE');
  }
  function completeAttack(result) {
    if (result.state.pendingOfficialRangedPrecisionChoice) return result;
    const state = clone(result.state);
    delete state[parentKey];
    return { ...result, state };
  }
  return Object.freeze({ descriptor, intercept, enumerate, instantiate, apply, assertReadyAttack, completeAttack,
    pending: readOfficialPointDefenseParentV1 });
}
