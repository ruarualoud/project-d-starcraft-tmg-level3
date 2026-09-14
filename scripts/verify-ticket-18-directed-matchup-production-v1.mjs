import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { prepareDirectedMatchupInputV1 } from '../packages/strategy-skills/directed-matchup-input-v1.mjs';
import { createDirectedMatchupProductionV1, renderDirectedMatchupCandidateV1 } from '../packages/strategy-skills/directed-matchup-production-v1.mjs';
import { materializeStrategyEvidenceReviewV1 } from '../packages/strategy-skills/strategy-evidence-review-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async file => verifySeal(JSON.parse(await readFile(path.join(root, file), 'utf8')));
const frozenInput = await json('build/ticket-18-faction-production-v1/terran_armed_forces-input.json');
const base = 'build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/general-strategy-final-v1/';
const generalSkill = await json(base + 'final-general-skill.json');
const generalLayer = await json(base + 'final-general-strategy-layer.json');
const reseal = (value, delta) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...delta }); };
// Boundary injection only: no fake official/production acceptance is persisted.
const faction = name => seal({ schema: 'project_d_game_skill_v1', gameId: 'starcraft-tmg',
  factionRecordKey: 'tactical_cards:' + name, trustTier: 'offline_evaluated_advisory',
  status: 'offline_candidate', sourceBinding: frozenInput.sourceBinding,
  dependencies: { generalSkillHash: generalSkill.hash, generalLayerHash: generalLayer.hash },
  judgeTests: { productionEvidenceHash: hash('injected-production'), consumerEvidenceHash: hash('injected-consumer'),
    rosterEvaluationHash: hash('injected-roster'), ruleEvaluationHash: hash('injected-rule') },
  knowledge: [{ fixtureOnly: true, body: name }], canAffectRules: false, runtimeAccepted: false, trainingTruth: false });
const terran = faction('terran_armed_forces'), zerg = faction('zerg_swarm');
const compiled = split => {
  const prompt = seal({ caseId: 'tvz.' + split, familyId: 'tvz.' + split, seatKey: 'player1',
    policyAxes: ['opening_branches'], binding: { sourceBinding: frozenInput.sourceBinding, stateHash: hash(split) },
    observation: { players: { player1: { faction: 'Terran' }, player2: { faction: 'Zerg' } } },
    runtimeCoverage: { excludedSourceRefs: ['INJECTED_NOT_EXECUTED_CASE'] } });
  return seal({ schema: 'starcraft_compiled_strategy_case_v1', prompt, evaluation: seal({ promptHash: prompt.hash, split }), fixtureOnly: true });
};
const input = prepareDirectedMatchupInputV1({ frozenInput, generalSkill, generalLayer, ownSkill: terran, opponentSkill: zerg,
  cases: ['development', 'heldout'].map(compiled) });
const policy = axis => ({ axis, title: axis, when: ['局面可见'], objective: '保持任务分优势',
  decisionProcedure: ['读取当前任务与双方剩余资源', '比较合法候选和对手回应'],
  alternatives: [{ option: '抢先行动', preferWhen: '存在不可错失的窗口' }, { option: '保留响应', preferWhen: '威胁尚未确认' }],
  opponentBranches: [{ response: '对手保留资源', adaptation: '重新预览候选' }], risk: '仅为测试注入，未证明整局有效性',
  reviseIf: ['对手改变部署'], requiredQueries: ['legal_space'], ruleRefs: [input.workspace.fullFrozenSources.sources[0].ref],
  caseIds: axis === 'opening_branches' ? ['tvz.development'] : [] });
