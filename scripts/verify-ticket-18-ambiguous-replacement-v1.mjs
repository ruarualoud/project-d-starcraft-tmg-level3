import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { authenticateFactionAmbiguousFragmentV1, prepareFactionAmbiguousReplacementV1 }
  from '../packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1, selectFactionExecutionModelV1 } from '../packages/skill-production-v3/faction-model-lifecycle-v1.mjs';
import { factionProfileRefV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacy } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async file => verifySeal(JSON.parse(await readFile(base + file, 'utf8')));
const parentRunId = 'faction-v1-961f12e8417c1f17beb9';
const parentRecipe = await json(parentRunId + '/recipe.json');
const diagnosis = await json('terran-wire-context-diagnosis-v2.json');
const input = await json(diagnosis.originRunId + '/terran_armed_forces-input.json');
const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
const quarantine = parentRecipe.continuation.reviewDecompositionMigration.childContinuation.quarantinedTasks[0];
const authArgs = { filename, parentRunId, parentRecipe, args, quarantine };
const files = ['packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs',
  'packages/skill-production-v3/faction-model-lifecycle-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs',
  'scripts/verify-ticket-18-ambiguous-replacement-v1.mjs'];
const snapshot = () => Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const codeHashes = await snapshot();
const db = new DatabaseSync(filename, { readOnly: true });
// Another independent production lane may be active. Prove immutability of the
// actual recovered owner's rows, not that the entire project's ledger is idle.
const all = () => db.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(quarantine.originRunId);
const before = hash(all());
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, code ? { code } : undefined); checks++; };
const authenticated = authenticateFactionAmbiguousFragmentV1(authArgs);
eq(authenticated.proof.originAttemptId, quarantine.originAttemptId);
eq(authenticated.proof.originalReserveMicros, 800000);
eq(authenticated.proof.jobId, 'target.1');
eq(authenticated.proof.originalResultAvailable, false);
eq(authenticated.proof.originalUsageKnown, false);
const hashes = [];
export const actualPreparedRequests = [];
for (const now of ['2026-09-09T03:00:00.000Z', '2026-09-09T16:00:00.000Z']) {
  const legacyProfileRef = factionProfileRefV1(legacy);
  const { decision: selection, profile } = selectFactionExecutionModelV1({ selectedBinding: FACTION_MODEL_LIFECYCLE_BINDING_V1,
    legacyProfileRef, now });
  const capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: factionProfileRefV1(profile),
    endpointPath: '/responses', endpointDialect: 'deepseek_responses_v1', model: profile.model,
    capability: 'responses_json_schema', schemaSubsetVersion: authenticated.prepared.contract.schemaSubsetVersion,
    outputContractRef: authenticated.prepared.job.outputContractRef, probeInputHash: hash('INJECTED PROBE'),
    probeOutputHash: hash('INJECTED PROBE OUTPUT'), probeResult: 'accepted_schema_valid',
    usage: { inputUnits: 1, outputUnits: 1, totalUnits: 2 }, usageKnown: true, physicalAttempts: 1,
    probedAt: now, expiresAt: new Date(Date.parse(now) + 3600000).toISOString() });
  const prepareArgs = { authenticated, authenticateOrigin: () => authenticateFactionAmbiguousFragmentV1(authArgs),
    selection, legacyProfileRef, capability, now };
  const prepared = prepareFactionAmbiguousReplacementV1(prepareArgs);
  actualPreparedRequests.push(prepared);
  hashes.push({ selection: selection.selection, requestId: prepared.request.requestId, grantHash: prepared.grant.hash });
  eq(prepared.request.input, authenticated.prepared.capsule.compiledInput);
  eq(prepared.request.instructions, authenticated.prepared.capsule.instructions);
  eq(prepared.request.roleRef, authenticated.prepared.roleRef);
  eq(prepared.request.outputContractRef, authenticated.prepared.job.outputContractRef);
  eq(prepared.request.requestId !== quarantine.originAttemptId, true);
  eq(prepared.grant.maximumReplacementAttempts, 1);
  eq(prepared.grant.originalReserveMicros, 800000);
  eq(prepared.dispatchPermittedWithoutDurableClaim, false);
  eq(prepareFactionAmbiguousReplacementV1(prepareArgs).request.requestId, prepared.request.requestId);
  rejects(() => prepareFactionAmbiguousReplacementV1({ ...prepareArgs, authenticateOrigin: null }), 'FACTION_AMBIGUOUS_REPLACEMENT_AUTHENTICATION_REQUIRED');
  rejects(() => prepareFactionAmbiguousReplacementV1({ ...prepareArgs, authenticateOrigin: () => null }), 'FACTION_AMBIGUOUS_REPLACEMENT_AUTHENTICATION_DRIFT');
  rejects(() => prepareFactionAmbiguousReplacementV1({ ...prepareArgs, capability: null }), 'FACTION_AMBIGUOUS_REPLACEMENT_CAPABILITY_REQUIRED');
}
eq(hashes[0].grantHash, hashes[1].grantHash); // One logical allowance, NOT one allowance per model.
eq(hashes[0].requestId !== hashes[1].requestId, true);
for (const patch of [{ jobId: 'target.0' }, { requestHash: hash('wrong') }, { receiptHash: hash('wrong') },
  { newProviderCallsPermitted: 1 }, { originRunId: 'faction-v1-' + 'f'.repeat(20) }])
  rejects(() => authenticateFactionAmbiguousFragmentV1({ ...authArgs, quarantine: { ...quarantine, ...patch } }));
