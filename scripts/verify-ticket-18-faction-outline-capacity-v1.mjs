import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256, fail } from
  '../packages/skill-production/common.mjs';
import { loadFrozenSkillEvidence } from
  '../packages/skill-production/evidence.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionKnownRulePolicyV1 } from
  '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from
  '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { createFactionObservedRosterFactsV1 } from
  '../packages/skill-evaluation/faction-observed-roster-facts-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createFactionWritingPlanV1, factionRoleWorkspaceV1,
  validateFactionOutlineV1 as validateOutlineV1 } from
  '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { validateFactionOutlineV1 as validateOutlineV2 } from
  '../packages/skill-production-v3/faction-strategy-workflow-v2.mjs';
import { readFactionTeachFailureEvidenceV1 } from
  '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { prepareFactionNativeProductionRoleV1 } from
  '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from
  '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { createFactionProposerBatchPlanV1 } from
  '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { FACTION_OUTLINE_CAPACITY_BINDING_V1 as binding,
  inspectFactionOutlineCapacityEvidenceV1,
  materializeFactionOutlineCapacityV1,
  normalizeFactionOutlineCapacityV1 } from
  '../packages/skill-production-v3/faction-outline-capacity-envelope-v1.mjs';
import { withFactionOutlineCapacityRecoveryV1,
  usesFactionNativeProductionInputV2 } from
  '../packages/skill-production-v3/faction-outline-capacity-runtime-v1.mjs';

const root = process.cwd();
const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-78a790a93bf925b95048';
const attemptId =
  'structured-038e5ffef21535a6164978586f5c6e12c6829184340b87ed';
const read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const recipe = await read(base + runId + '/recipe.json');
const input = await read(base + 'zerg_swarm-input.json');
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId });
const inspected = inspectFactionOutlineCapacityEvidenceV1({ input, evidence,
  binding });
let checks = 0;
assert.deepEqual(inspected.normalized.output, evidence.rejected.providerValue);
checks++;
assert.equal(inspected.normalized.originalOutputHash,
  hash(evidence.rejected.providerValue)); checks++;
assert.deepEqual(inspected.normalized.focusLengths,
  [671, 721, 689, 681, 661, 609, 1105]); checks++;
assert.equal(inspected.normalized.contentChanged, false); checks++;
assert.throws(() => validateOutlineV1(inspected.normalized.output,
  { input, section: { requiredSourceRefs: [] } })); checks++;
validateOutlineV2(inspected.normalized.output,
  { input, section: { requiredSourceRefs: [] }, outlineCapacityBinding: binding });
checks++;

const unknown = structuredClone(evidence.rejected.providerValue);
unknown.outline[0].sourceRefs[0] = 'source:invented';
assert.throws(() => normalizeFactionOutlineCapacityV1({ input, value: unknown,
  binding }), { code: 'FACTION_OUTLINE_CAPACITY_UNKNOWN_SOURCE' }); checks++;
const nonCapacity = structuredClone(evidence.rejected.providerValue);
nonCapacity.extra = true;
assert.throws(() => normalizeFactionOutlineCapacityV1({ input,
  value: nonCapacity, binding }),
{ code: 'FACTION_OUTLINE_CAPACITY_NOT_APPLICABLE' }); checks++;
const tooLarge = structuredClone(evidence.rejected.providerValue);
tooLarge.outline[0].focus = 'x'.repeat(1601);
assert.throws(() => normalizeFactionOutlineCapacityV1({ input,
  value: tooLarge, binding }),
{ code: 'FACTION_OUTLINE_CAPACITY_NOT_APPLICABLE' }); checks++;

