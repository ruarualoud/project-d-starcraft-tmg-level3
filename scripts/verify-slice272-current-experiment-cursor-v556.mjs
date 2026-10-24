// Actual69 received a complete NEW scene, but Host labelled the original failed
// scene as CURRENT and sent the model back into geometry repair.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterGeometryDecisionContextV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/candidate-capability');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const original=await fs.readFile(path.join(run,'69.request.json'),'utf8');
const assignment=JSON.parse(original).request.promptNodes.find(node=>node.kind==='workflow_role_assignment');
const context=await projectRosterGeometryDecisionContextV1({assignment,store:{load:async()=>structuredClone(state),get}});
assert.equal(context.branchStateHash,'2c58805eda75abe0623e54ccf1353f45a9042922a6b83a309e83f8e1cc3a42f8','current context must follow the explicit completed successor, not original failure');
assert.equal(context.remainingGeometry.length,0);
assert.equal(context.originalFailureStateHash,'7cf5ea75ac34899c8011574aeb145f4c160f6b378a918929e9126831c948d3b7');
assert.equal(context.stateReferenceBinding.resultPointer,'/stateRef');
assert.ok(context.stateReferenceBinding.fromEvidenceNumber>0);
assert.equal(await fs.readFile(path.join(run,'69.request.json'),'utf8'),original);
console.log(JSON.stringify({pass:true,currentSceneFollowsExplicitSuccessor:true,staleOriginalFailureNotInjectedAsCurrent:true,actualQueryBindingAvailable:true,providerCalls:0,productionWrites:0}));
