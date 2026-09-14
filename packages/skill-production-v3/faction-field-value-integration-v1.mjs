import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { outputContractRefStarcraftTmgV1, validateStarcraftTmgProviderJsonSchemaValueV1 as validate }
  from '../structured-generation/output-contract-registry-v1.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { renewFactionCapabilityV1 } from './faction-parallel-v1.mjs';
import { FACTION_FIELD_VALUE_BINDING_V1 as binding, createFactionFieldValueRuntimeV1 } from './faction-field-value-runtime-v1.mjs';
import { createFactionFieldRecoveryRuntimeV1 } from './faction-field-recovery-v1.mjs';
import { readFactionFieldRecoveryEvidenceV1, assertFactionFieldRecoveryRecipeV1 } from './faction-field-recovery-scope-v1.mjs';

export const FACTION_FIELD_VALUE_FILES_V1 = Object.freeze([
  'packages/skill-production-v3/faction-execution-model-v1.mjs',
  'packages/skill-production-v3/faction-field-value-runtime-v1.mjs',
  'packages/skill-production-v3/faction-field-value-integration-v1.mjs',
  'packages/skill-production-v3/faction-field-repair-task-v1.mjs',
  'packages/skill-production-v3/faction-field-recovery-lane-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/verify-ticket-18-field-value-runtime-v1.mjs',
  'scripts/verify-ticket-18-field-value-wiring-v1.mjs',
]);

export function assertFactionFieldValueRecipeV1(recipe) {
  if (recipe.fieldValueBinding === undefined && recipe.fieldValueReadinessHash === undefined) return false;
  if (verifySeal(recipe.fieldValueBinding).hash !== binding.hash
    || !/^[a-f0-9]{64}$/u.test(recipe.fieldValueReadinessHash || '')
    || !assertFactionFieldRecoveryRecipeV1(recipe)) fail('FACTION_FIELD_VALUE_RECIPE_INVALID');
  return true;
}

function checkReadiness(readiness) {
  verifySeal(readiness);
  if (readiness.version !== 'faction_field_value_wiring_readiness_v1' || !readiness.passed
    || !readiness.fullReplayConsumerPassed || !readiness.dryAndLiveFactoryPassed
    || !readiness.actualProviderAdapterBoundaryPassed || !readiness.authenticatedDshProofHash
    || readiness.actualDshSessions < 3 || readiness.dshInjectionUsed !== false
    || readiness.providerCalls !== 0 || readiness.semanticAcceptance !== false
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_FIELD_VALUE_FILES_V1].sort()))
    fail('FACTION_FIELD_VALUE_READINESS_REQUIRED');
}

export function factionFieldValueRecipeV1(readiness) {
  checkReadiness(readiness);
  return { fieldValueBinding: binding, fieldValueReadinessHash: readiness.hash };
}

export function validateFactionFieldValueMigrationV1({ parent, next, readiness }) {
  if (!parent.fieldValueBinding && !next.fieldValueBinding) {
    if (readiness) fail('FACTION_FIELD_VALUE_MIGRATION_UNSCOPED');
    return null;
  }
  checkReadiness(readiness);
  if (!assertFactionFieldValueRecipeV1(next) || next.fieldValueReadinessHash !== readiness.hash
    || parent.fieldValueBinding && !assertFactionFieldValueRecipeV1(parent)
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash']
      .some(f => hash(parent[f]) !== hash(next[f]))) fail('FACTION_FIELD_VALUE_MIGRATION_INVALID');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_FIELD_VALUE_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_field_value_migration_v1', bindingHash: binding.hash,
    readinessHash: readiness.hash, files: readiness.codeHashes.map(r => r.file),
    originalAttemptsCopied: 0, accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false });
}

