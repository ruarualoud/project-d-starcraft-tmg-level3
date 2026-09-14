import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1, validateTargetedFactionReviewV1,
  planFactionReviewFieldBindingV1, applyFactionReviewFieldBindingV1 }
  from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const runId = 'faction-v1-6932f5293fbebddd4885';
const db = new DatabaseSync(filename, { readOnly: true });
const readStep = (run, id) => verifySeal(JSON.parse(db.prepare(
  "SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(run, id).artifact)).value;
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000,
  attemptTokenReserve: 500000, allowDefinitelyNotSentRetry: false,
  allowOneCapacityRetry: false, idempotentRetrySupported: false,
  encryptedRawQuarantineAvailable: false };

try {
  const recipe = verifySeal(JSON.parse(await readFile(path.join(base, runId, 'recipe.json'), 'utf8')));
  const terranInput = verifySeal(JSON.parse(await readFile(path.join(base, runId, 'terran_armed_forces-input.json'), 'utf8')));
  const terranCanonical = 'faction.terran_armed_forces.card_packages.2.review-target-batch-v1.adversarial.1.0';
  const transaction = recipe.reviewTransactionBindings.find(row => row.inputHash === terranInput.hash);
  verifySeal(transaction);
  const terranPhysical = 'faction.terran_armed_forces.' + terranCanonical
    + '.source-evidence-v1.' + transaction.hash.slice(0, 20);
  const cached = readStep(runId, terranPhysical);
  const origin = recipe.structuralJsonReviewOrigins.find(row => row.attemptId
    === 'structured-3fb732741000eb689d87beae61a16b023514d752423ac351');
  const originIssue = readStep(origin.runId, origin.attemptId + '.wire-issue-v2');
  assert.equal(cached.roleId, terranPhysical);
  assert.equal(originIssue.invocation.roleRef.id, terranCanonical);
  assert.equal(cached.initialContextCapsuleHash, originIssue.invocation.contextManifestRef.hash);
  assert.equal(cached.contextCapsuleHash, cached.initialContextCapsuleHash);
  assert.equal(cached.protocol, undefined);
  assert.equal(cached.parsedReviewValues.length, 1);
  assert.equal(cached.parsedReviewValues[0].version, 'faction_parsed_review_value_v1');
  const terranDiagnosis = seal({ version: 'faction_review_recovery_protocol_arbitration_diagnosis_v1',
    runId, canonicalRoleId: terranCanonical, physicalRoleId: terranPhysical,
    roleIdentityAligned: true, initialContextAligned: true,
    existingArtifactOwnerProtocol: cached.parsedReviewValues[0].version,
    incorrectlyClaimingOuterProtocol: 'faction_structural_json_review_v1',
    structuralOriginAttemptId: origin.attemptId,
    failureClass: 'cached_artifact_protocol_owner_precedence',
    safeRepair: 'delegate_non_owned_cached_artifact_to_inner_protocol_verifier',
    unknownProtocolAccepted: false, semanticAcceptanceInherited: false, trainingTruth: false });

  const zergInput = verifySeal(JSON.parse(await readFile(path.join(base, runId, 'zerg_swarm-input.json'), 'utf8')));
  const zergPrefix = 'faction.zerg_swarm.faction.zerg_swarm.phase_tempo.1.';
  const initial = structuredClone(readStep(runId, 'faction.zerg_swarm.phase_tempo.1.known-rule-correction').draft);
  const editor0 = readStep(runId, zergPrefix + 'editor.0.0.source-evidence-v1.3cd990702ff2ba8b4acc');
  const editor1 = readStep(runId, zergPrefix + 'editor.1.0.source-evidence-v1.3cd990702ff2ba8b4acc');
  const envelope0 = readStep(runId, zergPrefix + 'editor.0.0.source-evidence-v1.3cd990702ff2ba8b4acc.patch-envelope-v1');
  const envelope1 = readStep(runId, zergPrefix + 'editor.1.0.source-evidence-v1.3cd990702ff2ba8b4acc.patch-envelope-v1');
  assert.equal(hash(initial), envelope0.normalization.parentHash);
  initial.recommendations[envelope0.normalization.materializedIndex] = structuredClone(editor0.output);
  assert.equal(hash(initial), envelope1.normalization.parentHash);
  initial.recommendations[envelope1.normalization.materializedIndex] = structuredClone(editor1.output);
  const draft = initial;
  const section = createFactionWritingPlanV1(zergInput).sections.find(row => row.id === 'faction.zerg_swarm.phase_tempo.1');
  const reviewIndices = [4, 5], requiredSourceRefs = [];
  const targets = createFactionReviewTargetsV1({ input: zergInput, section, draft, indices: reviewIndices });
  const failedAttemptId = 'structured-83d947cc9a667b6ee292a4e72a2349ee502c260f9afcd3b9';
  const rejected = readStep(runId, failedAttemptId + '.rejected-candidate');
  const transactionZerg = recipe.reviewTransactionBindings.find(row => row.inputHash === zergInput.hash);
  verifySeal(transactionZerg);
  const roleId = rejected.roleRef.id + '.source-evidence-v1.' + transactionZerg.hash.slice(0, 20);
  const packet = seal({ id: 'faction.zerg_swarm', inputHash: zergInput.hash, sourceBinding: zergInput.sourceBinding });
  const request = { packet, roleId, workspace: { inputHash: zergInput.hash, section, draft,
    reviewIndices, coverageRequiredSourceRefs: requiredSourceRefs,
    outputRequestAtEnd: { targetContract: targets } } };
  const prepared = prepareFactionSlotReviewRoleV1({ input: zergInput, request, executionPolicy });
  assert.equal(prepared.capsule.hash, rejected.contextManifestRef.hash);
  const completedProviderOutput = { ...structuredClone(rejected.providerValue), coverage: [] };
  const available = new Map(prepared.capsule.localIssue.reviewTask.sourceCatalogue
    .filter(row => row.includedAs !== 'not_in_current_faction_scope').map(row => [row.slot, row.ref]));
  const hostOutput = { verdicts: completedProviderOutput.verdicts.map(row => {
    const target = targets.targets[row.targetSlot];
    return { targetId: target.targetId, title: target.title, focus: structuredClone(row.focus),
      verdict: row.verdict, reason: row.reason, sourceRefs: row.sourceSlots.map(slot => available.get(slot)) };
  }), coverage: [] };
  let strictFailure = null;
  try { validateTargetedFactionReviewV1(hostOutput, targets); }
  catch (error) { strictFailure = error.code; }
  assert(['FACTION_REVIEW_TARGET_QUOTE_REQUIRED', 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH'].includes(strictFailure));
  const mismatch = hostOutput.verdicts.flatMap(verdict => {
    const target = targets.targets.find(row => row.targetId === verdict.targetId);
    return verdict.focus.flatMap(focus => {
      const field = target.fields.find(row => row.path === focus.path);
      return field && !field.text.includes(focus.quote)
        ? [{ targetId: verdict.targetId, path: focus.path, originalQuote: focus.quote,
          hostFieldText: field.text, quoteHash: hash(focus.quote), hostFieldHash: hash(field.text) }] : [];
    });
  });
  assert(mismatch.length > 0);
  const plan = planFactionReviewFieldBindingV1(hostOutput, targets);
  const selection = { selections: hostOutput.verdicts.map(row => ({ targetId: row.targetId,
    fieldPaths: [...new Set(row.focus.map(focus => focus.path))] })) };
  const rebound = applyFactionReviewFieldBindingV1(hostOutput, targets, plan, selection);
  const reboundById = new Map(rebound.output.verdicts.map(row => [row.targetId, row.focus]));
  const repairedProviderOutput = { ...completedProviderOutput,
    verdicts: completedProviderOutput.verdicts.map(row => ({ ...row,
      focus: reboundById.get(targets.targets[row.targetSlot].targetId) })) };
  const manuallyRecovered = materializeFactionSlotReviewV1({ ...prepared.mapping, input: zergInput,
    capsule: prepared.capsule, providerOutput: repairedProviderOutput,
    reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
  const recovered = materializeFactionSlotReviewV1({ ...prepared.mapping, input: zergInput,
    capsule: prepared.capsule, providerOutput: completedProviderOutput,
    reviewReasonMaximum: 16384, reviewSourceMaximum: 128 });
  assert.equal(recovered.receipt.version, 'faction_review_explicit_focus_path_materialization_v1');
  assert.equal(hash(recovered.output), hash(manuallyRecovered.output));
  const zergDiagnosis = seal({ version: 'faction_review_explicit_focus_path_diagnosis_v1', runId,
    failedAttemptId, roleId, contextHash: prepared.capsule.hash, strictFailure, mismatch,
    explicitModelPathsValid: true, hostRebindingPassed: true,
    fieldBindingReceipt: rebound.receipt, recoveredReceiptHash: recovered.receipt.hash,
    verdictReasonSourceRefsAndCoverageUnchanged: true, fuzzyTextMatchingUsed: false,
    additionalProviderCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false });
  const report = seal({ version: 'faction_review_recovery_boundaries_diagnosis_v1', passed: true,
    terran: terranDiagnosis, zerg: zergDiagnosis, providerCalls: 0,
    productionRowsModified: 0, semanticAcceptance: false, trainingTruth: false });
  await writeFile(path.join(base, 'review-recovery-boundaries-diagnosis-v1.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, terranFailureClass: terranDiagnosis.failureClass,
    zergStrictFailure: strictFailure, zergMismatchCount: mismatch.length, hash: report.hash }));
} finally { db.close(); }
