// Actual v978 owner saw 172 global old questions and a closed comparison's
// complete proposal as current input while owning four reconsideration questions.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {focusRosterWorkflowCorrectionRequestV1} from '../packages/roster-strategist/roster-workflow-correction-context-v1.mjs';
const original=JSON.parse(await fs.readFile(process.argv[2]+'/artifacts/5133e2413f79a9f952bf921591e177f6bfb55f0ce62b4d88b0bc09328150de22.json','utf8'));
const before=hash(original),copy=structuredClone;
let saved;
const publishContext=async value=>{saved=copy(value);return {id:'offline-v979-source',evidenceNumber:100000,
  title:'Exact scoped context',kind:'interpretation',artifactRef:hash(value)};};
const old=original.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.equal(old.requirements.value.strategyQuestions.length,172);
assert.equal(old.strategicHypothesisChallenge.value.comparisonMemory.comparisonResolved,true);
const {request}=await focusRosterWorkflowCorrectionRequestV1({request:original,publishContext});
const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.equal(inputs.requirements.value.strategyQuestions.source,'deferred_context',
  'Global historical ledger must not masquerade as this scoped owner assignment');
assert.equal(inputs.requirements.value.strategyQuestions.itemCount,172);
assert.equal(inputs.strategicHypothesisChallenge.value.proposal.source,'deferred_context');
const memory=inputs.strategicHypothesisChallenge.value.comparisonMemory;
assert.equal(memory.comparisonResolved,true);assert.equal(memory.comparisonStatus,'optional_comparison_closed');
assert.equal(memory.owner.decision.source,'deferred_context');
assert.equal(memory.review.checks.source,'deferred_context');
const node=request.promptNodes.find(n=>n.kind==='strategy_owner_context');
assert.equal(node.assignmentScope.globalLedgerIsCurrentAssignment,false);
assert.equal(node.assignmentScope.closedComparisonIsCurrentAssignment,false);
assert.equal(node.assignmentScope.questionCount,4);
for(const name of ['draft','currentArmyAuthority','currentArmyIdentity','currentArmyConfiguration',
  'tools','toolContractSource','priorInvestigationConclusion0','priorInvestigationReview0'])
  assert.deepEqual(inputs[name],old[name],'Keep current authority and returned facts: '+name);
const at=(value,pointer)=>pointer.split('/').slice(1).reduce((v,k)=>v[k.replaceAll('~1','/').replaceAll('~0','~')],value);
for(const deferred of node.deferred){
  assert.deepEqual(at(saved,deferred.pointer),at(original,deferred.pointer),deferred.name+' remains exactly readable');
}
const open=copy(original);
open.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.strategicHypothesisChallenge.value.comparisonMemory.comparisonResolved=false;
const openResult=await focusRosterWorkflowCorrectionRequestV1({request:open,publishContext});
assert.deepEqual(openResult.request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.strategicHypothesisChallenge.value.proposal,
  old.strategicHypothesisChallenge.value.proposal,'Do not hide an unresolved comparison using the closed-work rule');
assert.equal(hash(original),before);
console.log(JSON.stringify({ok:true,checks:['four_assigned_questions_not_172_global_tasks','closed_proposal_is_readable_history',
  'current_authority_and_facts_unchanged','every_deferred_value_exact','open_comparison_not_deferred'],
  oldAssignmentChars:JSON.stringify(old).length,newAssignmentChars:JSON.stringify(inputs).length,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
