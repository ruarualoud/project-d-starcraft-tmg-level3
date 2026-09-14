import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_CHECKPOINT_INVENTORY_BINDING_V1 as inventory } from './faction-checkpoint-inventory-v1.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1 as parsed } from './faction-parsed-review-value-v1.mjs';

export const FACTION_RESUME_RELIABILITY_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-checkpoint-inventory-v1.mjs',
  'packages/skill-production-v3/faction-parsed-review-value-v1.mjs',
  'packages/skill-production-v3/faction-resume-reliability-v1.mjs',
  'packages/skill-production-v3/faction-prompt-lineage-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs',
  'packages/skill-production-v3/faction-structural-json-lane-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/support/faction-parsed-value-actual-fixture-v1.mjs',
  'scripts/verify-ticket-18-checkpoint-inventory-v1.mjs',
  'scripts/verify-ticket-18-parsed-review-value-v1.mjs',
  'scripts/verify-ticket-18-resume-reliability-v1.mjs',
]);
const invalid = code => fail('FACTION_RESUME_RELIABILITY_' + code);
function check(readiness) {
  verifySeal(readiness);
  if (readiness.version !== 'faction_resume_reliability_readiness_v1' || !readiness.passed
    || readiness.inventoryBindingHash !== inventory.hash || readiness.parsedValueBindingHash !== parsed.hash
    || !readiness.actualHistoryReused || !readiness.actualParsedProductionAndColdReaderPassed
    || !readiness.restartNoResendPassed || readiness.actualDshSessions < 1 || readiness.providerCalls !== 0
    || readiness.semanticAcceptance !== false || readiness.trainingTruth !== false
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_RESUME_RELIABILITY_FILES_V1].sort())) invalid('READINESS_REQUIRED');
}
export function factionResumeReliabilityRecipeV1(readiness) {
  check(readiness);
  return { checkpointInventoryBinding: inventory, checkpointRestorationWindows: readiness.restorationWindows,
    parsedReviewValueBinding: parsed, resumeReliabilityReadinessHash: readiness.hash };
}
export function validateFactionResumeReliabilityMigrationV1({ parent, next, readiness }) {
  if (!parent.checkpointInventoryBinding && !next.checkpointInventoryBinding) {
    if (readiness) invalid('MIGRATION_UNSCOPED');
    return null;
  }
  check(readiness);
  const expected = factionResumeReliabilityRecipeV1(readiness);
  if (Object.keys(expected).some(k => hash(expected[k]) !== hash(next[k]))
    || parent.checkpointInventoryBinding && (parent.checkpointInventoryBinding.hash !== inventory.hash
      || parent.parsedReviewValueBinding?.hash !== parsed.hash
      || hash(parent.checkpointRestorationWindows) !== hash(next.checkpointRestorationWindows))
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash']
      .some(k => hash(parent[k]) !== hash(next[k]))) invalid('MIGRATION_INVALID');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) invalid('MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_resume_reliability_migration_v1', readinessHash: readiness.hash,
    files: readiness.codeHashes.map(r => r.file), attemptsCopied: 0, accountingReset: false,
    semanticAcceptanceInherited: false, trainingTruth: false });
}
