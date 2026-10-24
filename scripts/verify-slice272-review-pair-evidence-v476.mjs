import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildRosterReviewFactPacketV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const input={plan:JSON.parse(d.planSerialized),toolReceipts:d.toolReceipts,armyAudit:d.working.verdict.audit,
 selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
 selectionSupportRules:d.teachFramework.context.sourceFacts.selectionSupportRules,
 selectionJustificationPolicyVersion:d.agentSelectedStrategySource.selectionJustificationPolicyVersion,
 selectedCandidateInputHash:d.teachFramework.context.selectedCandidateInputHash,teachState:d.teachFramework.state};
const actual=d.toolReceipts.filter(r=>r.queryKind==='base_edge_distance'
 &&[6828,9272].includes(r.queryReceipt?.result?.distanceMilliInches));
assert.equal(new Set(actual.map(r=>r.queryReceipt.result.distanceMilliInches)).size,2);
const facts=buildRosterReviewFactPacketV1(input).sourceFacts;
for(const original of actual){
 const view=facts.availableReadOnlyQueryResultViews?.scopedQueryResults?.find(v=>v.sourceReceiptHash===original.receiptHash);
 assert(view,'actual331 compares unit nearest distance against named pair because exact pair result was only indexed');
 assert.deepEqual(view.result,original.queryReceipt.result);
 assert.deepEqual(view.sceneScope,original.sceneScope);
 assert.equal(view.baseStateHash,original.baseStateHash);
}
assert(facts.availableReadOnlyQueryResultViews.spatialRelationshipEvidence.length,
 'whole-unit results must also remain; neither result replaces the other');
console.log(JSON.stringify({pass:true,actualBug:331,exactPairs:actual.length,providerCalls:0,nativeExecutions:0,originalWrites:0}));
