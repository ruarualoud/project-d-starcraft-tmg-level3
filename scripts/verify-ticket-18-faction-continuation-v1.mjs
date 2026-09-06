import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionContinuationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const temp = await mkdtemp(path.join(base, 'continuation-test-')), filename = path.join(temp, 'fixture.sqlite');
const parent = seal({ version: 'faction_strategy_production_v1', codeHashes: [{ file: 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', hash: hash('old') }],
  workflowReadinessHash: hash('old readiness'), dshContextReadinessHash: hash('old capacity'), inputHashes: [hash('full input')],
  limits: { maxCalls: 20, maxCostMicros: 5000000, maxTokens: 1000000 }, sourceBinding: hash('frozen'), dshBindingHash: hash('pinned dsh') });
const parentRunId = 'faction-v1-' + parent.hash.slice(0, 20);
const parentStore = openProductionStore(filename, { runId: parentRunId, recipeHash: parent.hash });
const put = (s, id, input, artifact) => { const l = s.acquire(id, input); return s.finish(l, artifact); };
put(parentStore, 'production-start', { recipeHash: parent.hash }, { began: 1000 });
const roleInput = { task: 'full original input' }, id = 'faction.terran.tutor';
const artifact = seal({ roleId: id, output: { lesson: ['Injected actual-store checkpoint'] }, loop: { transcript: [] } });
put(parentStore, id, roleInput, artifact);
put(parentStore, 'faction.terran.candidate', {}, seal({ semanticReviewPassed: true }));
const rejectedCandidate = seal({
  version: 'starcraft_tmg_structured_generation_runtime_v1.rejected-candidate',
  invocationHash: hash('fixture invocation'),
  roleRef: { id: 'faction.terran.objectives.1.review-target-batch-v1.supportive.2.0',
    version: 'structured-review-v1', hash: hash('fixture role') },
  contextManifestRef: { id: 'context.fixture', version: 'starcraft_tmg_context_capsule_v1',
    hash: hash('fixture context') },
  outputContractRef: { id: 'starcraft-tmg.faction-target-review',
    version: '2026.09.06.1', hash: hash('fixture output contract') },
  providerValue: { verdicts: [], coverage: [] },
  validation: { ok: false, issues: [{ path: '$.verdicts',
    code: 'array_too_short', actualItems: 0, minItems: 1, maxItems: 2 }],
  valueHash: hash({ verdicts: [], coverage: [] }),
  schemaHash: hash('fixture schema') },
  safeReceiptHash: hash('fixture safe receipt'),
  semanticAcceptanceInherited: false, published: false,
  runtimeAccepted: false, trainingTruth: false,
});
put(parentStore, 'structured-fixture.rejected-candidate',
  { rejectedCandidateHash: rejectedCandidate.hash }, rejectedCandidate);
parentStore.reserve(id + '.call-1', { request: 'injected' }, 100, 30);
parentStore.settle(id + '.call-1', { usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 }, costMicros: 10, response: { injectedOnly: true } });
const parentReport = seal({ runId: parentRunId, recipeHash: parent.hash, failure: { code: 'OUTPUT_SCHEMA_INVALID' } });
const { hash: ignored, ...b } = parent;
const next = seal({ ...b, codeHashes: [{ file: 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', hash: hash('new') }],
  workflowReadinessHash: hash('new readiness'), dshContextReadinessHash: hash('new capacity') });
const deps = { filename, parentRunId, parent, parentReport, next };
const continuation = inspectFactionContinuationV1(deps);
assert.equal(continuation.manifest.reusable.length, 1); assert.equal(continuation.manifest.parentStart, 1000);
assert.equal(continuation.manifest.schemaRepairImports.length, 1);
assert.equal(continuation.schemaRepairCandidates[0].artifact.hash,
  rejectedCandidate.hash);
assert.deepEqual(continuation.manifest.accounting, { calls: 1, costMicros: 10, tokens: 12 });
const unitFiles = ['packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs', 'packages/skill-evaluation/faction-unit-role-debt-v1.mjs'];
const unitCode = [...next.codeHashes, ...unitFiles.map(file => ({ file, hash: hash('unit repair ' + file) }))];
const unitGates = [seal({ passed: true, inputHash: parent.inputHashes[0], codeHashes: unitCode, actualKnownCounterexamples: 3,
  unaffectedFieldsPreserved: true, freshReviewRequired: true }),
seal({ passed: true, inputHash: parent.inputHashes[0], codeHashes: unitCode, repairsIntegrated: true, freshNegativeRetained: true, freshWholeSectionReviews: 16 }),
seal({ passed: true, inputHash: parent.inputHashes[0], codeHashes: unitCode, fullSourceDeliveryVerified: true,
  actualDshSessions: 1, providerCalls: 0, dshBinding: { hash: parent.dshBindingHash } })];
const unitNext = seal({ ...bFor(parent), codeHashes: unitCode, unitRoleRepairReadinessHashes: unitGates.map(g => g.hash) });
const unitDeps = { ...deps, next: unitNext, unitRoleRepairMigration: unitGates };
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: unitNext }), { code: 'FACTION_UNIT_REPAIR_MIGRATION_PROOF_MISSING' });
const unitContinuation = inspectFactionContinuationV1(unitDeps);
assert.deepEqual(unitContinuation.manifest.accounting, continuation.manifest.accounting);
assert.equal(unitContinuation.manifest.parentStart, continuation.manifest.parentStart);
for (const [position, fields] of [[0, { unaffectedFieldsPreserved: false }], [1, { freshNegativeRetained: false }],
  [2, { fullSourceDeliveryVerified: false }], [2, { dshBinding: { hash: hash('other dsh') } }]]) {
  const changed = unitGates.map((g, n) => n === position ? seal({ ...bFor(g), ...fields }) : g);
  assert.throws(() => inspectFactionContinuationV1({ ...unitDeps,
    next: seal({ ...bFor(unitNext), unitRoleRepairReadinessHashes: changed.map(g => g.hash) }), unitRoleRepairMigration: changed }),
  { code: 'FACTION_UNIT_REPAIR_MIGRATION_PROOF_INVALID' });
}
assert.throws(() => inspectFactionContinuationV1({ ...unitDeps,
  next: seal({ ...bFor(unitNext), limits: { ...parent.limits, maxTokens: 2000000 } }) }), { code: 'FACTION_CONTINUATION_CONTRACT_DRIFT' });
