import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {createWave4DetonationConsumeScene} from './support/wave4-detonation-consume-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {queryOfficialConsumePaymentOptionsV1} from '../packages/product-composition/official-consume-payment-facts-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV3(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),directory=resume?path.resolve(root,resume)
  :await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-consume-'));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-consume-')));
console.log(JSON.stringify({directoryRef:path.relative(root,directory)}));
const results=[],controls=[];
function parameters(s,d){let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;const schema=raw.parameterSchema;
  if(d.actionType==='fight'&&Number.isSafeInteger(raw.constraints?.declineCloseRanksAttackDice)){
    const target=raw.constraints.targetUnitIds[0],props=schema.properties;
    const effectTarget=k=>props[k].enum.includes(target)?target:props[k].enum[0];
    return{closeRanksMode:'decline',allocations:[{targetUnitId:target,dice:raw.constraints.declineCloseRanksAttackDice}],
      surgeTargetUnitId:effectTarget('surgeTargetUnitId'),criticalTargetUnitId:effectTarget('criticalTargetUnitId')};
  }
  if(schema.required.includes('casualtyModelIds')){
    const p=s.pendingOfficialAutomaticHits||s.pendingAction,c=p.casualtyDomain.selectionContract,ids=[];
    while(ids.length<c.casualtyCount){const n=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:c,casualtyModelIds:ids,complete:false});
      assert.ok(n.valid&&n.legalNextModelIds.length);ids.push(n.legalNextModelIds[0]);}return{casualtyModelIds:ids};
  }
  return timingParameters(d);
}
const selectedGroup=process.argv.find(a=>a.startsWith('--group='))?.slice(8);
assert.ok(!selectedGroup||['marine-use','trooper-use','other'].includes(selectedGroup));
const cases=['infested_marine','infested_trooper'].flatMap(unitKey=>[
  {unitKey,cost:2,use:true},{unitKey,cost:2,use:false},{unitKey,cost:3,use:true}]);
