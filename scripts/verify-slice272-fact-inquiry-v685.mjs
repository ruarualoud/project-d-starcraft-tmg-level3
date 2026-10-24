// The real factual role kept receiving an entire strategic retain decision,
// while its reviewer received only a generic 'resolve requiredData' task.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const paidRequest=await read('ddc9617d94501c24ab40659038f4820952876a76c0b13291ef15aa049ec187b5');
const oldInputs=paidRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const oldDecision=oldInputs.decision.value.decisions[0];
assert.equal(oldDecision.disposition,'retain');assert(oldDecision.requiredData.length);
const targetId=paidRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').workId;
const savedOwner=original.work.find(w=>w.id===targetId);
let state=structuredClone(original);const memory=new Map();
for(const w of state.work){
  if(w.id!==targetId){w.status='superseded';w.inputRef??='controlled-fixture-not-dispatchable';continue;}
  w.status='ready';w.failure=null;w.resultRef=null;w.operationState.pending=null;
}
const store={load:async()=>structuredClone(state),save:async next=>{state=structuredClone(next);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let observed;
const run=await createRosterDecisionWorkspaceRunV1({workflowStore:store,scope:state.scope,sessionId:paidRequest.sessionId,
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source,rulesRuntimeHash:state.scope.rules}),
    restoreHypotheticalBranch:async()=>{},restoreFormationSelectionBranch:async()=>{},
    restoreProjectedScenarioBranch:async()=>{},restoreNativeActionBranch:async()=>{}},
  builderPort:{evaluateRosterCandidate:()=>{throw Error('NO_BUILDER_REQUERY');}},
  deliberation:{deliberate:async request=>{observed=request;throw Object.assign(Error('CONTROLLED_REQUEST_CAPTURED'),{dispatchOutcome:'not_dispatched'});}}});
await run.advance({concurrency:1});
assert(observed);
const inputs=observed.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.deepEqual(inputs.question?.value?.necessaryQuestions,oldDecision.requiredData,
  'The factual role must receive exact pending predicates, not only an entire retain decision');
assert.equal(inputs.decision.source,'literal');
assert.equal(inputs.decision.value.decisions,undefined,'Do not inline the parent strategic disposition as this factual role answer');
assert.equal(inputs.decision.value.publicReason,undefined);
assert.equal(inputs.decision.value.modelInstructionNotFact,true);
assert.deepEqual(inputs.decision.value.dataQuestions,oldDecision.dataQuestions.filter(q=>q.classification==='necessary_fact'));
assert(inputs.activeHypothesisTests.value.entries.some(e=>/Raynor forward using Orders/.test(e.hypothesisTest.claim)));
const review=await createRosterExperimentSourceReviewV1({state:original,owner:savedOwner,
  result:await read(savedOwner.resultRef),store:{get:read},reviewId:savedOwner.id+':source-recheck:v685-fixture'});
assert.deepEqual(review.inputs.question.value.necessaryQuestions,oldDecision.requiredData,
  'Coverage must judge the SAME real factual question, not a generic task');
console.log(JSON.stringify({status:'passed',normalRunRoleInput:true,exactPendingQuestionsRetained:true,
  wholeStrategicDecisionNotInlined:true,originalComparisonPreserved:true,sameCoverageQuestion:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,realAutonomousExperimentStillPending:true}));
