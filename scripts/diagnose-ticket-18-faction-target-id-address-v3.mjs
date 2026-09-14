import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';
import { createFactionReviewTransactionRuntimeV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createFactionReviewContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { verifySeal, seal, sha256, fail } from '../packages/skill-production/common.mjs';
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-8a5389823de46cf062ae';
const suffix = 'faction.terran_armed_forces.card_packages.1.review-target-batch-v1.adversarial.1.2';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const recipe = await json(base + runId + '/recipe.json'), input = await json(base + 'terran_armed_forces-input.json');
const db = new DatabaseSync(filename, { readOnly: true }); let evidence;
try {
  const rows = db.prepare("SELECT id FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.roleRef.id')=?")
    .all(runId, suffix).filter(r => r.id.endsWith('.candidate'));
  assert.equal(rows.length, 1);
  evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId, attemptId: rows[0].id.slice(0, -'.candidate'.length) });
} finally { db.close(); }
const ancestors = []; let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await json(base + parent + '/recipe.json'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const fieldRepairSeed = await inspectFactionFieldRepairEvidenceV1({ root, runId: recipe.fieldRepairBinding.runId });
const phaseFieldSeed = await inspectFactionPhaseFieldEvidenceV1({ root, runId: recipe.phaseFieldBinding.runId });
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof; const completed = [];
try {
  const forbidden = () => fail('TARGET_ADDRESS_DIAGNOSIS_NO_PROVIDER_OR_DSH');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  const captured = { role(r) {
    if (r.roleId.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '') === suffix) {
      request = r; fail('TARGET_ADDRESS_DIAGNOSIS_REQUEST_CAPTURED'); }
    return stack.runtime.role(r);
  } };
  const wrapped = createFactionReviewTransactionRuntimeV1({ input, runtime: captured, store: replay.store, phaseFieldSeed });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed, phaseFieldSeed, runtime: wrapped,
    store: replay.store, registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    onProgress: row => { if (row.stage === 'section_complete') { completed.push(row);
      console.log(JSON.stringify({ event: 'chapter-rebuilt', completed: completed.length })); } } }),
  { code: 'TARGET_ADDRESS_DIAGNOSIS_REQUEST_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
assert.equal(completed.length, 5);
const w = request.workspace;
const capsule = createFactionReviewContextCapsuleV1({ factionInput: input, section: w.section, draft: w.draft,
  reviewIndices: w.reviewIndices, coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
  targets: w.outputRequestAtEnd.targetContract, roleRef: evidence.candidate.roleRef,
  outputContractRef: evidence.candidate.outputContractRef, route: 'adversarial', includeSharedScenarioSources: true });
assert.equal(capsule.hash, evidence.candidate.contextManifestRef.hash);
const report = seal({ passed: true, originRunId: runId, originAttemptId: evidence.attempt.id,
  originalReceiptHash: evidence.candidate.providerReceiptHash, originalCandidateHash: evidence.candidate.hash,
  inputHash: input.hash, request, capsuleHash: capsule.hash, actualContextRebuilt: true,
  replayProof, sourceReviewedChaptersRebuilt: 5, providerCalls: 0, actualDshSessions: 0, trainingTruth: false,
  codeHashes: [{ file: 'scripts/diagnose-ticket-18-faction-target-id-address-v3.mjs', hash: sha256(await readFile(import.meta.filename)) }] });
await writeFile(base + 'target-id-address-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, chaptersRebuilt: 5, providerCalls: 0, hash: report.hash }));
