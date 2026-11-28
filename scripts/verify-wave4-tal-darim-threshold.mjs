import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4TalDarimThresholdInputs} from './compile-wave4-tal-darim-threshold.mjs';
import {createWave4TalDarimThresholdScene} from './support/wave4-tal-darim-threshold-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {projectOfficialFriendlyLostSupplyV1} from '../packages/rule-atoms/official-friendly-lost-supply-threshold-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4TalDarimThresholdInputs(root),
  group=process.argv.find(a=>a.startsWith('--group='))?.slice(8),resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),
  directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/tal-darim/threshold-'));
assert.ok(!group||['static','melee','dynamic'].includes(group));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/tal-darim/threshold-')));
console.log(JSON.stringify({directoryRef:path.relative(root,directory)}));
const raw=d=>{while(d.sourceDomain)d=d.sourceDomain;return d;},nativeAction=a=>{while(a.sourceAction||a.attackAction)a=a.sourceAction||a.attackAction;return a;};
function parameters(d){
  d=raw(d);
  if(d.actionType==='fight'&&Number.isSafeInteger(d.constraints?.declineCloseRanksAttackDice)){
    const target=d.constraints.targetUnitIds[0],props=d.parameterSchema.properties,
      effectTarget=k=>props[k].enum.includes(target)?target:props[k].enum[0];
    return{closeRanksMode:'decline',allocations:[{targetUnitId:target,dice:d.constraints.declineCloseRanksAttackDice}],
      surgeTargetUnitId:effectTarget('surgeTargetUnitId'),criticalTargetUnitId:effectTarget('criticalTargetUnitId')};
  }
  return timingParameters(d);
}
const cases=[...[3,4,5,6].map(lostSupply=>({lostSupply,kind:'ranged',group:'static'})),
  {lostSupply:6,kind:'melee',group:'melee'},...[3,5].map(lostSupply=>({lostSupply,kind:'ranged',dynamic:true,group:'dynamic'}))],results=[],controls=[];
