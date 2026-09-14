import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { RECOVERY_ATTESTATION_BINDING_V1 as binding, createLocalRecoveryAttestorV1,
  issueRecoveryAttestationV1, verifyRecoveryAttestationV1 } from '../packages/skill-production-v3/recovery-attestation-v1.mjs';
import { loadFactionParsedValueActualFixtureV1 } from './support/faction-parsed-value-actual-fixture-v1.mjs';
import { loadFactionOpeningFenceRecipeEnvironmentV1 } from '../packages/skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';

assert.equal(process.argv.length, 2);
const base = 'build/ticket-18-faction-production-v1/', root = process.cwd();
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const actual = await loadFactionParsedValueActualFixtureV1();
const db = new DatabaseSync(actual.filename, { readOnly: true });
const before = hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const issuer = createLocalRecoveryAttestorV1(), attestations = [];
const reseal = ({ hash: ignored, ...body }, patch) => seal({ ...body, ...patch });
let checks = 0; const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const owners = new Map();
const readOrigin = proof => {
  const recipe = owners.get(proof.originRunId);
  const issue = verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(proof.originRunId, proof.originAttemptId + '.wire-issue-v2').artifact)).value;
  const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(proof.originRunId, proof.originAttemptId);
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
    assert.fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  return { recipe, issue, attempt };
};
const requestFor = (p, maximum) => ({ schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
  requestId: p.attemptId, roleRef: p.capsule.roleRef, instructions: p.capsule.instructions,
  input: p.capsule.compiledInput, outputContractRef: p.capsule.outputContractRef, maxOutputUnits: maximum });
const cases = [{ name: 'actual_zerg_schema_valid_recovery', proof: actual.authenticated.proof,
  authenticateFresh: () => actual.reader(actual.prepared), reconstructedRequest: requestFor({
    attemptId: actual.origin.attemptId, capsule: actual.prepared.capsule }, 4096) }];
const terran = await json(base + actual.runId + '/terran_armed_forces-input.json');
const fence = await loadFactionOpeningFenceRecipeEnvironmentV1({ root, recipe: actual.recipe, input: terran });
eq(fence.proofs.length, 1);
const diagnosis = await json(base + 'terran-wire-context-diagnosis-v2.json');
const args = factionReviewDecompositionArgsV1({ filename: actual.filename, input: terran, diagnosis });
const plan = prepareFactionReviewDecompositionV1(args), proof = fence.proofs[0];
const fragment = plan.jobs.map(job => createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: job.id }))
  .find(p => p.capsule.hash === proof.contextManifestRef.hash);
assert(fragment); checks++;
cases.push({ name: 'actual_terran_target0_opening_fence_recovery', proof,
  authenticateFresh: () => fence.authenticate(proof), reconstructedRequest: requestFor({
    attemptId: proof.originAttemptId, capsule: fragment.capsule }, FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy.maxOutputUnits) });
for (const c of cases) {
  owners.set(c.proof.originRunId, await json(base + c.proof.originRunId + '/recipe.json'));
  const attestation = await issueRecoveryAttestationV1({ ...c, readOrigin, issuer });
  const q = { attestation, trustedIssuer: issuer.descriptor, expectedProofHash: c.proof.hash,
    readOrigin, reconstructedRequest: c.reconstructedRequest };
  const future = new Date(Date.parse(attestation.content.rawExpiresAt) + 86400000).toISOString();
  const verified = verifyRecoveryAttestationV1({ ...q, now: future });
  eq(verified.proof.hash, c.proof.hash); eq(verified.expiredRawAccessPerformed, false);
  eq(verified.freshRawReadPerformed, false); eq(attestation.content.originalRawTtlChanged, false);
  assert.throws(() => verifyRecoveryAttestationV1({ ...q, trustedIssuer: createLocalRecoveryAttestorV1().descriptor })); checks++;
  assert.throws(() => verifyRecoveryAttestationV1({ ...q, reconstructedRequest: { ...c.reconstructedRequest, input: 'changed' } })); checks++;
  assert.throws(() => verifyRecoveryAttestationV1({ ...q, expectedProofHash: hash('changed') })); checks++;
  assert.throws(() => verifyRecoveryAttestationV1({ ...q, attestation: reseal(attestation,
    { signature: Buffer.alloc(64).toString('base64') }) })); checks++;
  const forged = reseal(attestation, { content: reseal(attestation.content, { semanticAcceptance: true }) });
  assert.throws(() => verifyRecoveryAttestationV1({ ...q, attestation: forged })); checks++;
  assert.throws(() => verifyRecoveryAttestationV1({ ...q, readOrigin: p => {
    const o = readOrigin(p); return { ...o, attempt: { ...o.attempt, settled: o.attempt.settled + 1 } };
  } })); checks++;
  await assert.rejects(issueRecoveryAttestationV1({ ...c, readOrigin, issuer, now: () => future,
    authenticateFresh: async () => ({ proof: c.proof, accessReceiptHash: attestation.content.freshAccessReceiptHash }) }),
  { code: 'RECOVERY_ATTESTATION_ISSUANCE_WINDOW_CLOSED' }); checks++;
  await assert.rejects(issueRecoveryAttestationV1({ ...c, readOrigin, issuer,
    authenticateFresh: async () => ({ proof: c.proof }) }), { code: 'RECOVERY_ATTESTATION_FRESH_ACCESS_REQUIRED' }); checks++;
  attestations.push({ name: c.name, attestation, requestHash: hash(c.reconstructedRequest) });
}
eq(hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all()), before); db.close();
const directory = await mkdtemp(base + 'recovery-attestation-');
await writeFile(directory + '/issuer.json', JSON.stringify(issuer.descriptor, null, 2), { flag: 'wx' });
for (const row of attestations) await writeFile(directory + '/' + row.attestation.content.authenticatedProof.hash + '.json',
  JSON.stringify(row.attestation, null, 2), { flag: 'wx' });
const files = ['packages/skill-production-v3/recovery-attestation-v1.mjs', 'scripts/verify-ticket-18-recovery-attestation-v1.mjs'];
const report = seal({ version: 'recovery_attestation_actual_component_v1', bindingHash: binding.hash,
  passed: true, checks, directory, issuer: issuer.descriptor,
  actualAttestations: attestations.map(r => ({ name: r.name, attestationHash: r.attestation.hash,
    proofHash: r.attestation.content.authenticatedProof.hash, originRunId: r.attestation.content.authenticatedProof.originRunId,
    originAttemptId: r.attestation.content.authenticatedProof.originAttemptId, issuedAt: r.attestation.content.issuedAt,
    rawExpiresAt: r.attestation.content.rawExpiresAt, requestHash: r.requestHash })),
  providerCalls: 0, originalJournalUnchanged: true, actualFreshIssuance: true, afterExpiryVerificationTested: true,
  originalRawTtlChanged: false, productionMainWired: false, remoteProductionIssuer: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(directory + '/report.json', JSON.stringify(report, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ passed: true, checks, directory, hash: report.hash, providerCalls: 0,
  actualFreshAttestations: attestations.length, productionMainWired: false, remoteProductionIssuer: false }));
