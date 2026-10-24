// Reproduce e7627: failed source checks cannot consume the repaired input view
// because the old comparison-version-only recovery selector ignores them.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],resultFile=process.cwd()+'/build/slice272-v825-gate-'+Date.now()+'.json',memory=new Map();
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
process.on('uncaughtException',async error=>{const out={pass:false,message:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.error(JSON.stringify(out));process.exitCode=1;});
console.log(JSON.stringify({stage:'started',resultFile}));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const owner=state.work.find(w=>w.id.endsWith(':method:c8748d16f139bf05'));
const latest=state.work.findLast(w=>w.experimentSourceReviewOf===owner.id&&w.status!=='superseded');
const next=await createRosterExperimentSourceReviewV1({state,owner,result:await get(owner.resultRef),store:{get}});
assert.equal(next?.sourceReviewRecheckOf,latest.id,'the v4 negative judgments need the fixed presentation, without rerunning four accepted claims');
assert.equal(next.sourceReviewPresentationVersion,1);
assert.equal(next.comparisonValidityContractVersion,latest.comparisonValidityContractVersion,'no semantic contract bump');
assert.equal(next.materialClaimContractVersion,latest.materialClaimContractVersion,'no changed claim or source hash');
assert.equal(next.claimReviews.length,2);assert.equal(next.materialClaims.filter(c=>c.reusedResultRef).length,4);
assert.equal(next.sourceReviewRepairHandoff.staleRequests.filter(r=>r.missingSourcePresentation).length,2);
const busy=structuredClone(state);busy.work.find(w=>w.id===latest.id).operationState.pending={requestRef:'in-flight'};
assert.equal(await createRosterExperimentSourceReviewV1({state:busy,owner,result:await get(owner.resultRef),store:{get}}),null);
let saved=structuredClone(state);
const store={get,load:async()=>structuredClone(saved),save:async value=>{saved=structuredClone(value);},
  put:async value=>{const ref=hash(value);memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_EXECUTION_ALLOWED');}});
const {sourceProjections,claimReviews,ruleFieldReviews,...job}=next;
for(const p of sourceProjections)if(!saved.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
const after=await workflow.inspect();
assert.equal(after.work.find(w=>w.id===latest.id).status,'superseded');
assert.equal(after.work.find(w=>w.id===latest.id).resultRef,latest.resultRef);
assert.deepEqual(after.work.find(w=>w.id===latest.id).operationState,latest.operationState,'old paid calls and counters survive');
assert.equal(await createRosterExperimentSourceReviewV1({state:after,owner,result:await get(owner.resultRef),store}),null);
assert.equal(after.draftRef,state.draftRef);assert.equal(hash(state),before);
assert.equal(hash(JSON.parse(await fs.readFile(root+'/workflow.json','utf8'))),before);
const out={pass:true,exactFailedPresentationRecovered:true,twoFailedChecksOnly:true,fourPassesReused:true,
  semanticVersionsUnchanged:true,pendingDispatchProtected:true,coldIdempotent:true,oldCallsAndResultKept:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,sourceOrStrategyApproved:false};
await fs.writeFile(resultFile,JSON.stringify(out,null,2));console.log(JSON.stringify(out));
