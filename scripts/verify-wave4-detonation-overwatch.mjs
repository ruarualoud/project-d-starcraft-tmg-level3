import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4DetonationOverwatchScene} from './support/wave4-detonation-overwatch-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
const directory=resume?path.resolve(root,resume):await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/detonation-overwatch-')),results=[],controls=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/stukov-units/detonation-overwatch-')));
function runParameters(s,id){const p=s.pieces.find(p=>p.id===id),leader=p.models[Math.min(1,p.models.length-1)],point=m=>({xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000),elevation:'ground',supportTerrainIds:[]});
 return{leadingModelId:leader.id,path:[point(leader),{...point(leader),yMilliInches:Math.round(leader.yInches*1000)+100}],
  placements:p.models.filter(m=>m.id!==leader.id).map(m=>({modelId:m.id,...point(m),yMilliInches:Math.round(m.yInches*1000)+100,rotationDegrees:0}))};}
function parameters(s,d){const schema=d.parameterSchema||d.sourceDomain.parameterSchema;
 if(!schema.required.includes('casualtyModelIds'))return timingParameters(d);
 const p=s.pendingCurrentProductRangedCasualtyChoice||s.pendingOfficialAutomaticHits,contract=p.casualtyDomain.selectionContract,casualtyModelIds=[];
 while(casualtyModelIds.length<contract.casualtyCount){const r=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:p.targetPieceId,selectionContract:contract,casualtyModelIds,complete:false});
  assert.ok(r.valid&&r.legalNextModelIds.length);casualtyModelIds.push(r.legalNextModelIds[0]);}return{casualtyModelIds};}
