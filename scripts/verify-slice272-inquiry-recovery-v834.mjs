// Current saved coverage -> bounded recheck -> pending consumer invalidation.
// In-memory product transactions only; no Provider/Native/production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {assessRosterSourceClaimReviewV1} from '../packages/roster-strategist/roster-workflow-source-claims-v1.mjs';
import * as stages from '../packages/roster-strategist/roster-inquiry-review-stage-v1.mjs';
const [root,priorFile]=process.argv.slice(2),copy=structuredClone;
const text=await fs.readFile(root+'/workflow.json','utf8'),original=JSON.parse(text);
const read=async r=>JSON.parse(await fs.readFile(root+'/artifacts/'+r+'.json','utf8'));
const review=original.work.find(w=>w.resultRef==='638669bb0f8511ba997cbbcbb50d6d4dff03dfe031ce92fc3403172a1a4cdfe5');
const owner=original.work.find(w=>w.id===review.experimentSourceReviewOf);
const consumer=original.work.find(w=>w.id==='product:after-teach:r4:subject-v1:investigation:decision');
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null,results=[];
async function test(name,fn){const p=prior?.results.find(r=>r.name===name&&r.pass);if(p){results.push({...p,inheritedFrom:priorFile});return;}
 try{results.push({name,pass:true,...await fn()});}catch(e){results.push({name,pass:false,error:e.message});}console.log(JSON.stringify(results.at(-1)));}
await test('旧错误阶段的通过记录不能继续授权策略',async()=>{
 const a=await assessRosterSourceClaimReviewV1({state:original,review,store:{get:read}});
 assert.equal(a.acceptedForStrategy,false);assert.equal(a.coverageStageMismatch.deliveredStage,'pre_game_roster_plan');
 assert.deepEqual(a.failedClaimReviewIds,[]); // Atomic source facts remain valid.
});
await test('同产品重审复用七条原子通过，原子退役未提交消费者，冷恢复不重复',async()=>{
 let state=copy(original);const memory=new Map();
 const store={load:async()=>copy(state),save:async s=>{state=copy(s);},get:async r=>memory.has(r)?copy(memory.get(r)):read(r),
   put:async v=>{const r=hash(v);memory.set(r,copy(v));return r;}};
 const next=await createRosterExperimentSourceReviewV1({state,owner,result:await read(owner.resultRef),store});
 assert(next?.id.endsWith(':source-recheck:inquiry-stage-v1'),'must name the exact affected review recovery');
 assert.equal(next.claimReviews.length,0);assert.equal(next.materialClaimReviewIds.length,7);
 assert(next.sourceReviewRepairHandoff.retiredRootIds.includes(consumer.id));
 const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION');}});
 const {sourceProjections,claimReviews=[],ruleFieldReviews=[],...job}=next;
 for(const p of sourceProjections)if(!state.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
 await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
 const retired=state.work.find(w=>w.id===consumer.id);assert.equal(retired.status,'superseded');
 assert.equal(retired.resultRef,consumer.resultRef);assert.deepEqual(retired.operationState,consumer.operationState);
 assert.equal(state.draftRef,original.draftRef);assert.equal(state.acceptanceGranted,false);
 for(const id of review.materialClaimReviewIds)assert.deepEqual(state.work.find(w=>w.id===id),original.work.find(w=>w.id===id));
 const cold=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION');}});
 assert.equal(await createRosterExperimentSourceReviewV1({state:await cold.inspect(),owner,result:await read(owner.resultRef),store}),null);
 const investigator=state.work.find(w=>w.id===consumer.id.slice(0,-':decision'.length));
 const id=stages.rosterInvestigationDecisionWorkIdV1({state,investigator,summaryIds:[owner.id,next.id]});
 assert.notEqual(id,consumer.id);assert.equal(id,stages.rosterInvestigationDecisionWorkIdV1({state,investigator,summaryIds:[owner.id,next.id]}));
 return {atomicChecksReused:7,retiredPendingConsumers:1};
});
await test('在途或已提交战略消费者不可被自动撤销',async()=>{
 for(const mode of ['pending','completed']){
   const state=copy(original),c=state.work.find(w=>w.id===consumer.id);
   if(mode==='pending')c.operationState.pending={requestRef:'unknown-provider-request'};else c.status='evidence_ready';
   assert.equal(await createRosterExperimentSourceReviewV1({state,owner,result:await read(owner.resultRef),store:{get:read}}),null);
 }
});
assert.equal(await fs.readFile(root+'/workflow.json','utf8'),text);
const report={pass:results.every(r=>r.pass),results,providerCalls:0,nativeCalls:0,productionWrites:0};
const file=`build/slice272-v834-inquiry-recovery-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(report,null,2));
console.log(JSON.stringify({file,...report}));if(!report.pass)process.exitCode=1;
