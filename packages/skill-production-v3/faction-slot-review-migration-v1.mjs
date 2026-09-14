import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { assertFactionSlotReviewRecipeV1, FACTION_SLOT_REVIEW_RECIPE_FIELDS_V1 as fields } from './faction-slot-review-environment-v1.mjs';

export function validateFactionSlotReviewMigrationV1({ parentRunId, parent, next, readiness, environment }) {
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness || environment) fail('FACTION_SLOT_REVIEW_MIGRATION_UNSCOPED');
    return null;
  }
  [parent, next, readiness].forEach(verifySeal);
  if (!assertFactionSlotReviewRecipeV1(next)
    || readiness.version !== 'faction_slot_review_wiring_readiness_v1' || !readiness.passed
    || readiness.providerCalls !== 0 || !readiness.actualPaidOwnerReread
    || !readiness.ancestorContractRoutingPassed || !readiness.dryRuntimeRoutingPassed
    || !readiness.sqliteAndIndependentDshProofPassed || !readiness.mainParametersBound
    || !readiness.coldReplayParametersBound || next.slotReviewReadinessHash !== readiness.hash
    || !environment || environment.recipeFields.slotReviewReadinessHash !== readiness.runtimeProofHash
    || !environment.lineage.recipes.some(r => r.runId === readiness.originRunId)
    || hash(next.inputHashes) !== hash(parent.inputHashes) || !factionLimitsCompatibleV1(parent, next)
    || hash(next.sourceBinding) !== hash(parent.sourceBinding) || next.modelHash !== parent.modelHash)
    fail('FACTION_SLOT_REVIEW_MIGRATION_INVALID');
  const inherited = assertFactionSlotReviewRecipeV1(parent);
  if (!inherited && parentRunId !== readiness.originRunId) fail('FACTION_SLOT_REVIEW_FIRST_ACTIVATION_PARENT');
  for (const field of fields.filter(f => f !== 'slotReviewReadinessHash'))
    if (hash(next[field]) !== hash(environment.recipeFields[field])
      || hash(next[field]) !== hash(readiness.recipeFields[field])
      || inherited && hash(parent[field]) !== hash(next[field])) fail('FACTION_SLOT_REVIEW_MIGRATION_ROUTE_DRIFT');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_SLOT_REVIEW_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_slot_review_migration_v1', parentRunId, readinessHash: readiness.hash,
    runtimeProofHash: readiness.runtimeProofHash, lineageHash: environment.lineage.hash,
    oldRolesFrozen: next.slotReviewLegacyRoleIds.length, origins: next.slotReviewRecoveryOrigins,
    files: readiness.codeHashes.map(row => row.file), originalAttemptsCopied: 0,
    accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false });
}
