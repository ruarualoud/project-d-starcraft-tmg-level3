import { seal, verifySeal, hash, clone, fail } from '../skill-production/common.mjs';

const original = Object.freeze({ maxCalls: 400, maxCostMicros: 20_000_000, maxTokens: 60_000_000,
  maxWallMs: 8 * 60 * 60 * 1000, maxInputBytes: 1_000_000, maxRevisions: 3 });
const expanded = Object.freeze({ ...original, maxCalls: 800, maxCostMicros: 35_000_000,
  maxTokens: 180_000_000, maxWallMs: 24 * 60 * 60 * 1000 });

// One named, bounded extension for the already-authorized complete two-faction
// production. This cannot reset the journal clock, prior usage, or per-role
// safety limits. The continuation inspector still derives those from SQLite.
export function createFactionBudgetExtensionV1(parent) {
  verifySeal(parent);
  if (parent.budgetExtension || hash(parent.limits) !== hash(original)) fail('FACTION_BUDGET_EXTENSION_PARENT_INVALID');
  return seal({ version: 'faction_first_two_budget_extension_v1', parentRecipeHash: parent.hash,
    priorLimits: clone(original), nextLimits: clone(expanded), scope: 'two_complete_source_bound_faction_candidates',
    reason: 'Remaining full-context generation and correction exceed the original token/time allocation.',
    authority: 'user_authorized_first_five_production_with_cumulative_cny100_notifications',
    originalClockPreserved: true, allPriorAccountingPreserved: true, perRoleLimitsUnchanged: true,
    paymentRequiredStopsAllWork: true, cny100NotificationStillRequired: true, trainingTruth: false });
}

export function validateFactionBudgetExtensionV1({ parent, next }) {
  [parent, next].forEach(verifySeal);
  if (!next.budgetExtension) {
    if (parent.budgetExtension || hash(parent.limits) !== hash(next.limits)) fail('FACTION_BUDGET_EXTENSION_REQUIRED');
    return null;
  }
  const extension = verifySeal(next.budgetExtension);
  if (parent.budgetExtension) {
    verifySeal(parent.budgetExtension);
    if (extension.hash !== parent.budgetExtension.hash || hash(parent.limits) !== hash(expanded))
      fail('FACTION_BUDGET_EXTENSION_IMMUTABLE');
  } else if (createFactionBudgetExtensionV1(parent).hash !== extension.hash) fail('FACTION_BUDGET_EXTENSION_INVALID');
  if (hash(next.limits) !== hash(expanded) || hash(extension.priorLimits) !== hash(original)
    || hash(extension.nextLimits) !== hash(expanded)) fail('FACTION_BUDGET_EXTENSION_LIMIT_DRIFT');
  return seal({ extensionHash: extension.hash, priorLimitsHash: hash(original), nextLimitsHash: hash(expanded),
    originalClockPreserved: true, allPriorAccountingPreserved: true, perRoleLimitsUnchanged: true, trainingTruth: false });
}
