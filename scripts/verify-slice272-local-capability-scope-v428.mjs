import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {validateRosterTeachInvestigationProgressV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {projectRosterTeachCapabilityGuideV1} from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(process.argv[3]+'/'+name)));
const input=await read('call-224.product-request.json.gz'),reply=await read('call-224.reply.json.gz');
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8')),state=d.teachFramework.state;
const evidence=input.promptNodes.find(n=>n.kind==='fact_probe_tool_executions').currentBatchEvidence;
const ids=input.promptNodes.find(n=>n.kind==='fact_probe_assignment').pendingQuestionIds;
const before=JSON.stringify(reply);
assert.throws(()=>validateRosterTeachInvestigationProgressV1(reply.output,state,ids,null,evidence),
  e=>e.code==='ROSTER_TEACH_CAPABILITY_GAP_AFTER_CORRECTABLE_INPUT',
  'Actual shape rejection plus a local activation menu cannot establish missing global capability');
const guide=projectRosterTeachCapabilityGuideV1(evidence[0].queryRepair);
assert.equal(guide.actionAvailabilityScope.currentActivationCompletionDomains.length,1);
assert.equal(guide.actionAvailabilityScope.globalCapabilityExhaustive,false);
assert.equal(guide.actionAvailabilityScope.currentActivationCompletionDomains[0].pieceId,'marine-1');
const proper=structuredClone(reply.output);
proper.questionProgress[0].disposition='plan_revision_required';
assert.doesNotThrow(()=>validateRosterTeachInvestigationProgressV1(proper,state,ids,null,evidence),
  'Explicitly handing an unsupported Plan claim to its owner remains possible, not an acceptance');
const realGap=evidence.map(e=>({...e,unknownReasonCode:'ACTUAL_UNSUPPORTED_QUERY',queryRepair:{correctable:false}}));
assert.doesNotThrow(()=>validateRosterTeachInvestigationProgressV1(reply.output,state,ids,null,realGap),
  'Genuine unsupported capabilities must not be hidden');
assert.equal(JSON.stringify(reply),before);
console.log(JSON.stringify({passed:true,paidReply:224,localMenuNotGlobalGap:true,originalReplyUnchanged:true,providerCalls:0}));
