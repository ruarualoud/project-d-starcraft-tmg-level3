import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { officialAttackChoiceFactsHashV1 } from './official-ranged-choice-context-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { createOfficialReactionWindowOpportunityBatchV1, projectOfficialReactionFamilyResolutionV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';
import { readOfficialMeleePoolChoiceParentV1 } from './official-melee-pool-choice-context-v1.mjs';
import { createOfficialMeleeTargetAttackContextV1 } from './official-melee-target-reaction-context-v1.mjs';

const clone = value => structuredClone(value);
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const fail = code => { throw Error(code); };
const failedIndices = (rolls, threshold) => rolls.flatMap((roll, index) =>
  roll === 1 || roll !== 6 && roll < threshold ? [index] : []);
function rollsFor(reveals, count) {
  if (!count && reveals === undefined) return [];
  if (!Array.isArray(reveals) || reveals.length !== count) fail('MELEE_POOL_CHANCE_COUNT_INVALID');
  const rolls = reveals.map(row => typeof row === 'object' && row !== null ? row.outcome : row);
  if (rolls.some(value => !Number.isSafeInteger(value) || value < 1 || value > 6)) fail('MELEE_POOL_CHANCE_OUTCOME_INVALID');
  return rolls;
}

export function createOfficialMeleePoolChoiceRuntimeV1({ delegate, reactionAdapter = null, reactionBundle = null, includeBeforeEvadeReaction = false }) {
  return createPoolChoiceRuntime({ delegate, automaticHits: false, reactionAdapter, reactionBundle, includeBeforeEvadeReaction });
}

export function createOfficialAutomaticHitsPoolChoiceRuntimeV1({ delegate, reactionAdapter = null, reactionBundle = null, includeBeforeEvadeReaction = false }) {
  return createPoolChoiceRuntime({ delegate, automaticHits: true, reactionAdapter, reactionBundle, includeBeforeEvadeReaction });
}

