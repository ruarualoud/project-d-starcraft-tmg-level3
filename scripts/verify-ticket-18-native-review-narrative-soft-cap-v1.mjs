#!/usr/bin/env node

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { inspectFactionReviewNarrativeCapacityV2,
  FACTION_PARSED_REVIEW_VALUE_BINDING_V2 }
  from '../packages/skill-production-v3/faction-parsed-review-value-v1.mjs';
import { validateTargetedFactionReviewV1 }
  from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { inspectFactionReviewSourceExpansionTriggerV1 }
  from '../packages/skill-production-v3/faction-review-source-expansion-v1.mjs';

// Import every changed consumer so this focused regression also catches a
// broken production/replay wiring edge without executing an unrelated suite.
await Promise.all([
  import('../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs'),
  import('../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs'),
  import('../packages/skill-production-v3/faction-strategy-workflow-v2.mjs'),
  import('../packages/skill-evaluation/faction-structured-replay-v1.mjs'),
  import('../packages/skill-evaluation/faction-production-replay-v1.mjs'),
]);

const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const id = 'structured-abe491cf226b236a15efea331433e67f019b37c7d700ecb6.parsed-schema-candidate-v2';
const db = new DatabaseSync(filename, { readOnly: true });
const row = db.prepare("SELECT artifact FROM steps WHERE id=? AND state='complete'").get(id);
db.close();
assert(row, 'actual paid narrative-overflow candidate is required');
const candidate = verifySeal(JSON.parse(row.artifact).value);

const actual = inspectFactionReviewNarrativeCapacityV2(candidate.providerValue);
assert.equal(actual.bindingHash, FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash);
assert.equal(actual.perNarrativeFieldCharacterMaximum, null);
assert.equal(actual.providerCalls, 0);
assert.deepEqual(actual.overflowPaths, ['$.verdicts[1].focus[3].quote']);
assert(actual.softAlerts.every(alert => alert.action === 'continue'));
assert.equal(inspectFactionReviewSourceExpansionTriggerV1({
  triggerOutput: candidate.providerValue,
  narrativeCapacityProof: actual }).narrativeCapacityProof.hash, actual.hash);
assert.throws(() => inspectFactionReviewSourceExpansionTriggerV1({
  triggerOutput: candidate.providerValue }), {
  code: 'FACTION_REVIEW_SOURCE_EXPANSION_TRIGGER_SCHEMA',
});

const arbitraryLongNarrative = structuredClone(candidate.providerValue);
arbitraryLongNarrative.verdicts[0].reason = '长度本身不决定语义有效性。'.repeat(4_000);
arbitraryLongNarrative.coverage[0].reason = '保留完整来源审查理由。'.repeat(4_000);
const longCapacity = inspectFactionReviewNarrativeCapacityV2(arbitraryLongNarrative);
assert.equal(longCapacity.perNarrativeFieldCharacterMaximum, null);
assert(longCapacity.softAlerts.length >= 3);

const structurallyInvalid = structuredClone(arbitraryLongNarrative);
delete structurallyInvalid.coverage;
assert.throws(() => inspectFactionReviewNarrativeCapacityV2(structurallyInvalid), {
  code: 'FACTION_PARSED_REVIEW_VALUE_NARRATIVE_CAPACITY_NOT_APPLICABLE',
});
assert.throws(() => inspectFactionReviewSourceExpansionTriggerV1({
  triggerOutput: structurallyInvalid, narrativeCapacityProof: actual }));

const longQuote = '可验证的完整原文。'.repeat(500);
const targets = seal({ targets: [{ targetId: 'advice-0-test', index: 0,
  recommendationHash: hash({ risk: longQuote }), title: '测试建议',
  recommendation: { sourceRefs: [] }, fields: [{ path: 'risk', text: longQuote }] }],
focusedSources: [], trainingTruth: false });
const bound = validateTargetedFactionReviewV1({ verdicts: [{ targetId: 'advice-0-test',
  title: '测试建议', focus: [{ path: 'risk', quote: longQuote }], verdict: 'supported',
  reason: '长度不替代来源绑定。', sourceRefs: [] }], coverage: [] }, targets,
{ narrativeCharacterMaximum: null });
assert.equal(bound.bindings[0].evidence[0].quote.length, longQuote.length);
assert.equal(bound.focusMetadataRepairs, undefined);

console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  actualPaidCandidateAcceptedWithSoftAlert: true,
  arbitraryNarrativeLengthAccepted: true,
  structuralFailureStillBlocked: true,
  providerCalls: 0 }));
