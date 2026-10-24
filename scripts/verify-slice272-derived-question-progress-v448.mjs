// Three real paid replies oscillated between progress labels and the missing-
// evidence list. Transport state must be derived, not repeatedly re-purchased.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import * as p from '../packages/roster-strategist/roster-teach-question-progress-v1.mjs';
const read=async n=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/call-${n}.reply.json.gz`))).output;
assert.equal(typeof p.deriveRosterTeachQuestionProgressV1,'function',
  'Actual repair oscillation still delegates redundant transport state to the model');
for(const n of [267,269]) {
  const original=await read(n),before=JSON.stringify(original);
  const {output,corrections}=p.deriveRosterTeachQuestionProgressV1(original);
  assert.equal(corrections.length,2);assert.deepEqual(output.unresolved,original.unresolved);
  assert(output.questionProgress.every(row=>row.disposition==='unresolved_handoff'));
  const ids=output.questionProgress.map(q=>q.questionId);
  p.validateRosterTeachQuestionProgressV1(output,ids);
  const state=p.projectRosterTeachQuestionProgressV1(ids,[{completed:true,output}]);
  assert.equal(state.handoffs.length,2);assert.equal(state.planAccepted,false);
  assert.equal(state.unresolvedEngineeringClaimsAccepted,false);
  assert.equal(JSON.stringify(original),before);
  assert.equal(p.deriveRosterTeachQuestionProgressV1(output).corrections.length,0);
}
const dropped=await read(268),prior=await read(267);
assert.throws(()=>p.validateRosterTeachProgressRepairRetentionV1(dropped,[prior]));
console.log(JSON.stringify({ok:true,actualReplies:[267,269],missingPredicatesRetained:2,
  phaseStateDerived:true,modelStrategyUnchanged:true,providerCalls:0}));
