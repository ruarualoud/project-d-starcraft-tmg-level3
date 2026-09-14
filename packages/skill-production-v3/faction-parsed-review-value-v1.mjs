import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { DatabaseSync } from 'node:sqlite';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 as recoveryBinding } from '../structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

export const FACTION_PARSED_REVIEW_VALUE_BINDING_V1 = seal({
  version: 'faction_parsed_review_value_v1', recoveryBindingHash: recoveryBinding.hash,
  outputContractHash: contract.contractHash, schemaValidAfterSyntaxRecoveryOnly: true,
  nativeProviderSuccessInvented: false, everyReadReauthenticated: true,
  originalFailureAndCostPreserved: true, additionalProviderAttempts: 0,
  hostMappingStillRequired: true, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
});
const binding = FACTION_PARSED_REVIEW_VALUE_BINDING_V1;
const invalid = code => fail('FACTION_PARSED_REVIEW_VALUE_' + code);

// V1 remains byte-frozen for strictly schema-valid parsed wire values. V2
// removes only per-field character ceilings from narrative review text. The
// Provider token/cost boundary and the portable artifact-size guard remain the
// finite resource controls; structure, coordinates, types and source slots do
// not change.
export const FACTION_PARSED_REVIEW_VALUE_BINDING_V2 = seal({
  version: 'faction_parsed_review_value_v2', recoveryBindingHash: recoveryBinding.hash,
  outputContractHash: contract.contractHash,
  acceptedStrictIssues: [
    '$.verdicts[n].reason:string_too_long',
    '$.verdicts[n].focus[n].quote:string_too_long',
    '$.coverage[n].reason:string_too_long',
  ],
  perNarrativeFieldCharacterMaximum: null,
  legacyNarrativeThresholdsAreSoftAlerts: true,
  softAlertDoesNotBlockMaterialization: true,
  providerTokenAndCostLimitsPreserved: true,
  portableArtifactSafetyBoundaryPreserved: true,
  allNonNarrativeSchemaConstraintsPreserved: true,
  nativeProviderSuccessInvented: false, everyReadReauthenticated: true,
  originalFailureAndCostPreserved: true, additionalProviderAttempts: 0,
  hostMappingStillRequired: true, semanticAcceptance: false,
  runtimeAccepted: false, trainingTruth: false,
});
const narrativeBinding = FACTION_PARSED_REVIEW_VALUE_BINDING_V2;
const narrativePath = row => row?.code === 'string_too_long' && (
  /^\$\.verdicts\[[0-9]+\]\.reason$/u.test(row.path)
  || /^\$\.verdicts\[[0-9]+\]\.focus\[[0-9]+\]\.quote$/u.test(row.path)
  || /^\$\.coverage\[[0-9]+\]\.reason$/u.test(row.path));

