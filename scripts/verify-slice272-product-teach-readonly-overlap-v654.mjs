// Actual fixed-product draft has published Plan blocks, but active unrelated
// fact/source work prevents the new subject-aware read-only Teach from queuing.
// Exercise normal product start; only the job ports are stubbed, no Provider.
import fs from 'node:fs/promises';import path from 'node:path';
import {createReadStream} from 'node:fs';import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace');
const id='decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34';
const originalFile=path.join(sourceRoot,'decision-product-journeys',id,'journey.json');
const original=await fs.readFile(originalFile),metadata=JSON.parse(original);
const base=path.join(sourceRoot,'decision-workflows',id);
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
// Freeze the actual recorded queue, not whichever jobs happen to be running
// when a second verifier starts. The first GREEN attempt raced real progress.
const observedAt='2026-10-19T21:15:39.188Z';let observed;
for await(const line of createInterface({input:createReadStream(path.join(sourceRoot,'../observations.jsonl')),crlfDelay:Infinity})){
  if(!line.trim())continue;const row=JSON.parse(line);if(row.at===observedAt){observed=row;break;}
}
assert(observed);const rows=new Map(observed.work.map(w=>[w.id,w]));
state.work=state.work.filter(w=>rows.has(w.id)).map(w=>({...w,status:rows.get(w.id).status,failure:rows.get(w.id).failure}));
const commit=state.events.find(e=>e.type==='draft_committed'&&e.revision===observed.draftRevision);assert(commit);
state.draftRef=commit.draftRef;state.draftRevision=commit.revision;state.scope=commit.scope;
const draftFile=path.join(base,'artifacts',state.draftRef+'.json'),draftBytes=await fs.readFile(draftFile);
const draft=JSON.parse(draftBytes),revision=draft.revision;
assert(draft.plan);assert(state.evidence.some(e=>e.id===`draft:r${revision}:plan:structure`));
const pending=state.work.find(w=>!['evidence_ready','superseded'].includes(w.status)&&w.role!=='roster_workflow_strategy_decision');
assert(pending,'this actual failure needs independent active fact/source work');
const temporary=await fs.mkdtemp(path.join(root,'build/slice272-teach-overlap-v654-'));
await fs.mkdir(path.join(temporary,id));await fs.writeFile(path.join(temporary,id,'journey.json'),original);
let journey,advanceBoundary;const boundary=new Promise(resolve=>{advanceBoundary=resolve;});
const teaches=[],decisions=[];
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),readArtifact:read,
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
  readiness:async()=>({mechanicalReady:false,activeWork:[{id:pending.id,status:pending.status}]}),
  requestTeach:async input=>{teaches.push(input);state.work.push({id:input.id,role:'roster_workflow_local_teach',status:'ready'});},
  requestDecision:async input=>{decisions.push(input);},
  advance:async()=>{await journey.pause(id);advanceBoundary();return {state:structuredClone(state),ran:['isolated-readonly-boundary']};},
  finalAssessment:async()=>({readyForRelease:false,stoppedReviewDomains:[],activeWork:[{id:pending.id}],mechanicalBlockers:[]})};
journey=await createRosterDecisionProductJourneyV1({directory:temporary,openWorkflow:async()=>run,
  prepareSeed:async()=>{throw Error('NO_NEW_WORKFLOW');},liveAvailable:()=>true});
await journey.start(id);await boundary;await journey.close();
assert.equal(teaches.length,1,'a current Plan subject must not wait for unrelated facts before read-only Teach');
assert.equal(teaches[0].id,`product:teach:r${revision}:subject-v1`);
assert.equal(teaches[0].inputs.draft.id,`draft:r${revision}:summary`);
assert.equal(decisions.length,0,'mutation owner still waits for outstanding factual work');
assert(state.work.some(w=>w.id===pending.id));
// The real job remains live and may legitimately update its metadata. Only its
// immutable source draft, not live progress, must remain byte-identical here.
assert((await fs.readFile(draftFile)).equals(draftBytes));
console.log(JSON.stringify({status:'passed',draftRevision:revision,readOnlyTeachQueued:1,
  mutationDecisionQueued:0,activeFactRetained:true,temporary,providerCalls:0,nativeCalls:0,
  productionWrites:0,sourceQueueObservationAt:observedAt,productJobPortsStubbed:true,realOverlapStillPending:true}));
