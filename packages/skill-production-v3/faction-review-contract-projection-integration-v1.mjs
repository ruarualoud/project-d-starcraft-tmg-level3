import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1 as binding,
  materializeFactionReviewContractProjectionV1 } from './faction-review-contract-projection-v1.mjs';
import { createFactionReviewContractProjectionRuntimeV1, verifyFactionReviewContractProjectionRoleV1 }
  from './faction-review-contract-projection-runtime-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from './faction-slot-review-runtime-v1.mjs';
import { readFactionFieldRecoveryEvidenceV1 } from './faction-field-recovery-scope-v1.mjs';
import { factionMixedReviewLegacyRoleIdsV1 } from './faction-mixed-review-environment-v1.mjs';

export const FACTION_CONTRACT_PROJECTION_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-execution-model-v1.mjs',
  'packages/skill-production-v3/faction-explicit-slot-review-migration-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-scope-v1.mjs',
  'packages/skill-production-v3/faction-field-source-integration-v1.mjs',
  'packages/skill-production-v3/faction-field-value-integration-v1.mjs',
  'packages/skill-production-v3/faction-mixed-review-integration-v1.mjs',
  'packages/skill-production-v3/faction-parsed-wire-scope-v2.mjs',
  'packages/skill-production-v3/faction-resume-reliability-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs',
  'packages/skill-production-v3/faction-review-source-expansion-scope-v1.mjs',
  'packages/skill-production-v3/faction-slot-review-migration-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-scope-v1.mjs',
  'packages/skill-production-v3/faction-wire-address-recovery-migration-v1.mjs',
  'packages/skill-production-v3/faction-wire-runtime-migration-v2.mjs',
  'packages/skill-production-v3/faction-zerg-unit-timing-migration-v1.mjs',
  'packages/skill-production-v3/faction-budget-epoch-v1.mjs',
  'packages/skill-production-v3/faction-budget-extension-v1.mjs',
  'scripts/record-ticket-18-budget-epoch-v1.mjs',
  'scripts/verify-ticket-18-budget-epoch-v1.mjs',
  'packages/skill-production-v3/faction-review-contract-projection-v1.mjs',
  'packages/skill-production-v3/faction-review-contract-projection-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-contract-projection-integration-v1.mjs',
  'packages/skill-production-v3/recovery-attestation-v1.mjs',
  'packages/skill-production-v3/recovery-attestation-registry-v1.mjs',
  'packages/skill-production-v3/recovery-attestation-host-policy-v1.mjs',
  'packages/skill-production-v3/faction-opening-fence-environment-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-environment-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-runtime-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-lane-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/support/faction-contract-projection-actual-fixture-v1.mjs',
  'scripts/verify-ticket-18-review-contract-projection-v1.mjs',
  'scripts/verify-ticket-18-review-contract-projection-runtime-v1.mjs',
  'scripts/verify-ticket-18-review-contract-projection-wiring-v1.mjs',
]);
const invalid = suffix => fail('FACTION_CONTRACT_PROJECTION_' + suffix);
export function assertFactionContractProjectionRecipeV1(recipe) {
  if (recipe.contractProjectionBinding === undefined && recipe.contractProjectionReadinessHash === undefined) return false;
  if (verifySeal(recipe.contractProjectionBinding).hash !== binding.hash
    || !/^[a-f0-9]{64}$/u.test(recipe.contractProjectionReadinessHash || '')) invalid('RECIPE');
  return true;
}
function check(readiness) {
  verifySeal(readiness);
  if (readiness.version !== 'faction_contract_projection_wiring_readiness_v1' || !readiness.passed
    || readiness.bindingHash !== binding.hash || !readiness.actualZeroObligationRequestReconstructed
    || !readiness.actualAdministrativeExtensionReconstructed || !readiness.fullColdConsumerPassed
    || !readiness.freshFailureCallbackPassed || !readiness.restartNoResendPassed
    || readiness.actualDshSessions < 2 || readiness.providerCalls !== 0 || readiness.semanticAcceptance !== false
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_CONTRACT_PROJECTION_FILES_V1].sort())) invalid('READINESS');
}
export function factionContractProjectionRecipeV1(readiness) {
  check(readiness);
  return { contractProjectionBinding: binding, contractProjectionReadinessHash: readiness.hash };
}
export function validateFactionContractProjectionMigrationV1({ parent, next, readiness }) {
  if (!parent.contractProjectionBinding && !next.contractProjectionBinding) {
    if (readiness) invalid('MIGRATION_UNSCOPED'); return null;
  }
  check(readiness);
  if (!assertFactionContractProjectionRecipeV1(next) || next.contractProjectionReadinessHash !== readiness.hash
    || parent.contractProjectionBinding && !assertFactionContractProjectionRecipeV1(parent)
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash']
      .some(k => hash(parent[k]) !== hash(next[k]))) invalid('MIGRATION');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) invalid('CODE_DRIFT');
  return seal({ version: 'faction_contract_projection_migration_v1', readinessHash: readiness.hash,
    files: readiness.codeHashes.map(r => r.file), attemptsCopied: 0, accountingReset: false,
    semanticAcceptanceInherited: false, trainingTruth: false });
}
const unhandled = new Set(['FACTION_REVIEW_CONTRACT_PROJECTION_NOT_NEEDED',
  'FACTION_REVIEW_CONTRACT_PROJECTION_REMAINING_VALUE_TASK', 'FACTION_REVIEW_CONTRACT_PROJECTION_ADJUDICATION_REQUIRED',
  'FACTION_REVIEW_CONTRACT_PROJECTION_CONTROL_FIELD', 'FACTION_REVIEW_CONTRACT_PROJECTION_PAID_REPAIR_SCOPE_UNSUPPORTED']);

