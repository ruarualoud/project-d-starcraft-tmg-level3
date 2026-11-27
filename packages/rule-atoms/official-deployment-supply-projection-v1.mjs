import {projectOfficialContextualSupplyValueV1} from './official-contextual-supply-projection-v1.mjs';
// Shared by ordinary/special deployment and pregame inspection. Null has meaning
// only with the authoritative unlimited mode; finite zero is still zero.
export function projectOfficialDeploymentSupplyV1(state,sideKey,pieceId=null){
 const roundSupply=state.officialRoundSupplyState;
 const unlimited=roundSupply?.mode==='unlimited'&&Number(roundSupply.round)===Number(state.round);
 const capacity=unlimited?null:Number(roundSupply?.supplyPoolBySide?.[sideKey]??state.players?.[sideKey]?.supply??0);
 const committed=(state.pieces||[]).filter(p=>p.sideKey===sideKey&&p.isOnField===true&&p.isDestroyed!==true&&Number(p.currentModels)>0)
  .reduce((sum,p)=>sum+projectOfficialContextualSupplyValueV1({state,pieceId:p.id,context:'supply_pool_calculation'}).effectiveSupply,0);
 const pool={mode:unlimited?'unlimited':'finite',capacity,committed,available:unlimited?null:Math.max(0,capacity-committed)};
 if(pieceId===null)return pool;
 const unitSupply=projectOfficialContextualSupplyValueV1({state,pieceId,context:'supply_pool_calculation'});
 return {...pool,pieceId,requestedSupply:unitSupply.effectiveSupply,poolRequirementSatisfied:unlimited||unitSupply.effectiveSupply<=pool.available,unitSupply,
  eligibilityScope:'supply_pool_only_geometry_and_action_window_still_required',doesNotReplaceMarkerControlSupply:true};
}
