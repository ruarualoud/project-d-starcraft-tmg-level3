// Exact fresh B stopped review: a paid answer is valid under the repaired
// contract. Product /run must queue the EXISTING core revalidation port once,
// not require a hand-written run script or buy a fourth model response.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace');
const id='decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1';
const source=path.join(dir,'decision-product-journeys',id,'journey.json');
const sourceBytes=await fs.readFile(source),metadata=JSON.parse(sourceBytes);
const base=path.join(dir,'decision-workflows',id),state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await read(state.draftRef),failed=state.work.find(w=>w.id==='product:after-teach:r1:investigation:method:8b75d9da6c2dc9b6:source-review:v2');
assert.equal(failed.status,'needs_repair');assert.equal(failed.operationState.consecutiveCorrections,3);
const temporary=await fs.mkdtemp(path.join(root,'build/slice272-product-schema-recovery-v653-'));
await fs.mkdir(path.join(temporary,id));await fs.writeFile(path.join(temporary,id,'journey.json'),sourceBytes);
const calls=[];let journey,advanced;const atBoundary=new Promise(resolve=>{advanced=resolve;});
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),readArtifact:read,
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
  readiness:async()=>({activeWork:[{id:failed.id,status:failed.status}],mechanicalReady:false}),
  revalidateRoleReply:async input=>{calls.push(input);assert.equal(input.workId,failed.id);failed.status='ready';failed.failure=null;},
  advance:async()=>{await journey.pause(id);advanced();return {state:structuredClone(state),ran:[failed.id]};},
  finalAssessment:async()=>({readyForRelease:false,stoppedReviewDomains:[],activeWork:[],mechanicalBlockers:[{code:'requested_mineral_target_unmet'}]})};
journey=await createRosterDecisionProductJourneyV1({directory:temporary,openWorkflow:async()=>run,
  prepareSeed:async()=>{throw Error('NO_NEW_WORKFLOW');},liveAvailable:()=>true});
await journey.start(id);await atBoundary;await journey.close();
assert.equal(calls.length,1,'normal product start must recover the exact paid schema boundary');
const saved=JSON.parse(await fs.readFile(path.join(temporary,id,'journey.json'),'utf8'));
assert.equal(saved.schemaRevalidations.length,1);
assert.equal(saved.schemaRevalidations[0].originalReplyRef,'b66a94f8463867b4218f136ab58949a3585342bab1945373b8f6efe5674e027b');
assert.equal(saved.schemaRevalidations[0].providerReplayed,false);
assert.equal(saved.schemaRevalidations[0].finalApprovalGranted,false);
assert((await fs.readFile(source)).equals(sourceBytes));
console.log(JSON.stringify({status:'passed',exactStoppedWorkRecovered:1,temporary,
  providerCalls:0,nativeCalls:0,productionWrites:0,coreRevalidationPortStubbed:true,
  oldJourneyUnchanged:true,finalApprovalGranted:false,realProductRecoveryStillPending:true}));
