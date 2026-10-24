import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {buildRosterFinalPlanVerifiedFactsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import * as evidence from '../packages/roster-strategist/iterative-roster-tool-port-v1.mjs';
const [directory,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const request=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-086.product-request.json.gz`)));
const actual=saved.selectionEvidence.queries.at(-1).receipt;
const merge=evidence.mergeIterativeSelectionQueryReceiptsV1;
const receipts=merge?merge(saved.toolReceipts,saved.selectionEvidence):saved.toolReceipts;
const input={plan:JSON.parse(saved.planSerialized),toolReceipts:receipts,
 selectedCandidateInputHash:hash(saved.selectedCandidateInput),selectionJustificationPolicyVersion:'unit_role_comparison_v1',
 selectionUnitRules:request.promptNodes.find(n=>n.nodeType==='verified-plan-facts').content.sourceFacts.selectionUnitRules};
const facts=buildRosterFinalPlanVerifiedFactsV1(input).sourceFacts;
assert(facts.availableReadOnlyQueryEvidence?.some(r=>r.receiptHash===actual.receiptHash),
 'Actual repair086 cannot cite the correct saved3dcb query because only old citations enter its fact catalogue');
assert.deepEqual(facts.availableReadOnlyQueryEvidence.find(r=>r.receiptHash===actual.receiptHash),actual);
assert.equal(merge(receipts,saved.selectionEvidence).length,receipts.length,'Evidence attachment must be idempotent');
const foreign=structuredClone(actual);foreign.sourceStateHash='f'.repeat(64);delete foreign.receiptHash;foreign.receiptHash=hash(foreign);
assert(!buildRosterFinalPlanVerifiedFactsV1({...input,toolReceipts:[...receipts,foreign]}).sourceFacts.availableReadOnlyQueryEvidence.some(r=>r.receiptHash===foreign.receiptHash));
assert.equal(JSON.parse(await fs.readFile(formalFile,'utf8')).planSerialized,saved.planSerialized);
console.log(JSON.stringify({pass:true,checks:5,originalQueryAvailableToRepair:true,foreignSourceExcluded:true,providerCalls:0}));
