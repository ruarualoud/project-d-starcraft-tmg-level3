import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fail, hash, verifySeal } from '../skill-production/common.mjs';
import { createFactionWireRecoveryEnvironmentV2 } from './faction-wire-recovery-environment-v2.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../structured-generation/structured-runtime-selection-v2.mjs';
import { createStarcraftTmgContextCapsuleRegistryV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../structured-generation/failure-classifier-v2.mjs';
import { authenticateOpeningFenceRecoveryV1, AUTHENTICATED_OPENING_FENCE_RECOVERY_BINDING_V1 as binding } from '../structured-generation/authenticated-opening-fence-recovery-v1.mjs';
import { openFactionHostRecoveryTrustV1 } from './recovery-attestation-host-policy-v1.mjs';

// Shared by a future production entrypoint and its independent consumer. This
// loader has only read access to the origin journal and cannot call a Provider.
// A bare saved proof/diagnosis is never sufficient to populate this environment.
export async function loadFactionOpeningFenceEnvironmentV1({ filename, origins, egressBinding, helperRef,
  recoveryTrust = undefined, root = process.cwd() }) {
  if (!Array.isArray(origins) || !origins.length || origins.length > 7) fail('FACTION_OPENING_FENCE_ORIGINS_INVALID');
  const deny = () => fail('FACTION_OPENING_FENCE_ORIGIN_READ_ONLY');
  const query = fn => { const db = new DatabaseSync(filename, { readOnly: true });
    try {
      if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
      return fn(db);
    } finally { db.close(); } };
  const handles = new Map(), proofs = [], capabilities = {};
  // This is an explicit pinned Host trust policy. Passing null opts into the
  // frozen raw-only protocol (including its expiry failure).
  const trust = recoveryTrust === undefined
    ? await openFactionHostRecoveryTrustV1({ root: path.resolve(root), filename }) : recoveryTrust;
  for (const { runId, attemptId, prepared, executionPolicy } of origins) {
    if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId || '') || !/^structured-[a-f0-9]{48}$/u.test(attemptId || ''))
      fail('FACTION_OPENING_FENCE_ORIGIN_ID_INVALID');
    const artifact = id => query(db => {
      const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
      return row && verifySeal(JSON.parse(row.artifact)).value;
    });
    const issue = verifySeal(artifact(attemptId + '.wire-issue-v2'));
    if (issue.runId !== runId || issue.attemptId !== attemptId || issue.invocation.contextManifestRef.hash !== prepared.capsule.hash
      || hash(issue.invocation.roleRef) !== hash(prepared.roleRef) || hash(executionPolicy) !== issue.invocation.executionPolicyRef.hash)
      fail('FACTION_OPENING_FENCE_PREPARED_CONTEXT_DRIFT');
    const capability = query(db => {
      const row = db.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=? LIMIT 1")
        .get(issue.invocation.capabilityReceiptHash);
      return row && verifySeal(JSON.parse(row.response)).value.capabilityReceipt;
    });
    if (!capability || capability.receiptHash !== issue.invocation.capabilityReceiptHash) fail('FACTION_OPENING_FENCE_CAPABILITY_MISSING');
    const originStore = { summary: () => ({ runId }), artifact,
      globalSummary: () => query(() => ({ attempts: [] })),
      acquire: deny, finish: deny, release: deny, reserve: deny, settle: deny };
    const reconstructedRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
      requestId: attemptId, roleRef: prepared.capsule.roleRef, instructions: prepared.capsule.instructions,
      input: prepared.capsule.compiledInput, outputContractRef: prepared.capsule.outputContractRef,
      maxOutputUnits: executionPolicy.maxOutputUnits };
    const archive = () => trust?.read({ originRunId: runId, originAttemptId: attemptId,
      proofBindingHash: binding.hash, reconstructedRequest }) || null;
    const attested = archive();
    if (attested) {
      if (handles.has(attested.proof.hash) || proofs.some(p => p.contextManifestRef.hash === attested.proof.contextManifestRef.hash))
        fail('FACTION_OPENING_FENCE_ORIGIN_DUPLICATE');
      handles.set(attested.proof.hash, async () => archive()); proofs.push(attested.proof);
      capabilities[capability.receiptHash] = capability;
      continue; // No quarantine adapter/key/raw access for an archived proof.
    }
    const wireRecovery = await createFactionWireRecoveryEnvironmentV2({ filename, runId, helperRef,
      providers: [{ egressBinding, send: deny }] });
    const wireRuntime = createStructuredRuntimeWithWireRecoveryV2({ store: originStore, wireRecovery,
      providerAdapter: wireRecovery.adapters.get(egressBinding.providerProfileRef.hash), egressBinding,
      priceUsage: deny, classifyFailure: classifyStarcraftTmgStructuredFailureV2,
      contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({ entries: [prepared.capsule] }),
      outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [prepared.contract] }),
      executionPolicyRegistry: { resolve: q => hash(q.executionPolicyRef) === hash(issue.invocation.executionPolicyRef)
        && hash(q.roleRef) === hash(prepared.roleRef) && hash(q.outputContractRef) === hash(prepared.job.outputContractRef)
        ? { ok: true, executionPolicy } : { ok: false } },
      capabilityReceiptRegistry: { resolve: () => ({ ok: true, capabilityReceipt: capability }) } });
    const authenticate = () => authenticateOpeningFenceRecoveryV1({ wireRuntime, issue, contract: prepared.contract, binding });
    const result = await authenticate();
    if (handles.has(result.proof.hash) || proofs.some(p => p.contextManifestRef.hash === result.proof.contextManifestRef.hash))
      fail('FACTION_OPENING_FENCE_ORIGIN_DUPLICATE');
    handles.set(result.proof.hash, authenticate); proofs.push(result.proof);
    capabilities[capability.receiptHash] = capability;
  }
  return Object.freeze({ binding, proofs: Object.freeze(proofs), capabilities: Object.freeze(capabilities),
    async authenticate(proof) {
      const read = handles.get(verifySeal(proof).hash);
      if (!read) fail('FACTION_OPENING_FENCE_ORIGIN_NOT_AUTHENTICATED');
      return read();
    } });
}
