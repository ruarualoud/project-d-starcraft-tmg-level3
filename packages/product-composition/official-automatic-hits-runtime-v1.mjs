import {stageOfficialBeforeCasualtyContinuationV1} from './official-before-casualty-runtime-v1.mjs';
import {hasOfficialExtendedBeforeCasualtyPolicyV1,hasOfficialTemplateBeforeCasualtyPolicyV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';
import { planOfficialArmourThresholdV1, hasOfficialArmourThresholdPolicyV1 } from "../rule-atoms/official-armour-threshold-policy-v1.mjs";
import { projectOfficialBattlefieldAssetFamilyModifiersV1 } from "./official-battlefield-asset-family-adapter-v1.mjs";
import { recordOfficialArmourRollV1 } from "../rule-atoms/official-armour-roll-ordinal-v1.mjs";
import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';
import { inspectOfficialArmourChoiceV1, resolveOfficialArmourChoiceV1 } from '../rule-atoms/official-armour-choice-kernel-v1.mjs';
import { recordOfficialSupplyLossesV1 } from '../rule-atoms/official-supply-loss-ledger-v1.mjs';
import { resolveOfficialTotalDamagePoolReductionV1 } from '../rule-atoms/official-total-damage-reaction-kernel-v1.mjs';
import { consumeOfficialReactionFamilyResolutionV1, readOfficialBeforeEvadeReactionModifierV1 }
  from './official-reaction-family-adapter-v1.mjs';
import { projectOfficialCharacteristicStatusFamilyModifiersV1, resolveOfficialEffectiveCombatProfileV1 }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1, createOfficialCurrentProductCasualtyDomainV1,
  resolveOfficialCurrentProductCasualtyDomainV1, createOfficialSelectedRosterCasualtyChoiceContextV1,
  createOfficialSelectedRosterCasualtyChoiceDomainV1, projectOfficialSelectedRosterArmourReactionContextV1,
  openOfficialSelectedRosterDamageReceivedWindowV1 }
  from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { officialAttackChoiceFactsHashV1 } from './official-ranged-choice-context-v1.mjs';

const runtimeId = 'starcraft-tmg-automatic-hits-v1';
const parentKey = 'pendingOfficialAutomaticHits';
const ruleAtomIds = ['rule-atom:source-bound-automatic-hits-v1'];
const directCasualtyAction = 'choose_direct_ability_damage_casualties';
const clone = value => structuredClone(value);
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const fail = code => { throw Error(code); };
const liveModels = piece => piece.models.filter(model => model.isOnField !== false && model.isDestroyed !== true);

