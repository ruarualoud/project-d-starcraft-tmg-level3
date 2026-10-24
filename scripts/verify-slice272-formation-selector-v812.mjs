// Real selector error was incorrectly diagnosed as a generic dependency error;
// its instruction encouraged the very empty fromStepId that kept failing.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {prepareRosterWorkflowMethodCompilationV1,projectRosterUnissuedOrderRecoveryV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.resultRef==='95f1f7740e4987343215f0b059e68eddb62cd68b0cb27ff78b1f4682662d4e44');
assert.ok(work);const result=await get(work.resultRef),failure=result.value.failedWorkOrders[0],order=failure.order;
const frozen=JSON.stringify(order),context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:get});
const compile=o=>compileRosterWorkflowExperimentV1({order:o,scope:work.bindings,namespace:'v812-fixture',evidenceDirectory:state.evidence,...context});
let error;try{compile(order);}catch(e){error=e;}
assert.equal(error?.code,'ROSTER_WORKFLOW_FORMATION_SELECTOR_CONTRACT','the selector needs its own corrective interface, not the opposite generic binding instruction');
assert.ok(error.detail.issues.some(i=>i.code==='empty_prior_step_selector'));
assert.ok(error.detail.issues.some(i=>i.code==='selection_is_not_a_field_binding'));
assert.ok(error.detail.savedSourceHints.some(h=>h.evidenceNumber===1174));
assert.equal(error.detail.sourceContract,'static_formation_selector_v2');
// Fixture-only explicit choice using the saved receipt and option already named
// by the actual model; no product answer is rewritten, no Native call occurs.
const fixed=structuredClone(order),args=JSON.parse(fixed.steps[0].argumentsJson);
args.selections=[{sourceEvidenceNumber:1174,optionIndex:0}];fixed.steps[0].argumentsJson=JSON.stringify(args);fixed.steps[0].bindings=[];
const jobs=compile(fixed);assert.equal(jobs.length,1);assert.deepEqual(jobs[0].inputs.request.value.args.selections,args.selections);
const competing=structuredClone(fixed),mixed=JSON.parse(competing.steps[0].argumentsJson);
mixed.selections[0].fromStepId='prior';competing.steps[0].argumentsJson=JSON.stringify(mixed);
assert.throws(()=>compile(competing),e=>e.code==='ROSTER_WORKFLOW_FORMATION_SELECTOR_CONTRACT');
const recovery=projectRosterUnissuedOrderRecoveryV1({state,work,failure,index:0,limit:3,validateOrder:compile});
assert.equal(recovery?.contractRecovery.kind,'formation_selector_diagnostic_v812');assert.equal(recovery.contractRecovery.additionalConfirmationLimit,1);
assert.equal(recovery.contractRecovery.historyReset,false);
assert.equal(projectRosterUnissuedOrderRecoveryV1({state,work:{...work,contractRecovery:recovery.contractRecovery},failure,index:0,limit:3,validateOrder:compile}),null);
assert.equal(JSON.stringify(order),frozen);
console.log(JSON.stringify({pass:true,actualPaidOrder:true,sharedCompiler:true,selectorNotGenericBinding:true,
  explicitSavedSelectionCompiles:true,ambiguousSelectionRejected:true,oneDistinctSourceRecovery:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
