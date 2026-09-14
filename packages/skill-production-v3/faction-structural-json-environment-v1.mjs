import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fail, hash, verifySeal } from '../skill-production/common.mjs';
import { createFactionWireRecoveryEnvironmentV2 } from './faction-wire-recovery-environment-v2.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1 } from './faction-execution-model-v1.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../structured-generation/structured-runtime-selection-v2.mjs';
import { createStarcraftTmgContextCapsuleRegistryV1 } from '../structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1 } from '../structured-generation/output-contract-registry-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../structured-generation/failure-classifier-v2.mjs';
import { assertStarcraftTmgProviderCapabilityReceiptV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { authenticateStructuralJsonRecoveryV1,
  AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V1 as binding } from '../structured-generation/authenticated-structural-json-recovery-v1.mjs';
import { authenticateStructuralJsonRecoveryV2,
  AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 as parsedBinding } from '../structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2 } from './faction-structural-json-schema-bridge-v2.mjs';
import { openFactionHostRecoveryTrustV1 } from './recovery-attestation-host-policy-v1.mjs';

export async function createFactionParsedWireRecoveryReaderV2({ root, filename, runId, recipe }) {
  verifySeal(recipe);
  if (!recipe.parsedWireSchemaBridgeBinding) return null;
  const { assertFactionStructuralJsonRecipeV1 } = await import('./faction-structural-json-scope-v1.mjs');
  if (verifySeal(recipe.parsedWireSchemaBridgeBinding).hash !== FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2.hash
    || !assertFactionStructuralJsonRecipeV1(recipe)) fail('FACTION_PARSED_WIRE_SCHEMA_READER_BINDING_REQUIRED');
  return async prepared => {
    const origin = readFactionStructuralReviewOriginV1({ filename, currentRunId: runId,
      origins: recipe.structuralJsonReviewOrigins, prepared });
    if (!origin) return null;
    const ownerRecipe = origin.runId === runId ? recipe : verifySeal(JSON.parse(await readFile(path.join(root,
      'build/ticket-18-faction-production-v1', origin.runId, 'recipe.json'), 'utf8')));
    const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
      allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
      idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
    return authenticateFactionStructuralReviewV1({ filename, origin, ownerRecipe, prepared, executionPolicy,
      helperRef: recipe.wireKeyHelperRef, parsedRecoveryBinding: parsedBinding });
  };
}

export function readFactionStructuralReviewOriginV1({ filename, currentRunId = null, origins = [], prepared }) {
  const db = new DatabaseSync(filename, { readOnly: true });
  const decode = raw => verifySeal(JSON.parse(raw)).value;
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const matches = [];
    const consider = (issue, selected = null) => {
      verifySeal(issue);
      if (selected && (issue.runId !== selected.runId || issue.attemptId !== selected.attemptId || issue.hash !== selected.issueHash))
        fail('FACTION_STRUCTURAL_JSON_SELECTED_ORIGIN_DRIFT');
      if (issue.invocation?.roleRef?.hash !== prepared.roleInput.roleRef.hash) return;
      // An explicitly selected old role with a changed context must stop, not
      // disappear into a new paid call. Current unrelated roles are ignored.
      if (issue.invocation.contextManifestRef.hash !== prepared.capsule.hash) {
        if (selected) fail('FACTION_STRUCTURAL_JSON_SELECTED_CONTEXT_DRIFT');
        return;
      }
      if (issue.outputContractRef?.hash !== contract.contractHash || issue.class !== 'wire_syntax')
        fail('FACTION_STRUCTURAL_JSON_SELECTED_CONTRACT_DRIFT');
      const value = { runId: issue.runId, attemptId: issue.attemptId, issueHash: issue.hash };
      if (!matches.some(row => hash(row) === hash(value))) matches.push(value);
    };
    for (const selected of origins) {
      const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(selected.runId, selected.attemptId + '.wire-issue-v2');
      if (!row) fail('FACTION_STRUCTURAL_JSON_SELECTED_ORIGIN_MISSING');
      consider(decode(row.artifact), selected);
    }
    if (currentRunId) for (const row of db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.version')='structured_wire_runtime_v2.issue' AND json_extract(artifact,'$.value.invocation.contextManifestRef.hash')=?")
      .all(currentRunId, prepared.capsule.hash)) consider(decode(row.artifact));
    if (matches.length > 1) fail('FACTION_STRUCTURAL_JSON_ORIGIN_AMBIGUOUS');
    return matches[0] || null;
  } finally { db.close(); }
}

