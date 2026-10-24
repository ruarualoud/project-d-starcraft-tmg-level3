import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterTeachInvestigationWindowV1,resumeRosterTeachUnstartedInvestigationV1,
  configureRosterTeachProductInvestigationV1} from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
import {retireRosterTeachUnsentDownstreamCallV1} from '../packages/roster-strategist/roster-teach-call-checkpoint-v1.mjs';
import {isRosterTeachReaderContinuationV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=d.teachFramework.state,before=hash(state);
assert.equal(state.investigation.rounds.length,16);
const result=state.investigation.evidence.at(-1);
assert.equal(result.challengeId,'probe-solve-formation-marine1-move-domain');
assert.equal(result.sourceReceipt.queryReceipt.result.formationOptions.length,4);
assert.equal(rosterTeachInvestigationWindowV1(state).limit,16,'Explicit old diagnostic trial stays bounded');
const product=structuredClone(state);
assert.equal(configureRosterTeachProductInvestigationV1(product),true);
assert.equal(configureRosterTeachProductInvestigationV1(product),false);
const window=rosterTeachInvestigationWindowV1(product);
assert.equal(window.limit,17,'Successful solver output must be consumed by its next dependent decision');
assert.deepEqual(window.questionIds,['generation-b170a1f618268d5b092cba616efa5751']);
assert.equal(window.progress.stopped,false);
assert.equal(window.unconsumedToolResult,true);
assert.equal(isRosterTeachReaderContinuationV1(product),false);
const pending=structuredClone(product.pendingModelCall);
assert.equal(pending.kind,'teach_framework_citation_patch');
const unsafe=structuredClone(product);
assert.throws(()=>retireRosterTeachUnsentDownstreamCallV1({state:unsafe,
  retainedPublicOutputs:d.publicOutputs,retainedDispatches:[...d.providerDispatches,
    {contextHash:pending.request.contextHash,status:'sent'}]}),
  e=>e.code==='ROSTER_TEACH_UPSTREAM_CONTINUATION_REQUIRES_SETTLED_DOWNSTREAM');
assert.equal(hash(unsafe),hash(product),'A sent/unknown request is never erased');
assert.equal(retireRosterTeachUnsentDownstreamCallV1({state:product,
  retainedPublicOutputs:d.publicOutputs,retainedDispatches:d.providerDispatches}),true);
assert.equal(product.supersededUnsentModelCalls.at(-1).previousRequest.contextHash,pending.request.contextHash);
assert.equal(resumeRosterTeachUnstartedInvestigationV1(product),true);
assert.equal(product.investigation.completed,false);
assert.equal(hash(product.investigation.rounds),hash(state.investigation.rounds));
assert.equal(hash(product.calls),hash(state.calls));
const repeated=structuredClone(product),oldOperation=repeated.investigation.operations.at(-1);
for(let i=0;i<2;i++){
  const id='relabelled-same-result-'+i,round=structuredClone(repeated.investigation.rounds.at(-1));
  round.output.queries[0].queryId=id;
  round.output.questionProgress.find(p=>p.disposition==='needs_tool_result').evidenceQueryIds=[id];
  repeated.investigation.rounds.push(round);
  repeated.investigation.operations.push({...structuredClone(oldOperation),queryId:id});
  repeated.investigation.evidence.push({...structuredClone(result),challengeId:id});
}
assert.equal(rosterTeachInvestigationWindowV1(repeated).progress.stopped,true,'Renaming the same result cannot fuel an unbounded loop');
assert.equal(hash(state),before);
console.log(JSON.stringify({passed:true,diagnosticTrialLimitPreserved:16,productNextLimit:17,
  successfulCandidates:4,providerCalls:0,nativeCalls:0}));
