import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {savedRoom,base,output} from './support/wave3-faq-room-v1.mjs';
import {bindWave3StandardActionRoom} from './support/wave3-standard-action-room-v1.mjs';
import {deriveOfficialTokenSurfacePlacementV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
const dir='build/ticket-28-wave3-faq71-creep-elevation';
const {stages,version}=await read(dir+'/result.public.json'),last=stages.at(-1);
const {initial,head}=await savedRoom(dir,last.roomId);
assert.equal(head.stateHash,last.stateHash);
const {manifestRef}=await read(base+'/inherited-zerg-standard-2.53.0/malignant.json');
const bound=await bindWave3StandardActionRoom({manifestRef,initial:initial.state,dir,candidateVersion:version,frozenRuntimeRef:dir+'/runtime.json'});
const samples=[];
for(const [phase,e] of [['before',initial],['after',head]]){
  const s=structuredClone(e.state),p=s.pieces.find(p=>p.id==='kerrigan');
  assert.equal(p.models.length,1);assert(p.isOnField);
  for(const object of [p,p.models[0]]) Object.assign(object,{xInches:32,yInches:19,elevation:'ground',supportTerrainIds:[]});
  const sources=s.board.tokens.filter(t=>t.tokenKind==='creep_tumor').map(t=>({id:t.tokenId,
    gap:Math.hypot(p.xInches-t.coordinate.x,p.yInches-t.coordinate.y)-(p.models[0].baseWidthInches+t.baseDiameterInches)/2,
    surface:deriveOfficialTokenSurfacePlacementV2(s,t).elevation}));
  const within=sources.filter(t=>t.gap<=6);
  assert.equal(within.length,phase==='after'?1:0);if(within.length)assert.equal(within[0].surface,'high');
  const {onCreep}=bound.runtime.queryBattlefieldModifiers(s,p.id).result;
  assert.equal(onCreep,phase==='after');samples.push({phase,sourceStateHash:e.stateHash,groundUnit:p.id,onCreep,within});
}
await save(output+'/creep-elevation/result.public.json',{faq:70,version,samples,
  signedSource:dir+'/result.public.json',exception:'build/ticket-28-zerg-wave3-20261118-v1/plague-coverage/REPORT.zh-CN.md',providerCalls:0});
