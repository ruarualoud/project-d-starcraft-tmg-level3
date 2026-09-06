import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';

export function inspectFactionContinuationV1({ filename, parentRunId, parent, parentReport, next, normalizationMigration, correctionMigration, fieldRepairMigration }) {
  [parent, parentReport, next].forEach(verifySeal);
  if (parent.version !== 'faction_strategy_production_v1' || parentRunId !== 'faction-v1-' + parent.hash.slice(0, 20)
    || parentReport.runId !== parentRunId || parentReport.recipeHash !== parent.hash || !parentReport.failure) fail('FACTION_CONTINUATION_PARENT_INVALID');
  const strip = r => { const { hash: ignored, codeHashes, workflowReadinessHash, dshContextReadinessHash, mainReadinessHash, jsonRecoveryReadinessHash,
    targetedCorrectionsReadinessHash, knownRulePolicyHashes, fieldRepairBinding, continuation, ...body } = r; return body; };
  if (hash(strip(parent)) !== hash(strip(next))) fail('FACTION_CONTINUATION_CONTRACT_DRIFT');
  const allowed = new Set(['packages/skill-production-v3/faction-strategy-workflow-v1.mjs',
    'packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs']);
  let fieldRepairProof = null;
  if (parent.fieldRepairBinding && hash(parent.fieldRepairBinding) !== hash(next.fieldRepairBinding || null))
    fail('FACTION_CONTINUATION_FIELD_REPAIR_DRIFT');
  if (next.fieldRepairBinding) {
    const { binding, readiness } = fieldRepairMigration || {};
    if (!binding || !readiness) fail('FACTION_FIELD_REPAIR_MIGRATION_PROOF_MISSING');
    [binding, readiness, next.fieldRepairBinding].forEach(verifySeal);
    const files = ['packages/skill-production-v3/faction-field-repair-seed-v1.mjs',
      'packages/skill-production-v3/faction-field-repair-v1.mjs', 'packages/skill-evaluation/faction-field-repair-evidence-v1.mjs',
      'packages/skill-evaluation/faction-semantic-debt-v1.mjs', 'packages/skill-evaluation/read-only-production-replay-v1.mjs'];
    if (binding.hash !== next.fieldRepairBinding.hash || !next.inputHashes.includes(binding.inputHash)
      || !readiness.passed || readiness.bindingHash !== binding.hash || readiness.evidenceHash !== binding.evidenceHash
      || !readiness.actualRepairReapplied || !readiness.freshReviewRequired || !readiness.freshNegativeRetained
      || binding.semanticAcceptanceInherited !== false
      || [...files, 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'].some(file =>
        !next.codeHashes.find(r => r.file === file) || next.codeHashes.find(r => r.file === file)?.hash !== readiness.codeHashes.find(r => r.file === file)?.hash))
      fail('FACTION_FIELD_REPAIR_MIGRATION_PROOF_INVALID');
    files.forEach(file => allowed.add(file));
    fieldRepairProof = { bindingHash: binding.hash, readinessHash: readiness.hash,
      evidenceHash: binding.evidenceHash, policy: 'exact_actual_patch_after_reproduced_parent_draft_then_fresh_whole_section_review' };
  }
  const correctionFiles = ['packages/skill-production-v3/faction-review-targets-v1.mjs',
    'packages/skill-production-v3/faction-known-rule-findings-v1.mjs', 'packages/skill-production-v3/faction-source-scope-adjudication-v1.mjs',
    'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs'];
  let correctionProof = null;
  if (parent.knownRulePolicyHashes && hash(parent.knownRulePolicyHashes) !== hash(next.knownRulePolicyHashes || null)) fail('FACTION_CONTINUATION_KNOWN_RULE_POLICY_DRIFT');
  if (next.knownRulePolicyHashes || parent.targetedCorrectionsReadinessHash || next.targetedCorrectionsReadinessHash) {
    if (!correctionMigration) fail('FACTION_CORRECTION_MIGRATION_PROOF_MISSING');
    verifySeal(correctionMigration);
    if (!correctionMigration.passed || correctionMigration.hash !== next.targetedCorrectionsReadinessHash
      || !correctionMigration.actualShiftedQuotesRejected || !correctionMigration.rawHistoricalFailurePreserved
      || hash(correctionMigration.inputHashes) !== hash(next.inputHashes)
      || hash(correctionMigration.policyHashes) !== hash(next.knownRulePolicyHashes || null)
      || [...correctionFiles, 'packages/skill-production-v3/faction-strategy-workflow-v1.mjs'].some(file =>
        !next.codeHashes.find(r => r.file === file) || next.codeHashes.find(r => r.file === file)?.hash !== correctionMigration.codeHashes.find(r => r.file === file)?.hash)) fail('FACTION_CORRECTION_MIGRATION_PROOF_INVALID');
    correctionFiles.forEach(file => allowed.add(file));
    correctionProof = { readinessHash: correctionMigration.hash, policyHashes: next.knownRulePolicyHashes,
      priorPolicyHashes: parent.knownRulePolicyHashes || null, policy: 'known_kernel_fact_and_explicit_review_target_binding_no_source_or_budget_change' };
  }
  let migrationProof = null;
  if (parent.mainReadinessHash !== next.mainReadinessHash || parent.jsonRecoveryReadinessHash !== next.jsonRecoveryReadinessHash) {
    const { before, after, recovery } = normalizationMigration || {};
    if (!before || !after || !recovery) fail('FACTION_NORMALIZATION_MIGRATION_PROOF_MISSING');
    [before, after, recovery].forEach(verifySeal);
    if (before.hash !== parent.mainReadinessHash || after.hash !== next.mainReadinessHash || recovery.hash !== next.jsonRecoveryReadinessHash
      || !before.passed || !after.passed || !recovery.passed || recovery.policy !== 'redundant_array_object_closers_v1'
      || before.catalogueHash !== after.catalogueHash || hash(before.dshBinding) !== hash(after.dshBinding)) fail('FACTION_NORMALIZATION_MIGRATION_PROOF_INVALID');
    const providerFiles = ['packages/secure-provider-runtime/provider-response-outcome-v1.mjs',
      'packages/secure-provider-runtime/provider-egress-transport-v1.mjs', 'packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs'];
    const migrationAllowed = new Set([...providerFiles, 'scripts/verify-ticket-17-production-redesign-v1.mjs']);
    const mainChanges = [...new Set([...before.codeHashes, ...after.codeHashes].map(r => r.file))].filter(file =>
      before.codeHashes.find(r => r.file === file)?.hash !== after.codeHashes.find(r => r.file === file)?.hash);
    if (mainChanges.some(file => !migrationAllowed.has(file)) || providerFiles.some(file =>
      after.codeHashes.find(r => r.file === file)?.hash !== recovery.codeHashes.find(r => r.file === file)?.hash)) fail('FACTION_NORMALIZATION_DEPENDENCY_DRIFT');
    providerFiles.forEach(file => allowed.add(file));
    migrationProof = { policy: recovery.policy, beforeHash: before.hash, afterHash: after.hash, recoveryHash: recovery.hash, changes: mainChanges };
  }
  const changes = [...new Set([...parent.codeHashes, ...next.codeHashes].map(r => r.file))].filter(file =>
    parent.codeHashes.find(r => r.file === file)?.hash !== next.codeHashes.find(r => r.file === file)?.hash);
  if (changes.some(f => !allowed.has(f))) fail('FACTION_CONTINUATION_DEPENDENCY_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parent.hash) fail('FACTION_CONTINUATION_JOURNAL_DRIFT');
    if (db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) fail('FACTION_CONTINUATION_PARENT_RUNNING');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const attempts = db.prepare('SELECT usage,settled,reserve,state,token_reserve FROM attempts WHERE run=?').all(parentRunId);
    const rows = db.prepare("SELECT id,input_hash,artifact FROM steps WHERE run=? AND state='complete'").all(parentRunId)
      .map(r => ({ id: r.id, inputHash: r.input_hash, artifact: verifySeal(JSON.parse(r.artifact)).value }));
    const began = rows.find(r => r.id === 'production-start')?.artifact.began;
    if (!Number.isSafeInteger(began)) fail('FACTION_CONTINUATION_START_MISSING');
    const ancestor = parent.continuation; if (ancestor) verifySeal(ancestor);
    const accounting = { calls: (ancestor?.accounting.calls || 0) + attempts.length,
      costMicros: (ancestor?.accounting.costMicros || 0) + attempts.reduce((n, r) => n + (r.settled ?? r.reserve), 0),
      tokens: (ancestor?.accounting.tokens || 0) + attempts.reduce((n, r) => n + (r.usage ? verifySeal(JSON.parse(r.usage)).value.totalUnits : r.state === 'not_sent' ? 0 : r.token_reserve), 0) };
    if (accounting.calls >= next.limits.maxCalls || accounting.costMicros >= next.limits.maxCostMicros
      || accounting.tokens >= next.limits.maxTokens) fail('FACTION_CONTINUATION_BUDGET_EXHAUSTED');
    // Reuse paid raw role outputs only. Candidate/review decisions and typed
    // issue journals are reconstructed under the current validators.
    const steps = rows.filter(r => r.artifact?.roleId === r.id && r.artifact?.loop?.transcript);
    const manifest = seal({ parentRunId, parentRecipeHash: parent.hash, nextBaseRecipeHash: next.hash,
      parentStart: began, accounting, changes, ...(migrationProof ? { normalizationMigration: migrationProof } : {}),
      ...(correctionProof ? { correctionMigration: correctionProof } : {}),
      ...(fieldRepairProof ? { fieldRepairMigration: fieldRepairProof } : {}),
      reusable: steps.map(r => ({ id: r.id, inputHash: r.inputHash, artifactHash: hash(r.artifact) })),
      policy: 'exact_input_raw_roles_only_no_attempt_copy_no_acceptance_inheritance', trainingTruth: false });
    return { manifest, steps };
  } finally { db.close(); }
}
