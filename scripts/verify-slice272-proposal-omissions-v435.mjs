// Actual243 correction exposed only one of two already-known revision omissions.
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {validateRosterTeachProposalConsolidationV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const request=JSON.parse(gunzipSync(await fs.readFile(`${process.argv[2]}/call-243.product-request.json.gz`)));
const handoff=request.promptNodes.find(n=>n.kind==='complete_saved_conclusion_handoff');
const previous=request.promptNodes.find(n=>n.kind==='repair_completed_public_reply').previousOutput;
const state={answers:handoff.answers};
let error;
try{validateRosterTeachProposalConsolidationV1(state,handoff,previous);}catch(e){error=e;}
assert.equal(error?.code,'ROSTER_TEACH_PROPOSAL_REVISION_OMITTED');
const omissions=handoff.answers.filter(a=>a.disposition==='revise').filter(a=>{
 const row=previous.questionActions.find(q=>q.questionId===a.questionId);
 return !row.planChangeIndices.length&&!row.rosterChangeIndices.length;
}).map(a=>a.questionId);
assert.equal(omissions.length,2,'Actual saved output has two revision omissions');
for(const id of omissions)assert(error.message.includes(id),`One-at-a-time feedback hides known omission: ${id}`);
assert.deepEqual(state.answers,handoff.answers,'Validation never fills strategic proposals');
console.log(JSON.stringify({ok:true,knownOmissionsReturnedTogether:omissions,providerCalls:0,nativeQueries:0}));
