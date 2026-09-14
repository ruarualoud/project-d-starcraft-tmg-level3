import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as binding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { FACTION_INITIAL_SOURCE_CORRECTION_BINDING_V2 as sourceBinding } from '../packages/skill-production-v3/faction-initial-source-correction-v2.mjs';
import { validateFactionDraftPolicyMigrationV2 } from '../packages/skill-production-v3/faction-draft-policy-migration-v2.mjs';
import { FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2 as editorBinding } from '../packages/skill-production-v3/faction-editor-draft-envelope-v2.mjs';

// Aggregate already-executed real failure/DSH tests and whole-workflow source
// correction tests. Static CLI wiring assertions are explicitly NOT a live
// production result; the formal runner must still execute its own preflight.
const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const parentRunId = 'faction-v1-b624e21a2da88377b410';
const read = async n => verifySeal(JSON.parse(await readFile(base + n + '.json', 'utf8')));
const parent = await read(parentRunId + '/recipe');
const component = await read('draft-envelope-recovery-component-v2');
const workflow = await read('initial-source-correction-workflow-v2');
const source = await read('zerg-card-economy-readiness');
const unique = await read('unique-cross-field-readiness');
const editor = await read('editor-draft-envelope-readiness-v2');
let checks = 0;
for (const gate of [component, workflow, source, unique, editor]) {
  assert.equal(gate.passed, true); checks++;
  assert.equal(gate === source ? gate.newProviderCalls : gate.providerCalls, 0); checks++;
  for (const row of gate.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash, row.file);
  checks++;
}
assert.equal(component.binding.hash, binding.hash); checks++;
assert.equal(component.sourceBinding.hash, sourceBinding.hash); checks++;
assert.equal(component.actualDshSessions, 4); checks++;
assert.equal(component.currentFaults.actualDshSessions, 2); checks++;
assert.equal(workflow.binding.hash, sourceBinding.hash); checks++;
assert.equal(workflow.injectedFreshReviewCalls, 12); checks++;
assert.equal(workflow.wholeSectionFreshReviewRequired, true); checks++;
assert.equal(workflow.newNegativeBlocksCompletion, true); checks++;
assert.equal(workflow.allKnownFieldsAppliedAtomically, true); checks++;
assert.equal(source.audit.findings.length, 13); checks++;
assert.equal(editor.binding.hash, editorBinding.hash); checks++;
assert.equal(editor.actualDshSessions, 2); checks++;
assert.equal(editor.durableDescendantImportsPassed, true); checks++;
assert.equal(editor.dryImportHasNoDshOrProvider, true); checks++;
assert.equal(editor.policyDriftRejectedBeforeEgress, true); checks++;

const runnerFile = 'scripts/run-ticket-18-faction-strategy-production-v1.mjs';
const runner = await readFile(runnerFile, 'utf8');
for (const literal of [
  'const draftEnvelopeImports = draftPolicyReadiness.origins.map',
  'draftEnvelopeBinding, initialSourceCorrectionBinding, editorEnvelopeBinding, draftPolicyReadinessHash: draftPolicyReadiness.hash',
  'draftPolicy: draftPolicyReadiness',
  'for (const row of draftPolicyReadiness.codeHashes)',
  'draftEnvelopeBinding, draftEnvelopeImports,',
  'draftEnvelopeBinding, draftEnvelopeImports: draftEnvelopeImports.filter',
]) { assert.ok(runner.includes(literal), literal); checks++; }
assert.equal(runner.split('uniqueRiskClauseBinding, draftEnvelopeBinding, initialSourceCorrectionBinding,').length - 1, 2); checks++;
// Preflight may select either faction; the Terran-only seed remains scoped to
// index 0. This is wiring evidence, not a substitute for the actual preflight.
assert.ok(runner.includes('store: dryStore, phaseFieldSeed: dryIndex === 0 ? phaseFieldSeed : null, draftEnvelopeBinding')); checks++;
assert.ok(runner.includes('phaseFieldSeed: index === 0 ? phaseFieldSeed : null, draftEnvelopeBinding')); checks++;
assert.equal(runner.split('editorEnvelopeImports: continuation?.editorEnvelopeFailureImports || [],').length - 1, 2); checks++;
assert.ok(runner.includes('readEditorEnvelopeFailure: ({ prepared, failureReceiptHash })')); checks++;
const continuation = await readFile('packages/skill-production-v3/faction-continuation-v1.mjs', 'utf8');
assert.ok(continuation.includes('validateFactionDraftPolicyMigrationV2(')); checks++;
const consumer = await readFile('scripts/run-ticket-18-faction-consumer-evaluation-v1.mjs', 'utf8');
assert.ok(consumer.includes("'zerg-card-economy-readiness'")); checks++;

