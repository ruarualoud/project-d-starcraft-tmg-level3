import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {createWave4DetonationConsumeScene} from './support/wave4-detonation-consume-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV3(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),directory=resume?path.resolve(root,resume)
  :await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/consume-dark-swarm-'));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/consume-dark-swarm-')));
console.log(JSON.stringify({directoryRef:path.relative(root,directory)}));
const results=[];
for(const {unitKey,self}of [{unitKey:'infested_marine',self:false},{unitKey:'infested_trooper',self:false},{unitKey:'infested_marine',self:true}]){
  const id=unitKey+(self?'-self-source':'-target'),roomId='wave4-consume-dark-'+id,caseDirectory=path.join(directory,id);
  const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){assert.equal(saved.coldReplay,true);results.push(saved);continue;}
  const scene=await createWave4DetonationConsumeScene(inputs,{root,unitKey,kind:'dark_swarm'}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
  let native=bound.open(),expected,originalEffect;const trace=[];
  try{
    const credentials=await native.create(roomId,bound.authority);
    if(resume){const b=await native.store.loadReplayBundle(roomId);for(const r of b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt))
      trace.push({revision:r.postStateRevision,actionType:r.action.actionType,restoredFromSignedJournal:true});}
    for(let step=0;step<100;step++){
      const head=await native.store.loadRoom(roomId),s=head.envelope.state,events=s.log.flatMap(l=>l.events||[]);
      if(s.round===2&&s.phase==='movement')break;
      const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
      const gestated=s.board.tokens.some(t=>t.createdByPieceId==='defiler');
      if(s.phase==='movement'&&!gestated){d=menu.parameterDomains.find(d=>d.actionType==='set_dark_swarm'&&d.pieceId==='defiler');if(d)p=scene.gestateParameters;}
      const declared=events.some(e=>/attack.*declared|reaction_window_opened/.test(e.type)&&e.triggerKind==='attack_target_selected')
        ||s.pendingOfficialAttackTargetReaction||s.officialConsumePaymentHistory?.length;
      if(!d&&s.phase==='assault'&&!declared){d=menu.parameterDomains.find(d=>d.actionType==='ranged_attack'&&d.pieceId==='shooter'&&d.weaponName==='Autocannon');
        if(d)p={targetUnitId:'victim'};}
      if(!d&&s.pendingOfficialReactionWindow){
        if(s.pendingOfficialReactionWindow.triggerKind==='attack_target_selected')d=menu.parameterDomains.find(d=>d.definitionId==='unit:defiler/dark-swarm-assault-phase@1'
          &&(()=>{let r=d;while(r.sourceDomain)r=r.sourceDomain;const schema=r.parameterSchema;return schema.sacrificePieceId?.const===(self?'defiler':'victim');})());
        d||=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
      }
      if(!d&&s.pendingOfficialAutomaticHits)d=menu.parameterDomains[0];
      const chosen=s.phase==='assault'?'player2':'player1';
      if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey===chosen);
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
      if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
      if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'DARK_SWARM_CONSUME_SUCCESSOR_REQUIRED');
      if(d&&!p)p=timingParameters(d);
      const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+head.stateRevision,
        ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p}:{kind:'finite',select:r=>r.action.actionType===c.actionType
          &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey===chosen)})});
      assert.equal(result.idempotentReplayVerified,true);
      trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,definitionId:d?.definitionId||null});
      console.log(JSON.stringify({id,...trace.at(-1)}));
    }
    expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]);
    assert.equal(s.round,2);assert.equal(s.phase,'movement');assert.equal(s.officialConsumePaymentHistory.length,1);
    assert.equal(events.filter(e=>e.type==='consume_model_removed').length,1);
    const payment=s.officialConsumePaymentHistory[0];assert.equal(payment.generatedFromModel,1);assert.equal(payment.retainedAfterPayment,0);
    assert.equal(payment.sacrificePieceId,self?'defiler':'victim');assert.equal(payment.unitDestroyed,true);
    assert.equal((s.officialReactionHistory||[]).filter(r=>r.definitionId.includes('/detonation-')).length,0);
    const reaction=s.officialReactionHistory.filter(r=>r.definitionId==='unit:defiler/dark-swarm-assault-phase@1');assert.equal(reaction.length,1);
    originalEffect=s.officialReactionResolutionHistory.flatMap(r=>r.effects).find(e=>e.effectHash===reaction[0].effectHash);
    assert.equal(originalEffect.consumePaymentReceiptHash,payment.paymentReceiptHash);assert.ok(originalEffect.darkSwarmFacts);
    assert.ok(!s.pendingOfficialReactionWindow&&!s.pendingOfficialAttackTargetReaction&&!s.pendingOfficialConsumePayment&&!s.pendingOfficialPaidPlague);
    assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
    if(self){assert.equal(s.pieces.find(p=>p.id==='defiler').isDestroyed,true);assert.equal(s.board.tokens.filter(t=>t.createdByPieceId==='defiler').length,0);
      const attacks=events.filter(e=>e.type==='ranged_attack'&&e.pieceId==='shooter'&&e.targetId==='victim');assert.ok(attacks.length);
      assert.ok(attacks.some(e=>e.stages?.evade?.eligible&&e.stages.evade.dice>0),'PAID_DARK_SWARM_EVADE_REQUIRED');}
    else assert.equal(s.pieces.find(p=>p.id==='victim').isDestroyed,true);
    const losses=events.filter(e=>e.type==='supply_loss_recorded'&&e.round===1);assert.equal(losses.length,new Set(losses.map(e=>e.entryHash)).size);
    for(const initial of scene.state.pieces)assert.equal(losses.filter(e=>e.unitId===initial.id).reduce((n,e)=>n+e.supplyDelta,0),initial.currentSupply-s.pieces.find(p=>p.id===initial.id).currentSupply);
  }finally{native.close();}
  native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal
    .filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  }finally{native.close();}
  const result={id,unitKey,self,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
    trace,originalEffect,fullNativeRound:true,actualGestate:true,reactionQuotaReservedBeforeCasualty:true,paymentExactlyOnce:true,
    originalAttackSuccessorVerified:true,supplyExactlyOnce:true,idempotencyVerified:true,coldReplay:true};
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));results.push(result);
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/consume-dark-swarm.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_consume_dark_swarm_v1',
  status:'passed_scoped',directoryRef:path.relative(root,directory),results,modelCalls:0,sourceHeldDefinitions:39,fullMatchAdmission:false,trainingTruth:false},null,2));
console.log(JSON.stringify({status:'passed_scoped',nativeCases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0)}));
