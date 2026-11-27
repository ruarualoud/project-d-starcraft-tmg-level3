import assert from 'node:assert/strict';
import {projectOfficialRangedTerrainForLosV1} from '../packages/product-composition/official-ranged-terrain-projection-v1.mjs';
import {evaluateOfficialElevatedLineOfSightV1} from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import {poolParameters} from './verify-wave3-lethal-hologram-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {savedPosition,signedBranch,base,output} from './support/wave3-faq-room-v1.mjs';
const dir=base+'/ravager-bile-standard-v241/native-round-start',parent='standard-cocoon-ravager-bile';
const manifest=base+'/wave3-artefact-cocoon-v223-v1/morph/manifest.json',version='2.41.0';
const {actor}=await read(dir+'/placement.json');
const gate=await read(base+'/ravager-bile-standard-v241/cocoon-opening.json');
const recipes=(await read(gate.source)).find(row=>row.status==='compiled').recipes;
const {resolveWave3StandardContext}=await import('./support/wave3-standard-action-room-v1.mjs');
const {savedRoom}=await import('./support/wave3-faq-room-v1.mjs');
const {prepareOfficialStandardReleaseOpeningV2,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY}=await import('../packages/product-composition/official-standard-room-factory-v1.mjs');
const original=(await savedRoom(dir,parent)).initial.state,context=await resolveWave3StandardContext(await read(manifest),'area_ability_inputs');
const opening=prepareOfficialStandardReleaseOpeningV2({releaseContext:context,dataset:context.dataset,snapshot:context.snapshot,
  recipes,releaseMatchVersion:version,missionRecordKey:original.officialMissionRuntimeState.missionRecordKey,
  deploymentRecordKey:original.officialDeploymentGeometryBinding.deploymentRecordKey,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
const prefix=await savedPosition({dir,id:parent,version,revision:9,manifest,runtimeOpening:opening.state});
const state=structuredClone(prefix.state),ravager=state.pieces.find(p=>p.id===actor),target=state.pieces.find(p=>p.id==='swarm');
const platform=state.board.terrain.find(t=>t.id==='std-centre-large');
const token=state.board.tokens.find(t=>t.tokenKind==='corrosive_bile');
assert(token && platform.size===3);
const hiddenFrom=(s,from,to)=>to.models.filter(m=>m.isOnField&&!m.isDestroyed).filter(m=>!evaluateOfficialElevatedLineOfSightV1({
  state:projectOfficialRangedTerrainForLosV1(s).projected,attacker:from,target:to,attackerModelId:from.models[0].id,
  targetModelId:m.id,dataBundle:s.officialTerrainLosDataBundle}).visible).map(m=>m.id);
const id='faq62-bile-behind-terrain';
let hidden=[];
const lead=target.models.find(m=>!m.isDestroyed&&m.isOnField);
for(const x of [6,3,12]){
  const y=lead.yInches+(x-lead.xInches)*(18-lead.yInches)/(27-lead.xInches);
  for(const o of [ravager,ravager.models[0]])Object.assign(o,{xInches:x,yInches:y});
  hidden=hiddenFrom(state,ravager,target);
  if(hidden.includes(lead.id))break;
}
assert(hidden.length,'blocked LOS required');
const scene={parent,revision:9,hash:prefix.stateHash,condition:'only translate Ravager after signed Bile placement; original paid token and target positions retained',ravager:[ravager.xInches,ravager.yInches],hidden};
await signedBranch({initial:opening.state,state,dir:output+'/'+id,id,version,manifest,scene,perform:async({head,menu,commit})=>{
  while(!(await head()).state.resolvedCorrosiveBileEffects?.length){
    const cursor=await head();assert(cursor.stateRevision<12);
    const m=await menu();const row=m.finiteActions.find(r=>r.action.actionType==='resolve_ordered_corrosive_bile_effect')
      ??(m.finiteActions.length===1?m.finiteActions[0]:undefined)??(m.parameterDomains.length===1?m.parameterDomains[0]:undefined);
    assert(row,JSON.stringify([m.finiteActions.map(r=>r.action.actionType),m.parameterDomains.map(r=>r.actionType)]));
    await commit(row,row.domainId&&row.parameterSchema.required.length?poolParameters(row):{});
  }
},verify:async end=>{
  const result=end.state.resolvedCorrosiveBileEffects.at(-1);assert(result.completedWork.some(w=>w.targetUnitId===target.id));
  const after=end.state.pieces.find(p=>p.id===target.id);
  const casualties=after.models.filter(m=>m.isDestroyed&&hidden.includes(m.id)&&target.models.find(before=>before.id===m.id&&!before.isDestroyed)).map(m=>m.id);
  assert(casualties.length,'no measured out-of-sight casualty');assert(!end.state.board.tokens.some(t=>t.tokenId===token.tokenId));
  return {faq:62,hidden,casualties,token:token.tokenId,terrain:platform.id,sourcePosition:scene.ravager};
}});
