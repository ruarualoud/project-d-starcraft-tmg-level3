// Actual112 normal owner consumed a completed post-repair exchange but Host
// supplied no current-state projection, unlike its repair-only counterpart.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterGeometryDecisionContextV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/candidate-capability');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const text=await fs.readFile(path.join(path.resolve(process.argv[2]),'112.request.json'),'utf8');
const assignment=JSON.parse(text).request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const context=await projectRosterGeometryDecisionContextV1({assignment,store:{load:async()=>state,get}});
assert.ok(context,'normal owner must receive the current batch state, not only repair roles');
assert.equal(context.branchStateHash,'38a19f02c2edbd7b89252efa064e639085ca462c1afc683ae9c22087e677f477');
assert.equal(context.contextRef,null,'do not choose the older alternative source in inherited newFacts');
assert.deepEqual(context.remainingGeometry,[],'the original failed placement is historical, not the successful exchange state');
assert.ok(context.stateReferenceBinding.fromEvidenceNumber>0);
assert.equal(await fs.readFile(path.join(path.resolve(process.argv[2]),'112.request.json'),'utf8'),text);
console.log(JSON.stringify({pass:true,normalOwnerUsesExactBatchSuccessor:true,unrelatedSourceNotSelected:true,
  zeroRemainingStaticFailures:true,providerCalls:0,productionWrites:0}));
