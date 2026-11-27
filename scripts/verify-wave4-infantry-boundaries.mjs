import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4InfestedInfantryScene} from './support/wave4-infested-infantry-room-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {projectOfficialCharacteristicStatusFamilyModifiersV1 as modifiers} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {bindOfficialSpawnRoundAbilityLockV1} from '../packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import {compileOfficialInfestedInfantrySpecV1} from '../packages/source-data/official-infested-infantry-source-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const cases=[];const passed=(name)=>cases.push({name,passed:true,mutationAuthority:false});
const runtimeFor=scene=>createOfficialCharacteristicStatusComponentRuntimeV2({context:inputs.context,spatialState:scene.state,
 definitionIds:scene.characteristicRuntimeDefinitionIds,sourceDefinitionIds:scene.sourceDefinitionIds,...scene.runtimeOptions});
const scene=createWave4InfestedInfantryScene(inputs,{unitKey:'infested_trooper',creepSource:true}),bundle=scene.state.officialCharacteristicStatusFamilySourceBundle;
const precision=state=>modifiers(bundle,state,{pieceId:'actor',context:{attackKind:'ranged',weaponName:'Infested C-14 Rifle',targetPieceId:'enemy'}}).precision;
assert.equal(precision(scene.state),2);passed('terran_enemy_near_enemy_creep_source');
for(const [name,change,value]of [
 ['source_removed',s=>{s.pieces.find(p=>p.id==='creep-source').isOnField=false;},0],
 ['outside_six',s=>{Object.assign(s.pieces.find(p=>p.id==='creep-source').models[0],{xInches:45,yInches:25});},0],
 ['source_controller_independent',s=>{s.pieces.find(p=>p.id==='creep-source').sideKey='player1';},2],
 ['flying_target_eligible',s=>{const target=s.pieces.find(p=>p.id==='enemy');target.combatTags=target.combatTags.filter(t=>t.toLowerCase()!=='ground').concat('Flying');},2],
 ['spawn_round_source_locked',s=>{bindOfficialSpawnRoundAbilityLockV1(s.pieces.find(p=>p.id==='creep-source'),inputs.lifecycle.routes[0].spawnRoundAbilityLockPolicy,s.round);},0]]){
 const state=structuredClone(scene.state);change(state);assert.equal(precision(state),value);passed(name);
}
const unbought=createWave4InfestedInfantryScene(inputs,{reserve:true,phase:'movement',purchaseBurrow:false});
assert.ok(!runtimeFor(unbought).enumerate(unbought.state).parameterDomains.some(d=>d.abilityName==='Burrow Ambush'));passed('unbought_marine_ambush_rejected');
for(const unitKey of ['infested_marine','infested_trooper']){
 const own=createWave4InfestedInfantryScene(inputs,{unitKey,reserve:true,phase:'movement'}),runtime=runtimeFor(own),actor=own.state.pieces.find(p=>p.id==='actor');
 const parameters={leadingModelId:actor.models[0].id,entrySegmentId:own.state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player1.segments[0].segmentId,
  placements:actor.models.map((m,i)=>({modelId:m.id,xMilliInches:35000+i%3*1310,yMilliInches:27000+Math.floor(i/3)*1310,elevation:'ground',supportTerrainIds:[],rotationDegrees:0}))};
 const query=(s,p)=>runtime.query(s,{queryKind:'relocation_preview',pieceId:'actor',definitionId:'unit:'+unitKey+'/burrow-ambush-movement-phase@1',parameters:p});
 const before=JSON.stringify(own.state);query(own.state,parameters);assert.equal(JSON.stringify(own.state),before);
 const beyond=structuredClone(parameters);beyond.placements.forEach(p=>p.yMilliInches-=15000);
 assert.throws(()=>query(own.state,beyond),/RELOCATION_EDGE_DISTANCE_EXCEEDED/);passed(unitKey+'_beyond_eighteen_rejected');
 const outside=structuredClone(parameters);outside.placements[0].xMilliInches=12000;
 assert.throws(()=>query(own.state,outside),/RELOCATION_ENTRY_SEGMENT_EXCEEDED/);passed(unitKey+'_outside_entry_segment_rejected');
 const tooClose=structuredClone(own.state),target=tooClose.pieces.find(p=>p.id==='enemy');
 Object.assign(target.models[0],{xInches:(35000+Math.round((target.models[0].baseWidthInches+actor.models[0].baseWidthInches)*500)+10000)/1000,yInches:27});
 assert.throws(()=>query(tooClose,parameters),/RELOCATION_ENEMY_GAP_REQUIRED/);passed(unitKey+'_exact_ten_rejected');
 const noSupply=structuredClone(own.state);delete noSupply.officialRoundSupplyState;noSupply.players.player1.supply=0;
 assert.ok(!runtime.enumerate(noSupply).parameterDomains.some(d=>d.abilityName==='Burrow Ambush'));passed(unitKey+'_insufficient_supply_rejected');
}
const munitions=createWave4InfestedInfantryScene(inputs,{munitions:true}),runtime=runtimeFor(munitions);
for(const d of runtime.catalogue.definitions.filter(d=>/live-for-the-swarm|plagued-munitions/.test(d.definitionId))){
 assert.ok(compileOfficialInfestedInfantrySpecV1(d));assert.throws(()=>compileOfficialInfestedInfantrySpecV1({...d,sourceText:d.sourceText+' '}),/SOURCE_MISMATCH/);
 passed(d.definitionId+'_source_drift_rejected');
}
const weapons=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/infantry-weapons.public.json'),'utf8'));
for(const result of weapons.results.filter(r=>r.phase==='combat')){assert.equal(result.events[0].stages.activePrecisionValue,2);passed(result.id+'_actual_precision_two');}
const proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/plagued-munitions.public.json'),'utf8'));
for(const r of proof.results.filter(r=>r.history.length)){
 assert.equal(r.history[0].nonLethalResolution.nonLethalDamage,1);assert.equal(r.history[0].nonLethalResolution.casualtyModelIds.length,0);
 if(!r.medic)assert.ok(r.history[0].nonLethalResolution.postDamageMarker>=r.history[0].nonLethalResolution.targetHitPoints);
 passed(r.id+'_actual_full_marker_without_extra_casualty');
}
const result={schema:'starcraft_tmg_wave4_infantry_boundaries_v1',status:'passed_scoped',cases,checks:cases.length,
 queryOnlyCounterfactuals:true,existingSignedEvidenceAudited:true,newGameAtoms:0,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/infantry-boundaries.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,checks:result.checks}));
