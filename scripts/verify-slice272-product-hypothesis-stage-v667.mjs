// Concrete P4 gap: the actual product journey has no strategic hypothesis
// stage after its general Teach. Reproduce at the pre-release control seam;
// the Run is controlled here, so this does NOT prove model strategy quality.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixtureFile=path.join(root,'build/slice272-product-hypothesis-stage-v667-fixture.json');
let fixture;
try{fixture=JSON.parse(await fs.readFile(fixtureFile,'utf8'));}
catch(error){
  if(error.code!=='ENOENT')throw error;
  const id='decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34';
  const source=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace');
  const base=path.join(source,'decision-workflows',id);
  const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
  const draft=JSON.parse(await fs.readFile(path.join(base,'artifacts',state.draftRef+'.json'),'utf8'));
  const metadata=JSON.parse(await fs.readFile(path.join(source,'decision-product-journeys',id,'journey.json'),'utf8'));
  fixture={id,sourceRevision:state.draftRevision,draft,metadata,state:{scope:state.scope,draftRef:state.draftRef,
    draftRevision:state.draftRevision,evidence:state.evidence.filter(e=>e.id==='product:builder-menu'),
    work:state.work.map(w=>({id:w.id,role:w.role,status:w.status})),events:[]}};
  await fs.writeFile(fixtureFile,JSON.stringify(fixture),{flag:'wx'});
}
const {id}=fixture,state=structuredClone(fixture.state),draft=structuredClone(fixture.draft);
// Explicitly controlled pre-release edge: ordinary Teach and its author have
// completed. Existing facts remain from the frozen actual source draft.
for(const [suffix,role]of [['teach','roster_workflow_local_teach'],['after-teach','roster_workflow_strategy_decision']]){
  const workId=`product:${suffix}:r${draft.revision}:subject-v1`;
  const existing=state.work.find(w=>w.id===workId);
  if(existing)existing.status='evidence_ready';else state.work.push({id:workId,role,status:'evidence_ready'});
}
const temporary=await fs.mkdtemp(path.join(root,'build/slice272-product-hypothesis-stage-v667-'));
await fs.mkdir(path.join(temporary,id));
await fs.writeFile(path.join(temporary,id,'journey.json'),JSON.stringify(fixture.metadata));
const queued=[],outcomes=new Map();let finalReviews=0,boundary,release;
const waitAtAdvance=()=>{let enter;const reached=new Promise(resolve=>{enter=resolve;});
  const continueAfterPause=new Promise(resolve=>{release=resolve;});
  boundary={reached,enter,continueAfterPause};};
const readiness={mechanicalReady:true,mechanicalBlockers:[],mechanicalFacts:{strategyApproved:false},activeWork:[],strategyQuestions:[]};
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
  readiness:async()=>structuredClone(readiness),builderChoices:()=>({}),
  readArtifact:async ref=>structuredClone(outcomes.get(ref)),
  requestTeach:async input=>{queued.push({role:'teach',...input});state.work.push({id:input.id,role:'roster_workflow_local_teach',status:'ready'});},
  requestDecision:async input=>{queued.push({role:'decision',...input});state.work.push({id:input.id,role:'roster_workflow_strategy_decision',status:'waiting_dependency'});},
  requestFinalReviews:async()=>{finalReviews++;},
  advance:async()=>{boundary.enter();await boundary.continueAfterPause;return {state:structuredClone(state),ran:[]};},
  // Simulate the old core's green review assessment, to prove the product may
  // not publish before its newly required strategic-owner stage completes.
  finalAssessment:async()=>({readyForRelease:true,stoppedReviewDomains:[],activeWork:[],semanticIssues:[],acceptanceGranted:false})};
const journey=await createRosterDecisionProductJourneyV1({directory:temporary,openWorkflow:async()=>run,
  prepareSeed:async()=>{throw Error('NO_NEW_GENERATION');},liveAvailable:()=>true});
