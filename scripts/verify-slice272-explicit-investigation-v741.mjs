// Concrete regression: actual strategy owners recorded the same pending list,
// and the product implicitly authorized that whole list as another inquiry.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as inquiry from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
import {ROSTER_WORKFLOW_STRATEGY_DECISION_CONTRACT_V1 as contract}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(process.argv[2]);
const original=await fs.readFile(path.join(root,'workflow.json'),'utf8'),state=JSON.parse(original);
const readArtifact=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const ref='eff59400457a8fefff54124dfabfe242bd3bb322ae55e2a5b59b2189fda8c987';
const saved=await readArtifact(ref),decision=saved.value.decisions[0];
assert.equal(decision.disposition,'record_facts');
assert(decision.requiredData.length>1&&decision.requiredDecisions.length>0);
const failures=[];
async function check(name,run){try{await run();}catch(e){failures.push({name,error:e.message});}}
await check('current-author-contract-separates-pending-from-authorized',()=>{
  assert(contract.providerSchema.properties.decisions.items.properties.nextInvestigation);
  assert.equal(typeof inquiry.rosterDecisionInvestigationErrorV1,'function');
  const error=inquiry.rosterDecisionInvestigationErrorV1({...decision,nextInvestigation:null});
  assert.equal(error.code,'pending_questions_are_not_investigation_authorization');
});
await check('only-explicit-selected-predicate-goes-to-fact-role',async()=>{
  const authorized={...structuredClone(decision),disposition:'investigate',
    nextInvestigation:{questionNumbers:[1],decisionToEnable:'Choose the counterfire branch before selecting the roster alternative.',
      whyExistingEvidenceInsufficient:'The saved branch measured only one target.',
      expectedNewObservation:'An independent counterfire result for the other target under the same local conditions.',
      stopWhen:'Return that result or a concrete capability failure; do not replay a whole match.'}};
  const work={role:'roster_workflow_experiment_planner',investigationFor:'controlled-author',
    inputs:{decision:{source:'literal',value:{decisions:[authorized]}}}};
  const projected=await inquiry.projectRosterWorkflowFactInquiryV1({work,state,readArtifact});
  assert.deepEqual(projected.question.value.necessaryQuestions,[authorized.dataQuestions[0].question]);
  assert.deepEqual(projected.question.value.authorDecisions,[]);
  assert.equal(projected.decision.value.pendingNotAuthorized.facts.length,decision.requiredData.length-1);
  assert.equal(projected.decision.value.pendingNotAuthorized.authorDecisions.length,decision.requiredDecisions.length);
  assert.equal(projected.question.value.authorization.decisionToEnable,authorized.nextInvestigation.decisionToEnable);
  assert.equal(inquiry.rosterDecisionInvestigationErrorV1(authorized),null);
  for(const questionNumbers of [[0],[1,1],[3],[999]]){
    assert(inquiry.rosterDecisionInvestigationErrorV1({...authorized,
      nextInvestigation:{...authorized.nextInvestigation,questionNumbers}}));
  }
});
await check('unfinished-questions-are-not-deleted-and-legacy-is-explicit',async()=>{
  const work={role:'roster_workflow_experiment_planner',inputs:{decision:{source:'literal',value:saved.value}}};
  const projected=await inquiry.projectRosterWorkflowFactInquiryV1({work,state,readArtifact});
  assert.deepEqual(projected.question.value.necessaryQuestions,decision.requiredData);
  assert.equal(projected.question.value.authorizationScope,'legacy_already_assigned');
  const valid={disposition:'retain',dataQuestions:[],requiredData:[],requiredDecisions:[],nextInvestigation:null};
  assert.equal(inquiry.rosterDecisionInvestigationErrorV1(valid),null);
});
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({passed:failures.length===0,failures,actualResultRef:ref,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
