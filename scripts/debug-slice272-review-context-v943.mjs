// Reproduce r17's false missing declarations/reopened comparison at the shared
// role input seam, then capture the real request. No model or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const work=state.work.find(w=>w.id==='final-review:r17:plan_continuity');
const assignment=await get(work.inputRef),checks=[];
try{
  const inputs=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
  for(const section of ['scoreRoute','lossResourceBudget','deploymentConcept']){
    const source=state.evidence.find(e=>e.id===`draft:r17:plan:${section}`);
    assert.deepEqual(inputs[`currentPlan_${section}`]?.value,await get(source.artifactRef),`Current ${section} not delivered for inherited obligations`);
    assert.equal(inputs[`currentPlan_${section}`].evidenceId,source.id);
  }
  const closed=inputs.reviewedComparisonClosures?.value?.entries;
  assert.equal(closed?.length,1,'Saved accepted closure must accompany the old comparison obligations');
  assert.equal(closed[0].reportRef,'6651bf9961eefe85fbb4966cccc00c0a0fa5441c67ff460621ead6008a8dd53c');
  assert.equal(closed[0].nativeQueryAutomaticallyResolved,false);
  assert.equal(closed[0].planApproved,false);
  assert(inputs.comparisonClosureAuthor0?.value?.unverifiedClaims?.length);
  assert.equal(inputs.comparisonClosureReview0?.value?.length,3);
  assert.deepEqual(assignment.inputs.review.value.obligations,(await get(work.inputRef)).inputs.review.value.obligations);
  checks.push('actual_current_declarations_and_closed_scope_are_delivered_without_erasing_questions');
  let captured;const directoryCopy=copy(assignment.evidenceDirectory);
  const execute=createRosterWorkflowReadRoleExecutorV1({store:{load:async()=>copy(state),get,put},sessionId:'offline-v943',
    deliberation:{deliberate:async request=>{captured=request;throw Error('OFFLINE_CAPTURE_ONLY');}}});
  // Fresh local invocation of the same saved assignment; old paid replies stay
  // immutable and are not revalidated or sent to a Provider by this capture.
  try{await execute({...assignment,inputs},{operationState:null,checkpointOperation:async()=>{},
    readEvidence:async()=>assert.fail('No new read required for input capture'),
    publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v943:'+ref;
      let i=directoryCopy.findIndex(e=>e.id===id);if(i<0){i=directoryCopy.length;directoryCopy.push({id,artifactRef:ref,
        title:metadata.title??'Offline context',kind:metadata.kind??'interpretation',validity:'current',
        bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
      return {...directoryCopy[i],evidenceNumber:i+1,...(metadata.includeDirectory?{evidenceDirectory:copy(directoryCopy)}:{})};}});
  }catch(error){assert.match(error.message,/OFFLINE_CAPTURE_ONLY/);}
  const actual=captured?.promptNodes.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  assert.deepEqual(actual?.currentPlan_scoreRoute.value,inputs.currentPlan_scoreRoute.value);
  assert.equal(actual?.reviewedComparisonClosures.value.entries.length,1);
  checks.push('actual_review_request_contains_current_plan_and_scoped_closure');
  const helper=await import('../packages/roster-strategist/roster-workflow-review-context-v1.mjs');
  const forged=copy(state),goal=forged.work.find(w=>w.comparisonClosure?.reportRef===closed[0].reportRef);
  goal.comparisonClosure.reviewResultRef='wrong-result';
  const bad=await helper.projectRosterWorkflowReviewContextV1({assignment,state:forged,readArtifact:get});
  assert.equal(bad.reviewedComparisonClosures?.value?.entries?.length??0,0);
  const later=copy(state);later.scope.plan='new-plan';
  const historical=await helper.projectRosterWorkflowReviewContextV1({assignment,state:later,readArtifact:get});
  assert.equal(historical.reviewedComparisonClosures.value.entries[0].currentPlanMatchesReviewedPlan,false);
  assert.equal(historical.currentPlan_scoreRoute,undefined,'Old declaration must not be labelled current');
  assert.deepEqual(state.work.find(w=>w.id===work.id),work);
  checks.push('wrong_closure_identity_and_changed_plan_are_not_promoted');
  await fs.writeFile(output,JSON.stringify({pass:true,checks,providerCalls:0,nativeCalls:0,productionWrites:0},null,2)+'\n');
  console.log(JSON.stringify({pass:true,checks}));
}catch(error){await fs.writeFile(output,JSON.stringify({pass:false,checks,error:error.message},null,2)+'\n');
  console.log(JSON.stringify({pass:false,checks,error:error.message}));process.exitCode=1;}
