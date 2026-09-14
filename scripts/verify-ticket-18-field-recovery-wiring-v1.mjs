import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { createFactionReplayRuntimeStackV1, loadFactionStructuredReplayDependenciesV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { validateFactionProductionTargetReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionFieldRecoveryLaneV1 } from '../packages/skill-production-v3/faction-field-recovery-lane-v1.mjs';
import { loadFactionFieldRecoveryScopeV1, validateFactionFieldRecoveryMigrationV1, assertFactionFieldRecoveryRecipeV1,
  readFactionFieldRecoveryEvidenceV1, FACTION_FIELD_RECOVERY_FILES_V1 as files } from '../packages/skill-production-v3/faction-field-recovery-scope-v1.mjs';
import { FACTION_FIELD_RECOVERY_BINDING_V3 as binding } from '../packages/skill-production-v3/faction-field-recovery-v1.mjs';

const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 1 && args[0] === '--dsh');
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const proof = await json('field-recovery-runtime-v1');
assert.equal(proof.passed, true); assert.equal(proof.actualDshSessions, 1);
assert.equal(proof.actualRoleArtifactWorkflowCallbackPassed, true); assert.equal(proof.providerCalls, 0);
for (const row of proof.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash, row.file);
const parentRunId = proof.originalPaidEvidenceRefs[0].ownerRunId, parent = await json(parentRunId + '/recipe');
const input = await json(parentRunId + '/zerg_swarm-input'), prepared = proof.prepared;
const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
const m = prepared.mapping;
const request = { packet, roleId: prepared.fullRoleId.slice(packet.id.length + 1),
  workspace: { inputHash: input.hash, section: m.section, draft: m.draft, reviewIndices: m.reviewIndices,
    coverageRequiredSourceRefs: m.requiredSourceRefs, outputRequestAtEnd: { targetContract: m.targets } } };
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const source = new DatabaseSync(filename, { readOnly: true });
const ledgerHash = () => hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledgerHash();
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const ancestors = [], ownerRows = [];
let owner = parentRunId;
while (owner) {
  const r = await json(owner + '/recipe');
  assert.equal(owner, 'faction-v1-' + r.hash.slice(0, 20));
  assert(!ancestors.some(a => a.hash === r.hash)); ancestors.push(r);
  const row = source.prepare('SELECT * FROM runs WHERE id=?').get(owner);
  if (row) { assert.equal(row.recipe, r.hash); ownerRows.push(row); }
  owner = r.continuation?.parentRunId || null;
}
const lineage = seal({ parentRunId, recipes: ancestors.map(r => ({ runId: 'faction-v1-' + r.hash.slice(0, 20), recipeHash: r.hash })) });
const history = openFactionProductionReplayV1({ filename, runId: parentRunId, recipe: parent, ancestors: ancestors.slice(1), input });
const actualHistoryOwnerCount = history.evidence().ancestorRunIds.length + 1;
history.close();
console.log(JSON.stringify({ stage: 'actual_paid_history_opened', actualHistoryOwnerCount, providerCalls: 0 }));
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const body = { version: 'faction_field_recovery_wiring_readiness_v1', passed: true,
  bindingHash: binding.hash, authenticatedDshProofHash: proof.hash,
  fullReplayConsumerPassed: true, dryAndLiveFactoryPassed: true, actualRoleArtifactWorkflowCallbackPassed: true,
  explicitRecipeMigrationPassed: true, sourceLedgerUnchanged: true, actualProductionHistoryOpened: true,
  actualHistoryOwnerCount, providerCalls: 0, newProductionAttempts: 0,
  mainProductionPreflightPassed: false, freshFieldValueProductionWired: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false, codeHashes };
const provisional = seal(body);
const scope = await loadFactionFieldRecoveryScopeV1({ root, filename, parentRunId, lineage, readiness: provisional });
const reseal = (v, patch) => { const { hash: ignored, ...rest } = v; return seal({ ...rest, ...patch }); };
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, code ? { code } : undefined); checks++; };
eq(assertFactionFieldRecoveryRecipeV1(parent), false);
eq(assertFactionFieldRecoveryRecipeV1(scope.recipeFields), true);
for (const ref of proof.originalPaidEvidenceRefs)
  eq(scope.recipeFields.fieldRecoveryOrigins.some(o => o.runId === ref.ownerRunId && o.attemptId === ref.attemptId
    && o.rejectedCandidateHash === ref.rejectedCandidateHash), true);
