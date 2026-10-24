// v821's atomic calls finished before safe stop, without their scene facts.
// Corrected input must recheck only those failed judgments, not rerun passes or Native.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v823-gate-'+Date.now()+'.json',memory=new Map();
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{const out={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.error(JSON.stringify(out));process.exitCode=1;});
console.log(JSON.stringify({stage:'started',resultFile}));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const owner=state.work.find(w=>w.id.endsWith(':method:c8748d16f139bf05'));
const latest=state.work.findLast(w=>w.experimentSourceReviewOf===owner.id),before=hash(state);
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert.equal(next?.sourceReviewRecheckOf,latest.id,'completed failed atomic checks with omitted facts require their own one-time recheck, not the original old root');
assert.equal(next.claimReviews.length,2,'four passed assertions remain reused');
assert.equal(next.materialClaims.filter(c=>c.reusedResultRef).length,4);
assert.equal(next.sourceReviewRepairHandoff.retiredRootIds.length,0,'do not retire the already-retired old branch twice');
let saved=structuredClone(state);
const store={get,load:async()=>structuredClone(saved),save:async value=>{saved=structuredClone(value);},
  put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('unexpected execution');}});
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
for(const p of sourceProjections)if(!saved.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
const after=await workflow.inspect();
assert.equal(after.work.find(w=>w.id===latest.id).status,'superseded','old aggregate must not consume faulty negatives while new checks run');
assert.equal(await createRosterExperimentSourceReviewV1({state:after,owner,result:await get(owner.resultRef),store}),null);
assert.equal(after.draftRef,state.draftRef);assert.equal(hash(state),before);
const out={pass:true,latestReviewSelected:true,onlyTwoFailedItemsRechecked:true,fourPassesReused:true,
  unissuedAggregateSuperseded:true,coldIdempotent:true,providerCalls:0,nativeCalls:0,productionWrites:0,planApproved:false};
await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.log(JSON.stringify(out));
