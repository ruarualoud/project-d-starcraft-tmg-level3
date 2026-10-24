// Actual v820: a repaired order kept the old reviewer’s invalid opaque-identity
// requirement and scheduled redundant measurements despite delivered scene facts.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterExperimentSourceReviewV1,createRosterExperimentReviewRevisionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {rosterOrderRepairContextV1} from '../packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v821-gate-'+Date.now()+'.json';
const memory=new Map(),get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{
  const result={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,6)};
  await fs.writeFile(resultFile,JSON.stringify(result,null,2));console.error(JSON.stringify(result));process.exitCode=1;
});
console.log(JSON.stringify({stage:'started',resultFile}));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const owner=state.work.find(w=>w.id.endsWith(':method:c8748d16f139bf05'));
const previous=state.work.find(w=>w.id===owner.id+':source-review:v2');
const oldRevision=state.work.find(w=>w.experimentReviewOf===owner.id);
const context=rosterOrderRepairContextV1(oldRevision);
assert.deepEqual(context.sourceReview,oldRevision.inputs.sourceReview);
assert.deepEqual(context.comparisonPurpose,oldRevision.inputs.comparisonPurpose);
assert.ok(Object.keys(context).some(key=>/^failedSourceClaim/.test(key)));
const store={get};
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store});
assert.ok(next?.sourceReviewRecheckOf===previous.id,'old failed review must return to independent source judgment before its repair buys more measurements');
assert.equal(next.sourceReviewRepairHandoff?.nativeReplay,false);
assert.equal(next.sourceReviewRepairHandoff?.factsApproved,false);
assert.ok(next.sourceReviewRepairHandoff?.retiredRootIds.includes(oldRevision.id));
assert.ok(next.materialClaims.some(c=>c.reusedResultRef),'already passed claims must be reused');
assert.ok(next.claimReviews.length<previous.materialClaimReviewIds.length,'only failed assertions are rechecked');
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
let saved=structuredClone(state);
const localStore={load:async()=>structuredClone(saved),save:async value=>{saved=structuredClone(value);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store:localStore,execute:async()=>{throw Error('unexpected execution');}});
for(const projection of sourceProjections)if(!saved.evidence.some(e=>e.id===projection.id))
  await workflow.dispatch({type:'publish_evidence',...projection});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
const after=await workflow.inspect();
const held=after.work.filter(w=>w.reviewRepairSupersession?.replacementReviewId===job.id);
assert.ok(held.length>=5,'pending descendants must be retired in the same transaction, not left runnable');
assert.ok(held.every(w=>w.status==='superseded'));
for(const w of held){const old=state.work.find(x=>x.id===w.id);assert.equal(w.resultRef,old.resultRef);assert.deepEqual(w.operationState,old.operationState);}
assert.equal(after.draftRef,state.draftRef);assert.equal(after.draftRevision,state.draftRevision);
assert.equal(after.work.find(w=>w.id===previous.id).resultRef,previous.resultRef);
assert.equal(await createRosterExperimentSourceReviewV1({state:after,owner,result:await get(owner.resultRef),store}),null,'cold resume must not create a second recheck');
// No new author revision may run until the independent recheck actually finishes.
assert.equal(await createRosterExperimentReviewRevisionV1({state:after,owner,store}),null);
// Never supersede an unreconciled dispatch.
const busy=structuredClone(state);busy.work.find(w=>w.id===oldRevision.id).operationState.pending={requestRef:'in-flight'};
assert.equal(await createRosterExperimentSourceReviewV1({state:busy,owner:busy.work.find(w=>w.id===owner.id),result:await get(owner.resultRef),store}),null);
assert.equal(hash(state),before,'production checkpoint, raw replies, costs and original verdicts remain untouched');
const report={pass:true,oldContractNegativeJudgmentRechecked:true,passedClaimsReused:true,
  pendingRepairTreeRetiredAtomically:true,completedFactsAndCountersRetained:true,coldIdempotent:true,
  pendingDispatchProtected:true,providerCalls:0,nativeCalls:0,productionWrites:0,planApproved:false};
await fs.writeFile(resultFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
