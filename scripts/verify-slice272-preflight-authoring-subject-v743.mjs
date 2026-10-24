// Actual preflight rejected a declaration in its assigned experiment design
// because the generic validator demanded that it appear in the battle Plan.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as questions from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
import {rosterDecisionRoleInstructionsV1} from '../packages/roster-strategist/roster-decision-role-instructions-v1.mjs';
const root=path.resolve(process.argv[2]),before=await fs.readFile(path.join(root,'workflow.json'),'utf8');
const state=JSON.parse(before),read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const actual=await read('f8b3c6bb64ee4e7aacdab0e3af557e4050e9349cf1747629666044c58c6eab84');
const assignment=actual.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const feedback=actual.promptNodes.find(n=>n.kind==='local_contract_feedback');
assert(feedback.errors.some(e=>e.code==='authored_choice_requires_current_plan_source'));
const question=feedback.originalOutput.checks.flatMap(c=>c.dataQuestions)
  .find(q=>q.classification==='authored_choice');
const entries=state.evidence.map((e,i)=>({...e,number:i+1}));
const failures=[];
function check(name,run){try{run();}catch(e){failures.push({name,error:e.message});}}
check('preflight-declaration-owned-by-exact-design-not-plan',()=>{
  const subject=questions.rosterWorkflowAuthoredSubjectV1(assignment);
  assert.equal(subject.kind,'comparison_design');
  assert.equal(subject.evidenceId,assignment.inputs.proposedDesign.evidenceId);
  assert.equal(questions.rosterAuthoredChoiceSourceErrorV1({question,entries,draftRevision:3,subject}),null);
  const plan=entries.find(e=>e.id==='draft:r3:summary');
  assert(questions.rosterAuthoredChoiceSourceErrorV1({question:{...question,evidenceNumbers:[plan.number]},
    entries,draftRevision:3,subject}),'the Plan cannot substitute for the assigned design');
  assert(questions.rosterAuthoredChoiceSourceErrorV1({question,entries,draftRevision:3,
    subject:{...subject,evidenceId:'role:different-design'}}),'another design cannot substitute');
  assert(questions.rosterAuthoredChoiceSourceErrorV1({question,entries,draftRevision:3}),
    'ordinary Plan review must not accept an experiment declaration');
});
check('actual-role-routes-to-preflight-not-global-strategy-review',()=>{
  const instructions=rosterDecisionRoleInstructionsV1(actual);
  assert(instructions.includes('PRE-EXECUTION'));
  assert(instructions.includes('post-observation'));
  assert(!instructions.includes('ONE assigned strategic domain'));
});
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0,
  actualRequestRef:'f8b3c6bb64ee4e7aacdab0e3af557e4050e9349cf1747629666044c58c6eab84'}));
if(failures.length)process.exitCode=1;
