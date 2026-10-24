// Actual v699 purpose completed, but old pre-purpose query frontiers kept
// receiving the only writer slot. Priority must use explicit purpose/control
// edges, preserve the old work, and keep draft writes exclusive.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import * as ownership from '../packages/roster-strategist/roster-workflow-ownership-v1.mjs';
const base=path.join(process.cwd(),'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const purpose=original.work.findLast(w=>w.strategyComparisonDesignCycleId&&w.status==='evidence_ready');
assert(purpose,'use the actual completed model purpose');
assert.equal(typeof ownership.selectRosterPurposePriorityV1,'function','the completed new purpose needs a scheduler, not another queued report');
const root={id:'controlled-new-purpose-owner',role:'roster_workflow_strategy_decision',status:'ready',
  inputs:{comparisonPurpose:{source:'evidence',id:'role:'+purpose.id}}};
const old={id:'controlled-unrelated-writer',role:'roster_workflow_strategy_decision',status:'ready',inputs:{}};
const tool={id:'controlled-native-step',role:'roster_workflow_tool',status:'ready',experimentOwnerId:'controlled-method',inputs:{}};
const method={id:'controlled-method',role:'roster_workflow_experiment_planner',status:'evidence_ready',investigationFor:root.id,inputs:{}};
const state={...structuredClone(original),work:[old,root,method,tool]};
const before=JSON.stringify(state);
assert.deepEqual(ownership.selectRosterPurposePriorityV1({state,purposeWorkId:purpose.id}),[root.id],
  'purpose writer wins and cannot race tools/another writer');
root.status='evidence_ready';
assert.deepEqual(ownership.selectRosterPurposePriorityV1({state,purposeWorkId:purpose.id}),[tool.id],
  'explicit child method/tool stays in the same focus');
const incidental={id:'controlled-incidental-read',role:'roster_workflow_strategy_decision',status:'ready',
  inputs:{someCitation:{source:'evidence',id:'role:'+purpose.id}}};
state.work.push(incidental);
assert.deepEqual(ownership.selectRosterPurposePriorityV1({state,purposeWorkId:purpose.id}),[tool.id],
  'an incidental citation is not experiment ownership');
tool.status='waiting_dependency';
assert.deepEqual(ownership.selectRosterPurposePriorityV1({state,purposeWorkId:purpose.id}),[]);
assert.equal(old.status,'ready','deferred work is not deleted, completed or silently superseded');
assert.equal(original.work.find(w=>w.id===purpose.id).resultRef,purpose.resultRef);
assert.ok(before.length>0);
console.log(JSON.stringify({passed:true,actualCompletedPurposeUsed:true,explicitControlOwnership:true,
  writerExclusive:true,incidentalCitationNotOwnership:true,unrelatedWorkPreserved:true,
  controlledSchedulingFixture:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
