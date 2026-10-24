import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {validateRosterTeachInvestigationProgressV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(process.argv[3]+'/'+name)));
const input=await read('call-214.product-request.json.gz');
const reply=await read('call-214.reply.json.gz');
const state=d.teachFramework.state, before=hash(state);
const delivered=input.promptNodes.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence;
const ids=input.promptNodes.find(n=>n.kind==='fact_probe_assignment').pendingQuestionIds;
assert.equal(delivered[0].challengeId,'probe-inspect-movement-branch-actionspace');
assert.equal(delivered[0].queryContext.actionSpace.parameterDomains.length,25);
assert.throws(()=>validateRosterTeachInvestigationProgressV1(reply.output,state,ids,null,delivered),
  e=>e.code==='ROSTER_TEACH_INVESTIGATION_ALREADY_DELIVERED_READ',
  'A repeated read of the exact delivered immutable scene must enter automatic correction');
assert.doesNotThrow(()=>validateRosterTeachInvestigationProgressV1(reply.output,state,ids,null,[]),
  'A historical result not delivered to this call is not assumed known');
const different=structuredClone(reply.output);
different.queries[0].toolRequestJson=JSON.stringify({branchIdRef:'different-successor'});
assert.doesNotThrow(()=>validateRosterTeachInvestigationProgressV1(different,state,ids,null,delivered));
assert.equal(hash(state),before,'No paid reply, question, history or result edited');
console.log(JSON.stringify({passed:true,actualPaidReply:214,automaticCorrection:true,
  historicalReadsAllowed:true,newSuccessorReadsAllowed:true,providerCalls:0,nativeCalls:0}));
