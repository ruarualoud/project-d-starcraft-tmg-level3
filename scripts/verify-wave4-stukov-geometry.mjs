import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputs} from './compile-wave4-stukov-units.mjs';
import {getOfficialReleaseModelBaseGeometryBundleV2} from '../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputs(root);
const bundle=getOfficialReleaseModelBaseGeometryBundleV2(inputs.context);
const profiles=inputs.estimates.map(e=>{const p=bundle.profiles.find(p=>p.recordKey===e.recordKey);
 assert.equal(p.baseWidthMillimetres,e.diameterMillimetres);assert.equal(p.engineeringImageEstimate.estimateHash,e.estimateHash);
 assert.equal(p.engineeringImageEstimate.officialPhysicalAuthority,false);return{recordKey:p.recordKey,diameterMillimetres:p.baseWidthMillimetres,
  uncertaintyMillimetres:e.uncertaintyMillimetres,estimateHash:e.estimateHash,officialPhysicalAuthority:false};});
assert.throws(()=>getOfficialReleaseModelBaseGeometryBundleV2({...inputs.context,allowEngineeringEstimatedGeometry:false}),/ENGINEERING_IMAGE_GEOMETRY_NOT_ADMITTED/);
const held=inputs.inventory.definitions.filter(r=>r.sourceHolds.length);assert.equal(held.length,39);
assert.ok(!held.some(r=>inputs.scope.sourceRecordKeys.includes(r.recordKey)));
const result={schema:'starcraft_tmg_wave4_stukov_geometry_gate_v1',status:'passed_conditional_engineering',profiles,
 sourceImageBytesVerifiedByCompiler:true,formalContextRejectsEstimatedGeometry:true,heldRecordsExcluded:true,sourceHeldDefinitions:39,
 fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/stukov-geometry.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