const unitParentId = 'faction-v1-' + unitNext.hash.slice(0, 20);
assert.throws(() => inspectFactionContinuationV1({ ...unitDeps, parent: unitNext, parentRunId: unitParentId,
  parentReport: seal({ runId: unitParentId, recipeHash: unitNext.hash, failure: { code: 'INJECTED' } }), next }),
  { code: 'FACTION_CONTINUATION_UNIT_REPAIR_REMOVED' });
const fieldFiles = ['packages/skill-production-v3/faction-field-repair-seed-v1.mjs',
  'packages/skill-production-v3/faction-field-repair-v1.mjs', 'packages/skill-evaluation/faction-field-repair-evidence-v1.mjs',
  'packages/skill-evaluation/faction-semantic-debt-v1.mjs', 'packages/skill-evaluation/read-only-production-replay-v1.mjs'];
const fieldCode = [...next.codeHashes, ...fieldFiles.map(file => ({ file, hash: hash('bound ' + file) }))];
const fieldBinding = seal({ inputHash: parent.inputHashes[0], evidenceHash: hash('fixture inspected actual request'), semanticAcceptanceInherited: false });
const fieldReadiness = seal({ passed: true, bindingHash: fieldBinding.hash, evidenceHash: fieldBinding.evidenceHash,
  actualRepairReapplied: true, freshReviewRequired: true, freshNegativeRetained: true, codeHashes: fieldCode });
const fieldNext = seal({ ...bFor(parent), fieldRepairBinding: fieldBinding, codeHashes: fieldCode });
function bFor(value) { const { hash: ignored, ...body } = value; return body; }
const fieldDeps = { ...deps, next: fieldNext, fieldRepairMigration: { binding: fieldBinding, readiness: fieldReadiness } };
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: fieldNext }), { code: 'FACTION_FIELD_REPAIR_MIGRATION_PROOF_MISSING' });
const fieldContinuation = inspectFactionContinuationV1(fieldDeps);
assert.deepEqual(fieldContinuation.manifest.accounting, continuation.manifest.accounting);
assert.equal(fieldContinuation.manifest.parentStart, continuation.manifest.parentStart);
assert.equal(fieldContinuation.manifest.fieldRepairMigration.bindingHash, fieldBinding.hash);
for (const fields of [{ freshReviewRequired: false }, { freshNegativeRetained: false }, { evidenceHash: hash('forged') }])
  assert.throws(() => inspectFactionContinuationV1({ ...fieldDeps,
    fieldRepairMigration: { binding: fieldBinding, readiness: seal({ ...bFor(fieldReadiness), ...fields }) } }),
  { code: 'FACTION_FIELD_REPAIR_MIGRATION_PROOF_INVALID' });
