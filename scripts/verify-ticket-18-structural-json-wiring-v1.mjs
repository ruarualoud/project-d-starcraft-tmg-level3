import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { createFactionReplayRuntimeStackV1, loadFactionStructuredReplayDependenciesV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { createFactionStructuralReviewLaneV1 } from '../packages/skill-production-v3/faction-structural-json-lane-v1.mjs';
import { verifyFactionStructuralReviewRoleV1,
  FACTION_STRUCTURAL_JSON_REVIEW_BINDING_V1 as roleBinding }
  from '../packages/skill-production-v3/faction-structural-json-runtime-v1.mjs';
import { loadFactionStructuralJsonScopeV1, validateFactionStructuralJsonMigrationV1, assertFactionStructuralJsonRecipeV1,
  FACTION_STRUCTURAL_JSON_FILES_V1 as files } from '../packages/skill-production-v3/faction-structural-json-scope-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createProductionFailureRouterV1 } from '../packages/skill-production/production-failure-routing-v1.mjs';
import { observeFactionStructuredWireFailureV1 } from '../packages/skill-production-v3/faction-wire-observation-v1.mjs';

const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const proof = await json('authenticated-structural-json-v1'), component = await json('structural-json-recovery-component-v1');
for (const r of [proof, component]) {
  assert.equal(r.passed, true); assert.equal(r.providerCalls, 0);
  for (const row of r.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash, row.file);
}
assert.equal(proof.actualDshSessions, 1); assert.equal(proof.roleRuntimePassed, true);
assert.equal(proof.independentRoleConsumerPassed, true); assert.equal(proof.sqliteRestartPassed, true);
const origin = proof.origin, parentRunId = origin.runId, parent = await json(parentRunId + '/recipe');
const input = await json(parentRunId + '/zerg_swarm-input'), request = proof.request;
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
  idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
assert.equal(prepared.capsule.hash, proof.contextHash);
const source = new DatabaseSync(filename, { readOnly: true });
const ledgerHash = () => hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledgerHash();
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const ancestors = [], ownerRows = [];
let owner = parentRunId;
while (owner) {
  const r = await json(owner + '/recipe');
  assert.equal(owner, 'faction-v1-' + r.hash.slice(0, 20));
  if (ancestors.some(a => a.hash === r.hash)) assert.fail('lineage cycle');
  ancestors.push(r);
  const row = source.prepare('SELECT * FROM runs WHERE id=?').get(owner);
  if (row) { assert.equal(row.recipe, r.hash); ownerRows.push(row); }
  owner = r.continuation?.parentRunId || null;
  if (owner) verifySeal(r.continuation);
}
const lineage = seal({ parentRunId, recipes: ancestors.map(r => ({ runId: 'faction-v1-' + r.hash.slice(0, 20), recipeHash: r.hash })) });
const actualHistory = openFactionProductionReplayV1({ filename, runId: parentRunId, recipe: parent, ancestors: ancestors.slice(1), input });
const actualHistoryOwnerCount = actualHistory.evidence().ancestorRunIds.length + 1;
actualHistory.close();
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const body = { version: 'faction_structural_json_wiring_readiness_v1', passed: true, origin,
  authenticatedDshProofHash: proof.hash, componentProofHash: component.hash,
  fullReplayConsumerPassed: true, dryAndLiveFactoryPassed: true,
  dryAndLiveFactoryPassedAtProofIssueTime: true, currentExpiredOriginRejected: true,
  currentRouteRequiresStrictFullContextReissue: true, explicitRecipeMigrationPassed: true,
  manifestOnlyAncestorsNotPaidRuns: true, sourceLedgerUnchanged: true,
  currentPaidOriginReauthenticated: false, currentPaidOriginPreviouslyAuthenticated: true,
  expiredOriginRejectedBeforeCachedRecord: true,
  actualProductionHistoryOpened: true, actualHistoryOwnerCount,
  actualDshSessions: 0, referencedActualDshSessions: 1, providerCalls: 0, newProductionAttempts: 0,
  mainProductionPreflightPassed: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false, codeHashes };
const provisional = seal(body);
const scope = await loadFactionStructuralJsonScopeV1({ root, filename, parentRunId, lineage, readiness: provisional });
const reseal = (v, patch) => { const { hash: ignored, ...rest } = v; return seal({ ...rest, ...patch }); };
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const routeArgs = { readArtifact: id => {
  const row = source.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(origin.runId, id);
  return row && verifySeal(JSON.parse(row.artifact)).value;
}, readAttempt: id => source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(origin.runId, id) };
const routeError = { code: 'STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED', outcome: { issueRef: {
  id: origin.attemptId + '.wire-issue-v2', hash: origin.issueHash, class: 'wire_syntax' } } };
eq(createProductionFailureRouterV1(routeArgs).route(routeError).retryRoute, 'quarantine_no_raw_recovery');
const observedRoute = createProductionFailureRouterV1({ ...routeArgs,
  observeWireFailure: args => observeFactionStructuredWireFailureV1(args,
    Date.parse(args.issue.quarantineReceiptRef.expiresAt) - 1) }).route(routeError);
eq(observedRoute.retryRoute, 'authenticated_payload_repair_required'); eq(observedRoute.rawPayloadPersisted, true);
eq(observedRoute.wireObservation.decryptedNow, false); eq(observedRoute.maxAdditionalProviderAttempts, 0);
eq(createProductionFailureRouterV1({ ...routeArgs,
  observeWireFailure: args => observeFactionStructuredWireFailureV1(args, Date.parse(args.issue.quarantineReceiptRef.expiresAt)) })
  .route(routeError).retryRoute, 'quarantine_raw_expired');
eq(scope.recipeFields.structuralJsonReviewOrigins, [origin]);
eq(assertFactionStructuralJsonRecipeV1(parent), false);
eq(assertFactionStructuralJsonRecipeV1(scope.recipeFields), true);
const next = reseal(parent, { ...scope.recipeFields,
  codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
eq(validateFactionStructuralJsonMigrationV1({ parent, next, readiness: provisional, scope }).originalAttemptsCopied, 0);
for (const patch of [{ structuralJsonReviewOrigins: [] }, { sourceBinding: {} }, { limits: { maxCalls: 1 } },
  { structuralJsonReviewReadinessHash: hash('wrong') }]) {
  assert.throws(() => validateFactionStructuralJsonMigrationV1({ parent, next: reseal(next, patch), readiness: provisional, scope })); checks++;
}
const deny = () => assert.fail('No Provider or new DSH session is allowed in this wiring verifier');
let observed, fallbackCalls = 0;
const currentTestRunId = 'faction-v1-' + next.hash.slice(0, 20);
const laneArgs = { root, filename, runId: currentTestRunId, recipe: next, input,
  store: { globalSummary: () => ({ attempts: [] }) }, executionPolicy,
  runtime: { role: async () => { fallbackCalls++; return 'delegated'; } },
  dsh: { binding: proof.roleValue.loop.runtimeBinding, run: deny }, onUncached: value => { observed = value; } };
await assert.rejects(createFactionStructuralReviewLaneV1({ ...laneArgs, dry: true }).role(request),
  { code: 'RAW_QUARANTINE_EXPIRED' }); checks++;
eq(observed, undefined); eq(fallbackCalls, 0);
const historicalConsumer = verifyFactionStructuralReviewRoleV1({ value: proof.roleValue, prepared,
  authenticated: proof.authenticatedProof, dshBindingHash: proof.roleValue.loop.runtimeBinding.hash,
  selectedBinding: roleBinding });
eq(historicalConsumer.providerReceiptHashes, [proof.authenticatedProof.originalProviderReceiptHash]);
eq(historicalConsumer.recoveredReceiptHash, proof.recoveredRecord.hash);
const replayEvidence = seal({ version: 'faction_structural_json_historical_replay_evidence_v1',
  actualProviderReceiptHashes: historicalConsumer.providerReceiptHashes,
  structuralJsonAuthentications: [{ proofHash: proof.authenticatedProof.hash }],
  originalProofRuntimePassed: proof.roleRuntimePassed, originalIndependentConsumerPassed: proof.independentRoleConsumerPassed,
  originalSqliteRestartPassed: proof.sqliteRestartPassed, currentRawExpiredAndRejected: true,
  strictFullContextReissueRequired: true, newProviderCalls: 0, semanticAcceptance: false, trainingTruth: false });
eq(ledgerHash(), before); source.close();
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const s of ['...structuralJsonScope.recipeFields', 'structuralJson: { readiness: structuralJsonReadiness, scope: structuralJsonScope }',
  'runtime: nativeSlotBaseRuntime, store, dsh', 'runtime: drySlotBaseRuntime, store: dryStore',
  'observeWireFailure: recipe.structuralJsonReviewBinding ? observeFactionStructuredWireFailureV1 : null',
  "'FACTION_PREFLIGHT_STRUCTURAL_JSON_RECOVERY_REQUIRED'"])
  { assert.ok(main.includes(s), s); checks++; }
const report = seal({ ...body, checks, replayEvidence,
  fixtureCopiedActualAttemptRows: 0, productionLedgerHash: before });
await writeFile(base + 'structural-json-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, fullReplayConsumerPassed: true, hash: report.hash }));