function ports({ defect = false, code = null } = {}) {
  const roles = [], reviews = [], artifacts = new Map();
  const store = {
    acquire(id, body) {
      const entry = artifacts.get(id);
      if (entry) { assert.equal(hash(entry.body), hash(body)); return { cached: true, artifact: entry.value }; }
      return { id, body, cached: false };
    },
    finish(lease, value) { artifacts.set(lease.id, { body: lease.body, value }); return value; },
  };
  const generator = { async role(request) {
    roles.push(request);
    if (code) throw Object.assign(new Error(code), { code });
    return seal({ schema: 'strategy_role_artifact_v1', inputHash: input.hash, axis: request.axis,
      stage: request.stage, value: request.kind === 'policy' ? { policy: policy(request.axis) }
        : { observations: [{ claim: 'injected-notes', ruleRefs: [] }], questions: ['why?'], unproven: ['fixture'] },
      fixtureOnly: true });
  } };
  const reviewer = { async review(prepared) {
    reviews.push(prepared);
    const payload = JSON.parse(prepared.payload);
    assert.deepEqual(payload.workspace, input.workspace);
    assert(!prepared.payload.includes('tvz.heldout'));
    const evidence = materializeStrategyEvidenceReviewV1(prepared, { checks: prepared.targets.map(t => ({ targetId: t.targetId,
      verdict: defect && t.field === 'risk' ? 'defect' : 'no_defect',
      currentSpanIds: [prepared.currentSpans.find(s => s.field === t.field).id],
      sourceSpanIds: [prepared.sourceSpans[0].id], explanation: 'Explicitly injected boundary opinion, not real source acceptance' })) });
    return seal({ preparedHash: prepared.hash, evidence, fixtureOnly: true });
  } };
  return { store, generator, reviewer, roles, reviews };
}
let checks = 0;
const p = ports();
const workflow = createDirectedMatchupProductionV1({ input, ...p });
const result = await workflow.produce();
assert.equal(p.roles.length, 35); checks++;
assert.equal(p.reviews.length, 15); checks++;
assert.equal(result.sourceReviewedAxes, 5); checks++;
assert.equal(result.modelReportedClearAxes, 5); checks++;
assert.equal(result.layer.assessment.sourceReviewPassed, false); checks++;
assert.equal(result.status, 'needs_independent_source_and_decision_validation'); checks++;
assert.equal(result.runtimeAccepted, false); checks++;
assert.equal(result.published, false); checks++;
assert.equal(result.fullGameStrategyEffectivenessProven, false); checks++;
assert.deepEqual(result.uncoveredDecisionAxes, input.evaluationManifest.uncoveredAxes); checks++;
assert.equal((await workflow.produce()).hash, result.hash); checks++;
assert.equal(renderDirectedMatchupCandidateV1(result).split('## ').length - 1, 5); checks++;
const bad = ports({ defect: true });
const pending = await createDirectedMatchupProductionV1({ input, ...bad }).produce();
assert.equal(pending.status, 'needs_source_adjudication'); checks++;
assert.equal(pending.pending.length, 5); checks++;
assert.equal(pending.modelReportedClearAxes, 0); checks++;
assert.equal(bad.roles.length, 35, 'Allegations do not purchase automatic edits or regenerations'); checks++;
assert.equal(pending.candidates[0].policy.risk, policy('opponent_profile').risk); checks++;
for (const code of ['PROVIDER_PAYMENT_REQUIRED', 'STRUCTURED_PROVIDER_INCOMPLETE', 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND']) {
  const failing = ports({ code });
  await assert.rejects(createDirectedMatchupProductionV1({ input, ...failing }).produce(), { code }); checks++;
  assert.equal(failing.roles.length, 1); checks++;
}
for (const delta of [{ sourceRefreshPerformed: true }, { contract: reseal(input.contract, { scope: { family: 'general' } }) },
  { evaluationManifest: { ...input.evaluationManifest, heldoutInputsIncludedInWorkspace: true } }]) {
  assert.throws(() => createDirectedMatchupProductionV1({ input: reseal(input, delta), ...ports() }),
    { code: 'MATCHUP_PRODUCTION_INPUT_INVALID' }); checks++;
}
const files = ['packages/strategy-skills/directed-matchup-production-v1.mjs', 'packages/strategy-skills/directed-matchup-input-v1.mjs',
  'packages/strategy-skills/strategy-evidence-production-v1.mjs', 'scripts/verify-ticket-18-directed-matchup-production-v1.mjs'];
const report = seal({ passed: true, checks, providerCalls: 0, fixtureOnly: true,
  realMatchupSkillsAccepted: 0, realFactionSkillsAccepted: 0, actualDshSessions: 0,
  negativeEvidencePreserved: true, automaticRegeneration: false, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
const out = path.join(root, 'build/ticket-18-directed-matchup-v1'); await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'production-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
