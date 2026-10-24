// Actual B timeout input and delivered probability citations, not a synthetic
// shorter strategy. One RED, then one GREEN after the scoped source correction.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createRosterRevisionTeachEvidenceV1 } from '../packages/roster-strategist/roster-revision-teach-evidence-v1.mjs';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterStrategistRuntimeV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';

const [base, mode] = process.argv.slice(2);
assert(['red', 'green'].includes(mode));
const dest = base + '/common-v222-revision-retained-' + mode + '.private.json';
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { providerCalls: 0, nativeCalls: 0, originalWrites: 0, checks: [] };
const start = Date.now();
try {
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const row = cfg.rows.find(r => r.arm === 'B');
  const filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  const original = await fs.readFile(filename, 'utf8'), draft = JSON.parse(original);
  const state = draft.teachFramework.state, plan = JSON.parse(draft.planSerialized);
  const oldBody = JSON.parse(gunzipSync(await fs.readFile(base + '/common-v218-B-captured-request.private.json.gz')));
  const oldInput = JSON.parse(oldBody.input);
  const oldExperience = oldInput.promptNodes.find(n => n.nodeType === 'teach-framework-experience').content.experience;
  const port = createRosterRevisionTeachEvidenceV1(state, draft.toolReceipts, oldExperience.sourcePlanBinding);
  const bindings = port.experience.synthesis.answers.flatMap(a =>
    [...(a.quantitativeEvidence || []), ...(a.qualitativeEvidence || [])]);
  const reads = bindings.map(b => ({ binding: b, result: port.read({ receiptHash: b.receiptHash, path: b.path }) }));
  report.unreadableCurrentBindings = reads.filter(r => r.result.status !== 'read').map(r => ({
    receiptHash: r.binding.receiptHash, path: r.binding.path, code: r.result.code,
  }));
  assert.equal(report.unreadableCurrentBindings.length, 0,
    'current bound evidence must be retrievable through the same delivered path');
  for (const { binding, result } of reads) {
    const expected = binding.typedValues[0];
    assert.deepEqual(result.result.value, expected.sourceValue ?? expected.value);
  }
  report.checks.push('all_15_current_numeric_and_qualitative_bindings_read_exact_original_values');
  assert.equal(port.experience.evidenceDelivery.mode, 'retained_index_v1');
  const raw = [...(state.evidence || []), ...(state.investigation?.evidence || []),
    ...(state.queryRecovery?.operations || []).filter(op => op.result).map(op => op.result)];
  assert.equal(port.experience.evidence.length, raw.length);
  let exactFields = 0;
  for (const [i, entry] of port.experience.evidence.entries()) {
    assert.equal(entry.evidenceObjectHash, hash(raw[i]));
    assert.equal(entry.questionId, raw[i].questionId);
    assert.equal(entry.status, raw[i].status);
    assert.equal(entry.unknownReasonCode, raw[i].unknownReasonCode ?? raw[i].unknownReason);
    const request = JSON.parse(entry.retrieval.toolRequestJson);
    for (const [key, expected] of Object.entries(raw[i])) {
      if (JSON.stringify(expected).length > 32768) continue;
      const read = port.read({ ...request, path: key });
      assert.equal(read.status, 'read'); assert.deepEqual(read.result.value, expected); exactFields++;
    }
    assert(!Object.hasOwn(entry, 'queryRepair'), 'repair histories are indexed, not reinjected into a prose revision');
    assert(!Object.hasOwn(entry, 'followUpReceipts'), 'original nested receipts stay queryable');
  }
  for (const key of ['framework', 'agenda', 'synthesis', 'coverage', 'authority', 'sourcePlanBinding']) {
    assert.deepEqual(port.experience[key], oldExperience[key], key + ' must remain unchanged');
  }
  report.checks.push('all_original_receipts_failures_questions_and_small_fields_remain_addressable',
    'current_strategy_synthesis_questions_and_conditions_verbatim');
  report.originalReceiptCount = raw.length; report.exactOriginalFieldReads = exactFields;

  // Exercise the real revision consumer: one requested projected-evidence read
  // must reach the next model round, without any Native/query recomputation.
  const scene = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
  const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(scene.officialUnitCompositionUpgradeDataBundle) });
  const noNative = () => { report.nativeCalls++; throw Error('NO_NATIVE'); };
  const laboratory = createPregameSceneLaboratoryV1({ sourceState: scene, armyBuilderPort: builder,
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate: noNative, instantiate: noNative, apply: noNative } });
  const strategist = createRosterStrategistRuntimeV1({ armyBuilderPort: builder, laboratory,
    strategyPack: { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } },
    selectionUnitRules: draft.teachFramework.context.sourceFacts.selectionUnitRules });
  const request = JSON.parse(await fs.readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8'));
  const selected = bindings.filter(b => b.bindingView === 'delivered_receipt_projection');
  assert.equal(selected.length, 2);
  let rounds = 0;
  const deliberation = { descriptor: () => ({ modelVersion: 'offline_v222', promptVersion: 'actual_B_retained_delivery' }),
    async deliberate(input) {
      rounds++;
      if (rounds === 1) {
        const exp = input.promptNodes.find(n => n.nodeType === 'teach-framework-experience').content.experience;
        assert.equal(exp.evidenceDelivery.mode, 'retained_index_v1');
        for (const node of oldInput.promptNodes.filter(n => n.nodeType !== 'teach-framework-experience')) {
          assert.deepEqual(input.promptNodes.find(n => n.nodeType === node.nodeType).content, node.content,
            node.nodeType + ' strategy/facts must not change');
        }
        const serialized = JSON.stringify({ promptPack: input.promptPack, promptNodes: input.promptNodes,
          userMessage: input.userMessage, responseContract: input.responseContract });
        report.oldInputBytes = Buffer.byteLength(oldBody.input); report.newInputBytes = Buffer.byteLength(serialized);
        report.inputReduction = 1 - report.newInputBytes / report.oldInputBytes;
        assert(report.newInputBytes < report.oldInputBytes, 'actual request should not grow');
        return { output: { schemaVersion: 'starcraft_tmg_roster_strategist_deliberation_v1', roundKind: 'revision',
          repairs: [], evidenceRequests: selected.map(b => ({ receiptHash: b.receiptHash, path: b.path })) },
          receipt: { receiptHash: 'c'.repeat(64) } };
      }
      const delivered = input.promptNodes.find(n => n.nodeType === 'revision-retained-evidence').content.results;
      assert.equal(delivered.length, 2);
      delivered.forEach((r, i) => { assert.equal(r.status, 'read');
        assert.deepEqual(r.result.value, selected[i].typedValues[0].sourceValue); });
      throw Error('CAPTURE_COMPLETE_NO_PROVIDER');
    } };
  let saved = draft;
  const service = createRosterPlanningWorkspaceServiceV1({ armyBuilderPort: builder, laboratoryCore: laboratory,
    strategyPack: { foundational: { entries: Array.from({ length: 5 }, () => ({})) }, receipt: { hash: 'b'.repeat(64) } },
    fixture: draft.teachFramework.context.fixture,
    selectionUnitRules: draft.teachFramework.context.sourceFacts.selectionUnitRules,
    draftStore: { loadAll: async () => ({ sessions: [draft], quarantined: [] }), save: async value => { saved = value; } },
    createRunLaboratory: () => laboratory, createStrategist: () => strategist,
    deliberationFactory: { createForRun: async () => deliberation },
  });
  await service.loadPersisted(); await service.revisePlan(draft.sessionId, request);
  while (saved.status === 'running') await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(saved.failure?.code, 'CAPTURE_COMPLETE_NO_PROVIDER', JSON.stringify(saved.failure));
  assert.equal(rounds, 2); assert(laboratory.proveMutationZero().sourceStateHashUnchanged);
  assert.equal(await fs.readFile(filename, 'utf8'), original);
  report.checks.push('actual_B_revision_requests_and_receives_both_projection_paths_without_new_simulation',
    'all_non_Teach_nodes_unchanged_original_draft_and_scene_unchanged');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message.slice(0, 2000); process.exitCode = 1; }
report.elapsedMs = Date.now() - start;
await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
