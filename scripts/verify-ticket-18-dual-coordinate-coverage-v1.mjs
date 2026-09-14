import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { resolveFactionReviewCoverageAddressesV4 as priorResolve, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 as prior } from '../packages/skill-production-v3/faction-review-coverage-address-v4.mjs';
import { resolveFactionReviewCoverageAddressesV5 as resolve, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5 as binding } from '../packages/skill-production-v3/faction-review-coverage-address-v5.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-6d345a142fa24636bab7';
const json = async file => verifySeal(JSON.parse(await readFile(base + file, 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
db.close();
const diagnosis = await json(runId + '/actual-resume-diagnosis-7fb9531534ff84cd30f0.json');
assert.equal(diagnosis.codeHash, sha256(await readFile('scripts/diagnose-ticket-18-faction-resume-6d345-v1.mjs')));
const input = await json(runId + '/zerg_swarm-input.json');
const evidence = readFactionStructuredSuccessEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId, attemptId: diagnosis.zerg.attemptId });
assert.equal(evidence.candidate.hash, diagnosis.zerg.originalCandidateHash);
const w = diagnosis.zerg.request.workspace, candidate = evidence.candidate;
const targets = w.outputRequestAtEnd.targetContract;
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
  reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs, targets,
  roleRef: candidate.roleRef, outputContractRef: candidate.outputContractRef, route: 'supportive', includeSharedScenarioSources: true });
assert.equal(capsule.hash, candidate.contextManifestRef.hash);
const coverage = candidate.providerValue.coverage.map(row => ({ sourceRef: w.coverageRequiredSourceRefs[row.coverageSlot],
  verdict: row.verdict, recommendationIndices: row.recommendationIndices, reason: row.reason }));
assert.equal(hash(coverage), hash(diagnosis.zerg.originalCoverage));
const args = { coverage, targets, draft: w.draft, binding, coverageSourceRefs: w.coverageRequiredSourceRefs };
assert.throws(() => priorResolve({ ...args, binding: prior }), { code: 'FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED' });
let checks = 5;
const result = resolve(args);
assert.deepEqual(result.coverage.map(row => row.recommendationIndices), [[5], [5]]); checks++;
for (let i = 0; i < coverage.length; i++) {
  assert.deepEqual({ ...result.coverage[i], recommendationIndices: coverage[i].recommendationIndices }, coverage[i]); checks++;
  assert.equal(result.receipt.repairs[i].reasonChanged, false); checks++;
}
assert.equal(result.receipt.repairs.length, 2); checks++;
assert.deepEqual(resolve({ ...args, coverage: result.coverage }).coverage, result.coverage); checks++;
const reseal = value => { const { hash: ignored, ...body } = value; return seal(body); };
const failRow = patch => {
  assert.throws(() => resolve({ ...args, coverage: [{ ...coverage[0], ...patch }, coverage[1]] }),
    { code: 'FACTION_REVIEW_COVERAGE_DUAL_COORDINATE_UNRESOLVED' }); checks++;
};
for (const reason of [
  coverage[0].reason.replace('index 5', 'index 4'),
  coverage[0].reason.replace('slot 1', 'slot 0'),
  coverage[0].reason + ' recommendation index 4 (target slot 0)',
  coverage[0].reason + ' recommendation index 5 (target slot 1)',
  coverage[0].reason + ' recommendation index 0',
  coverage[0].reason + ' target slot 0',
  coverage[0].reason + ' ' + targets.targets[0].targetId,
  coverage[0].reason + ' ' + targets.targets[0].title,
]) failRow({ reason });
for (const recommendationIndices of [[0], [4], [6], [1, 1], [-1], [1.5], [], [1, 5]]) failRow({ recommendationIndices });
for (const patch of [{ coverageSourceRefs: undefined }, { coverageSourceRefs: [...args.coverageSourceRefs].reverse() },
  { binding: prior }, { draft: { ...w.draft, extra: true } }]) {
  assert.throws(() => resolve({ ...args, ...patch }), { code: 'FACTION_REVIEW_COVERAGE_DUAL_COORDINATE_BINDING_DRIFT' }); checks++;
}
for (const mutate of [t => t.targets[1].index = 4, t => t.targets[1].title += ' altered',
  t => t.targets[1].recommendationHash = hash('foreign'), t => t.targets[1].targetId = targets.targets[0].targetId,
  t => t.targets[1].recommendation.sourceRefs = []]) {
  const next = structuredClone(targets); mutate(next);
  assert.throws(() => resolve({ ...args, targets: reseal(next) }), { code: 'FACTION_REVIEW_COVERAGE_DUAL_COORDINATE_BINDING_DRIFT' }); checks++;
}
const ambiguousDraft = structuredClone(w.draft);
ambiguousDraft.recommendations[1].sourceRefs.push(coverage[0].sourceRef);
assert.throws(() => resolve({ ...args, draft: ambiguousDraft, targets: reseal({ ...targets, draftHash: hash(ambiguousDraft) }) }),
  { code: 'FACTION_REVIEW_COVERAGE_DUAL_COORDINATE_UNRESOLVED' }); checks++;
// Removing every identity clue still fails; entity names/source similarity do
// not provide an alternative path. Original negative judgments remain intact.
for (const reason of ['The Corpser source is covered.', 'recommendation index 5', 'target slot 1']) {
  assert.throws(() => resolve({ ...args, coverage: coverage.map(row => ({ ...row, reason })) })); checks++;
}
for (const verdict of ['uncertain', 'omitted']) {
  const negative = coverage.map(row => ({ ...row, verdict, recommendationIndices: [] }));
  assert.deepEqual(resolve({ ...args, coverage: negative }), priorResolve({ ...args, coverage: negative, binding: prior })); checks++;
}
const legacy = coverage.map(row => ({ ...row, recommendationIndices: [5], reason: targets.targets[1].title }));
assert.deepEqual(resolve({ ...args, coverage: legacy }), priorResolve({ ...args, coverage: legacy, binding: prior })); checks++;
const report = seal({ version: 'faction_dual_coordinate_coverage_component_v1', passed: true, checks, binding,
  actualContextRebuilt: true, originalCandidateHash: candidate.hash, originalReceiptHash: candidate.providerReceiptHash,
  diagnosisHash: diagnosis.hash, resolution: result.receipt, originalJudgmentsAndReasonsPreserved: true,
  originalV4Unchanged: true, ambiguousAndConflictingAddressesRejected: true,
  providerCalls: 0, actualDshSessions: 0, productionWired: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(['packages/skill-production-v3/faction-review-coverage-address-v5.mjs',
    'scripts/verify-ticket-18-dual-coordinate-coverage-v1.mjs'].map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'dual-coordinate-coverage-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, hash: report.hash }));
