import { seal, verifySeal, hash, clone, fail } from '../skill-production/common.mjs';
import { isFactionBudgetEpochV1, verifyFactionBudgetEpochV1 } from './faction-budget-epoch-v1.mjs';

const original = Object.freeze({ maxCalls: 400, maxCostMicros: 20_000_000, maxTokens: 60_000_000,
  maxWallMs: 8 * 60 * 60 * 1000, maxInputBytes: 1_000_000, maxRevisions: 3 });
const expanded = Object.freeze({ ...original, maxCalls: 800, maxCostMicros: 35_000_000,
  maxTokens: 180_000_000, maxWallMs: 24 * 60 * 60 * 1000 });
const reauthorized = Object.freeze({ ...original, maxCalls: 1_000,
  maxCostMicros: 70_000_000, maxTokens: 360_000_000,
  maxWallMs: 7 * 24 * 60 * 60 * 1000 });
const remainingProduction = Object.freeze({ ...reauthorized, maxCostMicros: 120_000_000 });

export function projectFactionCumulativeCostV1({ historyMicros,
  globalSpentMicros, inheritedCostMicros, currentRunCostMicros,
  chainLimitMicros }) {
  const values = [historyMicros, globalSpentMicros, inheritedCostMicros,
    currentRunCostMicros, chainLimitMicros];
  if (values.some(value => !Number.isSafeInteger(value) || value < 0)
    || inheritedCostMicros + currentRunCostMicros > chainLimitMicros) {
    fail('FACTION_COST_PROJECTION_INVALID');
  }
  const remainingChainMicros = chainLimitMicros - inheritedCostMicros
    - currentRunCostMicros;
  return seal({ version: 'faction_cumulative_cost_projection_v1',
    currentCumulativeMicros: historyMicros + globalSpentMicros,
    remainingChainMicros,
    projectedMaximumCumulativeMicros: historyMicros + globalSpentMicros
      + remainingChainMicros,
    inheritedCostCountedOnce: true, invoice: false, trainingTruth: false });
}

// V1 remains frozen for historical receipts. V2 treats an allocation as an
// observability threshold: crossing it cannot invalidate already-accounted
// production or prevent a user-authorized run from continuing.
export const FACTION_COST_PROJECTION_SOFT_LIMIT_BINDING_V2 = seal({
  version: 'faction_cumulative_cost_projection_v2',
  allocationThresholdIsSoft: true, remainingNeverNegative: true,
  overrunReported: true, accountingReset: false,
  paymentRequiredStillBlocks: true, invoice: false, trainingTruth: false,
});

export function projectFactionCumulativeCostV2({ historyMicros,
  globalSpentMicros, inheritedCostMicros, currentRunCostMicros,
  chainLimitMicros }) {
  const values = [historyMicros, globalSpentMicros, inheritedCostMicros,
    currentRunCostMicros, chainLimitMicros];
  if (values.some(value => !Number.isSafeInteger(value) || value < 0))
    fail('FACTION_COST_PROJECTION_INVALID');
  const allocatedMicros = inheritedCostMicros + currentRunCostMicros;
  const overrunMicros = Math.max(0, allocatedMicros - chainLimitMicros);
  const remainingChainMicros = Math.max(0, chainLimitMicros - allocatedMicros);
  const currentCumulativeMicros = historyMicros + globalSpentMicros;
  return seal({ version: FACTION_COST_PROJECTION_SOFT_LIMIT_BINDING_V2.version,
    bindingHash: FACTION_COST_PROJECTION_SOFT_LIMIT_BINDING_V2.hash,
    currentCumulativeMicros, chainLimitMicros, allocatedMicros,
    remainingChainMicros, overrunMicros,
    projectedMaximumCumulativeMicros: currentCumulativeMicros
      + remainingChainMicros,
    softAlerts: overrunMicros ? [{ kind: 'cost_allocation_exceeded',
      observed: allocatedMicros, configuredThreshold: chainLimitMicros,
      overrunMicros, action: 'continue' }] : [],
    inheritedCostCountedOnce: true, accountingReset: false,
    paymentRequiredStillBlocks: true, invoice: false,
    trainingTruth: false });
}

