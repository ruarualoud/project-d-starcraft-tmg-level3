// P5 observed-choice was never dispatched: a formation result has stateRef,
// not inspect.actionSpace. Repair its exact source pointer without new billing.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const before=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(before);
const failed=state.work.find(w=>w.status==='needs_repair'&&w.failure?.code==='ROSTER_WORKFLOW_EVIDENCE_NOT_READY'&&w.choiceOf);
assert.ok(failed,'actual unissued choice stop required');
const pending=state.work.find(w=>w.id===failed.choiceOf);
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const value=(await read(pending.resultRef)).value;
const projector=createRosterWorkflowLaboratoryExecutorV1({laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source})},store:{}});
const choice=projector.projectChoice(value);
assert.equal(choice.sourceReads[0].menuPointer,'/stateRef','a non-inspect predecessor requires inspecting its state, not reading a nonexistent menu');
assert.equal(choice.sourceReads[0].requiresInspect,true);
let snapshot={schema:state.schema,scope:state.scope,evidence:state.evidence,work:[structuredClone(failed)],reads:[],events:[],acceptanceGranted:false};
const memory=new Map(),store={load:async()=>snapshot,save:async s=>{snapshot=structuredClone(s);},get:async ref=>memory.has(ref)?memory.get(ref):read(ref),
  put:async v=>{const ref='test:'+memory.size;memory.set(ref,structuredClone(v));return ref;}};
let dispatched=0;
const workflow=await createRosterDecisionWorkflowV1({store,execute:async assignment=>{dispatched++;
  assert.equal(assignment.inputs.observedSource0.value.schema,'roster_workflow_state_ref_v1');
  return {kind:'proposal',value:{observed:true},conditions:[]};}});
const priorAttempt=failed.attempt;
await workflow.dispatch({type:'rebind_unissued_evidence_input',workId:failed.id,inputName:'observedSource0',
  sourceEvidenceId:failed.inputs.observedSource0.id,pointer:'/stateRef',reason:'correct source-kind contract'});
let next=await workflow.inspect();assert.equal(next.work[0].status,'ready');assert.equal(next.work[0].attempt,priorAttempt);
assert.equal(next.work[0].inputBindingHistory[0].input.pointer,'/receipt/actionSpace');
await workflow.dispatch({type:'run_ready',concurrency:1});next=await workflow.inspect();
assert.equal(dispatched,1);assert.equal(next.work[0].status,'evidence_ready');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:true,actualWork:failed.id,nonMenuSourceRequiresInspect:true,
  unissuedInputRecovered:true,oldPointerAndAttemptsPreserved:true,providerCalls:0,productionWrites:0}));
