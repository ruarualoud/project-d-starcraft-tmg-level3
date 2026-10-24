// Concrete regression: actual r19 choice/repair repeatedly rebuilt an inspect
// instead of consuming the observed immutable menu. No Provider/Native writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowChoiceObservationV1} from '../packages/roster-planning-workspace/roster-workflow-choice-observation-v1.mjs';
import {rosterOrderRepairContextV1} from '../packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs';
const dir=process.argv[2],read=async ref=>JSON.parse(await fs.readFile(`${dir}/artifacts/${ref}.json`,'utf8'));
const request=await read('8a51a7b1aa4d996e2b8234b459d1f1eaebabff7d7f445735bf77dfef2b3521e5');
const next=prepareRosterStrategyRepairRequestV1(request);
assert.equal(next.responseFormat.schemaName,'roster_native_choice_command_v1','saved-menu correction must not ask for another full work order');
const command={action:'select',publicReason:'Injected choice: select the actual observed finite entry.',reads:[],catalogueQueries:[],
 selection:{sourceEvidenceNumber:1850,kind:'finite',index:0,parametersJson:null,outcomeJson:null},conclusion:null,unresolvedQuestions:[]};
const decoded=projectRosterStrategyRepairOutputV1({request:next,output:command});
assert.deepEqual(decoded.errors,[]);
const original=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.task.value.failedOrder;
assert.deepEqual(decoded.output.workOrders[0].experimentScope,original.experimentScope);
assert.deepEqual(decoded.output.workOrders[0].steps[0].bindings,[]);
assert.deepEqual(JSON.parse(decoded.output.workOrders[0].steps[0].argumentsJson),{selection:{sourceEvidenceNumber:1850,kind:'finite',index:0}});
const state=JSON.parse(await fs.readFile(`${dir}/workflow.json`,'utf8'));
const jobs=compileRosterWorkflowExperimentV1({order:decoded.output.workOrders[0],scope:request.promptNodes.find(n=>n.kind==='workflow_role_assignment').scope,
 namespace:'v949-offline-choice',evidenceDirectory:state.evidence});
assert.equal(jobs.length,1);assert.equal(jobs[0].inputs.request.value.modelChoiceSources,undefined);
assert.equal(jobs[0].inputs.request.value.nativeActionSource,'nativeActionSource');
assert.ok(jobs[0].inputs.nativeActionSource.id.endsWith(':inspect-start-of-round'));
for(const selection of [{...command.selection,fromStepId:'inspect-start-of-round'},{...command.selection,sourceEvidenceNumber:0},
 {...command.selection,parametersJson:'{}'},{...command.selection,kind:'domain',parametersJson:null}])
 assert.ok(projectRosterStrategyRepairOutputV1({request:next,output:{...command,selection}}).errors.length);
const readCommand={...command,action:'read',selection:null,reads:[{evidenceNumber:1850,pointer:'/receipt/actionSpace/finiteActions/0'}]};
assert.equal(projectRosterStrategyRepairOutputV1({request:next,output:readCommand}).output.action,'read');
const returned={...command,action:'conclude',selection:null,conclusion:{status:'strategy_required',answer:'Different parent needed.',evidenceNumbers:[1850],nativeFacts:[],conditions:[],hypothesisAssessments:[]},unresolvedQuestions:['Need original owner to choose a different scene.']};
assert.equal(projectRosterStrategyRepairOutputV1({request:next,output:returned}).output.conclusion.status,'strategy_required');
assert.deepEqual(projectRosterStrategyRepairOutputV1({request:next,output:command}).output.workOrders[0].steps[0].guards,original.steps[0].guards);
const pending=state.work.find(w=>w.resultRef==='f01c87354ce8cdf6bac0c1a69c13b337726aec1d5689609d2efe2bbfea0a8609');
const observed=createRosterWorkflowChoiceObservationV1({work:pending,choice:(await read(pending.resultRef)).value});
assert.ok(observed.inputs.nativeChoiceTemplate);
const choiceRequest=await read('5d08b1c8316fe490a6a08179132048d57c69969aaf67f031b4158702dbc1f074');
choiceRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.nativeChoiceTemplate=observed.inputs.nativeChoiceTemplate;
assert.equal(prepareRosterStrategyRepairRequestV1(choiceRequest).responseFormat.schemaName,'roster_native_choice_command_v1');
const repairContext=rosterOrderRepairContextV1({inputs:observed.inputs});
assert.deepEqual(repairContext.observedSource0,observed.inputs.observedSource0);
assert.deepEqual(repairContext.nativeChoiceTemplate,observed.inputs.nativeChoiceTemplate);
const guarded=structuredClone(pending);guarded.inputs.request.value.resultGuards=[{name:'guard'}];
assert.equal(createRosterWorkflowChoiceObservationV1({work:guarded,choice:(await read(pending.resultRef)).value}).inputs.nativeChoiceTemplate,undefined);
console.log(JSON.stringify({pass:true,checks:['actual_request_typed_choice','single_saved_source_no_reinspect','immutable_scope_and_guards','invalid_commands_rejected','read_and_owner_return'],providerCalls:0,nativeCalls:0,productionWrites:0,oldPromptChars:JSON.stringify(request.promptNodes).length,newPromptChars:JSON.stringify(next.promptNodes).length}));
