// Concrete v828 regression: a startup scan re-opened an obsolete ancestor and
// retired its already-completed corrected conclusion. Exercise the WHOLE saved
// lineage, not only an independently selected leaf. No Provider/Native calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {rosterSourceReviewNeedsContractCheckV1} from '../packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs';
const [root,reportRef,priorFile,onlyPattern]=process.argv.slice(2),memory=new Map();
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const actual=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),originalHash=hash(actual),report=await get(reportRef);
const replacement=actual.work.find(w=>w.id===report.replacementReviewId);
// materialClaimReviewIds also contains reused OLD passes. Only the atomic
// enqueue receipt identifies which jobs this replacement actually created.
const replacementIds=new Set(actual.events.find(e=>e.type==='work_enqueued'&&e.workIds.includes(replacement.id)).workIds);
const baseline=structuredClone(actual);
baseline.work=baseline.work.filter(w=>!replacementIds.has(w.id));
for(const saved of report.originalWork){const w=baseline.work.find(w=>w.id===saved.id);w.status=saved.status;delete w.reviewRepairSupersession;}
const completedId=report.retiredRootIds.find(id=>report.originalWork.some(w=>w.id===id&&w.status==='evidence_ready'));
assert.ok(completedId);
const currentReview=baseline.work.findLast(w=>w.experimentSourceReviewOf===completedId&&w.status!=='superseded');
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):{cases:[]},cases=[];
const test=async(name,fn)=>{const passed=prior.cases.find(c=>c.name===name&&c.pass);
 if(passed){cases.push({...passed,reused:true});return;}
 if(onlyPattern&&!new RegExp(onlyPattern).test(name)){const previous=prior.cases.find(c=>c.name===name);if(previous)cases.push(previous);return;}
 try{await fn();cases.push({name,pass:true});}catch(error){cases.push({name,pass:false,error:error.message});}};
