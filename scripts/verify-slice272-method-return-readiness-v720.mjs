// Concrete integration bug: v719's actual yielded handoff still appears in
// readiness.activeWork because only model-branch return reports were consumed.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';

const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/decision-a6d75905-a910-49a7-b260-f6eb8f7558d5');
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const returned=state.work.find(work=>work.methodHandoffYield&&work.status==='returned_to_owner');
assert.ok(returned,'the actual v719 production ownership-return event is required');
assert.equal(returned.branchReturnRef,returned.methodHandoffYield.reportRef);
assert.equal((await read(returned.branchReturnRef)).kind,'retained_method_handoff_yield');
const draft=await read(state.draftRef),verdict=await read(draft.builderVerdictRef);
const assess=work=>assessRosterWorkflowReadinessV1({draft,verdict,work});
const before=JSON.stringify(state);
assert.ok(!assess(state.work).activeWork.some(work=>work.id===returned.id),
  'actual explicitly yielded historical role cannot keep final readiness waiting');
for(const patch of [{methodHandoffYield:null},{branchReturnRef:'unregistered-return'},{status:'needs_model_choice'}]){
  const sample=state.work.map(work=>work.id===returned.id?{...work,...patch}:work);
  assert.ok(assess(sample).activeWork.some(work=>work.id===returned.id),
    'do not hide an unmatched or still-active return role');
}
assert.equal(JSON.stringify(state),before,'readiness is read-only');
console.log(JSON.stringify({passed:true,actualProductionReturnConsumed:true,
  unmatchedAndActiveRolesStillBlock:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  finalPlanAccepted:false,strategyImprovementProven:false}));
