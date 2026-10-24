// Captured A/B false unknown: two same-source, semantically identical mission
// receipts from different laboratory versions caused the consumer to discard
// ALL scoring facts. No Provider or Room mutation; original draft files read-only.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { buildRosterReviewFactPacketV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const base = process.argv[2];
const config = JSON.parse(await fs.readFile(base + '/common-v77-plan-repair-config.private.json', 'utf8'));
for (const row of config.rows) {
  const file = `${row.dataDirectory}/drafts/${row.sessionId}.json`;
  const bytes = await fs.readFile(file, 'utf8'), d = JSON.parse(bytes), plan = JSON.parse(d.planSerialized);
  const input = { plan, toolReceipts: d.toolReceipts,
    armyAudit: d.working?.verdict?.audit || d.lockedRoster?.lock.verdict.audit,
    selectionUnitRules: d.teachFramework.context.sourceFacts.selectionUnitRules,
    selectionJustificationPolicyVersion: d.agentSelectedStrategySource?.selectionJustificationPolicyVersion || null,
    selectedCandidateInputHash: d.selectedCandidateInput ? hash(d.selectedCandidateInput) : null };
  const originals = d.toolReceipts.filter(r => r.queryId === 'mission-scoring-authority');
  assert.equal(originals.length, 2, 'captured two-version incident');
  assert.deepEqual(originals[0].missionScoringProfile, originals[1].missionScoringProfile);
  assert.deepEqual(originals[0].markerAffinity, originals[1].markerAffinity);
  const packet = buildRosterReviewFactPacketV1(input);
  console.log(JSON.stringify({ arm: row.arm, matchingReceipts: originals.length,
    actualStatus: packet.sourceFacts.missionMarkerScoringByActor.status }));
  assert.equal(packet.sourceFacts.missionMarkerScoringByActor.status, 'source_bound_arithmetic_only',
    'equivalent frozen authority receipts must not erase scoring facts');
  assert.equal(packet.sourceFacts.missionMarkerScoringByActor.receiptHash, originals[0].receiptHash,
    'keep first proven stable evidence identity, not metadata churn');
  assert(packet.premiseFacts.numbers.some(n => n.factId === 'marker-group:player2:player2:2,4' && n.value === 2));
  const conflicted = structuredClone(originals[1]);
  conflicted.markerAffinity.markers.find(m => m.number === 2).affinityPlayerId = 'player1';
  const { receiptHash: ignored, ...body } = conflicted;
  conflicted.receiptHash = hash(body);
  const bad = buildRosterReviewFactPacketV1({ ...input,
    toolReceipts: d.toolReceipts.map(r => r.receiptHash === originals[1].receiptHash ? conflicted : r) });
  assert.equal(bad.sourceFacts.missionMarkerScoringByActor.status, 'unknown', 'real same-source disagreement must not choose first');
  assert.match(bad.sourceFacts.missionMarkerScoringByActor.reason, /conflicting/);
  const outside = structuredClone(originals[1]);
  outside.sourceStateHash = 'e'.repeat(64); outside.baseStateHash = outside.sourceStateHash;
  const { receiptHash: ignored2, ...otherBody } = outside;
  outside.receiptHash = hash(otherBody);
  const scoped = buildRosterReviewFactPacketV1({ ...input,
    toolReceipts: d.toolReceipts.map(r => r.receiptHash === originals[1].receiptHash ? outside : r) });
  assert.equal(scoped.sourceFacts.missionMarkerScoringByActor.sourceStateHash, originals[0].sourceStateHash,
    'actual selected map scope excludes another scene, not missing evidence');
  assert.equal(await fs.readFile(file, 'utf8'), bytes);
  console.log(JSON.stringify({ arm: row.arm, status: 'PASS', actorSpecificFactsRestored: true,
    sameSourceConflictStillUnknown: true, otherSourceNotSelected: true, providerCalls: 0, roomMutations: 0 }));
}
