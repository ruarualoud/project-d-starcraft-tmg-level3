// Actual retained hypothetical branch rejected its combat query before Native
// dispatch. It needs a scenario owner, not an unowned generic unknown.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id==='review-resolution:r10:round2:plan_continuity:order0:combat-query:input-repair:order0:combat-query');
const raw=await fs.readFile(path.join(base,'artifacts',work.resultRef+'.json'),'utf8');
const value=JSON.parse(raw).value,repair=projectRosterWorkflowToolRepairV1(value);
assert.equal(repair?.correctable,true,'source-owned geometric rejection must reach the scenario repair owner');
assert.equal(repair.originalQueryNotAnswered,true);
assert.equal(repair.baseStateHash,value.receipt.baseStateHash);
assert.deepEqual(repair.placementAssessment,value.receipt.hypotheticalPlacementAssessment);
const unrelated=structuredClone(value);unrelated.receipt.unknownReason='UNEXPLAINED_REMOTE_FAILURE';
assert.equal(projectRosterWorkflowToolRepairV1(unrelated),null,'do not turn arbitrary unknowns into retries');
assert.equal(await fs.readFile(path.join(base,'artifacts',work.resultRef+'.json'),'utf8'),raw);
console.log(JSON.stringify({pass:true,checks:6,providerCalls:0,nativeExecutions:0,productionWrites:0}));
