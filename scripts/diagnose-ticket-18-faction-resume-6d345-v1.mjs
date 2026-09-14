import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256, fail } from '../packages/skill-production/common.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { inspectFactionWireKeyHelperV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { decodeOpeningFenceV1 } from '../packages/structured-generation/adapters/opening-fence-recovery-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { FACTION_REVIEW_FRAGMENT_CONTRACTS_V1 } from '../content/skill-generation/ticket-18-faction-review-fragment-contracts-v1.mjs';
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
import { resolveFactionReviewCoverageAddressesV4, FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 } from '../packages/skill-production-v3/faction-review-coverage-address-v4.mjs';

// Actual terminated-run diagnosis only. No Provider, production writes, recovery
// publication, current-code acceptance migration, or plaintext wire logging.
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-6d345a142fa24636bab7';
const terranId = 'structured-cf543e3f34ea6ee7e94966ddf63814727db2a0cfc46a77b0';
const zergId = 'structured-cf21c5c2213bc1114903808f866c4d4936e1987320cd5dea';
const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
const assertStopped = () => {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(runId).n, 0);
  assert.equal(db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(runId).n, 0);
};
const attempts = () => db.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(runId);
let report;
try {
  assertStopped();
  const originalAttemptsHash = hash(attempts());
  const step = id => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, id).artifact)).value;
  const issue = verifySeal(step(terranId + '.wire-issue-v2'));
  const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, terranId);
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const { receiptHash, ...receiptBody } = receipt;
  assert.equal(hash(receiptBody), receiptHash);
  assert.equal(issue.originalProviderReceiptHash, receiptHash);
  assert.equal(issue.rawPayloadPersisted, true);
  assert.equal(issue.class, 'wire_syntax');
  assert.equal(receipt.status, 200); assert.equal(receipt.incompleteReason, null);
  assert.equal(attempt.state, 'failed');
  const helper = await inspectFactionWireKeyHelperV2();
  const keyProvider = await createMacOsRawQuarantineKeyProviderV1({
    helperPath: base + 'raw-quarantine-key-helper-v1/raw-quarantine-keychain-v1', helperHash: helper.helperHash });
  const quarantine = await createEncryptedRawQuarantineV1({ directory: base + runId + '/encrypted-wire-v2', keyProvider });
  const accessed = await quarantine.locate(issue.rawBinding, raw => {
    const decoded = decodeOpeningFenceV1(raw.toString('utf8'));
    const contract = FACTION_REVIEW_FRAGMENT_CONTRACTS_V1.target;
    assert.equal(issue.outputContractRef.hash, contract.contractHash);
    const validation = validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, decoded.value);
    assert.equal(validation.ok, true);
    assert.equal(decoded.receipt.originalTextHash, receipt.outputTextHash);
    assert.equal(decoded.receipt.visibleScalarEdits, 0);
    assert.equal(decoded.receipt.appendedCharacters, 0);
    return { bytes: raw.length, normalization: decoded.receipt, valueHash: hash(decoded.value),
      contractHash: contract.contractHash, schemaValid: true, verdict: decoded.value.verdict,
      focusCount: decoded.value.focusPaths.length, sourceCount: decoded.value.sourceSlots.length,
      recoveredValuePersisted: false, productionRecoveryApplied: false };
  });
  console.log(JSON.stringify({ event: 'actual-terran-wire-decoded', schemaValid: true, providerCalls: 0 }));

  const recipe = await json(runId + '/recipe'), input = await json(runId + '/zerg_swarm-input');
  const knownRulePolicy = await json('zerg_swarm-known-rule-policy'), ancestors = [];
  let parent = recipe.continuation?.parentRunId;
  while (parent) { const r = await json(parent + '/recipe'); ancestors.push(r); parent = r.continuation?.parentRunId; }
  const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId, attemptId: zergId });
  const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
  const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
  const facts = createFactionObservedRosterFactsV1({ input, dataset });
  const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
  let request, replayProof; const completed = [];
  try {
    const forbidden = () => fail('ACTUAL_RESUME_DIAGNOSIS_EGRESS_FORBIDDEN');
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
      zergUnitTimingBinding: recipe.zergUnitTimingBinding,
      onProgress: row => { if (row.stage === 'section_complete') {
        completed.push(row); console.log(JSON.stringify({ event: 'chapter-rebuilt', completed: completed.length }));
      } },
      runtime: { role(r) {
        if (r.roleId.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '') ===
          'faction.zerg_swarm.unit_roles.1.review-target-batch-v1.supportive.1.4') {
          request = r; fail('ACTUAL_RESUME_DIAGNOSIS_CAPTURED');
        }
        return wrapped.role(r);
      } } }), { code: 'ACTUAL_RESUME_DIAGNOSIS_CAPTURED' });
    replayProof = replay.evidence();
  } finally { replay.close(); }
  assert.equal(completed.length, 1);
  const w = request.workspace, candidate = evidence.candidate;
  const targets = w.outputRequestAtEnd.targetContract;
  const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
    reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs, targets,
    roleRef: candidate.roleRef, outputContractRef: candidate.outputContractRef, route: 'supportive', includeSharedScenarioSources: true });
  assert.equal(capsule.hash, candidate.contextManifestRef.hash);
  const coverage = candidate.providerValue.coverage.map(r => ({ sourceRef: w.coverageRequiredSourceRefs[r.coverageSlot],
    verdict: r.verdict, recommendationIndices: r.recommendationIndices, reason: r.reason }));
  const args = { coverage, targets, draft: w.draft, binding: FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V4 };
  for (let i = 0; i < 2; i++) assert.throws(() => resolveFactionReviewCoverageAddressesV4(args),
    { code: 'FACTION_REVIEW_COVERAGE_EXPLICIT_SLOT_UNRESOLVED' });
  assert.equal(targets.targets[1].index, 5);
  assert.equal(coverage.length, 2);
  const identity = coverage.map(row => {
    assert.deepEqual(row.recommendationIndices, [1]);
    assert(row.reason.includes('recommendation index 5 (target slot 1)'));
    assert(targets.targets[1].recommendation.sourceRefs.includes(row.sourceRef));
    assert(!row.reason.includes('(' + row.sourceRef + ')'));
    return { sourceRef: row.sourceRef, localSlot: 1, explicitGlobalIndex: 5,
      targetId: targets.targets[1].targetId, recommendationHash: targets.targets[1].recommendationHash,
      sameSourceInWholeRecommendation: true, literalSourceRefAbsentFromReason: true };
  });
  // Counterfactual probe only: never save these edited reasons as production
  // reviews. It isolates the V4 literal-source requirement from identity drift.
  const probe = resolveFactionReviewCoverageAddressesV4({ ...args,
    coverage: coverage.map(row => ({ ...row, reason: row.reason + ' (' + row.sourceRef + ')' })) });
  assert.deepEqual(probe.coverage.map(row => row.recommendationIndices), [[5], [5]]);
  assertStopped(); assert.equal(hash(attempts()), originalAttemptsHash);
  report = seal({ version: 'faction_actual_resume_diagnosis_v1', runId, passed: true,
    terran: { attemptId: terranId, issueHash: issue.hash, originalReceiptHash: receiptHash,
      accessReceiptHash: accessed.accessReceipt.hash, ...accessed.value },
    zerg: { attemptId: zergId, originalCandidateHash: candidate.hash, originalReceiptHash: candidate.providerReceiptHash,
      inputHash: input.hash, request, capsuleHash: capsule.hash, actualContextRebuilt: true,
      originalCoverage: coverage, identity, priorFailureReproducedTwice: true,
      literalSourceCounterfactualIsNotProductionRepair: true, productionRecoveryApplied: false, replayProof },
    originalAttemptsUnchanged: true, originalAttemptsHash, providerCalls: 0, actualDshSessions: 0,
    plaintextWireLogged: false, plaintextWirePersisted: false, sourceRefreshPerformed: false,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
    codeHash: sha256(await readFile(import.meta.filename)) });
} finally { db.close(); }
const output = base + runId + '/actual-resume-diagnosis-' + report.hash.slice(0, 20) + '.json';
await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ passed: true, hash: report.hash, output, providerCalls: 0,
  terranFormatRecoverable: true, zergFailureReproduced: true, productionRecoveryApplied: false }));
