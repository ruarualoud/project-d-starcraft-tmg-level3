// Real formation input-repair work had no delegated contract at all, although
// observed-choice work for the same operation had one. A repair is not a new
// general experiment or permission to run the parent's later measurements.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {prepareRosterWorkflowMethodCompilationV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await readFile(`${root}/workflow.json`,'utf8')),work=state.work.at(-1);
assert(work.repairOf);
const result=await read('3013641b6c6c910a34ca54de5f26e65bcb73e182342b8cfa444566a155a09fee');
const order=result.value.workOrders[0],before=structuredClone(order);
const context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:read});
assert(context.choiceContract,'a real input-repair must carry the same operation authority as a choice');
assert.equal(context.choiceContract.targetWorkId,work.repairOf);
assert.equal(context.choiceContract.operation,'formation_scene');
assert.equal(context.choiceContract.delegationKind,'input_repair');
assert.equal(context.choiceContract.allowedOperations.includes('probability'),false);
const compile=o=>compileRosterWorkflowExperimentV1({order:o,scope:work.bindings,
  namespace:'v779-local-repair',evidenceDirectory:state.evidence,...context});
const generated=compile(order);assert.equal(generated[0].inputs.request.value.operation,'spatial');
const widened=structuredClone(order);
widened.steps.push({...widened.steps[0],stepId:'out-of-scope-measurement',operation:'probability'});
assert.throws(()=>compile(widened),e=>e.code==='ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED'
  &&e.detail.issue==='operation_not_delegated');
const child={id:'isolated-syntax-repair',orderRepairOf:work.id};
const inherited=rosterWorkflowChoiceContractV1({state:{...state,work:[...state.work,child]},workId:child.id});
assert.deepEqual(inherited,context.choiceContract);
assert.deepEqual(order,before);
assert.deepEqual(state,JSON.parse(await readFile(`${root}/workflow.json`,'utf8')));
console.log(JSON.stringify({pass:true,actualInputRepairScoped:true,validPrerequisiteRetained:true,
  downstreamMeasurementRejected:true,syntaxRepairCannotWiden:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
