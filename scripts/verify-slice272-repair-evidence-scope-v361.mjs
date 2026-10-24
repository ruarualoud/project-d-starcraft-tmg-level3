import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {buildRosterFinalPlanVerifiedFactsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const [directory,formalFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const q=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-087.product-request.json.gz`)));
const facts=buildRosterFinalPlanVerifiedFactsV1({plan:JSON.parse(saved.planSerialized),
 toolReceipts:saved.toolReceipts,selectedCandidateInputHash:hash(saved.selectedCandidateInput),
 selectionJustificationPolicyVersion:'unit_role_comparison_v1',
 selectionUnitRules:q.promptNodes.find(n=>n.nodeType==='verified-plan-facts').content.sourceFacts.selectionUnitRules}).sourceFacts;
assert(!facts.availableReadOnlyQueryEvidence.some(r=>r.queryKind==='space.inspect_relationships'),
 'Actual087 needlessly inlines two unrelated1.27MB relationship scans and millions of catalogue characters');
for(const r of saved.toolReceipts.filter(r=>r.queryKind==='space.inspect_relationships'))
 assert(facts.availableReadOnlyQueryIndex.some(e=>e.receiptHash===r.receiptHash&&!e.resultIncluded),'Do not hide retained unexpanded evidence');
const actual=saved.selectionEvidence.queries.at(-1).receipt;
assert.deepEqual(facts.availableReadOnlyQueryEvidence.find(r=>r.receiptHash===actual.receiptHash),actual);
assert(JSON.stringify(facts).length<500000,'Current claim evidence must not contain unrelated relationship graphs');
console.log(JSON.stringify({pass:true,checks:4,sourceFactsCharacters:JSON.stringify(facts).length,
 retainedQueriesIndexed:true,currentClaimQueriesUnchanged:true,providerCalls:0}));
