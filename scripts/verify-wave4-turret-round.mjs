import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TurretInputs, bindWave4TurretRoom } from './support/wave4-turret-room-v1.mjs';
import { createWave4TurretRoundScene } from './support/wave4-turret-round-v1.mjs';
import { timingParameters } from './support/wave4-timing-room-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { allowsOfficialSpawnRoundSpecialAbilityV1 } from '../packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const inputs=await loadWave4TurretInputs(root);
const scene=createWave4TurretRoundScene(inputs);
const parent=path.join(root,'build/wave4-web/turret-combat');
const directory=process.argv[2]?path.resolve(process.argv[2]):await fs.mkdtemp(path.join(parent,'round-'));
assert.ok(directory.startsWith(parent+path.sep));
if(process.argv[2])assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory,'authority.json'),'utf8')).state,scene.state);
const bound=await bindWave4TurretRoom({inputs,...scene,directory});
assert.equal(bound.runtime.descriptor.productionRoomEligible,false);
assert.equal(bound.runtime.descriptor.fullMatchAdmission,false);
assert.equal(bound.runtime.descriptor.currentProductAbilityPendingCount,549);
const roomId='wave4-turret-native-round';
let native=bound.open();
let expected;
const trace=[];
const fired=new Set();
let r1Suppressed=false,r2Unlocked=false;
try {
  const credentials=await native.create(roomId,bound.authority);
  const starting=await native.store.loadRoom(roomId);
  if(starting.stateRevision) {
    const bundle=await native.store.loadReplayBundle(roomId);
    const receipts=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
    const saved=await fs.readFile(path.join(directory,'round-trace.json'),'utf8').then(JSON.parse).catch(error=>{
      if(error.code!=='ENOENT')throw error;return null;});
    if(saved) {assert.equal(saved.at(-1).stateHash,starting.envelope.stateHash);trace.push(...saved);}
    else {assert.equal(starting.envelope.state.round,1);assert.equal(starting.envelope.state.phase,'cleanup');
      receipts.forEach((receipt,index)=>trace.push({revision:receipt.postStateRevision,round:1,phase:receipt.action.phase,
        sideKey:receipt.action.sideKey,actionType:receipt.action.actionType,
        definitionId:receipt.action.sourceAction?.sourceAction?.definitionId||null,stateHash:receipt.postStateHash,
        nextRound:1,nextPhase:receipts[index+1]?.action.phase||'cleanup'}));}
    const spawned=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:receipts.slice(0,3)});
    assert.equal(spawned.ok,true);
    const turret=spawned.envelope.state.pieces.find(piece=>piece.officialUnitRecordKey==='army_units:infested_missile_turret');
    assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(spawned.envelope.state,turret,'Ocular Overwatch'),false);
    r1Suppressed=true;
    for(const row of starting.envelope.state.log)if(row.events?.some(event=>event.type==='ranged_attack'&&event.pieceId==='enemy'))fired.add(row.round);
  }
  for(let step=0;step<100;step++) {
    const current=await native.store.loadRoom(roomId);
    const state=current.envelope.state;
    if(state.round===3&&state.phase==='start_of_round')break;
    const turret=state.pieces.find(piece=>piece.officialUnitRecordKey==='army_units:infested_missile_turret');
    if(turret&&state.round===1) {
      assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(state,turret,'Ocular Overwatch'),false);r1Suppressed=true;
    }
    if(turret&&state.round===2) {
      assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(state,turret,'Ocular Overwatch'),true);r2Unlocked=true;
    }
    const menu=bound.runtime.enumerate(state,{matchBinding:current.envelope.matchBinding});
    const domains=menu.parameterDomains;
    let domain, candidate, parameters;
    const pendingWatch=state.pendingOfficialAutoTurretOverwatch;
    const pool=domains.find(row=>/precision|pool|armour|casualty|convert|reroll/.test(row.actionType));
    if(pool) {domain=pool;parameters=timingParameters(domain);}
    else if(state.pendingOfficialReactionWindow) {
      domain=domains.find(row=>row.definitionId==='unit:infested_missile_turret/ocular-overwatch-assault-phase@1')
        ||domains.find(row=>row.actionType==='pass_reaction_family_window');
      if(domain)parameters=timingParameters(domain);
    } else if(pendingWatch?.stage==='attack') {
      domain=domains.find(row=>row.pieceId===pendingWatch.sourcePieceId&&row.actionType==='ranged_attack');
      if(domain)parameters={targetUnitId:pendingWatch.targetPieceId};
    } else {
      candidate=menu.candidates.find(row=>row.actionType==='choose_first_actor'
        &&row.sourceAction.chosenFirstActorSideKey===(state.phase==='assault'?'player2':'player1'));
      if(!candidate&&state.round===1&&state.phase==='movement'&&!turret) {
        domain=domains.find(row=>row.definitionId==='card:stukov_s_forces/hostile-incubation-any@1');
        if(domain) { const schema=domain.sourceDomain?.parameterSchema||domain.parameterSchema;
          parameters={...timingParameters({parameterSchema:{...schema,
            required:schema.required.filter(key=>key!=='coordinate')}}),coordinate:{xMilliInches:14500,yMilliInches:10000}}; }
      }
      if(!candidate&&!domain) {
        domain=domains.find(row=>row.actionType==='finish_activation');
        if(domain)parameters={};
      }
      if(!candidate&&!domain&&state.phase==='assault'&&!fired.has(state.round)) {
        domain=domains.find(row=>row.pieceId==='enemy'&&row.weaponName==='Railguns'&&row.actionType==='ranged_attack');
        if(domain) {parameters={targetUnitId:'actor'};fired.add(state.round);}
      }
      if(!candidate&&!domain)candidate=menu.candidates.find(row=>/pass/.test(row.actionType))||menu.candidates[0];
    }
    assert.ok(domain||candidate,'ROUND_SUCCESSOR_MISSING:'+JSON.stringify({round:state.round,phase:state.phase,menu}));
    const choice=domain||candidate;
    const sideKey=choice.sideKey||state.activeSideKey||state.firstPlayerSideKey;
    const committed=await native.commit({roomId,credential:credentials[sideKey],operationKey:'round-step-'+current.stateRevision,
      ...(domain?{select:row=>row.domainId===domain.domainId,parameters:()=>parameters}
        :{kind:'finite',select:row=>row.action?.actionType===candidate.actionType
          &&(candidate.actionType!=='choose_first_actor'||row.action.sourceAction?.chosenFirstActorSideKey===candidate.sourceAction.chosenFirstActorSideKey)})});
    assert.equal(committed.idempotentReplayVerified,true);
    const after=await native.store.loadRoom(roomId);
    trace.push({revision:after.stateRevision,round:state.round,phase:state.phase,sideKey,actionType:choice.actionType,
      definitionId:choice.definitionId||null,stateHash:after.envelope.stateHash,
      nextRound:after.envelope.state.round,nextPhase:after.envelope.state.phase});
    await atomicWrite(path.join(directory,'round-trace.json'),JSON.stringify(trace,null,2)+'\n');
    console.log(JSON.stringify(trace.at(-1)));
  }
  expected=await native.store.loadRoom(roomId);
  const state=expected.envelope.state;
  assert.equal(state.round,3);assert.equal(state.phase,'start_of_round');
  assert.ok(r1Suppressed&&r2Unlocked);
  assert.equal(state.officialMissionRuntimeState.scoringHistory.length,2);
  assert.equal(state.officialOcularOverwatchHistory.filter(row=>row.outcome==='ranged_attack_completed').length,1);
  assert.equal(state.pieces.filter(piece=>piece.officialUnitRecordKey==='army_units:infested_missile_turret').length,1);
} finally {native.close();}
native=bound.open();
try {
  await native.restoreDependencies(roomId,bound.authority);
  const bundle=await native.store.loadReplayBundle(roomId);
  const journal=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
  assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  assert.deepEqual((await native.store.loadRoom(roomId)).envelope,expected.envelope);
} finally {native.close();}
const result={schema:'starcraft_tmg_wave4_turret_round_verification_v1',status:'passed_conditional_geometry',
  runRef:path.relative(root,directory),roomId,signedActions:expected.stateRevision,trace,
  nativeCompletedRounds:2,missionScoresSettled:true,cleanupAndInitiativeVerified:true,
  r1Suppressed,r2Unlocked,ocularAttackCompletedInRound2:true,idempotencyVerified:true,coldReplay:true,
  estimatedRoundBaseMillimetres:80,officialPhysicalAuthority:false,sourceHeldDefinitions:39,
  fullMatchAdmission:false,webAcceptance:false,wave3PlayerRoomsTouched:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/turret-round.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,runRef:result.runRef,signedActions:result.signedActions,completedRounds:2}));