function createPoolChoiceRuntime({ delegate, automaticHits, reactionAdapter = null, reactionBundle = null, includeBeforeEvadeReaction }) {
  if (Boolean(reactionAdapter) !== Boolean(reactionBundle)) {
    fail('MELEE_ARMOUR_REACTION_CONSUMERS_REQUIRED');
  }
  if (reactionAdapter && !delegate?.inspectArmourDemand) fail('MELEE_ARMOUR_DEMAND_CONSUMER_REQUIRED');
  if (includeBeforeEvadeReaction && (!delegate?.inspectEvadeDemand
    || !reactionBundle?.routes.some(route => route.triggerKind === 'before_evade_roll'))) fail('EVASION_POOL_CONSUMER_REQUIRED');
  const outsideActivationSource = automaticHits && (delegate.descriptor.runtimeVersion === '3.1.0'
    || delegate.descriptor.outsideActivationSource === true);
  const runtimeVersion = includeBeforeEvadeReaction ? '2.2.0' : reactionAdapter ? outsideActivationSource ? '2.1.0' : '2.0.0' : '1.0.0';
  const runtimeId = automaticHits ? 'starcraft-tmg-automatic-hits-pool-choice-v1' : 'starcraft-tmg-melee-pool-choice-v1';
  const parentKey = automaticHits ? 'pendingOfficialHitsPoolChoice' : 'pendingOfficialMeleePoolChoice';
  const types = automaticHits ? { armour: 'roll_automatic_hits_armour_pool', tough: 'choose_automatic_hits_tough_armour',
    evade: 'resolve_automatic_hits_evade_pool' } : { hit: 'roll_melee_attack_hit_pool', precision: 'choose_melee_precision_hits',
    armour: 'roll_melee_attack_armour_pool', tough: 'choose_melee_tough_armour', evade: 'resolve_melee_attack_evade_pool' };
  const atomIds = automaticHits ? ['rule-atom:automatic-hits-defence-pools-v1', 'rule-atom:automatic-hits-tough-choice-v1']
    : ['rule-atom:melee-staged-hit-and-defence-pools-v1', 'rule-atom:melee-tough-after-armour-choice-v1'];
  const schema = automaticHits ? 'starcraft_tmg_automatic_hits_pool_choice_checkpoint_v1' : 'starcraft_tmg_melee_pool_choice_checkpoint_v1';
  if (!delegate?.inspectContext || !delegate?.inspectArmour || !delegate?.apply) fail('MELEE_POOL_SOURCE_REQUIRED');
  const descriptor = Object.freeze(seal({ runtimeId, runtimeVersion,
    actions: [...Object.values(types), ...(reactionAdapter ? [
      ...(automaticHits ? ['prepare_automatic_hits_armour_pool'] : []),
      'resolve_reaction_family_ability', 'pass_reaction_family_window'] : [])], ruleAtomIds: atomIds,
    targetOrder: 'source_allocation_order', defenderToughAfterArmour: true, futureDiceGeneratedAfterChoice: true,
    ...(includeBeforeEvadeReaction ? { beforeEvadeUsesActualUnrolledPool: true } : {}),
    semanticSelectionOnly: true, productionRoomEligible: false, trainingTruth: false }, 'runtimeHash'));
  const factsHash = (state, sideKey) => officialAttackChoiceFactsHashV1(state, parentKey, sideKey);
  function action(body) {
    return { ...body, executorId: runtimeId, executorVersion: runtimeVersion,
      ruleAtomIds: [...new Set([...(body.attackAction?.ruleAtomIds || []), ...atomIds])].sort() };
  }
  function chance(target, stage) {
    const layout = stage === 'hit' ? { hit: target.layout.hit, surge: target.layout.surge || 0 }
      : { [stage]: target.layout[stage] };
    const count = Object.values(layout).reduce((sum, value) => sum + value, 0);
    return count ? { chance: { kind: 'fixed_roll_sequence', faces: 6, count, layout, revealOrder: Object.keys(layout) } } : {};
  }
  function intercept(state, sourceAction) {
    if (!(automaticHits ? ['resolve_automatic_hits'] : ['fight', 'resolve_impact']).includes(sourceAction.actionType)
      || sourceAction.resolutionStage === 'defender_casualty_selection') return null;
    const context = delegate.inspectContext(state, sourceAction);
    if (!context.targets.length) fail('MELEE_POOL_TARGETS_REQUIRED');
    return action({ actionType: automaticHits && reactionAdapter ? 'prepare_automatic_hits_armour_pool' : types[automaticHits ? 'armour' : 'hit'],
      sideKey: sourceAction.sideKey, phase: sourceAction.phase,
      pieceId: sourceAction.pieceId, targetId: context.targets[0].targetUnitId,
      attackAction: clone(sourceAction), attackActionHash: hash(sourceAction),
      ...(automaticHits && reactionAdapter ? {} : chance(context.targets[0], automaticHits ? 'armour' : 'hit')) });
  }
  function pending(state) {
    if (!automaticHits) return readOfficialMeleePoolChoiceParentV1(state, { allowReaction: Boolean(reactionAdapter) });
    const parent = state[parentKey];
    if (!parent) return null;
    const target = parent.targets?.[parent.targetIndex];
    const window = state.pendingOfficialReactionWindow;
    const inReaction = ['reaction', 'evade_reaction'].includes(parent.stage);
    const owner = inReaction ? window?.prioritySideKeys?.[window.priorityIndex]
      : parent.stage === 'tough' ? target?.sideKey : parent.sideKey;
    if (parent.schema !== schema
      || parent.parentHash !== hash(withoutHash(parent)) || parent.round !== Number(state.round) || parent.phase !== state.phase
      || (!Object.hasOwn(types, parent.stage) && !(reactionAdapter && parent.stage === 'reaction')
        && !(includeBeforeEvadeReaction && parent.beforeEvadeReaction && parent.stage === 'evade_reaction')) || !target || parent.completed.length !== parent.targetIndex
      || state.activeSideKey !== owner || parent.factsHash !== factsHash(state, parent.sideKey)
      || parent.attackActionHash !== hash(parent.attackAction)
      || target.sideKey !== state.pieces.find(row => row.id === target.targetUnitId)?.sideKey
      || inReaction && (!window || window.triggerKind !== (parent.stage === 'reaction' ? 'before_armour_roll' : 'before_evade_roll')
        || window.triggerHash !== (parent.stage === 'reaction' ? parent.current.armourReactionTriggerHash : parent.current.evadeReactionTriggerHash)
        || window.sourceActionHash !== parent.attackActionHash)) fail('MELEE_POOL_PARENT_INVALID');
    return parent;
  }
  function saveParent(state, parent) {
    state[parentKey] = seal({ ...withoutHash(parent),
      ...(reactionAdapter ? { factsHash: factsHash(state, parent.sideKey) } : {}) }, 'parentHash');
  }
  function sourceState(state, parent) {
    if (state.pendingOfficialAttackTargetReaction?.attackKind === 'melee') return createOfficialMeleeTargetAttackContextV1(state);
    const next = clone(state);
    delete next[parentKey];
    next.activeSideKey = parent.sideKey;
    return next;
  }
  function rollAction(parent) {
    const target = parent.targets[parent.targetIndex];
    return action({ actionType: types[parent.stage], sideKey: parent.sideKey, phase: parent.phase,
      pieceId: parent.pieceId, targetId: target.targetUnitId, parentHash: parent.parentHash,
      ...chance(parent.stage === 'evade' && includeBeforeEvadeReaction
        ? { ...target, layout: { evade: parent.current.evadeCount } } : target, parent.stage) });
  }
  function reactionInput(state, parent) {
    const source = parent.attackAction;
    const target = parent.targets[parent.targetIndex];
    return { triggerKind: 'before_armour_roll', activeSideKey: parent.reactionActivationContext?.activeSideKey||parent.sideKey, phase: state.phase,
      activationId: parent.reactionTiming === 'outside_activation' ? null : parent.reactionActivationContext?.activationId||resolveOfficialArmourRollActivationIdV1(state, parent.pieceId),
      sourceActionHash: parent.attackActionHash, resumeActionHash: parent.attackActionHash,
      context: { attackerPieceId: parent.pieceId, targetPieceId: target.targetUnitId,
        enemyReactionAllowed: automaticHits || (source.meleePlan?.fightChancePlan || source.impactPlan).enemyReactionDeclarationAllowed !== false } };
  }
  function beginArmour(stateInput, parent) {
    if (!reactionAdapter) { saveParent(stateInput, parent); return { state: stateInput, events: [] }; }
    const target = parent.targets[parent.targetIndex];
    const source = sourceState(stateInput, parent);
    const demand = delegate.inspectArmourDemand(source, parent.attackAction, { targetUnitId: target.targetUnitId,
      hitRolls: parent.current.hitRolls, surgeRolls: parent.current.surgeRolls,
      convertedFailedHitDieIndices: parent.current.convertedFailedHitDieIndices });
    const nextParent = { ...parent, stage: 'armour', current: { ...parent.current, armourDemand: demand } };
    if (demand.armourDice > 0) {
      const input = reactionInput(source, parent);
      const opportunity = createOfficialReactionWindowOpportunityBatchV1({ state: source, bundle: reactionBundle }).projectWindow(input);
      if ([...opportunity.activeLegal.parameterDomains, ...opportunity.defenderLegal.parameterDomains]
        .some(row => row.actionType === 'resolve_reaction_family_ability')) {
        const opened = reactionAdapter.openReactionWindow(stateInput, input);
        const state = clone(opened.state);
        state.log = clone(stateInput.log || []);
        if (state.pendingOfficialReactionWindow.timing === 'outside_activation') {
          state.activeSideKey = state.pendingOfficialReactionWindow.prioritySideKeys[0];
        }
        saveParent(state, { ...nextParent, stage: 'reaction', current: { ...nextParent.current,
          armourReactionTriggerHash: state.pendingOfficialReactionWindow.triggerHash } });
        return { state, events: opened.events };
      }
    }
    saveParent(stateInput, nextParent);
    return { state: stateInput, events: [] };
  }
  function beginEvade(state, parent) {
    if (!includeBeforeEvadeReaction) {
      saveParent(state, parent);
      return { state, events: [] };
    }
    const current = parent.current;
    const target = parent.targets[parent.targetIndex];
    const source = sourceState(state, parent);
    const demand = delegate.inspectEvadeDemand(source, parent.attackAction, {
      targetUnitId: target.targetUnitId, hitRolls: current.hitRolls, surgeRolls: current.surgeRolls,
      armourRolls: current.armourRolls, convertedFailedHitDieIndices: current.convertedFailedHitDieIndices,
      ...(current.armourReactionTriggerHash ? { beforeArmourReactionTriggerHash: current.armourReactionTriggerHash } : {}),
    }, current.convertedFailedArmourDieIndices);
    const next = { ...parent, current: { ...current, evadeCount: demand.count } };
    if (demand.count > 0 && demand.modifiable) {
      const binding = reactionInput(source, parent);
      const input = { ...binding, triggerKind: 'before_evade_roll',
        context: { ...binding.context, evadeDiceCount: demand.count } };
      const opportunity = createOfficialReactionWindowOpportunityBatchV1({ state: source, bundle: reactionBundle }).projectWindow(input);
      if ([...opportunity.activeLegal.parameterDomains, ...opportunity.defenderLegal.parameterDomains]
        .some(row => row.actionType === 'resolve_reaction_family_ability')) {
        const opened = reactionAdapter.openReactionWindow(state, input);
        const nextState = clone(opened.state);
        nextState.log = clone(state.log || []);
        const window = nextState.pendingOfficialReactionWindow;
        nextState.activeSideKey = window.prioritySideKeys[0];
        saveParent(nextState, { ...next, stage: 'evade_reaction',
          current: { ...next.current, evadeReactionTriggerHash: window.triggerHash } });
        return { state: nextState, events: opened.events };
      }
    }
    saveParent(state, next);
    return { state, events: [] };
  }
  function enumerate(state, options = {}) {
    const result = { candidates: [], parameterDomains: [], trainingTruth: false };
    const parent = pending(state);
    if (!parent || (options.sideKey || state.activeSideKey) !== state.activeSideKey) return result;
    if (['reaction', 'evade_reaction'].includes(parent.stage)) return reactionAdapter.legalSpace(state, options);
    if (['hit', 'armour', 'evade'].includes(parent.stage)) {
      result.candidates.push({ ...rollAction(parent), isEnabled: true, disabledReason: '' });
      return result;
    }
    const tough = parent.stage === 'tough';
    const target = parent.targets[parent.targetIndex];
    const field = tough ? 'convertedFailedArmourDieIndices' : 'convertedFailedHitDieIndices';
    const failed = tough ? parent.current.armourFacts.failedDieIndices : parent.current.failedHitDieIndices;
    const maximum = tough ? parent.current.armourFacts.maximumConvertedDice : parent.current.maximumPrecisionDice;
    result.parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: tough ? automaticHits ? 'official_automatic_hits_tough_selection_v1' : 'official_melee_tough_selection_v1' : 'official_melee_precision_selection_v1',
      actionType: types[parent.stage], sideKey: tough ? target.sideKey : parent.sideKey,
      phase: parent.phase, pieceId: tough ? target.targetUnitId : parent.pieceId,
      executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: atomIds,
      parameterSchema: { type: 'object', required: [field],
        [field]: { type: 'array', uniqueItems: true, maxItems: maximum, items: { enum: clone(failed) } } },
      constraints: { parentHash: parent.parentHash, targetUnitId: target.targetUnitId, mayDecline: true,
        maximumConvertedDice: maximum, ...(tough ? { armourFacts: clone(parent.current.armourFacts), evadeDiceRolled: false }
          : { hitRolls: clone(parent.current.hitRolls), hitThreshold: target.hitThreshold, armourDiceRolled: false }) },
      confirmationClass: 'agent_owned_legal_action_auto_apply_or_human_direct_choice', trainingTruth: false }, 'domainId'));
    return result;
  }
  function instantiate(state, domain, parameters) {
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) fail('MELEE_POOL_CHOICE_DOMAIN_STALE');
    if (['reaction', 'evade_reaction'].includes(pending(state).stage)) {
      if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)
        || Object.keys(parameters).some(key => !domain.parameterSchema.required.includes(key))) fail('MELEE_REACTION_SEMANTIC_PARAMETERS_REQUIRED');
      const preview = reactionAdapter.preview(state, { domain, parameters });
      return { canonicalParameters: preview.action.reactionPlan.canonicalParameters, action: preview.action };
    }
    const field = domain.parameterSchema.required[0];
    const selected = parameters?.[field];
    const constraint = domain.parameterSchema[field];
    if (!parameters || Object.keys(parameters).length !== 1 || !Array.isArray(selected)
      || selected.length > constraint.maxItems || new Set(selected).size !== selected.length
      || selected.some(index => !Number.isSafeInteger(index) || !constraint.items.enum.includes(index))) fail('MELEE_POOL_SELECTION_INVALID');
    const canonicalParameters = { [field]: [...selected].sort((a, b) => a - b) };
    return { canonicalParameters, action: action({ actionType: domain.actionType, sideKey: domain.sideKey,
      phase: domain.phase, pieceId: domain.pieceId, parentHash: pending(state).parentHash, canonicalParameters }) };
  }
  function transition(state, applied, events, options) {
    state.log ||= [];
    state.log.push({ id: 'log-' + (state.log.length + 1), round: Number(state.round), phase: state.phase,
      action: clone(applied), events: clone(events) });
    return { ok: true, schemaVersion: automaticHits ? 'starcraft_tmg_automatic_hits_pool_choice_transition_v1' : 'starcraft_tmg_melee_pool_choice_transition_v1', runtimeId, runtimeVersion,
      postRevision: Number(options.postRevision || 0), state, action: applied, events, trainingTruth: false };
  }
  function afterHit(state, parent, applied, reveals, options) {
    const target = parent.targets[parent.targetIndex];
    const hitRolls = reveals.slice(0, target.layout.hit);
    const failed = failedIndices(hitRolls, target.hitThreshold);
    const maximum = Math.min(parent.precisionRemaining, target.precision, failed.length);
    const nextParent = { ...parent, stage: maximum ? 'precision' : 'armour', current: {
      hitRolls, surgeRolls: reveals.slice(target.layout.hit), failedHitDieIndices: failed,
      maximumPrecisionDice: maximum, convertedFailedHitDieIndices: [], convertedFailedArmourDieIndices: [] } };
    let begun;
    if (maximum) { saveParent(state, nextParent); begun = { state, events: [] }; }
    else begun = beginArmour(state, nextParent);
    return transition(begun.state, applied, [{ type: 'melee_hit_pool_rolled', targetId: target.targetUnitId,
      hitRolls, failedHitDieIndices: failed, armourDiceRolled: false }, ...begun.events], options);
  }
  function afterArmour(stateInput, parent, applied, rolls, options) {
    const target = parent.targets[parent.targetIndex];
    const current = { ...parent.current, armourRolls: rolls };
    const facts = delegate.inspectArmour(sourceState(stateInput, parent), parent.attackAction, {
      targetUnitId: target.targetUnitId, hitRolls: current.hitRolls, surgeRolls: current.surgeRolls,
      armourRolls: rolls, convertedFailedHitDieIndices: current.convertedFailedHitDieIndices,
      ...(current.armourReactionTriggerHash ? { beforeArmourReactionTriggerHash: current.armourReactionTriggerHash } : {}) });
    if (facts.tough !== target.tough) fail('MELEE_POOL_TOUGH_SOURCE_CHANGED');
    const state = clone(stateInput);
    const stage = facts.maximumConvertedDice ? 'tough' : 'evade';
    state.activeSideKey = stage === 'tough' ? target.sideKey : parent.sideKey;
    const nextParent = { ...parent, stage, current: { ...current, armourFacts: facts } };
    if (stage === 'tough') saveParent(state, nextParent);
    const next = stage === 'evade' ? beginEvade(state, nextParent) : { state, events: [] };
    return transition(next.state, applied, [{ type: automaticHits ? 'automatic_hits_armour_pool_rolled' : 'melee_armour_pool_rolled',
      targetId: target.targetUnitId, armourFacts: facts, evadeDiceRolled: false }, ...next.events], options);
  }
  const emptyHitPool = () => ({ hitRolls: [], surgeRolls: [], convertedFailedHitDieIndices: [], convertedFailedArmourDieIndices: [] });
  function apply(stateInput, applied, options = {}) {
    const parent = pending(stateInput);
    if (!parent) {
      const expected = intercept(stateInput, applied.attackAction);
      if (!expected || !isDeepStrictEqual(expected, applied)) fail('MELEE_POOL_INITIAL_ACTION_STALE');
      const context = delegate.inspectContext(stateInput, applied.attackAction);
      const state = clone(stateInput);
      const start = { schema, round: Number(state.round),
        phase: state.phase, sideKey: applied.sideKey, pieceId: applied.pieceId, factsHash: factsHash(state, applied.sideKey),
        attackAction: clone(applied.attackAction), attackActionHash: applied.attackActionHash,
        targets: clone(context.targets), targetIndex: 0, completed: [], precisionRemaining: context.precision,
        ...(includeBeforeEvadeReaction ? { beforeEvadeReaction: true } : {}),
        ...(context.reactionTiming ? { reactionTiming: context.reactionTiming } : {}),
        ...(context.reactionActivationContext?{reactionActivationContext:clone(context.reactionActivationContext)}:{}),
        ...(stateInput.pendingOfficialAttackTargetReaction?.attackKind === 'melee'
          ? { targetReactionSourceActionHash: stateInput.pendingOfficialAttackTargetReaction.sourceActionHash } : {}) };
      const rolls = rollsFor(options.chanceReveals, applied.chance?.count || 0);
      if (automaticHits && reactionAdapter) {
        const begun = beginArmour(state, { ...start, current: emptyHitPool() });
        return transition(begun.state, applied, [{ type: 'automatic_hits_armour_prepared',
          targetId: context.targets[0].targetUnitId, armourDiceRolled: false }, ...begun.events], options);
      }
      return automaticHits ? afterArmour(state, { ...start, current: emptyHitPool() }, applied, rolls, options)
        : afterHit(state, start, applied, rolls, options);
    }
    const target = parent.targets[parent.targetIndex];
    if (['reaction', 'evade_reaction'].includes(parent.stage)) {
      if (options.chanceReveals?.length) fail('MELEE_REACTION_MUST_NOT_ROLL');
      const result = reactionAdapter.apply(stateInput, { action: applied, options });
      const state = clone(result.state);
      const window = state.pendingOfficialReactionWindow;
      if (window) {
        state.activeSideKey = window.prioritySideKeys[window.priorityIndex];
        saveParent(state, parent);
      } else {
        const beforeEvade = parent.stage === 'evade_reaction';
        const triggerHash = beforeEvade ? parent.current.evadeReactionTriggerHash : parent.current.armourReactionTriggerHash;
        const projection = projectOfficialReactionFamilyResolutionV1(state, triggerHash);
        if (!projection) fail(beforeEvade ? 'EVASION_POOL_REACTION_RESOLUTION_REQUIRED' : 'MELEE_ARMOUR_REACTION_RESOLUTION_REQUIRED');
        state.activeSideKey = parent.sideKey;
        saveParent(state, beforeEvade ? { ...parent, stage: 'evade' } : { ...parent, stage: 'armour',
          targets: parent.targets.map((row, index) => index === parent.targetIndex
            ? { ...row, tough: Math.max(row.tough, projection.tough) } : row),
          current: { ...parent.current, armourReactionResolutionHash: projection.resolutionHash } });
      }
      return { ...result, state };
    }
    if (parent.stage === 'precision' || parent.stage === 'tough') {
      const domain = enumerate(stateInput).parameterDomains[0];
      const expected = instantiate(stateInput, domain, applied.canonicalParameters);
      if (!isDeepStrictEqual(expected.action, applied)) fail('MELEE_POOL_CHOICE_ACTION_STALE');
      if (options.chanceReveals?.length) fail('MELEE_POOL_CHOICE_MUST_NOT_ROLL');
      const state = clone(stateInput);
      const precision = parent.stage === 'precision';
      const field = domain.parameterSchema.required[0];
      const selected = expected.canonicalParameters[field];
      state.activeSideKey = parent.sideKey;
      const nextParent = { ...parent, stage: precision ? 'armour' : 'evade',
        precisionRemaining: parent.precisionRemaining - (precision ? selected.length : 0),
        current: { ...parent.current, [field]: selected } };
      const begun = precision ? beginArmour(state, nextParent) : beginEvade(state, nextParent);
      return transition(begun.state, applied, [{ type: precision ? 'melee_precision_choice_committed' : 'melee_tough_choice_committed',
        targetId: target.targetUnitId, ...expected.canonicalParameters, futureDiceRolled: false }, ...begun.events], options);
    }
    if (!isDeepStrictEqual(rollAction(parent), applied)) fail('MELEE_POOL_ROLL_ACTION_STALE');
    const rolls = rollsFor(options.chanceReveals, applied.chance?.count || 0);
    if (parent.stage === 'hit') return afterHit(clone(stateInput), parent, applied, rolls, options);
    if (parent.stage === 'armour') return afterArmour(stateInput, parent, applied, rolls, options);
    const completed = [...parent.completed, { ...parent.current, targetUnitId: target.targetUnitId, evadeRolls: rolls }];
    if (parent.targetIndex + 1 < parent.targets.length) {
      const state = clone(stateInput);
      const nextParent = { ...parent, stage: automaticHits ? 'armour' : 'hit', targetIndex: parent.targetIndex + 1, completed,
        current: automaticHits ? emptyHitPool() : null };
      let begun;
      if (automaticHits && reactionAdapter) begun = beginArmour(state, nextParent);
      else { saveParent(state, nextParent); begun = { state, events: [] }; }
      return transition(begun.state, applied, [{ type: 'melee_target_pools_saved', targetId: target.targetUnitId,
        nextTargetUnitId: parent.targets[parent.targetIndex + 1].targetUnitId }, ...begun.events], options);
    }
    const reactionTriggers = Object.fromEntries(completed.filter(row => row.armourReactionTriggerHash)
      .map(row => [row.targetUnitId, row.armourReactionTriggerHash]));
    const evadeTriggers = Object.fromEntries(completed.filter(row => row.evadeReactionTriggerHash)
      .map(row => [row.targetUnitId, row.evadeReactionTriggerHash]));
    const delegateOwnsDefenceConsumption = delegate.descriptor.defenceReactionsConsumedBeforeFollowUp === true;
    const result = delegate.apply(sourceState(stateInput, parent), parent.attackAction, { ...options,
      chanceReveals: completed.flatMap(row => [...row.hitRolls, ...row.surgeRolls, ...row.armourRolls, ...row.evadeRolls]),
      precisionConvertedFailedDieIndicesByTarget: Object.fromEntries(completed.map(row => [row.targetUnitId, row.convertedFailedHitDieIndices])),
      toughConvertedFailedDieIndicesByTarget: Object.fromEntries(completed.map(row => [row.targetUnitId, row.convertedFailedArmourDieIndices])),
      ...(reactionAdapter ? { beforeArmourReactionTriggerHashesByTarget: reactionTriggers } : {}),
      ...(includeBeforeEvadeReaction ? {
        exactEvadeDiceCountsByTarget: Object.fromEntries(completed.map(row => [row.targetUnitId, row.evadeCount])),
        beforeEvadeReactionTriggerHashesByTarget: evadeTriggers } : {}) });
    let state = clone(result.state);
    const events = [{ type: automaticHits ? 'automatic_hits_saved_pools_resumed' : 'melee_saved_pools_resumed', diceReusedWithoutReroll: true,
      completedTargetUnitIds: completed.map(row => row.targetUnitId) }, ...result.events];
    for (const [targetUnitId, triggerHash] of Object.entries(delegateOwnsDefenceConsumption ? {} : reactionTriggers)) {
      const consumed = consumeOfficialReactionFamilyResolutionV1(state, triggerHash);
      state = clone(consumed.state);
      events.push({ type: 'melee_armour_reaction_consumed', targetUnitId, triggerHash,
        resolutionHash: consumed.projection.resolutionHash, savedDiceReused: true, trainingTruth: false });
    }
    for (const [targetUnitId, triggerHash] of Object.entries(delegateOwnsDefenceConsumption ? {} : evadeTriggers)) {
      const consumed = consumeOfficialReactionFamilyResolutionV1(state, triggerHash);
      state = clone(consumed.state);
      events.push({ type: automaticHits ? 'automatic_hits_evade_reaction_consumed' : 'melee_evade_reaction_consumed',
        targetUnitId, triggerHash, resolutionHash: consumed.projection.resolutionHash,
        evadeModifier: consumed.projection.evadeModifier, trainingTruth: false });
    }
    if (state.log?.length) Object.assign(state.log.at(-1), { action: clone(applied), events: clone(events) });
    return { ...result, state, action: applied, events };
  }
  return Object.freeze({ descriptor, intercept, enumerate, instantiate, apply, hasPending: state => Boolean(pending(state)) });
}
