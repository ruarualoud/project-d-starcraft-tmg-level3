import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, fail, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_JSON_OUTPUT_EXAMPLES_V1, inspectFactionBatchScopeV1,
  validateFactionDraftBatchV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionNativeProductionRoleV1, factionNativeProductionKindV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';

// Diagnose only the settled Terran attempt. The other production lane may
// still run; this script does not assert full-run terminal state or replay it.
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const runId = 'faction-v1-9200d037cfa6a1c4a388';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const recipe = await read(runId + '/recipe'), input = await read('terran_armed_forces-input');
const diagnosis = await read('terran-proposer-auxiliary-diagnosis');
const { proposerBatch, outputRequestAtEnd, judge, ...writingWorkspace } = diagnosis.request.workspace;
const parentId = diagnosis.request.packet.id + '.' + proposerBatch.plan.parentRoleId;
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let request, rebuildRequest, receipt, failure, roleInputHash, raw, issue, complete, outlineArtifact, assembly;
try {
  const get = id => {
    const row = db.prepare("SELECT artifact,input_hash FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
    assert.ok(row, id); return { row, value: verifySeal(verifySeal(JSON.parse(row.artifact)).value) };
  };
  assembly = get(parentId + '.assembly-v1.' + proposerBatch.plan.hash.slice(0, 20)).value;
  const section = writingWorkspace.section, epoch = '.planning-v1.' + assembly.hash.slice(0, 20);
  const fullId = suffix => diagnosis.request.packet.id + '.' + section.id + '.' + suffix + epoch;
  outlineArtifact = get(fullId('generator-outline')).value;
  complete = [0, 2].flatMap(n => get(fullId('generator-items.' + n)).value.output.items.map(r => r.value));
  const original = get(fullId('generator-items.4')); raw = original.value;
  const indices = [4, 5], instruction = 'Generator：仅为indices指定的1至2项提纲写完整中文策略建议。全部官方来源、总规则、整节提纲和已完成建议均在输入中；分批只限制输出，不限制阅读。逐项保留适用条件、支付/时机/例外、步骤、替代、风险、reviseIf和未证明效果。对于单位考虑装备/规模/任务条件；卡牌保留次数限制和资源替代用途。不保证胜利，不复制题号。返回' + FACTION_JSON_OUTPUT_EXAMPLES_V1.generatorItems
    + '，index必须是从indices复制的JSON整数，每个index一次。每项文本不超过1600字符，sourceRefs保留提纲所引来源，可补真实来源至最多8个。不要输出其他index、整份Skill或提纲。';
  request = { packet: diagnosis.request.packet, roleId: section.id + '.generator-items.4' + epoch,
    instruction, maxOutput: 4096, workspace: { ...writingWorkspace, proposerPlan: proposerBatch.plan,
      proposerAssemblyHash: assembly.hash, proposals: assembly.output, judge, outline: outlineArtifact.output.outline,
      indices, completedRecommendations: complete } };
  const capacity = recipe.nativeOutputCapacityBinding;
  const prepared = prepareFactionNativeProductionRoleV1({ input, request: applyFactionNativeOutputCapacityV2(request, capacity),
    executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity, proposerBatchBinding: recipe.proposerBatchBinding,
    proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding });
  assert.equal(hash(prepared.roleInput), original.row.input_hash);
  assert.deepEqual(prepared.contextManifestRef, raw.contextManifestRef);
  const args = { input, outline: outlineArtifact.output.outline, indices, completedRecommendations: complete };
  assert.throws(() => validateFactionDraftBatchV1(raw.output, args), { code: 'FACTION_BATCH_SOURCE_OMISSION' });
  issue = get(raw.roleId + '.target-issue-v1').value;
  const { hash: ignored, ...scope } = inspectFactionBatchScopeV1(raw.output, args);
  assert.deepEqual(seal({ ...scope, rejectedArtifactHash: raw.hash, failureCode: 'FACTION_BATCH_SOURCE_OMISSION' }), issue);
  assert.deepEqual(raw.output.items.map(r => r.index), indices);
  assert.deepEqual(issue.targets.map(t => t.missingSourceRefs), [
    ['source:tactical_cards:dropship', 'faq-v1:24'],
    ['source:tactical_cards:factory', 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.31']]);
  assert.ok(raw.output.items[0].value.title.includes('Barracks (Proxy)'));
  assert.ok(raw.output.items[1].value.title.includes('Engineering Bay'));
  assert.equal(factionNativeProductionKindV1(request.roleId), 'items');
  rebuildRequest = { ...request, roleId: request.roleId + '.target-reconstruction.v1',
    instruction: instruction + '\n这是已确认写错提纲项后的定点重建，不是只换index/引用。不得复制completedRecommendations；必须从来源独立编写outputRequestAtEnd指定focus。旧错误正文不提供；整个来源/整节提纲/成功前文仍在。',
    workspace: { ...request.workspace, targetIssue: issue,
      outputRequestAtEnd: { action: 'write_only_these_new_outline_items', targets: issue.targets,
        forbidden: 'Do not copy completedRecommendations or merely relabel their indices/citations.',
        expectedShape: { items: indices.map(index => ({ index, value: JSON.parse(FACTION_JSON_OUTPUT_EXAMPLES_V1.generatorItems).items[0].value })) } } } };
  assert.equal(factionNativeProductionKindV1(rebuildRequest.roleId), null);
  const step = db.prepare('SELECT input_hash,state FROM steps WHERE run=? AND id=?').get(runId,
    request.packet.id + '.' + rebuildRequest.roleId);
  assert.equal(step.state, 'pending'); roleInputHash = step.input_hash;
  failure = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId,
    request.packet.id + '.' + rebuildRequest.roleId + '.call-1.format-0');
  assert.equal(failure.state, 'failed'); assert.equal(failure.code, 'PROVIDER_RESPONSE_JSON_INVALID');
  receipt = verifySeal(JSON.parse(failure.response)).value;
  assert.equal(receipt.status, 200); assert.equal(receipt.responseOutcome.finishReason, 'stop');
  assert.equal(receipt.responseOutcome.syntaxIssue, 'separator');
  assert.equal(receipt.responseOutcome.usage.outputUnits, 1840);
} finally { db.close(); }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
assert.equal(context.hash, recipe.contextHash);
const forbidden = () => fail('TARGET_RECONSTRUCTION_DIAGNOSIS_EGRESS_FORBIDDEN');
const runtime = createProductionRuntimeV3({ context, reader: {}, verifier: {}, model: forbidden, dsh: { run: forbidden },
  store: { acquire(id, value) {
    assert.equal(id, rebuildRequest.packet.id + '.' + rebuildRequest.roleId);
    assert.equal(hash(value), roleInputHash); fail('TARGET_RECONSTRUCTION_DIAGNOSIS_CAPTURED');
  } } });
await assert.rejects(runtime.role(rebuildRequest), { code: 'TARGET_RECONSTRUCTION_DIAGNOSIS_CAPTURED' });
const report = seal({ passed: true, originRunId: runId, originAttemptId: failure.id,
  originalFailureReceiptHash: receipt.receiptHash, originalRequestHash: failure.request_hash,
  nativeRequestRebuilt: true, legacyRepairRoleInputRebuilt: true, inputHash: input.hash,
  originalNativeArtifactHash: raw.hash, targetIssueHash: issue.hash, originalOutlineHash: outlineArtifact.hash,
  assemblyHash: assembly.hash, request, rebuildRequest, roleInputHash, targetIssue: issue,
  actualIndices: raw.output.items.map(r => r.index), actualTitles: raw.output.items.map(r => r.value.title),
  expectedTargets: issue.targets.map(t => ({ index: t.index, focus: t.focus, requiredSourceRefs: t.requiredSourceRefs })),
  hypothesisResults: { metadataOnlyOrWrongIndices: false, realWrongTargetProse: true,
    reconstructionEscapedNativeSchemaRoute: true, outputTruncation: false, modelContentJsonSeparatorFailure: true },
  malformedProseRecoverableFromSafeReceipt: false, responseOutcomeHash: receipt.responseOutcome.hash,
  originalUsage: receipt.responseOutcome.usage, originalSettledMicros: failure.settled,
  plannedFix: 'route_bounded_target_reconstruction_through_native_schema_keep_exact_sources_targets_and_full_context',
  wholeBatchResamplingAuthorizedByDiagnosis: false, productionFixed: false, providerCalls: 0,
  fullRunTerminalClaimed: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: [{ file: 'scripts/diagnose-ticket-18-native-target-reconstruction-v1.mjs', hash: sha256(await readFile(import.meta.filename)) }] });
await writeFile(base + 'native-target-reconstruction-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, realWrongTargetProse: true, nativeRequestRebuilt: true,
  legacyRepairRoleInputRebuilt: true, outputTruncation: false, providerCalls: 0, hash: report.hash }));
