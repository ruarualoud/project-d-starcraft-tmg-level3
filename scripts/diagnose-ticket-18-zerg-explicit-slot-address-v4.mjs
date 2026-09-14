import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
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
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-3241bb0aff2eda69e7c9';
const attemptId = 'structured-686b1584cab5543e1679878a7917529d4141f00aabd67730';
const suffix = 'faction.zerg_swarm.unit_roles.1.review-target-batch-v1.adversarial.0.2';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read(runId + '/recipe'), input = await read(runId + '/zerg_swarm-input');
const knownRulePolicy = await read('zerg_swarm-known-rule-policy'), ancestors = [];
let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(parent + '/recipe'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId, attemptId });
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const facts = createFactionObservedRosterFactsV1({ input, dataset });
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof; const sections = [];
try {
  const forbidden = () => fail('EXPLICIT_SLOT_DIAGNOSIS_EGRESS_FORBIDDEN');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  const wrapped = createFactionReviewTransactionRuntimeV1({ input, phaseFieldSeed: null, store: replay.store,
    runtime: stack.runtime, draftEnvelopeBinding: recipe.draftEnvelopeBinding });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, store: replay.store,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
    observedSourceRepair: { binding: recipe.observedSourceRepairBinding, facts },
    proposerBatches: { binding: recipe.proposerBatchBinding, frozenRoleIds: recipe.proposerBatchFrozenRoleIds,
      auxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding }, uniqueRiskClauseBinding: recipe.uniqueRiskClauseBinding,
    draftEnvelopeBinding: recipe.draftEnvelopeBinding, initialSourceCorrectionBinding: recipe.initialSourceCorrectionBinding,
    onProgress: row => { if (row.stage === 'section_complete') { sections.push(row); console.log(JSON.stringify({ event: 'chapter-rebuilt', completed: sections.length })); } },
    runtime: { role(r) {
      if (r.roleId.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '') === suffix) {
        request = r; fail('EXPLICIT_SLOT_DIAGNOSIS_CAPTURED');
      }
      return wrapped.role(r);
    } } }), { code: 'EXPLICIT_SLOT_DIAGNOSIS_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
assert.equal(sections.length, 1);
const w = request.workspace;
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
  reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
  targets: w.outputRequestAtEnd.targetContract, roleRef: evidence.candidate.roleRef,
  outputContractRef: evidence.candidate.outputContractRef, route: 'adversarial', includeSharedScenarioSources: true });
assert.equal(capsule.hash, evidence.candidate.contextManifestRef.hash);
const response = verifySeal(JSON.parse(evidence.attempt.response)).value;
assert.equal(response.output.coverage[0].recommendationIndices[0], 0);
assert(response.output.coverage[0].reason.includes('(target slot 0)'));
assert.equal(w.outputRequestAtEnd.targetContract.targets[0].index, 2);
assert(w.outputRequestAtEnd.targetContract.targets[0].recommendation.sourceRefs.includes('source:army_units:queen'));
const report = seal({ version: 'zerg_explicit_slot_address_diagnosis_v4', passed: true,
  originRunId: runId, originAttemptId: attemptId, inputHash: input.hash, request,
  originalCandidateHash: evidence.candidate.hash, originalReceiptHash: evidence.candidate.providerReceiptHash,
  capsuleHash: capsule.hash, actualContextRebuilt: true, sourceWorkflowChaptersReplayed: sections.length,
  originalCoverage: response.output.coverage, targetContractHash: w.outputRequestAtEnd.targetContract.hash,
  coordinateEvidence: { explicitDeclaredLocalSlot: 0, expectedGlobalIndex: 2, sourceRef: 'source:army_units:queen' },
  replayProof, providerCalls: 0, actualDshSessions: 0, productionRecovered: false,
  semanticAcceptance: false, trainingTruth: false, codeHash: sha256(await readFile(import.meta.filename)) });
await writeFile(base + 'zerg-explicit-slot-address-diagnosis-v4.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, sourceChaptersReplayed: sections.length, providerCalls: 0,
  productionRecovered: false, hash: report.hash }));