const harness=async input=>{let saved=structuredClone(input);const store={get,load:async()=>structuredClone(saved),save:async s=>{saved=structuredClone(s);},
 put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
 const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION_ALLOWED');}});
 return {workflow,store};};
const create=async(state,id)=>{const owner=state.work.find(w=>w.id===id);return createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});};
await test('exact enqueue: completed revision prevents obsolete ancestor migration',async()=>{
 assert.equal(await create(baseline,report.ownerId),null);
});
await test('exact enqueue: complete startup scan selects only latest corrected conclusion',async()=>{
 const selected=[];
 for(const old of baseline.work.filter(rosterSourceReviewNeedsContractCheckV1)){
   const owner=baseline.work.find(w=>w.id===old.experimentSourceReviewOf);
   if(owner?.status!=='evidence_ready'||!owner.inputs?.comparisonPurpose||!Object.entries(owner.bindings).every(([k,v])=>baseline.scope[k]===v))continue;
   const next=await create(baseline,owner.id);if(next?.sourceReviewRepairHandoff)selected.push(next);
 }
 assert.equal(selected.length,1);assert.equal(selected[0].sourceReviewRecheckOf,currentReview.id);
 assert.equal(selected[0].claimReviews.length,1);assert.equal(selected[0].materialClaims.filter(c=>c.reusedResultRef).length,7);
});
await test('exact enqueue: lineage ownership does not depend on chronological array order',async()=>{
 const state=structuredClone(baseline),child=state.work.find(w=>w.id===completedId);
 state.work=state.work.filter(w=>w.id!==completedId);state.work.unshift(child);
 assert.equal(await create(state,report.ownerId),null);
});
await test('exact enqueue: uncompleted revision remains eligible for actual contract repair',async()=>{
 const state=structuredClone(baseline),child=state.work.find(w=>w.id===completedId);
 child.status='needs_model_choice';delete child.resultRef;
 assert.ok((await create(state,report.ownerId))?.sourceReviewRepairHandoff);
});
await test('exact enqueue: enqueue refuses stale projection if revision completes before commit',async()=>{
 const staging=structuredClone(baseline),child=staging.work.find(w=>w.id===completedId);
 child.status='needs_model_choice';delete child.resultRef;
 const next=await create(staging,report.ownerId),{workflow}=await harness(baseline);
 const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
 for(const projection of sourceProjections)if(!baseline.evidence.some(e=>e.id===projection.id))await workflow.dispatch({type:'publish_evidence',...projection});
 await assert.rejects(workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]}),e=>e.code==='ROSTER_SOURCE_REPAIR_HAS_COMPLETED_REVISION');
 assert.equal((await workflow.inspect()).work.find(w=>w.id===completedId).status,'evidence_ready');
});
await test('reconcile restores exact saved statuses without replay or rewritten answers',async()=>{
 const {workflow}=await harness(actual),beforeView=await workflow.inspect();
 const result=await workflow.dispatch({type:'reconcile_source_review_lineage'}),after=await workflow.inspect();
 assert.equal(result.restored.length,1);assert.equal(result.providerCalls,0);assert.equal(result.toolExecutions,0);
 for(const original of report.originalWork){const before=actual.work.find(w=>w.id===original.id),restored=after.work.find(w=>w.id===original.id);
   assert.equal(restored.status,original.status);assert.equal(restored.resultRef,before.resultRef);assert.equal(restored.attempt,before.attempt);
   assert.deepEqual(restored.operationState,before.operationState);assert.equal(restored.reviewRepairSupersession,undefined);
 }
 for(const id of replacementIds){const old=actual.work.find(w=>w.id===id),kept=after.work.find(w=>w.id===id);
   assert.equal(kept.status,'superseded');assert.equal(kept.resultRef,old.resultRef);assert.deepEqual(kept.operationState,old.operationState);}
 assert.equal(after.draftRef,actual.draftRef);assert.equal(after.draftRevision,actual.draftRevision);assert.equal(after.acceptanceGranted,false);
 // inspect() adds availability/read-path projections. Compare the same API on
 // both sides, not its enriched view against the raw persisted evidence array.
 assert.deepEqual(after.evidence,beforeView.evidence);
});
await test('cold restore is idempotent and selects latest review',async()=>{
 const {workflow,store}=await harness(actual);await workflow.dispatch({type:'reconcile_source_review_lineage'});
 const cold=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION_ALLOWED');}});
 assert.equal((await cold.dispatch({type:'reconcile_source_review_lineage'})).restored.length,0);
 const state=await cold.inspect();assert.equal(await create(state,report.ownerId),null);
 assert.equal((await create(state,completedId)).sourceReviewRecheckOf,currentReview.id);
});
for(const [name,mutate]of [
 ['replacement pending',s=>{s.work.find(w=>replacementIds.has(w.id)&&w.id!==replacement.id).operationState.pending={requestRef:'in-flight'};}],
 ['restored child pending',s=>{s.work.find(w=>w.id===completedId).operationState.pending={requestRef:'in-flight'};}],
 ['saved result has changed',s=>{s.work.find(w=>w.id===completedId).resultRef='different-result';}],
 ['saved attempt has changed',s=>{s.work.find(w=>w.id===completedId).attempt++;}],
 ['different run scope',s=>{s.scope.plan='different-plan';}],
 ['supersession belongs to another report',s=>{s.work.find(w=>w.id===completedId).reviewRepairSupersession.reportRef='other-report';}],
 ])await test('reconcile refuses '+name,async()=>{
 const state=structuredClone(actual);mutate(state);const {workflow}=await harness(state),before=await workflow.inspect();
 assert.equal((await workflow.dispatch({type:'reconcile_source_review_lineage'})).restored.length,0);
 assert.deepEqual((await workflow.inspect()).work,before.work);
});
await test('original production remains untouched',async()=>assert.equal(hash(JSON.parse(await fs.readFile(root+'/workflow.json','utf8'))),originalHash));
const output={pass:cases.every(c=>c.pass),cases,providerCalls:0,nativeCalls:0,productionWrites:0,sourceOrStrategyApproved:false};
const file=`build/slice272-v829-lineage-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(output,null,2));
console.log(JSON.stringify({file,...output,cases:cases.map(c=>({...c,error:c.error?.slice(0,300)}))}));if(!output.pass)process.exitCode=1;
