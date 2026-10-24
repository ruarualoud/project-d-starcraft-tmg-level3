// Concrete regression: a formation chooser resubmitted its parent's queued
// fire-zone measurement. Replay the paid order at the production compiler seam.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import * as graphModule from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {createRosterWorkflowChoiceObservationV1} from '../packages/roster-planning-workspace/roster-workflow-choice-observation-v1.mjs';
// Load actual consumers as well: a compiler-only patch must not hide a broken
// production import. Their shared derivation is checked below, not a mock gate.
import '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=process.argv[2];
assert.ok(root,'pass the saved workflow directory');
const get=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await readFile(`${root}/workflow.json`,'utf8'));
const work=state.work.find(w=>w.id.endsWith(':exchange-marine-inrange:input-repair:order0:apply-repaired-scene:observed-choice'));
assert.ok(work);
const proposal=await get(work.resultRef),order=proposal.value.workOrders[0];
assert.deepEqual(order.steps.map(s=>s.operation),['formation_scene','threat_exchange']);
const target=state.work.find(w=>w.id===work.choiceOf);
const boundary=graphModule.rosterWorkflowChoiceContractV1?.({state,workId:work.id})
  ??{schema:'roster_workflow_choice_contract_v1',targetWorkId:target.id,
    operation:'formation_scene',allowedOperations:['inspect','spatial','formation_scene']};
const source=state.evidence[order.experimentScope.comparisonBinding.purposeEvidenceNumber-1];
const purpose=(await get(source.artifactRef)).proposals[0].comparisonPurpose;
const compile=order=>compileRosterWorkflowExperimentV1({order,scope:work.bindings,namespace:'regression-choice',
  evidenceDirectory:state.evidence,comparisonPurpose:{status:'read',evidenceId:source.id,value:purpose},
  choiceContract:boundary});
assert.throws(()=>compile(order),error=>error.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED',
  'the actual formation-choice payload must not schedule the parent-owned fire query');
assert.equal(boundary.targetWorkId,target.id);
assert.equal(boundary.operation,'formation_scene');
// The model may still explicitly select a formation or ask its necessary
// spatial prerequisite; no host-selected geometry or silent step dropping.
const local=structuredClone(order);
local.steps=local.steps.slice(0,1);
local.completionStepId=local.steps[0].stepId;
local.experimentScope.comparisonBinding.observationStepIds=[];
local.experimentScope.comparisonBinding.stage='prerequisite';
assert.equal(compile(local).length,1);
assert.equal(order.steps.length,2,'original paid output remains unchanged');
const repaired={id:'repair',role:work.role,orderRepairOf:work.id};
const cold=graphModule.rosterWorkflowChoiceContractV1({state:{...state,work:[...state.work,repaired]},workId:repaired.id});
assert.deepEqual(cold,boundary,'order repair inherits the same choice responsibility');
const observation=createRosterWorkflowChoiceObservationV1({work:target,
  choice:{question:{purpose:order.purpose},sourceReads:[],unconfirmedProposal:{}}});
assert.deepEqual(observation.inputs.task.value.choiceContract,boundary);
assert.equal(graphModule.rosterWorkflowChoiceContractV1({state,workId:work.experimentOwnerId}),null,
  'ordinary parent input repair still owns its complete original operation');
console.log(JSON.stringify({pass:true,actualPaidOrder:work.resultRef,targetOperation:boundary.operation,
  duplicateRejected:true,validChoicePreserved:true,coldRepairInherits:true,providerCalls:0,nativeCalls:0}));
