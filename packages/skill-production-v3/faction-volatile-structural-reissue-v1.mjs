import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { RECOVERY_ATTESTATION_HOST_POLICY_V1 } from
  './recovery-attestation-host-policy-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from
  './faction-slot-review-runtime-v1.mjs';
import { readFactionStructuralReviewOriginV1 } from
  './faction-structural-json-environment-v1.mjs';

export const FACTION_VOLATILE_STRUCTURAL_REISSUE_BINDING_V1 = seal({
  version: 'faction_volatile_structural_reissue_v1',
  scope: 'selected_structural_review_origins_without_pinned_ed25519_attestation',
  proactiveBeforeExpiry: true,
  originalFailureCostAndReceiptPreserved: true,
  expiredRawNeverRead: true,
  inheritedRecoveredArtifactQuarantined: true,
  exactFullContextReissuedThroughAccountedCurrentRuntime: true,
  noSilentCompatibility: true,
  semanticAcceptanceInherited: false,
  runtimeAccepted: false,
  trainingTruth: false,
});
const binding = FACTION_VOLATILE_STRUCTURAL_REISSUE_BINDING_V1;
const invalid = code => fail('FACTION_VOLATILE_STRUCTURAL_REISSUE_' + code);
const originKey = row => row.runId + '/' + row.attemptId;
const artifactOriginKeys = artifact => {
  const rows = [artifact?.structuralJsonRecoveryOrigin,
    artifact?.structuralJsonRecoveryRecord?.proof,
    ...(artifact?.parsedWireRecoveries || []).map(row =>
      row.authenticatedProof),
    ...(artifact?.parsedReviewValues || []).map(row =>
      row.authenticatedProof)].filter(Boolean);
  return new Set(rows.map(row => (row.runId || row.originRunId) + '/'
    + (row.attemptId || row.originAttemptId)));
};

export async function planFactionVolatileStructuralReissueV1({ root,
  filename, recipe, continuation, input, enabled = true }) {
  [recipe, input].forEach(verifySeal);
  if (!enabled || !continuation) return seal({ version: binding.version,
    bindingHash: binding.hash, inputHash: input.hash, origins: [],
    quarantineRoleIds: [], archivedOrigins: [], providerCalls: 0,
    semanticAcceptanceInherited: false, runtimeAccepted: false,
    trainingTruth: false });
  const policy = verifySeal(RECOVERY_ATTESTATION_HOST_POLICY_V1);
  const registry = verifySeal(JSON.parse(await readFile(path.join(root,
    policy.registryFile), 'utf8')));
  if (registry.hash !== policy.registryHash || !Array.isArray(registry.proofs))
    invalid('REGISTRY_DRIFT');
  const archived = new Set(registry.proofs.map(row =>
    row.originRunId + '/' + row.originAttemptId));
  const faction = input.factionRecordKey.split(':')[1];
  const db = new DatabaseSync(filename, { readOnly: true });
  const origins = [];
  const archivedOrigins = [];
  try {
    for (const selected of recipe.structuralJsonReviewOrigins || []) {
      const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(selected.runId, selected.attemptId + '.wire-issue-v2');
      if (!row) invalid('ORIGIN_MISSING');
      const issue = verifySeal(JSON.parse(row.artifact)).value;
      if (issue.hash !== selected.issueHash || issue.runId !== selected.runId
        || issue.attemptId !== selected.attemptId
        || issue.class !== 'wire_syntax') invalid('ORIGIN_DRIFT');
      if (!issue.invocation?.roleRef?.id?.startsWith('faction.' + faction + '.'))
        continue;
      const item = { ...selected, roleId: issue.invocation.roleRef.id,
        contextHash: issue.invocation.contextManifestRef.hash,
        expiresAt: issue.quarantineReceiptRef.expiresAt,
        outputTextHash: issue.rawBinding.outputTextHash };
      (archived.has(originKey(selected)) ? archivedOrigins : origins).push(item);
    }
  } finally { db.close(); }
  const selectedKeys = new Set(origins.map(originKey));
  const quarantineRoleIds = continuation.steps.filter(row =>
    [...artifactOriginKeys(row.artifact)].some(key =>
      selectedKeys.has(key))).map(row => row.id).sort();
  if (new Set(quarantineRoleIds).size !== quarantineRoleIds.length
    || origins.some(origin => !Number.isFinite(Date.parse(origin.expiresAt))))
    invalid('PLAN_DRIFT');
  return seal({ version: binding.version, bindingHash: binding.hash,
    inputHash: input.hash,
    origins: origins.sort((a, b) => originKey(a).localeCompare(originKey(b))),
    quarantineRoleIds, archivedOrigins: archivedOrigins.sort((a, b) =>
      originKey(a).localeCompare(originKey(b))), providerCalls: 0,
    semanticAcceptanceInherited: false, runtimeAccepted: false,
    trainingTruth: false });
}

export function withFactionVolatileStructuralStoreV1({ directStore,
  inheritedStore, plan = null, plans = null }) {
  const selectedPlans = plans || [plan];
  if (!Array.isArray(selectedPlans) || !selectedPlans.length)
    invalid('PLAN_BINDING');
  selectedPlans.forEach(verifySeal);
  if (selectedPlans.some(row => row.bindingHash !== binding.hash))
    invalid('PLAN_BINDING');
  const quarantined = new Set(selectedPlans.flatMap(row =>
    row.quarantineRoleIds));
  return Object.freeze({ ...inheritedStore, acquire(id, input, ttl) {
    return (quarantined.has(id) ? directStore : inheritedStore)
      .acquire(id, input, ttl);
  } });
}

export function withFactionVolatileStructuralRuntimeV1({ filename, recipe,
  input, executionPolicy, structuralRuntime, fallbackRuntime, plan,
  onProgress = () => {} }) {
  [recipe, input, plan].forEach(verifySeal);
  if (plan.bindingHash !== binding.hash || plan.inputHash !== input.hash)
    invalid('RUNTIME_PLAN');
  const selected = new Set(plan.origins.map(originKey));
  return Object.freeze({ async role(request) {
    if (!selected.size) return structuralRuntime.role(request);
    const prepared = prepareFactionSlotReviewRoleV1({ input, request,
      executionPolicy });
    const origin = prepared && readFactionStructuralReviewOriginV1({
      filename, currentRunId: null, origins: plan.origins, prepared });
    if (!origin || !selected.has(originKey(origin)))
      return structuralRuntime.role(request);
    const expected = plan.origins.find(row => originKey(row) ===
      originKey(origin));
    if (origin.issueHash !== expected.issueHash
      || prepared.roleInput.roleRef.id !== expected.roleId)
      invalid('RUNTIME_ORIGIN');
    onProgress({ action: 'fresh-full-context-reissue',
      fullRoleId: prepared.fullRoleId, originRunId: origin.runId,
      originAttemptId: origin.attemptId, rawExpiresAt: expected.expiresAt,
      oldFailurePreserved: true, providerCallsInherited: 0 });
    return fallbackRuntime.role(request);
  } });
}
