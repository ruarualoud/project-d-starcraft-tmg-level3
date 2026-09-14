import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareFactionStructuredLocalEditorRoleV1, createFactionStructuredLocalEditorRuntimeV1 } from '../packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs';
import { FACTION_EDITOR_DRAFT_ENVELOPE_BINDING_V2 as binding, FACTION_EDITOR_ENVELOPE_EXECUTION_POLICY_V2 as executionPolicy,
  normalizeFactionEditorDraftEnvelopeV2, materializeFactionEditorDraftEnvelopeV2 } from '../packages/skill-production-v3/faction-editor-draft-envelope-v2.mjs';
import { FACTION_DRAFT_ENVELOPE_BINDING_V2 as draftEnvelopeBinding } from '../packages/skill-production-v3/faction-draft-envelope-v2.mjs';
import { normalizeFactionStrategyPatchEnvelopeV1, applyFactionStrategyPatchV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract } from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION, outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { collectFactionEditorEnvelopeFailureImportsV2 } from '../packages/skill-production-v3/faction-editor-envelope-failure-imports-v2.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const read = async n => verifySeal(JSON.parse(await readFile(base + n + '.json', 'utf8')));
const diagnosis = await read('editor-envelope-boundary-diagnosis-v2'), cases = [];
const dsh = await prepareDshLoop(process.cwd());
const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }] })
  .resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const now = Date.now(), capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({
  providerProfileRef: egressBinding.providerProfileRef, endpointPath: '/responses', endpointDialect: egressBinding.endpointDialect,
  model: egressBinding.model, capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: outputContractRefStarcraftTmgV1(contract), probeInputHash: hash('INJECTED-editor-envelope'),
  probeOutputHash: hash('INJECTED-editor-envelope-output'), probeResult: 'accepted_schema_valid',
  usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true, physicalAttempts: 1,
  probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
let checks = 0, actualDshSessions = 0, injectedProviderCalls = 0;
const reseal = (v, delta) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...delta }); };
for (const [ordinal, sample] of diagnosis.samples.entries()) {
  const input = await read(sample.origin.originRunId + '/' + sample.faction + '-input');
  const native = await read(sample.faction + '-draft-envelope-diagnosis');
  const component = await read('draft-envelope-recovery-component-v2');
  const actualItems = component.recoveredRoles[ordinal].output.items;
  const recommendations = [...native.request.workspace.completedRecommendations, ...actualItems.map(i => i.value)];
  const draft = structuredClone({ recommendations }), index = sample.targetIndex;
  assert.deepEqual(draft.recommendations[index], sample.originalAdvice); checks++;
  // One injected defect makes the unchanged actual paid advice a meaningful
  // local replacement for this fixture. This is NOT a semantic correction.
  draft.recommendations[index].risk = 'INJECTED EDITOR FIXTURE: ' + draft.recommendations[index].risk;
  const section = native.request.workspace.section, parentHash = hash(draft);
  const issue = { kind: 'recommendation_source_or_condition', index, oldHash: hash(draft.recommendations[index]),
    findings: [{ verdict: 'unsupported', reason: 'Remove only the injected fixture marker; not a source qualification.',
      sourceRefs: sample.originalAdvice.sourceRefs }] };
  const issues = seal({ sectionId: section.id, parentHash, issues: [issue], openIssues: 1, trainingTruth: false });
  const request = { packet: native.request.packet, roleId: section.id + '.editor.0.0',
    instruction: 'Injected editor boundary request from real paid advice.', maxOutput: 4096,
    workspace: { inputHash: input.hash, section, draft, parentHash, localIssue: issue, issues, allIssues: issues } };
  const prepared = prepareFactionStructuredLocalEditorRoleV1({ input, request, outputContract: contract, executionPolicy });
  let recovered, savedEvidence;
  const modes = ordinal === 0 ? ['old_boundary', 'recover', 'unknown_source', 'empty_procedure', 'too_many_refs', 'incomplete', 'payment_required']
    : ['old_boundary', 'recover'];
  for (const mode of modes) {
    const fixtureRecipe = seal({ version: 'editor_envelope_test_parent', ordinal, mode });
    const runId = 'faction-v1-' + fixtureRecipe.hash.slice(0, 20), attempts = new Map();
    const filename = mode === 'recover' ? (await mkdtemp(base + 'editor-envelope-test-')) + '/fixture.sqlite' : ':memory:';
    const store = openProductionStore(filename, { runId, recipeHash: fixtureRecipe.hash, maxCalls: 2, maxCostMicros: 5000000, maxTokens: 1000000 });
    const journal = { ...store,
      reserve(id, body, ...rest) { const r = store.reserve(id, body, ...rest);
        attempts.set(id, { run: runId, id, request_hash: hash(body), state: 'intent' }); return r; },
      settle(id, value) { const r = store.settle(id, value);
        attempts.set(id, { ...attempts.get(id), ...store.summary().attempts.find(a => a.id === id),
          usage: JSON.stringify(seal({ value: value.usage })), response: JSON.stringify(seal({ value: value.failureReceipt })) }); return r; } };
    const output = structuredClone(sample.originalAdvice);
    if (mode === 'unknown_source') output.sourceRefs[0] = 'source:invented';
    if (mode === 'empty_procedure') output.procedure = [];
    if (mode === 'too_many_refs') output.sourceRefs = input.frozenSources.prompt.sources.slice(0, 129).map(s => s.ref);
    const step = mode === 'incomplete' ? { kind: 'incomplete' } : mode === 'payment_required' ? { kind: 'failed', status: 402 } : { kind: 'success', output };
    const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
    const providerAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => fault.send(args) });
    let evidence, reads = 0;
    const runtime = createFactionStructuredLocalEditorRuntimeV1({ input, runtime: { role: () => assert.fail('No legacy fallback') },
      store: journal, providerAdapter, egressBinding, capabilityReceipt, outputContract: contract, executionPolicy, priceUsage: u => u.totalUnits,
      ...(mode === 'old_boundary' ? {} : { editorEnvelopeBinding: binding, draftEnvelopeBinding }),
      dsh: { binding: dsh.binding, run(args) { if (args.task.startsWith('Import ')) { actualDshSessions++; return dsh.run(args); }
        return runDirectLoop(args); } },
      readEditorEnvelopeFailure({ prepared: observed, failureReceiptHash }) {
        reads++; assert.equal(observed.capsule.hash, prepared.capsule.hash);
        const attempt = [...attempts.values()][0];
        evidence = filename === ':memory:'
          ? { attempt, issue: store.artifact(attempt.id + '.issue'), rejected: store.artifact(attempt.id + '.rejected-candidate') }
          : readFactionTeachFailureEvidenceV1({ filename, runId, attemptId: attempt.id });
        assert.equal(evidence.issue.safeReceiptHash, failureReceiptHash); return evidence;
      } });
    try {
      if (mode === 'recover') {
        const value = await runtime.role(request); recovered = value; savedEvidence = evidence;
        assert.deepEqual(value.output, sample.originalAdvice); checks++;
        assert.equal((await runtime.role(request)).hash, value.hash); checks++;
        const args = { input, request, prepared, evidence, binding, draftEnvelopeBinding };
        assert.equal(materializeFactionEditorDraftEnvelopeV2(args).hash, value.hostMaterialization.hash); checks++;
        const consumer = { value, input, request, roleInput: prepared.roleInput,
          recipe: { editorEnvelopeBinding: binding, draftEnvelopeBinding, dshBindingHash: dsh.binding.hash }, resolveTeachFailureEvidence: () => evidence };
        assert.deepEqual(verifyFactionStructuredRoleReplayV1(consumer).providerReceiptHashes, [evidence.issue.safeReceiptHash]); checks++;
        const patch = normalizeFactionStrategyPatchEnvelopeV1(value.output, { input, draft, issues, draftEnvelopeBinding });
        const applied = applyFactionStrategyPatchV1(patch.output, { input, draft, issues, draftEnvelopeBinding });
        assert.deepEqual(applied.recommendations, recommendations); checks++;
        assert.equal(value.semanticAcceptance, false); checks++;
        assert.equal(value.freshWholeSectionReviewRequired, true); checks++;
        for (const key of ['editorEnvelopeBinding', 'draftEnvelopeBinding']) {
          const wrong = { ...consumer.recipe }; delete wrong[key];
          assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumer, recipe: wrong })); checks++;
        }
        assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...consumer, value: reseal(value, {
          output: { ...value.output, risk: value.output.risk + ' changed' } }) })); checks++;
        for (const changed of [
          { ...evidence, attempt: { ...evidence.attempt, state: 'intent' } },
          { ...evidence, issue: reseal(evidence.issue, { safeReceiptHash: hash('foreign') }) },
          { ...evidence, rejected: reseal(evidence.rejected, { contextManifestRef: { hash: hash('foreign') } }) },
        ]) { assert.throws(() => materializeFactionEditorDraftEnvelopeV2({ ...args, evidence: changed })); checks++; }
        assert.equal(store.summary().attempts[0].state, 'failed'); checks++;
        assert.equal(reads, 1); checks++;
        const carried = collectFactionEditorEnvelopeFailureImportsV2({ filename, parentRunId: runId, parent: fixtureRecipe });
        assert.equal(carried.permits.length, 1); checks++;
        assert.deepEqual(carried.evidence[0], evidence); checks++;
        for (const wrong of [false, true]) {
          const permits = structuredClone([...carried.permits, ...carried.permits]);
          if (wrong) permits[0].evidenceHash = hash('foreign');
          const childRecipe = seal({ version: 'editor_envelope_test_child', parentHash: fixtureRecipe.hash,
            continuation: { editorEnvelopeFailureImports: permits } });
          const childId = 'faction-v1-' + childRecipe.hash.slice(0, 20);
          const child = openProductionStore(filename, { runId: childId, recipeHash: childRecipe.hash });
          try {
            const operation = () => collectFactionEditorEnvelopeFailureImportsV2({ filename, parentRunId: childId, parent: childRecipe });
            if (wrong) assert.throws(operation, { code: 'FACTION_EDITOR_ENVELOPE_IMPORT_ORIGIN_DRIFT' });
            else assert.deepEqual(operation().permits, carried.permits);
            checks++;
            assert.equal(child.summary().calls, 0); checks++;
          } finally { child.close(); }
        }
      } else {
        const expected = { old_boundary: 'STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED',
          unknown_source: 'FACTION_EDITOR_ENVELOPE_UNKNOWN_SOURCE', empty_procedure: 'STRUCTURED_PROVIDER_SCHEMA_INVALID',
          too_many_refs: 'FACTION_EDITOR_ENVELOPE_HOST_SCHEMA_INVALID', incomplete: 'STRUCTURED_PROVIDER_INCOMPLETE',
          payment_required: 'PROVIDER_PAYMENT_REQUIRED' }[mode];
        await assert.rejects(runtime.role(request), { code: expected }); checks++;
      }
      assert.equal(fault.inspect().calls.length, 1); injectedProviderCalls++; checks++;
      assert.equal(store.summary().steps.filter(s => s.state === 'running').length, 0); checks++;
    } finally { store.close(); }
  }
  let cached = null, imports = 0;
  const importOptions = { input, runtime: { role: () => assert.fail('No import fallback') },
    store: { acquire: () => cached ? { cached: true, artifact: cached } : { cached: false }, finish: (_l, v) => (cached = v), release() {} },
    providerAdapter: { complete: () => assert.fail('No Provider for saved failure') }, egressBinding, capabilityReceipt,
    outputContract: contract, executionPolicy, priceUsage: () => assert.fail('No import billing'),
    editorEnvelopeBinding: binding, draftEnvelopeBinding, editorEnvelopeImports: [savedEvidence],
    dsh: { binding: dsh.binding, async run(args) { imports++;
      assert.equal((await args.callModel()).receiptHash, recovered.hostMaterialization.hash); return recovered.loop; } } };
  const importedRuntime = createFactionStructuredLocalEditorRuntimeV1(importOptions);
  assert.equal((await importedRuntime.role(request)).hash, recovered.hash); checks++;
  assert.equal((await importedRuntime.role(request)).hash, recovered.hash); checks++;
  assert.equal(imports, 1); checks++;
  let cutoverRole = null;
  const dryRuntime = createFactionStructuredLocalEditorRuntimeV1({ ...importOptions, dry: true,
    store: { acquire: () => ({ cached: false }), release() {} },
    onEnvelopeImport: ({ roleId }) => { cutoverRole = roleId; },
    dsh: { run: () => assert.fail('No DSH or Provider in dry import') } });
  await assert.rejects(dryRuntime.role(request), { code: 'FACTION_PREFLIGHT_FIRST_EDITOR_ENVELOPE_IMPORT' }); checks++;
  assert.equal(cutoverRole, prepared.fullRoleId); checks++;
  assert.throws(() => createFactionStructuredLocalEditorRuntimeV1({ ...importOptions,
    executionPolicy: { ...executionPolicy, maxOutputUnits: 4096 } }), { code: 'FACTION_EDITOR_ENVELOPE_EXECUTION_POLICY_DRIFT' }); checks++;
  const duplicate = structuredClone(sample.originalAdvice); duplicate.sourceRefs.push(duplicate.sourceRefs[0]);
  const normalized = normalizeFactionEditorDraftEnvelopeV2({ input, value: duplicate, binding, draftEnvelopeBinding });
  assert.deepEqual(normalized.output, sample.originalAdvice); checks++;
  cases.push({ faction: sample.faction, originalPaidAdviceHash: sample.originalAdviceHash,
    preparedRoleInputHash: hash(prepared.roleInput), recoveryHash: recovered.hash, recovered,
    oldBoundaryReproduced: true, currentFaultRecovered: true, independentConsumerPassed: true, hostPatchPassed: true,
    zeroProviderRestartImportPassed: true, actualPaidEditorFailure: false });
}
const files = ['packages/skill-production-v3/faction-editor-draft-envelope-v2.mjs',
  'packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs', 'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-production-v3/faction-editor-envelope-failure-imports-v2.mjs',
  'scripts/verify-ticket-18-editor-draft-envelope-v2.mjs'];
const report = seal({ passed: true, checks, binding, draftEnvelopeBinding, cases, diagnosisHash: diagnosis.hash,
  actualDshSessions, injectedProviderCalls, providerCalls: 0, currentFailureBranchTested: true,
  oldBoundaryReproduced: true, independentConsumerPassed: true, hostPatchPassed: true, zeroProviderRestartImportPassed: true,
  durableDescendantImportsPassed: true,
  dryImportHasNoDshOrProvider: true, policyDriftRejectedBeforeEgress: true,
  formalProductionRecovered: false, actualPaidEditorFailures: 0, semanticAcceptanceInherited: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'editor-draft-envelope-readiness-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions, injectedProviderCalls, providerCalls: 0,
  formalProductionRecovered: false, hash: report.hash }));