export function inspectFactionReviewNarrativeCapacityV2(providerValue) {
  const strict = validate(contract.providerSchema, providerValue);
  if (strict.ok || !strict.issues.length || !strict.issues.every(narrativePath))
    invalid('NARRATIVE_CAPACITY_NOT_APPLICABLE');
  // The Provider schema subset requires maxLength on every string node, so a
  // second schema with that keyword deleted is itself invalid. Validate a
  // projection instead: replace only the three narrative strings with stable
  // short sentinels and leave every array, object, coordinate, enum and source
  // field untouched. The original value remains the materialized value.
  const projection = structuredClone(providerValue);
  const sentinel = (path, value) => `soft-length:${hash({ path, value })}`;
  for (const [verdictIndex, verdict] of (projection.verdicts || []).entries()) {
    if (typeof verdict?.reason === 'string') verdict.reason = sentinel(`verdicts.${verdictIndex}.reason`, verdict.reason);
    for (const [focusIndex, focus] of (verdict?.focus || []).entries()) {
      if (typeof focus?.quote === 'string')
        focus.quote = sentinel(`verdicts.${verdictIndex}.focus.${focusIndex}.quote`, focus.quote);
    }
  }
  for (const [coverageIndex, coverage] of (projection.coverage || []).entries()) {
    if (typeof coverage?.reason === 'string') coverage.reason = sentinel(`coverage.${coverageIndex}.reason`, coverage.reason);
  }
  const host = validate(contract.providerSchema, projection);
  if (!host.ok) invalid('NARRATIVE_CAPACITY_HOST_SCHEMA_INVALID');
  return seal({ version: 'faction_review_narrative_capacity_v2',
    bindingHash: narrativeBinding.hash, outputHash: hash(providerValue),
    strictValidationHash: hash(strict), hostValidationHash: hash(host),
    validationProjectionHash: hash(projection), originalNarrativePreserved: true,
    overflowPaths: strict.issues.map(row => row.path),
    softAlerts: strict.issues.map(row => ({ kind: 'narrative_length_above_legacy_contract',
      path: row.path, code: row.code, observed: row.actualLength ?? null,
      legacyMaximum: row.maxLength ?? null, action: 'continue' })),
    perNarrativeFieldCharacterMaximum: null,
    nonNarrativeSchemaPassed: true, providerCalls: 0,
    semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
}

export function readFactionReviewArtifactByHashV1({ filename, allowedRunIds,
  artifactHash = null, rejectedCandidateContextHash = null,
  rejectedCandidateRoleId = null }) {
  const byHash = /^[a-f0-9]{64}$/u.test(artifactHash || '');
  const byRejectedContext = /^[a-f0-9]{64}$/u.test(
    rejectedCandidateContextHash || '')
    && typeof rejectedCandidateRoleId === 'string'
    && rejectedCandidateRoleId.length > 0;
  if (byHash === byRejectedContext || !Array.isArray(allowedRunIds)
    || allowedRunIds.some(id => !/^faction-v1-[a-f0-9]{20}$/u.test(id))) invalid('ARTIFACT_SCOPE');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    for (const owner of allowedRunIds) {
      const rows = byHash
        ? db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.hash')=?")
          .all(owner, artifactHash)
        : db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete' AND json_extract(artifact,'$.value.contextManifestRef.hash')=? AND json_extract(artifact,'$.value.roleRef.id')=? AND json_extract(artifact,'$.value.version') LIKE '%rejected-candidate'")
          .all(owner, rejectedCandidateContextHash,
            rejectedCandidateRoleId);
      if (!rows.length) continue;
      if (rows.length !== 1) invalid('ARTIFACT_AMBIGUOUS');
      const row = rows[0];
      const value = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
      if (byHash ? value.hash !== artifactHash
        : value.contextManifestRef?.hash !== rejectedCandidateContextHash
          || value.roleRef?.id !== rejectedCandidateRoleId
          || !String(value.version).endsWith('rejected-candidate'))
        invalid('ARTIFACT_HASH_DRIFT');
      return value;
    }
    invalid('ARTIFACT_MISSING');
  } finally { db.close(); }
}

export function inspectFactionParsedReviewValueV1({ capsule, authenticated }) {
  [capsule, authenticated].forEach(verifySeal);
  const proof = authenticated, validation = validate(contract.providerSchema, proof.providerValue);
  if (proof.version !== recoveryBinding.version + '.authenticated' || proof.bindingHash !== recoveryBinding.hash
    || capsule.kind !== 'whole_section_review_context' || capsule.outputContractRef.hash !== contract.contractHash
    || proof.outputContractRef.hash !== contract.contractHash || proof.contextManifestRef.hash !== capsule.hash
    || hash(proof.invocation.roleRef) !== hash(capsule.roleRef) || proof.invocation.contextManifestRef.hash !== capsule.hash
    || proof.normalization.outputHash !== hash(proof.providerValue)
    || proof.normalization.localSchemaValidationHash !== hash(validation)
    || proof.normalization.schemaPassed !== true || proof.normalization.fieldsRemoved !== 0
    || proof.normalization.scalarEdits !== 0 || proof.normalization.appendedCharacters !== 0
    || proof.normalization.parsedValueCount !== 1 || proof.normalization.exhaustiveSearchCompleted !== true
    || !validation.ok || hash(validation) !== hash(proof.validation)
    || proof.additionalProviderAttempts !== 0 || proof.originalFailurePreserved !== true
    || proof.nativeSuccessReceiptInvented !== false || proof.semanticAcceptanceInherited !== false
    || proof.runtimeAccepted !== false || proof.trainingTruth !== false) invalid('ORIGIN_INVALID');
  return proof.providerValue;
}

export function inspectFactionParsedReviewValueV2({ capsule, authenticated }) {
  [capsule, authenticated].forEach(verifySeal);
  const proof = authenticated, validation = validate(contract.providerSchema, proof.providerValue);
  const capacity = inspectFactionReviewNarrativeCapacityV2(proof.providerValue);
  if (proof.version !== recoveryBinding.version + '.authenticated' || proof.bindingHash !== recoveryBinding.hash
    || capsule.kind !== 'whole_section_review_context' || capsule.outputContractRef.hash !== contract.contractHash
    || proof.outputContractRef.hash !== contract.contractHash || proof.contextManifestRef.hash !== capsule.hash
    || hash(proof.invocation.roleRef) !== hash(capsule.roleRef) || proof.invocation.contextManifestRef.hash !== capsule.hash
    || proof.normalization.outputHash !== hash(proof.providerValue)
    || proof.normalization.localSchemaValidationHash !== hash(validation)
    || proof.normalization.schemaPassed !== false || proof.normalization.fieldsRemoved !== 0
    || proof.normalization.scalarEdits !== 0 || proof.normalization.appendedCharacters !== 0
    || proof.normalization.parsedValueCount !== 1 || proof.normalization.exhaustiveSearchCompleted !== true
    || validation.ok || hash(validation) !== hash(proof.validation)
    || proof.additionalProviderAttempts !== 0 || proof.originalFailurePreserved !== true
    || proof.nativeSuccessReceiptInvented !== false || proof.semanticAcceptanceInherited !== false
    || proof.runtimeAccepted !== false || proof.trainingTruth !== false) invalid('NARRATIVE_CAPACITY_ORIGIN_INVALID');
  return { output: proof.providerValue, capacity };
}

export function verifyFactionParsedReviewValueRecordV1({ record, capsule, authenticated, dshBindingHash }) {
  [record, capsule, authenticated].forEach(verifySeal);
  const output = inspectFactionParsedReviewValueV1({ capsule, authenticated });
  if (record.version !== binding.version || record.bindingHash !== binding.hash
    || record.originalContextHash !== capsule.hash || hash(record.authenticatedProof) !== hash(authenticated)
    || record.additionalProviderAttempts !== 0 || record.nativeProviderSuccessInvented !== false
    || record.semanticAcceptance !== false || record.trainingTruth !== false) invalid('RECORD_DRIFT');
  const loop = verifySeal(record.loop), command = { action: 'finish', content: output };
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.toolTrace.length || loop.transcript.length !== 1 || loop.transcript[0].call !== 1
    || loop.transcript[0].receiptHash !== authenticated.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command)) || hash(loop.final) !== hash(output)
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false) invalid('DSH_DRIFT');
  return { output, providerReceiptHashes: [authenticated.originalProviderReceiptHash], additionalProviderAttempts: 0 };
}

