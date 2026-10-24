import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {buildRosterFinalPlanVerifiedFactsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const [directory,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const plan=JSON.parse(saved.planSerialized);
const request=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-068.product-request.json.gz`)));
const rules=request.promptNodes.find(n=>n.kind==='verified-structured-facts').sourceFacts.selectionUnitRules;
const input={plan,toolReceipts:saved.toolReceipts,selectionUnitRules:rules,
  selectionJustificationPolicyVersion:'unit_role_comparison_v1',
  selectedCandidateInputHash:hash(saved.selectedCandidateInput)};
const ref=plan.toolReceiptReferences.find(r=>r.referenceId==='needref-need-marker-control-14');
const facts=buildRosterFinalPlanVerifiedFactsV1(input).sourceFacts;
const original=saved.toolReceipts.find(r=>r.receiptHash===ref.receiptHash);
assert(facts.citedReadOnlyQueryEvidence.some(r=>r.receiptHash===ref.receiptHash),
  'Actual needref citation reaches reviewer without its available Native receipt');
assert.deepEqual(facts.citedReadOnlyQueryEvidence.find(r=>r.receiptHash===ref.receiptHash),original);
assert(facts.citedToolReferences.some(r=>r.referenceId===ref.referenceId&&r.receiptHash===ref.receiptHash));
const without=buildRosterFinalPlanVerifiedFactsV1({...input,toolReceipts:saved.toolReceipts.filter(r=>r.receiptHash!==ref.receiptHash)}).sourceFacts;
assert(!without.citedReadOnlyQueryEvidence.some(r=>r.receiptHash===ref.receiptHash),'Missing evidence must never be manufactured');
assert.equal(JSON.parse(await fs.readFile(formalFile,'utf8')).planSerialized,saved.planSerialized);
console.log(JSON.stringify({pass:true,checks:4,nativeReceiptDeliveredVerbatim:true,
  referenceIsNotEvidence:true,sourceUnchanged:true,providerCalls:0,roomWrites:0}));
