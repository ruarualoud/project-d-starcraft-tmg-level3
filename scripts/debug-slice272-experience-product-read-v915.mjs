// Reproduce the missing product route for an ALREADY stored experience.
// Real saved observation + explicitly injected reviewed-conclusion fixture.
// This tests transport/isolation, not actual strategy acceptance or promotion.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {createRosterPlanningWorkspaceHttpAdapterV1,ROSTER_PLANNING_WORKSPACE_API_PREFIX as prefix} from '../packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs';
import {queryRosterConditionalExperienceObservationsV1} from '../packages/roster-strategist/roster-conditional-experience-v1.mjs';
import {queryRosterConditionalConclusionsV1} from '../packages/roster-planning-workspace/roster-conditional-conclusion-v1.mjs';

const source=new URL('../build/slice272-product-generation-v645-hsxEYu/workspace/decision-workflows/decision-798e1135-347b-4fd7-a44d-c989b466c6a2/',import.meta.url);
const report={passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,
  fixture:'real archived observation; injected reviewed conclusion; not an accepted production strategy',checks:[]};
try{
  const saved=JSON.parse(await readFile(new URL('workflow.json',source),'utf8'));
  const observationEntry=saved.evidence.find(e=>e.id.startsWith('conditional-experience:'));
  assert.ok(observationEntry);
  const observation=JSON.parse(await readFile(new URL(`artifacts/${observationEntry.artifactRef}.json`,source),'utf8'));
  const scope=structuredClone(observationEntry.bindings);
  const conclusion={schema:'roster_conditional_experience_conclusion_v1',recordKind:'reviewed_conditional_conclusion',
    purpose:{decisionQuestion:'fixture conditional comparison'},conditions:{experiment:['same fixture scene'],invalidIf:['different target']},
    conclusion:{status:'answered',answer:'Fixture only, not a real accepted A/B result'},
    proof:{sourceReview:{resultRef:'fixture-source-review'},comparisonReview:{resultRef:'fixture-comparison-review'}},
    promotionStatus:'awaiting_held_out_evaluation',advisorySkillEligible:false,canAffectRules:false,trainingTruth:false,
    realMatchHistory:false,mayWriteLiveRoomMemory:false};
  const conclusionEntry={id:'conditional-conclusion:fixture',artifactRef:'fixture-conclusion',
    bindings:scope,title:'Reviewed conditional experience: fixture'};
  const state={scope,evidence:[observationEntry,conclusionEntry]};
  const original=JSON.stringify(state),originalObservation=JSON.stringify(observation);
  const store={get:async ref=>structuredClone(ref==='fixture-conclusion'?conclusion:observation)};
  const run={async conditionalExperiences(query=''){
    const observations=await queryRosterConditionalExperienceObservationsV1({state,store,query});
    const conclusions=await queryRosterConditionalConclusionsV1({state,store,query});
    return {...observations,conclusions:conclusions.entries};
  }};
  const directory=await mkdtemp(new URL('../build/slice272-experience-read-v915-',import.meta.url));
  const id='fixture-product-job';await mkdir(`${directory}/${id}`);
  await writeFile(`${directory}/${id}/journey.json`,JSON.stringify({workflowId:id,status:'paused',seed:{setup:{},candidateInput:{}}}));
  let openCount=0;
  const product=()=>createRosterDecisionProductJourneyV1({directory,
    openWorkflow:async()=>{openCount++;return run;},prepareSeed:async()=>assert.fail('read must not create'),
    liveAvailable:()=>{assert.fail('read must not require Provider');}});
  const service={descriptor:()=>({}),startPlanning:()=>assert.fail('read must not invoke old generator')};
  const journey=await product(),http=createRosterPlanningWorkspaceHttpAdapterV1({service,decisionJourney:journey});
  const pathname=`${prefix}/workflows/${id}/conditional-experiences`;
  const result=await http.handle({method:'GET',pathname});
  assert.equal(result.status,200,'stored conditional experience has no product GET retrieval route');
  assert.equal(result.response.experiences.entries.length,1);
  assert.equal(result.response.experiences.conclusions.length,1);
  assert.deepEqual(result.response.experiences.entries[0].record,observation);
  assert.deepEqual(result.response.experiences.conclusions[0].record,conclusion);
  assert.equal(result.response.experiences.conclusions[0].usableWithoutApplicabilityReview,false);
  assert.equal(result.response.experiences.strategyApprovalGranted,false);
  assert.equal(result.response.experiences.trainingTruth,false);
  report.checks.push('product HTTP -> journey -> existing Run query preserves observation/conclusion identity and non-promotion');
  const filtered=await http.handle({method:'GET',pathname,query:new URLSearchParams({q:'fixture'})});
  assert.equal(filtered.response.experiences.entries.length,0);
  assert.equal(filtered.response.experiences.conclusions.length,1);
  const invalid=await http.handle({method:'GET',pathname,query:{q:{scope:'other'}}});
  assert.equal(invalid.status,400);assert.equal(invalid.response.reason,'ROSTER_DECISION_EXPERIENCE_QUERY_INVALID');
  assert.equal((await http.handle({method:'POST',pathname,body:{advisorySkillEligible:true}})).status,404);
  assert.equal((await http.handle({method:'GET',pathname:`${prefix}/workflows/missing-job/conditional-experiences`})).status,404);
  assert.equal((await http.handle({method:'GET',pathname:`${prefix}/workflows/../conditional-experiences`})).status,400);
  report.checks.push('query filtering and invalid input/job identity; no write/promotion route');
  state.scope={...scope,rules:'fixture-different-rules'};
  const cold=createRosterPlanningWorkspaceHttpAdapterV1({service,decisionJourney:await product()});
  const changed=await cold.handle({method:'GET',pathname});
  assert.equal(changed.status,200);
  assert.equal(changed.response.experiences.entries[0].sourceBindingsMatchCurrent,false);
  assert.equal(changed.response.experiences.conclusions[0].sourceBindingsMatchCurrent,false);
  assert.equal(changed.response.experiences.conclusions[0].usableWithoutApplicabilityReview,false);
  state.scope=scope;assert.equal(JSON.stringify(state),original);assert.equal(JSON.stringify(observation),originalObservation);
  assert.equal(openCount,2);
  report.checks.push('cold product read preserves mismatched dependency warning; zero generation/Native/source mutation');
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack};process.exitCode=1;}
await writeFile(new URL(`../build/slice272-experience-product-read-v915-${process.argv[2]??'probe'}.json`,import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
