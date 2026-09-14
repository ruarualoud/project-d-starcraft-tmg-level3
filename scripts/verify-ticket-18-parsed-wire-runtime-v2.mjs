import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1, validateFactionProductionTargetReviewV1 }
  from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { createFactionStructuralReviewLaneV1 } from '../packages/skill-production-v3/faction-structural-json-lane-v1.mjs';
import { createFactionParsedWireRecoveryReaderV2 } from '../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2 as binding } from '../packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs';
import { FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 as expansionBinding } from '../packages/skill-production-v3/faction-review-source-expansion-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1, factionProfileRefV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 as contractRef,
  FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';

const realDsh = process.argv[2] === '--dsh';
assert.equal(process.argv.length, realDsh ? 3 : 2);
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runIdOriginal = 'faction-v1-961f12e8417c1f17beb9';
const files = ['packages/structured-generation/adapters/structural-json-recovery-v2.mjs',
  'packages/structured-generation/authenticated-structural-json-recovery-v2.mjs',
  'packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs',
  'packages/skill-production-v3/faction-structural-json-environment-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-runtime-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-lane-v1.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-slot-namespace-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs', 'scripts/verify-ticket-18-parsed-wire-runtime-v2.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const original = new DatabaseSync(filename, { readOnly: true });
const decode = raw => verifySeal(JSON.parse(raw)).value;
const ledgerHash = () => hash(original.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledgerHash();
assert.equal(original.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const parent = await json(runIdOriginal + '/recipe'), input = await json(runIdOriginal + '/zerg_swarm-input');
const component = await json('structural-json-schema-bridge-component-v2'), origin = component.origin;
const artifact = id => decode(original.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runIdOriginal, id).artifact);
const draft = artifact('faction.zerg_swarm.unit_roles.2.known-rule-correction').draft;
const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.2');
const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 6);
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
  roleId: component.authenticatedProof.invocation.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
  workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
    coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: policy });
