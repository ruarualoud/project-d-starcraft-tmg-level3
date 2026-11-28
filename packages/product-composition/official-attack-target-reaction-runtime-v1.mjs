import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { eligibleOfficialStandRecipientV1, createOfficialReactionWindowOpportunityBatchV1, projectOfficialReactionFamilyResolutionV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';
import { OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY as parentKey, officialAttackTargetReactionFactsHashV1,
  readOfficialAttackTargetReactionParentV1 as pending, officialRangedChoiceBelongsToTargetReactionV1,
  officialRangedDamageBelongsToTargetReactionV1, officialTemplateAttackBelongsToTargetReactionV1 }
  from './official-attack-target-reaction-context-v1.mjs';
import { readOfficialRangedChoiceParentV1 } from './official-ranged-choice-context-v1.mjs';
import { readOfficialRangedCasualtyContextV1, officialRangedCasualtyBelongsToTargetReactionV1 }
  from './official-ranged-casualty-context-v1.mjs';
import { createOfficialMeleeTargetReactionRuntimeV1 } from './official-melee-target-reaction-runtime-v1.mjs';

const runtimeId = 'starcraft-tmg-attack-target-reaction-v1';
const declareType = 'declare_ranged_attack_before_target_reaction';
const atomId = 'rule-atom:attack-target-selected-reaction-v1';
const clone = value => structuredClone(value);
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const seal = (body, field) => ({ ...body, [field]: hash(body) });

export function createOfficialAttackTargetReactionRuntimeV1({ ranged, template = null, melee = null, reactionAdapter, reactionBundle,
  includeNestedChoices = false, afterReaction = result => result, preserveTemplateDeclaration = false,
  phaseBoundCombatCoexistence = false, includeMeleeDamageContinuation = false, includeRangedDamageContinuation = false,
  includeRangedDeclarationHitDebuff = false, standRoute = null, includeRedirectSelection = false, includeBeforeCasualtyCompletion=false }) {
  const targetTrigger = reactionBundle.routes.some(row => row.triggerKind === 'attack_target_selected');
  if ((!ranged && !melee) || !reactionAdapter || !targetTrigger && !includeRangedDeclarationHitDebuff && !standRoute
    || includeRangedDeclarationHitDebuff && (!ranged || !reactionBundle.routes.some(row => row.persistentRangedHitDebuff))) {
    throw Error('ATTACK_TARGET_REACTION_CONSUMERS_REQUIRED');
  }
  if (template && !includeNestedChoices) throw Error('ATTACK_TARGET_TEMPLATE_NESTED_CHOICES_REQUIRED');
  if (preserveTemplateDeclaration && (!template || melee && !phaseBoundCombatCoexistence)) throw Error('ATTACK_TARGET_TEMPLATE_SNAPSHOT_CONSUMER_REQUIRED');
  if (phaseBoundCombatCoexistence && !melee) throw Error('ATTACK_TARGET_COMBAT_CONSUMER_REQUIRED');
  const meleeTarget = melee ? createOfficialMeleeTargetReactionRuntimeV1({ melee, reactionAdapter, reactionBundle,
    includeDamageContinuation: includeMeleeDamageContinuation }) : null;
  const runtimeVersion = includeBeforeCasualtyCompletion ? '10.0.0' : standRoute ? '9.0.0' : includeRangedDeclarationHitDebuff ? '8.0.0' : includeRangedDamageContinuation ? '7.0.0' : phaseBoundCombatCoexistence ? '6.0.0' : preserveTemplateDeclaration ? '5.0.0' : melee ? '4.0.0' : template ? '3.0.0' : includeNestedChoices ? '2.0.0' : '1.0.0';
  const descriptor = Object.freeze(seal({ runtimeId, runtimeVersion,
    actions: [...(ranged ? [declareType] : []), ...(meleeTarget ? [meleeTarget.descriptor.actions[0]] : []),
      ...(includeRedirectSelection ? ['select_redirected_attack_target'] : []),
      'resolve_reaction_family_ability', 'pass_reaction_family_window'],
    ruleAtomIds: [atomId], consumerScope: melee ? 'declared_melee_targets_with_native_pool_choices'
      : template ? 'numeric_and_template_primary_target_with_native_choices'
      : includeNestedChoices ? 'numeric_ranged_with_native_defender_choices' : 'single_numeric_ranged_batch',
    ...(standRoute ? {standSource:standRoute.routeHash} : {}),
    reactionBeforeAttackDice: true, semanticSelectionOnly: true,
    ...(includeBeforeCasualtyCompletion?{beforeCasualtyCompletion:true}:{}),
    ...(includeRangedDeclarationHitDebuff ? { declarationHitDebuffBeforeTargetReaction: true } : {}),
    ...(preserveTemplateDeclaration ? { templateDeclarationSavedBeforeReaction: true } : {}),
    ...(phaseBoundCombatCoexistence ? { combatAndAssaultReactionPhasesRemainDistinct: true } : {}),
    ...(meleeTarget ? { meleeTargetRuntimeHash: meleeTarget.descriptor.runtimeHash } : {}),
    productionRoomEligible: false, trainingTruth: false }, 'runtimeHash'));
  function inputFor(state, sourceAction) {
    const declaration = sourceAction.actionType === 'blast_template_attack'
      ? template.inspectDeclarationTarget(state, sourceAction) : null;
    return { triggerKind: 'attack_target_selected', activeSideKey: sourceAction.sideKey, phase: state.phase,
      activationId: resolveOfficialArmourRollActivationIdV1(state, sourceAction.pieceId),
      sourceActionHash: hash(sourceAction), resumeActionHash: hash(sourceAction),
      context: { attackerPieceId: sourceAction.pieceId, targetPieceId: declaration?.targetId || sourceAction.targetId,
        enemyReactionAllowed: (declaration?.reactionPolicy || sourceAction.rangedPlan.reactionPolicy)?.enemyDeclarationAllowed !== false } };
  }
  function hasChoice(state, input) {
    const { activeLegal, defenderLegal } = createOfficialReactionWindowOpportunityBatchV1({ state, bundle: reactionBundle })
      .projectWindow(input);
    return [...activeLegal.parameterDomains, ...defenderLegal.parameterDomains]
      .some(row => row.actionType === 'resolve_reaction_family_ability');
  }
  function weaponDomain(state, action) {
    const isTemplate = action.actionType === 'blast_template_attack';
    const delegate = isTemplate ? template : ranged;
    const domain = delegate.enumerate(state,{sideKey:action.sideKey}).parameterDomains.find(d =>
      d.actionType === action.actionType && d.pieceId === action.pieceId && d.weaponName === action.weaponName
      && (isTemplate || d.profileKey === action.rangedPlan.profileKey && d.attackMode === action.rangedPlan.attackMode));
    return {domain,delegate,isTemplate};
  }
  function standTargets(state, action) {
    const {domain,isTemplate} = weaponDomain(state,action);
    if (!domain) return [];
    const origin = action.canonicalParameters?.spotterModelId;
    return isTemplate ? [...new Set(domain.constraints.targets.filter(t=>t.spotterModelId===origin).map(t=>t.unitId))]
      : domain.parameterSchema.targetUnitId.enum;
  }
  function existingGrant(state, input) {
    const target = state.pieces.find(p=>p.id===input.context.targetPieceId);
    for (const receipt of state.officialReactionResolutionHistory || []) {
      if (!receipt.consumedByHost || receipt.triggerKind!=='ranged_attack_declared' || receipt.activationId!==input.activationId
        || receipt.round!==Number(state.round) || receipt.phase!==state.phase) continue;
      const effect = receipt.effects.find(e => e.definitionId===standRoute.definitionId
        && e.attackerPieceId===input.context.attackerPieceId && e.sourceFeatureHash===standRoute.sourceFeatureHash);
      if (!effect || !input.context.validTargetUnitIds.includes(effect.sourceInstanceId)) continue;
      const protector=state.pieces.find(p=>p.id===effect.sourceInstanceId);
      if (eligibleOfficialStandRecipientV1(state,standRoute,protector,target)) return {
        targetId:protector.id,triggerHash:receipt.triggerHash,effectHash:effect.effectHash,
        resolutionHash:receipt.resolutionHash};
    }
    return null;
  }
  function firstInput(state, sourceAction) {
    const targetInput = inputFor(state, sourceAction);
    if (includeRangedDeclarationHitDebuff || standRoute) {
      const declaration = { ...targetInput, triggerKind: 'ranged_attack_declared',
        context: { ...targetInput.context, rangedHitDebuffOwnerV1: true,
          ...(standRoute ? {validTargetUnitIds:standTargets(state,sourceAction)} : {}),
          weaponProfileKey: sourceAction.rangedPlan.profileKey } };
      if (standRoute && existingGrant(state,declaration) || hasChoice(state, declaration)) return declaration;
    }
    return targetTrigger && hasChoice(state, targetInput) ? targetInput : null;
  }
  function subsequentInput(state, parent, resolution) {
    if (!parent.triggerKind) return null;
    const targetInput = inputFor(state, parent.sourceAction);
    const hitDebuff = parent.triggerKind === 'ranged_attack_declared'
      && resolution.effects.some(row => row.effectKind === 'ranged_attack_hit_debuff');
    if (hitDebuff && reactionBundle.routes.some(row => row.triggerKind === 'debuff_received')) {
      const cleanup = { ...targetInput, triggerKind: 'debuff_received',
        context: { targetPieceId: parent.pieceId, affectedPieceId: parent.pieceId,
          attackerPieceId: parent.pieceId } };
      if (hasChoice(state, cleanup)) return cleanup;
    }
    return targetTrigger && hasChoice(state, targetInput) ? targetInput : null;
  }
  function intercept(state, sourceAction) {
    if (meleeTarget && sourceAction.actionType === 'fight') return meleeTarget.intercept(state, sourceAction);
    if (pending(state) || !['ranged_attack', ...(template ? ['blast_template_attack'] : [])].includes(sourceAction.actionType)
      || !sourceAction.rangedPlan) return null;
    const input = firstInput(state, sourceAction);
    if (!input) return null;
    return { actionType: declareType, sideKey: sourceAction.sideKey, phase: sourceAction.phase,
      pieceId: sourceAction.pieceId, targetId: input.context.targetPieceId, weaponName: sourceAction.weaponName,
      ...(standRoute && input.triggerKind === 'ranged_attack_declared' ? {standDeclaration:true} : {}),
      sourceAction: clone(sourceAction), sourceActionHash: hash(sourceAction),
      executorId: runtimeId, executorVersion: runtimeVersion,
      ruleAtomIds: [...new Set([...sourceAction.ruleAtomIds, atomId])].sort() };
  }
  function saveParent(state, parent) {
    const body = without(parent, ['parentHash']);
    state[parentKey] = body;
    state[parentKey] = seal({ ...body, factsHash: officialAttackTargetReactionFactsHashV1(state) }, 'parentHash');
  }
  function readyAttack(state) {
    const parent = pending(state);
    if (parent?.attackKind === 'melee') return meleeTarget.readyAttack(state);
    if (parent?.stage !== 'ready') throw Error('ATTACK_TARGET_REACTION_NOT_READY');
    const isTemplate = parent.attackKind === 'template';
    const delegate = isTemplate ? template : ranged;
    const domain = delegate.enumerate(state, { sideKey: parent.sideKey }).parameterDomains.find(row =>
      row.pieceId === parent.pieceId && (isTemplate ? row.actionType === 'blast_template_attack'
        && row.weaponName === parent.sourceAction.weaponName : row.profileKey === parent.profileKey
        && (!includeRedirectSelection || row.attackMode === parent.sourceAction.rangedPlan.attackMode)));
    if (!domain) throw Error('ATTACK_TARGET_DECLARED_WEAPON_UNAVAILABLE');
    const result = delegate.instantiate(state, domain, isTemplate ? parent.sourceAction.canonicalParameters
      : parent.sourceAction.rangedPlan.canonicalParameters);
    const targetId = isTemplate ? result.action.canonicalParameters.primaryTargetUnitId : result.action.targetId;
    if (targetId !== parent.targetId || result.action.rangedPlan.sourceProfileHash !== parent.sourceProfileHash
      || isTemplate && result.action.templateDeclarationHash !== parent.sourceAction.templateDeclarationHash) {
      throw Error('ATTACK_TARGET_DECLARED_WEAPON_CHANGED');
    }
    return result.action;
  }
  function enumerate(state, options = {}) {
    const parent = pending(state);
    if (parent?.attackKind === 'melee') return meleeTarget.enumerate(state, options);
    if (!parent || (options.sideKey || state.activeSideKey) !== state.activeSideKey) {
      return { candidates: [], parameterDomains: [] };
    }
    if (parent.stage === 'redirect') {
      const {domain,isTemplate} = weaponDomain(state,parent.sourceAction);
      if (!domain || !standTargets(state,parent.sourceAction).includes(parent.standGrant.targetId)) throw Error('ARTANIS_REDIRECT_TARGET_STALE');
      const schema = clone(domain.parameterSchema);
      const constraints = clone(domain.constraints);
      const id = parent.standGrant.targetId;
      if (isTemplate) {
        constraints.targets=constraints.targets.filter(t=>t.unitId===id && t.spotterModelId===parent.sourceAction.canonicalParameters.spotterModelId);
        schema.primaryTargetUnitId={enum:[id]}; schema.primaryTargetModelId={enum:constraints.targets.map(t=>t.modelId)};
      } else {
        constraints.targetPlans=constraints.targetPlans.filter(t=>t.targetUnitId===id);
        schema.targetUnitId={enum:[id]};
      }
      return {candidates:[],parameterDomains:[seal({...without(domain,['domainId']),actionType:'select_redirected_attack_target',
        parameterSchema:schema,constraints,originalDomainId:domain.domainId,triggerHash:parent.standGrant.triggerHash},'domainId')]};
    }
    if (parent.stage === 'reaction') return reactionAdapter.legalSpace(state, options);
    const casualty = readOfficialRangedCasualtyContextV1(state);
    if (casualty) {
      if (!officialRangedCasualtyBelongsToTargetReactionV1(parent, casualty)) throw Error('ATTACK_TARGET_CASUALTY_PARENT_MISMATCH');
      return { ...ranged.enumerate(state, options), readyAttackKind: 'ranged' };
    }
    if (parent.attackKind === 'template' && template.hasPending(state)) return template.enumerate(state, options);
    return { candidates: [], parameterDomains: [], readyAttack: readyAttack(state),
      ...(parent.attackKind === 'template' ? { readyAttackKind: 'template' } : {}) };
  }
  function instantiate(state, domain, parameters) {
    if (pending(state)?.attackKind === 'melee') return meleeTarget.instantiate(state, domain, parameters);
    const parent=pending(state);
    if (parent?.stage==='redirect') {
      const expected=enumerate(state).parameterDomains[0];
      const {domain:original,delegate,isTemplate}=weaponDomain(state,parent.sourceAction);
      if (!isDeepStrictEqual(domain,expected) || (isTemplate ? parameters.primaryTargetUnitId : parameters.targetUnitId)!==parent.standGrant.targetId
        || isTemplate && parameters.spotterModelId!==parent.sourceAction.canonicalParameters.spotterModelId) throw Error('ARTANIS_REDIRECT_TARGET_REQUIRED');
      const shot=delegate.instantiate(state,original,parameters);
      return {canonicalParameters:shot.canonicalParameters,action:{actionType:expected.actionType,pieceId:parent.pieceId,sideKey:parent.sideKey,
        phase:parent.phase,parameters:shot.canonicalParameters,domainId:expected.domainId,ruleAtomIds:[atomId]}};
    }
    if (parent?.stage !== 'reaction') throw Error('ATTACK_TARGET_REACTION_CHOICE_REQUIRED');
    const preview = reactionAdapter.preview(state, { domain, parameters });
    return { canonicalParameters: preview.action.reactionPlan.canonicalParameters, action: preview.action };
  }
  function apply(stateInput, action, options = {}) {
    if (pending(stateInput)?.attackKind === 'melee' || meleeTarget && action.sourceAction?.actionType === 'fight') {
      return meleeTarget.apply(stateInput, action, options);
    }
    if (options.chanceReveals?.length) throw Error('ATTACK_TARGET_REACTION_MUST_NOT_ROLL');
    const parent = pending(stateInput);
    if (parent?.stage==='redirect') {
      const redirected=enumerate(stateInput).parameterDomains[0];
      if (!isDeepStrictEqual(action,instantiate(stateInput,redirected,action.parameters).action)) throw Error('ARTANIS_REDIRECT_CHOICE_STALE');
      const {domain,delegate,isTemplate}=weaponDomain(stateInput,parent.sourceAction);
      const shot=delegate.instantiate(stateInput,domain,action.parameters).action;
      const targetInput=inputFor(stateInput,shot);
      const state=clone(stateInput);
      const next={...parent,stage:'ready',targetId:parent.standGrant.targetId,sourceAction:clone(shot),
        sourceActionHash:hash(shot),standOnly:true,triggerKind:'ranged_attack_declared',
        ...(isTemplate && preserveTemplateDeclaration ? {preparedTemplateDeclaration:template.captureTargetReactionDeclaration(stateInput,shot)}:{})};
      const event={type:'ranged_attack_redirected',pieceId:parent.pieceId,originalTargetId:parent.targetId,targetId:next.targetId,
        sourceDefinitionId:standRoute.definitionId,triggerHash:parent.standGrant.triggerHash};
      state.log.push({id:'log-'+(state.log.length+1),round:Number(state.round),phase:state.phase,action:clone(action),events:[event]});
      if (targetTrigger && hasChoice(state,targetInput)) {
        const opened=reactionAdapter.openReactionWindow(state,targetInput);
        const after=clone(opened.state);
        delete next.triggerKind; delete next.standOnly;
        saveParent(after,{...next,stage:'reaction',triggerHash:after.pendingOfficialReactionWindow.triggerHash});
        return {ok:true,state:after,action,events:[event,...opened.events]};
      }
      saveParent(state,next);
      if(isTemplate && preserveTemplateDeclaration) {
        template.beginTargetReactionDeclaration(state,state[parentKey]);
        saveParent(state,{...next,templateParentHash:state.pendingOfficialBlastTemplateAttack.parentHash});
      }
      return {ok:true,state,action,events:[event]};
    }
    if (parent) {
      if (parent.stage !== 'reaction') throw Error('ATTACK_TARGET_REACTION_CHOICE_REQUIRED');
      const result = afterReaction(reactionAdapter.apply(stateInput, { action, options }), stateInput);
      const state = clone(result.state);
      const window = state.pendingOfficialReactionWindow;
      state.activeSideKey = window ? window.prioritySideKeys[window.priorityIndex] : parent.sideKey;
      if (window) saveParent(state, parent);
      else {
        const resolution = projectOfficialReactionFamilyResolutionV1(state, parent.triggerHash);
        if (!resolution) throw Error('ATTACK_TARGET_REACTION_RESOLUTION_REQUIRED');
        if (resolution.redirectTargetPieceId && standRoute && parent.triggerKind==='ranged_attack_declared') {
          const effect=resolution.effects.find(e=>e.definitionId===standRoute.definitionId && e.redirectTargetPieceId===resolution.redirectTargetPieceId);
          if (!effect) throw Error('ARTANIS_REDIRECT_SOURCE_MISMATCH');
          const next=clone(consumeOfficialReactionFamilyResolutionV1(state,parent.triggerHash).state);
          saveParent(next,{...parent,stage:'redirect',resolutionHash:resolution.resolutionHash,
            standGrant:{targetId:effect.sourceInstanceId,triggerHash:parent.triggerHash,effectHash:effect.effectHash}});
          return {...result,state:next};
        }
        const nextInput = subsequentInput(state, parent, resolution);
        if (nextInput) {
          const consumed = consumeOfficialReactionFamilyResolutionV1(state, parent.triggerHash);
          const opened = reactionAdapter.openReactionWindow(consumed.state, nextInput);
          const next = clone(opened.state);
          const body = without(parent, ['triggerKind']);
          saveParent(next, { ...body, triggerHash: next.pendingOfficialReactionWindow.triggerHash,
            ...(nextInput.triggerKind !== 'attack_target_selected' ? { triggerKind: nextInput.triggerKind } : {}) });
          return { ...result, state: next, events: [...result.events, ...opened.events] };
        }
        const payment = (state.officialConsumePaymentHistory || []).find(row => row.unitDestroyed === true
          && row.sacrificePieceId === parent.targetId && row.round === Number(state.round) && row.phase === state.phase
          && result.events.some(event => event.type === 'consume_model_removed'
            && event.paymentReceiptHash === row.paymentReceiptHash));
        if (payment && !parent.attackKind && ranged.skipDestroyedTargetBatch) {
          const consumed = consumeOfficialReactionFamilyResolutionV1(state, parent.triggerHash);
          const next = clone(consumed.state);
          delete next[parentKey];
          const event = ranged.skipDestroyedTargetBatch(next, parent.sourceAction, payment);
          return { ...result, state: next, events: [...result.events, event] };
        }
        if (parent.attackKind === 'template' && preserveTemplateDeclaration) {
          const event = template.beginTargetReactionDeclaration(state, parent);
          saveParent(state, { ...parent, stage: 'ready', resolutionHash: resolution.resolutionHash,
            templateParentHash: state.pendingOfficialBlastTemplateAttack.parentHash });
          state.log.at(-1).events.push(clone(event));
          return { ...result, state, events: [...result.events, event] };
        }
        saveParent(state, { ...parent, stage: 'ready', resolutionHash: resolution.resolutionHash });
      }
      return { ...result, state };
    }
    const expected = intercept(stateInput, action.sourceAction);
    if (!expected || !isDeepStrictEqual(expected, action)) throw Error('ATTACK_TARGET_REACTION_DECLARATION_STALE');
    const input = firstInput(stateInput, action.sourceAction);
    const grant=standRoute && input.triggerKind==='ranged_attack_declared' && existingGrant(stateInput,input);
    const opened=grant ? {state:stateInput,events:[{type:'ranged_attack_redirect_grant_continued',triggerHash:grant.triggerHash}]}
      : reactionAdapter.openReactionWindow(stateInput,input);
    const state=clone(opened.state);
    state.log = clone(stateInput.log || []);
    saveParent(state, { schema: 'starcraft_tmg_attack_target_reaction_checkpoint_v1', stage: 'reaction',
      ...(includeNestedChoices ? { nativeChoices: true } : {}),
      ...(input.triggerKind === 'ranged_attack_declared' ? { triggerKind: input.triggerKind } : {}),
      round: Number(state.round), phase: state.phase, sideKey: action.sideKey,
      ...(action.sourceAction.actionType === 'blast_template_attack' ? { attackKind: 'template', templateParentHash: null } : {}),
      ...(action.sourceAction.actionType === 'blast_template_attack' && preserveTemplateDeclaration
        ? { preparedTemplateDeclaration: template.captureTargetReactionDeclaration(stateInput, action.sourceAction) } : {}),
      pieceId: action.pieceId, targetId: action.targetId, sourceAction: clone(action.sourceAction),
      sourceActionHash: action.sourceActionHash, sourceProfileHash: action.sourceAction.rangedPlan.sourceProfileHash,
      profileKey: action.sourceAction.rangedPlan.profileKey, triggerHash: grant ? grant.triggerHash : state.pendingOfficialReactionWindow.triggerHash,
      ...(grant ? {stage:'redirect',standGrant:grant,resolutionHash:grant.resolutionHash} : {}) });
    state.log.push({ id: 'log-' + (state.log.length + 1), round: Number(state.round), phase: state.phase,
      action: clone(action), events: clone(opened.events) });
    return { ok: true, schemaVersion: 'starcraft_tmg_attack_target_reaction_transition_v1',
      runtimeId, runtimeVersion, state, action, events: opened.events, trainingTruth: false };
  }
  function assertReadyAttack(state, action) {
    if (!isDeepStrictEqual(readyAttack(state), action)) throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
  }
  function assertContinuation(state, kind, action) {
    const parent = pending(state);
    if (parent?.attackKind === 'melee') return meleeTarget.assertContinuation(state, kind, action);
    if (parent?.stage !== 'ready') throw Error('ATTACK_TARGET_REACTION_NOT_READY');
    const casualty = readOfficialRangedCasualtyContextV1(state);
    if (casualty) {
      if (!officialRangedCasualtyBelongsToTargetReactionV1(parent, casualty) || kind !== 'ranged'
        || action.resolutionStage !== 'defender_casualty_selection' || action.pendingHash !== casualty.pendingHash
        || action.casualtyDomainHash !== casualty.casualtyDomainHash) throw Error('ATTACK_TARGET_CASUALTY_CHOICE_REQUIRED');
      return;
    }
    const child = parent.nativeChoices === true ? readOfficialRangedChoiceParentV1(state) : null;
    if (child) {
      if (kind !== 'precision' || !officialRangedChoiceBelongsToTargetReactionV1(parent, child, state)) {
        throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
      }
      return;
    }
    if (parent.attackKind === 'template') {
      if (!template.hasPending(state)) {
        if (kind === 'template') return assertReadyAttack(state, action);
        if (kind === 'precision') return assertReadyAttack(state, action.attackAction);
      } else if (kind === 'template' || kind === 'precision') {
        const raw = kind === 'precision' ? action.attackAction : action;
        const menu = template.enumerate(state, { sideKey: state.activeSideKey });
        const finite = menu.candidates.some(row => isDeepStrictEqual(without(row,
          ['isEnabled', 'disabledReason', 'score', 'details']), raw));
        const domain = menu.parameterDomains.find(row => row.actionType === raw.actionType && row.pieceId === raw.pieceId);
        if (finite || domain && isDeepStrictEqual(template.instantiate(state, domain, raw.canonicalParameters).action, raw)) return;
      }
      throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
    }
    if (kind === 'ranged') return assertReadyAttack(state, action);
    if (parent.nativeChoices === true && kind === 'precision') return assertReadyAttack(state, action.attackAction);
    throw Error('ATTACK_TARGET_DECLARED_ATTACK_REQUIRED');
  }
  return Object.freeze({ descriptor, pending, intercept, enumerate, instantiate, apply, readyAttack, assertReadyAttack,
    assertContinuation,
    completeAttack(result, parent) {
      if(includeBeforeCasualtyCompletion&&result.state.officialBeforeCasualtyContinuations?.some(frame=>frame.suspendedHostSlots?.[parentKey]?.parentHash===parent.parentHash))return result;
      if (parent.attackKind === 'melee') return meleeTarget.completeAttack(result, parent);
      const damage = includeRangedDamageContinuation && result.state.pendingCurrentProductRangedDamageReaction;
      if (damage) {
        if (parent.attackKind === 'template'
          || !officialRangedDamageBelongsToTargetReactionV1(parent, damage, result.state.pendingOfficialReactionWindow)) {
          throw Error('ATTACK_TARGET_RANGED_DAMAGE_PARENT_MISMATCH');
        }
        const state = clone(result.state);
        saveParent(state, { ...parent, childParentHash: null, casualtyParentHash: null, damageParentHash: damage.checkpointHash });
        return { ...result, state };
      }
      const resolved = result.events.some(event => event.type === 'ranged_attack' && event.pieceId === parent.pieceId
        && event.targetId === parent.targetId && event.sourceProfileHash === parent.sourceProfileHash
        || parent.attackKind === 'template' && event.type === 'blast_template_batch_skipped' && event.targetId === parent.targetId);
      if (!resolved) {
        const child = parent.nativeChoices === true ? readOfficialRangedChoiceParentV1(result.state) : null;
        const casualty = parent.nativeChoices === true ? readOfficialRangedCasualtyContextV1(result.state) : null;
        const templateParent = parent.attackKind === 'template' ? result.state.pendingOfficialBlastTemplateAttack : null;
        if (child && officialRangedChoiceBelongsToTargetReactionV1(parent, child, result.state)
          || templateParent && officialTemplateAttackBelongsToTargetReactionV1(parent, templateParent)
          || casualty && officialRangedCasualtyBelongsToTargetReactionV1(parent, casualty)) {
          const state = clone(result.state);
          saveParent(state, { ...parent, childParentHash: child?.parentHash || null,
            ...(parent.damageParentHash ? { damageParentHash: null } : {}),
            ...(casualty ? { casualtyParentHash: casualty.pendingHash } : {}),
            ...(parent.attackKind === 'template' ? { templateParentHash: templateParent?.parentHash || null } : {}) });
          return { ...result, state };
        }
        throw Error('ATTACK_TARGET_ORIGINAL_ATTACK_NOT_RESOLVED');
      }
      const consumed = parent.standOnly ? {state:result.state} : consumeOfficialReactionFamilyResolutionV1(result.state, parent.triggerHash);
      const state = clone(consumed.state);
      delete state[parentKey];
      const event = { type: parent.triggerKind ? 'ranged_declaration_reaction_consumed' : 'attack_target_reaction_consumed',
        triggerHash: parent.triggerHash,
        resolutionHash: parent.resolutionHash, targetId: parent.targetId, trainingTruth: false };
      state.log[state.log.length - 1].events.push(clone(event));
      return { ...result, state, events: [...result.events, event] };
    } });
}
