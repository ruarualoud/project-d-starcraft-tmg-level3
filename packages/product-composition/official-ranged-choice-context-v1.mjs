import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_RANGED_CHOICE_PARENT_KEY = 'pendingOfficialRangedPrecisionChoice';
export const OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY = 'pendingOfficialAttackTargetReaction';
export const OFFICIAL_RANGED_ARMOUR_REACTION_PARENT_SCHEMA = 'starcraft_tmg_ranged_armour_reaction_checkpoint_v1';
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export function officialRangedChoiceFactsHashV1(state, attackerSideKey) {
  return officialAttackChoiceFactsHashV1(state, OFFICIAL_RANGED_CHOICE_PARENT_KEY, attackerSideKey);
}

export function officialAttackChoiceFactsHashV1(state, parentKey, attackerSideKey) {
  const facts = without(state, ['log', parentKey]);
  // The target-declaration owner refreshes its own checkpoint after this
  // child transition. The child's board seal stays independent of that seal.
  if (state.pendingOfficialAttackTargetReaction?.nativeChoices === true) delete facts.pendingOfficialAttackTargetReaction;
  if (attackerSideKey) facts.activeSideKey = attackerSideKey;
  if (facts.gameClock) facts.gameClock = { ...facts.gameClock, transition: 0 };
  return hash(facts);
}

export function readOfficialRangedChoiceParentV1(state) {
  const parent = state[OFFICIAL_RANGED_CHOICE_PARENT_KEY];
  if (!parent) return null;
  const reaction = parent.schema === OFFICIAL_RANGED_ARMOUR_REACTION_PARENT_SCHEMA;
  const armour = reaction || parent.schema === 'starcraft_tmg_ranged_armour_checkpoint_v1';
  const stages = reaction ? ['choice', 'reaction', 'defence', 'armour_choice', 'evade',
    ...(parent.usesBeforeEvadeReaction ? ['evade_reaction'] : [])]
    : armour ? ['choice', 'defence', 'armour_choice', 'evade'] : ['choice', 'defence'];
  const window = state.pendingOfficialReactionWindow;
  const inReaction = ['reaction', 'evade_reaction'].includes(parent.stage);
  const expectedSide = inReaction ? window?.prioritySideKeys?.[window.priorityIndex]
    : parent.stage === 'armour_choice' ? parent.defenderSideKey : parent.sideKey;
  if ((!armour && parent.schema !== 'starcraft_tmg_ranged_precision_checkpoint_v1')
    || parent.parentHash !== hash(without(parent, ['parentHash']))
    || !stages.includes(parent.stage) || parent.round !== Number(state.round) || parent.phase !== state.phase
    || state.activeSideKey !== expectedSide
    || parent.factsHash !== officialRangedChoiceFactsHashV1(state, armour ? parent.sideKey : undefined)
    || parent.attackActionHash !== hash(parent.attackAction)
    || reaction && inReaction && (!window
      || window.triggerKind !== (parent.stage === 'reaction' ? 'before_armour_roll' : 'before_evade_roll')
      || window.triggerHash !== (parent.stage === 'reaction' ? parent.armourReactionTriggerHash : parent.evadeReactionTriggerHash)
      || window.sourceActionHash !== parent.attackActionHash)
    || armour && (!Number.isSafeInteger(parent.toughValue) || parent.toughValue < (reaction ? 0 : 1)
      || parent.defenderSideKey !== state.pieces.find(row => row.id === parent.attackAction.targetId)?.sideKey)) {
    throw Error('PRECISION_PARENT_INVALID');
  }
  return parent;
}

// A completed Point Defense declaration retains its exact board binding while
// the nested Armour choice temporarily hands semantic control to the defender.
export function officialRangedDefenderContinuationSideV1(state, attackParent) {
  const inner = readOfficialRangedChoiceParentV1(state);
  if (!inner || !['armour_choice', 'reaction', 'evade_reaction'].includes(inner.stage) || state.activeSideKey !== inner.defenderSideKey
    || attackParent.stage !== 'ready'
    || inner.sideKey !== attackParent.sideKey || inner.pieceId !== attackParent.pieceId
    || inner.attackAction.targetId !== attackParent.targetId
    || inner.attackAction.rangedPlan?.profileKey !== attackParent.profileKey) return null;
  return inner.defenderSideKey;
}
