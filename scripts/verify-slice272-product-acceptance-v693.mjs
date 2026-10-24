// Concrete P6 defect: a completed new workflow has no product acceptance port.
// Isolated HTTP/job fixtures use a real saved draft; six-review passes below
// are EXPLICIT controlled fixtures, not production/model/strategy evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {createRosterPlanningWorkspaceHttpAdapterV1} from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import {rosterProductHypothesisCycleIdV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {ROSTER_WORKFLOW_REVIEW_DOMAINS_V1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const root=process.cwd(),source=path.resolve(process.argv[2]),workflowId=process.argv[3];
const sourceDirectory=path.join(source,'workspace/decision-workflows',workflowId);
const original=JSON.parse(await fs.readFile(path.join(sourceDirectory,'workflow.json'),'utf8'));
const draft=JSON.parse(await fs.readFile(path.join(sourceDirectory,'artifacts',original.draftRef+'.json'),'utf8'));
const verdict=JSON.parse(await fs.readFile(path.join(sourceDirectory,'artifacts',draft.builderVerdictRef+'.json'),'utf8'));
const fixture=structuredClone(draft),directory=await fs.mkdtemp(path.join(root,'build/slice272-acceptance-v693-'));
let ready=false,revisionChanged=false;
const state={scope:original.scope,draftRef:original.draftRef,draftRevision:draft.revision,evidence:[],work:[]};
const cycle=rosterProductHypothesisCycleIdV1(state,draft),artifacts=new Map([
  ['challenge',{kind:'proposal',value:{proposals:[{proposalId:'fixture-only'}]}}],
  ['owner',{status:'retained',decision:{disposition:'retain',publicReason:'CONTROLLED fixture only',evidenceRefs:[{id:'fixture'}],requiredData:[]}}],
  [draft.builderVerdictRef,verdict],
]);
state.work.push({id:cycle+':teach',status:'evidence_ready',resultRef:'challenge'},
  {id:cycle+':decision',role:'roster_workflow_strategy_decision',status:'evidence_ready',draftOutcomeRef:'owner'});
for(const domain of ROSTER_WORKFLOW_REVIEW_DOMAINS_V1)state.work.push({id:'fixture-review:'+domain.id,
  reviewDomain:domain.id,draftRevision:draft.revision,role:'roster_workflow_final_review',status:'evidence_ready',resultRef:'fixture:'+domain.id});
const assessment=()=>({readyForRelease:ready,draftRevision:draft.revision,mechanicalBlockers:[],semanticIssues:[],activeWork:[],
  reviewRefs:state.work.filter(w=>w.reviewDomain).map(w=>({workId:w.id,resultRef:w.resultRef})),stoppedReviewDomains:[]});
const run={inspect:async()=>({...state,draftRevision:revisionChanged?state.draftRevision+1:state.draftRevision}),
  currentDraft:async()=>revisionChanged?{...fixture,revision:fixture.revision+1}:fixture,
  initializeDraft:async()=>fixture,finalAssessment:async()=>assessment(),readArtifact:async ref=>artifacts.get(ref)};
const journey=await createRosterDecisionProductJourneyV1({directory,openWorkflow:async()=>run,liveAvailable:()=>false,
  prepareSeed:async()=>({setup:{sideKey:fixture.candidateInput.sideKey},mode:fixture.mode,candidateInput:fixture.candidateInput,provenance:fixture.provenance})});
const http=createRosterPlanningWorkspaceHttpAdapterV1({service:{descriptor:()=>({}),startPlanning:async()=>{}},decisionJourney:journey});
const call=(method,route,body)=>http.handle({method,pathname:'/starcraft-tmg-level3/roster-planning/v1/'+route,body});
const created=await call('POST','workflows',{}),id=created.response.workflow.workflowId,route='workflows/'+id+'/accept';
const rejected=await call('POST',route,{expectedRevision:draft.revision});
assert.equal(rejected.status,409,'P6 must expose acceptance and reject an unfinished workflow; a missing 404 route is the concrete bug');
assert.equal(rejected.response.reason,'ROSTER_DECISION_NOT_READY_FOR_ACCEPTANCE');
assert.equal((await journey.read(id)).formalPlanAccepted,false);
ready=true;
assert.equal((await call('POST',route,{expectedRevision:draft.revision-1})).response.reason,'ROSTER_DECISION_ACCEPTANCE_STALE_REVISION');
const accepted=await call('POST',route,{expectedRevision:draft.revision});
assert.equal(accepted.status,200,JSON.stringify(accepted.response));
const bundle=accepted.response.acceptance;
assert.equal(bundle.plan.planStatus,'active');
assert.deepEqual(bundle.candidateInput,fixture.candidateInput);
assert.deepEqual(bundle.plan.componentPurposes,fixture.plan.componentPurposes,'publication must not invent a better strategy');
assert.equal(bundle.sessionReceipt.strategyImprovementProven,false);
assert.equal(bundle.sessionReceipt.canAffectRules,false);
assert.equal(bundle.sessionReceipt.trainingTruth,false);
assert.equal(bundle.sessionReceipt.finalAuditResultHash,verdict.auditResultHash);
assert.equal((await journey.read(id)).formalPlanAccepted,true);
const again=await call('POST',route,{expectedRevision:draft.revision});
assert.deepEqual(again.response.acceptance,bundle,'idempotent acceptance must not create a second artifact');
const cold=await createRosterDecisionProductJourneyV1({directory,openWorkflow:async()=>run,liveAvailable:()=>false,prepareSeed:async()=>{throw Error('unexpected create');}});
assert.equal((await cold.read(id)).formalPlanAccepted,true,'accepted artifact survives a normal cold read');
revisionChanged=true;
assert.equal((await cold.read(id)).formalPlanAccepted,false,'a later draft must not inherit acceptance');
await assert.rejects(()=>cold.readAccepted(id),/ROSTER_DECISION_ACCEPTANCE_STALE_REVISION/u);
assert.deepEqual(fixture,draft,'the original draft and paid evidence are not rewritten');
await journey.close();await cold.close();
console.log(JSON.stringify({passed:true,directory,controlledReadyFixture:true,actualSavedDraftUsed:true,
  actualProviderCalls:0,nativeCalls:0,productionPlansAccepted:0,strategyImprovementProven:false,
  sameHttpAcceptanceSeam:true,staleDraftRejected:true,idempotentAndColdRead:true}));
