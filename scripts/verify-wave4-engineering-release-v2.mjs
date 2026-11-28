import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV2} from './compile-wave4-stukov-units-v2.mjs';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {createWave4StukovUnitScene} from './support/wave4-stukov-unit-room-v1.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {createOfficialReleaseRosterStateV2} from '../packages/product-composition/official-release-roster-state-v2.mjs';
import {readOfficialFactionUnitConversionV1} from '../packages/rule-atoms/official-faction-unit-conversion-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {timingParameters} from './support/wave4-timing-room-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),version=process.argv.includes('--v3')?'v3':'v2',
 inputs=await (version==='v3'?loadWave4StukovUnitInputsV3:loadWave4StukovUnitInputsV2)(root),
 directory=await fs.mkdtemp(path.join(root,'build/wave4-web/stukov-units/release-'+version+'-')),results=[];
for(const key of ['goliath','siege_tank']){
 const template=createWave4StukovUnitScene(inputs,{phase:'movement',preactivateMarine:false}),definitionId=key==='goliath'
  ?'unit:goliath/target-lock-movement-phase@1':'unit:siege_tank/mode-transformation-movement-phase@1';
 const unit=(id,k)=>({unitInstanceId:id,recordKey:'army_units:'+k,compositionKind:'small',upgrades:k==='siege_tank'?[{upgradeName:'Mode Transformation'}]:[]});
 const built=createOfficialReleaseRosterStateV2({context:inputs.context,sourceDefinitionIds:[definitionId],characteristicDefinitionIds:[definitionId],
  canonicalResourceTypes:true,includeAbilitySourcePhases:true,candidatesBySide:{
   player1:{sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
    tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[unit('actor',key)]},
   player2:{sideKey:'player2',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys:['tactical_cards:armory'],units:[unit('target','goliath')]}}});
 const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','engagementScale',
  'armyBuildingEngagementScale','board','officialModelGapTransitPolicy','officialMissionRuntimeDescriptor','supplyLossLedger'];
 const state={...Object.fromEntries(keys.map(k=>[k,structuredClone(template.state[k])])),...built.state,log:[]};
 for(const p of state.pieces){Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:p.models[0].id});
  for(const m of p.models)Object.assign(m,{isOnField:true,xInches:p.id==='actor'?15:22,yInches:10,elevation:'ground_level'});}
 declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'release-'+version+'-'+key});
 const conversion=readOfficialFactionUnitConversionV1(state.pieces.find(p=>p.id==='actor'));
 assert.equal(conversion.policy.sourceBinding.releaseId,inputs.context.manifest.releaseId);
 const bound=await bindWave4TurretRoom({inputs,state,sourceDefinitionIds:[definitionId],characteristicRuntimeDefinitionIds:[definitionId],
  runtimeOptions:{},scenario:{kind:'wave4_engineering_release_'+version+'_conversion',fullMatchAdmission:false},directory:path.join(directory,key)}),roomId='wave4-release-'+version+'-'+key;
 let native=bound.open(),expected;
 try{const credentials=await native.create(roomId,bound.authority),before=await native.store.loadRoom(roomId),menu=bound.runtime.enumerate(before.envelope.state),
   d=menu.parameterDomains.find(d=>d.definitionId===definitionId&&d.pieceId==='actor');assert.ok(d);
  assert.equal(d.constraints.resourceCostsByChoice.default.resourceType,'BM');assert.equal(d.constraints.resourceCostsByChoice.default.effectiveResourceCost,1);
  const receipt=await native.commit({roomId,credential:credentials.player1,operationKey:definitionId,select:r=>r.domainId===d.domainId,parameters:()=>timingParameters(d)});
  assert.equal(receipt.idempotentReplayVerified,true);expected=await native.store.loadRoom(roomId);
  const paid=expected.envelope.state.log.flatMap(l=>l.events||[]).filter(e=>e.type==='ability_resource_paid');assert.equal(paid.length,1);assert.equal(paid[0].resourceType,'BM');assert.equal(paid[0].resourceCost,1);
  assert.deepEqual(expected.envelope.state.cardResources.player2,before.envelope.state.cardResources.player2);
 }finally{native.close();}
 native=bound.open();try{await native.restoreDependencies(roomId,bound.authority);const b=await native.store.loadReplayBundle(roomId),journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
  replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal});assert.equal(replay.ok,true);assert.deepEqual(replay.envelope,expected.envelope);}finally{native.close();}
 results.push({recordKey:'army_units:'+key,definitionId,roomId,directoryRef:path.relative(root,path.join(directory,key)),signedActions:expected.stateRevision,
  resourceType:'BM',effectiveResourceCost:1,releaseId:inputs.context.manifest.releaseId,idempotencyVerified:true,coldReplay:true});console.log(JSON.stringify(results.at(-1)));
}
await atomicWrite(path.join(root,'docs/development/wave4/evidence/engineering-release-'+version+'.public.json'),JSON.stringify({schema:'starcraft_tmg_wave4_engineering_release_'+version+'_v1',status:'passed_scoped',
 dependencyRebinding:inputs.dependencyRebinding,results,newGameAtomsImplemented:0,implementedCumulativeAtoms:6,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false},null,2));
