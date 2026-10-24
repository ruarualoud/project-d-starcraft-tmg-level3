import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {applyRosterTeachProposalConsolidationV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const read=async name=>JSON.parse(gunzipSync(await fs.readFile(process.argv[2]+'/'+name)).toString());
const request=(await read('call-208.product-request.json.gz')).promptNodes.find(n=>n.kind==='complete_saved_conclusion_handoff');
const output=(await read('call-209.reply.json.gz')).output;
const state={answers:structuredClone(request.answers),premiseReconciliation:structuredClone(request.priorPremiseProposals)};
assert.equal(state.answers.filter(a=>a.disposition==='unresolved').length,1);
assert.equal(output.unresolvedQuestionIds.length,2,'Actual209 repeated the incorrect derived bookkeeping count');
const originals=JSON.stringify({answers:state.answers,output});
assert.doesNotThrow(()=>applyRosterTeachProposalConsolidationV1(state,request,output),
 'A model echo of host-owned unknown IDs must not stall strategy generation; compute it from saved answers and retain the mismatch');
assert.equal(state.proposalConsolidation.unresolvedQuestionIds.length,1);
assert.equal(state.proposalConsolidation.output.unresolvedQuestionIds.length,2,'Keep the original paid reply');
assert.equal(state.proposalConsolidation.metadataWarnings[0].code,'MODEL_UNRESOLVED_ECHO_IGNORED');
assert.equal(JSON.stringify({answers:state.answers,output}),originals);
assert.equal(state.proposedPlanChanges.length,13);
console.log(JSON.stringify({passed:true,actualReply:209,hostOwnedUnresolved:1,paidOutputPreserved:true,providerCalls:0}));