// This consumer starts from a paid, source-compiled ability declaration. It
// never accepts a caller's hit count, damage value, target set or native rolls.
export function createOfficialAutomaticHitsRuntimeV1({ sourceBundle, state, includeArmourReactions = false, sourceAuthority = null,
  independentlyOwnedReactionTriggers = [], includeDamageReceivedReaction = false, includeEvadeEligibility = false,
  includeBeforeEvadeReaction = false, consumeDefenceBeforeFollowUp = false }) {
  if (consumeDefenceBeforeFollowUp && !includeBeforeEvadeReaction) fail('AUTOMATIC_HITS_EVADE_CONSUMER_REQUIRED');
  const directSources = sourceBundle.routes.filter(route => ['force_wall_lightning','infestation_damage_cleanup'].includes(route.effectKind));
  const infestationDamage=directSources.some(route=>route.effectKind==='infestation_damage_cleanup');
  if (sourceAuthority && (sourceAuthority.schema !== 'starcraft_tmg_automatic_hits_source_authority_v1'
    || typeof sourceAuthority.owns !== 'function' || typeof sourceAuthority.validate !== 'function'
    || !sourceAuthority.sourceBundleHash)) fail('AUTOMATIC_HITS_EXTERNAL_SOURCE_INVALID');
  const resolvedDirectDamage = sourceAuthority?.resolvedDirectDamage === true;
  const hasDirectDamage = directSources.length > 0 || resolvedDirectDamage;
  const externalEvadeGrant = sourceAuthority?.evadeGrant;
  if (externalEvadeGrant !== undefined && (!externalEvadeGrant
    || !/^[a-f0-9]{64}$/u.test(externalEvadeGrant.authorityHash)
    || typeof externalEvadeGrant.applies !== 'function')) fail('AUTOMATIC_HITS_SOURCE_EVADE_GRANT_INVALID');
  if (!sourceAuthority && !directSources.length && !sourceBundle.routes.some(route => route.effectKind === 'automatic_hits_engaged')) {
    fail('AUTOMATIC_HITS_SOURCE_REQUIRED');
  }
  const reactionSource = state.officialReactionFamilySourceBundle;
  if (!Array.isArray(independentlyOwnedReactionTriggers)
    || independentlyOwnedReactionTriggers.some(kind => typeof kind !== 'string' || !kind || kind === 'before_armour_roll')) {
    fail('AUTOMATIC_HITS_INDEPENDENT_REACTION_OWNERS_INVALID');
  }
  const otherTriggers = [...new Set(independentlyOwnedReactionTriggers)].sort();
  const unsupportedReactions = (reactionSource?.routes ?? []).filter(route => route.triggerKind === 'before_armour_roll'
    ? !includeArmourReactions : !(includeDamageReceivedReaction && route.triggerKind === 'damage_received')
      && !(includeBeforeEvadeReaction && route.triggerKind === 'before_evade_roll') && !otherTriggers.includes(route.triggerKind));
  if ((includeArmourReactions && !reactionSource) || unsupportedReactions.length) {
    throw Object.assign(Error('AUTOMATIC_HITS_REACTION_CONSUMER_REQUIRED'), {
      code: 'AUTOMATIC_HITS_REACTION_CONSUMER_REQUIRED',
      detail: {missingReactionSource:includeArmourReactions && !reactionSource,
        pendingReactions:unsupportedReactions.map(({definitionId,triggerKind})=>({definitionId,triggerKind}))},
    });
  }
  const beforeCasualty=hasOfficialExtendedBeforeCasualtyPolicyV1(state);
  const runtimeVersion = hasOfficialTemplateBeforeCasualtyPolicyV1(state) ? '3.11.0' : infestationDamage ? '3.10.0' : beforeCasualty ? '3.9.0' : includeBeforeEvadeReaction ? '3.8.0' : resolvedDirectDamage ? '3.7.0' : externalEvadeGrant ? '3.6.0' : directSources.length ? '3.5.0' : includeEvadeEligibility ? '3.4.0' : includeDamageReceivedReaction ? '3.3.0' : otherTriggers.length ? (sourceAuthority ? '3.2.0' : '2.1.0')
    : sourceAuthority?.reactionTiming === 'outside_activation' ? '3.1.0'
    : sourceAuthority ? '3.0.0' : includeArmourReactions ? '2.0.0' : '1.0.0';
  const descriptor = seal({ runtimeId, runtimeVersion, ruleAtomIds,
    actions: ['resolve_automatic_hits', 'choose_automatic_hits_casualties', ...(hasDirectDamage ? [directCasualtyAction] : [])],
    ...(directSources.length ? { directDamageDefinitions: directSources.map(route => route.definitionId),
      directDamageNeedsNoRolls: true } : {}),
    ...(resolvedDirectDamage ? { externalResolvedDirectDamage: true } : {}),
    hitRollRequired: false, surgeAllowed: false, sourceBundleHash: sourceBundle.bundleHash,
    ...(sourceAuthority ? { externalSourceBundleHash: sourceAuthority.sourceBundleHash, friendlyTargetsFromOwnedSource: true } : {}),
    additionalReactionConsumer: includeArmourReactions ? 'before_armour_roll' : 'pending',
    ...(otherTriggers.length ? { independentlyOwnedReactionTriggers: otherTriggers } : {}),
    ...(includeDamageReceivedReaction ? { ownsDamageReceivedReaction: true } : {}),
    ...(includeBeforeEvadeReaction ? { beforeEvadeUsesActualUnrolledPool: true } : {}),
    ...(consumeDefenceBeforeFollowUp ? { defenceReactionsConsumedBeforeFollowUp: true } : {}),
    ...(includeEvadeEligibility ? { supportsGrantedEvade: true,
      ...(sourceAuthority?.reactionTiming === 'outside_activation' ? { outsideActivationSource: true } : {}) } : {}),
    ...(externalEvadeGrant ? { sourceEvadeGrantHash: externalEvadeGrant.authorityHash,
      ...(sourceAuthority.reactionTiming === 'outside_activation' ? { outsideActivationSource: true } : {}) } : {}),
    ...(beforeCasualty?{beforeCasualtyPolicyHash:hash(state.officialBeforeCasualtyBatchPolicy)}:{}),
    productionRoomEligible: false, trainingTruth: false }, 'runtimeHash');
  function pending(current) {
    const parent = current[parentKey];
    if (!parent) return null;
    const source = sourceBundle.routes.find(route => route.definitionId === parent.definitionId);
    const history = current.characteristicStatusAbilityHistory?.find(row => row.planHash === parent.sourcePlanHash);
    const external = sourceAuthority?.owns(parent) === true;
    const ownDirect = directSources.includes(source);
    const direct = ownDirect || (external && resolvedDirectDamage && Boolean(parent.directDamage));
    const declaredCoverage = ownDirect && history?.events.find(event => event.type ===
      (source.effectKind==='infestation_damage_cleanup'?'infestation_damage_declared':'psi_lightning_declared'))?.coverage;
    const targetIds = direct ? parent.directDamage?.targetUnitIds : parent.automaticHits?.targetUnitIds;
    const sourceValid = external ? sourceAuthority.validate(current, parent) === true
      : Boolean(source && history && source.sourceFeatureHash === parent.sourceFeatureHash && source.routeHash === parent.sourceRouteHash
        && (direct ? declaredCoverage && parent.directDamage?.damageAmount === source.damageAmount
          && parent.directDamage.coverageHash === hash(declaredCoverage)
          && isDeepStrictEqual(targetIds, declaredCoverage.map(row => row.unitId))
          : source.effectKind === 'automatic_hits_engaged' && !parent.directDamage
            && source.hits === parent.automaticHits?.hits && source.damagePerHit === parent.automaticHits?.damagePerHit));
    const inDamageWindow = includeDamageReceivedReaction && parent.stage === 'damage_reaction';
    const window = inDamageWindow ? current.pendingOfficialReactionWindow : null;
    const expectedSide = window ? window.prioritySideKeys[window.priorityIndex]
      : parent.stage === 'casualty' ? parent.defenderSideKey
        : inDamageWindow ? (parent.sourceSideKey ?? parent.sideKey) : parent.sideKey;
    if (parent.schema !== 'starcraft_tmg_automatic_hits_source_checkpoint_v1'
      || parent.parentHash !== hash(withoutHash(parent)) || parent.round !== Number(current.round)
      || parent.phase !== current.phase || !(['ready', 'casualty'].includes(parent.stage) || inDamageWindow)
      || window && window.triggerHash !== parent.damageReactionTriggerHash
      || !sourceValid || !targetIds?.length || current.activeSideKey !== expectedSide
      || parent.stage === 'casualty' && parent.factsHash !== officialAttackChoiceFactsHashV1(current, parentKey, parent.sideKey)) {
      fail('AUTOMATIC_HITS_PARENT_INVALID');
    }
    return parent;
  }
  function targetContext(current, parent, targetUnitId) {
    const target = current.pieces.find(piece => piece.id === targetUnitId);
    const external = sourceAuthority?.owns(parent) === true;
    if (!target || !liveModels(target).length || target.sideKey === parent.sideKey && !external) fail('AUTOMATIC_HITS_TARGET_INVALID');
    const damageKind = target.sideKey === parent.sideKey ? 'friendly_special_ability' : 'enemy_special_ability';
    const profile = resolveOfficialEffectiveCombatProfileV1(current, target);
    const modifiers = projectOfficialCharacteristicStatusFamilyModifiersV1(sourceBundle, current, {
      pieceId: targetUnitId, context: { attackerPieceId: parent.pieceId, targetPieceId: targetUnitId,
        damageKind, attackKind: 'automatic_hits', weaponName: parent.abilityName } });
    const battlefield = hasOfficialArmourThresholdPolicyV1(current) && current.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(current.officialBattlefieldAssetFamilySourceBundle, current, {
        pieceId: targetUnitId, context: { attackerPieceId: parent.pieceId, targetPieceId: targetUnitId,
          damageKind, attackKind: 'automatic_hits' } }) : {};
    const sourceGrantsEvade = external && externalEvadeGrant
      && externalEvadeGrant.applies(current, parent, targetUnitId) === true;
    const evadeEligible = (includeEvadeEligibility && profile.evadeThreshold !== null && modifiers.eligibleEvadeAgainstAllAttacks)
      || (sourceGrantsEvade === true && Number.isSafeInteger(profile.evadeThreshold));
    return { targetUnitId, sideKey: target.sideKey,
      armourThreshold: planOfficialArmourThresholdV1(current, profile.armourThreshold, battlefield.armourModifier || 0),
      tough: modifiers.tough, precision: 0,
      ...(evadeEligible ? { evadeThreshold: profile.evadeThreshold } : {}),
      layout: { hit: 0, surge: 0, armour: parent.automaticHits.hits, evade: evadeEligible ? parent.automaticHits.hits : 0 } };
  }
  function readyAction(current, parent) {
    return { actionType: 'resolve_automatic_hits', sideKey: parent.sideKey, phase: parent.phase,
      pieceId: parent.pieceId, parentHash: parent.parentHash,
      sourcePlanHash: parent.sourcePlanHash, executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds };
  }
  function reactionTiming(parent) {
    if (!sourceAuthority?.owns(parent)) return undefined;
    return sourceAuthority.timingFor ? sourceAuthority.timingFor(parent) : sourceAuthority.reactionTiming;
  }
  function inspectContext(current, action) {
    const parent = pending(current);
    if (parent?.stage !== 'ready' || !isDeepStrictEqual(readyAction(current, parent), action)) fail('AUTOMATIC_HITS_ACTION_STALE');
    return { targets: parent.automaticHits.targetUnitIds.map(id => targetContext(current, parent, id)),
      ...(sourceAuthority?.owns(parent)&&sourceAuthority.reactionContextFor
        ?{reactionActivationContext:sourceAuthority.reactionContextFor(current,parent)}:{}),
      ...(reactionTiming(parent) ? { reactionTiming: reactionTiming(parent) } : {}),
      precision: 0, automaticHits: clone(parent.automaticHits), sourcePlanHash: parent.sourcePlanHash };
  }
  function withArmourReaction(current, action, target, triggerHash) {
    if (triggerHash === undefined) return target;
    if (!includeArmourReactions) fail('AUTOMATIC_HITS_REACTION_CONSUMER_REQUIRED');
    const projected = projectOfficialSelectedRosterArmourReactionContextV1(current, action,
      { abilityModifiers: { tough: target.tough } }, { beforeArmourReactionTriggerHash: triggerHash }, target.targetUnitId);
    return { ...target, tough: projected.abilityModifiers.tough };
  }
  function inspectArmourDemand(current, action, request) {
    const context = inspectContext(current, action);
    const target = context.targets.find(row => row.targetUnitId === request?.targetUnitId);
    if (!target || Object.keys(request).some(key => !['targetUnitId', 'hitRolls', 'surgeRolls', 'convertedFailedHitDieIndices'].includes(key))
      || request.hitRolls?.length || request.surgeRolls?.length || request.convertedFailedHitDieIndices?.length) {
      fail('AUTOMATIC_HITS_ARMOUR_REQUEST_INVALID');
    }
    return seal({ targetUnitId: target.targetUnitId, armourDice: target.layout.armour,
      hits: context.automaticHits.hits, defenceDiceRolled: false, trainingTruth: false }, 'factsHash');
  }
  function inspectArmour(current, action, request) {
    const context = inspectContext(current, action);
    const selected = context.targets.find(row => row.targetUnitId === request.targetUnitId);
    if (!selected || !Array.isArray(request.armourRolls) || request.armourRolls.length !== selected.layout.armour
      || request.hitRolls?.length || request.surgeRolls?.length || request.convertedFailedHitDieIndices?.length) {
      fail('AUTOMATIC_HITS_ARMOUR_REQUEST_INVALID');
    }
    const target = withArmourReaction(current, action, selected, request.beforeArmourReactionTriggerHash);
    return { ...inspectOfficialArmourChoiceV1({ rolls: request.armourRolls,
      threshold: target.armourThreshold, tough: target.tough }), tough: target.tough,
      armourThreshold: target.armourThreshold, armourRolls: clone(request.armourRolls) };
  }
  function inspectEvadeDemand(current, action, request, selection) {
    const context = inspectContext(current, action);
    const target = context.targets.find(row => row.targetUnitId === request.targetUnitId);
    if (!target) fail('AUTOMATIC_HITS_EVADE_TARGET_INVALID');
    const facts = inspectArmour(current, action, request);
    const armour = resolveOfficialArmourChoiceV1({ rolls: facts.armourRolls, threshold: facts.armourThreshold,
      tough: facts.tough, convertedFailedDieIndices: selection });
    return { count: target.layout.evade ? context.automaticHits.hits - armour.saves : 0, modifiable: true };
  }
  function casualtyDomain(current, parent) {
    const direct = Boolean(parent.directDamage);
    return createOfficialSelectedRosterCasualtyChoiceDomainV1({ ...parent,
      pendingHash: parent.parentHash, attackerSideKey: parent.sideKey }, current, {
      parameterKind: direct ? 'official_direct_ability_damage_casualty_selection_v1' : 'official_automatic_hits_casualty_selection_v1',
      actionType: direct ? directCasualtyAction : 'choose_automatic_hits_casualties',
      phase: parent.phase, executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds,
      rulesTruth: direct ? 'official_defender_owned_direct_ability_damage_casualty_selection'
        : 'official_defender_owned_automatic_hits_casualty_selection' });
  }
  function enumerate(current, options = {}) {
    const parent = pending(current);
    if (!parent || parent.stage === 'damage_reaction' || (options.sideKey || current.activeSideKey) !== current.activeSideKey) {
      return { candidates: [], parameterDomains: [] };
    }
    return parent.stage === 'ready' ? { candidates: parent.directDamage
      ? [] : [{ ...readyAction(current, parent), isEnabled: true, disabledReason: '' }], parameterDomains: [] }
      : { candidates: [], parameterDomains: [casualtyDomain(current, parent)] };
  }
  function instantiate(current, domain, parameters) {
    const parent = pending(current);
    const expected = enumerate(current).parameterDomains[0];
    if (!expected || !isDeepStrictEqual(expected, domain)) fail('AUTOMATIC_HITS_CASUALTY_DOMAIN_STALE');
    const explicit = parent.casualtyDomain.selectionMode === 'explicit_model_ids';
    const key = explicit ? 'casualtyModelIds' : 'casualtySelectionHash';
    if (!parameters || Object.keys(parameters).length !== 1 || !Object.hasOwn(parameters, key)) fail('AUTOMATIC_HITS_CASUALTY_PARAMETERS_INVALID');
    const resolution = resolveOfficialCurrentProductCasualtyDomainV1(parent.casualtyDomain,
      explicit ? '' : parameters.casualtySelectionHash, explicit ? parameters.casualtyModelIds : null);
    const canonicalParameters = explicit ? { casualtyModelIds: clone(resolution.casualtyModelIds) }
      : { casualtySelectionHash: resolution.selectionHash };
    return { canonicalParameters, action: { actionType: domain.actionType, sideKey: parent.defenderSideKey,
      phase: parent.phase, pieceId: parent.targetPieceId, parentHash: parent.parentHash, canonicalParameters,
      executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds } };
  }
  function transition(current, action, events, options) {
    current.log ||= [];
    current.log.push({ id: 'log-' + (current.log.length + 1), round: Number(current.round), phase: current.phase,
      action: clone(action), events: clone(events) });
    return { ok: true, runtimeId, runtimeVersion, schema: 'starcraft_tmg_automatic_hits_transition_v1',
      postRevision: Number(options.postRevision || 0), state: current, action: clone(action), events, trainingTruth: false };
  }
  function nextCasualty(current, parent, row) {
    const target = current.pieces.find(piece => piece.id === row.targetUnitId);
    current.activeSideKey = target.sideKey;
    current[parentKey] = seal({ ...withoutHash(parent), stage: 'casualty', defenderSideKey: target.sideKey,
      targetPieceId: target.id, attackerPieceId: parent.pieceId, casualtyDomain: row.casualtyDomain,
      casualtyDomainHash: row.casualtyDomain.domainHash,
      ...createOfficialSelectedRosterCasualtyChoiceContextV1(current, target),
      factsHash: officialAttackChoiceFactsHashV1(current, parentKey, parent.sideKey) }, 'parentHash');
  }
  function finishOrChoose(current, parent, action, options,resumedCasualties=null) {
    const missing = parent.rows.find(row => !parent.selections[row.targetUnitId]);
    if (missing) {
      nextCasualty(current, parent, missing);
      return transition(current, action, [{ type: parent.directDamage ? 'direct_ability_damage_pending_defender_casualty'
        : 'automatic_hits_pending_defender_casualty',
        targetId: missing.targetUnitId, casualtyDomainHash: missing.casualtyDomain.domainHash }], options);
    }
    const casualties=parent.rows.map(row=>{const selected=parent.selections[row.targetUnitId];
      return resolveOfficialCurrentProductCasualtyDomainV1(row.casualtyDomain,selected.selectionHash||'',selected.casualtyModelIds||null);});
    if(beforeCasualty&&!resumedCasualties){
      const interrupted=stageOfficialBeforeCasualtyContinuationV1({state:current,action,hostKind:'automatic_hits',
        causePieceId:parent.pieceId,causeSideKey:parent.sourceSideKey??parent.sideKey,
        activationContext:sourceAuthority?.owns(parent)?sourceAuthority.reactionContextFor?.(current,parent)
          ||(hasOfficialTemplateBeforeCasualtyPolicyV1(current)&&reactionTiming(parent)==='outside_activation'
            ?{activeSideKey:parent.sideKey,activationId:null}:undefined):undefined,
        rows:parent.rows.map((row,index)=>({targetPieceId:row.targetUnitId,targetProfile:row.targetProfile,
          attackResolutionHash:row.resolution.resolutionHash,casualty:casualties[index]})),hostData:{parent}});
      if(interrupted)return interrupted;
    }
    const before = clone(current);
    const events = [];
    for (const [index,row] of parent.rows.entries()) {
      const target = current.pieces.find(piece => piece.id === row.targetUnitId);
      const casualty = resumedCasualties?.[index]||casualties[index];
      applyOfficialSelectedRosterResolvedDamageV1(current, target, row.targetProfile, casualty);
      const sourceSideKey = parent.sourceSideKey ?? parent.sideKey;
      events.push({ type: parent.directDamage ? 'ability_direct_damage' : 'automatic_hits_damage',
        sideKey: sourceSideKey, pieceId: parent.pieceId,
        targetId: target.id, sourceDefinitionId: parent.definitionId, sourcePlanHash: parent.sourcePlanHash,
        ...(parent.directDamage || sourceAuthority?.owns(parent) ? { damageOrigin: target.sideKey === sourceSideKey
          ? 'friendly_special_ability' : 'enemy_special_ability' } : {}),
        stages: row.resolution, casualtyModelIds: casualty.casualtyModelIds, postDamageMarker: casualty.postDamageMarker });
    }
    if (current.supplyLossLedger) {
      const loss = recordOfficialSupplyLossesV1({ stateBefore: before, stateAfter: current, action, events,
        rulesRuntimeHash: current.officialMissionRuntimeDescriptor.runtimeHash });
      current.supplyLossLedger = loss.ledger;
      events.push(...loss.supplyLossEvents);
    }
    delete current[parentKey];
    current.activeSideKey = parent.sideKey;
    events.push({ type: parent.directDamage ? 'direct_ability_damage_complete' : 'automatic_hits_complete', pieceId: parent.pieceId,
      originalActivationPreserved: sourceAuthority?.owns(parent) !== true, sourcePlanHash: parent.sourcePlanHash });
    return transition(current, action, events, options);
  }
  function openNextDamageReaction(current, parent, action, rows, fromIndex) {
    for (let damageTargetIndex = fromIndex; damageTargetIndex < rows.length; damageTargetIndex += 1) {
      const row = rows[damageTargetIndex];
      const damageSource = parent.sourceSideKey ? { ...action, sideKey: parent.sourceSideKey } : action;
      const opened = openOfficialSelectedRosterDamageReceivedWindowV1(current, damageSource, {
        targetPieceId: row.targetUnitId, incomingDamage: row.resolution.totalDamage, enemyReactionAllowed: true,
        outsideActivation: reactionTiming(parent) === 'outside_activation',
        ...(sourceAuthority?.owns(parent)&&sourceAuthority.reactionContextFor
          ?{activationContext:sourceAuthority.reactionContextFor(current,parent)}:{}),
      });
      if (!opened) continue;
      const next = clone(opened.state);
      const window = next.pendingOfficialReactionWindow;
      next[parentKey] = seal({ ...withoutHash(parent), stage: 'damage_reaction',
        rows: clone(rows), damageAction: clone(action), damageTargetIndex,
        damageReactionTriggerHash: window.triggerHash }, 'parentHash');
      next.activeSideKey = window.prioritySideKeys[0];
      return { ...opened, state: next };
    }
    return null;
  }
  function beginCasualties(current, parent, action, rows, options) {
    const selections = Object.fromEntries(rows.filter(row => row.casualtyDomain.legalSelections.length === 1
      && (!parent.directDamage || row.casualtyDomain.legalSelectionCount === 1))
      .map(row => [row.targetUnitId, { selectionHash: row.casualtyDomain.legalSelections[0].selectionHash }]));
    return finishOrChoose(current, { ...parent, rows, selections }, action, options);
  }
  function resolveDirectDamage(input, sourceAction, options = {}) {
    const parent = pending(input);
    if (!parent?.directDamage || parent.stage !== 'ready'
      || parent.sourcePlanHash !== (parent.directDamage.batches
        ? sourceAction.planHash : sourceAction.characteristicStatusPlan?.planHash)) fail('DIRECT_ABILITY_DAMAGE_SOURCE_NOT_READY');
    const current = clone(input);
    const graph = deriveOfficialEngagementGraphV2(input);
    const rows = parent.directDamage.targetUnitIds.map(targetUnitId => {
      const target = current.pieces.find(entry => entry.id === targetUnitId);
      if (!target || target.isOnField !== true || !liveModels(target).length) fail('DIRECT_ABILITY_DAMAGE_TARGET_INVALID');
      const targetProfile = resolveOfficialEffectiveCombatProfileV1(current, target);
      const resolved = parent.directDamage.batches?.find(batch => batch.targetPieceId === targetUnitId);
      const totalDamage = resolved?.amount ?? parent.directDamage.damageAmount;
      const resolution = seal({ targetUnitId, totalDamage, directAbilityDamage: true,
        hitRolls: resolved?.rolls ?? [], armourRolls: [], surgeRolls: [], evadeRolls: resolved?.evadeRolls ?? [],
        ...(resolved ? { phaseEndRoll: resolved } : {}), sourcePlanHash: parent.sourcePlanHash }, 'resolutionHash');
      return { targetUnitId, targetProfile, resolution,
        casualtyDomain: createOfficialCurrentProductCasualtyDomainV1({ state:current,targetPiece: target, targetProfile,
          nonLethalStandardDamagePolicy: current.officialNonLethalStandardDamagePolicy, incomingDamage: totalDamage,
          visibleModelIds: liveModels(target).map(model => model.id), engagementGraph: graph,
          attackResolutionHash: resolution.resolutionHash, rulesRuntimeHash: current.officialMissionRuntimeDescriptor.runtimeHash }) };
    });
    const reaction = includeDamageReceivedReaction && openNextDamageReaction(current, parent, sourceAction, rows, 0);
    return reaction || beginCasualties(current, parent, sourceAction, rows, options);
  }
  function resumeDamageReaction(currentInput, options) {
    const saved = pending(currentInput);
    if (saved?.stage !== 'damage_reaction' || currentInput.pendingOfficialReactionWindow) {
      fail('AUTOMATIC_HITS_DAMAGE_REACTION_CHECKPOINT_INVALID');
    }
    const { damageAction: action, damageTargetIndex, damageReactionTriggerHash: triggerHash, rows: savedRows,
      ...parent } = withoutHash(saved);
    const consumed = consumeOfficialReactionFamilyResolutionV1(currentInput, triggerHash);
    const current = clone(consumed.state);
    current.activeSideKey = parent.sideKey;
    const rows = clone(savedRows);
    const row = rows[damageTargetIndex];
    const target = current.pieces.find(piece => piece.id === row.targetUnitId);
    const { resolutionHash: originalResolutionHash, ...rolled } = row.resolution;
    const damagePool = resolveOfficialTotalDamagePoolReductionV1({
      priorDamageMarker: Number(target.damageMarker || 0), incomingDamage: rolled.totalDamage,
      requestedReduction: consumed.projection.damageReduction, minimumDamage: consumed.projection.minimumDamage,
      reductionSourceHash: consumed.projection.resolutionHash,
    });
    row.resolution = seal({ ...rolled, reactionDamagePool: damagePool,
      damageReactionResolutionHash: consumed.projection.resolutionHash }, 'resolutionHash');
    row.casualtyDomain = createOfficialCurrentProductCasualtyDomainV1({ state:current,targetPiece: target, targetProfile: row.targetProfile,
      nonLethalStandardDamagePolicy: current.officialNonLethalStandardDamagePolicy,
      incomingDamage: rolled.totalDamage, damagePoolReduction: damagePool,
      visibleModelIds: liveModels(target).map(model => model.id), engagementGraph: deriveOfficialEngagementGraphV2(current),
      attackResolutionHash: row.resolution.resolutionHash, rulesRuntimeHash: current.officialMissionRuntimeDescriptor.runtimeHash });
    const ready = { ...parent, stage: 'ready' };
    const result = openNextDamageReaction(current, ready, action, rows, damageTargetIndex + 1)
      || beginCasualties(current, ready, action, rows, options);
    const event = { type: 'automatic_hits_damage_reaction_resumed', targetId: target.id, triggerHash,
      originalResolutionHash, damagePool, chanceReusedWithoutReroll: true, trainingTruth: false };
    result.state.log.at(-1).events.unshift(clone(event));
    return { ...result, events: [event, ...result.events] };
  }
  function apply(currentInput, action, options = {}) {
    const parent = pending(currentInput);
    if (!parent) fail('AUTOMATIC_HITS_PARENT_REQUIRED');
    if (parent.stage === 'casualty') {
      const expected = instantiate(currentInput, casualtyDomain(currentInput, parent), action.canonicalParameters);
      if (!isDeepStrictEqual(expected.action, action) || options.chanceReveals?.length) fail('AUTOMATIC_HITS_CASUALTY_ACTION_INVALID');
      const selected = resolveOfficialCurrentProductCasualtyDomainV1(parent.casualtyDomain,
        action.canonicalParameters.casualtySelectionHash || '', action.canonicalParameters.casualtyModelIds || null);
      const next = { ...parent, selections: { ...parent.selections, [parent.targetPieceId]: {
        selectionHash: selected.selectionHash, ...(action.canonicalParameters.casualtyModelIds
          ? { casualtyModelIds: selected.casualtyModelIds } : {}) } } };
      return finishOrChoose(clone(currentInput), next, action, options);
    }
    if (parent.directDamage) fail('DIRECT_ABILITY_DAMAGE_REQUIRES_SOURCE_ACTION');
    const context = inspectContext(currentInput, action);
    const rolls = (options.chanceReveals || []).map(row => typeof row === 'object' && row !== null ? row.outcome : row);
    const { exactEvadeDiceCountsByTarget, beforeEvadeReactionTriggerHashesByTarget } = options;
    for (const targets of [exactEvadeDiceCountsByTarget, beforeEvadeReactionTriggerHashesByTarget]) {
      if (targets !== undefined && (!includeBeforeEvadeReaction || typeof targets !== 'object' || !targets
        || Array.isArray(targets) || Object.keys(targets).some(id => !parent.automaticHits.targetUnitIds.includes(id)))) {
        fail('AUTOMATIC_HITS_EVADE_TARGET_INVALID');
      }
    }
    const evadeCountFor = target => {
      if (exactEvadeDiceCountsByTarget === undefined) return target.layout.evade;
      const count = exactEvadeDiceCountsByTarget[target.targetUnitId];
      if (!Number.isSafeInteger(count) || count < 0 || count > target.layout.evade) fail('AUTOMATIC_HITS_EVADE_COUNT_INVALID');
      return count;
    };
    const expectedRollCount = context.targets.reduce((total, target) => total + target.layout.armour + evadeCountFor(target), 0);
    if (rolls.length !== expectedRollCount
      || rolls.some(value => !Number.isSafeInteger(value) || value < 1 || value > 6)) fail('AUTOMATIC_HITS_ROLLS_INVALID');
    const choices = options.toughConvertedFailedDieIndicesByTarget;
    if (!choices || Object.keys(choices).length !== context.targets.length
      || Object.keys(choices).some(id => !parent.automaticHits.targetUnitIds.includes(id))) fail('AUTOMATIC_HITS_TOUGH_SELECTION_REQUIRED');
    const graph = deriveOfficialEngagementGraphV2(currentInput);
    const triggers = options.beforeArmourReactionTriggerHashesByTarget || {};
    if (Object.keys(triggers).some(id => !parent.automaticHits.targetUnitIds.includes(id))) fail('AUTOMATIC_HITS_REACTION_TARGET_INVALID');
    let offset = 0;
    const rows = context.targets.map(selected => {
      const work = withArmourReaction(currentInput, action, selected, triggers[selected.targetUnitId]);
      const target = currentInput.pieces.find(piece => piece.id === work.targetUnitId);
      const targetProfile = resolveOfficialEffectiveCombatProfileV1(currentInput, target);
      const armourRolls = rolls.slice(offset, offset + work.layout.armour);
      offset += work.layout.armour;
      const armour = resolveOfficialArmourChoiceV1({ rolls: armourRolls, threshold: work.armourThreshold,
        tough: work.tough, convertedFailedDieIndices: choices[target.id] });
      const pendingDamage = parent.automaticHits.hits - armour.saves;
      const count = evadeCountFor(work);
      if (exactEvadeDiceCountsByTarget !== undefined && count !== (work.layout.evade ? pendingDamage : 0)) {
        fail('AUTOMATIC_HITS_EVADE_COUNT_INVALID');
      }
      const evadeRolls = rolls.slice(offset, offset + Math.min(count, pendingDamage));
      offset += count;
      const evadeReaction = readOfficialBeforeEvadeReactionModifierV1(currentInput, action, target.id,
        beforeEvadeReactionTriggerHashesByTarget?.[target.id]);
      if (evadeReaction && !evadeRolls.length) fail('AUTOMATIC_HITS_EVADE_REACTION_INVALID');
      const evadeThreshold = evadeReaction ? Math.max(2, work.evadeThreshold - evadeReaction) : work.evadeThreshold;
      const evadeSaves = evadeRolls.filter(roll => roll === 6 || (roll !== 1 && roll >= evadeThreshold)).length;
      const totalDamage = (pendingDamage - evadeSaves) * parent.automaticHits.damagePerHit;
      const resolution = seal({ targetUnitId: target.id, hits: parent.automaticHits.hits,
        hitRolls: [], surgeRolls: [], armourRolls, armourThreshold: work.armourThreshold,
        originalArmourSaves: armour.originalSaves, armourSaves: armour.saves, toughValue: armour.toughValue,
        convertedFailedArmourDieIndices: armour.convertedFailedDieIndices,
        evadeEligible: work.layout.evade > 0, evadeRolls,
        ...(work.layout.evade ? { evadeThreshold, evadeSaves } : {}),
        ...(evadeReaction ? { evadeReactionModifier: evadeReaction } : {}),
        damagePerDie: parent.automaticHits.damagePerHit, totalDamage }, 'resolutionHash');
      return { targetUnitId: target.id, targetProfile, resolution,
        casualtyDomain: createOfficialCurrentProductCasualtyDomainV1({ state:currentInput,targetPiece: target, targetProfile,
          nonLethalStandardDamagePolicy: currentInput.officialNonLethalStandardDamagePolicy,
          incomingDamage: totalDamage, visibleModelIds: liveModels(target).map(model => model.id),
          engagementGraph: graph, attackResolutionHash: resolution.resolutionHash,
          rulesRuntimeHash: currentInput.officialMissionRuntimeDescriptor.runtimeHash }) };
    });
    let current = clone(currentInput);
    for (const row of rows) recordOfficialArmourRollV1(current, { action,
      targetPieceId: row.targetUnitId, poolDice: parent.automaticHits.hits });
    const consumedEvents = [];
    if (consumeDefenceBeforeFollowUp) {
      // Reaction history is part of the signed casualty continuation facts.
      const defenceReactions = [
        { targets: triggers, eventType: 'melee_armour_reaction_consumed' },
        { targets: beforeEvadeReactionTriggerHashesByTarget || {}, eventType: 'automatic_hits_evade_reaction_consumed' },
      ];
      for (const { targets, eventType } of defenceReactions) {
        for (const [targetUnitId, triggerHash] of Object.entries(targets)) {
          const consumed = consumeOfficialReactionFamilyResolutionV1(current, triggerHash);
          current = clone(consumed.state);
          consumedEvents.push({ type: eventType, targetUnitId, triggerHash,
            resolutionHash: consumed.projection.resolutionHash,
            ...(eventType === 'automatic_hits_evade_reaction_consumed'
              ? { evadeModifier: consumed.projection.evadeModifier } : { savedDiceReused: true }),
            trainingTruth: false });
        }
      }
    }
    const reaction = includeDamageReceivedReaction && openNextDamageReaction(current, parent, action, rows, 0);
    const result = reaction || beginCasualties(current, parent, action, rows, options);
    if (!consumedEvents.length) return result;
    result.state.log.at(-1).events.push(...clone(consumedEvents));
    return { ...result, events: [...result.events, ...consumedEvents] };
  }
  return Object.freeze({ descriptor, enumerate, instantiate, inspectContext, inspectArmour,
    ...(beforeCasualty?{resumeBeforeCasualty:({state,frame,casualties,options={}})=>{
      if(frame.hostKind!=='automatic_hits'||casualties.length!==frame.hostData.parent.rows.length)fail('AUTOMATIC_HITS_BEFORE_CASUALTY_HOST_INVALID');
      return finishOrChoose(clone(state),frame.hostData.parent,frame.originalAction,options,casualties);
    }}:{}),
    ...(includeBeforeEvadeReaction ? { inspectEvadeDemand } : {}),
    ...(includeArmourReactions || includeBeforeEvadeReaction ? { inspectArmourDemand } : {}), apply,
    ...(includeDamageReceivedReaction ? { resumeDamageReaction,
      ownsDamageReactionWindow: current => pending(current)?.stage === 'damage_reaction' } : {}),
    ...(hasDirectDamage ? { resolveDirectDamage } : {}),
    hasPending: current => Boolean(pending(current)) });
}

