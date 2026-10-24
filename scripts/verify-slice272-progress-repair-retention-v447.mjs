import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import * as progress from '../packages/roster-strategist/roster-teach-question-progress-v1.mjs';
const read=async n=>JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/call-${n}.reply.json.gz`))).output;
const before=await read(267),after=await read(268),bytes=JSON.stringify(after);
assert.equal(typeof progress.validateRosterTeachProgressRepairRetentionV1,'function',
  'Status-only correction lacks retained-unresolved protection');
assert.throws(()=>progress.validateRosterTeachProgressRepairRetentionV1(after,[before]),
  e=>e.code==='ROSTER_TEACH_UNRESOLVED_DROPPED_WITHOUT_NEW_BASIS');
assert.equal(JSON.stringify(after),bytes);
const explicit=structuredClone(after);explicit.unresolved=structuredClone(before.unresolved);
explicit.questionProgress.forEach(q=>q.disposition='plan_revision_required');
progress.validateRosterTeachProgressRepairRetentionV1(explicit,[before]);
progress.validateRosterTeachQuestionProgressV1(explicit,explicit.questionProgress.map(q=>q.questionId));
console.log(JSON.stringify({ok:true,realOriginal:267,realRepair:268,providerCalls:0,paidReplyUnchanged:true}));
