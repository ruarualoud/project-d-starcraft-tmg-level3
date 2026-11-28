import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV2} from './compile-wave4-stukov-units-v2.mjs';
import {rebindOfficialUnchangedReviewedDeploymentGeometryV1 as rebind} from '../packages/source-data/official-reviewed-deployment-geometry-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV2(root),
 previousManifest=await inputs.read(inputs.seed.setup.releaseRef),previousBundle=await inputs.read(previousManifest.components.deploymentCardGeometry.ref),
 previousDataset=await inputs.read('content/source-releases/wave4-20261127/compatibility/wave3-dataset.json'),
 previousContext={manifest:previousManifest,dataset:previousDataset,resources:{deploymentCardGeometry:previousBundle}},sourceBytesByRef=new Map(),
 historicalRoot=path.resolve(root,'../../..','starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration');
for(const ref of new Set(previousBundle.cards.map(c=>c.evidence.sourceRef)))sourceBytesByRef.set(ref,await fs.readFile(path.join(historicalRoot,ref)));
const args={context:inputs.context,previousContext,previousBundle,sourceBytesByRef};
assert.deepEqual(rebind(args),inputs.artifacts.deploymentCardGeometry);
const changedDataset=structuredClone(inputs.context.dataset),key=previousBundle.cards[0].recordKey;
changedDataset.recordsByKey[key].payloadHash='0'.repeat(64);
assert.throws(()=>rebind({...args,context:{...inputs.context,dataset:changedDataset}}),/UNCHANGED_SOURCE_REQUIRED/);
const alteredBytes=new Map(sourceBytesByRef);alteredBytes.set(previousBundle.cards[0].evidence.sourceRef,Buffer.from('incorrect official PDF bytes'));
assert.throws(()=>rebind({...args,sourceBytesByRef:alteredBytes}),/UNCHANGED_SOURCE_REQUIRED/);
const changedBundle=structuredClone(previousBundle);changedBundle.cards[0].geometry.markers[0][1]+=1;
assert.throws(()=>rebind({...args,previousBundle:changedBundle}),/PREVIOUS_BUNDLE_MISMATCH/);
const result={schema:'starcraft_tmg_wave4_deployment_rebinding_verification_v1',status:'passed_scoped',
 reviewedRecordKeys:previousBundle.cards.map(c=>c.recordKey),positiveSourceAndGeometryPreserved:true,
 rejected:['changed_source_record','changed_evidence_bytes','changed_previous_geometry'],
 newBundleHash:inputs.artifacts.deploymentCardGeometry.bundleHash,sourceHeldDefinitions:39,newGameAtomsImplemented:0,
 fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/deployment-rebinding.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