export function verifyFactionParsedReviewValueRecordV2({ record, capsule, authenticated, dshBindingHash }) {
  [record, capsule, authenticated].forEach(verifySeal);
  const inspected = inspectFactionParsedReviewValueV2({ capsule, authenticated });
  if (record.version !== narrativeBinding.version || record.bindingHash !== narrativeBinding.hash
    || record.originalContextHash !== capsule.hash || hash(record.authenticatedProof) !== hash(authenticated)
    || record.capacityProof?.hash !== inspected.capacity.hash
    || record.additionalProviderAttempts !== 0 || record.nativeProviderSuccessInvented !== false
    || record.semanticAcceptance !== false || record.trainingTruth !== false)
    invalid('NARRATIVE_CAPACITY_RECORD_DRIFT');
  const loop = verifySeal(record.loop), command = { action: 'finish', content: inspected.output };
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.toolTrace.length || loop.transcript.length !== 1 || loop.transcript[0].call !== 1
    || loop.transcript[0].receiptHash !== authenticated.hash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || hash(loop.final) !== hash(inspected.output) || loop.directNetworkUsed !== false
    || loop.trainingTruth !== false) invalid('NARRATIVE_CAPACITY_DSH_DRIFT');
  return { output: inspected.output,
    providerReceiptHashes: [authenticated.originalProviderReceiptHash], additionalProviderAttempts: 0 };
}

