import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { officialRangedChoiceFactsHashV1 as factsHash,
  readOfficialRangedChoiceParentV1 as pending,
  OFFICIAL_RANGED_ARMOUR_REACTION_PARENT_SCHEMA as reactionSchema,
  OFFICIAL_RANGED_CHOICE_PARENT_KEY as parentKey } from './official-ranged-choice-context-v1.mjs';
import { createOfficialReactionWindowOpportunityBatchV1, projectOfficialReactionFamilyResolutionV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { createOfficialTargetReactionAttackContextV1 } from './official-attack-target-reaction-context-v1.mjs';

const runtimeId = 'starcraft-tmg-ranged-precision-choice-v1';
const hitType = 'roll_ranged_attack_hit_pool';
const choiceType = 'choose_ranged_precision_hits';
const defenceType = 'resolve_ranged_attack_defence_pool';
const armourChoiceType = 'choose_ranged_tough_armour';
const evadeType = 'resolve_ranged_attack_evade_pool';
const atomId = 'rule-atom:ranged-precision-after-hit-choice-v1';
const armourAtomId = 'rule-atom:ranged-tough-after-armour-choice-v1';
const evadeReactionAtomId = 'rule-atom:ranged-before-evade-reaction-stage-v1';
const reactionAtomId = 'rule-atom:ranged-before-armour-reaction-stage-v1';
const attackTypes = new Set(['ranged_attack', 'blast_template_attack', 'resolve_blast_template_batch']);
const clone = value => structuredClone(value);
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const fail = code => { throw Error(code); };
function rollsFor(reveals, count) {
  if (count === 0 && reveals === undefined) return [];
  if (!Array.isArray(reveals) || reveals.length !== count) fail('PRECISION_CHANCE_COUNT_INVALID');
  const rolls = reveals.map(value => typeof value === 'object' && value !== null ? value.outcome : value);
  if (rolls.some(value => !Number.isSafeInteger(value) || value < 1 || value > 6)) {
    fail('PRECISION_CHANCE_OUTCOME_INVALID');
  }
  return rolls;
}

// The existing ranged compiler owns thresholds, Surge, damage and casualties.
// This module owns persisted choices between Native dice stages.
export function createOfficialRangedPrecisionChoiceRuntimeV1({ delegates, includeZeroPools = false,
  includeArmourChoices = false, reactionAdapter = null, reactionBundle = null,
  includeBeforeEvadeReaction = false, includeBeforeTemplateEvadeReaction = false }) {
  if (Boolean(reactionAdapter) !== Boolean(reactionBundle)
    || reactionAdapter && !includeArmourChoices) fail('ARMOUR_REACTION_SOURCE_AND_CHOICES_REQUIRED');
  const hasBeforeEvadeReaction = includeBeforeEvadeReaction || includeBeforeTemplateEvadeReaction;
  if (hasBeforeEvadeReaction && (!reactionBundle?.routes.some(route => route.triggerKind === 'before_evade_roll')
    || includeBeforeEvadeReaction && !delegates.ranged?.inspectEvadeDemand
    || includeBeforeTemplateEvadeReaction && !delegates.template?.inspectEvadeDemand)) fail('BEFORE_EVADE_REACTION_CONSUMER_REQUIRED');
  const runtimeVersion = includeBeforeTemplateEvadeReaction ? '3.2.0' : includeBeforeEvadeReaction ? '3.1.0' : reactionAdapter ? '3.0.0' : includeArmourChoices ? '2.0.0' : includeZeroPools ? '1.1.0' : '1.0.0';
  const descriptor = Object.freeze(seal({ runtimeId, runtimeVersion,
    actions: [hitType, choiceType, defenceType, ...(includeArmourChoices ? [armourChoiceType, evadeType] : []),
      ...(reactionAdapter ? ['resolve_reaction_family_ability', 'pass_reaction_family_window'] : [])],
    ruleAtomIds: [atomId, ...(includeArmourChoices ? [armourAtomId] : []), ...(reactionAdapter ? [reactionAtomId] : []),
      ...(hasBeforeEvadeReaction ? [evadeReactionAtomId] : [])],
    choiceTiming: 'after_hit_roll_before_armour_pool', defenceDiceGeneratedAfterChoice: true,
    ...(includeZeroPools ? { zeroDicePoolSupported: true } : {}),
    ...(includeArmourChoices ? { defenderToughChoiceAfterArmour: true, evadeDiceGeneratedAfterToughChoice: true } : {}),
    ...(reactionAdapter ? { beforeArmourReactionUsesSavedHits: true, reactionGeneratedAfterNonemptyPoolDemand: true } : {}),
    ...(hasBeforeEvadeReaction ? { beforeEvadeUsesActualUnrolledPool: true } : {}),
    ...(includeBeforeTemplateEvadeReaction ? { templateBeforeEvadeUsesCurrentBatch: true } : {}),
    semanticSelectionOnly: true, productionRoomEligible: false, trainingTruth: false }, 'runtimeHash'));

  function delegate(kind) {
    const result = delegates[kind];
    if (!result?.inspectContext || !result?.apply) fail('PRECISION_DELEGATE_UNAVAILABLE');
    return result;
  }
  function reactionInput(state, attackAction) {
    return { triggerKind: 'before_armour_roll', activeSideKey: attackAction.sideKey, phase: state.phase,
      activationId: resolveOfficialArmourRollActivationIdV1(state, attackAction.pieceId),
      sourceActionHash: hash(attackAction), resumeActionHash: hash(attackAction),
      context: { attackerPieceId: attackAction.pieceId, targetPieceId: attackAction.targetId,
        enemyReactionAllowed: attackAction.rangedPlan.reactionPolicy?.enemyDeclarationAllowed !== false } };
  }
  function reactionAvailable(state, attackAction, evadeDiceCount) {
    if (!reactionAdapter) return false;
    const opportunity = createOfficialReactionWindowOpportunityBatchV1({ state, bundle: reactionBundle })
      .projectWindow(evadeDiceCount === undefined ? reactionInput(state, attackAction) : evadeInput(state, attackAction, evadeDiceCount));
    return [...opportunity.activeLegal.parameterDomains, ...opportunity.defenderLegal.parameterDomains]
      .some(domain => domain.actionType === 'resolve_reaction_family_ability');
  }
  function evadeInput(state, action, count) {
    const input = reactionInput(state, action);
    return { ...input, triggerKind: 'before_evade_roll', context: { ...input.context, evadeDiceCount: count } };
  }
  function mayReactBeforeEvade(state, kind, attackAction, context) {
    const plan = context?.mechanicalPlan;
    const maxDice = plan?.chance.layout.evade;
    const enabled = kind === 'ranged' ? includeBeforeEvadeReaction : includeBeforeTemplateEvadeReaction;
    return Boolean(enabled && maxDice > 0 && !plan.evade.characteristicUnmodifiable
      && reactionAvailable(state, attackAction, maxDice));
  }
  function prepare(state, kind, attackAction, context = delegate(kind).inspectContext(state, attackAction), mayReact = false) {
    if (!context) fail('PRECISION_ATTACK_CONTEXT_REQUIRED');
    const plan = context.mechanicalPlan;
    const precision = context.attackerAbilityModifiers.precision;
    const tough = includeArmourChoices ? Number(context.abilityModifiers.tough || 0) : 0;
    const mayEvadeReact = mayReactBeforeEvade(state, kind, attackAction, context);
    if (!Number.isSafeInteger(precision) || precision < 0
      || precision === 0 && !tough && !mayReact && !mayEvadeReact && !(includeZeroPools && plan.chance.count === 0)) fail('PRECISION_GRANT_REQUIRED');
    if ((tough || mayReact || mayEvadeReact) && !delegate(kind).inspectArmour) fail('TOUGH_ARMOUR_CONSUMER_REQUIRED');
    const splitArmour = Boolean(tough || mayReact || mayEvadeReact);
    const { hit, surge, armour, evade } = plan.chance.layout;
    return { context, precision, tough, mayReact, mayEvadeReact, splitArmour, hitCount: hit,
      prefixChance: { kind: 'fixed_roll_sequence', faces: 6, count: hit + surge,
        layout: { hit, surge }, revealOrder: ['hit', 'surge'] },
      defenceChance: { kind: 'fixed_roll_sequence', faces: 6, count: armour + (splitArmour ? 0 : evade),
        layout: splitArmour ? { armour } : { armour, evade }, revealOrder: splitArmour ? ['armour'] : ['armour', 'evade'] },
      ...(splitArmour ? { evadeChance: { kind: 'fixed_roll_sequence', faces: 6,
        count: evade, layout: { evade }, revealOrder: ['evade'] } } : {}) };
  }
  function action(body) {
    return { ...body, executorId: runtimeId, executorVersion: runtimeVersion,
      ruleAtomIds: [...new Set([...(body.attackAction?.ruleAtomIds || []), atomId,
        ...(includeArmourChoices ? [armourAtomId] : []), ...(reactionAdapter ? [reactionAtomId] : []),
         ...(hasBeforeEvadeReaction ? [evadeReactionAtomId] : [])])].sort() };
  }
  function intercept(state, kind, attackAction) {
    if (!attackTypes.has(attackAction.actionType) || !attackAction.rangedPlan || attackAction.skipReason) return null;
    const context = delegate(kind).inspectContext(state, attackAction);
    const mayReact = reactionAvailable(state, attackAction);
    if (Number(context?.attackerAbilityModifiers.precision || 0) === 0
      && !(includeArmourChoices && Number(context?.abilityModifiers.tough || 0) > 0)
      && !mayReact && !mayReactBeforeEvade(state, kind, attackAction, context)
      && !(includeZeroPools && context?.mechanicalPlan.chance.count === 0)) return null;
    const work = prepare(state, kind, attackAction, context, mayReact);
    return action({ actionType: hitType, sideKey: attackAction.sideKey, phase: attackAction.phase,
      pieceId: attackAction.pieceId, targetId: attackAction.targetId, weaponName: attackAction.weaponName,
      delegateKind: kind, attackAction: clone(attackAction), attackActionHash: hash(attackAction),
      attackPlanHash: work.context.mechanicalPlan.planHash, precisionValue: work.precision,
      ...(work.prefixChance.count ? { chance: work.prefixChance } : {}) });
  }
  function saveParent(state, parent) {
    state[parentKey] = seal({ ...without(parent, ['parentHash']),
      ...(parent.schema === reactionSchema ? { factsHash: factsHash(state, parent.sideKey) } : {}) }, 'parentHash');
  }
  function attackContextState(state) {
    if (state.pendingOfficialAttackTargetReaction?.nativeChoices === true) {
      return createOfficialTargetReactionAttackContextV1(state);
    }
    const result = clone(state);
    delete result[parentKey];
    return result;
  }
  function beginDefence(stateInput, parent) {
    if (parent.schema !== reactionSchema) {
      saveParent(stateInput, parent);
      return { state: stateInput, events: [] };
    }
    const sourceState = attackContextState(stateInput);
    const demand = delegate(parent.delegateKind).inspectArmourDemand(sourceState, parent.attackAction, {
      chanceReveals: parent.prefixRolls, precisionConvertedFailedHitDieIndices: parent.convertedFailedHitDieIndices });
    if (demand.armourDice > 0 && reactionAvailable(sourceState, parent.attackAction)) {
      const opened = reactionAdapter.openReactionWindow(stateInput, reactionInput(sourceState, parent.attackAction));
      const state = clone(opened.state);
      // The opening event joins this Native attack transition's log entry.
      state.log = clone(stateInput.log || []);
      saveParent(state, { ...parent, stage: 'reaction', armourDemand: demand,
        armourReactionTriggerHash: state.pendingOfficialReactionWindow.triggerHash });
      return { state, events: opened.events };
    }
    saveParent(stateInput, { ...parent, stage: 'defence', armourDemand: demand });
    return { state: stateInput, events: [] };
  }
  function beginEvade(state, parent) {
    if (!parent.usesBeforeEvadeReaction) {
      saveParent(state, parent);
      return { state, events: [] };
    }
    const demand = delegate(parent.delegateKind).inspectEvadeDemand(attackContextState(state), parent.attackAction, {
      chanceReveals: [...parent.prefixRolls, ...parent.armourRolls],
      precisionConvertedFailedHitDieIndices: parent.convertedFailedHitDieIndices,
      toughConvertedFailedArmourDieIndices: parent.convertedFailedArmourDieIndices,
      ...(parent.armourReactionTriggerHash ? { beforeArmourReactionTriggerHash: parent.armourReactionTriggerHash } : {}),
    });
    const nextParent = { ...parent, evadeChance: { ...parent.evadeChance, count: demand.count, layout: { evade: demand.count } } };
    if (demand.count > 0 && demand.modifiable && reactionAvailable(state, parent.attackAction, demand.count)) {
      const opened = reactionAdapter.openReactionWindow(state, evadeInput(state, parent.attackAction, demand.count));
      const next = clone(opened.state);
      next.log = clone(state.log || []);
      saveParent(next, { ...nextParent, stage: 'evade_reaction', evadeReactionTriggerHash: next.pendingOfficialReactionWindow.triggerHash });
      return { state: next, events: opened.events };
    }
    saveParent(state, nextParent);
    return { state, events: [] };
  }
  function defenceAction(parent) {
    return action({ actionType: defenceType, sideKey: parent.sideKey, phase: parent.phase,
      pieceId: parent.pieceId, targetId: parent.attackAction.targetId, parentHash: parent.parentHash,
      ...(parent.defenceChance.count ? { chance: clone(parent.defenceChance) } : {}) });
  }
  function evadeAction(parent) {
    return action({ actionType: evadeType, sideKey: parent.sideKey, phase: parent.phase,
      pieceId: parent.pieceId, targetId: parent.attackAction.targetId, parentHash: parent.parentHash,
      ...(parent.evadeChance.count ? { chance: clone(parent.evadeChance) } : {}) });
  }
  function enumerate(state, options = {}) {
    const result = { candidates: [], parameterDomains: [], trainingTruth: false };
    const parent = pending(state);
    if (!parent || (options.sideKey || state.activeSideKey) !== state.activeSideKey) return result;
    if (['reaction', 'evade_reaction'].includes(parent.stage)) return reactionAdapter.legalSpace(state, options);
    if (parent.stage === 'evade') {
      result.candidates.push({ ...evadeAction(parent), isEnabled: true, disabledReason: '' });
      return result;
    }
    if (parent.stage === 'armour_choice') {
      result.parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        parameterKind: 'official_ranged_tough_selection_v1', actionType: armourChoiceType,
        sideKey: parent.defenderSideKey, phase: parent.phase, pieceId: parent.attackAction.targetId,
        executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: [armourAtomId],
        parameterSchema: { type: 'object', required: ['convertedFailedArmourDieIndices'],
          convertedFailedArmourDieIndices: { type: 'array', uniqueItems: true,
            maxItems: parent.armourFacts.maximumConvertedDice,
            items: { enum: clone(parent.armourFacts.failedDieIndices) } } },
        constraints: { parentHash: parent.parentHash, ...clone(parent.armourFacts), mayDecline: true },
        confirmationClass: 'agent_owned_legal_action_auto_apply_or_human_direct_choice', trainingTruth: false }, 'domainId'));
      return result;
    }
    if (parent.stage === 'defence') {
      result.candidates.push({ ...defenceAction(parent), isEnabled: true, disabledReason: '' });
      return result;
    }
    result.parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_ranged_precision_selection_v1', actionType: choiceType,
      sideKey: parent.sideKey, phase: parent.phase, pieceId: parent.pieceId,
      executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: [atomId],
      parameterSchema: { type: 'object', required: ['convertedFailedHitDieIndices'],
        convertedFailedHitDieIndices: { type: 'array', uniqueItems: true,
          maxItems: parent.maximumConvertedDice, items: { enum: clone(parent.failedHitDieIndices) } } },
      constraints: { parentHash: parent.parentHash, hitRolls: clone(parent.hitRolls),
        thresholdByDieIndex: clone(parent.thresholdByDieIndex),
        maximumConvertedDice: parent.maximumConvertedDice, mayDecline: true,
        defenceDiceRolled: false },
      confirmationClass: 'agent_owned_legal_action_auto_apply_or_human_direct_choice',
      trainingTruth: false }, 'domainId'));
    return result;
  }
  function instantiate(state, domain, parameters) {
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains
      .find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) fail('PRECISION_DOMAIN_STALE');
    const parent = pending(state);
    if (['reaction', 'evade_reaction'].includes(parent.stage)) {
      if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)
        || Object.keys(parameters).some(key => !domain.parameterSchema.required.includes(key))) {
        fail('ARMOUR_REACTION_SEMANTIC_PARAMETERS_REQUIRED');
      }
      const preview = reactionAdapter.preview(state, { domain, parameters });
      return { canonicalParameters: preview.action.reactionPlan.canonicalParameters, action: preview.action };
    }
    if (parent.stage === 'armour_choice') {
      const selected = parameters?.convertedFailedArmourDieIndices;
      if (!parameters || Object.keys(parameters).length !== 1 || !Array.isArray(selected)
        || selected.length > parent.armourFacts.maximumConvertedDice || new Set(selected).size !== selected.length
        || selected.some(index => !Number.isSafeInteger(index) || !parent.armourFacts.failedDieIndices.includes(index))) {
        fail('TOUGH_SELECTION_INVALID');
      }
      const canonicalParameters = { convertedFailedArmourDieIndices: [...selected].sort((a, b) => a - b) };
      return { canonicalParameters, action: action({ actionType: armourChoiceType, sideKey: parent.defenderSideKey,
        phase: parent.phase, pieceId: parent.attackAction.targetId, parentHash: parent.parentHash, canonicalParameters }) };
    }
    const selected = parameters?.convertedFailedHitDieIndices;
    if (!parameters || Object.keys(parameters).length !== 1 || !Array.isArray(selected)
      || selected.length > parent.maximumConvertedDice || new Set(selected).size !== selected.length
      || selected.some(index => !Number.isSafeInteger(index) || !parent.failedHitDieIndices.includes(index))) {
      fail('PRECISION_SELECTION_INVALID');
    }
    const canonicalParameters = { convertedFailedHitDieIndices: [...selected].sort((a, b) => a - b) };
    return { canonicalParameters, action: action({ actionType: choiceType, sideKey: parent.sideKey,
      phase: parent.phase, pieceId: parent.pieceId, parentHash: parent.parentHash, canonicalParameters }) };
  }
  function transition(state, appliedAction, events, options) {
    state.log ||= [];
    state.log.push({ id: 'log-' + (state.log.length + 1), round: Number(state.round),
      phase: state.phase, action: clone(appliedAction), events: clone(events) });
    return { ok: true, schemaVersion: 'starcraft_tmg_ranged_precision_transition_v1', runtimeId, runtimeVersion,
      postRevision: Number(options.postRevision || 0), state, action: appliedAction, events, trainingTruth: false };
  }
  function apply(stateInput, appliedAction, options = {}) {
    const parent = pending(stateInput);
    if (!parent) {
      const expected = intercept(stateInput, appliedAction.delegateKind, appliedAction.attackAction);
      if (!expected || !isDeepStrictEqual(expected, appliedAction)) fail('PRECISION_HIT_ACTION_STALE');
      const work = prepare(stateInput, appliedAction.delegateKind, appliedAction.attackAction,
        delegate(appliedAction.delegateKind).inspectContext(stateInput, appliedAction.attackAction),
        reactionAvailable(stateInput, appliedAction.attackAction));
      const prefixRolls = rollsFor(options.chanceReveals, work.prefixChance.count);
      const hitRolls = prefixRolls.slice(0, work.hitCount);
      const thresholdByDieIndex = work.context.profileForBatch.hitDice.map(die => die.hitThreshold);
      const failedHitDieIndices = hitRolls.flatMap((roll, index) =>
        roll === 1 || (roll !== 6 && roll < thresholdByDieIndex[index]) ? [index] : []);
      const maximumConvertedDice = Math.min(work.precision, failedHitDieIndices.length);
      const state = clone(stateInput);
      const nextParent = { schema: work.mayReact || work.mayEvadeReact ? reactionSchema
        : work.tough ? 'starcraft_tmg_ranged_armour_checkpoint_v1' : 'starcraft_tmg_ranged_precision_checkpoint_v1',
        round: Number(state.round), phase: state.phase, sideKey: appliedAction.sideKey,
        pieceId: appliedAction.pieceId, stage: maximumConvertedDice ? 'choice' : 'defence',
        ...(work.mayEvadeReact ? { usesBeforeEvadeReaction: true } : {}),
        factsHash: factsHash(state), delegateKind: appliedAction.delegateKind,
        ...(work.splitArmour ? { toughValue: work.tough,
          defenderSideKey: state.pieces.find(row => row.id === appliedAction.targetId).sideKey,
          evadeChance: work.evadeChance } : {}),
        attackAction: clone(appliedAction.attackAction), attackActionHash: appliedAction.attackActionHash,
        prefixRolls, hitRolls, thresholdByDieIndex, failedHitDieIndices, maximumConvertedDice,
        convertedFailedHitDieIndices: [], defenceChance: work.defenceChance };
      let begun;
      if (maximumConvertedDice) {
        saveParent(state, nextParent);
        begun = { state, events: [] };
      } else begun = beginDefence(state, nextParent);
      return transition(begun.state, appliedAction, [{ type: 'ranged_precision_hit_pool_rolled',
        pieceId: appliedAction.pieceId, hitRolls, failedHitDieIndices, maximumConvertedDice,
        defenceDiceRolled: false }, ...begun.events], options);
    }
    if (parent.stage === 'choice') {
      const domain = enumerate(stateInput).parameterDomains[0];
      const expected = instantiate(stateInput, domain, appliedAction.canonicalParameters);
      if (!isDeepStrictEqual(expected.action, appliedAction)) fail('PRECISION_CHOICE_ACTION_STALE');
      if (options.chanceReveals?.length) fail('PRECISION_CHOICE_MUST_NOT_ROLL');
      const state = clone(stateInput);
      const begun = beginDefence(state, { ...parent, stage: 'defence',
        convertedFailedHitDieIndices: expected.canonicalParameters.convertedFailedHitDieIndices });
      return transition(begun.state, appliedAction, [{ type: 'ranged_precision_choice_committed',
        pieceId: parent.pieceId, ...expected.canonicalParameters, defenceDiceRolled: false }, ...begun.events], options);
    }
    if (['reaction', 'evade_reaction'].includes(parent.stage)) {
      if (options.chanceReveals?.length) fail('ARMOUR_REACTION_MUST_NOT_ROLL');
      const result = reactionAdapter.apply(stateInput, { action: appliedAction, options });
      const state = clone(result.state);
      const window = state.pendingOfficialReactionWindow;
      if (window) {
        state.activeSideKey = window.prioritySideKeys[window.priorityIndex];
        saveParent(state, parent);
      } else {
        const beforeEvade = parent.stage === 'evade_reaction';
        const triggerHash = beforeEvade ? parent.evadeReactionTriggerHash : parent.armourReactionTriggerHash;
        const projection = projectOfficialReactionFamilyResolutionV1(state, triggerHash);
        if (!projection) fail(beforeEvade ? 'EVADE_REACTION_RESOLUTION_REQUIRED' : 'ARMOUR_REACTION_RESOLUTION_REQUIRED');
        state.activeSideKey = parent.sideKey;
        saveParent(state, beforeEvade ? { ...parent, stage: 'evade' } : { ...parent, stage: 'defence',
          toughValue: Math.max(parent.toughValue, projection.tough),
          armourReactionResolutionHash: projection.resolutionHash });
      }
      return { ...result, state };
    }
    if (parent.stage === 'armour_choice') {
      const domain = enumerate(stateInput).parameterDomains[0];
      const expected = instantiate(stateInput, domain, appliedAction.canonicalParameters);
      if (!isDeepStrictEqual(expected.action, appliedAction)) fail('TOUGH_CHOICE_ACTION_STALE');
      if (options.chanceReveals?.length) fail('TOUGH_CHOICE_MUST_NOT_ROLL');
      const state = clone(stateInput);
      state.activeSideKey = parent.sideKey;
      const next = beginEvade(state, { ...parent, stage: 'evade',
        convertedFailedArmourDieIndices: expected.canonicalParameters.convertedFailedArmourDieIndices });
      return transition(next.state, appliedAction, [{ type: 'ranged_tough_choice_committed',
        targetId: parent.attackAction.targetId, sideKey: parent.defenderSideKey,
        ...expected.canonicalParameters, evadeDiceRolled: false }], options);
    }
    if (parent.stage === 'evade') {
      if (!isDeepStrictEqual(evadeAction(parent), appliedAction)) fail('TOUGH_EVADE_ACTION_STALE');
      const evadeRolls = rollsFor(options.chanceReveals, parent.evadeChance.count);
      return finish(stateInput, appliedAction, parent, [...parent.armourRolls, ...evadeRolls], options,
        { toughConvertedFailedArmourDieIndices: parent.convertedFailedArmourDieIndices });
    }
    if (!isDeepStrictEqual(defenceAction(parent), appliedAction)) fail('PRECISION_DEFENCE_ACTION_STALE');
    const defenceRolls = rollsFor(options.chanceReveals, parent.defenceChance.count);
    if (parent.toughValue || parent.schema === reactionSchema) {
      const sourceState = attackContextState(stateInput);
      const armourFacts = delegate(parent.delegateKind).inspectArmour(sourceState, parent.attackAction, {
        chanceReveals: [...parent.prefixRolls, ...defenceRolls],
        precisionConvertedFailedHitDieIndices: parent.convertedFailedHitDieIndices,
        ...(parent.armourReactionTriggerHash ? { beforeArmourReactionTriggerHash: parent.armourReactionTriggerHash } : {}) });
      if (armourFacts.tough !== parent.toughValue) fail('TOUGH_SOURCE_CHANGED');
      const state = clone(stateInput);
      const stage = armourFacts.maximumConvertedDice ? 'armour_choice' : 'evade';
      state.activeSideKey = stage === 'armour_choice' ? parent.defenderSideKey : parent.sideKey;
      const resumed = { ...parent, stage, armourRolls: defenceRolls, armourFacts, convertedFailedArmourDieIndices: [] };
      if (stage !== 'evade') saveParent(state, resumed);
      const next = stage === 'evade' ? beginEvade(state, resumed) : { state, events: [] };
      return transition(next.state, appliedAction, [{ type: 'ranged_armour_pool_rolled_pending_tough',
        targetId: parent.attackAction.targetId, armourFacts, evadeDiceRolled: false }, ...next.events], options);
    }
    return finish(stateInput, appliedAction, parent, defenceRolls, options);
  }
  function finish(stateInput, appliedAction, parent, defenceRolls, options, extra = {}) {
    const state = attackContextState(stateInput);
    // Delegate reconstructs its exact original source action. The saved hit
    // dice are combined with this transition's real defence reveals only once.
    const result = delegate(parent.delegateKind).apply(state, parent.attackAction, {
      ...options, chanceReveals: [...parent.prefixRolls, ...defenceRolls],
      precisionConvertedFailedHitDieIndices: parent.convertedFailedHitDieIndices, ...extra,
      ...(parent.armourReactionTriggerHash ? { beforeArmourReactionTriggerHash: parent.armourReactionTriggerHash } : {}),
      ...(parent.usesBeforeEvadeReaction ? { exactEvadeDiceCount: parent.evadeChance.count } : {}),
      ...(parent.evadeReactionTriggerHash ? { beforeEvadeReactionTriggerHash: parent.evadeReactionTriggerHash } : {}) });
    const events = [{ type: 'ranged_precision_defence_resolved', pieceId: parent.pieceId,
      savedHitDiceReused: true, convertedFailedHitDieIndices: clone(parent.convertedFailedHitDieIndices) }, ...result.events];
    const consumed = parent.armourReactionTriggerHash
      ? consumeOfficialReactionFamilyResolutionV1(result.state, parent.armourReactionTriggerHash) : null;
    const afterArmour = consumed ? consumed.state : result.state;
    const evade = parent.evadeReactionTriggerHash ? consumeOfficialReactionFamilyResolutionV1(afterArmour, parent.evadeReactionTriggerHash) : null;
    const next = clone(evade ? evade.state : afterArmour);
    if (consumed) events.push({ type: 'ranged_armour_reaction_consumed', triggerHash: parent.armourReactionTriggerHash,
      resolutionHash: consumed.projection.resolutionHash, savedHitDiceReused: true, trainingTruth: false });
    if (evade) events.push({ type: 'ranged_evade_reaction_consumed', triggerHash: parent.evadeReactionTriggerHash,
      resolutionHash: evade.projection.resolutionHash, evadeModifier: evade.projection.evadeModifier, trainingTruth: false });
    if (next.log?.length) {
      next.log.at(-1).action = clone(appliedAction);
      next.log.at(-1).events = clone(events);
    }
    return { ...result, state: next, action: appliedAction, events };
  }
  return Object.freeze({ descriptor, intercept, enumerate, instantiate, apply,
    hasPending: state => Boolean(pending(state)) });
}
