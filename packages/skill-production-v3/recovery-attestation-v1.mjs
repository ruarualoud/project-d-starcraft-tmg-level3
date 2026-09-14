import { createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V1 as structural } from '../structured-generation/authenticated-structural-json-recovery-v1.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 as parsed } from '../structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { AUTHENTICATED_OPENING_FENCE_RECOVERY_BINDING_V1 as fence } from '../structured-generation/authenticated-opening-fence-recovery-v1.mjs';

export const RECOVERY_ATTESTATION_BINDING_V1 = seal({
  version: 'skill_recovery_attestation_v1', game: 'starcraft-tmg', algorithm: 'ed25519',
  purpose: 'authenticated_recovered_representation_not_semantic_acceptance',
  sourceBindingHashes: [structural.hash, parsed.hash, fence.hash],
  freshAuthenticationRequiredToIssue: true, originalRawTtlUnchanged: true,
  expiredOriginalCannotBeNewlyAttested: true, archivedProofHashUnchanged: true,
  verifierRequiresExternallyPinnedIssuer: true, actualJournalAndReconstructedRequestRequired: true,
  oldProtocolsNotSilentlyUpgraded: true, sourceOrStrategyAcceptance: false,
  runtimeAccepted: false, trainingTruth: false,
});
const binding = RECOVERY_ATTESTATION_BINDING_V1;
const invalid = code => fail('RECOVERY_ATTESTATION_' + code);
const bytes = content => Buffer.from(binding.version + '\n' + hash(content), 'utf8');
const instant = value => {
  const n = Date.parse(value); if (!Number.isFinite(n)) invalid('CLOCK_INVALID'); return n;
};

// Private key never leaves this issuer and is not written to disk. Verification
// needs only the immutable public descriptor pinned by the local Host. This is
// a local development issuer, not a remotely managed production trust root.
export function createLocalRecoveryAttestorV1() {
  const keys = generateKeyPairSync('ed25519');
  const der = keys.publicKey.export({ type: 'spki', format: 'der' });
  const descriptor = seal({ version: 'local_recovery_attestor_v1', algorithm: 'ed25519',
    keyId: sha256(der), publicKeySpkiBase64: der.toString('base64'),
    trustScope: 'explicitly_pinned_local_development_host', remoteProductionAuthority: false });
  return Object.freeze({ descriptor,
    sign: content => sign(null, bytes(content), keys.privateKey).toString('base64') });
}

function verifyOrigin(proof, origin, reconstructedRequest) {
  [proof, origin.recipe, origin.issue].forEach(verifySeal);
  const { issue, recipe, attempt } = origin;
  const type = [structural, parsed, fence].find(b => b.hash === proof.bindingHash);
  if (!type || proof.version !== type.version + '.authenticated'
    || issue.runId !== 'faction-v1-' + recipe.hash.slice(0, 20) || attempt.run !== issue.runId
    || attempt.id !== issue.attemptId || proof.originRunId !== issue.runId || proof.originAttemptId !== issue.attemptId
    || proof.originalWireIssueHash !== issue.hash || proof.originalRequestHash !== issue.providerRequestHash
    || hash(reconstructedRequest) !== issue.providerRequestHash || reconstructedRequest.requestId !== issue.attemptId
    || hash(proof.invocation) !== hash(issue.invocation)
    || proof.contextManifestRef.hash !== issue.invocation.contextManifestRef.hash
    || hash(proof.outputContractRef) !== hash(issue.outputContractRef)
    || proof.providerProfileHash !== issue.providerProfileHash
    || proof.quarantineRecordHash !== issue.quarantineReceiptRef?.recordHash
    || proof.outputTextHash !== issue.rawBinding.outputTextHash
    || proof.originalProviderReceiptHash !== issue.originalProviderReceiptHash
    || hash(proof.originalUsage) !== hash(issue.usage)
    || issue.class !== 'wire_syntax' || issue.rawPayloadPersisted !== true
    || attempt.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || !Number.isSafeInteger(attempt.settled) || attempt.settled < 0
    || proof.additionalProviderAttempts !== 0 || proof.semanticAcceptanceInherited !== false
    || proof.runtimeAccepted !== false || proof.trainingTruth !== false) invalid('ORIGIN_DRIFT');
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const { receiptHash, ...receiptBody } = receipt;
  const usage = verifySeal(JSON.parse(attempt.usage)).value;
  const reportedUsage = { input: usage.inputUnits, output: usage.outputUnits, total: usage.totalUnits,
    cacheHit: usage.inputCacheHitUnits || 0, cacheMiss: usage.inputCacheMissUnits ?? usage.inputUnits - (usage.inputCacheHitUnits || 0),
    estimatedCny: attempt.settled / 1e6 };
  if (receiptHash !== hash(receiptBody) || receiptHash !== issue.originalProviderReceiptHash
    || hash(receipt.usage) !== hash(usage) || hash(reportedUsage) !== hash(issue.usage)
    || attempt.request_hash !== hash(reconstructedRequest)) invalid('PAID_JOURNAL_DRIFT');
  return { expiresAt: issue.quarantineReceiptRef.expiresAt, recipeHash: recipe.hash,
    originalAttemptSnapshotHash: hash(attempt) };
}

