// Reproduce the v930 live queue: optional-closure review raced the old study.
// Fixtures are in memory; no model, Native call, or production-state mutation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {selectRosterPurposePriorityV1} from '../packages/roster-strategist/roster-workflow-ownership-v1.mjs';
const [directory,output]=process.argv.slice(2);
const report={schema:'slice272_closure_priority_v931',providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
  const closure=state.work.findLast(w=>w.comparisonClosureCycleId&&w.comparisonClosureContractVersion===1);
  assert(closure,'Actual saved closure review required');
  const purpose=state.work.find(w=>w.strategyComparisonDesignCycleId===closure.comparisonClosureCycleId
    &&w.resultRef===closure.comparisonPurposeResultRef);
  const response=state.work.find(w=>w.inputs?.comparisonClosureReview?.id==='role:'+closure.id);
  assert(response,'Actual saved closure response required');
  const before=JSON.stringify(state);
  const during=structuredClone(state);
  // Reconstruct only the dispatch status at events 7663/7706. That exact
  // legacy continuation has since exhausted corrections; retain its payload.
  const legacy=during.work.find(w=>w.id.endsWith('frontier-return:2be3727572ec9466'));
  assert(legacy&&state.events.some(e=>e.type==='dispatch'&&e.workId===legacy.id));
  legacy.status='ready';
  during.work.find(w=>w.id===closure.id).status='ready';
  assert.deepEqual(selectRosterPurposePriorityV1({state:during,purposeWorkId:purpose.id}),[closure.id],
    'A pending closure review must run alone, before old study or writer continuations');
  report.checks.push('Actual pending closure review has exclusive dispatch priority');
  assert.deepEqual(selectRosterPurposePriorityV1({state,purposeWorkId:purpose.id}),[response.id],
    'After review the explicit closure-feedback decision, not the old study, owns the next quantum');
  report.checks.push('Actual explicit feedback response is next after review');
  for(const change of [w=>{w.comparisonPurposeResultRef='wrong-source';},
    w=>{w.draftRevision--;},w=>{w.bindings.plan='wrong-plan';},
    w=>{w.comparisonClosureCycleId='other-cycle';}]){
    const invalid=structuredClone(during),bad=invalid.work.find(w=>w.id===closure.id);change(bad);
    assert.notDeepEqual(selectRosterPurposePriorityV1({state:invalid,purposeWorkId:purpose.id}),[closure.id]);
  }
  report.checks.push('Wrong source, draft revision, Plan and cycle cannot acquire closure priority');
  const historical=structuredClone(state);
  historical.work.find(w=>w.id===response.id).status='evidence_ready';
  assert(!selectRosterPurposePriorityV1({state:historical,purposeWorkId:purpose.id}).includes(response.id));
  assert.equal(JSON.stringify(state),before);
  report.checks.push('Completed response is not replayed; no saved result, status or failure is changed');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.stack;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