// Copy only exact original metadata/failed attempt/capability/issue into an
// ISOLATED fixture. A fresh Zerg intent is legitimate concurrency, not evidence
// that this terminal Terran origin is unresolved at the coordinator level.
const concurrencyDirectory = await mkdtemp(base + 'ambiguous-concurrency-');
const concurrencyFile = concurrencyDirectory + '/fixture.sqlite';
const independent = openProductionStore(concurrencyFile, { runId: 'fixture-independent-lane', recipeHash: hash('independent') });
const fixture = new DatabaseSync(concurrencyFile);
for (const row of db.prepare('SELECT * FROM runs').all()) fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)')
  .run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
const originalRow = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId);
const capabilityRow = db.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
  .get(authenticated.proof.originalCapabilityReceiptHash);
for (const row of [originalRow, capabilityRow]) fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)')
  .run(row.run, row.id, row.request_hash, row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
const issue = db.prepare('SELECT * FROM steps WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId + '.issue');
fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)')
  .run(issue.run, issue.id, issue.input_hash, issue.generation, issue.owner, issue.expires, issue.state, issue.artifact);
independent.reserve('independent-active', { fixtureOnly: true }, 1, 1);
eq(authenticateFactionAmbiguousFragmentV1({ ...authArgs, filename: concurrencyFile }).proof.hash, authenticated.proof.hash);
fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)')
  .run(parentRunId, 'parent-active', hash('fixture'), 'intent', 1, null, null, null, null, 1);
rejects(() => authenticateFactionAmbiguousFragmentV1({ ...authArgs, filename: concurrencyFile }), 'FACTION_AMBIGUOUS_REPLACEMENT_PARENT_NOT_TERMINAL');
fixture.prepare("UPDATE attempts SET state='not_sent',settled=0 WHERE run=? AND id=?").run(parentRunId, 'parent-active');
independent.settle('independent-active', { code: 'PROVIDER_PAYMENT_REQUIRED', definitelyNotSent: true });
rejects(() => authenticateFactionAmbiguousFragmentV1({ ...authArgs, filename: concurrencyFile }), 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
fixture.close(); independent.close();
eq(hash(all()), before); db.close();
eq(await snapshot(), codeHashes);
const report = seal({ version: 'faction_ambiguous_replacement_component_v1', passed: true, checks,
  actualOriginProof: authenticated.proof, sourceContextBytes: Buffer.byteLength(authenticated.prepared.capsule.compiledInput),
  explicitInjectedCapabilitiesOnly: true, selections: hashes, originalAttemptsUnchanged: true,
  independentActiveLaneAllowed: true, parentIntentBlocked: true, globalPaymentStillBlocked: true, concurrencyDirectory,
  providerCalls: 0, actualDshSessions: 0, durableClaimImplemented: false,
  productionEntrypointWired: false, runtimeAccepted: false, trainingTruth: false, codeHashes });
await writeFile(base + 'ambiguous-replacement-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, contextBytes: report.sourceContextBytes,
  providerCalls: 0, productionEntrypointWired: false, hash: report.hash }));
