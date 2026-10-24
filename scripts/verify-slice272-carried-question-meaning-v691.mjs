// Actual final-review round2 rejected already-refuted historical availability
// assumptions as false assertions instead of checking their explicit resolution.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {projectRosterWorkflowReviewObligationHandlesV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const target=state.work.find(w=>w.id==='final-review:r12:plan_continuity:round2');
assert(target?.resultRef);const savedInputs=structuredClone(target.inputs);
const carried=target.inputs.review.value.obligations.find(o=>o.originQuestionIds?.length);
assert(carried);
// Inspect the SAME pure projection called by the normal role runner. No
// fabricated room/dependency status is needed to test question semantics.
const handles=projectRosterWorkflowReviewObligationHandlesV1({role:target.role,inputs:target.inputs});
const review=handles.inputs.review.value;
assert.equal(review.historicalQuestionResolutionVersion,1,
  'Current and already-queued final review must distinguish resolution obligations from asserted facts');
const row=review.obligations.find(o=>o.question.includes(carried.question));
assert(row);assert.match(row.question,/resolution obligation/);
assert.match(row.question,/refuted/);
assert.equal(review.obligations[0].question,savedInputs.review.value.obligations[0].question,'Actual current-domain criteria stay unchanged');
assert.equal(handles.byHandle.get(review.obligations.find(o=>o.question.includes(carried.question)).checkId),carried.checkId);
assert.deepEqual(state.work.find(w=>w.id===target.id).inputs,savedInputs);
assert.equal(state.acceptanceGranted,false);
console.log(JSON.stringify({status:'passed',actualQueuedReviewMeaningCorrected:true,
  historicalQuestionTextAndIdsRetained:true,currentDomainCriterionUnchanged:true,
  noVerdictOrAcceptanceFabricated:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
