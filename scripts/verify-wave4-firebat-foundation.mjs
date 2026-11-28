import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4FirebatInputs} from './compile-wave4-firebat.mjs';
import {createWave4FirebatScene} from './support/wave4-firebat-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
import {OFFICIAL_FIREBAT_STIMPACK_ID} from '../packages/source-data/official-firebat-source-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4FirebatInputs(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9),
  directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/firebat/foundation-')),results=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/firebat/foundation-')));
const nativeAction=a=>{while(a.sourceAction||a.attackAction)a=a.sourceAction||a.attackAction;return a;};
function parametersFor(d){
  let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;
  if(raw.actionType==='fight'&&Number.isSafeInteger(raw.constraints?.declineCloseRanksAttackDice)){
    const target=raw.constraints.targetUnitIds[0],props=raw.parameterSchema.properties,
      effectTarget=k=>props[k].enum.includes(target)?target:props[k].enum[0];
    return{closeRanksMode:'decline',allocations:[{targetUnitId:target,dice:raw.constraints.declineCloseRanksAttackDice}],
      surgeTargetUnitId:effectTarget('surgeTargetUnitId'),criticalTargetUnitId:effectTarget('criticalTargetUnitId')};
  }
  return timingParameters(raw);
}
const moveParameters=s=>{const p=s.pieces.find(p=>p.id==='firebat'),point=m=>({xMilliInches:Math.round(m.xInches*1000),
  yMilliInches:Math.round(m.yInches*1000)-6500,elevation:'ground',supportTerrainIds:[]});
  return{leadingModelId:p.models[0].id,path:[point(p.models[0])],placements:p.models.slice(1).map(m=>({modelId:m.id,...point(m),rotationDegrees:0}))};};
