// A real reopened preflight was queued but old study descendants kept taking
// every priority quantum. Exercise the actual shared graph, without dispatch.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {selectRosterPurposePriorityV1} from '../packages/roster-strategist/roster-workflow-ownership-v1.mjs';
const state=JSON.parse(await fs.readFile(process.argv[2]+'/workflow.json','utf8'));
const purposeWorkId='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa:purpose:v1';
const preflight=state.work.find(w=>w.id===purposeWorkId+':preflight:v1:army-baseline-recovery:v1');
const study=state.work.find(w=>w.id===purposeWorkId+':study:source-revision');
assert.ok(preflight&&study);preflight.status='ready';study.status='ready';
assert.deepEqual(selectRosterPurposePriorityV1({state,purposeWorkId}),[preflight.id],
  'pending pre-execution authority review must run before descendants of the old study');
preflight.status='evidence_ready';
assert.ok(selectRosterPurposePriorityV1({state,purposeWorkId}).includes(study.id),
  'completed review does not suppress the existing study frontier');
console.log(JSON.stringify({pass:true,preflightBeforeOldStudy:true,completedReviewNotHeld:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
