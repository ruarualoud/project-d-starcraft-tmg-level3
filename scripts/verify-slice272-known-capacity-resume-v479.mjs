import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as transport from '../packages/roster-strategist/roster-review-catalogue-transport-v1.mjs';
const saved=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const sample={sessionId:saved.sessionId,status:saved.status,planSerialized:saved.planSerialized,
  planReview:saved.planReview,reviewReconciliation:saved.reviewReconciliation,
  providerDispatches:saved.providerDispatches.slice(-1),publicOutputs:[]};
const canResume=transport.canReencodeRejectedRosterReviewV1 || (()=>false);
assert.equal(canResume(sample),true,'Actual terminal capacity refusal must permit corrected-format continuation');
const change=callback=>{const value=structuredClone(sample);callback(value);return canResume(value)};
assert.equal(change(s=>s.providerDispatches[0].status='ambiguous'),false);
assert.equal(change(s=>s.providerDispatches[0].rejection.contextLengthExceeded=false),false);
assert.equal(change(s=>s.providerDispatches[0].outputContractRef.version=transport.ROSTER_REVIEW_CATALOGUE_CONTRACT_VERSION),false);
assert.equal(change(s=>s.providerDispatches[0].planHash='other'),false);
assert.equal(change(s=>s.publicOutputs=[{contextHash:s.providerDispatches[0].contextHash}]),false);
assert.equal(change(s=>s.reviewReconciliation.recoveryCheckpoint.contextHash='other'),false);
assert.equal(change(s=>s.providerDispatches.push({...s.providerDispatches[0],status:'sending'})),false);
assert.equal(saved.providerDispatches.at(-1).costStatus,'unknown');
console.log(JSON.stringify({pass:true,knownRejectionResume:true,unsafeCasesRejected:7,
  providerCalls:0,originalWrites:0,oldUnknownFeeRetained:true}));
