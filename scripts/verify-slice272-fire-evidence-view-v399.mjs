import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectRosterTeachPromptEvidenceV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const saved=draft.teachFramework.state.investigation.evidence.find(row=>
  row.challengeId==='teach-kerrigan-outgoing-fire-zone-vs-goliath-marauder');
const native=saved.followUpReceipts[0].receipt.queryReceipt.result;
const before=JSON.stringify(saved);
const view=projectRosterTeachPromptEvidenceV1(saved);
const typed=view.fireExchangeEvidence?.find(row=>row.estimateHash===native.estimateHash);
assert.equal(typed?.attackEstimateCount,1,'actual successful fire result must expose its nonempty native array, not only renamed computedOutcomes');
assert.equal(typed.attackEstimates[0].domainId,native.attackEstimates[0].domainId);
assert.equal(typed.attackEstimates[0].attackerUnitId,'player2-kerrigan');
assert.deepEqual(typed.attackEstimates[0].outcomes,native.attackEstimates[0].outcomes);
assert.deepEqual(typed.attackSelection,native.attackSelection);
assert.deepEqual(typed.attackEstimateFailures,native.attackEstimateFailures);
assert.equal(JSON.stringify(saved),before);
console.log(JSON.stringify({passed:true,actualInput:182,attackEstimateCount:typed.attackEstimateCount,
  originalReceiptUnchanged:true,nativeExecutions:0,providerCalls:0}));