assert.throws(() => inspectFactionContinuationV1({ ...fieldDeps,
  next: seal({ ...bFor(fieldNext), limits: { ...parent.limits, maxTokens: 2000000 } }) }), { code: 'FACTION_CONTINUATION_CONTRACT_DRIFT' });
const fieldParentId = 'faction-v1-' + fieldNext.hash.slice(0, 20);
assert.throws(() => inspectFactionContinuationV1({ ...fieldDeps, parent: fieldNext, parentRunId: fieldParentId,
  parentReport: seal({ runId: fieldParentId, recipeHash: fieldNext.hash, failure: { code: 'INJECTED' } }), next }),
  { code: 'FACTION_CONTINUATION_FIELD_REPAIR_DRIFT' });
const nextStore = openProductionStore(filename, { runId: 'injected-next', recipeHash: next.hash });
const wrapped = withCheckpointContinuation(nextStore, continuation);
assert.equal(wrapped.acquire(id, roleInput).artifact.hash, artifact.hash); assert.equal(nextStore.summary().calls, 0);
assert(!wrapped.acquire('faction.terran.candidate', {}).cached, 'final acceptance must be re-evaluated');
const drift = seal({ ...b, inputHashes: [hash('different input')] });
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: drift }), { code: 'FACTION_CONTINUATION_CONTRACT_DRIFT' });
const foreign = seal({ ...b, codeHashes: [{ file: 'packages/skill-production/model.mjs', hash: hash('different model') }] });
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: foreign }), { code: 'FACTION_CONTINUATION_DEPENDENCY_DRIFT' });
const correctionFiles = ['packages/skill-production-v3/faction-review-targets-v1.mjs',
  'packages/skill-production-v3/faction-known-rule-findings-v1.mjs', 'packages/skill-production-v3/faction-source-scope-adjudication-v1.mjs',
  'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs'];
const correctionCode = [...next.codeHashes, ...correctionFiles.map(file => ({ file, hash: hash('correction ' + file) }))];
const correctionMigration = seal({ passed: true, inputHashes: parent.inputHashes, policyHashes: [hash('calibrated policy')],
  codeHashes: correctionCode, actualShiftedQuotesRejected: true, rawHistoricalFailurePreserved: true });
const correctionNext = seal({ ...b, codeHashes: correctionCode, knownRulePolicyHashes: correctionMigration.policyHashes,
  targetedCorrectionsReadinessHash: correctionMigration.hash });
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: correctionNext }), { code: 'FACTION_CORRECTION_MIGRATION_PROOF_MISSING' });
const correctedContinuation = inspectFactionContinuationV1({ ...deps, next: correctionNext, correctionMigration });
assert.deepEqual(correctedContinuation.manifest.accounting, continuation.manifest.accounting);
assert.deepEqual(correctedContinuation.manifest.correctionMigration.policyHashes, correctionMigration.policyHashes);
const { hash: ignoredCorrection, ...correctionBody } = correctionNext;
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: seal({ ...correctionBody, knownRulePolicyHashes: [hash('unproved')] }), correctionMigration }),
  { code: 'FACTION_CORRECTION_MIGRATION_PROOF_INVALID' });
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: seal({ ...correctionBody,
  codeHashes: correctionCode.map(r => ({ ...r, hash: hash('unbound code') })) }), correctionMigration }), { code: 'FACTION_CORRECTION_MIGRATION_PROOF_INVALID' });
assert.throws(() => inspectFactionContinuationV1({ ...deps, next: seal({ ...correctionBody, limits: { ...parent.limits, maxTokens: 2000000 } }), correctionMigration }),
  { code: 'FACTION_CONTINUATION_CONTRACT_DRIFT' });