export function verifyFactionCostNotificationV1({ projection, notification, budgetExtension = null }) {
  verifySeal(projection); verifySeal(notification);
  if (budgetExtension) verifySeal(budgetExtension);
  const tierCoverage = budgetExtension?.version === 'faction_first_two_budget_extension_v3';
  if (notification.schema !== 'ticket18_faction_cost_notification_receipt_v1'
    || notification.thresholdMicros !== 100_000_000 || notification.nextThresholdMicros !== 200_000_000
    || notification.observedCumulativeMicros > projection.currentCumulativeMicros
    || !Number.isSafeInteger(notification.projectedMaximumMicros)
    || notification.projectedMaximumMicros < notification.thresholdMicros
    || notification.projectedMaximumMicros >= notification.nextThresholdMicros
    || !tierCoverage && notification.projectedMaximumMicros !== projection.projectedMaximumCumulativeMicros
    || notification.userNotified !== true || notification.cumulativeAccountingReset !== false
    || notification.authorization !== 'user_explicit_rebilling_authorization_2026-09-07'
    || notification.invoice !== false
    || projection.projectedMaximumCumulativeMicros >= notification.nextThresholdMicros) fail('CNY_100_NOTIFICATION_REQUIRED');
  return seal({ version: 'faction_cost_notification_verification_v1', projectionHash: projection.hash,
    notificationHash: notification.hash, budgetExtensionHash: budgetExtension?.hash || null,
    coverage: tierCoverage ? 'notified_tier_below_next_threshold' : 'legacy_exact_projection',
    nextThresholdMicros: notification.nextThresholdMicros, accountingReset: false, invoice: false, trainingTruth: false });
}

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

export function createFactionBudgetExtensionV2(parent) {
  verifySeal(parent);
  if (!parent.budgetExtension) fail('FACTION_BUDGET_EXTENSION_V2_PARENT_INVALID');
  verifySeal(parent.budgetExtension);
  const prior = parent.budgetExtension;
  if (prior.version === 'faction_first_two_budget_extension_v2') {
    if (hash(parent.limits) !== hash(reauthorized)
      || hash(prior.priorLimits) !== hash(expanded)
      || hash(prior.nextLimits) !== hash(reauthorized)
      || prior.authority
        !== 'user_explicit_rebilling_authorization_2026-09-07'
      || !prior.originalClockPreserved || !prior.allPriorAccountingPreserved
      || !prior.perRoleLimitsUnchanged) {
      fail('FACTION_BUDGET_EXTENSION_V2_PARENT_INVALID');
    }
    return prior;
  }
  if (prior.version !== 'faction_first_two_budget_extension_v1'
    || hash(parent.limits) !== hash(expanded)
    || hash(prior.priorLimits) !== hash(original)
    || hash(prior.nextLimits) !== hash(expanded)
    || !prior.originalClockPreserved || !prior.allPriorAccountingPreserved
    || !prior.perRoleLimitsUnchanged) {
    fail('FACTION_BUDGET_EXTENSION_V2_PARENT_INVALID');
  }
  return seal({ version: 'faction_first_two_budget_extension_v2',
    parentRecipeHash: parent.hash, priorExtensionHash: prior.hash,
    priorLimits: clone(expanded), nextLimits: clone(reauthorized),
    scope: 'finish_two_complete_source_bound_faction_candidates_after_general_skill',
    reason: 'User reauthorized fresh billing after the general strategy Skill completed.',
    authority: 'user_explicit_rebilling_authorization_2026-09-07',
    originalClockPreserved: true, allPriorAccountingPreserved: true,
    perRoleLimitsUnchanged: true, paymentRequiredStopsAllWork: true,
    cny100NotificationReceiptRequired: true,
    nextNotificationThresholdMicros: 200_000_000,
    trainingTruth: false });
}

export function createFactionBudgetExtensionV3(parent) {
  verifySeal(parent); verifySeal(parent.budgetExtension);
  const prior = parent.budgetExtension;
  if (prior.version === 'faction_first_two_budget_extension_v3') {
    if (hash(parent.limits) !== hash(remainingProduction) || hash(prior.nextLimits) !== hash(remainingProduction)
      || hash(prior.priorLimits) !== hash(reauthorized)
      || prior.authority !== 'standing_user_authorization_for_all_remaining_skill_generation'
      || !prior.originalClockPreserved || !prior.allPriorAccountingPreserved || !prior.perRoleLimitsUnchanged)
      fail('FACTION_BUDGET_EXTENSION_V3_PARENT_INVALID');
    return prior;
  }
  if (prior.version !== 'faction_first_two_budget_extension_v2'
    || createFactionBudgetExtensionV2(parent).hash !== prior.hash) fail('FACTION_BUDGET_EXTENSION_V3_PARENT_INVALID');
  return seal({ version: 'faction_first_two_budget_extension_v3', parentRecipeHash: parent.hash,
    priorExtensionHash: prior.hash, priorLimits: clone(reauthorized), nextLimits: clone(remainingProduction),
    scope: 'finish_two_complete_source_bound_faction_candidates_after_native_protocol_migration',
    reason: 'Remaining source-reviewed chapters exceed the approximately CNY21 remaining chain allocation; preserve actual spend and set a bounded financial ceiling.',
    authority: 'standing_user_authorization_for_all_remaining_skill_generation', hostChosenFinancialSafetyCap: true,
    originalClockPreserved: true, allPriorAccountingPreserved: true, perRoleLimitsUnchanged: true,
    paymentRequiredStopsAllWork: true, cny100NotificationReceiptRequired: true,
    nextNotificationThresholdMicros: 200_000_000, trainingTruth: false });
}