const next = reseal(parent, { ...scope.recipeFields,
  codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
eq(validateFactionFieldRecoveryMigrationV1({ parent, next, readiness: provisional, scope }).originalAttemptsCopied, 0);
for (const patch of [{ fieldRecoveryOrigins: [] }, { sourceBinding: {} }, { limits: { maxCalls: 1 } },
  { fieldRecoveryReadinessHash: hash('wrong') }])
  rejects(() => validateFactionFieldRecoveryMigrationV1({ parent, next: reseal(next, patch), readiness: provisional, scope }));

const directory = await mkdtemp(base + 'field-recovery-wiring-'), testFile = directory + '/journal.sqlite';
const recipe = reseal(next, { continuation: seal({ parentRunId, parentRecipeHash: parent.hash, reusable: [] }),
  injectionTest: { directory, purpose: 'actual paid field recovery through production factories and cold consumer' } });
const runId = 'faction-v1-' + recipe.hash.slice(0, 20);
await mkdir(base + runId);
await writeFile(base + runId + '/recipe.json', JSON.stringify(recipe, null, 2), { flag: 'wx' });
let journal = openProductionStore(testFile, { runId, recipeHash: recipe.hash });
let store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
const fixture = new DatabaseSync(testFile);
for (const row of ownerRows) fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)')
  .run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
const attempts = new Map();
const evidenceSteps = [];
for (const ref of proof.originalPaidEvidenceRefs) {
  const paid = source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(ref.ownerRunId, ref.attemptId);
  eq(hash(paid), ref.originalRowHash);
  attempts.set(paid.run + '/' + paid.id, paid);
  const caps = source.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
    .all(ref.capabilityReceiptHash);
  eq(caps.length, 1);
  for (const cap of caps) attempts.set(cap.run + '/' + cap.id, cap);
  for (const suffix of ['.issue', '.rejected-candidate'])
    evidenceSteps.push(source.prepare('SELECT * FROM steps WHERE run=? AND id=?').get(ref.ownerRunId, ref.attemptId + suffix));
}
for (const row of attempts.values()) fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)')
  .run(row.run, row.id, row.request_hash, row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
for (const row of evidenceSteps) fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)')
  .run(row.run, row.id, row.input_hash, row.generation, row.owner, row.expires, row.state, row.artifact);
fixture.close();
const deny = () => assert.fail('Provider and unrequested DSH egress forbidden');
let observed, fallbackCalls = 0, actualDshSessions = 0;
const native = args.includes('--dsh') ? await prepareDshLoop(root, { sessionPolicy: 'phased-v1' })
  : { binding: proof.value.loop.runtimeBinding, run: deny };
const dsh = { ...native, run: q => { actualDshSessions++; return native.run(q); } };
const laneArgs = { filename: testFile, runId, recipe, ancestors, input, store, executionPolicy, dsh,
  runtime: { role: async () => { fallbackCalls++; return 'delegated'; } }, onUncached: value => { observed = value; } };
// Explicit injected lazy-cache boundary probe: continuation.acquire may have
// a historical value even while local artifact() has no row yet. No semantic
// acceptance or paid provenance is asserted for this routing-only object.
eq(await createFactionFieldRecoveryLaneV1({ ...laneArgs, filename: directory + '/must-not-open.sqlite',
  store: { artifact: () => null, acquire: () => ({ cached: true,
    artifact: seal({ protocol: 'injected_historical_protocol_for_routing_only' }) }), release: deny },
  runtime: { role: async () => 'inherited delegated before evidence lookup' } }).role(request),
  'inherited delegated before evidence lookup');
let roleValue;
try {
  await assert.rejects(createFactionFieldRecoveryLaneV1({ ...laneArgs, dry: true }).role(request),
    { code: 'FACTION_PREFLIGHT_FIELD_RECOVERY_REQUIRED' }); checks++;
  eq(observed.materializationHash, proof.value.materialization.hash); eq(fallbackCalls, 0);
  if (!args.includes('--dsh')) {
    const lease = store.acquire(prepared.fullRoleId + '.field-codec-v1', { bindingHash: binding.hash,
      roleInputHash: hash(prepared.roleInput), materializationHash: proof.value.materialization.hash });
    store.finish(lease, proof.value);
  }
  roleValue = await createFactionFieldRecoveryLaneV1(laneArgs).role(request);
  console.log(JSON.stringify({ stage: 'formal_field_lane_materialized', roleArtifactHash: roleValue.hash, providerCalls: 0 }));
  eq(roleValue.materialization.hash, proof.value.materialization.hash);
  validateFactionProductionTargetReviewV1(roleValue.output, { ...m, artifact: roleValue,
    reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding }); checks++;
  eq((await createFactionFieldRecoveryLaneV1({ ...laneArgs, dry: true }).role(request)).hash, roleValue.hash);
  eq(await createFactionFieldRecoveryLaneV1(laneArgs).role({ ...request, roleId: 'non-review.role' }), 'delegated');
  eq(fallbackCalls, 1); eq(journal.summary().calls, 0);
} finally { journal.close(); }