assert.equal(prepared.capsule.hash, component.contextHash);
const ancestors = [], ownerRows = [];
for (let id = runIdOriginal; id;) {
  const recipe = await json(id + '/recipe');
  assert.equal(id, 'faction-v1-' + recipe.hash.slice(0, 20));
  assert(!ancestors.some(r => r.hash === recipe.hash)); ancestors.push(recipe);
  const row = original.prepare('SELECT * FROM runs WHERE id=?').get(id);
  if (row) ownerRows.push(row);
  id = recipe.continuation?.parentRunId || null;
}
const reseal = (v, patch = {}) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const originalIssue = artifact(origin.attemptId + '.wire-issue-v2');
if (Date.now() >= Date.parse(originalIssue.quarantineReceiptRef.expiresAt)) {
  assert.equal(realDsh, true, 'Expired historical revalidation must use the actual local DSH harness');
  const previous = await json('parsed-wire-dsh-runtime-v2');
  assert(previous.passed && previous.actualDshSessions > 0 && previous.providerCalls === 0);
  const testDb = previous.directory + '/normal.sqlite';
  const fixture = new DatabaseSync(testDb, { readOnly: true });
  try {
    const row = fixture.prepare("SELECT * FROM steps WHERE state='complete' AND json_extract(artifact,'$.value.parsedWireRecoveries') IS NOT NULL").get();
    assert(row);
    const value = decode(row.artifact), runId = row.run;
    const origins = [...parent.structuralJsonReviewOrigins, origin]
      .sort((a, b) => (a.runId + '/' + a.attemptId).localeCompare(b.runId + '/' + b.attemptId));
    const recipe = reseal(parent, { parsedWireSchemaBridgeBinding: binding, structuralJsonReviewOrigins: origins,
      executionPolicyBinding: null, continuation: seal({ parentRunId: runIdOriginal, parentRecipeHash: parent.hash, reusable: [] }),
      dshBindingHash: value.loop.runtimeBinding.hash,
      injectionTest: { mode: 'normal', directory: previous.directory, realDsh: true } });
    assert.equal(runId, 'faction-v1-' + recipe.hash.slice(0, 20));
    const attempts = fixture.prepare('SELECT * FROM attempts WHERE run=?').all(runId);
    const artifacts = fixture.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(runId).map(row => decode(row.artifact));
    const options = { value, roleInput: prepared.roleInput, request, input, recipe,
      resolveArtifact: artifactHash => artifacts.find(value => value.hash === artifactHash),
      resolveCapabilityReceipt: receiptHash => {
        for (const row of fixture.prepare("SELECT response FROM attempts WHERE state='received'").all()) {
          const response = decode(row.response);
          if (response.capabilityReceipt?.receiptHash === receiptHash) return response.capabilityReceipt;
        }
        return null;
      },
      resolveParsedWireRecoveryAuthentication: () => component.authenticatedProof,
      resolveResponse: receiptHash => {
        const row = attempts.find(value => value.state === 'received'
          && decode(value.response).usageReceipt?.receiptHash === receiptHash);
        return row ? { response: decode(row.response), originRunId: runId, originRecipe: recipe } : null;
      },
      resolveStructuredSuccessEvidence: query => readFactionStructuredSuccessEvidenceV1({ filename: testDb, ...query }) };
    assert.equal(verifyFactionStructuredRoleReplayV1(options).providerReceiptHashes.length, 2);
    for (const mutate of [record => { record.originalContextHash = hash('wrong'); },
      record => { record.loop = reseal(record.loop, { directNetworkUsed: true }); },
      record => { record.correctedCandidateRef = { hash: hash('wrong') }; },
      record => { record.authenticatedProof = reseal(record.authenticatedProof, { originalUsage: {} }); }]) {
      const record = structuredClone(value.parsedWireRecoveries[0]); mutate(record);
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...options,
        value: reseal(value, { parsedWireRecoveries: [reseal(record)] }) }));
    }
    const reader = await createFactionParsedWireRecoveryReaderV2({ root: process.cwd(), filename: testDb, runId, recipe });
    await assert.rejects(reader(prepared), { code: 'RAW_QUARANTINE_EXPIRED' });
    const localDsh = await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' });
    const loop = await localDsh.run({
      task: 'Revalidate the preserved parsed-wire proof through the current local harness without Provider access.',
      callModel: async () => ({ command: { action: 'finish', content: component.authenticatedProof.providerValue },
        receiptHash: component.authenticatedProof.hash,
        usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0, inputCacheHitUnits: 0,
          inputCacheMissUnits: 0, reasoningOutputUnits: 0 } }),
      toolPort: { execute: () => assert.fail('tools forbidden'), trace: () => [], readRefs: () => [] },
      limits: { maxCalls: 1, maxTools: 0, maxOutput: 65536, maxWallMs: 180000 } });
    assert.equal(hash(loop.final), hash(component.authenticatedProof.providerValue));
    assert.equal(ledgerHash(), before);
    const report = seal({ version: 'faction_parsed_wire_runtime_proof_v2', passed: true,
      checks: 9, bindingHash: binding.hash, directory: previous.directory, results: previous.results,
      origin, actualPaidOriginProofHash: component.authenticatedProof.hash, actualDshSessions: 1,
      referencedHistoricalDshSessions: previous.actualDshSessions, injectedDshSessions: 0,
      expiredOriginHistoricalRevalidation: true, currentConsumerPassed: true,
      currentExpiredRawRejected: true, strictFullContextReissueRequiredInProduction: true,
      providerCalls: 0, originalLedgerUnchanged: true, mainProductionWired: false,
      semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false, codeHashes });
    await writeFile(base + 'parsed-wire-dsh-runtime-v2.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: true, checks: report.checks, hash: report.hash,
      actualDshSessions: 1, referencedHistoricalDshSessions: previous.actualDshSessions,
      currentExpiredRawRejected: true, providerCalls: 0 }));
  } finally {
    fixture.close(); original.close();
  }
  process.exit(0);
}
const fakeBinding = seal({ testOnly: true, kind: 'explicit_injected_dsh' });
const implementation = realDsh ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: fakeBinding, async run(args) {
    const commands = [];
    const { hash: ignored, ...loop } = await runDirectLoop({ ...args, callModel: async q => {
      const result = await args.callModel(q); commands.push(result.command); return result;
    } });
    loop.transcript = loop.transcript.map((row, i) => ({ ...row, commandHash: sha256(JSON.stringify(commands[i])) }));
    return seal({ ...loop, runtimeBinding: fakeBinding, sandboxReceipt: { testOnly: true }, directNetworkUsed: false });
  } };
