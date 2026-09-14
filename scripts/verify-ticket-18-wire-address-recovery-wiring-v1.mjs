import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareFactionWireAddressRecoveryV1, loadFactionOpeningFenceRecipeEnvironmentV1,
  FACTION_WIRE_ADDRESS_RECOVERY_RECIPE_FIELDS_V1 as fields } from '../packages/skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { validateFactionWireAddressRecoveryMigrationV1 } from '../packages/skill-production-v3/faction-wire-address-recovery-migration-v1.mjs';
import { inspectFactionWireKeyHelperV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const parentRunId = 'faction-v1-6d345a142fa24636bab7';
const read = async file => verifySeal(JSON.parse(await readFile(base + file, 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
const ledger = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledger();
assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
let checks = 0;
const eq = (a, b) => { assert.equal(a, b); checks++; };
const names = ['authenticated-opening-fence-component-v1', 'dual-coordinate-coverage-component-v1',
  'dual-coordinate-review-runtime-component-v1', 'fragment-opening-fence-runtime-component-v1'];
const reports = await Promise.all(names.map(n => read(n + '.json')));
const code = new Map();
for (const report of reports) {
  eq(report.passed, true); eq(report.providerCalls, 0);
  for (const row of report.codeHashes) {
    eq(sha256(await readFile(row.file)), row.hash);
    if (code.has(row.file)) eq(code.get(row.file), row.hash);
    code.set(row.file, row.hash);
  }
}
const [raw, address, zerg, terran] = reports;
for (const value of [terran.actualOuterWrapperPassed, terran.independentOuterConsumerPassed, terran.productionReplayConsumerPassed,
  terran.sqliteRestartPassed, terran.crossRunFragmentContinuationPassed, terran.originalAttemptsUnchanged,
  terran.negativeRemainingJudgmentPreserved, raw.expiredRawRejectedEvenWhenCached, raw.globalPaymentStopPassed,
  zerg.originalJudgmentsPreserved, zerg.consumerReplayPassed, zerg.sqliteRestartPassed, address.originalV4Unchanged]) eq(value, true);
const mainFile = 'scripts/run-ticket-18-faction-strategy-production-v1.mjs';
const main = await readFile(mainFile, 'utf8');
for (const snippet of ['...wireAddressRecovery.recipeFields, wireAddressRecoveryReadinessHash:',
  'wireAddressRecovery: { gate: wireAddressRecoveryReadiness, prepared: wireAddressRecovery }',
  'openingFenceRecovery: wireAddressRecovery.openingFenceRecovery',
  'wireAddressRecovery.completeReviewImports.filter(row => row.inputHash === input.hash)',
  'coverageAddressBinding: wireAddressRecovery.recipeFields.dualCoordinateReviewBinding.coverageAddress',
  'completeReviewImportBinding: wireAddressRecovery.recipeFields.dualCoordinateReviewBinding.reviewImport']) eq(main.includes(snippet), true);
for (const file of [mainFile, 'packages/skill-production-v3/faction-wire-address-recovery-migration-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/verify-ticket-18-wire-address-recovery-wiring-v1.mjs']) code.set(file, sha256(await readFile(file)));
const parent = await read(parentRunId + '/recipe.json');
const inputs = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(f => read(parentRunId + '/' + f + '-input.json')));
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const egressBinding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version,
  hash: profile.integrity.hash } }).egressBinding;
const prepared = await prepareFactionWireAddressRecoveryV1({ filename, inputs,
  reviewDiagnosis: await read('terran-wire-context-diagnosis-v2.json'),
  actualDiagnosis: await read(parentRunId + '/actual-resume-diagnosis-7fb9531534ff84cd30f0.json'),
  egressBinding, helperRef: await inspectFactionWireKeyHelperV2() });
