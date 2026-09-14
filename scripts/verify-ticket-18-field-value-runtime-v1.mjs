import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionFieldValueRuntimeV1, prepareFactionFieldValueFamilyV1, verifyFactionFieldValueRoleV1,
  FACTION_FIELD_VALUE_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { validateFactionProductionTargetReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 as slotBinding } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { factionExecutionProfileV1, factionExecutionEgressV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';

const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 1 && args[0] === '--dsh');
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const prior = await json('field-recovery-runtime-v1'), prepared = prior.prepared;
for (const row of prior.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash);
const origin = prior.originalPaidEvidenceRefs[0], input = await json(origin.ownerRunId + '/zerg_swarm-input');
const ownerRecipe = await json(origin.ownerRunId + '/recipe'), caps = await json(origin.ownerRunId + '/active-capabilities');
const decode = raw => verifySeal(JSON.parse(raw)).value;
function original() {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
    assert.equal(db.prepare('SELECT recipe FROM runs WHERE id=?').get(origin.ownerRunId).recipe, ownerRecipe.hash);
    const step = suffix => decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(origin.ownerRunId, origin.attemptId + suffix).artifact);
    return { attempt: db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(origin.ownerRunId, origin.attemptId),
      issue: step('.issue'), rejected: step('.rejected-candidate'), ownerRecipe, capability: caps.slotReview };
  } finally { db.close(); }
}
const originalEvidence = original(), { task, family } = prepareFactionFieldValueFamilyV1({ input, prepared, originalEvidence });
assert.equal(task.hash, 'd73594b5f6ae52896d950255a51bde8b401620d669b4c9084d794cfa210e380b');
// The failed review remains authenticated against ownerRecipe. A field-value
// request is a new physical request and must use today's fallback after the
// owner's beta execution binding has stopped.
const egressBinding = factionExecutionEgressV1(factionExecutionProfileV1({ binding: null }));
const now = new Date().toISOString();
const capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: egressBinding.providerProfileRef,
  endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
  capability: 'responses_json_schema', outputContractRef: outputContractRefStarcraftTmgV1(task.contract),
  schemaSubsetVersion: task.contract.schemaSubsetVersion, probeInputHash: hash('injected-field-probe'),
  probeOutputHash: hash('injected-field-probe-output'), probeResult: 'accepted_schema_valid',
  usage: { inputUnits: 80, outputUnits: 24, totalUnits: 104 }, usageKnown: true, physicalAttempts: 1,
  probedAt: now, expiresAt: new Date(Date.now() + 86400000).toISOString() });
const good = { field0: prior.value.materialization.completion.value.coverage };
const directory = await mkdtemp(base + 'field-value-runtime-');
const injectedBinding = seal({ version: 'field_value_injected_dsh_v1' });
const native = args.includes('--dsh') ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: injectedBinding, async run(q) {
    const r = await q.callModel();
    return seal({ runtimeBinding: injectedBinding, sandboxReceipt: { injected: true }, calls: 1,
      directNetworkUsed: false, trainingTruth: false, final: r.command.content, toolTrace: [],
      transcript: [{ call: 1, receiptHash: r.receiptHash, commandHash: sha256(JSON.stringify(r.command)) }] });
  } };