// Synthetic probe values are derived from the same schema and locally checked
// before egress. They never enter the game review or count as Skill evidence.
export function factionFieldValueProbeSampleV1(contract) {
  function sample(s, ordinal = 0) {
    if (s.enum) return structuredClone(s.enum[ordinal % s.enum.length]);
    if (s.type === 'object') return Object.fromEntries((s.required || []).map(k => [k, sample(s.properties[k])]));
    if (s.type === 'array') return Array.from({ length: s.minItems || 0 }, (_, i) => sample(s.items, i));
    if (s.type === 'string') return ('synthetic-probe-' + ordinal).padEnd(s.minLength || 0, 'x').slice(0, s.maxLength || 64);
    if (s.type === 'integer' || s.type === 'number') return Math.min(s.maximum ?? Infinity, (s.minimum ?? 0) + ordinal);
    if (s.type === 'boolean') return Boolean(ordinal % 2);
    if (s.type === 'null') return null;
    fail('FACTION_FIELD_VALUE_PROBE_SCHEMA_UNSUPPORTED');
  }
  const value = sample(contract.providerSchema);
  if (!validate(contract.providerSchema, value).ok) fail('FACTION_FIELD_VALUE_PROBE_SAMPLE_INVALID');
  return value;
}

export function createFactionFieldValueCapabilityResolverV1({ filename, allowedRunIds, store, adapter,
  egressBinding, seedCapability, priceUsage, pending = new Map(), now = () => new Date().toISOString() }) {
  // Single coordinator resolver: simultaneous faction requests for the same
  // schema share the paid probe promise, including its failure (no hidden retry).
  return contract => {
    const ref = outputContractRefStarcraftTmgV1(contract), key = hash({ ref, profile: egressBinding.providerProfileRef });
    if (!pending.has(key)) pending.set(key, (async () => {
      const db = new DatabaseSync(filename, { readOnly: true });
      try {
        if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
          fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
        for (const runId of allowedRunIds) {
          for (const row of db.prepare("SELECT response FROM attempts WHERE run=? AND state='received' AND settled IS NOT NULL").all(runId)) {
            const response = verifySeal(JSON.parse(row.response)).value, cap = response?.ok && response.capabilityReceipt;
            if (cap && verifyStarcraftTmgProviderCapabilityCurrentV1({ receipt: cap, providerProfileRef: egressBinding.providerProfileRef,
              endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
              capability: 'responses_json_schema', outputContractRef: ref, now: now() }).ok) return cap;
          }
        }
      } finally { db.close(); }
      return renewFactionCapabilityV1({ store, adapter, binding: egressBinding, contract, prior: seedCapability,
        priceUsage, probeSample: factionFieldValueProbeSampleV1(contract), now });
    })());
    return pending.get(key);
  };
}

export function createFactionFieldValueCompleterV1({ filename, recipe, ancestors, runId, input,
  store, dsh, providerAdapter, wireRecovery, egressBinding, ensureCapability, priceUsage, onProgress,
  stopForSourceContext = false }) {
  if (!assertFactionFieldValueRecipeV1(recipe)) fail('FACTION_FIELD_VALUE_BINDING_REQUIRED');
  const readEvidence = prepared => readFactionFieldRecoveryEvidenceV1({ filename, recipe, ancestors,
    currentRunId: runId, allowCurrentRunning: true, prepared });
  const projection = createFactionFieldRecoveryRuntimeV1({ input, store, dsh, readEvidence });
  const values = createFactionFieldValueRuntimeV1({ filename, input, store, dsh, providerAdapter, wireRecovery,
    egressBinding, ensureCapability, priceUsage, onProgress, stopForSourceContext,
    ambiguousReplacementBinding: recipe.ambiguousReplacementBinding,
    allowedRunIds: [runId, ...ancestors.map(r => 'faction-v1-' + r.hash.slice(0, 20))],
    readOriginalEvidence: prepared => {
      const evidence = readEvidence(prepared);
      if (!evidence) fail('FACTION_FIELD_VALUE_ORIGINAL_MISSING');
      return evidence.originalEvidence;
    } });
  return async prepared => {
    try { return await projection.run(prepared); }
    catch (error) {
      if (error.code !== 'FACTION_FIELD_RECOVERY_SOURCE_COMPLETION_REQUIRED') throw error;
      return values.run(prepared);
    }
  };
}
