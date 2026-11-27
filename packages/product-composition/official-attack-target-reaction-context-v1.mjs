import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { projectOfficialDarkSwarmReactionFactsV1 } from './official-dark-swarm-reaction-facts-v1.mjs';
import { readOfficialConsumeReactionEffectFactsV1 } from './official-consume-payment-runtime-v1.mjs';
import { readOfficialRangedCasualtyContextV1, officialRangedCasualtyBelongsToTargetReactionV1 }
  from './official-ranged-casualty-context-v1.mjs';
import { OFFICIAL_RANGED_CHOICE_PARENT_KEY, readOfficialRangedChoiceParentV1, OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY }
  from './official-ranged-choice-context-v1.mjs';
import { officialMeleeTargetReactionFactsHashV1, readOfficialMeleeTargetReactionParentV1,
  readOfficialMeleeTargetWeaponContextV1 } from './official-melee-target-reaction-context-v1.mjs';

export { OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY };
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export function officialAttackTargetReactionFactsHashV1(state) {
  if (state[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY]?.attackKind === 'melee') return officialMeleeTargetReactionFactsHashV1(state);
  const facts = without(state, ['log', OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY]);
  const parent = state[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY];
  if (parent?.nativeChoices === true) {
    delete facts[OFFICIAL_RANGED_CHOICE_PARENT_KEY];
    facts.activeSideKey = parent.sideKey;
  }
  if (facts.gameClock) facts.gameClock = { ...facts.gameClock, transition: 0 };
  return hash(facts);
}

export function officialRangedDamageBelongsToTargetReactionV1(parent, damage, window) {
  const action = damage?.attackAction;
  return damage?.schema === 'starcraft_tmg_official_ranged_damage_reaction_checkpoint_v1'
    && damage.checkpointHash === hash(without(damage, ['checkpointHash']))
    && damage.sourceActionHash === hash(action)
    && damage.round === parent.round && damage.phase === parent.phase
    && action?.actionType === 'ranged_attack' && action.pieceId === parent.pieceId
    && action.sideKey === parent.sideKey && action.targetId === parent.targetId
    && action.rangedPlan.profileKey === parent.profileKey && action.rangedPlan.sourceProfileHash === parent.sourceProfileHash
    && isDeepStrictEqual(action.rangedPlan.canonicalParameters, parent.sourceAction.rangedPlan.canonicalParameters)
    && window?.triggerKind === 'damage_received' && window.triggerHash === damage.triggerHash
    && window.context.targetPieceId === parent.targetId;
}

