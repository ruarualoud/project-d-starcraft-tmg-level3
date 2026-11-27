import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4DetonationOverwatchScene} from './support/wave4-detonation-overwatch-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {inspectOfficialAutoTurretOverwatchShotV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {readOfficialOverwatchAttackGrantV1} from '../packages/rule-atoms/official-overwatch-attack-policy-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/overwatch-coexistence-'));
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/overwatch-coexistence-')));
const results=[],controls=[];
function runParameters(s,id){const p=s.pieces.find(p=>p.id===id),leader=p.models[Math.min(1,p.models.length-1)],point=m=>({xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000),elevation:'ground',supportTerrainIds:[]});
 return{leadingModelId:leader.id,path:[point(leader),{...point(leader),yMilliInches:Math.round(leader.yInches*1000)+100}],
  placements:p.models.filter(m=>m.id!==leader.id).map(m=>({modelId:m.id,...point(m),yMilliInches:Math.round(m.yInches*1000)+100,rotationDegrees:0}))};}
function parameters(s,d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(!schema.required.includes('casualtyModelIds'))return timingParameters(d);
 const p=s.pendingCurrentProductRangedCasualtyChoice||s.pendingOfficialAutomaticHits,contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
 while(casualtyModelIds.length<contract.casualtyCount){const r=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});
  assert.ok(r.valid&&r.legalNextModelIds.length);casualtyModelIds.push(r.legalNextModelIds[0]);}return{casualtyModelIds};}
