// Concrete v798 feedback/author pair: a returned explicit choice must not be
// routed back to the same author merely because the immutable review is old.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterSourceReviewRepairStageV1} from '../packages/roster-strategist/roster-experiment-source-repair-v1.mjs';
import {projectRosterWorkflowQuestionRouteV1,createRosterWorkflowAuthorDecisionReturnV1} from '../packages/roster-strategist/roster-workflow-question-routing-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const repair=state.work.find(w=>w.id.endsWith('frontier-return:46f96c9a2daadcb0:source-revision'));
const feedback=Object.fromEntries(await Promise.all(Object.entries(repair.inputs).filter(([key])=>
  key==='sourceReview'||/^failedSourceClaim\d+$/u.test(key)).map(async([key,input])=>{
    const source=state.evidence.find(e=>e.id===input.id);assert.ok(source);
    return [key,{source:'evidence',status:'read',validity:'current',kind:source.kind,evidenceId:input.id,value:await get(source.artifactRef)}];
  })));
const author=state.work.find(w=>w.id.endsWith('frontier-return:46f96c9a2daadcb0:source-revision:strategy-frontier'));
assert.equal(author.status,'evidence_ready');
const actualSource=state.evidence.find(e=>e.id==='role:'+author.id);
const actual=await get(actualSource.artifactRef);
// Real persisted accepted-as-proposal source with the SAME resolver envelope.
// No model result, approval or factual content is synthesized in this fixture.
const resolution={source:'evidence',status:'read',validity:'current',kind:actualSource.kind,evidenceId:actualSource.id,value:actual};
const original=JSON.stringify({feedback,resolution});
const inputs={...feedback,strategyResolution:resolution};
const stage=rosterSourceReviewRepairStageV1(inputs);
assert.equal(stage.phase,'source_claim_correction','the new decision must reach its original pending question');
assert.equal(stage.authorDecisions.length,0);
assert.equal(stage.resolvedAuthorDecisions.length,1);
assert.equal(stage.originalAuthorDecisions.length,1);
assert.equal(stage.pendingClaimCorrections.length,2);
assert.equal(stage.resolvedAuthorDecisions[0].resolution.evidenceId,resolution.evidenceId);
assert.equal(stage.resolvedAuthorDecisions[0].resolution.classification,'decided_here');
const route=projectRosterWorkflowQuestionRouteV1(inputs);
assert.equal(route.kind,'source_correction');
assert.equal(createRosterWorkflowAuthorDecisionReturnV1({assignment:{role:'roster_workflow_experiment_planner',inputs},directory:[],route}),null);
assert.equal(JSON.stringify({feedback,resolution}),original,'never rewrite old review or actual author output');
assert.deepEqual(rosterSourceReviewRepairStageV1(JSON.parse(JSON.stringify(inputs))),stage,'cold-resolved input has the same result');
for(const patch of [
  {...resolution,source:'literal'},
  {...resolution,status:'available_unread'},
  {...resolution,validity:'historical'},
  {...resolution,kind:'interpretation'},
  {...resolution,value:{decisions:actual.decisions.map(d=>({...d,disposition:'investigate'}))}},
  {...resolution,value:{decisions:actual.decisions.map(d=>({...d,dataQuestions:d.dataQuestions.map(q=>({...q,question:q.question+' DIFFERENT'}))}))}},
])assert.equal(rosterSourceReviewRepairStageV1({...feedback,strategyResolution:patch}).phase,'author_decision_return');
const factual=structuredClone(inputs);
factual.sourceReview.value.checks[0].dataQuestions.push({question:'A genuinely missing current measurement',classification:'necessary_fact',publicReason:'not measured',evidenceNumbers:[]});
assert.equal(rosterSourceReviewRepairStageV1(factual).phase,'missing_fact_investigation');
assert.equal(rosterSourceReviewRepairStageV1(factual).necessaryQuestions.length,1);
assert.equal(rosterSourceReviewRepairStageV1(factual).resolvedAuthorDecisions.length,1);
console.log(JSON.stringify({pass:true,actualReviewAndChoiceUsed:true,originalQuestionPreserved:true,
  onlyExplicitMatchingReadChoiceConsumed:true,unknownNotApproved:true,claimCorrectionStillRequired:true,
  realProviderCalls:0,nativeCalls:0,productionWrites:0}));
