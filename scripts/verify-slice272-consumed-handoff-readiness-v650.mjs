// Fresh editable product stopped NO_READY_WORK after a real record_facts
// decision: every job is evidence_ready, but consumed control handoffs still
// appear active and prevent the product's next Teach stage.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const file=path.join(base,'workflow.json'),bytes=await fs.readFile(file),state=JSON.parse(bytes);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await get(state.draftRef),verdict=await get(draft.builderVerdictRef);
assert.equal(draft.revision,1);assert.equal(verdict.summary.mineralSpent,960);
const settledDecisionIds=[],acceptedDecisions=[];
for(const work of state.work.filter(w=>w.draftOutcomeRef)){
  const outcome=await get(work.draftOutcomeRef);
  if(outcome.applied!==true&&!['retain','retained','investigate','record_facts'].includes(outcome.status))continue;
  settledDecisionIds.push(work.id);
  if(outcome.decision?.disposition==='record_facts'){
    const result=await get(work.resultRef);
    for(const decision of result.value.decisions)acceptedDecisions.push({workId:work.id,revision:work.draftRevision,
      resultRef:work.resultRef,decision,carriedQuestions:work.inputs.investigationFrontier?.value?.unresolvedQuestions??[]});
  }
}
assert(acceptedDecisions.length>0,'the real terminal fact-record decision must exist');
const result=assessRosterWorkflowReadinessV1({draft,verdict,work:state.work,acceptedDecisions,settledDecisionIds});
assert.equal(result.activeWork.length,0,'consumed handoffs must not deadlock the next product stage');
assert.equal(result.mechanicalReady,false);
assert(result.mechanicalBlockers.some(b=>b.code==='requested_mineral_target_unmet'));
assert(result.mechanicalBlockers.some(b=>b.code==='plan_section_not_declared'));
const missing=assessRosterWorkflowReadinessV1({draft,verdict,work:state.work,acceptedDecisions,settledDecisionIds:[]});
assert(missing.activeWork.some(w=>w.status==='awaiting_strategy_resolution'),'unconsumed control still blocks');
const pending=assessRosterWorkflowReadinessV1({draft,verdict,work:[...state.work,
  {id:'specific-pending-fixture',role:'roster_workflow_strategy_decision',status:'running'}],acceptedDecisions,settledDecisionIds});
assert(pending.activeWork.some(w=>w.id==='specific-pending-fixture'),'real in-flight work is not hidden');
const unknown=assessRosterWorkflowReadinessV1({draft,verdict,work:state.work,
  acceptedDecisions:[...acceptedDecisions,{workId:'record-with-needed-fact',revision:1,resultRef:'fixture',
    decision:{requiredData:['a still-missing current payment fact']},carriedQuestions:[]}],settledDecisionIds});
assert(unknown.strategyQuestions.some(q=>q.question==='a still-missing current payment fact'));
assert((await fs.readFile(file)).equals(bytes));
console.log(JSON.stringify({status:'passed',actualConsumedHandoffs:state.work.filter(w=>w.investigationHandoff).length,
  activeControlCount:result.activeWork.length,finalTargetAndPlanBlockersKept:true,unconsumedAndInFlightStillBlock:true,
  factRecordUnknownRetained:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  nextTeachActuallyScheduledStillPending:true}));
