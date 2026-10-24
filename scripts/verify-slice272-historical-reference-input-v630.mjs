// Actual P4 comparison was superseded before dispatch because it deliberately
// read r6 Plan/decision evidence while evaluating current r7. No model failed.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const actual=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const cancelled=actual.work.find(w=>w.id==='p4-fact-recording-v629:r7');assert(cancelled);assert.equal(cancelled.status,'superseded');assert.equal(cancelled.resultRef,null);
const memory=new Map();let state={schema:actual.schema,scope:actual.scope,draftRef:actual.draftRef,draftRevision:actual.draftRevision,
  evidence:actual.evidence,work:[],reads:[],events:[],acceptanceGranted:false},delivered;
const store={load:async()=>state,save:async v=>{state=structuredClone(v);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async assignment=>{delivered=assignment;
  return {kind:'interpretation',value:{fixtureOnly:true},conditions:['Isolated execution capture, not a model decision']};}});
const input=cancelled.inputs.previousDraft,source=actual.evidence.find(e=>e.id===input.id),sourceBody=await store.get(source.artifactRef);
assert.notEqual(source.bindings.plan,state.scope.plan);
const work={id:'isolated-history-v630',role:'roster_workflow_strategy_decision',bindings:actual.scope,
  inputs:{previousDraft:{...input,scopeUsage:'historical_reference'},currentDraft:{source:'evidence',id:`draft:r${actual.draftRevision}:summary`,pointer:''}}};
await workflow.dispatch({type:'enqueue',work:[work]});
assert.equal((await workflow.inspect()).work[0].status,'ready','BUG: an explicit historical comparison is cancelled as if it required current-source evidence');
await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
assert(delivered);assert.equal(delivered.inputs.previousDraft.scopeUsage,'historical_reference');
assert.equal(delivered.inputs.previousDraft.validity,'historical');assert.equal(delivered.inputs.previousDraft.currentApplicability,'not_assessed');
assert.deepEqual(delivered.inputs.previousDraft.originalBindings,source.bindings);assert.deepEqual(delivered.inputs.previousDraft.value,sourceBody);
assert.equal(delivered.inputs.currentDraft.validity,'current');
const ordinary={...work,id:'isolated-current-dependency-v630',inputs:{previousDraft:{...input}}};
await workflow.dispatch({type:'enqueue',work:[ordinary]});assert.equal((await workflow.inspect()).work.find(w=>w.id===ordinary.id).status,'superseded');
await assert.rejects(()=>workflow.dispatch({type:'enqueue',work:[{...work,id:'isolated-illegal-tool-history-v630',role:'roster_workflow_tool'}]}),
  e=>e.code==='ROSTER_WORKFLOW_HISTORY_REFERENCE_READ_ROLE_REQUIRED');
await assert.rejects(()=>workflow.dispatch({type:'enqueue',work:[{...work,id:'isolated-wrong-current-owner-v630',bindings:{...actual.scope,plan:'different-plan'}}]}),
  e=>e.code==='ROSTER_WORKFLOW_BINDINGS_INVALID');
await assert.rejects(()=>workflow.dispatch({type:'enqueue',work:[{...work,id:'isolated-unknown-input-use-v630',inputs:{previousDraft:{...input,scopeUsage:'guess'}}}]}),
  e=>e.code==='ROSTER_WORKFLOW_INPUT_SCOPE_USAGE_INVALID');
assert.deepEqual(await store.get(source.artifactRef),sourceBody);
console.log(JSON.stringify({passed:true,actualHistoricalComparisonCanDispatch:true,originalVersionIdentityRetained:true,
  currentDependenciesStillStrict:true,nativeToolCannotUseHistoricalMode:true,unknownUsageRejected:true,
  oldCancelledWorkNotReplayed:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
