import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { officialAttackChoiceFactsHashV1, OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY as parentKey }
  from './official-ranged-choice-context-v1.mjs';
import { OFFICIAL_MELEE_POOL_CHOICE_PARENT_KEY as childKey, readOfficialMeleePoolChoiceParentV1 }
  from './official-melee-pool-choice-context-v1.mjs';

const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export function officialMeleeTargetReactionFactsHashV1(state) {
  return officialAttackChoiceFactsHashV1(without(state, [childKey]), parentKey, state[parentKey]?.sideKey);
}

export function officialMeleeChoiceBelongsToTargetReactionV1(parent, child) {
  return child.sideKey === parent.sideKey && child.pieceId === parent.pieceId
    && child.targetReactionSourceActionHash === parent.sourceActionHash
    && child.attackAction.actionType === 'fight'
    && child.attackAction.meleePlan?.profileKey === parent.profileKey
    && child.attackAction.meleePlan?.sourceProfileHash === parent.sourceProfileHash
    && isDeepStrictEqual(child.attackAction.meleePlan.canonicalParameters, parent.sourceAction.meleePlan.canonicalParameters);
}

export function officialMeleeDamageBelongsToTargetReactionV1(parent, damage, window) {
  const action = damage.attackAction;
  const targetId = damage.resolvedPools.rows[damage.targetIndex]?.target.id;
  return damage.schema === 'starcraft_tmg_official_melee_damage_reaction_checkpoint_v1'
    && damage.checkpointHash === hash(without(damage, ['checkpointHash']))
    && damage.kind === 'fight' && damage.round === parent.round && damage.phase === parent.phase
    && action.pieceId === parent.pieceId && action.sideKey === parent.sideKey && action.actionType === 'fight'
    && action.meleePlan.profileKey === parent.profileKey && action.meleePlan.sourceProfileHash === parent.sourceProfileHash
    && isDeepStrictEqual(action.meleePlan.canonicalParameters, parent.sourceAction.meleePlan.canonicalParameters)
    && parent.targetUnitIds.includes(targetId) && window?.triggerKind === 'damage_received'
    && window.triggerHash === damage.triggerHash && window.context.targetPieceId === targetId;
}

export function readOfficialMeleeTargetReactionParentV1(state) {
  const parent = state[parentKey];
  if (!parent) return null;
  const window = state.pendingOfficialReactionWindow;
  const child = parent.stage === 'ready' ? readOfficialMeleePoolChoiceParentV1(state) : null;
  const damage = parent.damageParentHash ? state.pendingOfficialMeleeDamageReaction : null;
  const expectedSide = parent.stage === 'reaction' || ['reaction', 'evade_reaction'].includes(child?.stage) || damage
    ? window?.prioritySideKeys?.[window.priorityIndex]
    : child?.stage === 'tough' ? child.targets[child.targetIndex].sideKey : parent.sideKey;
  const source = parent.sourceAction;
  const targets = source?.meleePlan?.allocations?.map(row => row.targetUnitId);
  if (parent.schema !== 'starcraft_tmg_attack_target_reaction_checkpoint_v1'
    || parent.attackKind !== 'melee' || parent.nativeChoices !== true
    || !['reaction', 'ready'].includes(parent.stage)
    || parent.parentHash !== hash(without(parent, ['parentHash']))
    || parent.factsHash !== officialMeleeTargetReactionFactsHashV1(state)
    || parent.round !== Number(state.round) || parent.phase !== state.phase || state.activeSideKey !== expectedSide
    || source?.actionType !== 'fight' || !Array.isArray(targets) || targets.length === 0 || parent.sourceActionHash !== hash(source)
    || source.sideKey !== parent.sideKey || source.pieceId !== parent.pieceId
    || source.meleePlan.profileKey !== parent.profileKey || source.meleePlan.sourceProfileHash !== parent.sourceProfileHash
    || !isDeepStrictEqual(targets, parent.targetUnitIds)
    || !Number.isSafeInteger(parent.targetIndex) || parent.targetIndex < 0 || parent.targetIndex > targets.length
    || !Array.isArray(parent.targetResolutions) || !Array.isArray(parent.skippedTargetUnitIds)
    || new Set(parent.targetResolutions.map(row => row.targetId)).size !== parent.targetResolutions.length
    || parent.targetResolutions.some(row => !targets.includes(row.targetId))
    || !isDeepStrictEqual([...parent.targetResolutions.map(row => row.targetId), ...parent.skippedTargetUnitIds].sort(),
      targets.slice(0, parent.targetIndex).sort())
    || child && !officialMeleeChoiceBelongsToTargetReactionV1(parent, child)
    || (parent.childParentHash || null) !== (child?.parentHash || null)
    || parent.damageParentHash && (parent.stage !== 'ready' || child
      || damage?.checkpointHash !== parent.damageParentHash
      || !officialMeleeDamageBelongsToTargetReactionV1(parent, damage, window))
    || parent.stage === 'reaction' && (state[childKey] != null || !window
      || parent.targetId !== targets[parent.targetIndex] || window.triggerKind !== 'attack_target_selected'
      || window.triggerHash !== parent.triggerHash || window.sourceActionHash !== parent.sourceActionHash)
    || parent.stage === 'ready' && parent.targetIndex !== targets.length) {
    throw Error('ATTACK_TARGET_REACTION_PARENT_INVALID');
  }
  return parent;
}

export function createOfficialMeleeTargetAttackContextV1(state) {
  const parent = readOfficialMeleeTargetReactionParentV1(state);
  if (parent?.stage !== 'ready') throw Error('ATTACK_TARGET_CONTEXT_OWNER_REQUIRED');
  const child = readOfficialMeleePoolChoiceParentV1(state);
  const result = structuredClone(state);
  if (child) {
    result[parentKey] = { ...structuredClone(parent), stage: 'attack_context', contextParent: structuredClone(parent),
      contextChild: structuredClone(child), contextActiveSideKey: state.activeSideKey };
    delete result[childKey];
  }
  result.activeSideKey = parent.sideKey;
  return result;
}

export function readOfficialMeleeTargetWeaponContextV1(state) {
  const view = state[parentKey];
  if (view?.stage !== 'attack_context') return readOfficialMeleeTargetReactionParentV1(state);
  if (!view.contextParent || !view.contextChild
    || hash(without(view, ['stage', 'contextParent', 'contextChild', 'contextActiveSideKey']))
      !== hash(without(view.contextParent, ['stage']))) throw Error('ATTACK_TARGET_CONTEXT_PROJECTION_INVALID');
  return readOfficialMeleeTargetReactionParentV1({ ...state, activeSideKey: view.contextActiveSideKey,
    [parentKey]: view.contextParent, [childKey]: view.contextChild });
}
