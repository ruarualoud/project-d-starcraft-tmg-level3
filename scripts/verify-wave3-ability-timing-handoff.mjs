import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {projectStarcraftTmgBattlefieldPresentationV1} from '../packages/client-domain/battlefield-presentation-v1.mjs';
import {resolveStarcraftTmgBattlefieldUnitMediaV1 as media} from '../packages/client-domain/battlefield-media-catalog-v1.mjs';
const root=process.cwd(),dir=path.join(root,'build/ticket-28-wave3-lobby-mission-selection');
const prior=JSON.parse(await fs.readFile(path.join(dir,'result.public.json'),'utf8')).results.at(-1);
const candidateDir=path.join(root,'build/ticket-28-wave3-release-wide-phases');
await fs.mkdir(candidateDir,{recursive:true});
const open = (dataDirectory,extra={})=>createStarcraftProductRoomHostV1({root,dataDirectory,liveEnabled:false,
  mapConfiguration:{seedId:'standard-d6-1'},...extra});
const baselineFile=path.join(candidateDir,'old-phase.public.json');
const readSaved=async file=>{try{return JSON.parse(await fs.readFile(file,'utf8'));}
  catch(e){if(e.code!=='ENOENT')throw e;return null;}};
let baseline=await readSaved(baselineFile);
if(!baseline) {
  const old=await open(dir);
  try {
    const item=await old.get(prior.roomId);
    const facts=item.fixture.rulesRuntime.queryAbilityTiming('army_units:nova_assault_mode');
    baseline={roomId:prior.roomId,stateHash:prior.stateHash,
      previousPhase:facts.definitions.find(row=>row.name==='Battle Preparation').phase,policy:facts.sourcePolicyVersion};
    assert.equal(baseline.previousPhase,'assault');
    await atomicWrite(baselineFile,JSON.stringify(baseline));
  } finally {await old.close();}
}
const host=await open(candidateDir,{offlineWave3MatchVersion:'2.99.2'});
try {
  const {setupId}=prior;
  const product='/starcraft-tmg-level3/product/v1';
  const choice=host.planningInputsForSetup(setupId).wave3MatchSetup;
  const savedRoom=path.join(candidateDir,'room.public.json');
  let saved=await readSaved(savedRoom);
  if(!saved) {
    const made=await host.handle({method:'POST',pathname:product+'/rooms',body:{setupId,matchMode:'human_vs_human',
      ownPreset:choice.presets[0].id,opponentPreset:choice.presets[1].id}});
    assert.equal(made.status,201,made.response.reason);
    saved={roomId:made.response.match.roomId};
    await atomicWrite(savedRoom,JSON.stringify(saved));
  }
  const {roomId}=saved;
  const room=await host.get(roomId);
  const {envelope}=await room.roomStore.loadRoom(roomId);
  const state=envelope.state;
  const side=state.activeSideKey;
  const credential=Object.values(room.record.credentials).find(seat=>seat.seatKey===side)
    ?? (side==='player1'?room.record.credentials.human:room.record.credentials.bot);
  const seat={roomId,seatToken:credential.seatToken};
  const roomRuntime=room.fixture.roomRuntime;
  const [{projection},{legalSpace}]=await Promise.all([roomRuntime.readRoom(seat),roomRuntime.legalSpace(seat)]);
  assert(projection && legalSpace,'seat must see current legal space');
  const scene=createStarcraftTmgSceneQueryServiceV1({roomStore:room.roomStore,rulesRuntime:room.fixture.rulesRuntime,seatKey:side});
  const api=(args)=>scene.query({roomProjection:projection,legalSpace,request:{queryKind:'ability.timing',arguments:args}});
  const board=await createRosterPlanningProductModuleV1({root,roomId,...host.planningInputsForSetup(setupId),operation:'board_queries'});
  const cards=board.readBuilderCatalogue();
  const selected=cards.units.find(unit=>unit.id==='nova_assault_mode');
  const wanted={recordKey:'army_units:'+selected.id};
  const receipt=await api(wanted);
  assert.equal(receipt.status,'exact',JSON.stringify([receipt.reason,receipt.details]));
  assert.deepEqual(selected.upgrades.map(u=>u.ruleTiming),receipt.result.definitions);
  assert.equal(receipt.result.definitions.find(x=>x.name==='Battle Preparation').phase,'any');
  const evidence=await board.teachEvidencePort.query({challengeId:'facts-for-this-record',mutationAuthority:false,
    initialFoundationHash:envelope.stateHash,sourceHashes:[cards.source.officialDatasetHash],request:{kind:'spatial',
      toolRequest:{queryKind:'ability.timing',argumentsJson:JSON.stringify(wanted),seatKey:side}}});
  assert.deepEqual(evidence.sourceReceipt?.queryReceipt?.result,receipt.result,evidence.unknownReasonCode);
  const empty=await api({recordKey:'army_units:does-not-exist'});
  assert.equal(empty.status,'unknown');assert.equal(empty.reason,'ABILITY_TIMING_RECORD_UNKNOWN');
  const projectionMedia=projectStarcraftTmgBattlefieldPresentationV1({roomProjection:projection});
  for (const model of projectionMedia.models) {
    const piece=projection.state.pieces.find(p=>p.id===model.pieceId);
    assert.equal(model.officialUnitRecordKey,piece.officialUnitRecordKey??null);
  }
  for (const id of ['vileling__zergling_','swarmling__zergling_','kerrigan_swarm_raptor__zergling_','corpser__roach_','vile__roach_','roachling']) {
    assert.equal(media('army_units:'+id),null);
  }
  assert.equal(media('army_units:marine').unitKey,'marine');
  assert.equal(media('player2-marine-1').unitKey,'marine');
  const out={setupId,roomId,baseline,candidateVersion:'2.99.2',compiledPolicy:receipt.result.sourcePolicyVersion,recordKey:wanted.recordKey,
    comparedDefinitions:receipt.result.definitions.length,example:receipt.result.definitions.find(x=>x.name==='Battle Preparation')??receipt.result.definitions[0],
    timingFactsHash:hash(receipt.result),roomReceipt:receipt.queryReceiptHash,teachReceipt:evidence.receiptHash,
    sourceDataset:cards.source.officialDatasetHash,invalidRecord:empty.reason,
    modelProjectionCount:projectionMedia.models.length,unitVariantsNoLongerMisidentified:6,
    readOnly:true,externalModelCalls:0};
  await atomicWrite(path.join(candidateDir,'ability-timing.public.json'),JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out));
} finally {await host.close();}