// Restart the actual formal lane with no DSH permission and re-read evidence.
journal = openProductionStore(testFile, { runId, recipeHash: recipe.hash });
store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
try {
  eq((await createFactionFieldRecoveryLaneV1({ ...laneArgs, store, dsh: { binding: dsh.binding, run: deny } }).role(request)).hash, roleValue.hash);
} finally { journal.close(); }
const replayArgs = { filename: testFile, runId, recipe, ancestors, input };
const replay = openFactionProductionReplayV1(replayArgs);
let replayEvidence;
try {
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime: { role: deny }, dependencies });
  eq((await stack.runtime.role(request)).hash, roleValue.hash);
  replayEvidence = replay.evidence();
  eq(replayEvidence.actualProviderReceiptHashes, [roleValue.materialization.originalProof.providerReceiptHash,
    roleValue.materialization.repairProof.providerReceiptHash]);
  eq(replayEvidence.newProviderCalls, 0);
} finally { replay.close(); }
const readArgs = { filename: testFile, recipe, ancestors, prepared, currentRunId: runId,
  expectedMaterialization: roleValue.materialization };
eq(readFactionFieldRecoveryEvidenceV1(readArgs).repairEvidence.rejected.hash,
  proof.originalPaidEvidenceRefs[1].rejectedCandidateHash);
rejects(() => readFactionFieldRecoveryEvidenceV1({ ...readArgs, currentRunId: null, recipe: reseal(recipe, { fieldRecoveryOrigins: [] }) }),
  'FACTION_FIELD_RECOVERY_UNBOUND_ORIGIN');
rejects(() => readFactionFieldRecoveryEvidenceV1({ ...readArgs, currentRunId: parentRunId }),
  'FACTION_FIELD_RECOVERY_CURRENT_OWNER_DRIFT');
rejects(() => readFactionFieldRecoveryEvidenceV1({ ...readArgs, ancestors: ancestors.slice(1) }),
  'FACTION_FIELD_RECOVERY_LINEAGE_INVALID');
rejects(() => readFactionFieldRecoveryEvidenceV1({ ...readArgs,
  expectedMaterialization: { ...roleValue.materialization, repairEvidenceRef: null } }), 'FACTION_FIELD_RECOVERY_ACTUAL_EVIDENCE_DRIFT');

// Tampering with a stored canonical role must fail the full cold consumer,
// including when all attacker-controlled embedded hashes are recomputed.
const tamper = new DatabaseSync(testFile);
const canonicalRow = tamper.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, prepared.fullRoleId);
for (const patch of [{ semanticAcceptance: true }, { reviewSlotNamespaceBindingHash: hash('wrong') },
  { materialization: reseal(roleValue.materialization, { completion: reseal(roleValue.materialization.completion, { sidecar: [] }) }) }]) {
  const changed = reseal(roleValue, patch), envelope = verifySeal(JSON.parse(canonicalRow.artifact));
  tamper.prepare('UPDATE steps SET artifact=? WHERE run=? AND id=?')
    .run(JSON.stringify(reseal(envelope, { value: changed })), runId, prepared.fullRoleId);
  const r = openFactionProductionReplayV1(replayArgs);
  try { r.bindRoleRequest(request); rejects(() => r.store.acquire(prepared.fullRoleId, prepared.roleInput), 'FACTION_FIELD_RECOVERY_CONSUMER_DRIFT'); }
  finally { r.close(); }
}
tamper.prepare('UPDATE steps SET artifact=? WHERE run=? AND id=?').run(canonicalRow.artifact, runId, prepared.fullRoleId);
const original = attempts.values().next().value;
tamper.prepare("UPDATE attempts SET code='PROVIDER_PAYMENT_REQUIRED' WHERE run=? AND id=?").run(original.run, original.id);
rejects(() => readFactionFieldRecoveryEvidenceV1(readArgs), 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
rejects(() => openFactionProductionReplayV1(replayArgs), 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
tamper.prepare('UPDATE attempts SET code=? WHERE run=? AND id=?').run(original.code, original.run, original.id);
tamper.close();
eq(ledgerHash(), before); source.close();
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const s of ['...fieldRecoveryScope.recipeFields', 'fieldRecovery: { readiness: fieldRecoveryReadiness, scope: fieldRecoveryScope }',
  'input: dryInput, runtime: drySlotRuntime, store: dryStore', 'runId, input, runtime: slotRuntime, store, dsh',
  'input: dryInput, runtime: dryFieldRuntime', 'input, runtime: fieldRuntime, store,',
  'runtime: contractProjectionRuntime, store, dsh', "'FACTION_PREFLIGHT_FIELD_RECOVERY_REQUIRED'"])
  { assert.ok(main.includes(s), s); checks++; }
const report = seal({ ...body, checks, directory, replayEvidence, actualDshSessions,
  lazyInheritedCacheRoutingPassed: true, lazyCacheProbeInjected: true,
  referencedActualDshSessions: 1, fixtureCopiedActualAttemptRows: attempts.size, productionLedgerHash: before,
  currentOriginRefs: proof.originalPaidEvidenceRefs, roleArtifactHash: roleValue.hash });
await writeFile(base + 'field-recovery-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, fullReplayConsumerPassed: true,
  actualDshSessions, mainProductionPreflightPassed: false, hash: report.hash, directory }));
