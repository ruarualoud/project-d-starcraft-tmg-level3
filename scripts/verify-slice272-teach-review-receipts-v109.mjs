// Real B18 cites the Teach wrapper, while the review only indexed Native hashes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildRosterReviewFactPacketV1, reviewRosterFinalPlanV3 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base = process.argv[2];
const file = base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json';
const d = JSON.parse(await fs.readFile(file, 'utf8'));
const plans = [...d.planVersionHistory.map(x => JSON.parse(x)), JSON.parse(d.planSerialized)];
const plan = plans.find(x => x.planVersion === 18), previous = plans.find(x => x.planVersion === 17);
assert(plan && previous);
const review = [d.planReview, ...d.planReviewHistory].find(x => x.planHash === previous.planHash && x.status === 'completed').review;
const receiptHash = '37240b195db67681df81519506e4c0b9dc2b688556ff09a98b501166ed19ed92';
const original = d.teachFramework.state.queryRecovery.operations.find(x => x.result?.receiptHash === receiptHash).result;
assert(!d.toolReceipts.some(x => x.receiptHash === receiptHash));
assert(d.toolReceipts.some(x => x.receiptHash === original.sourceReceipt.receiptHash));
const input = { plan, sessionId: d.sessionId, toolReceipts: d.toolReceipts,
  teachState: d.teachFramework.state, selectedCandidateInputHash: hash(d.selectedCandidateInput),
  armyAudit: d.working?.verdict?.audit || d.lockedRoster.lock.verdict.audit,
  selectionUnitRules: d.teachFramework.context.sourceFacts.selectionUnitRules,
};
const packet = buildRosterReviewFactPacketV1(input);
const linked = packet.sourceFacts.citedTeachQueryEvidence?.find(x => x.receiptHash === receiptHash);
assert(linked, 'the actual Teach citation must resolve to Native placement and follow-up evidence in the reviewer input');
assert.deepEqual(linked.sourceReceipt, original.sourceReceipt);
assert.deepEqual(linked.followUpReceipts, original.followUpReceipts);
assert.equal(linked.sourceReceipt.hypotheticalPlacementAssessment.placementLegalityProven, false);
const changed = structuredClone(d.teachFramework.state);
changed.queryRecovery.operations.find(x => x.result?.receiptHash === receiptHash).result.sourceReceipt.hypotheticalPlacements = [];
assert(!buildRosterReviewFactPacketV1({ ...input, teachState: changed }).sourceFacts.citedTeachQueryEvidence?.some(x => x.receiptHash === receiptHash), 'changed unsigned content cannot be attached as the original receipt');
let calls = 0;
await assert.rejects(reviewRosterFinalPlanV3({ ...input, incrementalFrom: { plan: previous, review },
  allowFullReviewOnDependencyChange: false, relatedRepairClaimPaths: [],
  deliberation: { async deliberate(request) {
    calls++;
    const facts = request.promptNodes.find(x => x.kind === 'verified-structured-facts')?.sourceFacts;
    assert(facts?.citedTeachQueryEvidence?.some(x => x.receiptHash === receiptHash), 'actual reviewer consumer must receive the recovery receipt');
    throw Error('CAPTURED_REVIEW_CONSUMER');
  } },
}), /CAPTURED_REVIEW_CONSUMER/);
assert.equal(calls, 1);
console.log(JSON.stringify({ status: 'PASS', actualB18Receipt: receiptHash,
  nativePlacementAndFourFollowupsDelivered: true, incrementalConsumerReached: true,
  tamperedWrapperRejected: true, providerCalls: 0, roomActions: 0, productionDraftWrites: 0 }));