caseLoop:for(const {unitKey,cost,use}of cases.filter(c=>{
  if(!selectedGroup)return true;
  if(selectedGroup==='other')return !(c.use&&c.cost===2);
  return c.use&&c.cost===2&&c.unitKey===(selectedGroup==='marine-use'?'infested_marine':'infested_trooper');
})){
 for(let attempt=0;attempt<(use&&cost===2?16:1);attempt++){
  const id=unitKey+'-plague-'+cost+'-'+(use?'use':'decline')+(attempt?'-attempt'+attempt:''),roomId='wave4-consume-'+id,caseDirectory=path.join(directory,id);
  const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){assert.equal(saved.coldReplay,true);if(saved.status==='control'){controls.push(saved);continue;}results.push(saved);continue caseLoop;}
  const scene=await createWave4DetonationConsumeScene(inputs,{root,unitKey,cost,variant:attempt}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
  let native=bound.open(),expected;const trace=[];let frames=[],castVerified=false,reservedVerified=false,sourceKilledByDetonation=false;
  try{
    const credentials=await native.create(roomId,bound.authority);
    if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
      for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,restoredFromSignedJournal:true});
        if(r.action.actionType==='cast_plague')castVerified=true;
        if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){
          const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);
          for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])if(!frames.some(x=>x.continuationId===f.continuationId))frames.push(f);
          if(frames.some(f=>f.hostKind==='consume_payment'))reservedVerified=true;
        }}
    }
    for(let step=0;step<100;step++){
      const head=await native.store.loadRoom(roomId),s=head.envelope.state,events=s.log.flatMap(l=>l.events||[]);
      if(s.round===2&&s.phase==='movement')break;
      if(use&&cost===2&&s.officialPlagueUseHistory?.length&&!s.officialPlagueUseHistory[0].sourceDestroyedByPayment)break;
      for(const f of s.officialBeforeCasualtyContinuations||[]){
        if(!frames.some(x=>x.continuationId===f.continuationId))frames.push(f);
        if(f.hostKind==='consume_payment'){
          const cp=f.suspendedHostSlots.pendingOfficialConsumePayment;
          assert.ok(cp.plan.cardPayment.selectedCardsExhaustOnCommit.every(id=>s.cardResources.player1.find(c=>c.cardInstanceId===id).readiness==='exhausted'));
          assert.ok(s.pieces.find(p=>p.id==='victim').models.find(m=>m.id===cp.plan.sacrificeModelId).isOnField);
          assert.ok(!s.officialConsumePaymentHistory?.length);reservedVerified=true;
        }
      }
      const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
      if(!castVerified&&s.phase==='assault'){
        d=menu.parameterDomains.find(d=>{
          let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;
          return d.actionType==='cast_plague'&&d.pieceId==='defiler'&&raw.parameterSchema.biomassToSpend.const===cost
            &&raw.parameterSchema.sacrificePieceId?.const==='victim'&&raw.parameterSchema.paymentCardInstanceIds.const.length===cost-1;
        });
        if(d){
          const quote=queryOfficialConsumePaymentOptionsV1({source:s.officialConsumePaymentSourceBundle,state:s,
            request:{queryKind:'consume_payment_options',sourcePieceId:'defiler',
            abilityDefinitionId:'unit:defiler/plague-assault-phase@1',biomassToSpend:cost}});
          const victim=quote.sacrifices.find(v=>v.pieceId==='victim');assert.ok(victim);
          let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;
          p={...scene.plagueParameters,paymentCardInstanceIds:raw.parameterSchema.paymentCardInstanceIds.const,
            sacrificePieceId:raw.parameterSchema.sacrificePieceId.const,sacrificeModelId:raw.parameterSchema.sacrificeModelId.enum[0]};
          const before=structuredClone(s),a=bound.runtime.instantiate(s,d,p).action;
          assert.equal(a.chance??null,null);assert.deepEqual(s,before);
        }
      }
      if(!d&&s.pendingOfficialReactionWindow)d=(use&&cost===2?menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation'):null)
        ||menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
      if(!d&&s.pendingOfficialAutomaticHits)d=menu.parameterDomains[0];
      if(!d)c=menu.candidates.find(c=>c.actionType==='resolve_paid_plague');
      if(!d&&!c)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey==='player1');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
      if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
      if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'CONSUME_NATIVE_SUCCESSOR_REQUIRED');
      const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+head.stateRevision,
        ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType
          &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey==='player1')})});
      assert.equal(result.idempotentReplayVerified,true);if((d||c).actionType==='cast_plague')castVerified=true;
      trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,
        definitionId:d?.definitionId||null,stackDepth:s.officialBeforeCasualtyContinuations?.length||0});console.log(JSON.stringify({id,...trace.at(-1)}));
    }
    expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]);
    const armourControl=use&&cost===2&&s.officialPlagueUseHistory?.length&&!s.officialPlagueUseHistory[0].sourceDestroyedByPayment;
    if(!armourControl){assert.equal(s.round,2);assert.equal(s.phase,'movement');}assert.ok(castVerified);
    assert.equal(s.officialConsumePaymentHistory.length,1);assert.equal(s.officialPlagueUseHistory.length,1);
    assert.equal(events.filter(e=>e.type==='consume_model_removed').length,1);assert.equal(events.filter(e=>e.type==='plague_complete').length,1);
    const victim=s.pieces.find(p=>p.id==='victim'),caster=s.pieces.find(p=>p.id==='defiler'),history=s.officialPlagueUseHistory[0];
    assert.equal(victim.isDestroyed,true);assert.equal(victim.currentSupply,0);assert.equal(history.biomassToSpend,cost);
    assert.equal(history.consumePaymentReceiptHash,s.officialConsumePaymentHistory[0].paymentReceiptHash);
    assert.ok(history.resolutions.some(r=>r.targetPieceId==='target'&&r.dice>=3));
    assert.ok(history.resolutions.every(r=>r.nonLethal.casualtyModelIds?.length!==1));
    if(use&&cost===2){assert.ok(reservedVerified&&frames.some(f=>f.hostKind==='consume_payment'));
      sourceKilledByDetonation=history.sourceDestroyedByPayment&&s.log.filter(l=>l.phase==='assault').some(l=>(l.events||[]).some(e=>
        e.type==='automatic_hits_damage'&&e.targetId==='defiler'&&e.casualtyModelIds.includes('defiler-model-1')&&e.sourceDefinitionId.includes('/detonation-')));
      if(sourceKilledByDetonation){assert.ok(frames.filter(f=>f.phase==='assault').length>=2);assert.equal(caster.isDestroyed,true);assert.equal(s.pieces.find(p=>p.id==='enemy').isDestroyed,true);}
    }else{assert.equal(caster.isDestroyed,false);assert.equal((s.officialReactionHistory||[]).filter(r=>r.definitionId.includes('/detonation-')).length,0);}
    assert.ok(!s.pendingOfficialConsumePayment&&!s.pendingOfficialPaidPlague&&!s.pendingOfficialAutomaticHits&&!s.pendingOfficialReactionWindow
      &&!s.officialBeforeCasualtyContinuations?.length&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
    assert.equal(s.officialMissionRuntimeState.scoringHistory.length,s.round===2?1:0);
    const losses=events.filter(e=>e.type==='supply_loss_recorded'&&e.round===1);assert.equal(losses.length,new Set(losses.map(e=>e.entryHash)).size);
    for(const initial of scene.state.pieces)assert.equal(losses.filter(e=>e.unitId===initial.id).reduce((n,e)=>n+e.supplyDelta,0),initial.currentSupply-s.pieces.find(p=>p.id===initial.id).currentSupply);
  }finally{native.close();}
  native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal
    .filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  }finally{native.close();}
  const status=use&&cost===2&&!sourceKilledByDetonation?'control':'passed_scoped';
  const result={id,unitKey,cost,use,attempt,engineeringTranslationInches:attempt/100,status,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
    trace,frames,fullNativeRound:expected.envelope.state.round===2,paymentBeforeFutureDice:true,casterDeathVerified:sourceKilledByDetonation,reservedCardsVerified:cost===3||reservedVerified,
    supplyExactlyOnce:true,idempotencyVerified:true,coldReplay:true};
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
  if(status==='control'){controls.push(result);console.log(JSON.stringify({id,status,reason:'actual armour saved; independent room retained without reroll'}));continue;}
  results.push(result);continue caseLoop;
 }
 assert.fail('CONSUME_CASTER_DEATH_BRANCH_NOT_YET_VERIFIED');
}
await atomicWrite(selectedGroup?path.join(directory,'partial-'+selectedGroup+'.public.json'):path.join(root,'docs/development/wave4/evidence/detonation-consume.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_consume_v1',
  status:'passed_scoped',directoryRef:path.relative(root,directory),results,controls,modelCalls:0,sourceHeldDefinitions:39,fullMatchAdmission:false,trainingTruth:false},null,2));
console.log(JSON.stringify({status:'passed_scoped',nativeCases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0)}));