for(const spec of [{id:'marine-use',use:true},{id:'marine-decline',use:false},{id:'trooper-use',unitKey:'infested_trooper',use:true}])for(let attempt=0;attempt<8;attempt++){
 const caseDirectory=path.join(directory,spec.id+'-'+attempt),roomId='wave4-detonation-overwatch-'+spec.id+'-'+attempt;
 if(resume){const saved=await fs.readFile(path.join(caseDirectory,'result.public.json'),'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(saved){if(saved.coverageSatisfied){results.push(saved);break;}controls.push(saved);continue;}}
 const scene=createWave4DetonationOverwatchScene(inputs,spec),bound=await bindWave4TurretRoom({inputs,...scene,directory:caseDirectory});
 let native=bound.open(),expected;const trace=[],frames=new Map();
 try{const credentials=await native.create(roomId,bound.authority);
  await native.commit({roomId,credential:credentials.player1,operationKey:'run',select:d=>d.actionType==='run'&&d.pieceId==='defender',parameters:()=>runParameters(scene.state,'defender')});
  await native.commit({roomId,credential:credentials.player1,operationKey:'end-activation',select:d=>d.actionType==='finish_activation'&&d.pieceId==='defender',parameters:()=>({})});
  for(let step=0;step<50;step++){
   const h=await native.store.loadRoom(roomId),s=h.envelope.state,stack=s.officialBeforeCasualtyContinuations||[];
   for(const f of stack){frames.set(f.continuationId,f);assert.equal(f.activationContext.activationId,null);assert.equal(f.activationContext.activeSideKey,'player1');
    assert.ok(f.suspendedHostSlots.pendingOfficialAutoTurretOverwatch);}
   if(s.officialAutoTurretOverwatchHistory?.length&&!stack.length&&!s.pendingOfficialAutomaticHits)break;
   const menu=bound.runtime.enumerate(s);let d,p;
   if(s.pendingOfficialAutoTurretOverwatch?.stage==='reaction')d=menu.parameterDomains.find(d=>d.definitionId==='unit:auto_turret/overwatch-assault-phase@1');
   if(!d&&spec.use&&stack.at(-1)?.stage==='reaction')d=menu.parameterDomains.find(d=>d.effectKind==='before_casualty_detonation');
   if(!d)d=menu.parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
   if(!d){d=menu.parameterDomains.find(d=>d.pieceId==='turret'&&d.weaponName==='Gauss Cannon');if(d)p={targetUnitId:'defender'};}
   d||=menu.parameterDomains[0];const c=menu.candidates.find(c=>c.isEnabled!==false);assert.ok(d||c,'OVERWATCH_DETONATION_SUCCESSOR_REQUIRED');
   const result=await native.commit({roomId,credential:credentials[(d||c).sideKey||s.activeSideKey],operationKey:'step-'+h.stateRevision,
    ...(d?{select:r=>r.domainId===d.domainId,parameters:()=>p||parameters(s,d)}:{kind:'finite',select:r=>r.action.actionType===c.actionType})});
   assert.equal(result.idempotentReplayVerified,true);trace.push({revision:h.stateRevision+1,actionType:(d||c).actionType,definitionId:d?.definitionId||null,stackDepth:stack.length});console.log(JSON.stringify(trace.at(-1)));
  }
  let head=await native.store.loadRoom(roomId),s=head.envelope.state;assert.ok(!s.pendingOfficialAutoTurretOverwatch&&!s.pendingOfficialAutomaticHits&&!s.officialBeforeCasualtyContinuations?.length);
  assert.equal(s.officialAutoTurretOverwatchHistory.length,1);assert.equal(s.officialAutoTurretOverwatchHistory[0].outcome,'ranged_attack_completed');
  assert.equal(s.activeSideKey,'player2');assert.ok(!s.selectedRosterActivationWindow);
  assert.deepEqual(s.pieces.find(p=>p.id==='turret').activatedPhases,scene.state.pieces.find(p=>p.id==='turret').activatedPhases);
  for(const f of frames.values())for(const row of f.rows){const e=s.log.flatMap(l=>l.events||[]).filter(e=>e.type==='ranged_attack'&&e.attackResolutionHash===row.attackResolutionHash);
   assert.equal(e.length,1);assert.deepEqual(e[0].casualtyModelIds,row.casualty.casualtyModelIds);}
  await native.commit({roomId,credential:credentials.player2,operationKey:'next-actual-run',select:d=>d.actionType==='run'&&d.pieceId==='creator',parameters:()=>runParameters(s,'creator')});
  await native.commit({roomId,credential:credentials.player2,operationKey:'next-end',select:d=>d.actionType==='finish_activation'&&d.pieceId==='creator',parameters:()=>({})});
  expected=await native.store.loadRoom(roomId);s=expected.envelope.state;
  assert.ok(!s.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
  const shots=s.rangedActionHistory.filter(r=>r.pieceId==='turret');assert.equal(shots.length,1);
  if(frames.size)assert.equal(trace.some(t=>t.definitionId?.includes('/detonation-')),spec.use);
  for(const p of s.pieces)assert.equal(s.supplyLossLedger.entries.filter(e=>e.unitId===p.id).reduce((n,e)=>n+e.currentSupplyBefore-e.currentSupplyAfter,0),scene.state.pieces.find(i=>i.id===p.id).currentSupply-p.currentSupply);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
  const replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);
 }finally{native.close();}
 const turret=expected.envelope.state.pieces.find(p=>p.id==='turret'),coverageSatisfied=frames.size>0&&(!spec.use||turret.isDestroyed);
 const result={...spec,attempt,roomId,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,stateHash:expected.envelope.stateHash,coverageSatisfied,
  turretDestroyed:turret.isDestroyed,frames:[...frames.values()].map(f=>({hostKind:f.hostKind,activationContext:f.activationContext,rows:f.rows})),trace,
  originalDiceAndCasualtyOrderPreserved:true,sourceActivationFlagsRestored:true,nextActualActivationVerified:true,supplyExactlyOnce:true,coldReplay:true,idempotencyVerified:true};
 await atomicWrite(path.join(caseDirectory,'result.public.json'),JSON.stringify(result,null,2));
 if(!coverageSatisfied){controls.push(result);assert.ok(attempt<7,'NATIVE_OVERWATCH_COVERAGE_NOT_REACHED');continue;}results.push(result);break;
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/detonation-overwatch.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_detonation_overwatch_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,controls,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,otherRemovalHostsPending:true,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
