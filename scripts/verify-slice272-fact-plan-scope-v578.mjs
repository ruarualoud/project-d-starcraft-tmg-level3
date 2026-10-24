// Real r0/r1 Native discoveries were superseded by Plan-only changes despite
// identical army/rules/map/source. Retain facts, invalidate intent and failures.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
const bytes=await fs.readFile(path.join(base,'workflow.json'),'utf8'),source=JSON.parse(bytes);
const old=source.work.find(w=>w.id==='discovery:r1:context');assert.equal(old.status,'superseded');
const model={id:'intent',role:'roster_workflow_experiment_planner',bindings:source.scope,inputs:{},status:'evidence_ready',resultRef:'model'};
const failed={id:'failed',role:'roster_workflow_tool',bindings:source.scope,inputs:{},status:'needs_model_choice',resultRef:'failure'};
let snapshot={schema:source.schema,scope:structuredClone(source.scope),draftRevision:2,evidence:source.evidence.filter(e=>e.id==='tool:'+old.id||e.id==='tool-view:'+old.id),
  work:structuredClone([old,model,failed]),reads:[],events:[],acceptanceGranted:false};
const memory=new Map([['model',{kind:'proposal',value:{},conditions:[]}],['failure',{kind:'interpretation',continuation:true,value:{status:'returned_to_model'},conditions:[]}]]);
const store={load:async()=>snapshot,save:async s=>{snapshot=structuredClone(s);},
  get:async ref=>memory.has(ref)?memory.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref='fixture:'+memory.size;memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION_EXPECTED');}});
let state=await workflow.inspect();
assert.equal(state.work.find(w=>w.id===old.id).status,'evidence_ready','a completed same-source fact must survive a Plan-only change');
assert.equal(Object.hasOwn(state.work.find(w=>w.id===old.id).bindings,'plan'),false);
assert.equal(state.work.find(w=>w.id===old.id).planningBindings.plan,old.bindings.plan);
assert.ok(state.evidence.every(e=>!Object.hasOwn(e.bindings,'plan')));
const order={orderId:'retained',purpose:'retained query',scenarioAssumptions:[],steps:[{stepId:'context',operation:'inspect',argumentsJson:JSON.stringify(old.inputs.request.value.args),bindings:[],guards:[],publicReason:'retained'}],stopAndReturnToModelWhen:'done'};
assert.doesNotThrow(()=>compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'discovery:r1',retainedWork:state.work,evidenceDirectory:state.evidence}));
await workflow.dispatch({type:'revise_scope',scope:{...state.scope,plan:'next-plan'}});state=await workflow.inspect();
assert.equal(state.work.find(w=>w.id===old.id).status,'evidence_ready');
assert.equal(state.work.find(w=>w.id==='intent').status,'superseded');
assert.equal(state.work.find(w=>w.id==='failed').status,'superseded','unfinished failure is not a retained fact');
await workflow.dispatch({type:'revise_scope',scope:{...state.scope,rules:'new-rules'}});state=await workflow.inspect();
assert.equal(state.work.find(w=>w.id===old.id).status,'superseded','changed rules still invalidate the old fact');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),bytes);
console.log(JSON.stringify({passed:true,actualFact:old.id,planOnlyFactRetained:true,intentAndFailureInvalidated:true,
  changedRulesInvalidated:true,originalBindingsPreserved:true,providerCalls:0,productionWrites:0}));
