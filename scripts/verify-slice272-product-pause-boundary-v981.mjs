// Reproduces the observed extra call after stop during product preparation.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const directory=await fs.mkdtemp(path.join(process.cwd(),'build/slice272-pause-boundary-v981-'));
const state={schema:'roster_decision_workflow_v1',scope:{army:'a'.repeat(64)},draftRevision:1,
  draftRef:'d'.repeat(64),work:[],evidence:[{id:'product:builder-menu'}],events:[]};
const draft={revision:1,mode:'editable',plan:null,candidateInput:{units:[],mineralBudget:2000,scaleId:'Standard'}};
let prepareCount=0,advanceCount=0,queued=0,enter,release;
const reached=new Promise(resolve=>{enter=resolve;}),resume=new Promise(resolve=>{release=resolve;});
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},
  prepareContext:async()=>{if(++prepareCount===2){enter();await resume;}},
  readiness:async()=>({activeWork:[],mechanicalReady:false,mechanicalBlockers:[]}),
  reconsiderParticipantConfiguration:async()=>({scheduled:[]}),
  requestDecision:async()=>{queued++;},
  readArtifact:async()=>{throw Error('UNEXPECTED_ARTIFACT_READ');},
  advance:async()=>{advanceCount++;throw Error('UNWANTED_NEXT_MODEL_QUANTUM');}};
const journey=await createRosterDecisionProductJourneyV1({directory,openWorkflow:async()=>run,
  prepareSeed:async()=>({mode:'editable',setup:{factionRecordKey:'test',opponentFactionRecordKey:'test'},candidateInput:draft.candidateInput}),
  liveAvailable:()=>true});
const created=await journey.create({});
await journey.start(created.workflowId);await reached;
const pausing=await journey.pause(created.workflowId);assert.equal(pausing.pauseRequested,true);
const closing=journey.close();release();await closing;
assert.equal(advanceCount,0,'Pause during preparation must prevent the NEXT model quantum');
assert.equal(queued,0,'Pause must not enqueue another stage after the preparation boundary');
assert.equal((await journey.read(created.workflowId)).status,'paused');
console.log(JSON.stringify({ok:true,directory,checks:['real_product_pause_before_dispatch','no_followup_enqueued','paused_persisted'],providerCalls:0,nativeCalls:0,productionWrites:0}));
