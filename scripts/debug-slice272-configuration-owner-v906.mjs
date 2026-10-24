// Actual B retained an unresolved configuration dispute. A new source contract
// must return once to that author, not re-run measurements or strand the job.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=new URL('../build/slice272-product-generation-v645-8aBuEV/workspace/decision-workflows/decision-7f410254-23ff-42dd-8470-e63d4e2c3dac/',import.meta.url);
const read=async ref=>JSON.parse(await readFile(new URL(`artifacts/${ref}.json`,root),'utf8'));
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const api=await import('../packages/roster-strategist/roster-configuration-reconsideration-v1.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
  const state=JSON.parse(await readFile(new URL('workflow.json',root),'utf8'));
  const original=state.work.find(w=>w.resultRef==='9aeddc05259d5aa685ed27dbba0d6a49503458064d9b46a7d97f72ec9385835e');
  const job=await api.projectRosterConfigurationReconsiderationV1?.({state,readArtifact:read});
  assert.ok(job,'resolved source contract must give the saved unresolved author one explicit reconsideration');
  assert.equal(job.reconsidersFrontierOf,original.id);assert.equal(job.investigationFrontierOf,original.investigationFrontierOf);
  assert.deepEqual(job.inputs.originalInvestigationScope,original.inputs.originalInvestigationScope);
  assert.deepEqual(job.inputs.investigationFrontier,original.inputs.investigationFrontier);
  assert.equal(job.inputs.configurationContractChange.value.version,1);
  assert.equal(job.inputs.previousStrategicDecision.id,'role:'+original.id);
  report.checks.push('actual retained B author gets one same-goal capability notification, original obligations and decision preserved');
  const inflight=structuredClone(state);inflight.work.push({id:'active',status:'running',inputs:{}});
  assert.equal(await api.projectRosterConfigurationReconsiderationV1({state:inflight,readArtifact:read}),null);
  const queued=structuredClone(state);queued.work.push({...job,status:'evidence_ready'});
  assert.equal(await api.projectRosterConfigurationReconsiderationV1({state:queued,readArtifact:read}),null);
  let local=structuredClone(state);const artifacts=new Map();
  const store={load:async()=>structuredClone(local),save:async v=>{local=structuredClone(v);},
    put:async v=>{const id=createHash('sha256').update(JSON.stringify(v)).digest('hex');artifacts.set(id,structuredClone(v));return id;},
    get:async id=>artifacts.has(id)?structuredClone(artifacts.get(id)):read(id)};
  let workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('not a paid retry')});
  await workflow.dispatch({type:'enqueue',work:[job]});
  const updated=await workflow.inspect(),goal=updated.work.find(w=>w.id===original.investigationFrontierOf);
  assert.equal(goal.investigationHandoff.decisionId,job.id);
  assert.ok(goal.investigationHandoff.previousDecisionIds.includes(original.id));
  assert.equal(updated.work.find(w=>w.id===job.id).status,'ready');
  assert.equal(updated.work.find(w=>w.id===original.id).resultRef,original.resultRef);
  workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('cold restore must not dispatch')});
  assert.equal(await api.projectRosterConfigurationReconsiderationV1({state:await workflow.inspect(),readArtifact:store.get}),null);
  report.checks.push('same core enqueue atomically transfers held owner; old reply retained, cold restore idempotent, in-flight/repeated grants rejected');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-configuration-owner-v906-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