export function validateFactionBudgetExtensionV1({ parent, next }) {
  [parent, next].forEach(verifySeal);
  if (isFactionBudgetEpochV1(next.budgetExtension)) return verifyFactionBudgetEpochV1({ parent, next });
  if (!next.budgetExtension) {
    if (parent.budgetExtension || hash(parent.limits) !== hash(next.limits)) fail('FACTION_BUDGET_EXTENSION_REQUIRED');
    return null;
  }
  const extension = verifySeal(next.budgetExtension);
  let priorLimits = original, expectedLimits = expanded,
    authorization = 'initial_extension_v1';
  if (!parent.budgetExtension) {
    if (createFactionBudgetExtensionV1(parent).hash !== extension.hash)
      fail('FACTION_BUDGET_EXTENSION_INVALID');
  } else {
    verifySeal(parent.budgetExtension);
    if (parent.budgetExtension.version === 'faction_first_two_budget_extension_v1'
      && extension.version === 'faction_first_two_budget_extension_v2') {
      if (createFactionBudgetExtensionV2(parent).hash !== extension.hash)
        fail('FACTION_BUDGET_EXTENSION_V2_INVALID');
      priorLimits = expanded; expectedLimits = reauthorized;
      authorization = 'explicit_rebilling_v2';
    } else if (parent.budgetExtension.version === 'faction_first_two_budget_extension_v2'
      && extension.version === 'faction_first_two_budget_extension_v3') {
      if (createFactionBudgetExtensionV3(parent).hash !== extension.hash) fail('FACTION_BUDGET_EXTENSION_V3_INVALID');
      priorLimits = reauthorized; expectedLimits = remainingProduction; authorization = 'remaining_production_v3';
    } else if (parent.budgetExtension.version === 'faction_first_two_budget_extension_v3') {
      if (extension.hash !== createFactionBudgetExtensionV3(parent).hash) fail('FACTION_BUDGET_EXTENSION_IMMUTABLE');
      priorLimits = reauthorized; expectedLimits = remainingProduction; authorization = 'remaining_production_v3';
    } else if (parent.budgetExtension.version
        === 'faction_first_two_budget_extension_v1'
      || parent.budgetExtension.version
        === 'faction_first_two_budget_extension_v2') {
      if (extension.hash !== parent.budgetExtension.hash)
        fail('FACTION_BUDGET_EXTENSION_IMMUTABLE');
      if (extension.version === 'faction_first_two_budget_extension_v2') {
        priorLimits = expanded; expectedLimits = reauthorized;
        authorization = 'explicit_rebilling_v2';
      }
    } else {
      fail('FACTION_BUDGET_EXTENSION_IMMUTABLE');
    }
  }
  if (hash(next.limits) !== hash(expectedLimits)
    || hash(extension.priorLimits) !== hash(priorLimits)
    || hash(extension.nextLimits) !== hash(expectedLimits))
    fail('FACTION_BUDGET_EXTENSION_LIMIT_DRIFT');
  return seal({ extensionHash: extension.hash, priorLimitsHash: hash(priorLimits), nextLimitsHash: hash(expectedLimits), authorization,
    originalClockPreserved: true, allPriorAccountingPreserved: true, perRoleLimitsUnchanged: true, trainingTruth: false });
}

// Budget authority is orthogonal to a content/protocol migration. Each
// migration still validates its own immutable input/model/source fields.
export function factionLimitsCompatibleV1(parent, next) {
  if (hash(parent.limits) === hash(next.limits)) return true;
  try { return Boolean(validateFactionBudgetExtensionV1({ parent, next })); }
  catch { return false; }
}
