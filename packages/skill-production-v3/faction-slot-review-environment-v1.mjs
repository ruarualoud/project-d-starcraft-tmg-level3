import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as binding } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

const canonical = id => String(id).replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '')
  .replace(/\.(?:schema-repair|output-cap-recovery)\.1$/u, '');
const reviewRole = /\.review-target-batch-v1\.(?:supportive|adversarial)\.[0-3](?:\.phase-seed-v1\.[a-f0-9]{20})?\.[0-9]+$/u;
export const FACTION_SLOT_REVIEW_RECIPE_FIELDS_V1 = Object.freeze([
  'reviewSlotNamespaceBinding', 'slotReviewLegacyRoleIds', 'slotReviewRecoveryOrigins', 'slotReviewReadinessHash']);

export function assertFactionSlotReviewRecipeV1(recipe) {
  const fields = FACTION_SLOT_REVIEW_RECIPE_FIELDS_V1;
  if (!fields.some(f => recipe[f] !== undefined)) return false;
  if (fields.some(f => recipe[f] === undefined) || verifySeal(recipe.reviewSlotNamespaceBinding).hash !== binding.hash
    || !/^[a-f0-9]{64}$/u.test(recipe.slotReviewReadinessHash || '')
    || !Array.isArray(recipe.slotReviewLegacyRoleIds) || !Array.isArray(recipe.slotReviewRecoveryOrigins)
    || recipe.slotReviewRecoveryOrigins.length !== 1
    || hash([...new Set(recipe.slotReviewLegacyRoleIds)].sort()) !== hash(recipe.slotReviewLegacyRoleIds)
    || recipe.slotReviewLegacyRoleIds.some(id => !reviewRole.test(id) || canonical(id) !== id))
    fail('FACTION_SLOT_REVIEW_RECIPE_INVALID');
  for (const o of recipe.slotReviewRecoveryOrigins)
    if (!/^faction-v1-[a-f0-9]{20}$/u.test(o.ownerRunId || '')
      || !/^structured-[a-f0-9]{48}$/u.test(o.attemptId || '')
      || ![o.roleRefHash, o.contextHash].every(h => /^[a-f0-9]{64}$/u.test(h || '')))
      fail('FACTION_SLOT_REVIEW_ORIGIN_INVALID');
  return true;
}

