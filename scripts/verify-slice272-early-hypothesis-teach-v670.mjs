// Actual editable r5 is 1610/2000 and still running budget queries. The v667
// product stage waits for 2000 before challenging that very roster choice.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import * as hypothesis from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),id='decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1';
const source=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace'),base=path.join(source,'decision-workflows',id);
const actual=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const draft=JSON.parse(await fs.readFile(path.join(base,'artifacts',actual.draftRef+'.json'),'utf8'));
assert.equal(draft.revision,5);
const state={...structuredClone(actual),work:actual.work.map(w=>({id:w.id,role:w.role,status:w.status})),events:[]};
const metadata=JSON.parse(await fs.readFile(path.join(source,'decision-product-journeys',id,'journey.json'),'utf8'));
const temporary=await fs.mkdtemp(path.join(root,'build/slice272-early-hypothesis-teach-v670-'));
await fs.mkdir(path.join(temporary,id));await fs.writeFile(path.join(temporary,id,'journey.json'),JSON.stringify(metadata));
let enter,release;const reached=new Promise(r=>{enter=r;}),proceed=new Promise(r=>{release=r;});
const queued=[],memory=new Map(),readiness={mechanicalReady:false,
  mechanicalBlockers:[{code:'requested_mineral_target_unmet',detail:{requested:2000,actual:1610,shortfall:390}}],
  mechanicalFacts:{strategyApproved:false},activeWork:[{id:'actual-budget-query',status:'running'}],strategyQuestions:[]};
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
  readiness:async()=>structuredClone(readiness),readArtifact:async ref=>memory.get(ref),
  requestTeach:async input=>{queued.push({role:'teach',...input});state.work.push({id:input.id,role:'roster_workflow_local_teach',status:'ready'});},
  requestDecision:async()=>{throw Error('DO_NOT_CREATE_CONCURRENT_EARLY_WRITER');},
  requestFinalReviews:async()=>{throw Error('INCOMPLETE_ROSTER_CANNOT_PUBLISH');},
  advance:async()=>{enter();await proceed;return {state:structuredClone(state),ran:[]};},
  finalAssessment:async()=>({readyForRelease:false,stoppedReviewDomains:[],activeWork:readiness.activeWork,semanticIssues:[]})};
const journey=await createRosterDecisionProductJourneyV1({directory:temporary,openWorkflow:async()=>run,
  prepareSeed:async()=>{throw Error('NO_NEW_GENERATION');},liveAvailable:()=>true});
await journey.start(id);await reached;await journey.pause(id);release();await journey.close();
assert.equal(queued.length,1,'an existing partial army/Plan must receive the dedicated read-only challenger before its budget is finished');
assert.equal(queued[0].role,'teach');assert.match(queued[0].id,/strategy-hypothesis/);
// A completed same-fact-context challenge is a proposal the ordinary decision
// roles can consume, not a host judgement or a new strategic writer.
const teacher=state.work.find(w=>w.id===queued[0].id);teacher.status='evidence_ready';teacher.resultRef='controlled-teach';
const proposal={publicReason:'Controlled challenger fixture.',proposals:[{claimPaths:['componentPurposes'],
  disposition:'challenge',publicReason:'Compare the selected allocation with an explicit alternative under the same conditions.',
  alternatives:['A credible allocation alternative chosen by the model'],disconfirmation:'Actual comparison contradicts the selected rationale.',
  evidenceNumbers:[],requiredData:['One concrete local comparison if existing receipts do not answer it.']}]};
memory.set(teacher.resultRef,{kind:'proposal',value:proposal});
const projected=await hypothesis.loadRosterProductHypothesisChallengeV1({state,draft,readArtifact:run.readArtifact});
assert.equal(projected.sourceWorkId,teacher.id);assert.deepEqual(projected.proposal,proposal);
assert.equal(projected.claimsAreRulesTruth,false);assert.equal(projected.strategicAdoptionGranted,false);
const changed=structuredClone(state);changed.scope.army='different-army';
assert.equal(await hypothesis.loadRosterProductHypothesisChallengeV1({state:changed,draft,readArtifact:run.readArtifact}),null);
console.log(JSON.stringify({status:'passed',actualSourceRevision:draft.revision,sourceMinerals:1610,
  readOnlyChallengerBeforeFullBudget:true,concurrentStrategicWritersCreated:0,
  ordinaryOwnerProposalProjectionPreserved:true,differentArmyChallengeExcluded:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,productRunControlled:true,realModelAdoptionStillPending:true,temporary}));