// Rebuild the exact historical outline request from authenticated completed
// role artifacts. This avoids replaying unrelated old review migrations.
const catalogue = await loadFrozenSkillEvidence(root);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const observedFacts = createFactionObservedRosterFactsV1({ input, dataset });
assert.equal(knownRulePolicy.hash, recipe.knownRulePolicyHashes[1]); checks++;
assert.equal(observedFacts.hash, recipe.observedRosterFactsHashes[1]); checks++;
const productionDb = new DatabaseSync(filename, { readOnly: true });
const role = id => {
  const row = productionDb.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, id);
  if (!row) fail('OUTLINE_CAPACITY_ROLE_EVIDENCE_MISSING');
  return verifySeal(JSON.parse(row.artifact)).value;
};
let request;
try {
  const plan = createFactionWritingPlanV1(input);
  const section = plan.sections.find(row =>
    row.id === 'faction.zerg_swarm.objectives.1');
  const tutor = role('faction.zerg_swarm.tutor.capacity-assembly.v1');
  const tree = role('faction.zerg_swarm.question-tree');
  const challenger = role('faction.zerg_swarm.challenger');
  const answers = role('faction.zerg_swarm.' + section.id + '.reasoner');
  const judge = role('faction.zerg_swarm.' + section.id + '.judge');
  const questions = [
    ...tree.output.branches.find(row => row.axis === section.axis).questions,
    ...challenger.output.branches.find(row => row.axis === section.axis).probes,
  ].map((question, index) => ({ index, ...question }));
  const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash,
    sourceBinding: input.sourceBinding });
  const scope = { section, questionTree: tree.output, questions,
    unverifiedTutor: tutor.output };
  const proposerRequest = { packet, roleId: section.id + '.proposer',
    instruction: 'Proposer',
    workspace: { ...factionRoleWorkspaceV1(input), ...scope,
      answers: answers.output, judge: judge.output }, maxOutput: 4096 };
  const proposerPlan = createFactionProposerBatchPlanV1({ input,
    request: proposerRequest, binding: recipe.proposerBatchBinding });
  const assembly = role('faction.zerg_swarm.' + section.id
    + '.proposer.assembly-v1.'
    + proposerPlan.hash.slice(0, 20));
  assert.equal(assembly.planHash, proposerPlan.hash); checks++;
  assert.equal(assembly.hash.slice(0, 20), '02f439f8a2730391026a'); checks++;
  const instruction = 'Generator提纲：本节最终会有1至8条有条件建议。这里只给简短完整提纲，不写完整正文；覆盖每个指定来源和Proposer中全部关键决策，不删除叶问题。每项focus最多600字符，引用1至8个官方ID。返回{"outline":[{"focus":"建议的决策主题与范围","sourceRefs":["实际来源ID"]}]}。每个section.requiredSourceRefs至少关联一项提纲。随后会给完整共同上下文逐批输出正文。'
    + '\nproposerPlan的assigned_source_coverage是本节正文义务，不是可省背景。全轴问题中其他组卡牌可作为条件比较，不能挤掉本节指定卡牌。先安排每个section.requiredSourceRefs的决策位置，再合并相关问题，不能只给引用而不规划其用途。';
  request = { packet,
    roleId: section.id + '.generator-outline.planning-v1.'
      + assembly.hash.slice(0, 20),
    instruction,
    workspace: { ...factionRoleWorkspaceV1(input), ...scope,
      answers: answers.output, proposerPlan,
      proposerAssemblyHash: assembly.hash, proposals: assembly.output,
      judge: judge.output },
    maxOutput: 4096 };
} finally { productionDb.close(); }
assert.equal(request.packet.id + '.' + request.roleId,
  evidence.rejected.roleRef.id); checks++;
const effectiveRequest = applyFactionNativeOutputCapacityV2(request,
  recipe.nativeOutputCapacityBinding);
const prepared = prepareFactionNativeProductionRoleV1({
  input,
  request: effectiveRequest,
  executionPolicy: recipe.nativeOutputCapacityBinding.executionPolicy,
  outputCapacityBinding: recipe.nativeOutputCapacityBinding,
  proposerBatchBinding: recipe.proposerBatchBinding,
  proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding,
  targetReconstructionBinding: recipe.nativeTargetReconstructionBinding,
});
assert.equal(prepared.contextManifestRef.hash,
  evidence.rejected.contextManifestRef.hash); checks++;