export function readOfficialAttackTargetReactionParentV1(state) {
  const parent = state[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY];
  if (!parent) return null;
  if (parent.attackKind === 'melee') return readOfficialMeleeTargetReactionParentV1(state);
  const window = state.pendingOfficialReactionWindow;
  const template = parent.attackKind === 'template';
  const templateParent = template ? state.pendingOfficialBlastTemplateAttack : null;
  const child = parent.nativeChoices === true && parent.stage === 'ready' ? readOfficialRangedChoiceParentV1(state) : null;
  const casualty = parent.nativeChoices === true && parent.stage === 'ready' && !template
    ? readOfficialRangedCasualtyContextV1(state) : null;
  const damage = parent.damageParentHash ? state.pendingCurrentProductRangedDamageReaction : null;
  const expectedSide = parent.stage === 'reaction' || damage ? window?.prioritySideKeys?.[window.priorityIndex]
    : ['reaction', 'evade_reaction'].includes(child?.stage) ? window?.prioritySideKeys?.[window.priorityIndex]
    : child?.stage === 'armour_choice' ? child.defenderSideKey
    : casualty ? casualty.defenderSideKey
    : templateParent?.stage === 'casualty' ? state.pieces.find(row => row.id === templateParent.currentAction?.targetId)?.sideKey
    : parent.sideKey;
  if (parent.schema !== 'starcraft_tmg_attack_target_reaction_checkpoint_v1'
    || !['reaction', 'ready', 'redirect'].includes(parent.stage)
    || parent.stage === 'redirect' && !parent.standGrant
    || parent.parentHash !== hash(without(parent, ['parentHash']))
    || parent.factsHash !== officialAttackTargetReactionFactsHashV1(state)
    || parent.round !== Number(state.round) || parent.phase !== state.phase
    || state.activeSideKey !== expectedSide
    || parent.sourceActionHash !== hash(parent.sourceAction)
    || parent.sourceAction.actionType !== (template ? 'blast_template_attack' : 'ranged_attack')
    || parent.sideKey !== parent.sourceAction.sideKey
    || parent.pieceId !== parent.sourceAction.pieceId
    || parent.targetId !== (template ? parent.sourceAction.canonicalParameters?.primaryTargetUnitId : parent.sourceAction.targetId)
    || parent.profileKey !== parent.sourceAction.rangedPlan?.profileKey
    || parent.sourceProfileHash !== parent.sourceAction.rangedPlan?.sourceProfileHash
    || parent.nativeChoices !== undefined && parent.nativeChoices !== true
    || parent.attackKind !== undefined && !template
    || template && (parent.nativeChoices !== true
      || (parent.templateParentHash || null) !== (templateParent?.parentHash || null)
      || templateParent && !officialTemplateAttackBelongsToTargetReactionV1(parent, templateParent))
    || parent.stage === 'reaction' && state[OFFICIAL_RANGED_CHOICE_PARENT_KEY] != null
    || child && !officialRangedChoiceBelongsToTargetReactionV1(parent, child, state)
    || casualty && !officialRangedCasualtyBelongsToTargetReactionV1(parent, casualty)
    || parent.damageParentHash && (parent.stage !== 'ready' || template || child || casualty
      || damage?.checkpointHash !== parent.damageParentHash
      || !officialRangedDamageBelongsToTargetReactionV1(parent, damage, window))
    || parent.nativeChoices === true && parent.stage === 'ready'
      && (parent.childParentHash || null) !== (child?.parentHash || null)
    || parent.nativeChoices === true && parent.stage === 'ready' && !template
      && (parent.casualtyParentHash || null) !== (casualty?.pendingHash || null)
    || parent.triggerKind !== undefined && !['ranged_attack_declared', 'debuff_received'].includes(parent.triggerKind)
    || parent.stage === 'reaction' && (!window || window.triggerKind !== (parent.triggerKind ?? 'attack_target_selected')
      || window.triggerHash !== parent.triggerHash || window.sourceActionHash !== parent.sourceActionHash)) {
    throw Error('ATTACK_TARGET_REACTION_PARENT_INVALID');
  }
  return parent;
}

export function officialRangedChoiceBelongsToTargetReactionV1(parent, child, state) {
  const template = parent.attackKind === 'template';
  const source = child.attackAction;
  const templateParent = state?.pendingOfficialBlastTemplateAttack;
  const sameBatch = template ? child.delegateKind === 'template'
    && (source.actionType === 'blast_template_attack'
      ? source.templateDeclarationHash === parent.sourceAction.templateDeclarationHash
        && source.canonicalParameters?.primaryTargetUnitId === parent.targetId
      : source.actionType === 'resolve_blast_template_batch'
        && templateParent && officialTemplateAttackBelongsToTargetReactionV1(parent, templateParent)
        && source.parentHash === templateParent.parentHash && source.batchIndex === templateParent.batchIndex
        && templateParent.batches.slice(templateParent.batchIndex).some(batch => batch.unitId === source.targetId))
    : source.targetId === parent.targetId;
  return child.sideKey === parent.sideKey && child.pieceId === parent.pieceId && sameBatch
    && child.attackAction.rangedPlan?.profileKey === parent.profileKey
    && child.attackAction.rangedPlan?.sourceProfileHash === parent.sourceProfileHash;
}

export function officialTemplateAttackBelongsToTargetReactionV1(parent, template) {
  return parent.attackKind === 'template'
    && template.schema === 'starcraft_tmg_blast_template_attack_checkpoint_v1'
    && template.parentHash === hash(without(template, ['parentHash']))
    && template.round === parent.round && template.phase === parent.phase && template.sideKey === parent.sideKey
    && template.pieceId === parent.pieceId && template.profileKey === parent.profileKey
    && template.sourceProfileHash === parent.sourceProfileHash
    && Array.isArray(template.batches) && Number.isSafeInteger(template.batchIndex)
    && template.batchIndex >= 0 && template.batchIndex < template.batches.length
    && template.declarationAction?.templateDeclarationHash === parent.sourceAction.templateDeclarationHash
    && template.declaration?.primaryTargetUnitId === parent.targetId;
}

