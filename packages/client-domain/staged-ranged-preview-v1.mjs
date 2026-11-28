import {hashStarcraftTmgClientContract as hash} from './portable-contract-hash-v1.mjs';

// PRECISION starts with the hit pool, before the player's conversion choice.
// Accept that Native stage only when it seals the exact selected attack plan.
// This does not instantiate attacks or infer any Rules outcome in the client.
export function matchesStarcraftTmgParameterizedPreviewActionV1(action,entry,parameters){
  if(action&&entry&&action.actionType===entry.actionType)return true;
  if(entry?.actionType!=='ranged_attack'||entry.parameterKind!=='official_selected_roster_ranged_target_v1'
    ||action?.actionType!=='roll_ranged_attack_hit_pool')return false;
  let stage=action;
  for(let depth=0;stage?.sourceAction&&depth<8;depth++){
    if(stage.actionType!=='roll_ranged_attack_hit_pool'||stage.sourceActionHash!==hash(stage.sourceAction)
      ||stage.pieceId!==entry.pieceId||stage.sideKey!==entry.sideKey||stage.phase!==entry.phase)return false;
    stage=stage.sourceAction;
  }
  const attack=stage?.attackAction,plan=attack?.rangedPlan,
    selected=entry.constraints?.targetPlans?.find(p=>p.targetUnitId===parameters?.targetUnitId);
  return stage?.actionType==='roll_ranged_attack_hit_pool'
    &&stage.executorId==='starcraft-tmg-ranged-precision-choice-v1'
    &&stage.pieceId===entry.pieceId&&stage.sideKey===entry.sideKey&&stage.phase===entry.phase
    &&stage.precisionValue>0&&stage.precisionValue===plan?.activePrecisionValue
    &&attack?.actionType==='ranged_attack'&&stage.attackActionHash===hash(attack)
    &&attack.pieceId===entry.pieceId&&attack.sideKey===entry.sideKey&&attack.phase===entry.phase
    &&attack.targetId===parameters?.targetUnitId&&stage.targetId===attack.targetId
    &&attack.weaponName===entry.weaponName&&stage.weaponName===attack.weaponName
    &&!!selected&&stage.attackPlanHash===selected.attackPlanHash
    &&plan?.attackPlanHash===stage.attackPlanHash&&plan.profileKey===entry.profileKey;
}
