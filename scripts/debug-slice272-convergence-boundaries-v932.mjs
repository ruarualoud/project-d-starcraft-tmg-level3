import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as facts from '../packages/roster-strategist/roster-native-fact-claims-v1.mjs';
import * as closure from '../packages/roster-strategist/roster-comparison-closure-v1.mjs';
import {rosterWorkflowAcceptanceStageV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
const [directory,output]=process.argv.slice(2);
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const readArtifact=ref=>fs.readFile(directory+'/artifacts/'+ref+'.json','utf8').then(JSON.parse);
const lookup=n=>({...state.evidence[n-1],number:n,validity:'current'});
const failed=state.work.find(w=>w.id.endsWith('frontier-return:2be3727572ec9466'));
const saved=await readArtifact(failed.operationState.correction.originalReplyRef);
const claim=saved.output.conclusion.nativeFacts.find(f=>f.evidenceNumber===1061);
const report={schema:'slice272_convergence_boundaries_v932',providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
async function check(name,fn){try{await fn();report.checks.push({name,pass:true});}catch(e){report.checks.push({name,pass:false,error:e.stack});}}
const verify=(c,opts={})=>facts.verifyRosterNativeFactsV1({conclusion:{status:'answered',nativeFacts:[c],evidenceNumbers:[1061]},
  lookup,readArtifact,isRead:()=>true,...opts});
await check('Actual Native rejection is a negative fact, not combat success',async()=>{
  const r=await verify(claim);assert.deepEqual(r.errors,[]);
  assert.equal(r.facts[0].observationKind,'rules_rejection');
  assert.equal(r.facts[0].combatResultProduced,false);
  assert.equal(r.facts[0].observedValue,'ARMY_MINERAL_BUDGET_EXCEEDED');
  for(const c of [{...claim,expectedValueJson:'"OTHER"'},{...claim,pointer:'/receipt/estimate/outcomes/expectedDamage'},
    {...claim,pointer:'/queryRepair/nativeRejection/candidateInputContract'}])assert((await verify(c)).errors.length);
  assert((await verify(claim,{isRead:()=>false})).errors.length);
  assert((await verify(claim,{lookup:n=>({...lookup(n),validity:'stale'})})).errors.length);
  const body=await readArtifact(lookup(1061).artifactRef);body.queryRepair.nativeRejection.rulesErrorCode='FORGED';
  assert((await verify(claim,{readArtifact:async()=>body})).errors.length);
});
await check('Same paid reply has one exact-source revalidation, no new model retry',async()=>{
  const plan=await facts.projectRosterNativeRejectionRevalidationV1({state,work:failed,reply:saved,readArtifact});
  assert.equal(plan.repairKind,'native_rejection_fact');assert.equal(plan.providerReplayed,false);
  const pending=structuredClone(failed);pending.operationState.pending={requestRef:'inflight'};
  assert.equal(await facts.projectRosterNativeRejectionRevalidationV1({state,work:pending,reply:saved,readArtifact}),null);
});
await check('Scoped review preserves globals separately and exposes exact two-way arithmetic',async()=>{
  const review=state.work.findLast(w=>w.comparisonClosureCycleId);
  const assignment={workId:review.id,role:review.role,inputs:review.inputs};
  const projected=await closure.projectRosterComparisonAdjudicationAssignmentV1({assignment,state,readArtifact});
  const boundary=projected.inputs.comparisonAdjudication.value;
  assert.equal(boundary.version,2);assert(boundary.globalPendingQuestions.length);
  assert.equal(boundary.globalQuestionsAreAutomaticallyLocalBlockers,false);
  const arithmetic=boundary.comparisons.find(c=>c.evidenceNumber===866).meaning;
  assert.equal(arithmetic.reverseQuery.subject.attackerUnitId,'marauder-2');
  assert.equal(arithmetic.reverseQuery.reference.attackerUnitId,'goliath-1');
  assert.equal(arithmetic.reverseQuery.satisfied,true);assert.equal(arithmetic.evaluatedQuery.satisfied,false);
  assert.equal(rosterWorkflowAcceptanceStageV1(projected).stage,'optional_comparison_closure');
  const decision=state.work.find(w=>w.inputs?.comparisonClosureReview?.id==='role:'+review.id);
  assert.equal((await closure.projectRosterComparisonAdjudicationAssignmentV1({
    assignment:{workId:decision.id,role:decision.role,inputs:decision.inputs},state,readArtifact
  })).inputs.comparisonAdjudication.value.reviewWorkId,review.id);
  assert.equal(assignment.inputs.comparisonAdjudication,undefined,'No checkpoint mutation');
});
await check('Retain without a Plan binding/commit resolves only against the actual current delivered Plan',async()=>{
  const s=structuredClone(state),author=s.work.find(w=>w.id.endsWith('plan-revision-return:r12:strategy-frontier'));
  const result=await readArtifact(author.resultRef),handoff=result.value.comparisonClosureHandoff;
  const call=author.operationState.calls.find(c=>c.replyRef===handoff.sourceReplyRef),request=await readArtifact(call.requestRef);
  const decision=result.value.decisions[0];decision.disposition='retain';decision.mutation=null;decision.strategicChanges=[];
  author.draftRevision=s.draftRevision;delete author.bindings.plan;
  const delivered=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.wholeDraft.value;
  delivered.revision=s.draftRevision;delivered.plan.planHash=s.scope.plan;
  const outcome={applied:false,status:'retained',acceptanceGranted:false};
  s.events=s.events.filter(e=>e.type!=='draft_committed'||e.workId!==author.id);
  const reader=ref=>ref===author.resultRef?result:ref===author.draftOutcomeRef?outcome:ref===call.requestRef?request:readArtifact(ref);
  const cycle={id:handoff.cycleId,comparisonPurposeWorkId:handoff.purposeWorkId,comparisonPurposeResultRef:handoff.purposeResultRef};
  assert.equal((await closure.resolveRosterComparisonClosureRequestV1({state:s,cycle,readArtifact:reader}))?.authorWorkId,author.id);
  delivered.plan.planHash='wrong-plan';
  assert.equal(await closure.resolveRosterComparisonClosureRequestV1({state:s,cycle,readArtifact:reader}),null);
});
report.pass=report.checks.every(c=>c.pass);if(!report.pass)process.exitCode=1;
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