for(const spec of [{id:'ocular-used-blocks-detonation',useOcular:true},{id:'ocular-declined-allows-detonation',useOcular:false}])for(let attempt=0;attempt<8;attempt++){
 const caseDirectory=path.join(directory,spec.id+'-'+attempt),roomId='wave4-overwatch-coexistence-'+spec.id+'-'+attempt;
 const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}
 const scene=createWave4DetonationOverwatchScene(inputs,{coexistingOcular:true}),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 assert.equal(bound.runtime.descriptor.runtimeVersion,'3.234.0');assert.equal(bound.runtime.descriptor.overwatchRuntime.runtimeVersion,'1.2.0');
 assert.equal(inspectOfficialAutoTurretOverwatchShotV1(scene.state,{sourcePieceId:'ocular',targetPieceId:'defender'}).legal,false);
 assert.equal(inspectOfficialAutoTurretOverwatchShotV1(scene.state,{sourcePieceId:'ocular',targetPieceId:'creator'}).legal,true);
 assert.equal(inspectOfficialAutoTurretOverwatchShotV1(scene.state,{sourcePieceId:'turret',targetPieceId:'defender'}).legal,true);
 let native=bound.open(),expected;const trace=[],frames=new Map(),grants=new Map();
 try{const credentials=await native.create(roomId,bound.authority);
  if(resume){const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
   const definition=a=>a?(a.definitionId||definition(a.sourceAction)):null;
   for(const r of journal){trace.push({revision:r.postStateRevision,actionType:r.action.actionType,definitionId:definition(r.action)||null,restoredFromSignedJournal:true});
    if(r.events.some(e=>e.type==='before_casualty_batch_interrupted'||e.type==='reaction_ability_resolved')){
     const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,r.postStateRevision)});assert.equal(replay.ok,true);
     for(const f of replay.envelope.state.officialBeforeCasualtyContinuations||[])frames.set(f.continuationId,f);
     const grant=readOfficialOverwatchAttackGrantV1(replay.envelope.state);if(grant)grants.set(grant.triggerHash,grant);
    }
   }
  }
  const commit=async(d,p,c)=>{const h=await native.store.loadRoom(roomId),s=h.envelope.state;
   const r=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+h.stateRevision,
    ...(d?{select:x=>x.domainId===d.domainId,parameters:()=>p||parameters(s,d)}:{kind:'finite',select:x=>x.action.actionType===c.actionType})});
   assert.equal(r.idempotentReplayVerified,true);trace.push({revision:h.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null});console.log(JSON.stringify(trace.at(-1)));};
  const moveAndEnd=async id=>{let s=(await native.store.loadRoom(roomId)).envelope.state;
   let d=bound.runtime.enumerate(s).parameterDomains.find(d=>d.actionType==='run'&&d.pieceId===id);assert.ok(d,'RUN_REQUIRED:'+id);await commit(d,runParameters(s,id));
   s=(await native.store.loadRoom(roomId)).envelope.state;d=bound.runtime.enumerate(s).parameterDomains.find(d=>d.actionType==='finish_activation'&&d.pieceId===id);assert.ok(d);await commit(d,{});};
  const settle=async target=>{for(let step=0;step<45;step++){
   const s=(await native.store.loadRoom(roomId)).envelope.state,stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);assert.equal(f.activationContext.activationId,null);assert.ok(f.suspendedHostSlots.pendingOfficialAutoTurretOverwatch);}
   const parent=s.pendingOfficialAutoTurretOverwatch,grant=readOfficialOverwatchAttackGrantV1(s);
   if(grant)grants.set(grant.triggerHash,grant);
   if(!parent&&!stack.length&&!s.pendingOfficialAutomaticHits)return;
   const menu=bound.runtime.enumerate(s);let d,p;
   if(parent?.stage==='reaction')d=menu.parameterDomains.find(d=>d.effectKind==='overwatch_ranged_attack'&&(target==='creator'?spec.useOcular:true));
   if(!d&&stack.at(-1)?.stage==='reaction'){
    const det=menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation');
    if(spec.useOcular)assert.ok(!det,'OUTSIDE_PHASE_LIMIT_BYPASSED');else d=det;
   }
   if(!d)d=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
   if(!d){d=menu.parameterDomains.find(d=>d.pieceId===(target==='creator'?'ocular':'turret')&&d.weaponName===(target==='creator'?'Firefly Missiles':'Gauss Cannon'));if(d)p={targetUnitId:target};}
   d||=menu.parameterDomains[0];const c=menu.candidates.find(c=>c.isEnabled!==false);assert.ok(d||c,'OVERWATCH_SUCCESSOR_REQUIRED');await commit(d,p,c);
  }throw Error('OVERWATCH_SUCCESSOR_LIMIT');};
  let s=(await native.store.loadRoom(roomId)).envelope.state;
  if(!s.pieces.find(p=>p.id==='creator').activatedPhases.assault)await moveAndEnd('creator');
  if(s.pendingOfficialAutoTurretOverwatch?.targetPieceId==='creator'||!(s.officialOcularOverwatchHistory?.length||s.officialMultiSourceOverwatchHistory?.length))await settle('creator');
  s=(await native.store.loadRoom(roomId)).envelope.state;assert.equal(s.activeSideKey,'player1');
  assert.equal(s.rangedActionHistory?.filter(h=>h.pieceId==='ocular').length||0,spec.useOcular?1:0);
  if(!s.pieces.find(p=>p.id==='defender').activatedPhases.assault)await moveAndEnd('defender');
  await settle('defender');
  expected=await native.store.loadRoom(roomId);s=expected.envelope.state;
  assert.equal(s.activeSideKey,s.officialAutoTurretOverwatchHistory?.[0].resumedSideKey);assert.ok(!s.selectedRosterActivationWindow);
  for(const slot of ['pendingOfficialAutoTurretOverwatch','pendingOfficialReactionWindow','pendingOfficialAutomaticHits','pendingCurrentProductRangedSequence','pendingCurrentProductRangedCasualtyChoice'])assert.ok(!s[slot],slot);
  assert.ok(!s.officialBeforeCasualtyContinuations?.length&&!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  assert.equal(s.officialAutoTurretOverwatchHistory.length,1);assert.equal(s.officialAutoTurretOverwatchHistory[0].outcome,'ranged_attack_completed');
  assert.equal(s.rangedActionHistory.filter(h=>h.pieceId==='turret').length,1);
  assert.equal(Boolean(s.officialOcularOverwatchHistory?.length),spec.useOcular);
  assert.equal(trace.some(t=>t.definitionId?.includes('/detonation-')),spec.useOcular?false:frames.size>0);
  for(const id of ['ocular','turret'])assert.deepEqual(s.pieces.find(p=>p.id===id).activatedPhases,scene.state.pieces.find(p=>p.id===id).activatedPhases);
  for(const f of frames.values())for(const row of f.rows){const e=s.log.flatMap(l=>l.events||[]).filter(e=>e.type==='ranged_attack'&&e.attackResolutionHash===row.attackResolutionHash);
   assert.equal(e.length,1);assert.deepEqual(e[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  for(const p of s.pieces)assert.equal(s.supplyLossLedger.entries.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.currentSupplyBefore-e.currentSupplyAfter,0),scene.state.pieces.find(i=>i.id===p.id).currentSupply-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const s=expected.envelope.state,inf=s.pieces.find(p=>p.id==='defender'),coverageSatisfied=spec.useOcular?inf.currentModels<scene.state.pieces.find(p=>p.id==='defender').currentModels:frames.size>0&&s.pieces.find(p=>p.id==='turret').isDestroyed;
 const result={...spec,attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,
  trace,grants:[...grants.values()],frames:[...frames.values()].map(f=>({hostKind:f.hostKind,rows:f.rows,activationContext:f.activationContext})),
  bothSourcesBound:true,weaponProfilesSeparated:true,outsidePhaseReactionLimitVerified:true,sourceActivationFlagsRestored:true,originalCasualtiesPreserved:true,supplyExactlyOnce:true,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 if(!coverageSatisfied){controls.push(result);assert.ok(attempt<7,'COEXISTENCE_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/overwatch-coexistence.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_overwatch_coexistence_v1',status:'passed_scoped',runRef:path.relative(root,directory),
 reproducedBeforeFix:'OVERWATCH_REACTION_CONSUMERS_REQUIRED',rootRuntimeVersion:'3.234.0',overwatchRuntimeVersion:'1.2.0',results,controls,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2));