export function createOfficialAutomaticHitsContinuationAdapterV1({ hits, pool }) {
  const adapterId = 'official-automatic-hits-continuation-v1';
  const descriptor = Object.freeze({ adapterId, adapterVersion: '1.0.0', adapterKind: 'exact_runtime',
    coveredDefinitionCount: 0, coveredSourceFeatureHashes: [], supportedOperations: ['legal_space', 'preview', 'apply'],
    hitsRuntimeHash: hits.descriptor.runtimeHash, poolRuntimeHash: pool.descriptor.runtimeHash,
    rulesAuthority: true, trainingTruth: false });

  function legalSpace(state, options = {}) {
    if (pool.hasPending(state)) return pool.enumerate(state, options);
    const { candidates, parameterDomains } = hits.enumerate(state, options);
    return { parameterDomains, candidates: candidates.map(candidate => ({
      ...pool.intercept(state, nativeAction(candidate)), isEnabled: true, disabledReason: '',
    })), trainingTruth: false };
  }

  function nativeAction(candidate) {
    const { isEnabled, disabledReason, ...action } = candidate;
    return action;
  }

  function preview(state, request) {
    if (request.action) {
      const action = legalSpace(state).candidates.map(nativeAction)
        .find(candidate => isDeepStrictEqual(candidate, request.action));
      if (!action) fail('AUTOMATIC_HITS_CONTINUATION_ACTION_STALE');
      return { action, trainingTruth: false };
    }
    const owner = pool.hasPending(state) ? pool : hits;
    return owner.instantiate(state, request.domain, request.parameters || {});
  }

  return Object.freeze({ descriptor, legalSpace, preview,
    apply(state, { action, options = {} }) {
      if (action.executorId === pool.descriptor.runtimeId) return pool.apply(state, action, options);
      if (pool.hasPending(state) || !action.canonicalParameters
        || action.executorId !== hits.descriptor.runtimeId) fail('AUTOMATIC_HITS_CONTINUATION_ACTION_INVALID');
      return hits.apply(state, action, options);
    },
  });
}
