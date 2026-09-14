import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_REVIEW_DECOMPOSITION_BINDING_V1 as binding, prepareFactionReviewDecompositionV1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { factionReviewDecompositionArgsV1, validateFactionReviewDecompositionMigrationV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { createFactionCatalogueReviewRuntimeV1 } from '../packages/skill-production-v3/faction-catalogue-review-runtime-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const json = async file => verifySeal(JSON.parse(await readFile(base + file, 'utf8')));
const component = await json('review-decomposition-runtime-component-v1.json');
assert(component.passed && component.actualReviewWrapperPassed && component.structuredRoleConsumerPassed
  && component.crossRunContinuationPassed && component.partialFragmentContinuationPassed && component.dryNoProviderPassed);
for (const c of component.codeHashes) assert.equal(sha256(await readFile(c.file)), c.hash, c.file);
const diagnosis = await json('terran-wire-context-diagnosis-v2.json');
const parent = await json(diagnosis.originRunId + '/recipe.json');
const input = await json(diagnosis.originRunId + '/terran_armed_forces-input.json');
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
const plan = prepareFactionReviewDecompositionV1(args);
assert.equal(plan.hash, component.planHash);
let checks = 2;
let observedCapsule, dryReleased = false;
const dry = createFactionCatalogueReviewRuntimeV1({ input,
  legacyRuntime: { role: () => assert.fail('No legacy reroute') }, legacyRoleIds: [], includeSharedScenarioSources: true,
  store: { acquire: () => ({ cached: false }), release: () => { dryReleased = true; } },
  executionPolicy: binding.executionPolicy, onUncached: ({ capsule }) => { observedCapsule = capsule; } });
await assert.rejects(dry.role(diagnosis.request), { code: 'FACTION_PREFLIGHT_FIRST_CATALOGUE_UNCACHED_ROLE' }); checks++;
assert(dryReleased); checks++;
assert.equal(observedCapsule.hash, args.capsule.hash); checks++;
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of ['reviewDecompositionReadinessHash: reviewDecompositionReadiness.hash, reviewDecompositionOrigins',
  'reviewDecomposition: reviewDecompositionReadiness, reviewDecompositionDiagnosis',
  'activeReviewFragmentCapabilities[kind] = await renewFactionCapabilityV1',
  'reviewFragments: activeReviewFragmentCapabilities', 'createFactionReviewDecompositionRuntimeV1({ store, dsh, wireRecovery',
  'explicit_decomposed_full_context_review', 'runtime: reviewDecompositionRuntime',
  'readSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1', '...Object.values(inheritedCapabilities.reviewFragments || {})']) {
  assert(main.includes(text), text); checks++;
}
const continuationCode = await readFile('packages/skill-production-v3/faction-continuation-v1.mjs', 'utf8');
for (const text of ['validateFactionReviewDecompositionMigrationV1', 'reviewDecomposition?.steps', 'reviewDecompositionMigration: reviewDecomposition.proof']) {
  assert(continuationCode.includes(text)); checks++;
}
const consumerCode = await readFile('packages/skill-evaluation/faction-production-replay-v1.mjs', 'utf8');
assert(consumerCode.includes('FACTION_REVIEW_WIRE_FOREIGN_ANCESTOR') && consumerCode.includes('FACTION_REVIEW_FRAGMENT_FOREIGN_ANCESTOR')); checks++;
const files = [...new Set([...component.codeHashes.map(c => c.file),
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-production-v3/faction-catalogue-review-runtime-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/verify-ticket-18-review-decomposition-wiring-v1.mjs'])];
const report = seal({ version: 'faction_review_decomposition_readiness_v1', passed: true, checks, binding,
  component, diagnosisHash: diagnosis.hash, planHash: plan.hash,
  originRunId: args.evidence.runId, originAttemptId: args.evidence.attemptId, originalReceiptHash: args.evidence.originalReceiptHash,
  crossRunContinuationPassed: true, partialFragmentContinuationPassed: true,
  formalMainParametersWired: true, mainStaticChecksOnly: true, dryCatalogueCapsuleRebuilt: true,
  actualContractProbesPerformed: false, actualProductionResumed: false, providerCalls: 0,
  semanticAcceptanceInherited: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
const { hash: ignored, ...body } = parent;
const next = seal({ ...body, reviewDecompositionBinding: binding, reviewDecompositionReadinessHash: report.hash,
  reviewDecompositionOrigins: [{ inputHash: input.hash, runId: args.evidence.runId, attemptId: args.evidence.attemptId,
    evidenceHash: args.evidence.hash, contextHash: args.capsule.hash }],
  codeHashes: [...parent.codeHashes.filter(c => !files.includes(c.file)), ...report.codeHashes] });
const migrationArgs = { filename, parentRunId: diagnosis.originRunId, parent, next, readiness: report, diagnosis, inputs: [input] };
const migrated = validateFactionReviewDecompositionMigrationV1(migrationArgs);
assert.equal(migrated.proof.accountingReset, false);
assert.equal(migrated.steps.length, 0); // Real parent has no new-fragment attempt to reuse.
const reseal = (v, patch) => { const { hash: ignoredHash, ...rest } = v; return seal({ ...rest, ...patch }); };
assert.throws(() => validateFactionReviewDecompositionMigrationV1({ ...migrationArgs,
  next: reseal(next, { limits: { ...next.limits, maxCalls: next.limits.maxCalls + 1 } }) }), { code: 'FACTION_REVIEW_DECOMPOSITION_MIGRATION_INVALID' });
assert.throws(() => validateFactionReviewDecompositionMigrationV1({ ...migrationArgs,
  parentRunId: 'faction-v1-' + 'f'.repeat(20) }), { code: 'FACTION_REVIEW_DECOMPOSITION_MIGRATION_INVALID' });
assert.throws(() => validateFactionReviewDecompositionMigrationV1({ ...migrationArgs,
  next: reseal(next, { reviewDecompositionOrigins: [] }) }), { code: 'FACTION_REVIEW_DECOMPOSITION_ORIGINS_DRIFT' });
await writeFile(base + 'review-decomposition-readiness-v1.json', JSON.stringify(report, null, 2));
await writeFile(base + 'review-decomposition-migration-proof-v1.json', JSON.stringify(migrated.proof, null, 2));
console.log(JSON.stringify({ passed: true, checks, migrationChecks: 5, providerCalls: 0,
  componentChecks: component.checks, actualDshSessions: component.actualDshSessions,
  actualProductionResumed: false, hash: report.hash, migrationHash: migrated.proof.hash }));
