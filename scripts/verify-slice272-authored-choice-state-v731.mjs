// The paid author retained an already declared Plan target, but the protocol
// only had unresolved author_decision and measured answered_fact.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as questions from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(process.argv[2]);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8')),before=JSON.stringify(state);
const work=state.work.find(w=>w.status==='needs_repair'
  &&w.operationState?.correction?.errors?.some(e=>e.code==='author_choice_requires_author_action'));
assert.ok(work);
const call=work.operationState.calls.at(-1),reply=await read(call.replyRef),request=await read(call.requestRef);
const q=reply.output.decisions[0].dataQuestions.find(q=>q.classification==='author_decision');
const draft=await read(state.draftRef);
assert.equal(draft.plan.scoreRoute.scheduleStatus,'declared');
assert.deepEqual(draft.plan.scoreRoute.targetVpSchedule.map(x=>x.plannedCumulativeVp),[0,2,5,8,11]);
const planNumber=state.evidence.findIndex(e=>e.id===`draft:r${state.draftRevision}:plan:scoreRoute`)+1;
assert.ok(planNumber>0);
const failures=[],check=(name,fn)=>{try{fn();}catch(error){failures.push({case:name,error:error.message});}};
check('distinct-authored-state',()=>{
  assert.ok(questions.ROSTER_REVIEW_DATA_QUESTION_SCHEMA_V1.properties.classification.enum.includes('authored_choice'));
  const selected={...q,classification:'authored_choice',evidenceNumbers:[planNumber]};
  const projected=questions.projectRosterReviewDataQuestionsV1({dataQuestions:[selected]});
  assert.deepEqual(projected.requiredDecisions,[]);
  assert.deepEqual(projected.authoredChoices,[selected]);
  assert.deepEqual(projected.answeredData,[],'authored intent must not turn into an observed game fact');
});
check('actual-plan-source-required',()=>{
  assert.equal(typeof questions.rosterAuthoredChoiceSourceErrorV1,'function');
  const selected={...q,classification:'authored_choice',evidenceNumbers:[planNumber]};
  const entries=state.evidence.map((e,i)=>({number:i+1,...e}));
  assert.equal(questions.rosterAuthoredChoiceSourceErrorV1({question:selected,entries,draftRevision:state.draftRevision}),null);
  assert.ok(questions.rosterAuthoredChoiceSourceErrorV1({question:{...selected,evidenceNumbers:q.evidenceNumbers},
    entries,draftRevision:state.draftRevision}),'Rules sources alone cannot prove the current author choice');
  assert.ok(questions.rosterAuthoredChoiceSourceErrorV1({question:selected,entries,draftRevision:state.draftRevision+1}),
    'an old Plan source cannot declare the new Plan complete');
});
check('one-real-source-recovery',()=>{
  const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request});
  assert.equal(recovery?.repairKind,'authored_choice_resolution');
  assert.equal(recovery.additionalInvalidResultLimit,1);
  assert.equal(recovery.historyReset,false);
  const corrected=structuredClone(request);
  corrected.responseFormat.schema.properties.decisions.items.properties.dataQuestions.items.properties.classification.enum.push('authored_choice');
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:corrected}),null);
});
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