assert.equal(prepared.roleRef.hash, evidence.rejected.roleRef.hash); checks++;
const materialization = materializeFactionOutlineCapacityV1({ input,
  request: effectiveRequest, prepared, evidence, binding });
assert.deepEqual(materialization.output, evidence.rejected.providerValue); checks++;
assert.equal(materialization.providerCalls, 0); checks++;
assert.throws(() => materializeFactionOutlineCapacityV1({ input,
  request: effectiveRequest, prepared: { ...prepared,
    payload: prepared.payload + ' ' }, evidence, binding }),
{ code: 'FACTION_OUTLINE_CAPACITY_EVIDENCE_INVALID' }); checks++;

const dsh = await prepareDshLoop(root);
let stored = null;
const store = {
  acquire(id, roleInput) {
    assert.equal(id, prepared.fullRoleId);
    assert.deepEqual(roleInput, prepared.roleInput);
    return stored ? { cached: true, artifact: stored } : { cached: false };
  },
  finish(_lease, value) { stored = value; return value; },
  release() {},
};
let fallbacks = 0;
const runtime = withFactionOutlineCapacityRecoveryV1({
  input,
  runtime: { role() { fallbacks++; fail('OUTLINE_CAPACITY_PROVIDER_FORBIDDEN'); } },
  store,
  dsh,
  binding,
  imports: [evidence],
  baseExecutionPolicy: { maxOutputUnits: 4096 },
  outputCapacityBinding: recipe.nativeOutputCapacityBinding,
  frozenRoleIds: recipe.nativeOutputCapacityFrozenRoleIds,
  proposerBatchBinding: recipe.proposerBatchBinding,
  proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding,
  targetReconstructionBinding: recipe.nativeTargetReconstructionBinding,
});
const imported = await runtime.role(request);
assert.deepEqual(imported.output, evidence.rejected.providerValue); checks++;
assert.equal(usesFactionNativeProductionInputV2(imported), true); checks++;
assert.equal(imported.hostMaterialization.normalized.contentChanged, false);
checks++;
assert.equal((await runtime.role(request)).hash, imported.hash); checks++;
assert.equal(fallbacks, 0); checks++;

const files = [
  'packages/skill-production-v3/faction-outline-capacity-envelope-v1.mjs',
  'packages/skill-production-v3/faction-outline-capacity-recovery-v1.mjs',
  'packages/skill-production-v3/faction-outline-capacity-runtime-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v2.mjs',
  'scripts/verify-ticket-18-faction-outline-capacity-v1.mjs',
];
const report = seal({
  passed: true,
  checks,
  binding,
  bindingHash: binding.hash,
  originRunId: runId,
  originAttemptId: attemptId,
  inputHash: input.hash,
  evidenceHash: inspected.hash,
  originalFailureReceiptHash: inspected.originalFailureReceiptHash,
  rejectedCandidateHash: inspected.rejectedCandidateHash,
  originalOutputHash: inspected.normalized.originalOutputHash,
  recoveredArtifactHash: imported.hash,
  focusLengths: inspected.normalized.focusLengths,
  actualRequestContextRebuilt: true,
  actualDshSessions: 1,
  providerCalls: 0,
  oldProviderSchemaRejects: true,
  newHostSchemaAccepts: true,
  originalCandidateBytesPreserved: true,
  onlyNarrativeCapacityIssuesAccepted: true,
  unknownSourcesRejected: true,
  nonCapacityIssuesRejected: true,
  productionWrapperTested: true,
  cachedRestartReplayPassed: true,
  freshSourceAndSemanticReviewRequired: true,
  semanticAcceptanceInherited: false,
  sourceRefreshPerformed: false,
  trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file,
    hash: sha256(await readFile(file)) }))),
});
await writeFile(base + 'outline-capacity-readiness-v1.json',
  JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, originRunId: runId,
  originAttemptId: attemptId, focusLengths: report.focusLengths,
  actualDshSessions: 1, providerCalls: 0, hash: report.hash }));