const directory = await mkdtemp(base + 'parsed-wire-runtime-');
let checks = 0, dshCalls = 0;
const results = [], eq = (a, b) => { assert.deepEqual(a, b); checks++; };
try {
  for (const mode of ['normal', 'restart_after_paid_response', 'changed_citation', 'schema_again', 'payment_required', 'disabled']) {
    const origins = [...parent.structuralJsonReviewOrigins, origin].sort((a, b) => (a.runId + '/' + a.attemptId).localeCompare(b.runId + '/' + b.attemptId));
    const recipe = reseal(parent, { parsedWireSchemaBridgeBinding: mode === 'disabled' ? null : binding,
      structuralJsonReviewOrigins: origins, executionPolicyBinding: null,
      continuation: seal({ parentRunId: runIdOriginal, parentRecipeHash: parent.hash, reusable: [] }),
      dshBindingHash: implementation.binding.hash, injectionTest: { mode, directory, realDsh } });
    const runId = 'faction-v1-' + recipe.hash.slice(0, 20), testDb = directory + '/' + mode + '.sqlite';
    const storeOptions = { runId, recipeHash: recipe.hash };
    let store = openProductionStore(testDb, storeOptions);
    // Copy exact origin/capability rows only into an isolated fixture. The raw
    // ciphertext is read from its original authenticated location, TTL intact.
    const fixture = new DatabaseSync(testDb);
    for (const row of ownerRows) fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
    const paidRows = new Map();
    for (const selected of origins) {
      const issue = original.prepare('SELECT * FROM steps WHERE run=? AND id=?').get(selected.runId, selected.attemptId + '.wire-issue-v2');
      fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)').run(issue.run, issue.id, issue.input_hash, issue.generation,
        issue.owner, issue.expires, issue.state, issue.artifact);
      const capRows = original.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
        .all(decode(issue.artifact).invocation.capabilityReceiptHash);
      assert.equal(capRows.length, 1);
      for (const row of [original.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(selected.runId, selected.attemptId), ...capRows])
        paidRows.set(row.run + '/' + row.id, row);
    }
    for (const row of paidRows.values())
      fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(row.run, row.id, row.request_hash, row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
    fixture.close();
    const startedAt = new Date().toISOString(), profile = factionExecutionProfileV1({ binding: recipe.executionModelBinding });
    const capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: factionProfileRefV1(profile),
      endpointPath: '/responses', endpointDialect: 'deepseek_responses_v1', model: profile.model,
      capability: 'responses_json_schema', schemaSubsetVersion: contract.schemaSubsetVersion, outputContractRef: contractRef,
      probeInputHash: hash('INJECTED PROBE'), probeOutputHash: hash('INJECTED RESULT'), probeResult: 'accepted_schema_valid',
      usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true, physicalAttempts: 1,
      probedAt: startedAt, expiresAt: new Date(Date.parse(startedAt) + 3600000).toISOString() });
    store.reserve('injected.capability.probe', { testOnly: true, hash: capability.receiptHash }, 1, 20);
    store.settle('injected.capability.probe', { usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, costMicros: 0,
      response: { ok: true, capabilityReceipt: capability, injectionTestOnly: true } });
    const corrected = structuredClone(component.preparation.rejected.providerValue);
    delete corrected.coverage[0].recommendationSlotsNote;
    if (mode === 'changed_citation') corrected.verdicts[0].sourceSlots.pop();
    if (mode === 'schema_again') corrected.coverage[0].recommendationSlotsNote = 'still forbidden';
    const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [
      { kind: mode === 'schema_again' ? 'invalid_schema' : 'success', output: corrected,
        ...(mode === 'payment_required' ? { status: 402 } : {}) } ] });
    const sent = [];
    const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ async send(args) {
      sent.push(args); const result = structuredClone(await fault.send(args));
      const { receiptHash: ignored, ...body } = result.transportReceipt;
      result.transportReceipt = { ...body, startedAt, receiptHash: hash({ ...body, startedAt }) }; return result;
    } });
    let interrupt = mode === 'restart_after_paid_response', expire = false, reads = 0;
    const reader = await createFactionParsedWireRecoveryReaderV2({ root: process.cwd(), filename: testDb, runId, recipe });
    const read = reader ? async q => { reads++; if (expire) throw Object.assign(new Error('injected expired raw'), { code: 'RAW_QUARANTINE_EXPIRED' }); return reader(q); } : null;
    const dsh = { ...implementation, async run(args) {
      dshCalls++; const loop = await implementation.run(args);
      if (interrupt) { interrupt = false; throw Object.assign(new Error('injected after paid response'), { code: 'INJECTED_AFTER_PAID_RESPONSE_INTERRUPTION' }); }
      return loop;
    } };
    const make = () => {
      const native = createFactionStructuredReviewRuntimeV1({ input, runtime: { role() { assert.fail('fallback'); } },
        store, dsh, providerAdapter: adapter, egressBinding: factionExecutionEgressV1(profile), capabilityReceipt: capability,
        outputContract: contract, executionPolicy: policy, priceUsage: u => u.totalUnits,
        includeSharedScenarioSources: true, reviewSlotNamespaceBinding: slotBinding, reviewSourceExpansionBinding: expansionBinding,
        parsedWireSchemaBridgeBinding: recipe.parsedWireSchemaBridgeBinding, readParsedWireRecovery: read });
      return createFactionStructuralReviewLaneV1({ root: process.cwd(), filename: testDb, runId, recipe,
        input, runtime: native, store, dsh, executionPolicy: policy });
    };
    let value;
    try {
      if (mode === 'disabled') {
        await assert.rejects(make().role(request), { code: 'STRUCTURAL_JSON_SYNTAX_UNSUPPORTED' }); checks++;
        eq(sent.length, 0); results.push({ mode, rejected: true }); continue;
      }
      if (mode === 'restart_after_paid_response') {
        await assert.rejects(make().role(request), { code: 'INJECTED_AFTER_PAID_RESPONSE_INTERRUPTION' }); checks++;
        eq(sent.length, 1); store.close(); store = openProductionStore(testDb, storeOptions);
      }
      if (['changed_citation', 'schema_again', 'payment_required'].includes(mode)) {
        await assert.rejects(make().role(request)); checks++; eq(sent.length, 1);
        store.close(); store = openProductionStore(testDb, storeOptions);
        await assert.rejects(make().role(request), mode === 'payment_required' ? { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' } : undefined);
        checks++; eq(sent.length, 1);
        results.push({ mode, rejected: true, noRepeatSend: true }); continue;
      }
      value = await make().role(request);
      eq(sent.length, 1); eq(value.parsedWireRecoveries.length, 1);
      eq(value.parsedWireRecoveries[0].authenticatedProof.hash, component.authenticatedProof.hash);
      eq(value.parsedWireRecoveries[0].correction.scope.allowedChangedPaths, ['$.coverage[0].recommendationSlotsNote']);
      eq(sent[0].body.model, 'deepseek-v4.1-flash-expires-on-0910');
      eq(sent[0].body.instructions.includes('Select at most eight'), false);
      eq(value.hostMaterializationReceipt.judgmentsChanged, false);
      validateFactionProductionTargetReviewV1(value.output, { ...prepared.mapping, artifact: value, reviewSlotNamespaceBinding: slotBinding }); checks++;
      const sendsBefore = sent.length, readsBefore = reads, loopsBefore = dshCalls;
      store.close(); store = openProductionStore(testDb, storeOptions);
      eq((await make().role(request)).hash, value.hash); eq(sent.length, sendsBefore); eq(dshCalls, loopsBefore);
      assert(reads > readsBefore); checks++;
      expire = true;
      await assert.rejects(make().role(request), { code: 'RAW_QUARANTINE_EXPIRED' }); checks++; expire = false;
      eq(sent.length, sendsBefore);
    } finally { store.close(); }
    if (!value) continue;
    const replay = openFactionProductionReplayV1({ filename: testDb, runId, recipe, ancestors, input });
    try {
      replay.bindRoleRequest(request); await replay.authenticateRoleRequest(request);
      eq(replay.store.acquire(prepared.fullRoleId, prepared.roleInput).artifact.hash, value.hash);
      eq(replay.evidence().parsedWireAuthentications.length, 1);
      eq(replay.evidence().actualProviderReceiptHashes.length, 2);
    } finally { replay.close(); }
    // Independent verifier must not accept a forged embedded-origin proof.
    const db = new DatabaseSync(testDb, { readOnly: true });
    try {
      const artifacts = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(runId).map(r => decode(r.artifact));
      const attempts = db.prepare('SELECT * FROM attempts WHERE run=?').all(runId);
      const actualProof = (await reader(prepared)).proof;
      const options = { value, roleInput: prepared.roleInput, request, input, recipe,
        resolveArtifact: h => artifacts.find(a => a.hash === h), resolveCapabilityReceipt: h => h === capability.receiptHash ? capability : null,
        resolveParsedWireRecoveryAuthentication: () => actualProof,
        resolveResponse: h => { const row = attempts.find(r => r.state === 'received' && decode(r.response).usageReceipt?.receiptHash === h);
          return row ? { response: decode(row.response), originRunId: runId, originRecipe: recipe } : null; },
        resolveStructuredSuccessEvidence: q => readFactionStructuredSuccessEvidenceV1({ filename: testDb, ...q }) };
      eq(verifyFactionStructuredRoleReplayV1(options).providerReceiptHashes.length, 2);
      assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...options, resolveParsedWireRecoveryAuthentication: null })); checks++;
      for (const mutate of [r => { r.originalContextHash = hash('wrong'); }, r => { r.loop = reseal(r.loop, { directNetworkUsed: true }); },
        r => { r.correctedCandidateRef = { hash: hash('wrong') }; }, r => { r.authenticatedProof = reseal(r.authenticatedProof, { originalUsage: {} }); }]) {
        const record = structuredClone(value.parsedWireRecoveries[0]); mutate(record);
        assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...options,
          value: reseal(value, { parsedWireRecoveries: [reseal(record)] }) })); checks++;
      }
    } finally { db.close(); }
    results.push({ mode, independentColdConsumerPassed: true, paidResponseRestartPassed: true, newInjectedSends: sent.length });
    console.log(JSON.stringify({ stage: 'parsed_wire_runtime_verified', mode, checks, dshCalls, providerCalls: 0 }));
  }
  eq(ledgerHash(), before);
  eq(await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))), codeHashes);
  const report = seal({ version: 'faction_parsed_wire_runtime_proof_v2', passed: true, checks, bindingHash: binding.hash,
    directory, results, origin, actualPaidOriginProofHash: component.authenticatedProof.hash,
    actualDshSessions: realDsh ? dshCalls : 0, injectedDshSessions: realDsh ? 0 : dshCalls,
    providerCalls: 0, originalLedgerUnchanged: true, mainProductionWired: false,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false, codeHashes });
  await writeFile(base + (realDsh ? 'parsed-wire-dsh-runtime-v2.json' : 'parsed-wire-runtime-proof-v2.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, checks, hash: report.hash, actualDshSessions: report.actualDshSessions, providerCalls: 0 }));
} finally { original.close(); }
