import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { officialAttackChoiceFactsHashV1, OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY }
  from './official-ranged-choice-context-v1.mjs';

export const OFFICIAL_MELEE_POOL_CHOICE_PARENT_KEY = 'pendingOfficialMeleePoolChoice';
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));

export function readOfficialMeleePoolChoiceParentV1(state, { allowReaction = true } = {}) {
  const parent = state[OFFICIAL_MELEE_POOL_CHOICE_PARENT_KEY];
  if (!parent) return null;
  const target = parent.targets?.[parent.targetIndex];
  const window = state.pendingOfficialReactionWindow;
  const inReaction = ['reaction', 'evade_reaction'].includes(parent.stage);
  const owner = inReaction ? window?.prioritySideKeys?.[window.priorityIndex]
    : parent.stage === 'tough' ? target?.sideKey : parent.sideKey;
  const declaration = state[OFFICIAL_ATTACK_TARGET_REACTION_PARENT_KEY];
  if (parent.schema !== 'starcraft_tmg_melee_pool_choice_checkpoint_v1'
    || parent.parentHash !== hash(withoutHash(parent))
    || parent.round !== Number(state.round) || parent.phase !== state.phase
    || !['hit', 'precision', 'armour', 'tough', 'evade', ...(allowReaction ? ['reaction'] : []), ...(allowReaction && parent.beforeEvadeReaction ? ['evade_reaction'] : [])].includes(parent.stage)
    || !target || parent.completed.length !== parent.targetIndex
    || state.activeSideKey !== owner
    || parent.factsHash !== officialAttackChoiceFactsHashV1(state, OFFICIAL_MELEE_POOL_CHOICE_PARENT_KEY, parent.sideKey)
    || parent.attackActionHash !== hash(parent.attackAction)
    || target.sideKey !== state.pieces.find(row => row.id === target.targetUnitId)?.sideKey
    || parent.targetReactionSourceActionHash !== undefined
      && (!declaration || declaration.attackKind !== 'melee' || declaration.nativeChoices !== true
        || declaration.sourceActionHash !== parent.targetReactionSourceActionHash)
    || inReaction && (!window || window.triggerKind !== (parent.stage === 'reaction' ? 'before_armour_roll' : 'before_evade_roll')
      || window.triggerHash !== (parent.stage === 'reaction' ? parent.current.armourReactionTriggerHash : parent.current.evadeReactionTriggerHash)
      || window.sourceActionHash !== parent.attackActionHash)) throw Error('MELEE_POOL_PARENT_INVALID');
  return parent;
}
