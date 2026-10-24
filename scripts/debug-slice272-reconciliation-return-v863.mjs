// Regression for an actual whole-product loop: accepted same-source child
// reconciliation was re-blocked by its parent's unchanged-material fence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowFrontierReturnsV1} from '../packages/roster-strategist/roster-workflow-frontier-return-v1.mjs';
import {rosterSourceReviewRepairStageV1} from '../packages/roster-strategist/roster-experiment-source-repair-v1.mjs';
const [snapshotFile,reportFile,priorFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(snapshotFile,'utf8')),artifacts=new Map(saved.artifacts);
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null,results=[];
const original=structuredClone(saved.state),first=original.work.findIndex(w=>w.resumesStrategyFrontierOf);
assert.ok(first>0);original.work=original.work.slice(0,first);
const frontier=original.work.find(w=>w.inputs.sourceInterpretationChallenges);
// Reconstruct the first boundary, not the later repeated frontier marker.
// Identities come from its actual saved response, no model facts are altered.
original.work.find(w=>w.id===frontier.investigationFrontierOf).investigationHandoff.decisionId=frontier.id;
const child=original.work.find(w=>w.investigationFor===frontier.id);
const response=original.work.find(w=>w.inputs.investigation?.id==='role:'+child.id);
const review=original.work.find(w=>w.experimentSourceReviewOf===child.id);
const readArtifact=async ref=>structuredClone(artifacts.get(ref));
async function jobFor(change=()=>{}){const state=structuredClone(original);await change(state);
  return (await createRosterWorkflowFrontierReturnsV1({state,readArtifact})).find(w=>w.completedStrategicDecisionId===response.id);}
async function stageFor(job){const inputs=structuredClone(job.inputs);
  for(const input of Object.values(inputs))if(input.source==='evidence'){
    const e=original.evidence.find(e=>e.id===input.id);input.value=await readArtifact(e.artifactRef);
    input.evidenceId=e.id;input.status='read';input.validity='current';input.kind=e.kind;
  }return rosterSourceReviewRepairStageV1(inputs);}
async function check(id,run){const p=prior?.results.find(r=>r.id===id&&r.pass);if(p){results.push({...p,inheritedFrom:priorFile});return;}
  try{results.push({id,pass:true,...await run()});}catch(e){results.push({id,pass:false,error:e.message});}
  console.log(JSON.stringify(results.at(-1)));}
await check('P5/accepted-exact-reconciliation-returns-to-parent',async()=>{
  const job=await jobFor(),reconciliation=job.inputs.sourceReconciliation?.value;
  assert.ok(reconciliation,'Accepted same-source reconciliation must reach the parent explicitly');
  assert.equal(reconciliation.questions.length,1);assert.equal(reconciliation.factsApproved,false);
  assert.equal(reconciliation.parentReviewStillRequired,true);
  const stage=await stageFor(job);assert.equal(stage.phase,'source_claim_correction');
  assert.equal(stage.reconciledNecessaryQuestions.length,1);assert.equal(stage.originalNecessaryQuestions.length,1);
  return {question:reconciliation.questions[0].question,sourceReviewWorkId:reconciliation.questions[0].sourceReviewWorkId};
});
await check('P5/pending-child-review-cannot-clear-fence',async()=>{
  const job=await jobFor(s=>{s.work.find(w=>w.id===review.id).status='needs_model_choice';});
  assert.equal(job?.inputs.sourceReconciliation,undefined);
});
await check('P5/foreign-question-does-not-cover-original',async()=>{
  const job=await jobFor(s=>{const f=s.work.find(w=>w.id===frontier.id),old=artifacts.get(f.resultRef);
    const altered=structuredClone(old);altered.value.decisions[0].dataQuestions.forEach(q=>q.question='另一问题，与原指标无关');
    altered.value.decisions[0].requiredData=['另一问题，与原指标无关'];artifacts.set('injected-foreign-question',altered);f.resultRef='injected-foreign-question';});
  assert.equal(job?.inputs.sourceReconciliation,undefined);
});
await check('P5/stale-child-cannot-return',async()=>{
  const job=await jobFor(s=>{s.work.find(w=>w.id===child.id).bindings.map='different-map';});assert.equal(job,undefined);
});
await check('P5/other-missing-predicate-remains',async()=>{
  const job=await jobFor();assert.ok(job.inputs.sourceReconciliation);
  const stage=await stageFor(job);
  const added={question:'确实未测的第二指标',classification:'necessary_fact',publicReason:'不属于刚才核对范围',evidenceNumbers:[]};
  const inputs={sourceRepairStage:{source:'literal',value:stage},sourceReview:{source:'literal',value:{checks:[{
    checkId:'specific-missing',verdict:'needs_evidence',publicReason:'保持真正未知',dataQuestions:[added]}]}},sourceReconciliation:job.inputs.sourceReconciliation};
  const remaining=rosterSourceReviewRepairStageV1(inputs);assert.equal(remaining.phase,'missing_fact_investigation');
  assert.equal(remaining.necessaryQuestions.length,1);assert.equal(remaining.necessaryQuestions[0].question,added.question);
});
await check('P5/new-review-same-question-is-not-old-reconciliation',async()=>{
  const job=await jobFor(),question=job.inputs.sourceReconciliation.value.questions[0].question;
  const stage=rosterSourceReviewRepairStageV1({sourceReconciliation:job.inputs.sourceReconciliation,
    sourceReview:{source:'evidence',evidenceId:'role:new-independent-review',status:'read',value:{checks:[{
      checkId:'new-finding',verdict:'needs_evidence',publicReason:'New specific finding after the original reconciliation',
      dataQuestions:[{question,classification:'necessary_fact',publicReason:'Same words, different review finding',evidenceNumbers:[]}]}]}}});
  assert.equal(stage.phase,'missing_fact_investigation');assert.equal(stage.necessaryQuestions.length,1);
});
await fs.writeFile(reportFile,JSON.stringify({passed:results.every(r=>r.pass),results,snapshotFile,actualProviderCalls:0,
  nativeCalls:0,productionWrites:0,scope:'Existing actual product trace; no workflow replay'},null,2)+'\n');
if(results.some(r=>!r.pass))process.exitCode=1;
