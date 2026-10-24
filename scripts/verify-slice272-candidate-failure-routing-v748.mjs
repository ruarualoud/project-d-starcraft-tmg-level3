// Real candidate failures were all sent through field repair; the final
// construction adapter failure had no return at all.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowToolRepairV1 as repair} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=path.resolve(process.argv[2]),before=await fs.readFile(root+'/workflow.json','utf8');
const state=JSON.parse(before),get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const rows=state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice').slice(-3);
const values=await Promise.all(rows.map(async w=>(await get(w.resultRef)).value)),failures=[];
function check(name,fn){try{fn();}catch(e){failures.push({name,error:e.message.slice(0,600)});}}
check('rules-negative-is-a-method-choice-not-schema-repair',()=>{
  const routed=repair(values[0]);
  assert.equal(routed.failureClass,'rules_rejection');
  assert.equal(routed.controlReturn,true);
  assert.equal(routed.rulesQuestionAnswered,true);
  assert.equal(routed.combatQuestionAnswered,false);
  assert.equal(routed.nativeRejection.rulesErrorCode,'ARMY_SLOT_CAPACITY_EXCEEDED');
});
check('saved-profile-transport-defect-has-same-input-continuation',()=>{
  const routed=repair(values.at(-1));
  assert.equal(routed.failureClass,'candidate_construction');
  assert.equal(routed.preserveCandidateExactly,true);
  assert.equal(routed.correctable,true);
});
check('addressing-unknown-and-rules-illegal-not-conflated',()=>{
  const unknown=repair({operation:'candidate_context',code:'ROSTER_WORKFLOW_CANDIDATE_CONTEXT_NOT_LEGAL',
    detail:{nativeAudit:{status:'unknown',rulesErrorCode:'unavailable'}}});
  assert.equal(unknown.failureClass,'capability_or_execution');
  assert.equal(unknown.rulesQuestionAnswered,false);
  const invalid=repair({operation:'candidate_context',code:'ROSTER_WORKFLOW_CANDIDATE_CONTEXT_NOT_LEGAL',
    detail:{nativeAudit:{status:'invalid_candidate',rejectionKind:'candidate_addressing'}}});
  assert.equal(invalid.failureClass,'input_addressing');
  assert.equal(invalid.controlReturn,false);
});
assert.equal(await fs.readFile(root+'/workflow.json','utf8'),before);
console.log(JSON.stringify({passed:!failures.length,failures,providerCalls:0,realNativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