// The ranged kernel receives an attack-only view after the choice owner has
// validated its current child. Retaining that exact child permits the view to
// be independently checked after readonly snapshots or worker serialization.
// This view cannot enter the component Apply path, which rejects its stage.
export function createOfficialTargetReactionAttackContextV1(state) {
  const parent = readOfficialAttackTargetReactionParentV1(state);
  if (parent?.nativeChoices !== true || parent.stage !== 'ready') throw Error('ATTACK_TARGET_CONTEXT_OWNER_REQUIRED');
  const child = readOfficialRangedChoiceParentV1(state);
  const result = structuredClone(state);
  if (!child) return result;
  result[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY] = { ...structuredClone(parent), stage: 'attack_context',
    contextParent: structuredClone(parent), contextChild: structuredClone(child) };
  delete result[OFFICIAL_RANGED_CHOICE_PARENT_KEY];
  return result;
}

function weaponContextParent(state) {
  const view = state[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY];
  if (view?.attackKind === 'melee') return readOfficialMeleeTargetWeaponContextV1(state);
  if (view?.stage !== 'attack_context') return readOfficialAttackTargetReactionParentV1(state);
  if (!view.contextParent || !view.contextChild
    || hash(without(view, ['stage', 'contextParent', 'contextChild'])) !== hash(without(view.contextParent, ['stage']))) {
    throw Error('ATTACK_TARGET_CONTEXT_PROJECTION_INVALID');
  }
  return readOfficialAttackTargetReactionParentV1({ ...state,
    [OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY]: view.contextParent,
    [OFFICIAL_RANGED_CHOICE_PARENT_KEY]: view.contextChild });
}

// The caller supplies identities from the real weapon context. No public
// parameter can assert that a reaction occurred or provide its damage cap.
function validAttackTargetEffect(state, source, effect, pieceId, targetId, attackKind) {
  if (effect.effectHash !== hash(without(effect, ['effectHash'])) || effect.targetPieceId !== targetId
    || effect.attackerPieceId !== pieceId || effect.effectDuration !== 'this_attack') return false;
  const route = source?.routes.find(row => row.definitionId === effect.definitionId
    && row.sourceFeatureHash === effect.sourceFeatureHash && row.effectKind === effect.effectKind
    && row.triggerKind === 'attack_target_selected');
  if (!route) return false;
  if (effect.effectKind === 'evade_eligibility' && route.rangedDeclarationOnly) {
    const caster = state.pieces.find(p=>p.id===effect.sourceInstanceId);
    const target = state.pieces.find(p=>p.id===targetId);
    return attackKind!=='melee' && caster?.officialUnitRecordKey===route.recordKey && caster.sideKey===target?.sideKey
      && effect.sideKey===caster.sideKey && effect.evadeEligible===true && effect.evadeModifier===undefined;
  }
  if (effect.effectKind === 'evade_eligibility' && route.meleeDeclarationOnly) {
    const target = state.pieces.find(piece => piece.id === targetId);
    const attacker = state.pieces.find(piece => piece.id === pieceId);
    return attackKind === 'melee' && target?.sideKey === effect.sideKey
      && Boolean(attacker && attacker.sideKey !== effect.sideKey)
      && effect.evadeEligible === true && effect.evadeModifier === undefined
      && (state.cardResources?.[effect.sideKey] || []).some(card =>
        card.cardInstanceId === effect.sourceInstanceId && card.officialCardRecordKey === route.recordKey);
  }
  if (effect.effectKind === 'evade_eligibility' && route.requiresSharedFriendlyDarkSwarmToken) {
    if (effect.consumePaymentReceiptHash) {
      const facts = readOfficialConsumeReactionEffectFactsV1(state, effect);
      return effect.evadeEligible === true && effect.evadeModifier === facts.evadeModifier;
    }
    const caster = state.pieces.find(piece => piece.id === effect.sourceInstanceId);
    const target = state.pieces.find(piece => piece.id === targetId);
    return projectOfficialDarkSwarmReactionFactsV1(state, caster, target).some(facts =>
      hash(facts) === hash(effect.darkSwarmFacts) && effect.evadeEligible === true
      && effect.evadeModifier === facts.evadeModifier);
  }
  return effect.sourceInstanceId === targetId
    && (effect.effectKind === 'weapon_damage_characteristic_cap' && effect.maximumWeaponDamage === 1
      && route.maximumWeaponDamage === effect.maximumWeaponDamage
      || effect.effectKind === 'fixed_evade_characteristic' && effect.evadeThreshold === 4
      && route.evadeThreshold === effect.evadeThreshold && effect.evadeUnmodifiable === true && route.evadeUnmodifiable === true);
}

