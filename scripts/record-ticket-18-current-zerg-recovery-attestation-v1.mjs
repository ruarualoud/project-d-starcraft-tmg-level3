import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 }
  from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { authenticateFactionStructuralReviewV1 }
  from '../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';
import { inspectFactionWireKeyHelperV2 }
  from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 as parsedRecoveryBinding }
  from '../packages/structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { createLocalRecoveryAttestorV1, issueRecoveryAttestationV1 }
  from '../packages/skill-production-v3/recovery-attestation-v1.mjs';
import { createRecoveryAttestationRegistryV1, openRecoveryAttestationRegistryV1 }
  from '../packages/skill-production-v3/recovery-attestation-registry-v1.mjs';
import { RECOVERY_ATTESTATION_HOST_POLICY_V1 as previousHostPolicy }
  from '../packages/skill-production-v3/recovery-attestation-host-policy-v1.mjs';

assert.deepEqual(process.argv.slice(2), []);

const root = process.cwd();
const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-ad241fedbb4116a1fcd4';
const attemptId = 'structured-dc21495bc2f5471d2ab0127b5b32431e1aa5c949c37a31f5';
const db = new DatabaseSync(filename, { readOnly: true });
const decode = raw => verifySeal(JSON.parse(raw)).value;
const artifact = id => decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get(runId, id).artifact);
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const ledgerHash = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());

try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  const before = ledgerHash();
  const ownerRecipe = await json(base + runId + '/recipe.json');
  const input = await json(base + runId + '/zerg_swarm-input.json');
  const issue = artifact(attemptId + '.wire-issue-v2');
  const origin = { runId, attemptId, issueHash: issue.hash };
  const draft = artifact('faction.zerg_swarm.phase_tempo.1.known-rule-correction').draft;
  const section = createFactionWritingPlanV1(input).sections.find(value => value.id === 'faction.zerg_swarm.phase_tempo.1');
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(value => value.first === 4);
  const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
  const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
  const request = { packet,
    roleId: issue.invocation.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
    task: 'Reconstruct the exact complete original failed role, without any Provider send.',
    workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
      coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
  const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
    idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
  assert.equal(prepared.capsule.hash, issue.invocation.contextManifestRef.hash);
  const helperRef = await inspectFactionWireKeyHelperV2();
  const authenticateFresh = () => authenticateFactionStructuralReviewV1({ filename, origin, ownerRecipe, prepared,
    executionPolicy, helperRef, parsedRecoveryBinding, recoveryTrust: null });
  const reconstructedRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', requestId: attemptId,
    roleRef: prepared.capsule.roleRef, instructions: prepared.capsule.instructions, input: prepared.capsule.compiledInput,
    outputContractRef: prepared.capsule.outputContractRef, maxOutputUnits: executionPolicy.maxOutputUnits };
  const readOrigin = proof => {
    assert.equal(proof.originRunId, runId);
    assert.equal(proof.originAttemptId, attemptId);
    return { recipe: ownerRecipe, issue,
      attempt: db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId) };
  };
  const issuer = createLocalRecoveryAttestorV1();
  const attestation = await issueRecoveryAttestationV1({ authenticateFresh, readOrigin, reconstructedRequest, issuer });
  const directory = await mkdtemp(base + 'recovery-attestation-zerg-current-');
  const attestationFile = directory + '/' + attestation.content.authenticatedProof.hash + '.json';
  await writeFile(directory + '/issuer.json', JSON.stringify(issuer.descriptor, null, 2), { flag: 'wx' });
  await writeFile(attestationFile, JSON.stringify(attestation, null, 2), { flag: 'wx' });

  const previousRegistry = await json(previousHostPolicy.registryFile);
  assert.equal(previousRegistry.hash, previousHostPolicy.registryHash);
  const previousIssuers = new Map(previousRegistry.trustedIssuers.map(value => [value.hash, value]));
  const entries = await Promise.all(previousRegistry.proofs.map(async row => ({ file: row.file,
    issuer: previousIssuers.get(row.issuerHash), attestation: await json(row.file) })));
  entries.push({ file: attestationFile, issuer: issuer.descriptor, attestation });
  const files = [
    'packages/skill-production-v3/recovery-attestation-v1.mjs',
    'packages/skill-production-v3/recovery-attestation-registry-v1.mjs',
    'packages/skill-production-v3/faction-structural-json-environment-v1.mjs',
    'scripts/record-ticket-18-current-zerg-recovery-attestation-v1.mjs',
  ];
  const sourceReport = seal({ version: 'zerg_current_recovery_attestation_source_v1', passed: true,
    previousRegistryHash: previousRegistry.hash, addedProofHash: attestation.content.authenticatedProof.hash,
    origin, reconstructedRequestHash: hash(reconstructedRequest), issuedAt: attestation.content.issuedAt,
    rawExpiresAt: attestation.content.rawExpiresAt, previousEntriesPreserved: previousRegistry.proofs.length,
    providerCalls: 0, originalJournalUnchanged: true, semanticAcceptance: false,
    runtimeAccepted: false, trainingTruth: false,
    codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
  await writeFile(directory + '/source-report.json', JSON.stringify(sourceReport, null, 2), { flag: 'wx' });
  const registry = createRecoveryAttestationRegistryV1({ entries, sourceReportHash: sourceReport.hash });
  await writeFile(directory + '/registry.json', JSON.stringify(registry, null, 2), { flag: 'wx' });
  const opened = await openRecoveryAttestationRegistryV1({ root, filename, registry,
    expectedRegistryHash: registry.hash,
    now: () => new Date(Date.parse(attestation.content.rawExpiresAt) + 86400000).toISOString() });
  const archived = opened.read({ originRunId: runId, originAttemptId: attemptId,
    proofBindingHash: parsedRecoveryBinding.hash, expectedProofHash: attestation.content.authenticatedProof.hash,
    reconstructedRequest });
  assert.equal(archived.proof.hash, attestation.content.authenticatedProof.hash);
  assert.equal(archived.expiredRawAccessPerformed, false);
  assert.equal(ledgerHash(), before);
  const report = seal({ version: 'zerg_current_recovery_attestation_registry_v1', passed: true,
    directory, registryHash: registry.hash, previousRegistryHash: previousRegistry.hash,
    archivedEntries: registry.proofs.length, addedOrigin: origin,
    addedProofHash: archived.proof.hash, afterExpiryVerificationPassed: true,
    originalJournalUnchanged: true, providerCalls: 0, semanticAcceptance: false,
    runtimeAccepted: false, trainingTruth: false });
  await writeFile(directory + '/report.json', JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: true, directory, registryFile: directory + '/registry.json',
    registryHash: registry.hash, archivedEntries: registry.proofs.length,
    addedProofHash: archived.proof.hash, rawExpiresAt: attestation.content.rawExpiresAt,
    afterExpiryVerificationPassed: true, originalJournalUnchanged: true, providerCalls: 0 }));
} finally {
  db.close();
}
