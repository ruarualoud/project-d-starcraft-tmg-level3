// Actual267 labelled an explicit unresolved arrival as evidence_established.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {validateRosterTeachQuestionProgressV1,projectRosterTeachQuestionProgressV1}
  from '../packages/roster-strategist/roster-teach-question-progress-v1.mjs';
const output=JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/call-267.reply.json.gz`))).output;
const ids=output.questionProgress.map(e=>e.questionId),before=JSON.stringify(output);
assert.throws(()=>validateRosterTeachQuestionProgressV1(output,ids),error=>{
  assert.equal(error.code,'ROSTER_TEACH_QUESTION_UNRESOLVED_CONTRADICTION');
  assert.deepEqual(error.detail.questionIds,ids);
  return true;
},'The product accepts closed factual statuses alongside explicit unresolved predicates');
assert.equal(JSON.stringify(output),before,'Never rewrite a paid answer');
const deferred=structuredClone(output);
for(const row of deferred.questionProgress)row.disposition='plan_revision_required';
validateRosterTeachQuestionProgressV1(deferred,ids);
const handoff=projectRosterTeachQuestionProgressV1(ids,[{completed:true,output:deferred}]);
assert.equal(handoff.planAccepted,false);assert.equal(handoff.unresolvedEngineeringClaimsAccepted,false);
const established=structuredClone(output);established.unresolved=[];
validateRosterTeachQuestionProgressV1(established,ids);
console.log(JSON.stringify({ok:true,realReply:267,contradictions:ids.length,
  actualReplyUnchanged:true,explicitUnresolvedHandoffStillAllowed:true,providerCalls:0}));
