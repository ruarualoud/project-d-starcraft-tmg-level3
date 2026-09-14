import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { materializeFactionStructuredReviewV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { resolveFactionReviewCoverageAddressesV1,
  FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-review-coverage-address-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-a266c185ad305c8a954b';
const attemptId = 'structured-193b71dd003baf4ca65e2d2757ed10e6f8a35b65aa445d51';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const input = await read(base + 'terran_armed_forces-input.json');
const previous = await read(base + 'five-chapter-consumer-replay-readiness.json');
const { section, draft } = previous.pendingRequest.workspace;
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 2);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let attempt, response, candidate;
try {
  attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  response = verifySeal(JSON.parse(attempt.response)).value;
  candidate = verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, attemptId + '.candidate').artifact)).value;
} finally { db.close(); }
assert.equal(attempt.state, 'received');
assert.equal(hash(response.output), hash(candidate.providerValue));
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section, draft,
  reviewIndices: batch.reviewIndices, coverageRequiredSourceRefs: batch.requiredSourceRefs, targets,
  roleRef: candidate.roleRef, outputContractRef: candidate.outputContractRef, route: 'supportive', includeSharedScenarioSources: true });
assert.equal(capsule.hash, candidate.contextManifestRef.hash);
const args = { providerOutput: response.output, capsule, input, section, draft,
  reviewIndices: batch.reviewIndices, requiredSourceRefs: batch.requiredSourceRefs, targets,
  reviewReasonMaximum: 16384, reviewSourceMaximum: 128 };
for (let n = 0; n < 2; n++) assert.throws(() => materializeFactionStructuredReviewV1(args), { code: 'FACTION_REVIEW_COVERAGE_INVALID' });
// Only the address is varied, after the unmodified response reproduced twice.
const coverage = response.output.coverage.map(row => ({ sourceRef: batch.requiredSourceRefs[row.coverageSlot],
  verdict: row.verdict, reason: row.reason, recommendationIndices: row.recommendationIndices }));
const resolved = resolveFactionReviewCoverageAddressesV1({ coverage, targets, draft, binding });
assert.deepEqual(resolved.coverage[0].recommendationIndices, [2]);
assert.equal(resolved.receipt.repairs.length, 1);
const correctedProviderValue = { ...response.output, coverage: response.output.coverage.map((row, i) =>
  ({ ...row, recommendationIndices: resolved.coverage[i].recommendationIndices })) };
const corrected = materializeFactionStructuredReviewV1({ ...args, providerOutput: correctedProviderValue });
assert.deepEqual(corrected.output.coverage[0].recommendationIndices, [2]);
assert.deepEqual(correctedProviderValue.verdicts, response.output.verdicts);
assert.equal(correctedProviderValue.coverage[0].verdict, response.output.coverage[0].verdict);
assert.equal(correctedProviderValue.coverage[0].reason, response.output.coverage[0].reason);
let checks = 10;
for (const delta of [{ reason: 'No explicit recommendation title' }, { recommendationIndices: [99] },
  { recommendationIndices: [1] }, { sourceRef: 'source:absent' }, { recommendationIndices: [0, 0] }]) {
  assert.throws(() => resolveFactionReviewCoverageAddressesV1({ coverage: [{ ...coverage[0], ...delta }], targets, draft, binding }),
    { code: 'FACTION_REVIEW_COVERAGE_ADDRESS_UNRESOLVED' }); checks++;
}
const alreadyGlobal = [{ ...coverage[0], recommendationIndices: [2] }];
assert.deepEqual(resolveFactionReviewCoverageAddressesV1({ coverage: alreadyGlobal, targets, draft, binding }).coverage, alreadyGlobal); checks++;
const otherValidGlobal = [{ ...coverage[0], recommendationIndices: [6] }];
assert.deepEqual(resolveFactionReviewCoverageAddressesV1({ coverage: otherValidGlobal, targets, draft, binding }).coverage, otherValidGlobal); checks++;
for (const verdict of ['omitted', 'uncertain']) {
  const negative = [{ ...coverage[0], verdict }];
  assert.deepEqual(resolveFactionReviewCoverageAddressesV1({ coverage: negative, targets, draft, binding }).coverage, negative); checks++;
}
const report = seal({ reproduced: true, repetitions: 2, code: 'FACTION_REVIEW_COVERAGE_INVALID',
  runId, attemptId, originalRequestHash: attempt.request_hash, originalCandidateHash: candidate.hash,
  originalProviderReceiptHash: response.usageReceipt.receiptHash, originalOutputHash: hash(response.output),
  actualContextRebuilt: true, contextHash: capsule.hash, draftHash: hash(draft),
  batchIndices: batch.reviewIndices, requiredSourceRefs: batch.requiredSourceRefs,
  coverage: response.output.coverage.map(row => ({ ...row,
    globalDirectLinks: draft.recommendations.map((r, i) => r.sourceRefs.includes(batch.requiredSourceRefs[row.coverageSlot]) ? i : null).filter(i => i !== null),
    localTargetIdentities: targets.targets.map((t, slot) => ({ slot, index: t.index, title: t.title,
      exactTitleAppearsInReason: row.reason.includes(t.title), citesRequiredSource: t.recommendation.sourceRefs.includes(batch.requiredSourceRefs[row.coverageSlot]) })) })),
  mutationTested: true, checks, binding, resolution: resolved.receipt,
  onlyAddressChanged: true, correctedResponsePassesOriginalHost: true,
  providerCalls: 0, activeProductionCodeChanged: false, semanticAcceptance: false, trainingTruth: false });
await writeFile(base + 'review-coverage-index-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ reproduced: true, code: report.code, repetitions: 2, actualContextRebuilt: true,
  checks, correctedResponsePassesOriginalHost: true, batchIndices: report.batchIndices, links: report.coverage.map(c => ({ returned: c.recommendationIndices,
    globalDirectLinks: c.globalDirectLinks, localTargetIdentities: c.localTargetIdentities })), hash: report.hash }));
