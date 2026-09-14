import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { createRecoveryAttestationRegistryV1, openRecoveryAttestationRegistryV1,
  RECOVERY_ATTESTATION_REGISTRY_BINDING_V1 as binding } from '../packages/skill-production-v3/recovery-attestation-registry-v1.mjs';
import { loadFactionParsedValueActualFixtureV1 } from './support/faction-parsed-value-actual-fixture-v1.mjs';

assert.equal(process.argv.length, 2);
const base = 'build/ticket-18-faction-production-v1/';
const archived = base + 'recovery-attestation-s2xpyv/';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const source = await json(archived + 'report.json'), issuer = await json(archived + 'issuer.json');
assert.equal(source.hash, '0e85cb6eeb08ecbdfe89c3ed278a76b8dd72155ea31263cdecf989e0c4336c6b');
const entries = await Promise.all(source.actualAttestations.map(async row => ({
  file: archived + row.proofHash + '.json', issuer, attestation: await json(archived + row.proofHash + '.json') })));
const registry = createRecoveryAttestationRegistryV1({ entries, sourceReportHash: source.hash });
const actual = await loadFactionParsedValueActualFixtureV1();
const original = new DatabaseSync(actual.filename, { readOnly: true });
const before = hash(original.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const proof = actual.authenticated.proof, capsule = actual.prepared.capsule;
const request = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: actual.origin.attemptId,
  roleRef: capsule.roleRef, instructions: capsule.instructions, input: capsule.compiledInput,
  outputContractRef: capsule.outputContractRef, maxOutputUnits: 4096 };
const q = { originRunId: actual.runId, originAttemptId: actual.origin.attemptId,
  proofBindingHash: proof.bindingHash, expectedProofHash: proof.hash, reconstructedRequest: request };
const options = { root: process.cwd(), filename: actual.filename, registry, expectedRegistryHash: registry.hash,
  now: () => '2026-09-12T00:00:00Z' };
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const opened = await openRecoveryAttestationRegistryV1(options);
const verified = opened.read(q);
eq(verified.proof.hash, proof.hash); eq(verified.freshRawReadPerformed, false);
eq(verified.expiredRawAccessPerformed, false); eq(verified.semanticAcceptance, false);
eq(opened.read({ ...q, originAttemptId: 'structured-' + '0'.repeat(48) }), null);
assert.throws(() => opened.read({ ...q, reconstructedRequest: { ...request, input: 'changed' } }), { code: 'RECOVERY_ATTESTATION_REGISTRY_REQUEST_DRIFT' }); checks++;
assert.throws(() => opened.read({ ...q, expectedProofHash: hash('wrong') }), { code: 'RECOVERY_ATTESTATION_REGISTRY_REQUEST_DRIFT' }); checks++;
await assert.rejects(openRecoveryAttestationRegistryV1({ ...options, expectedRegistryHash: hash('untrusted') }), { code: 'RECOVERY_ATTESTATION_REGISTRY_PIN_REQUIRED' }); checks++;
assert.throws(() => createRecoveryAttestationRegistryV1({ entries: [entries[0], entries[0]], sourceReportHash: source.hash }), { code: 'RECOVERY_ATTESTATION_REGISTRY_DUPLICATE' }); checks++;
assert.throws(() => createRecoveryAttestationRegistryV1({ entries: [{ ...entries[0], file: base + '../escape.json' }], sourceReportHash: source.hash }), { code: 'RECOVERY_ATTESTATION_REGISTRY_ENTRY' }); checks++;
const { hash: ignored, ...body } = registry;
const forged = seal({ ...body, semanticAcceptance: true });
await assert.rejects(openRecoveryAttestationRegistryV1({ ...options, registry: forged, expectedRegistryHash: forged.hash }), { code: 'RECOVERY_ATTESTATION_REGISTRY_PIN_REQUIRED' }); checks++;
const reopened = await openRecoveryAttestationRegistryV1(options);
eq(reopened.read(q).attestationHash, verified.attestationHash);
eq(hash(original.prepare('SELECT * FROM attempts ORDER BY run,id').all()), before); original.close();
const directory = await mkdtemp(base + 'recovery-attestation-registry-');
await writeFile(directory + '/registry.json', JSON.stringify(registry, null, 2), { flag: 'wx' });
const files = ['packages/skill-production-v3/recovery-attestation-v1.mjs',
  'packages/skill-production-v3/recovery-attestation-registry-v1.mjs', 'scripts/verify-ticket-18-recovery-attestation-registry-v1.mjs'];
const report = seal({ version: 'recovery_attestation_registry_component_v1', passed: true, checks, bindingHash: binding.hash,
  registryHash: registry.hash, sourceReportHash: source.hash, afterExpiryReaderTested: true,
  archivedEntries: entries.length, actualRecoveredRequestsVerified: 1, originalJournalUnchanged: true,
  providerCalls: 0, dshCalls: 0, productionMainWired: false, remoteProductionAuthority: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(directory + '/report.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ passed: true, checks, directory, hash: report.hash, registryHash: registry.hash,
  providerCalls: 0, productionMainWired: false }));