// Read-only actual-owner and contract routing. A manifest-only intermediate
// recipe is lineage, not a paid journal. Missing child rows do not erase paid
// ancestor roles. No output or attempt is copied or marked accepted here.
export async function loadFactionSlotReviewEnvironmentV1({ root, filename, parentRunId, readiness }) {
  verifySeal(readiness);
  const recovered = readiness.roles?.filter(row => row.mode === 'legacy_recovery');
  if (!readiness.passed || readiness.version !== 'faction_slot_review_runtime_proof_v1'
    || readiness.bindingHash !== binding.hash || readiness.providerCalls !== 0
    || readiness.actualDshSessions !== 4 || readiness.dshInjectionUsed !== false
    || readiness.outerWorkflowReviewCallbackPassed !== true
    || !readiness.sqliteRestartPassed || !readiness.independentReplayPassed
    || !readiness.originalAttemptsUnchanged || recovered?.length !== 1)
    fail('FACTION_SLOT_REVIEW_RUNTIME_PROOF_REQUIRED');
  const origin = recovered[0].value.slotRecoveryOrigin;
  const recipes = new Map(), capabilities = new Map(), legacy = new Set();
  const db = new DatabaseSync(filename, { readOnly: true });
  const decode = raw => verifySeal(JSON.parse(raw)).value;
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    let id = parentRunId, expected = null;
    while (id) {
      if (!/^faction-v1-[a-f0-9]{20}$/u.test(id) || recipes.has(id) || recipes.size >= 256)
        fail('FACTION_SLOT_REVIEW_LINEAGE_INVALID');
      const recipe = verifySeal(JSON.parse(await readFile(path.join(root,
        'build/ticket-18-faction-production-v1', id, 'recipe.json'), 'utf8')));
      if (id !== 'faction-v1-' + recipe.hash.slice(0, 20) || expected && recipe.hash !== expected)
        fail('FACTION_SLOT_REVIEW_LINEAGE_INVALID');
      const journal = db.prepare('SELECT recipe FROM runs WHERE id=?').get(id);
      if (journal && journal.recipe !== recipe.hash || !journal && !recipe.continuation)
        fail('FACTION_SLOT_REVIEW_JOURNAL_DRIFT');
      recipes.set(id, recipe);
      for (const row of db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(id)) {
        const value = decode(row.artifact);
        if (value.outputContractRef?.hash === STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6.hash) continue;
        if (value.roleId && reviewRole.test(canonical(value.roleId))) legacy.add(canonical(value.roleId));
        const role = canonical(value.roleRef?.id || '');
        const faction = /^faction\.(terran_armed_forces|zerg_swarm)\./u.exec(role)?.[1];
        if (faction && reviewRole.test(role)) legacy.add('faction.' + faction + '.' + role);
      }
      for (const row of db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(id)) {
        const response = decode(row.response);
        if (response?.ok === true && response.capabilityReceipt) {
          const cap = response.capabilityReceipt;
          if (capabilities.has(cap.receiptHash) && hash(capabilities.get(cap.receiptHash)) !== hash(cap))
            fail('FACTION_SLOT_REVIEW_CAPABILITY_DRIFT');
          capabilities.set(cap.receiptHash, cap);
        }
      }
      if (recipe.continuation) {
        verifySeal(recipe.continuation);
        expected = recipe.continuation.parentRecipeHash;
        id = recipe.continuation.parentRunId;
      } else id = null;
    }
    const parent = recipes.get(parentRunId);
    if (!recipes.has(origin.ownerRunId) || !db.prepare('SELECT recipe FROM runs WHERE id=?').get(origin.ownerRunId))
      fail('FACTION_SLOT_REVIEW_PAID_OWNER_NOT_IN_LINEAGE');
    const recipeFields = { reviewSlotNamespaceBinding: binding,
      slotReviewLegacyRoleIds: parent.reviewSlotNamespaceBinding ? parent.slotReviewLegacyRoleIds : [...legacy].sort(),
      slotReviewRecoveryOrigins: [origin], slotReviewReadinessHash: readiness.hash };
    assertFactionSlotReviewRecipeV1(recipeFields);
    if (parent.reviewSlotNamespaceBinding) {
      assertFactionSlotReviewRecipeV1(parent);
      if (hash(parent.slotReviewRecoveryOrigins) !== hash(recipeFields.slotReviewRecoveryOrigins))
        fail('FACTION_SLOT_REVIEW_INHERITED_ORIGIN_DRIFT');
    }
    const readRecoveryEvidence = selected => {
      if (hash(selected) !== hash(origin)) fail('FACTION_SLOT_REVIEW_FOREIGN_ORIGIN');
      const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId: origin.ownerRunId, attemptId: origin.attemptId });
      const paid = verifySeal(JSON.parse(evidence.attempt.response)).value.usageReceipt;
      if (evidence.candidate.hash !== recovered[0].value.structuredCandidateRef.hash
        || evidence.candidate.contextManifestRef.hash !== origin.contextHash
        || evidence.candidate.roleRef.hash !== origin.roleRefHash
        || !capabilities.has(paid.capabilityReceiptHash)) fail('FACTION_SLOT_REVIEW_ACTUAL_EVIDENCE_DRIFT');
      return { ...evidence, ownerRecipe: recipes.get(origin.ownerRunId), capability: capabilities.get(paid.capabilityReceiptHash) };
    };
    readRecoveryEvidence(origin);
    return { recipeFields, readRecoveryEvidence,
      lineage: seal({ parentRunId, recipes: [...recipes].map(([runId, recipe]) => ({ runId, recipeHash: recipe.hash })),
        historicalReviewRoleCount: legacy.size, providerCalls: 0, originalAttemptsCopied: 0, trainingTruth: false }) };
  } finally { db.close(); }
}