let checks = 0, dshCalls = 0, fixtureCalls = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const reject = async (fn, code) => { await assert.rejects(fn, code ? { code } : undefined); checks++; };
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const dsh = { ...native, async run(q) { dshCalls++; return native.run(q); } };
const scenarios = [];
async function scenario(name, steps, expected, extra = {}) {
  const file = directory + '/' + name + '.sqlite', runId = 'faction-v1-' + hash({ directory, name }).slice(0, 20);
  const options = { runId, recipeHash: hash({ name, directory }), maxCalls: 12, maxTokens: 6000000 };
  let store = openProductionStore(file, options), calls = 0, requests = [], probes = 0, interruption = false;
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async q => {
    calls++; fixtureCalls++; requests.push(q.body);
    const response = await fault.send(q);
    if (!extra.reportedModel) return response;
    const payload = { ...response.payload, model: extra.reportedModel };
    const { receiptHash: ignoredReceiptHash, ...transportBody } = response.transportReceipt;
    const amendedTransport = { ...transportBody, payloadHash: hash(payload) };
    return { ...response, payload, transportReceipt: { ...amendedTransport,
      receiptHash: hash(amendedTransport) } };
  } });
  const factory = overrides => createFactionFieldValueRuntimeV1({ filename: file, input, store, dsh,
    providerAdapter: adapter, egressBinding, ensureCapability: async c => {
      probes++; eq(c.contractHash, task.contract.contractHash); return capability;
    }, priceUsage: usage => usage.totalUnits, readOriginalEvidence: () => original(), allowedRunIds: [runId],
    onProgress: row => {
      if (extra.interrupt && !interruption) { interruption = true;
        throw Object.assign(new Error('injected restart'), { code: 'INJECTED_AFTER_FIELD_ROUND' }); }
    }, ...overrides });
  let value;
  try {
    if (extra.interrupt) await reject(() => factory().run(prepared), 'INJECTED_AFTER_FIELD_ROUND');
    if (expected) {
      await reject(() => factory().run(prepared), expected);
      const count = calls;
      await reject(() => factory().run(prepared), expected); eq(calls, count);
      eq(calls, extra.calls ?? steps.length);
    } else {
      value = await factory().run(prepared);
      eq(value.completion.value.verdicts, originalEvidence.rejected.providerValue.verdicts);
      eq(value.output, prior.value.output);
      validateFactionProductionTargetReviewV1(value.output, { ...prepared.mapping,
        artifact: value, reviewSlotNamespaceBinding: slotBinding }); checks++;
      eq(value.semanticAcceptance, false); eq(value.rounds.length, steps.length);
      const count = calls, beforeProbes = probes;
      eq((await factory().run(prepared)).hash, value.hash); eq(calls, count); eq(probes, beforeProbes);
      for (const request of requests) {
        const payload = JSON.parse(request.input);
        const originalPayload = JSON.parse(task.context.compiledInput);
        eq(payload.orderedBlocks.slice(0, 3), originalPayload.orderedBlocks.slice(0, 3));
        eq(Object.keys(request.text.format.schema.properties), ['field0']);
      }
      if (value.rounds.length > 1) {
        eq(requests[1].instructions.includes('previous small field-value response'), true);
        eq(JSON.parse(requests[1].input).orderedBlocks.find(b => b.kind === 'volatile_local_issue').value.fieldValueFeedback.priorValue, steps[0].output);
      }
    }
  } finally { store.close(); }
  if (value) {
    store = openProductionStore(file, options);
    try { const beforeCalls = calls; eq((await factory().run(prepared)).hash, value.hash); eq(calls, beforeCalls); }
    finally { store.close(); }
    const successor = 'faction-v1-' + hash(name + '.successor.' + directory).slice(0, 20);
    store = openProductionStore(file, { ...options, runId: successor, recipeHash: hash(successor) });
    try {
      const beforeCalls = calls, beforeProbes = probes;
      const reused = await factory({ allowedRunIds: [runId, successor] }).run(prepared);
      eq(reused.completion.hash, value.completion.hash); eq(calls, beforeCalls); eq(probes, beforeProbes);
    } finally { store.close(); }
    const db = new DatabaseSync(file, { readOnly: true });
    const reader = choice => {
      const attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(choice.ownerRunId, choice.request.requestId);
      const failed = attempt.state === 'failed';
      const step = suffix => decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
        .get(attempt.run, attempt.id + suffix).artifact);
      return { attempt, failed, candidate: step(failed ? '.rejected-candidate' : '.candidate'),
        runtimeReceipt: step('.runtime-receipt'), issue: failed ? step('.issue') : null };
    };
    try {
      const proofArgs = { value, input, prepared, originalEvidence: original(), readPaidEvidence: reader, dshBindingHash: dsh.binding.hash };
      eq(verifyFactionFieldValueRoleV1(proofArgs).providerReceiptHashes.length, steps.length + 1);
      for (const patch of [{ semanticAcceptance: true }, { rounds: value.rounds.slice(1) }, { taskHash: hash('wrong') },
        { completion: reseal(value.completion, { value: { verdicts: [] } }) }, { output: {} }, { reviewSlotNamespaceBindingHash: hash('wrong') }]) {
        assert.throws(() => verifyFactionFieldValueRoleV1({ ...proofArgs, value: reseal(value, patch) })); checks++;
      }
    } finally { db.close(); }
  }
  eq(fault.inspect().networkUsed, false);
  scenarios.push({ name, calls, expectedCode: expected, roleArtifactHash: value?.hash || null, value: value || null });
  console.log(JSON.stringify({ scenario: name, calls, expectedCode: expected, passed: true, checks }));
}

await scenario('type_then_value', [{ kind: 'success', output: { field0: 'not-an-array' } }, { kind: 'success', output: good }], null);
await scenario('host_then_value', [{ kind: 'success', output: { field0: [] } }, { kind: 'success', output: good }], null);
await scenario('null_extension', [{ kind: 'success', output: { ...good, irrelevant_extension: null } }], null);
await scenario('reported_model_alias', [{ kind: 'success', output: good }], null,
  { reportedModel: 'deepseek-flash' });
await scenario('unknown_reported_model', [{ kind: 'success', output: good }],
  'FACTION_FIELD_VALUE_SUCCESS_PROVENANCE_DRIFT', { calls: 1, reportedModel: 'unregistered-model' });
await scenario('restart_after_round', [{ kind: 'success', output: good }], null, { interrupt: true });
await scenario('no_progress', [{ kind: 'success', output: { field0: false } }, { kind: 'success', output: { field0: false } }], 'FACTION_FIELD_VALUE_NO_PROGRESS');
await scenario('exhausted', [false, 1, 'bad'].map(field0 => ({ kind: 'success', output: { field0 } })), 'FACTION_FIELD_VALUE_ATTEMPT_LIMIT');
await scenario('nonnull_objection', [{ kind: 'success', output: { ...good, objection: 'Do not silently erase this dissent.' } }], 'FACTION_FIELD_VALUE_ADJUDICATION_REQUIRED');
await scenario('unknown_delivery', [{ kind: 'ambiguous_send' }], 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND', { calls: 1 });
await scenario('payment_stop', [{ kind: 'success', output: good, status: 402 }], 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK', { calls: 1 });
eq(hash(original().attempt), hash(originalEvidence.attempt));
const files = ['packages/skill-production-v3/faction-field-value-runtime-v1.mjs',
  'packages/skill-production-v3/faction-field-repair-task-v1.mjs', 'packages/structured-generation/field-codec-v1.mjs',
  'scripts/verify-ticket-18-field-value-runtime-v1.mjs'];
const report = seal({ version: 'faction_field_value_runtime_proof_v1', passed: true, checks, directory,
  actualOriginalPaidEvidencePreserved: true, familyHash: family.hash, taskHash: task.hash,
  scenarios, injectedProviderCalls: fixtureCalls, providerCalls: 0, actualDshSessions: args.includes('--dsh') ? dshCalls : 0,
  dshInjectionUsed: !args.includes('--dsh'), productionMainWired: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'field-value-runtime-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, injectedProviderCalls: fixtureCalls,
  actualDshSessions: report.actualDshSessions, providerCalls: 0, productionMainWired: false }));