export function createFactionContractProjectionResolverV1({ filename, recipe, ancestors, runId = null,
  input, store, dsh, dry = false }) {
  if (!assertFactionContractProjectionRecipeV1(recipe)) return null;
  const readEvidence = prepared => readFactionFieldRecoveryEvidenceV1({ filename, recipe, ancestors, prepared,
    currentRunId: dry ? null : runId, allowCurrentRunning: !dry });
  const inspect = prepared => {
    const evidence = readEvidence(prepared);
    if (!evidence) return null;
    try { return { evidence, materialization: materializeFactionReviewContractProjectionV1({ input, prepared, ...evidence }) }; }
    catch (error) { if (unhandled.has(error.code)) return null; throw error; }
  };
  return Object.freeze({ inspect, readEvidence,
    async complete(prepared) {
      const found = inspect(prepared); if (!found) return null;
      if (dry) fail('FACTION_PREFLIGHT_FIELD_RECOVERY_REQUIRED');
      return createFactionReviewContractProjectionRuntimeV1({ input, store, dsh, readEvidence }).run(prepared);
    } });
}

// Install this around BOTH the inherited-failure lane and the fresh-failure
// callback. A newly omitted zero-task collection never incurs a fieldN call.
export function withFactionContractProjectionCompleterV1({ resolver, baseCompleter }) {
  return resolver ? async prepared => (await resolver.complete(prepared)) || baseCompleter(prepared) : baseCompleter;
}
export function createFactionContractProjectionLaneV1({ recipe, input, runtime, store, resolver,
  executionPolicy, dry = false, onUncached, onProgress }) {
  if (!assertFactionContractProjectionRecipeV1(recipe)) return runtime;
  if (!resolver) invalid('RESOLVER_REQUIRED');
  return Object.freeze({ async role(request) {
    const canonical = id => String(id).replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '');
    if (factionMixedReviewLegacyRoleIdsV1(recipe, recipe.slotReviewLegacyRoleIds || []).includes(canonical(request.packet.id + '.' + request.roleId)))
      return runtime.role(request);
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
    if (!prepared) return runtime.role(request);
    const lease = store.acquire(prepared.fullRoleId, prepared.roleInput);
    if (lease.cached && lease.artifact.protocol !== binding.version) return runtime.role(request);
    let released = false;
    const release = () => { if (!lease.cached && !released) { store.release(lease); released = true; } };
    if (dry) release();
    try {
      const found = resolver.inspect(prepared);
      if (!found) {
        if (lease.cached) invalid('SAVED_ORIGIN_MISSING');
        release(); return runtime.role(request);
      }
      if (lease.cached) {
        verifyFactionReviewContractProjectionRoleV1({ value: lease.artifact, input, prepared,
          ...found.evidence, dshBindingHash: recipe.dshBindingHash });
        return verifySeal(lease.artifact);
      }
      if (dry) {
        onUncached?.({ roleId: prepared.fullRoleId, route: 'authenticated_contract_projection_no_provider' });
        fail('FACTION_PREFLIGHT_FIELD_RECOVERY_REQUIRED');
      }
      const value = await resolver.complete(prepared);
      if (!value || value.materialization.hash !== found.materialization.hash) invalid('MATERIALIZATION_DRIFT');
      const result = store.finish(lease, value);
      onProgress?.({ roleId: prepared.fullRoleId, stage: 'contract_projection_complete', providerCalls: 0,
        emptyCoverageSupplied: value.materialization.projection.emptyCoverageSupplied,
        retainedAdministrativeAnnotations: value.materialization.projection.sidecar.length });
      return result;
    } catch (error) { release(); throw error; }
  } });
}
