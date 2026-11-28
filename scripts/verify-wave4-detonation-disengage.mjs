import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {createWave4DetonationDisengageScene} from './support/wave4-detonation-disengage-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV3(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),directory=resume?path.resolve(root,resume)
  :await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-disengage-'));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-disengage-')));
console.log(JSON.stringify({directoryRef:path.relative(root,directory)}));
const results=[];
function parameters(s,d){let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
  if(d.actionType==='fight'&&Number.isSafeInteger(raw.constraints?.declineCloseRanksAttackDice)){const target=raw.constraints.targetUnitIds[0],props=raw.parameterSchema.properties;
    const effectTarget=k=>props[k].enum.includes(target)?target:props[k].enum[0];
    return{closeRanksMode:'decline',allocations:[{targetUnitId:target,dice:raw.constraints.declineCloseRanksAttackDice}],surgeTargetUnitId:effectTarget('surgeTargetUnitId'),criticalTargetUnitId:effectTarget('criticalTargetUnitId')};}
  if(schema.required.includes('casualtyModelIds')){const p=s.pendingOfficialAutomaticHits||s.pendingAction,c=p.casualtyDomain.selectionContract,ids=[];
    while(ids.length<c.casualtyCount){const next=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:c,casualtyModelIds:ids,complete:false});
      assert.ok(next.valid&&next.legalNextModelIds.length);ids.push(next.legalNextModelIds[0]);}return{casualtyModelIds:ids};}
  return timingParameters(d);
}
for(const unitKey of ['infested_trooper','infested_marine'])for(const kind of ['leading','other','last'])for(const use of [true,false]){
  const id=unitKey+'-'+kind+'-'+(use?'use':'decline'),caseDirectory=path.join(directory,id),roomId='wave4-disengage-'+id;
  const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){assert.equal(saved.coldReplay,true);results.push(saved);continue;}
  const scene=createWave4DetonationDisengageScene(inputs,{kind,unitKey}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
  let native=bound.open(),expected,frame,originalPlan;const trace=[];
  try{
    const credentials=await native.create(roomId,bound.authority);
    if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
      for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,restoredFromSignedJournal:true});
        if(r.events.some(e=>e.type==='before_casualty_batch_interrupted')){const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);
          const f=replay.envelope.state.officialBeforeCasualtyContinuations?.find(f=>f.hostKind==='direct_removal');if(f){frame=f;originalPlan=f.originalAction.spatialPlan;}}
      }
    }
    for(let step=0;step<100;step++){
      const head=await native.store.loadRoom(roomId),s=head.envelope.state,events=s.log.flatMap(l=>l.events||[]);
      if(s.round===2&&s.phase==='movement')break;
      for(const f of s.officialBeforeCasualtyContinuations||[])if(f.hostKind==='direct_removal'){
        frame=f;originalPlan=f.originalAction.spatialPlan;
        assert.equal(f.hostData.owner,'disengage');assert.equal(f.activationContext.activeSideKey,'player1');
        assert.equal(typeof f.activationContext.activationId,'string');
        assert.ok(f.rows[0].casualty.casualtyModelIds.every(id=>s.pieces.find(p=>p.id==='actor').models.some(m=>m.id===id&&m.isOnField&&!m.isDestroyed)));
      }
      const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
      if(!events.some(e=>e.type==='unit_disengage_resolved')&&!s.officialBeforeCasualtyContinuations?.length&&!s.pendingOfficialReactionWindow&&!s.pendingOfficialAutomaticHits){
        d=menu.parameterDomains.find(d=>d.actionType==='disengage'&&d.pieceId==='actor');if(d)p=scene.disengageParameters;
      }
      if(!d&&s.pendingOfficialReactionWindow)d=(use&&s.officialBeforeCasualtyContinuations?.some(f=>f.hostKind==='direct_removal')?menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation'):null)
        ||menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
      if(!d&&s.pendingOfficialAutomaticHits)d=menu.parameterDomains[0];
      if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey==='player1');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
      if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
      if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'DISENGAGE_NATIVE_SUCCESSOR_REQUIRED');
      const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],operationKey:'step-'+head.stateRevision,
        ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType
          &&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey==='player1')})});
      assert.equal(result.idempotentReplayVerified,true);
      trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType:(d||c).actionType,
        definitionId:d?.definitionId||null,stackDepth:s.officialBeforeCasualtyContinuations?.length||0});
      console.log(JSON.stringify({id,...trace.at(-1)}));
    }
    expected=await native.store.loadRoom(roomId);const s=expected.envelope.state,events=s.log.flatMap(l=>l.events||[]);
    assert.equal(s.round,2);assert.equal(s.phase,'movement');assert.ok(frame);
    const original=events.filter(e=>e.type==='unit_disengage_resolved');assert.equal(original.length,1);
    assert.deepEqual(original[0].casualtyModelIds,frame.rows[0].casualty.casualtyModelIds);
    assert.equal(original[0].leadingFailure,kind!=='other');assert.equal(original[0].unitMoved,kind==='other');
    const removed=new Set(original[0].casualtyModelIds),actor=s.pieces.find(p=>p.id==='actor');
    assert.ok([...removed].every(id=>actor.models.find(m=>m.id===id).isDestroyed));
    if(kind!=='other')for(const m of scene.state.pieces.find(p=>p.id==='actor').models.filter(m=>!m.isDestroyed)){
      const now=actor.models.find(n=>n.id===m.id);assert.equal(now.xInches,m.xInches);assert.equal(now.yInches,m.yInches);
    }
    if(kind==='last'){assert.equal(actor.isDestroyed,true);assert.equal(actor.currentModels,0);assert.equal(actor.currentSupply,0);
      assert.equal(s.unitDestructionLifecycleHistory.filter(r=>r.schema==='starcraft_tmg_disengage_destruction_v1'&&r.pieceId==='actor').length,1);
      const ownLoss=events.filter(e=>e.type==='supply_loss_recorded'&&e.unitId==='actor'&&e.round===1);assert.equal(ownLoss.length,unitKey==='infested_marine'?1:0);
      if(ownLoss.length)assert.equal(ownLoss[0].supplyDelta,1);}
    assert.ok(originalPlan.removal.endpointProofs.every(p=>p.endpointSupersetEmpty));
    assert.equal(originalPlan.removal.endpointProofs.length,kind!=='other'?1:2);
    assert.ok(!s.pendingOfficialAutomaticHits&&!s.pendingOfficialReactionWindow&&!s.officialBeforeCasualtyContinuations?.length
      &&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
    assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
    assert.equal((s.officialReactionHistory||[]).filter(r=>r.definitionId==='unit:'+unitKey+'/detonation-any-phase@1').length,use?1:0);
    const losses=events.filter(e=>e.type==='supply_loss_recorded'&&e.round===1);
    assert.equal(losses.length,new Set(losses.map(e=>e.entryHash)).size);
    for(const initial of scene.state.pieces)assert.equal(losses.filter(e=>e.unitId===initial.id).reduce((n,e)=>n+e.supplyDelta,0),initial.currentSupply-s.pieces.find(p=>p.id===initial.id).currentSupply);
  }finally{native.close();}
  native=bound.open();try{
    await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
    const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  }finally{native.close();}
  const result={id,unitKey,kind,use,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,
    trace,frames:[{hostKind:frame.hostKind,rows:frame.rows,activationContext:frame.activationContext}],
    originalPlanHash:originalPlan.spatialPlanHash,endpointProofs:originalPlan.removal.endpointProofs,
    declaredInitialPriorAttrition:unitKey==='infested_marine'||kind==='last',originalRemovalOrderPreserved:true,fullNativeRound:true,
    supplyExactlyOnce:true,idempotencyVerified:true,coldReplay:true};
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));results.push(result);
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-disengage.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_detonation_disengage_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
  newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
