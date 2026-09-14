import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_FIELD_VALUE_SOURCE_HANDOFF_BINDING_V1 as binding, readFactionFieldValueSourceHandoffV1 } from './faction-field-value-source-handoff-v1.mjs';
import { assertFactionFieldValueRecipeV1 } from './faction-field-value-integration-v1.mjs';
import { readFactionFieldRecoveryEvidenceV1 } from './faction-field-recovery-scope-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from './faction-structured-review-runtime-v1.mjs';

export const FACTION_FIELD_SOURCE_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-field-value-source-handoff-v1.mjs',
  'packages/skill-production-v3/faction-field-value-runtime-v1.mjs',
  'packages/skill-production-v3/faction-field-value-integration-v1.mjs',
  'packages/skill-production-v3/faction-field-source-integration-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-lane-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/support/faction-field-source-actual-fixture-v1.mjs',
  'scripts/verify-ticket-18-field-source-handoff-v1.mjs',
  'scripts/verify-ticket-18-field-source-wiring-v1.mjs',
]);

export function assertFactionFieldSourceRecipeV1(recipe) {
  if (recipe.fieldValueSourceBinding === undefined && recipe.fieldValueSourceReadinessHash === undefined) return false;
  if (verifySeal(recipe.fieldValueSourceBinding).hash !== binding.hash
    || !/^[a-f0-9]{64}$/u.test(recipe.fieldValueSourceReadinessHash || '')
    || !assertFactionFieldValueRecipeV1(recipe)
    || recipe.reviewSourceExpansionBinding?.hash !== binding.sourceExpansionBindingHash)
    fail('FACTION_FIELD_SOURCE_RECIPE_INVALID');
  return true;
}
const checkReadiness = readiness => {
  verifySeal(readiness);
  if (readiness.version !== 'faction_field_source_wiring_readiness_v1' || !readiness.passed
    || readiness.bindingHash !== binding.hash || !readiness.actualFieldFailureReconstructed
    || !readiness.fullColdConsumerPassed || !readiness.restartNoFieldResendPassed
    || !readiness.freshSourceReviewPassed || readiness.actualDshSessions < 1 || readiness.dshInjectionUsed !== false
    || readiness.providerCalls !== 0 || readiness.semanticAcceptance !== false
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_FIELD_SOURCE_FILES_V1].sort()))
    fail('FACTION_FIELD_SOURCE_READINESS_REQUIRED');
};
export function factionFieldSourceRecipeV1(readiness) {
  checkReadiness(readiness);
  return { fieldValueSourceBinding: binding, fieldValueSourceReadinessHash: readiness.hash };
}
export function validateFactionFieldSourceMigrationV1({ parent, next, readiness }) {
  if (!parent.fieldValueSourceBinding && !next.fieldValueSourceBinding) {
    if (readiness) fail('FACTION_FIELD_SOURCE_MIGRATION_UNSCOPED');
    return null;
  }
  checkReadiness(readiness);
  if (!assertFactionFieldSourceRecipeV1(next) || next.fieldValueSourceReadinessHash !== readiness.hash
    || parent.fieldValueSourceBinding && !assertFactionFieldSourceRecipeV1(parent)
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash']
      .some(k => hash(parent[k]) !== hash(next[k]))) fail('FACTION_FIELD_SOURCE_MIGRATION_INVALID');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_FIELD_SOURCE_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_field_source_migration_v1', bindingHash: binding.hash,
    readinessHash: readiness.hash, files: readiness.codeHashes.map(r => r.file), originalAttemptsCopied: 0,
    accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function createFactionFieldSourceReaderV1({ filename, recipe, ancestors, runId, input, allowCurrentRunning = false }) {
  if (!assertFactionFieldSourceRecipeV1(recipe)) fail('FACTION_FIELD_SOURCE_BINDING_REQUIRED');
  return prepared => {
    const evidence = readFactionFieldRecoveryEvidenceV1({ filename, recipe, ancestors, prepared,
      currentRunId: runId, allowCurrentRunning });
    if (!evidence) return null;
    try {
      return readFactionFieldValueSourceHandoffV1({ filename, input, prepared, originalEvidence: evidence.originalEvidence,
        allowedRunIds: [runId, ...ancestors.map(r => 'faction-v1-' + r.hash.slice(0, 20))], dshBindingHash: recipe.dshBindingHash });
    } catch (error) {
      if (error.code === 'FACTION_FIELD_REPAIR_TASK_NOT_SEMANTIC_COMPLETION') return null;
      throw error;
    }
  };
}

export function withFactionFieldSourceCompletionV1({ baseCompleter, readHandoff, completeSourceContext, onProgress }) {
  return async prepared => {
    let handoff = readHandoff(prepared);
    if (!handoff) {
      try { return await baseCompleter(prepared); }
      catch (error) {
        if (!['FACTION_FIELD_VALUE_SOURCE_CONTEXT_REQUIRED', 'FACTION_FIELD_VALUE_NO_PROGRESS',
          'FACTION_FIELD_VALUE_ATTEMPT_LIMIT'].includes(error.code)) throw error;
        handoff = readHandoff(prepared);
        if (!handoff) throw error;
      }
    }
    onProgress?.({ stage: 'field_values_handed_to_source_review', fieldProviderCalls: 0,
      handoffHash: handoff.hash, sourceRefs: handoff.expandedSourceRefs });
    return completeSourceContext(prepared, handoff);
  };
}

// The canonical caller may already hold its role lease. The inner source phase
// has a distinct checkpoint bound to the exact handoff, then returns the normal
// proof-carrying role to that caller. No synthetic Provider receipt is invented.
export function completeFactionFieldSourceContextV1({ prepared, handoff, readHandoff, runtimeOptions }) {
  const { input, store } = runtimeOptions, m = prepared.mapping;
  const packet = seal({ id: 'faction.' + input.factionRecordKey.split(':')[1], inputHash: input.hash, sourceBinding: input.sourceBinding });
  if (packet.hash !== prepared.roleInput.packetHash || !prepared.fullRoleId.startsWith(packet.id + '.'))
    fail('FACTION_FIELD_SOURCE_REQUEST_RECONSTRUCTION_DRIFT');
  const request = { packet, roleId: prepared.fullRoleId.slice(packet.id.length + 1),
    workspace: { inputHash: input.hash, section: m.section, draft: m.draft, reviewIndices: m.reviewIndices,
      coverageRequiredSourceRefs: m.requiredSourceRefs, outputRequestAtEnd: { targetContract: m.targets } } };
  const nestedStore = { ...store, acquire(id, roleInput, ...rest) {
    return id === prepared.fullRoleId ? store.acquire(id + '.field-source-review-v1',
      { roleInput, handoffHash: handoff.hash }, ...rest) : store.acquire(id, roleInput, ...rest);
  } };
  return createFactionStructuredReviewRuntimeV1({ ...runtimeOptions, store: nestedStore,
    fieldValueSourceBinding: binding, fieldValueSourceHandoff: handoff,
    readFieldValueSourceHandoff: p => readHandoff({ ...p, mapping: { ...p.mapping, input } }) }).role(request);
}
