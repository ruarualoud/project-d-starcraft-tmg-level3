// Scope guard for effects already validated by Native, not another terrain Rules.
import {isDeepStrictEqual} from 'node:util';
export function nativeTemporalInvariantErrorV1(detail){
 return Object.assign(Error('PREGAME_TEMPORAL_INVARIANT_FAILED'),{code:'PREGAME_TEMPORAL_INVARIANT_FAILED',nativeTemporalInvariant:true,detail:structuredClone(detail)});
}
export function assertNativeTemporalTerrainTransitionV1({parent,successor,nativeAction,nativeEvents=[],errorCode}){
 const reject=()=>{throw Error(errorCode);};
 if(!isDeepStrictEqual(parent.board?.accessPoints,successor.board?.accessPoints))reject();
 const before=parent.board?.terrain,after=successor.board?.terrain;
 if(isDeepStrictEqual(before,after))return;
 if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length)reject();
 const action=nativeAction?.sourceAction??nativeAction;
 let removed;
 if(['deploy','move','run'].includes(action?.actionType)){
  const plan=action.spatialPlan;
  const event=nativeEvents.find(e=>e.type==='unit_'+action.actionType+'_resolved'&&e.pieceId===action.pieceId&&e.sideKey===action.sideKey&&e.spatialPlanHash===plan?.spatialPlanHash);
  if(!plan||!event||!Array.isArray(plan.grassRemovedTerrainIds)||!isDeepStrictEqual(event.grassRemovedTerrainIds,plan.grassRemovedTerrainIds))reject();
  removed=plan.grassRemovedTerrainIds;
 }else if(action?.actionType==='resolve_relocation_ability'){
  const plan=action.relocationPlan?.geometryPlan;
  const event=nativeEvents.find(e=>e.type==='relocation_ability_resolved'&&e.pieceId===action.pieceId&&e.definitionId===action.definitionId&&e.geometryPlanHash===plan?.geometryPlanHash);
  if(!plan||!event||!Array.isArray(plan.grassRemovedTerrainIds))reject();
  removed=plan.grassRemovedTerrainIds;
 }else reject();
 const ids=new Set(removed),shape=t=>Object.fromEntries(Object.entries(t).filter(([k])=>!['isRemoved','removedBy'].includes(k)));
 for(let i=0;i<before.length;i++){
  const a=before[i],b=after[i];
  if(isDeepStrictEqual(a,b))continue;
  if(a?.id!==b?.id||a.terrainKind!=='grass'||!ids.has(a.id)||b.isRemoved!==true||!isDeepStrictEqual(shape(a),shape(b)))reject();
  // Native metadata may attribute removal but cannot move/reclassify terrain.
 }
 for(const id of ids)if(!before.some(t=>t.id===id&&t.terrainKind==='grass')||!after.some(t=>t.id===id&&t.isRemoved===true))reject();
}