export async function issueRecoveryAttestationV1({ authenticateFresh, readOrigin, reconstructedRequest, issuer,
  now = () => new Date().toISOString() }) {
  if (typeof authenticateFresh !== 'function' || typeof readOrigin !== 'function' || typeof issuer?.sign !== 'function')
    invalid('ISSUER_DEPENDENCIES');
  verifySeal(issuer.descriptor);
  const began = now(), actual = await authenticateFresh();
  if (!actual || !/^[a-f0-9]{64}$/u.test(actual.accessReceiptHash || '')) invalid('FRESH_ACCESS_REQUIRED');
  const origin = readOrigin(actual.proof), checked = verifyOrigin(actual.proof, origin, reconstructedRequest);
  const issuedAt = now();
  if (instant(issuedAt) < instant(began) || instant(issuedAt) >= instant(checked.expiresAt)) invalid('ISSUANCE_WINDOW_CLOSED');
  const content = seal({ version: binding.version, bindingHash: binding.hash, issuerHash: issuer.descriptor.hash,
    issuedAt, authenticatedAtOrAfter: began, rawExpiresAt: checked.expiresAt,
    authenticatedProof: actual.proof, freshAccessReceiptHash: actual.accessReceiptHash,
    originRecipeHash: checked.recipeHash, originalAttemptSnapshotHash: checked.originalAttemptSnapshotHash,
    reconstructedRequestHash: hash(reconstructedRequest), originalRawTtlChanged: false,
    originalFailedAttemptChanged: false, originalProofHashChanged: false,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
  return seal({ content, issuerRef: { hash: issuer.descriptor.hash, keyId: issuer.descriptor.keyId },
    signatureAlgorithm: 'ed25519', signature: issuer.sign(content) });
}

// `trustedIssuer` must come from an explicitly bound Host registry/recipe, never
// the same untrusted artifact being checked. No private key or raw access.
export function verifyRecoveryAttestationV1({ attestation, trustedIssuer, expectedProofHash, readOrigin,
  reconstructedRequest, now = new Date().toISOString() }) {
  [attestation, trustedIssuer, attestation.content].forEach(verifySeal);
  const { content } = attestation;
  const der = Buffer.from(trustedIssuer.publicKeySpkiBase64, 'base64');
  if (trustedIssuer.version !== 'local_recovery_attestor_v1' || trustedIssuer.algorithm !== 'ed25519'
    || trustedIssuer.keyId !== sha256(der) || trustedIssuer.trustScope !== 'explicitly_pinned_local_development_host'
    || trustedIssuer.remoteProductionAuthority !== false || attestation.issuerRef.hash !== trustedIssuer.hash
    || attestation.issuerRef.keyId !== trustedIssuer.keyId || content.issuerHash !== trustedIssuer.hash
    || attestation.signatureAlgorithm !== 'ed25519' || content.version !== binding.version || content.bindingHash !== binding.hash
    || content.authenticatedProof.hash !== expectedProofHash || content.originalRawTtlChanged !== false
    || content.originalFailedAttemptChanged !== false || content.originalProofHashChanged !== false
    || content.semanticAcceptance !== false || content.runtimeAccepted !== false || content.trainingTruth !== false
    || content.reconstructedRequestHash !== hash(reconstructedRequest)
    || instant(content.authenticatedAtOrAfter) > instant(content.issuedAt)
    || instant(content.issuedAt) >= instant(content.rawExpiresAt) || instant(now) < instant(content.issuedAt)) invalid('RECORD_DRIFT');
  const key = createPublicKey({ key: der, format: 'der', type: 'spki' });
  if (key.asymmetricKeyType !== 'ed25519'
    || !verify(null, bytes(content), key, Buffer.from(attestation.signature, 'base64'))) invalid('SIGNATURE_INVALID');
  const checked = verifyOrigin(content.authenticatedProof, readOrigin(content.authenticatedProof), reconstructedRequest);
  if (checked.recipeHash !== content.originRecipeHash || checked.expiresAt !== content.rawExpiresAt
    || checked.originalAttemptSnapshotHash !== content.originalAttemptSnapshotHash) invalid('JOURNAL_CHANGED');
  return { proof: content.authenticatedProof, attestationHash: attestation.hash,
    authenticationMode: 'pinned_host_attestation_issued_while_original_was_available',
    freshRawReadPerformed: false, expiredRawAccessPerformed: false, semanticAcceptance: false };
}