// No source-store mutation, credential or Provider port. The caller supplies a
// reconstructed full role, not just a saved request hash or a shortened prompt.
export async function authenticateFactionStructuralReviewV1({ filename, origin, ownerRecipe, prepared, executionPolicy, helperRef,
  parsedRecoveryBinding = null, recoveryTrust = undefined, root = process.cwd() }) {
  verifySeal(ownerRecipe);
  if (parsedRecoveryBinding && verifySeal(parsedRecoveryBinding).hash !== parsedBinding.hash)
    fail('FACTION_STRUCTURAL_JSON_PARSED_BINDING_INVALID');
  const { runId, attemptId, issueHash } = origin;
  const invalid = code => fail('FACTION_STRUCTURAL_JSON_' + code);
  if (runId !== 'faction-v1-' + ownerRecipe.hash.slice(0, 20)
    || !/^structured-[a-f0-9]{48}$/u.test(attemptId || '') || !/^[a-f0-9]{64}$/u.test(issueHash || '')) invalid('ORIGIN_INVALID');
  const query = fn => { const db = new DatabaseSync(filename, { readOnly: true });
    try {
      if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
        fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
      if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== ownerRecipe.hash) invalid('OWNER_DRIFT');
      return fn(db);
    } finally { db.close(); } };
  const artifact = id => query(db => {
    const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
    return row && verifySeal(JSON.parse(row.artifact)).value;
  });
  const issue = verifySeal(artifact(attemptId + '.wire-issue-v2'));
  const roleRef = prepared.roleInput.roleRef, outputContractRef = prepared.roleInput.outputContractRef;
  const policy = executionPolicy;
  if (issue.hash !== issueHash || issue.runId !== runId || issue.attemptId !== attemptId
    || issue.invocation.contextManifestRef.hash !== prepared.capsule.hash
    || hash(issue.invocation.roleRef) !== hash(roleRef)
    || outputContractRef.hash !== contract.contractHash
    || hash(issue.outputContractRef) !== hash(outputContractRef)
    || hash(policy) !== prepared.roleInput.executionPolicyRef.hash
    || hash(issue.invocation.executionPolicyRef) !== hash(prepared.roleInput.executionPolicyRef)) invalid('PREPARED_CONTEXT_DRIFT');
  const capability = query(db => {
    const rows = db.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
      .all(issue.invocation.capabilityReceiptHash);
    const values = rows.map(row => verifySeal(JSON.parse(row.response)).value.capabilityReceipt);
    if (!values.length || values.some(value => hash(value) !== hash(values[0]))) invalid('CAPABILITY_MISSING');
    return values[0];
  });
  const egressBinding = factionExecutionEgressV1(factionExecutionProfileV1({ binding: ownerRecipe.executionModelBinding }));
  assertStarcraftTmgProviderCapabilityReceiptV1(capability);
  if (egressBinding.providerProfileRef.hash !== issue.providerProfileHash
    || capability.providerProfileRef.hash !== issue.providerProfileHash
    || capability.probeResult !== 'accepted_schema_valid' || capability.capability !== 'responses_json_schema'
    || capability.model !== egressBinding.model || hash(capability.outputContractRef) !== hash(outputContractRef)) invalid('PROFILE_DRIFT');
  const deny = () => invalid('ORIGIN_READ_ONLY');
  const sourceStore = { summary: () => ({ runId }), artifact, globalSummary: () => query(() => ({ attempts: [] })),
    acquire: deny, finish: deny, release: deny, reserve: deny, settle: deny };
  const trust = recoveryTrust === undefined ? await openFactionHostRecoveryTrustV1({ root, filename }) : recoveryTrust;
  const reconstructedRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: attemptId,
    roleRef: prepared.capsule.roleRef, instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput,
    outputContractRef: prepared.capsule.outputContractRef, maxOutputUnits: executionPolicy.maxOutputUnits };
  const archived = trust?.read({ originRunId: runId, originAttemptId: attemptId,
    proofBindingHash: (parsedRecoveryBinding || binding).hash, reconstructedRequest });
  if (archived) return { ...archived, capability };
  if (!parsedRecoveryBinding && trust?.read({ originRunId: runId, originAttemptId: attemptId,
    proofBindingHash: parsedBinding.hash, reconstructedRequest }))
    invalid('ARCHIVED_PARSED_ROUTE_REQUIRED');
  const wireRecovery = await createFactionWireRecoveryEnvironmentV2({ filename, runId, helperRef,
    providers: [{ egressBinding, send: deny }] });
  const wireRuntime = createStructuredRuntimeWithWireRecoveryV2({ store: sourceStore, wireRecovery,
    providerAdapter: wireRecovery.adapters.get(egressBinding.providerProfileRef.hash), egressBinding,
    priceUsage: deny, classifyFailure: classifyStarcraftTmgStructuredFailureV2,
    contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({ entries: [prepared.capsule] }),
    outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [contract] }),
    executionPolicyRegistry: { resolve: q => hash(q.executionPolicyRef) === hash(prepared.roleInput.executionPolicyRef)
      && hash(q.roleRef) === hash(roleRef) && hash(q.outputContractRef) === hash(outputContractRef)
      ? { ok: true, executionPolicy: policy } : { ok: false } },
    capabilityReceiptRegistry: { resolve: () => ({ ok: true, capabilityReceipt: capability }) } });
  const authenticated = parsedRecoveryBinding
    ? await authenticateStructuralJsonRecoveryV2({ wireRuntime, issue, contract, binding: parsedRecoveryBinding })
    : await authenticateStructuralJsonRecoveryV1({ wireRuntime, issue, contract, binding });
  return { ...authenticated, capability };
}