eq(prepared.openingFenceRecovery.proofs[0].hash, terran.authenticatedProofHash);
eq(prepared.openingFenceRecovery.proofs[0].hash, raw.authenticatedProofHash);
eq(prepared.completeReviewImports[0].evidence.candidate.hash, zerg.originalCandidateHash);
const gate = seal({ version: 'faction_wire_address_recovery_readiness_v1', passed: true, providerCalls: 0,
  originRunId: parentRunId, recipeFieldsHash: hash(prepared.recipeFields),
  authenticatedOpeningFenceProofHash: raw.authenticatedProofHash,
  originalReviewCandidateHash: zerg.originalCandidateHash, originalReviewReceiptHash: zerg.originalReceiptHash,
  actualOuterWrapperPassed: terran.actualOuterWrapperPassed, independentOuterConsumerPassed: terran.independentOuterConsumerPassed,
  productionReplayConsumerPassed: terran.productionReplayConsumerPassed,
  sqliteRestartPassed: terran.sqliteRestartPassed && zerg.sqliteRestartPassed,
  crossRunFragmentContinuationPassed: terran.crossRunFragmentContinuationPassed,
  exactOriginalAttemptsPreserved: reports.filter(r => r.originalAttemptsUnchanged !== undefined).every(r => r.originalAttemptsUnchanged),
  runnerParametersBound: true, runnerCheckKind: 'static_arguments_plus_actual_runtime_and_consumer_tests',
  negativeReviewPreserved: terran.negativeRemainingJudgmentPreserved && zerg.originalJudgmentsPreserved,
  expiredRawAndPaymentStopPassed: raw.expiredRawRejectedEvenWhenCached && raw.globalPaymentStopPassed,
  components: reports.map((r, i) => ({ file: names[i] + '.json', hash: r.hash, checks: r.checks })),
  codeHashes: [...code].map(([file, hash]) => ({ file, hash })),
  injectedRemainingFragmentTransports: terran.injectedRemainingFragmentTransports,
  fullProductionPreflightStillRequired: true, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
const reseal = (v, patch = {}) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const next = reseal(parent, { ...prepared.recipeFields, wireAddressRecoveryReadinessHash: gate.hash,
  codeHashes: gate.codeHashes });
const args = { filename, parentRunId, parent, next, gate, prepared };
const migration = validateFactionWireAddressRecoveryMigrationV1(args);
eq(migration.originalAttemptsCopied, 0); eq(migration.accountingReset, false);
eq(validateFactionWireAddressRecoveryMigrationV1({ ...args, parent: next }).recipeFieldsHash, gate.recipeFieldsHash);
for (const field of fields) {
  const missing = { ...next }; delete missing[field];
  assert.throws(() => validateFactionWireAddressRecoveryMigrationV1({ ...args, next: reseal(missing) })); checks++;
}
for (const patch of [{ limits: { ...next.limits, maxCalls: next.limits.maxCalls + 1 } },
  { inputHashes: [...next.inputHashes].reverse() }, { wireAddressRecoveryReadinessHash: hash('foreign gate') },
  { openingFenceRecoveryOrigins: next.openingFenceRecoveryOrigins.map(o => ({ ...o, proofHash: hash('foreign proof') })) },
  { codeHashes: [] }]) {
  assert.throws(() => validateFactionWireAddressRecoveryMigrationV1({ ...args, next: reseal(next, patch) })); checks++;
}
assert.throws(() => validateFactionWireAddressRecoveryMigrationV1({ ...args, parentRunId: 'faction-v1-' + '0'.repeat(20) }),
  { code: 'FACTION_WIRE_ADDRESS_FIRST_ACTIVATION_PARENT' }); checks++;
eq(await loadFactionOpeningFenceRecipeEnvironmentV1({ root: process.cwd(), recipe: next, input: inputs[1] }), null);
eq(await loadFactionOpeningFenceRecipeEnvironmentV1({ root: process.cwd(), recipe: parent, input: inputs[0] }), null);
eq(ledger(), before); db.close();
await writeFile(base + 'wire-address-recovery-readiness-v1.json', JSON.stringify(gate, null, 2));
const verification = seal({ version: 'faction_wire_address_recovery_wiring_verification_v1', passed: true, checks,
  gateHash: gate.hash, migration, providerCalls: 0, originalAttemptsUnchanged: true, trainingTruth: false });
await writeFile(base + 'wire-address-recovery-wiring-verification-v1.json', JSON.stringify(verification, null, 2));
console.log(JSON.stringify({ passed: true, checks, gateHash: gate.hash, providerCalls: 0, verificationHash: verification.hash }));
