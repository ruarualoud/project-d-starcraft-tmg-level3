// Actual281 says needs_tool_result but omits its query. Normalization must not
// silently turn the continuing experiment into an unresolved terminal handoff.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {deriveRosterTeachQuestionProgressV1 as derive,validateRosterTeachQuestionProgressV1 as validate}
  from '../packages/roster-strategist/roster-teach-question-progress-v1.mjs';
const actual=JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/call-281.reply.json.gz`))).output;
assert.equal(actual.queries.length,0);
assert.equal(actual.questionProgress[0].disposition,'needs_tool_result');
const before=JSON.stringify(actual),result=derive(actual);
assert.equal(result.output.questionProgress[0].disposition,'needs_tool_result',
  'Host silently cancels the model-owned dependent experiment');
assert.deepEqual(result.output.unresolved,actual.unresolved);
assert.throws(()=>validate(result.output,actual.questionProgress.map(q=>q.questionId)),
  error=>error.code==='ROSTER_TEACH_DEPENDENT_QUERY_MISSING');
assert.equal(JSON.stringify(actual),before);
console.log(JSON.stringify({ok:true,actualOutput:281,continuationIntentPreserved:true,missingQueryEntersCorrection:true,unresolvedUnchanged:true,providerCalls:0}));
