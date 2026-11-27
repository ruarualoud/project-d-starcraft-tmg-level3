import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {createWave4BioKillSwitchScene,BIO_KILL_SWITCH_ID} from './support/wave4-bio-kill-switch-room-v1.mjs';
import {createOfficialCharacteristicStatusComponentRuntimeV2} from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import {compileOfficialStukovInfestationSpecV1} from '../packages/source-data/official-stukov-infestation-source-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const scene=createWave4BioKillSwitchScene(inputs,{farHidden:true}),route=scene.state.officialCharacteristicStatusFamilySourceBundle.routes.find(r=>r.definitionId===BIO_KILL_SWITCH_ID);
const definition={...route,definitionName:route.abilityName},checks=[];
assert.equal(compileOfficialStukovInfestationSpecV1(definition).damageAmount,2);
for(const [id,change]of [['source-text',{sourceText:route.sourceText+' '}],['resource-cost',{activationText:'<Active>\n(1 Biomass)'}],
 ['activation-kind',{activationKind:'reaction'}],['phase',{phase:'movement'}],['record-key',{recordKey:'army_units:marine'}],['purchase-cost',{costByComposition:{small:1,large:0}}]]){
 assert.throws(()=>compileOfficialStukovInfestationSpecV1({...definition,...change}),/STUKOV_INFESTATION_SOURCE_MISMATCH/);checks.push({id,rejected:true});
}
const runtime=createOfficialCharacteristicStatusComponentRuntimeV2({context:inputs.context,spatialState:scene.state,
 definitionIds:scene.characteristicRuntimeDefinitionIds,sourceDefinitionIds:scene.sourceDefinitionIds,...scene.runtimeOptions});
const coverage=state=>runtime.enumerate(state).parameterDomains.find(d=>d.definitionId===BIO_KILL_SWITCH_ID).constraints.infestationDamage;
assert.deepEqual(coverage(scene.state).affectedUnits,[{unitId:'infected'}]);checks.push({id:'far-hidden-unit-affected-without-target-selection',passed:true});
const clean=structuredClone(scene.state);clean.pieces.find(p=>p.id==='infected').statuses=[];
assert.deepEqual(coverage(clean).affectedUnits,[]);checks.push({id:'friendly-reserve-clean-excluded',passed:true});
const source=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/bio-kill-switch-reduction.public.json'),'utf8'));
assert.equal(source.results[0].coldReplay,true);assert.ok(source.results[0].trace.some(t=>t.definitionId==='unit:queen/transfusion-any-phase@1'));
checks.push({id:'native-fully-reduced-damage-keeps-infestation',evidenceRef:'docs/development/wave4/evidence/bio-kill-switch-reduction.public.json'});
const result={schema:'starcraft_tmg_wave4_stukov_combat_boundaries_v1',status:'passed_scoped_read_only',checks,nativeActionsAdded:0,
 newGameAtomsImplemented:0,implementedCumulativeAtoms:6,fullMatchAdmission:false,sourceHeldDefinitions:39,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/stukov-combat-boundaries.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,checks:checks.length}));