async function oneBoundary(){waitAtAdvance();await journey.start(id);await boundary.reached;await journey.pause(id);release();await journey.close();}
await oneBoundary();
assert.equal(queued.filter(x=>x.role==='teach').length,1,'normal product must actually enqueue a dedicated hypothesis challenger');
assert.equal(queued.filter(x=>x.role==='decision').length,1,'normal product must enqueue the dependent strategic owner, not just a Teach prompt');
const decision=queued.find(x=>x.role==='decision'),teach=queued.find(x=>x.role==='teach');
assert.equal(decision.inputs.currentHypothesisTeach.id,teach.id);
assert.equal(finalReviews,0,'do not start another final review before the strategic-owner cycle returns');
let metadata=JSON.parse(await fs.readFile(path.join(temporary,id,'journey.json'),'utf8'));
assert.notEqual(metadata.status,'ready_for_release','a core green flag cannot bypass an unfinished hypothesis stage');
assert.equal(metadata.progress.assessment.strategyCycle.status,'awaiting_challenger');
assert.equal(metadata.progress.assessment.readyForRelease,false);
// Cold resume at the unchanged boundary is idempotent.
await oneBoundary();assert.equal(queued.length,2);
// A fact-only outcome is NOT strategic adoption. Completing dispatch alone
// cannot close the cycle, and no host-written strategy is manufactured.
for(const work of state.work.filter(w=>w.id===teach.id||w.id===decision.id))work.status='evidence_ready';
const owner=state.work.find(w=>w.id===decision.id);owner.draftOutcomeRef='fact-only';
outcomes.set('fact-only',{applied:false,status:'retain',evidenceRecorded:true,strategyChanged:false,draftUnchanged:true});
await oneBoundary();metadata=JSON.parse(await fs.readFile(path.join(temporary,id,'journey.json'),'utf8'));
assert.equal(metadata.progress.assessment.strategyCycle.status,'awaiting_strategic_disposition');
assert.equal(metadata.progress.assessment.readyForRelease,false);
// An explicitly supported retention is allowed, without forcing an army edit.
owner.draftOutcomeRef='retention';outcomes.set('retention',{applied:false,status:'retain',draftUnchanged:true,
  decision:{disposition:'retain',publicReason:'Controlled source-backed comparison justifies retaining the stated route.',
    requiredData:[],evidenceRefs:[{id:'conditional-comparison',artifactRef:'comparison'}]}});
await oneBoundary();metadata=JSON.parse(await fs.readFile(path.join(temporary,id,'journey.json'),'utf8'));
assert.equal(metadata.progress.assessment.strategyCycle.status,'owner_returned');
assert.equal(metadata.progress.assessment.strategyCycle.strategyImprovementProven,false);
assert.equal(finalReviews,1);
assert.equal(metadata.status,'ready_for_release');
// A real Plan commit refreshes the old bound work to superseded. Its actual
// applied receipt remains evidence of the return, not a new pending challenge.
owner.status='superseded';state.work.find(w=>w.id===teach.id).status='superseded';
owner.draftOutcomeRef='applied';outcomes.set('applied',{applied:true,status:'draft_committed',armyChanged:false});
// Merely changing Plan wording must not recreate an identical challenge.
draft.revision++;state.draftRevision=draft.revision;state.scope.plan='controlled-plan-only-revision';
for(const suffix of ['teach','after-teach'])state.work.push({id:`product:${suffix}:r${draft.revision}:subject-v1`,status:'evidence_ready'});
await oneBoundary();assert.equal(queued.length,2);
metadata=JSON.parse(await fs.readFile(path.join(temporary,id,'journey.json'),'utf8'));
assert.equal(metadata.progress.assessment.strategyCycle.disposition,'revised');
console.log(JSON.stringify({status:'passed',sourceRevision:fixture.sourceRevision,temporary,
  queuedHypothesisRoles:queued.map(x=>x.role),explicitRetentionAllowed:true,factLoggingCannotCloseCycle:true,
  coldResumeIdempotent:true,planOnlyRevisionDoesNotRepeatCycle:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,productRunControlled:true,
  realModelExperimentAndStrategyBenefitStillPending:true}));