console.log(JSON.stringify({directoryRef:path.relative(root,directory)}));
for(const spec of [...['ranged','melee'].flatMap(kind=>[true,false].map(stimpack=>({kind,stimpack}))),{kind:'ranged',stimpack:true,movement:true}]){
  const {kind,stimpack,movement=false}=spec;
  const id=movement?'movement-stimpack':kind+'-'+(stimpack?'stimpack':'no-stimpack'),scene=createWave4FirebatScene(inputs,{kind,stimpack}),
    caseDirectory=path.join(directory,id),roomId='wave4-firebat-'+id;
  const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){assert.ok(saved.coldReplay);results.push(saved);continue;}
  const bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
  let native=bound.open(),expected,used=false,attacked=false,moved=false,precision=null,speed=null,damage=null;const trace=[];
  try{
    const credentials=await native.create(roomId,bound.authority);
    if(resume){
      const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
      for(const r of journal){const a=nativeAction(r.action);trace.push({revision:r.postStateRevision,actionType:r.action.actionType,restoredFromSignedJournal:true});
        if(a.definitionId===OFFICIAL_FIREBAT_STIMPACK_ID){used=true;damage=2;speed=3;}
        if(a.pieceId==='firebat'&&a.actionType==='move')moved=true;
        if(a.pieceId==='firebat'&&a.actionType===(kind==='ranged'?'ranged_attack':'fight')){attacked=true;precision=stimpack?3:0;}}
    }
    for(let step=0;step<70;step++){
      const head=await native.store.loadRoom(roomId),s=head.envelope.state;
      if(s.round===2&&s.phase==='movement')break;
      const menu=bound.runtime.enumerate(s,{matchBinding:head.envelope.matchBinding});let d,c,p;
      if(stimpack&&!used&&s.phase==='movement')d=menu.parameterDomains.find(d=>d.definitionId===OFFICIAL_FIREBAT_STIMPACK_ID);
      if(movement&&d?.definitionId===OFFICIAL_FIREBAT_STIMPACK_ID){
        const move=menu.parameterDomains.find(d=>d.pieceId==='firebat'&&d.actionType==='move');let raw=move;while(raw?.sourceDomain)raw=raw.sourceDomain;
        assert.equal(raw.constraints.maxDistanceMilliInches,4000);
        assert.throws(()=>bound.runtime.instantiate(s,move,moveParameters(s)),/SELECTED_SPATIAL_PATH_EXCEEDS_SPEED/);
      }
      if(movement&&used&&!moved&&s.phase==='movement'){
        d=menu.parameterDomains.find(d=>d.pieceId==='firebat'&&d.actionType==='move');assert.ok(d);let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;
        assert.equal(raw.constraints.maxDistanceMilliInches,7000);p=moveParameters(s);
      }
      if(!movement&&!d&&!attacked&&s.phase===(kind==='ranged'?'assault':'combat')){
        d=menu.parameterDomains.find(d=>d.pieceId==='firebat'&&d.actionType===(kind==='ranged'?'ranged_attack':'fight'));
        if(d){
          let raw=d;while(raw.sourceDomain)raw=raw.sourceDomain;
          if(kind==='ranged')p={targetUnitId:'enemy'};
          else{
            const n=raw.constraints?.declineCloseRanksAttackDice,props=raw.parameterSchema.properties,
              effectTarget=k=>props[k].enum.includes('enemy')?'enemy':props[k].enum[0];
            if(Number.isSafeInteger(n))p={closeRanksMode:'decline',allocations:[{targetUnitId:'enemy',dice:n}],
              surgeTargetUnitId:effectTarget('surgeTargetUnitId'),criticalTargetUnitId:effectTarget('criticalTargetUnitId')};
          }
          p??=parametersFor(d);
          const a=nativeAction(bound.runtime.instantiate(s,d,p).action);
          const plan=kind==='ranged'?a.rangedPlan:a.meleePlan?.fightChancePlan;
          precision=plan?.activePrecisionValue;
          assert.equal(precision,stimpack?3:0,'FIREBAT_PRECISION_ACTUAL_WEAPON_REQUIRED');
        }
      }
      if(!d)c=menu.candidates.find(c=>c.actionType==='choose_first_actor'&&c.sourceAction.chosenFirstActorSideKey==='player1');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.parameterKind?.includes('casualty'));
      if(!d&&!c)c=menu.candidates.find(c=>c.actionType==='finish_ranged_attack_sequence');
      if(!d&&!c)d=menu.parameterDomains.find(d=>d.actionType==='finish_activation');
      if(!d&&!c)c=menu.candidates.find(c=>/pass/.test(c.actionType))||menu.candidates[0];
      if(!d&&!c)d=menu.parameterDomains[0];assert.ok(d||c,'FIREBAT_NATIVE_SUCCESSOR_REQUIRED');
      const before=structuredClone(s),actionType=(d||c).actionType;
      const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey||s.firstPlayerSideKey],
        operationKey:'step-'+head.stateRevision,...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parametersFor(d)}
          :{kind:'finite',select:r=>r.action.actionType===c.actionType&&(c.actionType!=='choose_first_actor'||r.action.sourceAction.chosenFirstActorSideKey==='player1')})});
      assert.equal(result.idempotentReplayVerified,true);
      if(d?.definitionId===OFFICIAL_FIREBAT_STIMPACK_ID){
        used=true;const after=(await native.store.loadRoom(roomId)).envelope.state,actor=after.pieces.find(p=>p.id==='firebat');
        damage=actor.damageMarker;assert.equal(damage,2);assert.equal(actor.currentModels,before.pieces.find(p=>p.id==='firebat').currentModels);
        const route=after.officialCharacteristicStatusFamilySourceBundle.routes.find(r=>r.definitionId===OFFICIAL_FIREBAT_STIMPACK_ID);
        assert.equal(route.rangedWeaponScope,'perdition flamethrower');assert.equal(route.precision,3);speed=route.speedModifier;assert.equal(speed,3);
      }
      if(d?.pieceId==='firebat'&&actionType===(kind==='ranged'?'ranged_attack':'fight'))attacked=true;
      if(movement&&d?.pieceId==='firebat'&&actionType==='move'){
        moved=true;const after=(await native.store.loadRoom(roomId)).envelope.state;
        for(const m of before.pieces.find(p=>p.id==='firebat').models){const now=after.pieces.find(p=>p.id==='firebat').models.find(n=>n.id===m.id);
          assert.equal(Math.round((m.yInches-now.yInches)*1000),6500);assert.equal(m.xInches,now.xInches);}
      }
      trace.push({revision:head.stateRevision+1,round:s.round,phase:s.phase,actionType,definitionId:d?.definitionId||null});
      console.log(JSON.stringify({id,...trace.at(-1)}));
    }
    expected=await native.store.loadRoom(roomId);const s=expected.envelope.state;
    assert.ok(movement?moved:attacked);assert.equal(used,stimpack);assert.equal(s.round,2);assert.equal(s.phase,'movement');
    assert.equal(s.officialMissionRuntimeState.scoringHistory.length,1);
    assert.ok(!s.pendingAction&&!s.pendingCurrentProductRangedSequence&&!s.selectedRosterActivationWindow);
    assert.ok(s.pieces.every(p=>!p.officialAbilityEffects?.some(e=>e.sourceDefinitionId===OFFICIAL_FIREBAT_STIMPACK_ID)));
  }finally{native.close();}
  native=bound.open();try{
    await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),
      journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
      replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});
    assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
  }finally{native.close();}
  const result={id,kind,stimpack,movement,movedInches:moved?6.5:null,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,
    stateHash:expected.envelope.stateHash,precision,speedModifier:speed,nonLethalDamage:damage,trace,
    fullNativeRound:true,coldReplay:true,idempotencyVerified:true,fullMatchAdmission:false};results.push(result);
  await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2)+'\n');
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/firebat-foundation.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_firebat_foundation_v1',status:'passed_scoped',directoryRef:path.relative(root,directory),results,
  newCompleteAtoms:0,sourceHeldDefinitions:39,fullFirebatAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_scoped',nativeCases:results.length,signedActions:results.reduce((n,r)=>n+r.signedActions,0)}));
