import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail, sha256 } from '../packages/skill-production/common.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { createFactionReviewTransactionRuntimeV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { createFactionObservedRosterFactsV1 } from '../packages/skill-evaluation/faction-observed-roster-facts-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../packages/structured-generation/context-capsule-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-3241bb0aff2eda69e7c9';
const attemptId = 'structured-34d5da73ed13d7fd4aca86335286d223031ab2d7d27c71d6';
const suffix = 'faction.terran_armed_forces.card_packages.2.review-target-batch-v1.supportive.0.0';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read(runId + '/recipe'), input = await read(runId + '/terran_armed_forces-input');
const knownRulePolicy = await read('terran_armed_forces-known-rule-policy'), ancestors = [];
let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(parent + '/recipe'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const db = new DatabaseSync(filename, { readOnly: true });
let attempt, receipt, originalIssue;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  receipt = verifySeal(JSON.parse(attempt.response)).value;
  originalIssue = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, attemptId + '.issue').artifact)).value;
} finally { db.close(); }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const fieldRepairSeed = await inspectFactionFieldRepairEvidenceV1({ root, runId: recipe.fieldRepairBinding.runId });
const phaseFieldSeed = await inspectFactionPhaseFieldEvidenceV1({ root, runId: recipe.phaseFieldBinding.runId });
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const facts = createFactionObservedRosterFactsV1({ input, dataset });
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof; const sections = [];
try {
  const forbidden = () => fail('TERRAN_WIRE_DIAGNOSIS_EGRESS_FORBIDDEN');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  const wrapped = createFactionReviewTransactionRuntimeV1({ input, phaseFieldSeed, store: replay.store,
    runtime: stack.runtime, draftEnvelopeBinding: recipe.draftEnvelopeBinding });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, store: replay.store, fieldRepairSeed, phaseFieldSeed,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
    observedSourceRepair: { binding: recipe.observedSourceRepairBinding, facts },
    proposerBatches: { binding: recipe.proposerBatchBinding, frozenRoleIds: recipe.proposerBatchFrozenRoleIds,
      auxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding }, uniqueRiskClauseBinding: recipe.uniqueRiskClauseBinding,
    draftEnvelopeBinding: recipe.draftEnvelopeBinding, initialSourceCorrectionBinding: recipe.initialSourceCorrectionBinding,
    onProgress: row => { if (row.stage === 'section_complete') { sections.push(row); console.log(JSON.stringify({ event: 'chapter-rebuilt', completed: sections.length })); } },
    runtime: { role(r) {
      if (r.roleId.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '') === suffix) { request = r; fail('TERRAN_WIRE_DIAGNOSIS_CAPTURED'); }
      return wrapped.role(r);
    } } }), { code: 'TERRAN_WIRE_DIAGNOSIS_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
assert.equal(sections.length, 6);
const w = request.workspace, roleRef = { id: suffix, version: 'structured-review-v1', hash: hash(suffix + '.structured-review-v1') };
const outputContractRef = receipt.outputContractRef;
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
  reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
  targets: w.outputRequestAtEnd.targetContract, roleRef, outputContractRef, route: 'supportive', includeSharedScenarioSources: true });
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation', roleRef,
  contextManifestRef: contextManifestRefStarcraftTmgV1(capsule), outputContractRef,
  executionPolicyRef: { id: 'policy.faction-target-review.production', version: '2026.09.06.1', hash: hash(executionPolicy) },
  continuationRef: null, contextPayloadHash: hash({ instructions: capsule.instructions, input: capsule.compiledInput }),
  capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
const providerRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: attemptId,
  roleRef, instructions: capsule.instructions, input: capsule.compiledInput, outputContractRef, maxOutputUnits: 4096 };
assert.equal(hash(invocation), originalIssue.invocationHash);
assert.equal(hash(providerRequest), attempt.request_hash);
assert.equal(attemptId, 'structured-' + hash(invocation).slice(0, 48));
const report = seal({ version: 'terran_wire_context_diagnosis_v2', passed: true, originRunId: runId,
  originAttemptId: attemptId, inputHash: input.hash, request, capsule, invocation, providerRequest,
  originalIssueHash: originalIssue.hash, originalReceiptHash: receipt.receiptHash, originalOutputTextHash: receipt.outputTextHash,
  originalUsage: receipt.usage, originalSettledMicros: attempt.settled, actualContextAndInvocationRebuilt: true,
  originalProviderRequestHash: attempt.request_hash, sourceWorkflowChaptersReplayed: sections.length, replayProof,
  providerCalls: 0, actualDshSessions: 0, rawPayloadRecovered: false, productionResumed: false,
  semanticAcceptance: false, trainingTruth: false, codeHash: sha256(await readFile(import.meta.filename)) });
await writeFile(base + 'terran-wire-context-diagnosis-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, sourceChaptersReplayed: sections.length, providerCalls: 0,
  actualContextAndInvocationRebuilt: true, rawPayloadRecovered: false, hash: report.hash }));
