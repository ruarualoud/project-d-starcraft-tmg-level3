import assert from 'node:assert/strict';
import {deriveOfficialEngagementGraphV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {read} from './support/wave3-raven-tabletop-room-v1.mjs';
import {savedPosition,signedBranch,base,output} from './support/wave3-faq-room-v1.mjs';
const dir='build/ticket-28-wave3-faq58-current/matched-deployment';
const source=await read(dir+'/result.public.json'),parent=source.roomId,revision=18;
const {loadWave3HumanMatchSetupsV1}=await import('../packages/product-composition/wave3-human-match-v1.mjs');
const opening=await read(dir+'/opening.json');
const setup=(await loadWave3HumanMatchSetupsV1(process.cwd())).find(row=>row.sourceHash===opening.manifestHash);
assert(setup);
const manifest=setup.releaseRef;
const prefix=await savedPosition({dir,id:parent,revision,version:source.version,manifest});
const plan={leadingModelId:source.resolved[0].modelId,placements:source.resolved};
const state=structuredClone(prefix.state);
const adept=state.pieces.find(p=>p.id==='adept');
const enemy=state.pieces.find(p=>p.id==='zealot');
Object.assign(enemy,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:enemy.models[0].id});
state.reserveManifestBySide[enemy.sideKey].find(r=>r.pieceId===enemy.id).deploymentStatus='deployed';
const model=enemy.models[0];
const right=plan.placements.reduce((a,b)=>a.xMilliInches>b.xMilliInches?a:b);
const target=adept.models.find(m=>m.id===right.modelId);
const x=right.xMilliInches/1000+(model.baseWidthInches+target.baseWidthInches)/2+0.25,y=right.yMilliInches/1000;
Object.assign(enemy,{xInches:x,yInches:y});
enemy.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:x+Math.floor(i/2)*(m.baseWidthInches+0.1),yInches:y+i%2*(m.baseWidthInches+0.1)}));
const edges=s=>deriveOfficialEngagementGraphV2(s).modelEdges.filter(e=>[e.leftUnitId,e.rightUnitId].includes(adept.id)&&[e.leftUnitId,e.rightUnitId].includes(enemy.id));
assert.equal(edges(state).length,0);
const id='faq92-paid-shade-artefact-v2995';
await signedBranch({manifest,initial:state,state,dir:output+'/'+id,id,version:'2.99.5',scene:{parent,revision,hash:prefix.stateHash,condition:'field opposing Zealots next to the paid shade destination; retain signed SET coordinates and artefact drop'},
  perform:async({head,menu,commit})=>{
    if((await head()).stateRevision===0)await commit((await menu()).parameterDomains.find(d=>d.actionType==='choose_psionic_transfer_round_end'),{choice:'place',placementPlan:plan});
    if((await head()).stateRevision===1)await commit((await menu()).parameterDomains.find(d=>d.actionType==='place_artefact_hunt_marker'),{
      xMilliInches:source.suspended.from[0].xMilliInches,yMilliInches:source.suspended.from[0].yMilliInches});
    const completion=(await menu()).finiteActions.find(f=>f.action.actionType==='complete_psionic_transfer_round_end');
    if(completion)await commit(completion);
  },verify:async(e)=>{
    const contacts=edges(e.state);assert(contacts.length>0,'no new engagement');
    const choice=e.state.resolvedPsionicTransferRoundEnd.find(r=>r.choice==='place');
    assert(choice && e.state.pieces.find(p=>p.id==='adept').models.every(m=>plan.placements.some(row=>row.modelId===m.id&&row.xMilliInches===Math.round(m.xInches*1000)&&row.yMilliInches===Math.round(m.yInches*1000))));
    return {faq:92,originalEdges:0,contacts,shade:choice.tokenId,opponent:enemy.id};
  }});
