import { seal, verifySeal, hash, fail } from './common.mjs';
import { PHASED_DSH_SESSION_POLICY_V1 } from './session-lifecycle-v1.mjs';
import { PRODUCTION_FAILURE_ROUTING_BINDING_V1 } from './production-failure-routing-v1.mjs';

export const PRODUCTION_EXECUTION_POLICY_V1 = seal({
  version: 'production_execution_policy_v1',
  sessionPolicy: 'phased-v1', sessionPolicyHash: PHASED_DSH_SESSION_POLICY_V1.hash,
  failureRoutingHash: PRODUCTION_FAILURE_ROUTING_BINDING_V1.hash,
  runtimeContentIdentityUnchanged: true,
  inheritedArtifacts: 'exact_input_and_artifact_hash_in_verified_continuation',
  newExecutionRequiresLifecycle: true,
  unresolvedDelivery: 'isolate_exact_task_preserve_original_attempt_and_reserve',
  accountingReset: false, semanticAcceptanceInherited: false, trainingTruth: false,
});

export function verifyProductionExecutionPolicyV1(policy) {
  verifySeal(policy);
  if (policy.hash !== PRODUCTION_EXECUTION_POLICY_V1.hash) fail('PRODUCTION_EXECUTION_POLICY_UNSUPPORTED');
  return policy;
}

export function verifyProductionLoopPolicyV1(loop, policy) {
  verifyProductionExecutionPolicyV1(policy); verifySeal(loop);
  const life = verifySeal(loop.lifecycle);
  const phases = ['preparation', 'execution', 'finalization'];
  const maxima = { preparation: 180000, execution: 180000, finalization: 60000 };
  if (life.version !== 'phased_dsh_session_lifecycle_v1' || life.policyHash !== policy.sessionPolicyHash
    || life.status !== 'completed' || life.phase !== 'finalization' || life.failedPhase !== null
    || life.timeoutPhase !== null || life.finalCommandObserved !== true || life.operationDrained !== true
    || life.trainingTruth !== false || !Number.isFinite(life.totalMs) || life.totalMs < 0
    || loop.deadline?.policy !== PHASED_DSH_SESSION_POLICY_V1.timeoutPolicy
    || loop.deadline?.maxWallMs !== life.limitsMs?.execution
    || phases.some(p => !Number.isSafeInteger(life.limitsMs?.[p]) || life.limitsMs[p] < 1
      || life.limitsMs[p] > maxima[p] || !Number.isFinite(life.durationsMs?.[p])
      || life.durationsMs[p] < 0 || life.durationsMs[p] >= life.limitsMs[p])
    || Math.abs(phases.reduce((n, p) => n + life.durationsMs[p], 0) - life.totalMs) > 0.001)
    fail('PRODUCTION_EXECUTION_LIFECYCLE_INVALID');
  return life;
}

// Inspect nested fragment/import records as well as ordinary role.loop values.
// Source text and model output never grant policy or historical exemptions.
export function verifyProductionArtifactPolicyV1(value, policy) {
  verifyProductionExecutionPolicyV1(policy);
  let loops = 0;
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.runtimeBinding && node.sandboxReceipt && Array.isArray(node.transcript)) {
      verifyProductionLoopPolicyV1(node, policy); loops++; return;
    }
    for (const child of Object.values(node)) visit(child);
  };
  visit(value); return loops;
}

export function withProductionExecutionPolicyV1(store, policy, { inherited = [] } = {}) {
  verifyProductionExecutionPolicyV1(policy);
  const permits = new Map(inherited.map(row => [row.id, row]));
  return Object.freeze({ ...store, finish(lease, value) {
    const permit = permits.get(lease.id);
    if (!permit || permit.inputHash !== lease.inputHash || permit.artifactHash !== hash(value))
      verifyProductionArtifactPolicyV1(value, policy);
    return store.finish(lease, value);
  } });
}

// The independent reader binds every exemption to the actual parent journal,
// not merely a caller-provided allowlist. It never executes DSH or calls an API.
export function auditProductionExecutionRowsV1({ recipe, rows, readInheritedRow }) {
  if (!recipe.executionPolicyBinding) return { auditedLoops: 0, inheritedRows: 0 };
  verifyProductionExecutionPolicyV1(recipe.executionPolicyBinding);
  if (recipe.continuation) verifySeal(recipe.continuation);
  const permits = new Map((recipe.continuation?.reusable || []).map(row => [row.id, row]));
  let auditedLoops = 0, inheritedRows = 0;
  for (const row of rows) {
    const permit = permits.get(row.id);
    if (permit && permit.inputHash === row.inputHash && permit.artifactHash === hash(row.artifact)) {
      const original = readInheritedRow(recipe.continuation.parentRunId, row.id);
      if (!original || original.inputHash !== row.inputHash || hash(original.artifact) !== permit.artifactHash)
        fail('PRODUCTION_EXECUTION_INHERITED_ORIGIN_DRIFT');
      inheritedRows++;
    } else auditedLoops += verifyProductionArtifactPolicyV1(row.artifact, recipe.executionPolicyBinding);
  }
  return { auditedLoops, inheritedRows };
}

export function verifyProductionExecutionMigrationV1({ parent, next, readiness }) {
  if (!parent.executionPolicyBinding && !next.executionPolicyBinding) {
    if (readiness || next.executionPolicyReadinessHash) fail('PRODUCTION_EXECUTION_MIGRATION_UNSCOPED');
    return null;
  }
  verifyProductionExecutionPolicyV1(next.executionPolicyBinding);
  if (parent.executionPolicyBinding) verifyProductionExecutionPolicyV1(parent.executionPolicyBinding);
  verifySeal(readiness);
  if (!readiness.passed || readiness.providerCalls !== 0 || !readiness.oldArtifactsPreserved
    || !readiness.newMissingLifecycleRejected || !readiness.actualFailureRoutingPassed
    || readiness.bindingHash !== next.executionPolicyBinding.hash
    || next.executionPolicyReadinessHash !== readiness.hash
    || parent.dshBindingHash !== next.dshBindingHash || parent.contextHash !== next.contextHash
    || hash(parent.sourceBinding) !== hash(next.sourceBinding)
    || hash(parent.inputHashes) !== hash(next.inputHashes) || !readiness.codeHashes?.length)
    fail('PRODUCTION_EXECUTION_MIGRATION_INVALID');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash)
      fail('PRODUCTION_EXECUTION_MIGRATION_CODE_DRIFT');
  return seal({ version: 'production_execution_migration_v1', bindingHash: next.executionPolicyBinding.hash,
    readinessHash: readiness.hash, files: readiness.codeHashes.map(r => r.file),
    priorPolicyHash: parent.executionPolicyBinding?.hash || null,
    runtimeContentIdentityUnchanged: true, accountingReset: false, trainingTruth: false });
}
