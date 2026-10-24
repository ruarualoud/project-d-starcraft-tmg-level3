// Actual normal fact-owner return missed the shared owner context projection.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterIncomingAuthorContextV1 as project} from '../packages/roster-strategist/roster-workflow-strategy-owner-context-v1.mjs';
const [assignmentFile,output]=process.argv.slice(2),copy=structuredClone;
const report={schema:'slice272_owner_normal_return_v923',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const assignment=JSON.parse(await fs.readFile(assignmentFile,'utf8')),before=copy(assignment);
  const actual=project(assignment);
  assert.ok(actual,'Actual fact_owner_strategy_required return bypassed the owner contract');
  assert.equal(actual.node.returnKind,'fact_owner_strategy_required');
  assert.equal(actual.node.factApprovalGranted,false);assert.equal(actual.node.planApprovalGranted,false);
  assert.deepEqual(actual.inputs.batchFacts0,assignment.inputs.batchFacts0);
  assert.deepEqual(actual.inputs.wholeDraft,assignment.inputs.wholeDraft);
  assert.deepEqual(actual.history.originalQuestion,assignment.inputs.originalQuestion);
  assert.equal(actual.inputs.originalQuestion,undefined);
  assert.deepEqual(actual.node.questions,assignment.inputs.investigationFrontier.value.unresolvedQuestions);
  assert.deepEqual(assignment,before);
  const normalReasons=['fact_owner_blocked','investigation_decision_window_complete','completed_batch_contains_only_exact_reused_observations'];
  for(const reason of normalReasons){
    const a=copy(assignment);a.inputs.investigationFrontier.value.returnReason=reason;
    if(reason==='fact_owner_blocked')a.inputs.batchFacts0.value.experimentConclusion.status='blocked';
    else a.inputs.batchFacts0.value.experimentConclusion=null;
    const result=project(a);assert.ok(result,reason);assert.equal(result.node.returnKind,reason);
    assert.equal(result.node.factApprovalGranted,false);
  }
  const invalid=[
    a=>{a.role='roster_workflow_experiment_planner';},
    a=>{a.inputs.batchFacts0.evidenceId='role:another-owner';},
    a=>{a.inputs.batchFacts0.validity='historical';},
    a=>{a.inputs.investigationFrontier.value.acceptanceGranted=true;},
    a=>{a.inputs.investigationFrontier.value.nativeActionSucceededByHandoff=true;},
    a=>{a.inputs.batchFacts0.value.experimentConclusion.status='answered';},
    a=>{a.inputs.investigationFrontier.value.returnReason='unrecognized';},
    a=>{a.inputs.batchFacts0.value.coordination={kind:'source_interpretation_challenge',version:1,origin:'wrong'};},
  ];
  for(const mutate of invalid){const a=copy(assignment);mutate(a);assert.equal(project(a),null);}
  report.pass=true;report.checked={actualReturn:1,syntheticNormalReturns:normalReasons.length,rejectedMismatches:invalid.length};
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack.split('\n').slice(0,4);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
