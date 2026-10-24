import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildRosterReviewFactPacketV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {collectPregameNativeActionEvidenceV1} from '../packages/roster-strategist/pregame-native-action-evidence-v1.mjs';
import {projectRosterTeachPromptEvidenceV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const input={plan:JSON.parse(d.planSerialized),toolReceipts:d.toolReceipts,armyAudit:d.working.verdict.audit,
 selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
 selectionSupportRules:d.teachFramework.context.sourceFacts.selectionSupportRules,
 selectionJustificationPolicyVersion:d.agentSelectedStrategySource.selectionJustificationPolicyVersion,
 selectedCandidateInputHash:d.teachFramework.context.selectedCandidateInputHash,teachState:d.teachFramework.state};
const expected=collectPregameNativeActionEvidenceV1(d.toolReceipts);
assert(expected.some(row=>row.action.actionType==='deploy'),'actual saved deployment evidence exists');
const facts=buildRosterReviewFactPacketV1(input).sourceFacts;
const views=facts.availableReadOnlyQueryResultViews;
assert(views?.nativeActionEvidence?.length,'review322 called actual Native deployments grid witnesses: their shared result view must be delivered');
for(const row of expected)assert.deepEqual(views.nativeActionEvidence.find(r=>r.sourceReceiptHash===row.sourceReceiptHash),row);
assert(views.fireExchangeEvidence.some(row=>row.attackEstimates.length===3),'actual three independent attack results must survive review handoff');
assert(facts.queryEvidenceInterpretation?.includes('not interchangeable'));
const actualDeployment=d.toolReceipts.find(r=>r.receiptHash===expected.find(r=>r.action.actionType==='deploy').sourceReceiptHash);
const teachView=projectRosterTeachPromptEvidenceV1(actualDeployment);
assert.deepEqual(teachView.nativeActionEvidence,collectPregameNativeActionEvidenceV1(actualDeployment),
  'moving the existing projection must preserve the actual Teach consumer too');
console.log(JSON.stringify({pass:true,actualBug:322,nativeActions:expected.length,sharedFireViews:views.fireExchangeEvidence.length,
  providerCalls:0,nativeExecutions:0,originalWrites:0}));