export async function materializeFactionParsedReviewValueV1({ capsule, readAuthenticated, store, dsh }) {
  const stop = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  stop();
  const actual = await readAuthenticated();
  if (!actual) invalid('AUTHENTICATION_MISSING');
  const output = inspectFactionParsedReviewValueV1({ capsule, authenticated: actual.proof });
  const id = actual.proof.originAttemptId + '.parsed-review-value-v1';
  const lease = store.acquire(id, { proofHash: actual.proof.hash, capsuleHash: capsule.hash,
    bindingHash: binding.hash, dshBindingHash: dsh.binding.hash });
  try {
    let record;
    if (lease.cached) record = verifySeal(lease.artifact);
    else {
      const loop = await dsh.run({ task: 'Materialize the authenticated schema-valid parsed value unchanged; no new judgment or Provider request.',
        callModel: async () => { stop(); return { command: { action: 'finish', content: output },
          receiptHash: actual.proof.hash, usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0 } }; },
        toolPort: { execute: () => invalid('TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
        limits: { maxCalls: 1, maxTools: 0, maxOutput: 65536, maxWallMs: 180000 } });
      record = seal({ version: binding.version, bindingHash: binding.hash, originalContextHash: capsule.hash,
        authenticatedProof: actual.proof, loop, additionalProviderAttempts: 0,
        nativeProviderSuccessInvented: false, semanticAcceptance: false, trainingTruth: false });
    }
    const fresh = await readAuthenticated();
    if (!fresh || fresh.proof.hash !== actual.proof.hash) invalid('AUTHENTICATION_DRIFT');
    verifyFactionParsedReviewValueRecordV1({ record, capsule, authenticated: fresh.proof, dshBindingHash: dsh.binding.hash });
    stop();
    return lease.cached ? record : store.finish(lease, record);
  } catch (error) { if (!lease.cached) store.release(lease); throw error; }
}

export async function materializeFactionParsedReviewValueV2({ capsule, readAuthenticated, store, dsh }) {
  const stop = () => {
    if (store.globalSummary().attempts.some(a => a.code === 'PROVIDER_PAYMENT_REQUIRED'))
      fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  };
  stop();
  const actual = await readAuthenticated();
  if (!actual) invalid('NARRATIVE_CAPACITY_AUTHENTICATION_MISSING');
  const inspected = inspectFactionParsedReviewValueV2({ capsule, authenticated: actual.proof });
  const id = actual.proof.originAttemptId + '.parsed-review-value-v2';
  const lease = store.acquire(id, { proofHash: actual.proof.hash, capsuleHash: capsule.hash,
    bindingHash: narrativeBinding.hash, dshBindingHash: dsh.binding.hash });
  try {
    let record;
    if (lease.cached) record = verifySeal(lease.artifact);
    else {
      const loop = await dsh.run({ task: 'Materialize the authenticated parsed review unchanged; narrative fields have no per-field character ceiling and all non-narrative schema constraints remain enforced.',
        callModel: async () => { stop(); return { command: { action: 'finish', content: inspected.output },
          receiptHash: actual.proof.hash, usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0 } }; },
        toolPort: { execute: () => invalid('NARRATIVE_CAPACITY_TOOLS_FORBIDDEN'), trace: () => [], readRefs: () => [] },
        limits: { maxCalls: 1, maxTools: 0, maxOutput: 65536, maxWallMs: 180000 } });
      record = seal({ version: narrativeBinding.version, bindingHash: narrativeBinding.hash,
        originalContextHash: capsule.hash, authenticatedProof: actual.proof,
        capacityProof: inspected.capacity, loop, additionalProviderAttempts: 0,
        nativeProviderSuccessInvented: false, semanticAcceptance: false, trainingTruth: false });
    }
    const fresh = await readAuthenticated();
    if (!fresh || fresh.proof.hash !== actual.proof.hash) invalid('NARRATIVE_CAPACITY_AUTHENTICATION_DRIFT');
    verifyFactionParsedReviewValueRecordV2({ record, capsule, authenticated: fresh.proof,
      dshBindingHash: dsh.binding.hash });
    stop();
    return lease.cached ? record : store.finish(lease, record);
  } catch (error) { if (!lease.cached) store.release(lease); throw error; }
}
