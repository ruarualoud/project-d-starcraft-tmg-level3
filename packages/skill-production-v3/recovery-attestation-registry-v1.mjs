import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { RECOVERY_ATTESTATION_BINDING_V1, verifyRecoveryAttestationV1 } from './recovery-attestation-v1.mjs';

// Explicit Host-selected trust inventory. Never discover keys/proofs from a
// directory or accept the public key bundled with the value being verified.
export const RECOVERY_ATTESTATION_REGISTRY_BINDING_V1 = seal({
  version: 'skill_recovery_attestation_registry_v1', game: 'starcraft-tmg',
  attestationBindingHash: RECOVERY_ATTESTATION_BINDING_V1.hash,
  trustScope: 'explicitly_pinned_local_development_host',
  callerMustPinRegistryHash: true, reconstructedFullRequestRequired: true,
  originalJournalReadOnly: true, rawQuarantineAccess: false, providerCalls: 0,
  preservesOriginalProofAndFailure: true, semanticAcceptance: false,
  runtimeAccepted: false, trainingTruth: false,
});
const binding = RECOVERY_ATTESTATION_REGISTRY_BINDING_V1;
const invalid = suffix => fail('RECOVERY_ATTESTATION_REGISTRY_' + suffix);
const digest = value => /^[a-f0-9]{64}$/u.test(value || '');
const scope = row => row.originRunId + '/' + row.originAttemptId + '/' + row.proofBindingHash;
const prefix = 'build/ticket-18-faction-production-v1/';
const legalFile = file => typeof file === 'string' && file.startsWith(prefix)
  && file.endsWith('.json') && !file.split('/').some(p => !p || p === '.' || p === '..')
  && /^[a-zA-Z0-9._/-]+$/u.test(file);

export function createRecoveryAttestationRegistryV1({ entries, sourceReportHash }) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 512 || !digest(sourceReportHash)) invalid('INPUT');
  const issuers = new Map();
  const proofs = entries.map(({ attestation, issuer, file }) => {
    [attestation, attestation.content, issuer].forEach(verifySeal);
    const p = attestation.content.authenticatedProof;
    verifySeal(p);
    if (!legalFile(file) || attestation.content.issuerHash !== issuer.hash
      || attestation.content.bindingHash !== RECOVERY_ATTESTATION_BINDING_V1.hash) invalid('ENTRY');
    issuers.set(issuer.hash, issuer);
    return { file, attestationHash: attestation.hash, issuerHash: issuer.hash,
      proofHash: p.hash, proofBindingHash: p.bindingHash, originRunId: p.originRunId,
      originAttemptId: p.originAttemptId, contextHash: p.contextManifestRef.hash,
      requestHash: attestation.content.reconstructedRequestHash };
  }).sort((a, b) => scope(a).localeCompare(scope(b)));
  if (new Set(proofs.map(scope)).size !== proofs.length
    || new Set(proofs.map(p => p.proofHash)).size !== proofs.length) invalid('DUPLICATE');
  return seal({ version: binding.version, bindingHash: binding.hash, sourceReportHash,
    trustedIssuers: [...issuers.values()].sort((a, b) => a.hash.localeCompare(b.hash)), proofs,
    scope: binding.trustScope, remoteProductionAuthority: false,
    originalRawTtlChanged: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
}

export async function openRecoveryAttestationRegistryV1({ root, filename, registry, expectedRegistryHash,
  now = () => new Date().toISOString() }) {
  verifySeal(registry);
  if (!digest(expectedRegistryHash) || registry.hash !== expectedRegistryHash || registry.version !== binding.version
    || registry.bindingHash !== binding.hash || registry.scope !== binding.trustScope
    || registry.remoteProductionAuthority !== false || registry.originalRawTtlChanged !== false
    || registry.semanticAcceptance !== false || registry.runtimeAccepted !== false || registry.trainingTruth !== false
    || !Array.isArray(registry.proofs) || !registry.proofs.length || registry.proofs.length > 512
    || !Array.isArray(registry.trustedIssuers) || !registry.trustedIssuers.length) invalid('PIN_REQUIRED');
  const directory = await realpath(path.join(root, prefix));
  const read = async file => {
    if (!legalFile(file)) invalid('PATH_SCOPE');
    const resolved = await realpath(path.join(root, file));
    if (!resolved.startsWith(directory + path.sep)) invalid('PATH_ESCAPE');
    return verifySeal(JSON.parse(await readFile(resolved, 'utf8')));
  };
  const rows = new Map(), owners = new Map(), attested = [];
  const issuers = new Map(registry.trustedIssuers.map(i => [verifySeal(i).hash, i]));
  if (issuers.size !== registry.trustedIssuers.length) invalid('DUPLICATE_ISSUER');
  for (const row of registry.proofs) {
    if (!/^faction-v1-[a-f0-9]{20}$/u.test(row.originRunId || '')
      || !/^structured-[a-f0-9]{48}$/u.test(row.originAttemptId || '') || rows.has(scope(row))
      || !['attestationHash', 'issuerHash', 'proofHash', 'proofBindingHash', 'contextHash', 'requestHash'].every(k => digest(row[k]))) invalid('INDEX');
    const attestation = await read(row.file), issuer = issuers.get(row.issuerHash);
    if (!issuer || attestation.hash !== row.attestationHash) invalid('ARTIFACT_DRIFT');
    const p = attestation.content.authenticatedProof;
    if (p.hash !== row.proofHash || p.bindingHash !== row.proofBindingHash || p.originRunId !== row.originRunId
      || p.originAttemptId !== row.originAttemptId || p.contextManifestRef.hash !== row.contextHash
      || attestation.content.reconstructedRequestHash !== row.requestHash) invalid('INDEX_DRIFT');
    rows.set(scope(row), { row, attestation, issuer });
    attested.push({ attestation, issuer, file: row.file });
    if (!owners.has(row.originRunId)) owners.set(row.originRunId, await read(prefix + row.originRunId + '/recipe.json'));
  }
  if (createRecoveryAttestationRegistryV1({ entries: attested, sourceReportHash: registry.sourceReportHash }).hash !== registry.hash)
    invalid('MANIFEST_DRIFT');
  return Object.freeze({ registryHash: registry.hash, binding,
    read({ originRunId, originAttemptId, proofBindingHash, reconstructedRequest, expectedProofHash = null }) {
      const found = rows.get(scope({ originRunId, originAttemptId, proofBindingHash }));
      if (!found) return null; // No permission for an unlisted origin; caller may use the original fresh protocol.
      if (hash(reconstructedRequest) !== found.row.requestHash || expectedProofHash && expectedProofHash !== found.row.proofHash)
        invalid('REQUEST_DRIFT');
      const db = new DatabaseSync(filename, { readOnly: true });
      try {
        if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
          fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
        return verifyRecoveryAttestationV1({ attestation: found.attestation, trustedIssuer: found.issuer,
          expectedProofHash: found.row.proofHash, reconstructedRequest, now: now(), readOrigin: proof => {
            const recipe = owners.get(proof.originRunId);
            if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(proof.originRunId)?.recipe !== recipe?.hash) invalid('OWNER_DRIFT');
            const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
              .get(proof.originRunId, proof.originAttemptId + '.wire-issue-v2');
            const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(proof.originRunId, proof.originAttemptId);
            if (!row || !attempt) invalid('JOURNAL_MISSING');
            return { recipe, issue: verifySeal(JSON.parse(row.artifact)).value, attempt };
          } });
      } finally { db.close(); }
    } });
}
