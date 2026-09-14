import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, fail } from '../packages/skill-production/common.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';
import { createFactionReviewTransactionRuntimeV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { createFactionObservedRosterFactsV1 } from '../packages/skill-evaluation/faction-observed-roster-facts-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { FACTION_PROPOSER_BATCH_CONTRACT_V1 as contract } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const runId = 'faction-v1-c96a15b1a09894a777f7', attemptId = 'structured-7534c9a380436dac92f1d0a9a269621dd3cf7162f195004e';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read(runId + '/recipe'), input = await read('terran_armed_forces-input');
const knownRulePolicy = await read('terran_armed_forces-known-rule-policy');
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId });
const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
const ancestors = []; let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(parent + '/recipe'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const facts = createFactionObservedRosterFactsV1({ input, dataset });
const fieldRepairSeed = await inspectFactionFieldRepairEvidenceV1({ root, runId: recipe.fieldRepairBinding.runId });
const phaseFieldSeed = await inspectFactionPhaseFieldEvidenceV1({ root, runId: recipe.phaseFieldBinding.runId });
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof; const sections = [];
try {
  const forbidden = () => fail('TERRAN_PROPOSER_DIAGNOSIS_EGRESS_FORBIDDEN');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  const wrapped = createFactionReviewTransactionRuntimeV1({ input, phaseFieldSeed, store: replay.store, runtime: stack.runtime });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, store: replay.store, fieldRepairSeed, phaseFieldSeed,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
    observedSourceRepair: { binding: recipe.observedSourceRepairBinding, facts },
    proposerBatches: { binding: recipe.proposerBatchBinding, frozenRoleIds: recipe.proposerBatchFrozenRoleIds },
    uniqueRiskClauseBinding: recipe.uniqueRiskClauseBinding,
    onProgress: row => { if (row.stage === 'section_complete') sections.push(row); },
    runtime: { role(r) {
      if (r.packet.id + '.' + r.roleId === evidence.rejected.roleRef.id) { request = r; fail('TERRAN_PROPOSER_DIAGNOSIS_CAPTURED'); }
      return wrapped.role(r);
    } } }), { code: 'TERRAN_PROPOSER_DIAGNOSIS_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
assert.equal(sections.length, 6);
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy, proposerBatchBinding: recipe.proposerBatchBinding });
assert.deepEqual(prepared.roleRef, evidence.rejected.roleRef);
assert.deepEqual(prepared.contextManifestRef, evidence.rejected.contextManifestRef);
const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation',
  roleRef: prepared.roleRef, contextManifestRef: prepared.contextManifestRef, outputContractRef: prepared.outputContractRef,
  executionPolicyRef: prepared.executionPolicyRef, continuationRef: null,
  contextPayloadHash: hash({ instructions: prepared.instructions, input: prepared.payload }),
  capabilityReceiptHash: receipt.capabilityReceiptHash, trainingTruth: false };
assert.equal(hash(invocation), evidence.issue.invocationHash);
assert.deepEqual(validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, evidence.rejected.providerValue).issues,
  [{ path: '$.uncertainties', code: 'array_too_long', actualItems: 3, minItems: 0, maxItems: 2 }]);
const report = seal({ passed: true, originRunId: runId, originAttemptId: attemptId, request,
  originalReceiptHash: receipt.receiptHash, rejectedCandidateHash: evidence.rejected.hash,
  actualRequestRebuilt: true, sourceWorkflowChaptersReplayed: sections.length, replayProof,
  providerCalls: 0, actualDshSessions: 0, semanticAcceptance: false, productionRecovered: false, trainingTruth: false });
await writeFile(base + 'terran-proposer-auxiliary-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, chaptersReplayed: sections.length, providerCalls: 0, hash: report.hash }));
