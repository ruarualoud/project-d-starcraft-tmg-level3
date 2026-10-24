// Actual128 was correctly rejected by source review, then the Host injected
// its old batch's failed scene as CURRENT instead of the review's source states.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterGeometryDecisionContextV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const root=path.resolve(process.argv[2]),base=path.join(root,'workspace/decision-workflows/candidate-capability');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const original=await fs.readFile(path.join(root,'128.request.json'),'utf8');
const assignment=JSON.parse(original).request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const context=await projectRosterGeometryDecisionContextV1({assignment,store:{load:async()=>state,get}});
assert.equal(context.requiresSceneChoice,true,'review explicitly compared TWO sources; Host must not select the old batch failure');
assert.equal(context.sceneChoices.length,2);
const baseline=context.sceneChoices.find(row=>row.stateRef.contextRef===null);
assert.equal(baseline.stateRef.stateHash,'38a19f02c2edbd7b89252efa064e639085ca462c1afc683ae9c22087e677f477');
assert.deepEqual(baseline.remainingGeometry,[]);
assert.equal(state.evidence[baseline.stateReferenceBinding.fromEvidenceNumber-1].id,baseline.sourceEvidenceId);
assert.ok(baseline.sourceEvidenceId.startsWith('tool-view:'),'execution binding must use Native receipt, not derived review projection');
assert.equal(await fs.readFile(path.join(root,'128.request.json'),'utf8'),original);
console.log(JSON.stringify({pass:true,reviewSourcesNotOldBatch:true,baselineGeometryComplete:true,
  originalNativeBinding:true,hostDoesNotChooseSource:true,providerCalls:0,productionWrites:0}));