const boundParentId = 'faction-v1-' + correctionNext.hash.slice(0, 20);
assert.throws(() => inspectFactionContinuationV1({ ...deps, parent: correctionNext, parentRunId: boundParentId,
  parentReport: seal({ runId: boundParentId, recipeHash: correctionNext.hash, failure: { code: 'INJECTED' } }), next, correctionMigration }),
  { code: 'FACTION_CONTINUATION_KNOWN_RULE_POLICY_DRIFT' });
const providerFiles = ['provider-response-outcome-v1.mjs', 'provider-egress-transport-v1.mjs', 'provider-worker-success-classifier-v1.mjs'].map(n => 'packages/secure-provider-runtime/' + n);
const before = seal({ passed: true, catalogueHash: hash('frozen'), dshBinding: { hash: hash('dsh') }, codeHashes: providerFiles.map(file => ({ file, hash: hash('old ' + file) })) });
const after = seal({ passed: true, catalogueHash: before.catalogueHash, dshBinding: before.dshBinding, codeHashes: providerFiles.map(file => ({ file, hash: hash('new ' + file) })) });
const recovery = seal({ passed: true, policy: 'bounded_grammar_recovery_v2', codeHashes: after.codeHashes });
// Migration proof is checked before journal access, and must not admit model,
// source, profile, budget or arbitrary readiness changes.
const migrationParent = seal({ ...b, mainReadinessHash: before.hash });
const migrationNext = seal({ ...b, mainReadinessHash: after.hash, jsonRecoveryReadinessHash: recovery.hash });
const migrationDeps = { ...deps, parent: migrationParent, parentRunId: 'faction-v1-' + migrationParent.hash.slice(0, 20), next: migrationNext,
  parentReport: seal({ runId: 'faction-v1-' + migrationParent.hash.slice(0, 20), recipeHash: migrationParent.hash, failure: { code: 'PROVIDER_RESPONSE_JSON_INVALID' } }) };
assert.throws(() => inspectFactionContinuationV1(migrationDeps), { code: 'FACTION_NORMALIZATION_MIGRATION_PROOF_MISSING' });
assert.throws(() => inspectFactionContinuationV1({ ...migrationDeps, normalizationMigration: { before, after, recovery } }), { code: 'FACTION_CONTINUATION_JOURNAL_DRIFT' });
const badAfter = seal({ ...after, codeHashes: [...after.codeHashes, { file: 'packages/skill-production/model.mjs', hash: hash('drift') }], hash: undefined });
const { hash: ignoredNext, ...migrationBody } = migrationNext;
assert.throws(() => inspectFactionContinuationV1({ ...migrationDeps, next: seal({ ...migrationBody, mainReadinessHash: badAfter.hash }),
  normalizationMigration: { before, after: badAfter, recovery } }), { code: 'FACTION_NORMALIZATION_DEPENDENCY_DRIFT' });
const { hash: ignoredAfter, ...afterBody } = after;
const wrongSource = seal({ ...afterBody, catalogueHash: hash('other source') });
assert.throws(() => inspectFactionContinuationV1({ ...migrationDeps, next: seal({ ...migrationBody, mainReadinessHash: wrongSource.hash }),
  normalizationMigration: { before, after: wrongSource, recovery } }), { code: 'FACTION_NORMALIZATION_MIGRATION_PROOF_INVALID' });
const busy = parentStore.acquire('unsettled-work', {});
assert.throws(() => inspectFactionContinuationV1(deps), { code: 'FACTION_CONTINUATION_PARENT_RUNNING' }); parentStore.release(busy);
parentStore.reserve('ambiguous', {}, 100, 30);
assert.throws(() => inspectFactionContinuationV1(deps), { code: 'AMBIGUOUS_EGRESS_NO_RETRY' });
parentStore.settle('ambiguous', { code: 'PROVIDER_PAYMENT_REQUIRED', definitelyNotSent: true });
assert.throws(() => inspectFactionContinuationV1(deps), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' });
nextStore.close(); parentStore.close();
const files = ['packages/skill-production-v3/faction-continuation-v1.mjs', 'packages/skill-production/continuation.mjs', 'scripts/verify-ticket-18-faction-continuation-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 40, codeHashes, providerCalls: 0, fixtureOnly: true, trainingTruth: false });
await writeFile(path.join(base, 'continuation-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 40, providerCalls: 0, hash: report.hash }));
