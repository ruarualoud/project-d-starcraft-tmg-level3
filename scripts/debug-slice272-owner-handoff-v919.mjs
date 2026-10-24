// Actual B request + controlled coordination variants at production boundaries.
// No Provider calls, original-record writes, or simulated strategy approval.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterIncomingAuthorContextV1} from '../packages/roster-strategist/roster-workflow-strategy-owner-context-v1.mjs';
import {focusRosterWorkflowCorrectionRequestV1} from '../packages/roster-strategist/roster-workflow-correction-context-v1.mjs';
const [requestPath,output,priorPath]=process.argv.slice(2),copy=structuredClone;
const prior=priorPath?JSON.parse(await fs.readFile(priorPath,'utf8')):null;
const request=JSON.parse(await fs.readFile(requestPath,'utf8'));
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const report={schema:'slice272_owner_handoff_v919',sourceRequest:requestPath,providerCalls:0,nativeCalls:0,productionWrites:0,steps:[]};
try{
  const incoming=projectRosterIncomingAuthorContextV1(assignment);
  if(!prior?.steps?.includes('Actual source-dispute return receives current-owner scope; old-role restrictions separated, not deleted')){
  assert.ok(incoming,'Actual typed source-dispute return bypasses strategic owner context');
  assert.equal(incoming.node.returnKind,'source_interpretation_challenge');
  assert.deepEqual(incoming.node.questions,assignment.inputs.investigationFrontier.value.unresolvedQuestions);
  assert.equal(incoming.node.factApprovalGranted,false);
  assert.equal(incoming.node.planApprovalGranted,false);
  assert.deepEqual(incoming.inputs.batchFacts0,assignment.inputs.batchFacts0);
  assert.deepEqual(incoming.history.factOwnerOriginalQuestion.value,assignment.inputs.investigationFrontier.value.originalQuestion);
  assert.equal(incoming.inputs.investigationFrontier.value.originalQuestion,undefined);
  }else report.inheritedPassedStep={from:priorPath,step:1};
  report.steps.push('Actual source-dispute return receives current-owner scope; old-role restrictions separated, not deleted');
  let saved;
  const routed={...copy(request),promptNodes:request.promptNodes.map(n=>n.kind==='workflow_role_assignment'?{...n,inputs:incoming.inputs}:copy(n))};
  routed.promptNodes.push(incoming.node,{kind:'historical_assignment_context',assignments:incoming.history});
  const source={evidenceNumber:9999,id:'test:immutable-context',title:'Exact context',kind:'capability_result'};
  const focused=await focusRosterWorkflowCorrectionRequestV1({request:routed,publishContext:async value=>{saved=copy(value);return source;}});
  const after=focused.request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  assert.deepEqual(saved,routed,'Deferred context must remain exact and readable');
  assert.deepEqual(after.inputs.batchFacts0,assignment.inputs.batchFacts0,'Current returned facts must not be deferred with historical background');
  assert.deepEqual(after.inputs.batchToolSource0,assignment.inputs.batchToolSource0,'Current Native source remains inline');
  assert.deepEqual(after.inputs.wholeDraft,assignment.inputs.wholeDraft,'Do not rewrite the current Plan');
  assert.deepEqual(focused.request.promptNodes.find(n=>n.kind==='registered_native_measurement_supplements'),request.promptNodes.find(n=>n.kind==='registered_native_measurement_supplements'));
  assert.equal(after.inputs.decisionEvidenceDirectory.source,'deferred_context');
  assert.equal(after.inputs.decisionEvidenceDirectory.evidenceNumber,9999);
  assert.equal(after.inputs.sourceInterpretationChallenges.source,'deferred_context','Duplicate routing payload stays retrievable without duplicating current facts');
  const context=focused.request.promptNodes.find(n=>n.kind==='strategy_owner_context');
  assert.ok(context.deferred.length);
  for(const item of context.deferred){
    const value=item.pointer.split('/').slice(1).reduce((v,k)=>v[k.replaceAll('~1','/').replaceAll('~0','~')],saved);
    assert.notEqual(value,undefined,'Every deferred pointer resolves');
  }
  report.steps.push('Actual request transformation keeps latest facts/Native supplements/Plan inline; exact history pointers resolve');
  const baseCoordination=assignment.inputs.batchFacts0.value.coordination;
  for(const [kind,origin]of [['author_decision_return','deterministic_task_router'],['source_interpretation_challenge','deterministic_material_router'],['work_order_capability_return','deterministic_compiler_router'],['work_order_delegation_return','deterministic_compiler_router']]){
    const a=copy(assignment),c=a.inputs.batchFacts0.value.coordination;
    Object.assign(c,{kind,origin,nativeRetryAuthorized:false,questions:[{question:'Choose bounded next method',classification:'author_decision'}],failure:{code:'injected-control-diagnostic'}});
    const out=projectRosterIncomingAuthorContextV1(a);assert.ok(out,kind);assert.equal(out.node.returnKind,kind);
    assert.deepEqual(out.inputs.batchFacts0,a.inputs.batchFacts0);
  }
  for(const [name,change]of [
    ['wrong role',a=>{a.role='roster_workflow_fact_summary';}],
    ['unrecognized origin',a=>{a.inputs.batchFacts0.value.coordination.origin='model';}],
    ['wrong predecessor',a=>{a.inputs.batchFacts0.value.coordination.originalAssignmentWorkId='unrelated';}],
    ['wrong source',a=>{a.inputs.batchFacts0.evidenceId='role:unrelated';}],
    ['approved facts spoof',a=>{a.inputs.batchFacts0.value.coordination.factApprovalGranted=true;}],
    ['plan approval spoof',a=>{a.inputs.batchFacts0.value.coordination.planApprovalGranted=true;}],
    ['native retry spoof',a=>{a.inputs.batchFacts0.value.coordination.nativeRetryAuthorized=true;}],
    ['unknown return',a=>{a.inputs.batchFacts0.value.coordination.kind='arbitrary_return';}],
  ]){const a=copy(assignment);change(a);assert.equal(projectRosterIncomingAuthorContextV1(a),null,name);}
  report.steps.push('Four known control-return types share the boundary; eight wrong identity/authority cases excluded');
  const unchanged=await focusRosterWorkflowCorrectionRequestV1({request,publishContext:()=>{throw Error('Unexpected context publication');}});
  assert.equal(unchanged.request,request,'Unrouted ordinary decisions retain their existing behavior');
  const inlineBefore=JSON.stringify(routed).length,inlineAfter=JSON.stringify(focused.request).length;
  report.inlineCharacters={before:inlineBefore,after:inlineAfter,reduction:inlineBefore-inlineAfter};
  assert.ok(inlineAfter<inlineBefore);
  report.steps.push('No new model round or mandatory read; size metric is not a strategy-quality claim');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack.split('\n').slice(0,5);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
