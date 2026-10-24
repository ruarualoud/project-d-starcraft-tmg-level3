import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterTeachReplyAttemptLimitV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8')),state=d.teachFramework.state;
const kind='teach_framework_investigate';
const current=state.replyCorrections.findLast(r=>r.kind===kind&&r.status==='pending');
assert(current);assert(state.repairs.filter(r=>r.kind===kind).length>=4);
const before=JSON.stringify(state.replyCorrections);
assert.equal(rosterTeachReplyAttemptLimitV1({state,kind,baseContextHash:current.baseContextHash,pending:current}),2,
 'Actual224 first error must retain two ordinary correction attempts; unrelated prior inquiries do not exhaust it');
assert.equal(rosterTeachReplyAttemptLimitV1({state,kind,baseContextHash:'a-new-independent-request'}),3);
const duplicate={...state,replyCorrections:[...state.replyCorrections,structuredClone(current)]};
assert.equal(rosterTeachReplyAttemptLimitV1({state:duplicate,kind,baseContextHash:current.baseContextHash,pending:current}),2,
 'Revalidation of the same paid response is not another attempt');
assert.equal(rosterTeachReplyAttemptLimitV1({state,kind,baseContextHash:current.baseContextHash,pending:current,maxAttempts:1}),1);
assert.equal(JSON.stringify(state.replyCorrections),before);
console.log(JSON.stringify({passed:true,actualPaidReply:224,requestScopedRepair:true,historyUnchanged:true,providerCalls:0}));
