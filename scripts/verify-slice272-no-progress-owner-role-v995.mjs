// Reproduce the missing OWNER projection on the exact paid v992 request.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterIncomingAuthorContextV1} from '../packages/roster-strategist/roster-workflow-strategy-owner-context-v1.mjs';
import {rosterOriginalSelectedQuestionsV1} from '../packages/roster-strategist/roster-author-question-contract-v1.mjs';
const dir=process.argv[2];
const request=JSON.parse(await fs.readFile(dir+'/artifacts/8d0fb18744962c18549a3b0756391411211374f681edbffe00cdd4850383d89e.json','utf8'));
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),before=structuredClone(assignment);
const result=projectRosterIncomingAuthorContextV1(assignment);
console.log(JSON.stringify({actualSavedRequest:true,ownerProjectionPresent:!!result,providerCalls:0,nativeCalls:0,productionWrites:0}));
assert(result,'explicit persisted no-progress handoff did not enter the shared OWNER projection');
assert.equal(result.node.kind,'strategy_owner_assignment');
assert.equal(result.node.returnKind,'repeated_inspection_only_batch');
assert(!result.inputs.originalTask);assert(!result.inputs.originalStrategicDecision);
assert.deepEqual(result.history.originalTask,assignment.inputs.originalTask);
assert.deepEqual(result.history.originalStrategicDecision,assignment.inputs.originalStrategicDecision);
assert.deepEqual(result.inputs.wholeDraft,assignment.inputs.wholeDraft);
assert.deepEqual(result.inputs.originalObservation,assignment.inputs.originalObservation);
// v997 preserves the original selected predicates separately from a child's
// later proposal. Its own actual-input gate covers this changed contract.
assert.deepEqual(result.node.questions,rosterOriginalSelectedQuestionsV1(assignment)?.questions
  ??assignment.inputs.investigationFrontier.value.unresolvedQuestions);
assert.equal(result.node.factApprovalGranted,false);assert.equal(result.node.planApprovalGranted,false);
assert.deepEqual(assignment,before);
const renamed=structuredClone(assignment);
renamed.inputs.retainedOriginal=renamed.inputs.originalObservation;delete renamed.inputs.originalObservation;
renamed.inputs.retainedRepeated=renamed.inputs.repeatedObservation;delete renamed.inputs.repeatedObservation;
assert(projectRosterIncomingAuthorContextV1(renamed),'source identities must not depend on input field names');
for(const change of [a=>{a.inputs.repeatedObservation.validity='historical';},
  a=>{a.inputs.repeatedObservation.value.queryReuse.newObservation=true;},
  a=>{a.inputs.repeatedObservation.value.receipt.round=99;},
  a=>{a.inputs.noProgressBoundary.value.retainedObservation.ownerWorkId='different-owner';}]){
  const bad=structuredClone(assignment);change(bad);
  assert.equal(projectRosterIncomingAuthorContextV1(bad),null);
}
console.log(JSON.stringify({passed:true,retainedSourcesAndQuestions:true,oldRoleRestrictionsHistorical:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
