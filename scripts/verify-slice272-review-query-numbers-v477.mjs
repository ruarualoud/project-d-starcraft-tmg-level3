import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildRosterReviewFactPacketV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const packet=buildRosterReviewFactPacketV1({plan:JSON.parse(d.planSerialized),toolReceipts:d.toolReceipts,
 armyAudit:d.working.verdict.audit,selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
 selectionSupportRules:d.teachFramework.context.sourceFacts.selectionSupportRules,
 selectionJustificationPolicyVersion:d.agentSelectedStrategySource.selectionJustificationPolicyVersion,
 selectedCandidateInputHash:d.teachFramework.context.selectedCandidateInputHash,teachState:d.teachFramework.state});
const views=packet.sourceFacts.availableReadOnlyQueryResultViews.scopedQueryResults;
const numbers=new Map(packet.premiseFacts.numbers.map(f=>[f.factId,f.value]));
const targets=views.flatMap((v,i)=>[6.828,9.272].includes(v.result?.distanceInches)?[{v,i}]:[]);
assert(targets.length>=2);
for(const {v,i}of targets)assert.equal(numbers.get(`availableReadOnlyQueryResultViews.scopedQueryResults.${i}.result.distanceInches`),v.result.distanceInches,
 'actual334 exact numbers delivered only as text cannot bind an ordinary quantitative factCheck');
console.log(JSON.stringify({pass:true,actualUnsentBoundary:334,boundNumericResults:targets.length,providerCalls:0,nativeExecutions:0,originalWrites:0}));
