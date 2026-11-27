import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {base,output,manifestRef,savedRoom,signedBranch} from './support/wave3-faq-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {unitEntryPerimeters} from '../packages/product-composition/official-unit-entry-perimeters-v1.mjs';
import {projectOfficialDeploymentSupplyV1} from '../packages/rule-atoms/official-deployment-supply-projection-v1.mjs';

const version='2.99.5',kind=process.argv[2];assert(['omega','zagara'].includes(kind));
const id='faq64-burrow-'+kind,dir=output+'/'+id;
const reference=await read(base+'/inherited-zerg-standard-2.51.0/kerrigan.json');
reference.compareReadOnlyAdmission=true;
const user='player2-corpser';
const slot=reference.recipes.player2.units.find(p=>p.unitInstanceId===user);
if(kind==='zagara'){
  reference.recipes=await read(base+'/zagara-standard-admission-v239/recipes.json');
  reference.recipes.player2.units.push({...slot,upgradeNames:['Burrow Ambush']});
}
const scene={positions:kind==='zagara'?{zagara:[6,12]}:{},entry:kind};
const initial=await restoreOrPreparePositionedStandardOpening({reference,dir:dir+'/factory',roomId:id,candidateVersion:version,scene});
let state=structuredClone(initial);
if(kind==='omega'){
  const original=(await savedRoom(base+'/omega-network-deployment-v261','omega-network-deployment-v261')).initial;
  scene.sourceHash=original.stateHash;
  for(const key of ['pieces','round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','players','supplyLossLedger','officialRoundSupplyState','reserveManifestBySide','officialBattlefieldAssetBindings','battlefieldAssetLifecycleHistory','unitLifecycleUseHistory','selectedRosterActivationWindow','currentProductMatchLifecycle']){
    if(Object.hasOwn(original.state,key))state[key]=structuredClone(original.state[key]);else delete state[key];
  }
}else{
  Object.assign(state,{round:2,stage:'activation_phases',phase:'movement',activeSideKey:'player2',firstPlayerSideKey:'player2'});
  delete state.currentProductMatchLifecycle;
  state.phaseFirstActorByRound['2:movement']={round:2,phase:'movement',chosenFirstActorSideKey:'player2',markerHolderSideKey:'player2'};
  initializeOfficialMatchRoundSupplyV1(state,true);
}
assert(state.officialWave3FaqClarificationsHash,'current Standard opening must carry FAQ binding');
const piece=state.pieces.find(p=>p.id===user),segmentPrefix=kind==='omega'?'omega-worm:':'infested-drop:';
const params=(d)=>{
  const pitch=Math.ceil(piece.models[0].baseWidthInches*1000)+120;
  const edge=d.parameterSchema.entrySegmentId.enum.find(s=>s.startsWith(segmentPrefix));
  assert(edge,JSON.stringify(d.parameterSchema.entrySegmentId));
  return {leadingModelId:piece.models[0].id,entrySegmentId:edge,placements:piece.models.map((m,i)=>({modelId:m.id,xMilliInches:13000+(i%2)*pitch,yMilliInches:13000+Math.floor(i/2)*pitch,elevation:'ground',supportTerrainIds:[]})),
    ...(d.parameterSchema.required.includes('paymentCardInstanceIds')?{paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.enum[0]}:{})};
};
await signedBranch({initial,state,dir,id,version,manifest:manifestRef,scene,perform:async({head,menu,commit})=>{
  if((await head()).stateRevision)return;
  const domains=(await menu()).parameterDomains,d=domains.find(d=>d.pieceId===user&&d.abilityName==='Burrow Ambush');
  assert(d,JSON.stringify(domains.filter(d=>d.pieceId===user).map(d=>[d.actionType,d.definitionId])));
  await commit(d,params(d));
},verify:async e=>{
  const receipt=e.state.relocationAbilityHistory.at(-1);assert(receipt.deploymentResolved && receipt.entrySource.committedSupply===1);
  const previous=receipt.entrySource.remainingSupplyBefore;
  const reserve=e.state.pieces.find(p=>p.sideKey===piece.sideKey&&p.isInReserves&&p.currentSupply===1);
  const supply=projectOfficialDeploymentSupplyV1(e.state,reserve.sideKey,reserve.id);
  const after=unitEntryPerimeters(e.state,reserve.sideKey,reserve,supply).find(s=>s.segmentId.startsWith(segmentPrefix));
  assert.equal(after?.remainingSupply??0,previous-1);
  return {faq:64,source:receipt.entrySource,unit:user,after:after?.remainingSupply??0,round:e.state.round,activeSide:e.state.activeSideKey};
}});
