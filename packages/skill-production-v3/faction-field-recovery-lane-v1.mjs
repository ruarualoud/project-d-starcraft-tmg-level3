import { hash, verifySeal, fail } from '../skill-production/common.mjs';
import { prepareFactionSlotReviewRoleV1 } from './faction-slot-review-runtime-v1.mjs';
import { createFactionFieldRecoveryRuntimeV1, materializeFactionFieldRecoveryV1,
  verifyFactionFieldRecoveredRoleV1, FACTION_FIELD_RECOVERY_BINDING_V1,
  FACTION_FIELD_RECOVERY_BINDING_V2 } from './faction-field-recovery-v1.mjs';
import { assertFactionFieldRecoveryRecipeV1, readFactionFieldRecoveryEvidenceV1 } from './faction-field-recovery-scope-v1.mjs';
import { assertFactionFieldValueRecipeV1 } from './faction-field-value-integration-v1.mjs';
import { factionMixedReviewLegacyRoleIdsV1 } from './faction-mixed-review-environment-v1.mjs';

export async function completeFactionFieldRecoveryOrDelegateV1({ store, lease,
  prepared, request, runtime, completeFieldValues, release }) {
  try {
    return store.finish(lease, await completeFieldValues(prepared));
  } catch (error) {
    if (error.code !== 'FACTION_FIELD_VALUE_FULL_OUTPUT_REQUIRED') throw error;
    release();
    return runtime.role(request);
  }
}

export function createFactionFieldRecoveryLaneV1({ filename, recipe, ancestors, runId = null,
  input, runtime, store, dsh, executionPolicy, dry = false, onUncached, onProgress, completeFieldValues }) {
  if (!assertFactionFieldRecoveryRecipeV1(recipe)) return runtime;
  const readEvidence = prepared => readFactionFieldRecoveryEvidenceV1({ filename, recipe, ancestors, prepared,
    currentRunId: dry ? null : runId, allowCurrentRunning: !dry });
  return Object.freeze({ async role(request) {
    const canonical = id => String(id).replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '');
    if (factionMixedReviewLegacyRoleIdsV1(recipe, recipe.slotReviewLegacyRoleIds || []).includes(canonical(request.packet.id + '.' + request.roleId))
      || recipe.slotReviewRecoveryOrigins?.some(o => o.roleRefHash === hash(canonical(request.roleId) + '.structured-review-v1')))
      return runtime.role(request);
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
    if (!prepared) return runtime.role(request);
    if (store.globalSummary?.().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    // Do not reinterpret an already completed old-protocol role through a new
    // codec. acquire(), not artifact(), is the continuation-aware lookup:
    // inherited roles are materialized lazily by withCheckpointContinuation.
    const lease = store.acquire(prepared.fullRoleId, prepared.roleInput);
    const saved = lease.cached ? verifySeal(lease.artifact) : null;
    if (saved && ![FACTION_FIELD_RECOVERY_BINDING_V1.version,
      FACTION_FIELD_RECOVERY_BINDING_V2.version].includes(saved.protocol))
      return runtime.role(request);
    let released = false;
    const release = () => { if (!lease.cached && !released) { store.release(lease); released = true; } };
    // A dry probe cannot leave its own lease looking like unfinished paid
    // history while the independent reader checks terminal ancestry.
    if (dry) release();
    const delegate = () => { release(); return runtime.role(request); };
    try {
      const evidence = readEvidence(prepared);
      if (!evidence) {
        if (saved) fail('FACTION_FIELD_RECOVERY_ACTUAL_ORIGIN_MISSING');
        return delegate();
      }
      if (saved) {
        verifyFactionFieldRecoveredRoleV1({ value: saved, input, prepared,
          ...evidence, dshBindingHash: recipe.dshBindingHash });
        return saved;
      }
      let materialization;
      try { materialization = materializeFactionFieldRecoveryV1({ input, prepared, ...evidence }); }
      catch (error) {
        if (error.code === 'FACTION_FIELD_RECOVERY_SOURCE_COMPLETION_REQUIRED' && assertFactionFieldValueRecipeV1(recipe)) {
          if (dry) {
            onUncached?.({ roleId: prepared.fullRoleId, route: 'authenticated_field_value_completion' });
            fail('FACTION_PREFLIGHT_FIELD_VALUE_COMPLETION_REQUIRED');
          }
          if (typeof completeFieldValues !== 'function') fail('FACTION_FIELD_VALUE_PRODUCTION_ROUTE_REQUIRED');
          return completeFactionFieldRecoveryOrDelegateV1({ store, lease, prepared,
            request, runtime, completeFieldValues, release });
        }
        // Missing fields never inherit this projection lane's zero egress
        // authority without the separately bound field-value runtime.
        if (error.code === 'FACTION_FIELD_RECOVERY_NOT_NEEDED' && !saved) return delegate();
        throw error;
      }
      if (dry) {
        onUncached?.({ roleId: prepared.fullRoleId, materializationHash: materialization.hash, providerCalls: 0 });
        fail('FACTION_PREFLIGHT_FIELD_RECOVERY_REQUIRED');
      }
      const value = await createFactionFieldRecoveryRuntimeV1({ input, store, dsh, readEvidence }).run(prepared);
      if (hash(value.materialization) !== hash(materialization)) fail('FACTION_FIELD_RECOVERY_PREPARATION_DRIFT');
      const result = store.finish(lease, value);
      onProgress?.({ roleId: prepared.fullRoleId, stage: 'paid_field_projection_recovered', providerCalls: 0,
        materializationHash: materialization.hash, originalProviderSchemaPassed: false });
      return result;
    } catch (error) { release(); throw error; }
  } });
}
