// Reproduce P0 H4 on the saved, rules-accepted conditional Goliath deploy.
// No Provider, Native execution, production writes or approval of the full Plan.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {projectRosterExperimentSourceFactsV1} from '../packages/roster-strategist/roster-experiment-source-facts-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';

const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const id='tool:review-resolution:r6:plan_continuity:method:1889d0e146a2bacc:order0:deploy-goliath:input-repair:order0:deploy-goliath';
const evidence=state.evidence.find(e=>e.id===id);
const sourcePath=path.join(base,'artifacts',evidence.artifactRef+'.json');
const bytes=await fs.readFile(sourcePath,'utf8'),value=JSON.parse(bytes);
assert.equal(value.receipt.nativeTransitionsApplied,1);
assert.equal(value.receipt.nativeAction.sourceAction.spatialPlan.fullBaseBoundaryAndSweptPathChecked,true);
const facts=projectRosterExperimentSourceFactsV1({evidence,value});
assert.equal(facts.nativeActionEvidence?.[0]?.conditionalNativeLegality?.accepted,true,
  'BUG: modular source facts omit the successful Native transition and its actual spatial checks, leaving only provenArrivalHistory=false');
const witness=facts.nativeActionEvidence[0];
assert.equal(witness.provenArrivalHistory,false);
assert.equal(witness.wholeQuestionAnswered,false);
assert.equal(witness.conditionalOnParent,true);
assert.equal(witness.conditionalNativeLegality.liveHistoryProven,false);
assert.equal(witness.conditionalNativeLegality.scope,'one_native_transition_on_declared_parent');
assert.equal(witness.spatialPlan.distanceTravelledInches,4.575);
assert.equal(witness.spatialPlan.speedAllowanceInches,7);
assert.equal(witness.spatialPlan.fullBaseBoundaryAndSweptPathChecked,true);
assert.deepEqual(witness.spatialPlan.finalModelPositions,value.receipt.nativeAction.sourceAction.spatialPlan.finalModelPositions);
assert.deepEqual(witness.nativeEvents,value.receipt.nativeEvents);
assert.equal(projectRosterExperimentSourceFactsV1({evidence,value:{operation:'spatial',receipt:{
  branchKind:'hypothetical_geometry',resultStatus:'ok',arrivalOrMovementLegalityProven:false}}}).nativeActionEvidence,undefined,
  'static placement is not a Native transition');
const missingCount=structuredClone(value);delete missingCount.receipt.nativeTransitionsApplied;
assert.notEqual(projectRosterExperimentSourceFactsV1({evidence,value:missingCount})
  .nativeActionEvidence?.[0]?.conditionalNativeLegality?.accepted,true,'missing execution count cannot create a positive witness');

const memory=new Map();
const store={load:async()=>state,get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):
  JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async body=>{const ref=createHash('sha256').update(JSON.stringify(body)).digest('hex');memory.set(ref,structuredClone(body));return ref;}};
const legacyId='isolated-v634-old-facts';
const legacy={schema:'roster_experiment_source_facts_v1',projectionVersion:2,
  sourceEvidenceId:id,sourceArtifactRef:evidence.artifactRef,receiptScalars:{provenArrivalHistory:false}};
const legacyRef=await store.put(legacy);
const legacyEntry={id:legacyId,artifactRef:legacyRef,kind:'capability_result',title:'Saved v2 Native source projection',validity:'current',bindings:state.scope};
const directory=[{...evidence,validity:'current'},legacyEntry];
const marker=Error('CAPTURE_ONLY');let captured;
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v634',
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},
  onRequest:async request=>{captured=request;throw marker;}});
const roles=['roster_workflow_experiment_planner','roster_workflow_strategy_decision',
  'roster_workflow_local_teach','roster_workflow_final_review'];
for(const role of roles){
  const assignment={workId:'isolated-native-proof-'+role,role,scope:state.scope,evidenceDirectory:directory,
    inputs:{question:{source:'literal',value:'Distinguish this conditional deploy from static placement and full arrival history.'},
      nativeSource:{source:'evidence',evidenceId:legacyId,status:'read',value:legacy},
      ...(role==='roster_workflow_final_review'?{review:{source:'literal',value:{domainId:'map_and_arrival',requirementClassificationVersion:1,obligations:[]}}}:{})}};
  await assert.rejects(()=>executor(assignment,{operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
    checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
  const context=captured.promptNodes.find(n=>n.kind==='conditional_native_action_evidence');
  assert.equal(context?.sources[0]?.evidence[0]?.conditionalNativeLegality.accepted,true,role+' must actually receive Native scope, including saved v2 projections');
  assert.equal(context.sources[0].fullOriginalBodyDelivered,false);
  assert.equal(context.sources[0].sourceEvidenceId,id);
  const citation=captured.promptNodes.find(n=>n.kind==='citation_access');
  assert(!citation.directlyReadEvidenceNumbers.includes(1),'supplement must not pretend the full original was read');
  const stage=captured.promptNodes.find(n=>n.kind==='acceptance_stage_contract');
  assert.equal(stage.proofScopes.conditionalNativeTransition.requiresCompleteMatchHistory,false);
  assert.equal(stage.proofScopes.staticPlacement.provesNativeArrival,false);
  assert.equal(captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.nativeSource.value.projectionVersion,2,
    'immutable old projection remains unchanged; the supplement is separately labelled');
}
assert.equal(await fs.readFile(sourcePath,'utf8'),bytes);
console.log(JSON.stringify({passed:true,source:evidence.id,roles:roles.length,
  conditionalStepPreserved:true,staticNotPromoted:true,completeHistoryNotClaimed:true,
  oldProjectionAndSourceUnchanged:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