caseLoop:for(const spec of cases.filter(s=>!group||s.group===group))for(let attempt=0;attempt<(spec.dynamic?12:1);attempt++){
  const id=(spec.dynamic?'dynamic-':'')+spec.kind+'-'+spec.lostSupply+(attempt?'-attempt'+attempt:''),roomId='wave4-tal-threshold-'+id,
    caseDirectory=path.join(directory,id),saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse)
      .catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){assert.ok(saved.coldReplay);if(saved.status==='control'){controls.push(saved);continue;}results.push(saved);continue caseLoop;}
  const scene=createWave4TalDarimThresholdScene(inputs,{...spec,variant:attempt}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
  let native=bound.open(),expected,attacked=false,enemyShot=false,attackProof=null,dynamicProof=null,roundResetProof=null;const trace=[];
  const quote=(state,weaponName)=>{
    const before=hash(state),q=bound.runtime.queryWeaponCharacteristics(state,'actor',
      {attackerPieceId:'actor',targetPieceId:spec.dynamic?'target':'enemy',weaponName,attackKind:weaponName==='Stomp'?'close_combat':'ranged'});
    assert.equal(q.mutationAuthority,false);assert.equal(hash(state),before);return q.result;
  };
  try{
    const credentials=await native.create(roomId,bound.authority);
    if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
      for(const r of journal){const a=nativeAction(r.action);trace.push({revision:r.postStateRevision,actionType:r.action.actionType,restoredFromSignedJournal:true});
        if(a.pieceId==='actor'&&['ranged_attack','fight'].includes(a.actionType)){attacked=true;const plan=a.rangedPlan||a.meleePlan?.fightChancePlan;
          attackProof={precision:plan.activePrecisionValue,criticalHit:a.rangedPlan?.activeCriticalHitValue||plan.criticalHitPlan?.maximumBypassArmourDice||0};}
        if(a.pieceId==='enemy'&&a.actionType==='ranged_attack')enemyShot=true;
      }
    }
    for(let step=0;step<90;step++){
      const head=await native.store.loadRoom(roomId),s=head.envelope.state;
      if(spec.dynamic&&s.log.flatMap(l=>l.events||[]).some(e=>e.type==='ranged_attack'&&e.pieceId==='enemy'&&e.targetId===scene.lossVictim)){
        const actual=projectOfficialFriendlyLostSupplyV1({state:s,sideKey:'player1'}).totalLostSupply,
          same=quote(s,'Particle Disruptors'),other=quote(s,'Stomp');
        if(s.round===1){
          assert.equal(same.precision,actual>=4?1:0);assert.equal(same.criticalHit,actual>=6?1:0);
          assert.equal(other.precision,0);assert.equal(other.criticalHit,0);
          assert.equal(s.pieces.find(p=>p.id==='actor').officialTalDarimFirstWeapon.weaponName,'particle disruptors');
          dynamicProof={actualLostSupply:actual,thresholdCrossed:actual===spec.lostSupply+1,sameWeapon: same.talDarimThresholds,
            otherWeapon:other.talDarimThresholds,firstWeaponRecordedBeforeThresholdGain:true};
        }
      }
      if(s.round===2&&s.phase==='movement'){
        if(spec.dynamic){const q=quote(s,'Stomp'),actual=projectOfficialFriendlyLostSupplyV1({state:s,sideKey:'player1'}).totalLostSupply;
          assert.equal(q.precision,actual>=4?1:0);assert.equal(q.criticalHit,actual>=6?1:0);
          roundResetProof={round:2,oldBindingInactive:true,newFirstWeaponName:q.talDarimThresholds.firstWeaponName};}
        break;
      }
      const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
      if(!attacked&&s.phase===(spec.kind==='ranged'?'assault':'combat')){
        d=menu.parameterDomains.find(d=>d.pieceId==='actor'&&d.actionType===(spec.kind==='ranged'?'ranged_attack':'fight'));
        if(d){p=spec.kind==='ranged'?{targetUnitId:spec.dynamic?'target':'enemy'}:parameters(d);
          const a=nativeAction(bound.runtime.instantiate(s,d,p).action),plan=a.rangedPlan||a.meleePlan.fightChancePlan;
          attackProof={precision:plan.activePrecisionValue,criticalHit:a.rangedPlan?.activeCriticalHitValue||plan.criticalHitPlan?.maximumBypassArmourDice||0};
          assert.equal(attackProof.precision,spec.lostSupply>=4?1:0);assert.equal(attackProof.criticalHit,spec.lostSupply>=6?1:0);
        }
      }
      if(!d&&spec.dynamic&&attacked&&!enemyShot&&s.phase==='assault'){
        d=menu.parameterDomains.find(d=>d.pieceId==='enemy'&&d.actionType==='ranged_attack'&&raw(d).weaponName==='Autocannon');
        if(d)p={targetUnitId:scene.lossVictim};
      }
      if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey==='player1');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.parameterKind?.includes('casualty'));
      if(!d&&!c)c=menu.candidates.find(c=>c.actionType==='finish_ranged_attack_sequence');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
      if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
      if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'TAL_DARIM_NATIVE_SUCCESSOR_REQUIRED');
      const actionType=(d||c).actionType,result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],
        operationKey:'step-'+head.stateRevision,...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parameters(d)}
          :{kind:'finite',select:r=>r.action.actionType===c.actionType&&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey==='player1')})});
      assert.equal(result.idempotentReplayVerified,true);
      if(d?.pieceId==='actor'&&['ranged_attack','fight'].includes(actionType))attacked=true;
      if(d?.pieceId==='enemy'&&actionType==='ranged_attack'&&raw(d).weaponName==='Autocannon')enemyShot=true;
      trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType,pieceId:(d||c).pieceId||null});
      console.log(JSON.stringify({id,...trace.at(-1)}));
    }
    expected=await native.store.loadRoom(roomId);const s=expected.envelope.state;
    assert.ok(attacked&&attackProof);assert.equal(s.round,2);assert.equal(s.phase,'movement');
    assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);assert.ok(!s.pendingAction&&!s.pendingCurrentProductRangedSequence&&!s.selectedRosterActivationWindow);
    if(spec.dynamic)assert.ok(enemyShot&&dynamicProof&&roundResetProof);
    if(!spec.dynamic&&spec.lostSupply===3){const initial=projectOfficialFriendlyLostSupplyV1({state:scene.state,sideKey:'player1'});
      assert.ok(initial.units.some(u=>u.inReserves&&u.lostSupply===1));assert.ok(initial.units.some(u=>u.destroyed&&u.lostSupply===2));}
  }finally{native.close();}
  native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),
    journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  }finally{native.close();}
  const result={...spec,id,attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,
    stateHash:expected.envelope.stateHash,status:spec.dynamic&&!dynamicProof.thresholdCrossed?'control':'passed_scoped',attackProof,dynamicProof,roundResetProof,trace,
    fullNativeRound:true,idempotencyVerified:true,coldReplay:true,fullMatchAdmission:false};
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2)+'\n');
  if(result.status==='control'){controls.push(result);continue;}results.push(result);continue caseLoop;
}
assert.equal(results.length,cases.filter(s=>!group||s.group===group).length,'TAL_DARIM_ALL_REQUIRED_CASES_MUST_QUALIFY');
await atomicWrite(group?path.join(directory,'partial-'+group+'.public.json'):path.join(root,'docs/development/wave4/evidence/tal-darim-threshold.public.json'),
  JSON.stringify({schema:'starcraft_tmg_wave4_tal_darim_threshold_v1',status:'passed_scoped',directoryRef:path.relative(root,directory),results,controls,
    implementedCumulativeAtoms:6,newCompleteAtoms:0,sourceHeldDefinitions:39,fullFactionAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_scoped',nativeCases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0)}));
