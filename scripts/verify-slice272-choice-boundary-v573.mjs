// Actual83 guessed a future menu index. Exercise the PRODUCT scheduler, with
// saved Native menus and a scripted model/Native mutation spy (not Rules proof).
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkspaceRunV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const input=path.resolve(process.argv[2]),sourceRoot=path.join(input,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(sourceRoot,'workflow.json'),'utf8'),source=JSON.parse(before);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const artifact=async ref=>read(path.join(sourceRoot,'artifacts',ref+'.json'));
const originalWork=source.work.find(w=>w.id===source.evidence[278].id.replace(/^tool(?:-view)?:/,''));
const original=(await artifact(originalWork.resultRef)).value;
const wrong=(await artifact('e1d05323c7fa5723169e0fd811f959752c5bb231de9a75273a22a98ea9a5552d')).value;
const reply=await read(path.join(input,'83.reply.json')),order=structuredClone(reply.output.workOrders[0]);
const selected=JSON.parse(order.steps[1].argumentsJson).selection;
const directory=await fs.mkdtemp(path.join(process.cwd(),'build/slice272-choice-v573-'));
let nativeCalls=0,modelCalls=0,inspectCalls=0,choicePrompt,appliedRequest;
const successor='a'.repeat(64);
const laboratory={labDescriptor:()=>({sourceStateHash:source.scope.source}),
  describeQueryContext:async()=>{inspectCalls++;return structuredClone(wrong.receipt);},
  runScenarioBranch:async args=>{nativeCalls++;appliedRequest=args;return {resultStatus:'ok',branchKind:'native_action',
    sourceStateHash:source.scope.source,baseStateHash:args.base.branchStateHash,branchStateHash:successor};},
  restoreNativeActionBranch:async()=>{}};
const deliberation={deliberate:async request=>{
  modelCalls++;choicePrompt=request;
  // Model chooses its original intended Marine domain AFTER the real menu
  // has arrived. Its source read is automatic but still requires confirmation.
  return {output:{action:'finish',publicReason:'Recorded menu shows index0 is Marauder. Select Marine deploy from original pre-deployment inspect.',
    reads:[],catalogueQueries:[],unresolvedQuestions:[],conclusion:null,workOrders:[{
      orderId:'observed-marine-choice',purpose:order.purpose,scenarioAssumptions:order.scenarioAssumptions,
      steps:[{stepId:'deploy',operation:'native_action',argumentsJson:JSON.stringify({selection:{sourceEvidenceNumber:2,
        kind:'domain',index:2,parameters:selected.parameters}}),bindings:[],guards:[],publicReason:'Explicit source and menu choice'}],
      completionStepId:'deploy',stopAndReturnToModelWhen:'After Native validation'}]},receipt:{modelVersion:'scripted-offline',paidProviderCall:false}};
}};
const open=()=>createRosterDecisionWorkspaceRunV1({directory,laboratory,deliberation,sessionId:'actual83-choice-proof',scope:source.scope});
let run=await open();
// The selected saved source must be an actual completed tool work, not prose.
const inspectOrder={orderId:'original-menu',purpose:'Retain original inspect',scenarioAssumptions:[],steps:[{
  stepId:'saved-original-inspect',operation:'inspect',argumentsJson:'{}',bindings:[],guards:[],publicReason:'Retained source'}],stopAndReturnToModelWhen:'After read',completionStepId:''};
// Load it through Native's read-only adapter, with exact saved result.
const savedDescribe=laboratory.describeQueryContext;
laboratory.describeQueryContext=async()=>structuredClone(original.receipt);
const jobsOriginal=compileRosterWorkflowExperimentV1({order:inspectOrder,scope:source.scope,namespace:'saved'});
await run.enqueue(jobsOriginal);await run.advance({concurrency:1});
laboratory.describeQueryContext=savedDescribe;
// Native source identity is the actual compiled work name.
const local=await run.inspect();const originalNumber=local.evidence.findIndex(e=>e.id==='tool:saved:saved-original-inspect')+1;
// The model adapter resolves this number at dispatch without changing its choice.
deliberation.deliberate=(()=>{const prior=deliberation.deliberate;return async request=>{
  const result=await prior(request);const arg=JSON.parse(result.output.workOrders[0].steps[0].argumentsJson);
  arg.selection.sourceEvidenceNumber=originalNumber;result.output.workOrders[0].steps[0].argumentsJson=JSON.stringify(arg);return result;
};})();
order.steps[0].argumentsJson=JSON.stringify({stateRef:wrong.stateRef});order.steps[0].bindings=[];
await run.enqueue(compileRosterWorkflowExperimentV1({order,scope:source.scope,namespace:'actual83',evidenceDirectory:local.evidence}));
await run.advance({concurrency:1});await run.advance({concurrency:1});
assert.equal(nativeCalls,0,'unobserved future index must yield to a model choice BEFORE Native execution');
let state=await run.inspect();const pending=state.work.find(w=>w.id==='actual83:deploy-action');
assert.equal((await run.readArtifact(pending.resultRef)).value.status,'awaiting_model_choice');
assert.equal(state.work.filter(w=>w.choiceOf===pending.id).length,1);
// Cold resume must retain that choice point without replaying its inspect.
const priorInspects=inspectCalls;run=await open();
for(let i=0;i<8;i++){await run.advance({concurrency:1});state=await run.inspect();if(state.work.find(w=>w.id==='actual83:inspect-after-deploy').status==='evidence_ready')break;}
assert.equal(nativeCalls,1);assert.equal(modelCalls,2,'one source read confirmation, then the explicit choice, no repair cycle');
assert.equal(appliedRequest.base.branchStateHash,original.receipt.baseStateHash);
assert.equal(JSON.parse(appliedRequest.argumentsJson).domainId,original.receipt.actionSpace.parameterDomains[2].domainId);
assert.equal(state.work.find(w=>w.id==='actual83:deploy-action').status,'evidence_ready');
assert.equal(state.work.filter(w=>w.choiceOf===pending.id).length,1);
assert.equal(state.work.filter(w=>w.repairOf).length,0,'normal observation/choice is not failure repair');
assert.equal(inspectCalls,priorInspects+1,'only dependent successor inspect executes after resume');
assert.equal(await fs.readFile(path.join(sourceRoot,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:true,directory,actual83PrefixPaused:true,normalChoiceNotErrorRepair:true,
  realProvider:false,realNativeMutation:false,savedNativeMenus:true,coldResumeNoReplay:true,productionWrites:0}));
