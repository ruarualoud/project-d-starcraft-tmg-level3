import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createStarcraftProductRoomHostV1,PRODUCT_PREFIX} from './support/starcraft-product-room-host-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-product-rollback');
const file=name=>path.join(dir,name+'.public.json');
const saved=async name=>JSON.parse(await fs.readFile(file(name),'utf8'));
const save=(name,row)=>atomicWrite(file(name),JSON.stringify(row,null,2)+'\n');
const setup=(JSON.parse(await fs.readFile('content/wave3-human-match-setups-v1.json','utf8'))).find(s=>s.scale==='Skirmish');
const form={matchMode:'human_vs_human',setupId:setup.id,ownPreset:setup.presets[0].id,opponentPreset:setup.presets[1].id};
const start=version=>createStarcraftProductRoomHostV1({root,dataDirectory:dir,liveEnabled:false,autoDrive:false,
  offlineWave3MatchVersion:version,mapConfiguration:{seedId:setup.seedId}});
async function create(host,name){
  try{return (await saved(name)).roomId;}catch(e){if(e.code!=='ENOENT')throw e;}
  const r=await host.handle({method:'POST',pathname:PRODUCT_PREFIX+'/rooms',body:form});
  assert.equal(r.status,201,JSON.stringify(r.response));const {roomId}=r.response.match;await save(name,{roomId});return roomId;
}
async function read(host,id){
  const item=await host.get(id),room=item.fixture.roomRuntime;
  const input={roomId:id,seatToken:item.record.credentials.human.seatToken};
  const {projection}=await room.readRoom(input),{legalSpace}=await room.legalSpace(input);
  assert.equal(projection.viewer.seatKey,'player1');
  const envelope=(await item.roomStore.loadRoom(id)).envelope;
  assert.equal(envelope.stateHash,projection.room.stateHash);
  return {item,room,input,legalSpace,evidence:{roomId:id,version:item.record.releaseSetup.version,
    stateHash:envelope.stateHash,revision:envelope.stateRevision,bindingHash:envelope.matchBindingHash,legalSpaceHash:legalSpace.legalSpaceHash}};
}
const ok=r=>{assert(r.ok,r.reason??JSON.stringify(r));return r;};
function preview(row,binding){
  return row.room.previewAction({...row.input,expectedStateRevision:row.evidence.revision,expectedStateHash:row.evidence.stateHash,
    expectedMatchBindingHash:binding,expectedLegalSpaceHash:row.legalSpace.legalSpaceHash,
    proposal:{kind:'finite',actionKey:row.legalSpace.finiteActions[0].actionKey}});
}
let host=await start('2.99.2');
try{
  const candidate=await create(host,'candidate');
  let row=await read(host,candidate);
  if(row.evidence.revision===0){
    const p=ok(await preview(row,row.evidence.bindingHash));
    const {previewId,previewToken,previewSeal}=p.preview;
    const confirmationId=p.confirmationRequired?ok(await row.room.confirmPreview({...row.input,previewId,previewToken,
      previewContentHash:previewSeal.contentHash})).confirmation.confirmationId:undefined;
    const {controlLease}=ok(await row.room.claimControl({...row.input,sessionId:'wave3-rollback-check'}));
    ok(await row.room.applyAction({...row.input,previewId,confirmationId,leaseId:controlLease.leaseId,
      leaseFence:controlLease.leaseFence,expectedStateRevision:0,idempotencyKey:'rollback-first-action'}));
    row=await read(host,candidate);
  }
  assert.equal(row.evidence.revision,1);assert.equal(row.evidence.version,'2.99.2');
  const before=row.evidence;
  await host.close();host=await start(undefined);
  const restored=await read(host,candidate);assert.deepEqual(restored.evidence,before);
  const previous=await create(host,'rolled-back-default');
  const prior=await read(host,previous);
  assert.equal(prior.evidence.version,setup.version);assert.notEqual(before.version,setup.version);
  const cross=await preview(prior,before.bindingHash);assert.equal(cross.ok,false);
  assert.equal(cross.reason,'LEGAL_SPACE_STALE');
  ok(await preview(prior,prior.evidence.bindingHash));
  assert.deepEqual((await read(host,previous)).evidence,prior.evidence);
  await host.close();host=await start('2.99.2');
  assert.deepEqual((await read(host,previous)).evidence,prior.evidence);
  assert.deepEqual((await read(host,candidate)).evidence,before);
  await save('result',{candidate:before,revertedDefault:prior.evidence,rejectedCrossRoom:cross.reason,
    candidateColdExact:true,defaultColdExact:true,productionPointerTouched:false,providerCalls:0});
  console.log('Signed candidate survived new-room default rollback to '+setup.version+'.');
}finally{await host.close();}
