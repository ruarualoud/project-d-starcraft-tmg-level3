import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY as parentKey } from './official-ranged-choice-context-v1.mjs';
import { readOfficialMeleePoolChoiceParentV1 } from './official-melee-pool-choice-context-v1.mjs';
import { officialMeleeTargetReactionFactsHashV1, readOfficialMeleeTargetReactionParentV1 as pending,
  officialMeleeChoiceBelongsToTargetReactionV1, officialMeleeDamageBelongsToTargetReactionV1 } from './official-melee-target-reaction-context-v1.mjs';
import { createOfficialReactionWindowOpportunityBatchV1, projectOfficialReactionFamilyResolutionV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';

const runtimeId = 'starcraft-tmg-melee-target-reaction-v1';
const declareType = 'declare_melee_attack_before_target_reaction';
const atomId = 'rule-atom:attack-target-selected-reaction-v1';
const clone = value => structuredClone(value);
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const seal = (value, field) => ({ ...value, [field]: hash(value) });

export function createOfficialMeleeTargetReactionRuntimeV1({ melee, reactionAdapter, reactionBundle, includeDamageContinuation = false }) {
  const hasMeleeDeclarationOnly = reactionBundle.routes.some(route => route.meleeDeclarationOnly);
  const runtimeVersion = includeDamageContinuation ? '1.2.0' : hasMeleeDeclarationOnly ? '1.1.0' : '1.0.0';
  const descriptor = Object.freeze(seal({ runtimeId, runtimeVersion, actions: [declareType,
    'resolve_reaction_family_ability', 'pass_reaction_family_window'], ruleAtomIds: [atomId],
    consumerScope: 'declared_melee_target_queue_with_native_pool_child',
    productionRoomEligible: false, trainingTruth: false }, 'runtimeHash'));
  function inputFor(state, sourceAction, targetId) {
    return { triggerKind: 'attack_target_selected', activeSideKey: sourceAction.sideKey, phase: state.phase,
      activationId: resolveOfficialArmourRollActivationIdV1(state, sourceAction.pieceId),
      sourceActionHash: hash(sourceAction), resumeActionHash: hash(sourceAction),
      context: { attackerPieceId: sourceAction.pieceId, targetPieceId: targetId,
        ...(hasMeleeDeclarationOnly ? { attackKind: 'melee' } : {}),
        enemyReactionAllowed: sourceAction.meleePlan.fightChancePlan.enemyReactionDeclarationAllowed !== false } };
  }
  function nextTarget(state, sourceAction, targetIds, start) {
    const skipped = [];
    for (let index = start; index < targetIds.length; index++) {
      const input = inputFor(state, sourceAction, targetIds[index]);
      const opportunity = createOfficialReactionWindowOpportunityBatchV1({ state, bundle: reactionBundle }).projectWindow(input);
      if ([...opportunity.activeLegal.parameterDomains, ...opportunity.defenderLegal.parameterDomains]
        .some(row => row.actionType === 'resolve_reaction_family_ability')) return { index, input, skipped };
      skipped.push(targetIds[index]);
    }
    return { index: targetIds.length, input: null, skipped };
  }
  function saveParent(state, parent) {
    state[parentKey] = without(parent, ['parentHash']);
    state[parentKey] = seal({ ...state[parentKey], factsHash: officialMeleeTargetReactionFactsHashV1(state) }, 'parentHash');
  }
  function intercept(state, sourceAction) {
    if (state[parentKey] || sourceAction.actionType !== 'fight' || !sourceAction.meleePlan
      || sourceAction.resolutionStage === 'defender_casualty_selection') return null;
    melee.inspectContext(state, sourceAction);
    const targetIds = sourceAction.meleePlan.allocations.map(row => row.targetUnitId);
    const next = nextTarget(state, sourceAction, targetIds, 0);
    if (!next.input) return null;
    return { actionType: declareType, sideKey: sourceAction.sideKey, phase: sourceAction.phase,
      pieceId: sourceAction.pieceId, targetId: targetIds[next.index], targetUnitIds: targetIds,
      weaponName: sourceAction.weaponName, sourceAction: clone(sourceAction), sourceActionHash: hash(sourceAction),
      executorId: runtimeId, executorVersion: runtimeVersion,
      ruleAtomIds: [...new Set([...sourceAction.ruleAtomIds, atomId])].sort() };
  }
  function readyAttack(state) {
    const parent = pending(state);
    if (parent?.stage !== 'ready') throw Error('ATTACK_TARGET_REACTION_NOT_READY');
    const domain = melee.enumerate(state, { sideKey: parent.sideKey }).parameterDomains.find(row =>
      row.actionType === 'fight' && row.pieceId === parent.pieceId && row.profileKey === parent.profileKey);
    if (!domain) throw Error('ATTACK_TARGET_DECLARED_WEAPON_UNAVAILABLE');
    const result = melee.instantiate(state, domain, parent.sourceAction.meleePlan.canonicalParameters);
    if (result.action.meleePlan.sourceProfileHash !== parent.sourceProfileHash
      || !isDeepStrictEqual(result.canonicalParameters, parent.sourceAction.meleePlan.canonicalParameters)) {
      throw Error('ATTACK_TARGET_DECLARED_WEAPON_CHANGED');
    }
    return result.action;
  }
  function enumerate(state, options = {}) {
    const parent = pending(state);
    if (!parent || (options.sideKey || state.activeSideKey) !== state.activeSideKey) return { candidates: [], parameterDomains: [] };
    return parent.stage === 'reaction' ? reactionAdapter.legalSpace(state, options)
      : { candidates: [], parameterDomains: [], readyAttack: readyAttack(state), readyAttackKind: 'melee' };
  }
  function instantiate(state, domain, parameters) {
    if (pending(state)?.stage !== 'reaction') throw Error('ATTACK_TARGET_REACTION_CHOICE_REQUIRED');
    const preview = reactionAdapter.preview(state, { domain, parameters });
    return { canonicalParameters: preview.action.reactionPlan.canonicalParameters, action: preview.action };
  }
  function apply(stateInput, action, options = {}) {
    if (options.chanceReveals?.length) throw Error('ATTACK_TARGET_REACTION_MUST_NOT_ROLL');
    const parent = pending(stateInput);
    if (!parent) {
      if (!isDeepStrictEqual(intercept(stateInput, action.sourceAction), action)) throw Error('ATTACK_TARGET_REACTION_DECLARATION_STALE');
      const next = nextTarget(stateInput, action.sourceAction, action.targetUnitIds, 0);
      const opened = reactionAdapter.openReactionWindow(stateInput, next.input);
      const state = clone(opened.state);
      state.log = clone(stateInput.log || []);
      saveParent(state, { schema: 'starcraft_tmg_attack_target_reaction_checkpoint_v1', attackKind: 'melee', nativeChoices: true,
        stage: 'reaction', round: Number(state.round), phase: state.phase, sideKey: action.sideKey,
        pieceId: action.pieceId, targetId: action.targetId, targetUnitIds: clone(action.targetUnitIds), targetIndex: next.index,
        skippedTargetUnitIds: next.skipped, targetResolutions: [], childParentHash: null,
        sourceAction: clone(action.sourceAction), sourceActionHash: action.sourceActionHash,
        profileKey: action.sourceAction.meleePlan.profileKey, sourceProfileHash: action.sourceAction.meleePlan.sourceProfileHash,
        triggerHash: state.pendingOfficialReactionWindow.triggerHash });
      state.log.push({ id: 'log-' + (state.log.length + 1), round: Number(state.round), phase: state.phase,
        action: clone(action), events: clone(opened.events) });
      return { ok: true, runtimeId, runtimeVersion, state, action, events: opened.events, trainingTruth: false };
    }
    if (parent.stage !== 'reaction') throw Error('ATTACK_TARGET_REACTION_CHOICE_REQUIRED');
    const result = reactionAdapter.apply(stateInput, { action, options });
    let state = clone(result.state);
    if (state.pendingOfficialReactionWindow) {
      state.activeSideKey = state.pendingOfficialReactionWindow.prioritySideKeys[state.pendingOfficialReactionWindow.priorityIndex];
      saveParent(state, parent);
      return { ...result, state };
    }
    state.activeSideKey = parent.sideKey;
    const resolution = projectOfficialReactionFamilyResolutionV1(state, parent.triggerHash);
    if (!resolution) throw Error('ATTACK_TARGET_REACTION_RESOLUTION_REQUIRED');
    const next = nextTarget(state, parent.sourceAction, parent.targetUnitIds, parent.targetIndex + 1);
    const updated = { ...parent, targetIndex: next.index,
      targetResolutions: [...parent.targetResolutions, { targetId: parent.targetId, triggerHash: parent.triggerHash,
        resolutionHash: resolution.resolutionHash }],
      skippedTargetUnitIds: [...parent.skippedTargetUnitIds, ...next.skipped] };
    const events = [...result.events];
    if (next.input) {
      const opened = reactionAdapter.openReactionWindow(state, next.input);
      const originalLog = state.log;
      state = clone(opened.state);
      state.log = originalLog;
      events.push(...opened.events);
      saveParent(state, { ...updated, targetId: parent.targetUnitIds[next.index],
        triggerHash: state.pendingOfficialReactionWindow.triggerHash });
      state.log.at(-1).events = clone(events);
    } else saveParent(state, { ...updated, stage: 'ready' });
    return { ...result, state, events };
  }
  function assertReadyAttack(state, action) {
    if (!isDeepStrictEqual(readyAttack(state), action)) throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
  }
  function assertContinuation(state, kind, action) {
    const parent = pending(state);
    if (parent?.stage !== 'ready') throw Error('ATTACK_TARGET_REACTION_NOT_READY');
    const child = readOfficialMeleePoolChoiceParentV1(state);
    if (child) {
      if (kind !== 'melee_choice' || !officialMeleeChoiceBelongsToTargetReactionV1(parent, child)) {
        throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
      }
      return;
    }
    if (kind === 'melee') return assertReadyAttack(state, action);
    if (kind === 'melee_choice') return assertReadyAttack(state, action.attackAction);
    throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
  }
  function completeAttack(result, parent) {
    const damage = includeDamageContinuation && result.state.pendingOfficialMeleeDamageReaction;
    if (damage) {
      if (!officialMeleeDamageBelongsToTargetReactionV1(parent, damage, result.state.pendingOfficialReactionWindow)) {
        throw Error('ATTACK_TARGET_MELEE_DAMAGE_PARENT_MISMATCH');
      }
      const state = clone(result.state);
      saveParent(state, { ...parent, childParentHash: null, damageParentHash: damage.checkpointHash });
      return { ...result, state };
    }
    const child = readOfficialMeleePoolChoiceParentV1(result.state);
    if (child) {
      if (!officialMeleeChoiceBelongsToTargetReactionV1(parent, child)) throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
      const state = clone(result.state);
      saveParent(state, { ...parent, childParentHash: child.parentHash });
      return { ...result, state };
    }
    const targets = result.events.filter(row => row.type === 'close_combat_attack' && row.pieceId === parent.pieceId).map(row => row.targetId);
    const casualty = result.state.pendingAction;
    const pendingCasualties = casualty?.stage === 'defender_casualty_selection'
      && casualty.attackerPieceId === parent.pieceId;
    if (!pendingCasualties && !parent.targetUnitIds.every(id => targets.includes(id))) throw Error('ATTACK_TARGET_ORIGINAL_ATTACK_NOT_RESOLVED');
    let state = clone(result.state);
    const events = [...result.events];
    for (const row of parent.targetResolutions) {
      const consumed = consumeOfficialReactionFamilyResolutionV1(state, row.triggerHash);
      state = clone(consumed.state);
      events.push({ type: 'attack_target_reaction_consumed', ...row, trainingTruth: false });
    }
    delete state[parentKey];
    state.log.at(-1).events = clone(events);
    return { ...result, state, events };
  }
  return Object.freeze({ descriptor, pending, intercept, readyAttack, enumerate, instantiate, apply,
    assertReadyAttack, assertContinuation, completeAttack });
}