function attackTargetReactionEffects(state, { pieceId, targetId, profileKey, sourceProfileHash }) {
  const selected = state[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY];
  if (!selected || selected.triggerKind !== undefined || !['ready', 'attack_context'].includes(selected.stage) || selected.pieceId !== pieceId
    || selected.attackKind !== 'melee' && selected.targetId !== targetId
    || selected.profileKey !== profileKey || selected.sourceProfileHash !== sourceProfileHash) return null;
  const parent = weaponContextParent(state);
  const selectedTarget = parent.attackKind === 'melee' ? parent.targetResolutions.find(row => row.targetId === targetId) : parent;
  if (!selectedTarget) return null;
  const resolution = (state.officialReactionResolutionHistory || []).find(row => row.triggerHash === selectedTarget.triggerHash);
  const source = state.officialReactionFamilySourceBundle;
  if (!resolution || resolution.consumedByHost !== false
    || resolution.resolutionHash !== selectedTarget.resolutionHash
    || resolution.resolutionHash !== hash(without(resolution, ['resolutionHash']))
    || resolution.triggerKind !== 'attack_target_selected'
    || resolution.sourceActionHash !== parent.sourceActionHash || resolution.resumeActionHash !== parent.sourceActionHash
    || resolution.round !== parent.round || resolution.phase !== parent.phase || resolution.activeSideKey !== parent.sideKey
    || resolution.effects.some(effect => !validAttackTargetEffect(state, source, effect, pieceId, targetId, parent.attackKind))) {
    throw Error('ATTACK_TARGET_REACTION_RESOLUTION_INVALID');
  }
  return { resolution, selectedTarget };
}

export function projectOfficialAttackTargetWeaponDamageCapV1(state, request) {
  const context = attackTargetReactionEffects(state, request);
  const effects = context?.resolution.effects.filter(row => row.effectKind === 'weapon_damage_characteristic_cap') || [];
  if (!effects.length) return null;
  return { maximumWeaponDamage: 1, triggerHash: context.selectedTarget.triggerHash,
    resolutionHash: context.resolution.resolutionHash, sourceDefinitionIds: effects.map(row => row.definitionId) };
}

export function projectOfficialAttackTargetFixedEvadeV1(state, request) {
  const context = attackTargetReactionEffects(state, request);
  const effect = context?.resolution.effects.find(row => row.effectKind === 'fixed_evade_characteristic');
  if (!effect) return null;
  return { evadeThreshold: effect.evadeThreshold, evadeUnmodifiable: true, triggerHash: context.selectedTarget.triggerHash,
    resolutionHash: context.resolution.resolutionHash, sourceDefinitionId: effect.definitionId };
}

export function projectOfficialAttackTargetEvadeEligibilityV1(state, request) {
  const context = attackTargetReactionEffects(state, request);
  const effects = context?.resolution.effects.filter(row => row.effectKind === 'evade_eligibility') || [];
  const parent = state[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY];
  const grant = parent?.standGrant;
  if (grant && state.officialArtanisStandEnabled && parent.pieceId === request.pieceId
      && parent.profileKey === request.profileKey && parent.sourceProfileHash === request.sourceProfileHash
      && grant.targetId === request.targetId) {
    const receipt = (state.officialReactionResolutionHistory || []).find(r => r.triggerHash === grant.triggerHash);
    const effect = receipt?.effects.find(e => e.effectHash === grant.effectHash);
    const route = state.officialReactionFamilySourceBundle?.routes.find(r => r.definitionId === effect?.definitionId);
    if (!receipt?.consumedByHost || receipt.resolutionHash !== hash(without(receipt,['resolutionHash']))
      || !effect || effect.effectHash !== hash(without(effect,['effectHash']))
      || route?.effectKind !== 'ranged_attack_redirect' || route.sourceFeatureHash !== effect.sourceFeatureHash
      || !effect.redirectedTargetEvadeEligible || effect.sourceInstanceId !== request.targetId
      || effect.attackerPieceId !== request.pieceId || receipt.round !== Number(state.round) || receipt.phase !== state.phase) {
      throw Error('ARTANIS_REDIRECT_EVADE_RECEIPT_INVALID');
    }
    return {evadeEligible:true, evadeModifier:Math.max(0,...effects.map(row=>Number(row.evadeModifier || 0))),
      triggerHash:receipt.triggerHash,resolutionHash:receipt.resolutionHash,sourceDefinitionIds:[route.definitionId,...effects.map(e=>e.definitionId)]};
  }
  if (!effects.length) return null;
  return { evadeEligible: effects.some(row => row.evadeEligible === true),
    evadeModifier: Math.max(0, ...effects.map(row => Number(row.evadeModifier || 0))),
    triggerHash: context.selectedTarget.triggerHash, resolutionHash: context.resolution.resolutionHash,
    sourceDefinitionIds: effects.map(row => row.definitionId) };
}