const files = [...new Set([...[component, workflow, source, unique, editor].flatMap(g => g.codeHashes.map(r => r.file)),
  'packages/skill-production-v3/faction-draft-policy-migration-v2.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-production-v3/faction-source-field-repair-v2.mjs',
  'packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs',
  'packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  runnerFile, 'scripts/run-ticket-18-faction-consumer-evaluation-v1.mjs',
  'scripts/verify-ticket-18-draft-policy-wiring-v2.mjs',
  'scripts/verify-ticket-18-native-reference-reconstruction-consumer-v2.mjs',
])];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const body = { version: 'faction_draft_policy_readiness_v2', passed: true, binding, sourceBinding,
  editorBinding, editorEnvelopeHash: editor.hash,
  editorEnvelope: { passed: true, actualDshSessions: editor.actualDshSessions,
    currentFailureBranchTested: editor.currentFailureBranchTested, independentConsumerPassed: editor.independentConsumerPassed,
    hostPatchPassed: editor.hostPatchPassed, zeroProviderRestartImportPassed: editor.zeroProviderRestartImportPassed,
    durableDescendantImportsPassed: editor.durableDescendantImportsPassed,
    dryImportHasNoDshOrProvider: editor.dryImportHasNoDshOrProvider,
    policyDriftRejectedBeforeEgress: editor.policyDriftRejectedBeforeEgress, actualPaidEditorFailures: 0 },
  componentHash: component.hash, initialSourceWorkflowHash: workflow.hash,
  zergSourceAuditHash: source.hash, uniqueSourceAuditHash: unique.hash,
  origins: component.origins, currentFaults: component.currentFaults,
  initialSourceWorkflow: { passed: true, wholeSectionFreshReviewRequired: true,
    newNegativeBlocksCompletion: true, allKnownFieldsAppliedAtomically: true,
    injectedFreshReviewCalls: workflow.injectedFreshReviewCalls, actualFormalProductionApplied: false },
  providerCalls: 0, actualDshSessions: component.actualDshSessions + editor.actualDshSessions,
  fullPaidRequestAndInvocationRebuilt: component.fullPaidRequestAndInvocationRebuilt,
  nativeImportAndConsumerWired: component.nativeImportAndConsumerWired,
  runnerParametersBound: true, runnerParametersInspection: 'static_call_sites_plus_dynamic_component_and_workflow_tests',
  formalRunnerPreflightPerformed: false, formalProductionRecovered: false,
  acceptanceInherited: false, accountingReset: false, independentSemanticAcceptance: false,
  sourceRefreshPerformed: false, trainingTruth: false, codeHashes };
const readiness = seal(body);
const makeNext = gate => ({ ...parent, draftEnvelopeBinding: binding,
  initialSourceCorrectionBinding: sourceBinding, editorEnvelopeBinding: editorBinding, draftPolicyReadinessHash: gate.hash,
  codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
const next = makeNext(readiness);
const args = { filename, parentRunId, parent, next, readiness };
assert.equal(validateFactionDraftPolicyMigrationV2(args).bindingHash, binding.hash); checks++;
assert.equal(validateFactionDraftPolicyMigrationV2({ ...args, parent: next }).accountingReset, false); checks++;
assert.equal(validateFactionDraftPolicyMigrationV2({ filename, parentRunId, parent, next: parent }), null); checks++;
for (const change of [n => delete n.draftEnvelopeBinding, n => delete n.initialSourceCorrectionBinding, n => delete n.editorEnvelopeBinding,
  n => n.draftPolicyReadinessHash = hash('wrong'), n => n.codeHashes = [],
  n => n.inputHashes = [], n => n.nativeOutputCapacityBinding = null,
  n => n.nativeTargetReconstructionBinding = null]) {
  const wrong = structuredClone(next); change(wrong);
  assert.throws(() => validateFactionDraftPolicyMigrationV2({ ...args, next: wrong })); checks++;
}
assert.throws(() => validateFactionDraftPolicyMigrationV2({ ...args, parentRunId: 'faction-v1-9200d037cfa6a1c4a388' })); checks++;
assert.throws(() => validateFactionDraftPolicyMigrationV2({ ...args, parent: next, next: parent })); checks++;
for (const change of [g => g.origins[0].originalFailureReceiptHash = hash('wrong'),
  g => g.origins[1].contextHash = hash('wrong'), g => g.origins[0].originalSettledMicros++,
  g => g.origins.reverse(), g => g.acceptanceInherited = true, g => g.accountingReset = true,
  g => g.initialSourceWorkflow.newNegativeBlocksCompletion = false, g => g.editorEnvelope.durableDescendantImportsPassed = false]) {
  const wrong = structuredClone(body); change(wrong); const gate = seal(wrong);
  assert.throws(() => validateFactionDraftPolicyMigrationV2({ ...args, readiness: gate, next: makeNext(gate) })); checks++;
}
const report = seal({ ...body, checks: checks + component.checks + workflow.checks + source.checks + unique.checks + editor.checks,
  wiringAndMigrationChecks: checks, migrationNegativeCasesPassed: true });
const migration = validateFactionDraftPolicyMigrationV2({ ...args, readiness: report, next: makeNext(report) });
await writeFile(base + 'draft-policy-readiness-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: report.checks, wiringAndMigrationChecks: checks,
  actualDshSessions: report.actualDshSessions, providerCalls: 0, hash: report.hash, migrationHash: migration.hash,
  formalProductionRecovered: false }));
