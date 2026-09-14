import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail, hash, seal, sha256, verifySeal } from '../../packages/skill-production/common.mjs';
import { createStrategyCaseCompilerV1, partitionStrategyCasesV1 } from '../../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { prepareStrategyProductionInputV1 } from '../../packages/strategy-skills/strategy-production-input-v1.mjs';
import { loadStrategyCaseFixtureV1 } from './strategy-case-fixture-v1.mjs';

function movementSpecification(fixture, currentRuntime, { caseId, familyId, split, yInches,
  policyAxes, targetX, candidates, description }) {
  return { caseId, familyId, split, state: fixture.state({ yInches }), seatKey: 'player1', policyAxes,
    objective: { description, scope: 'declared_single_transition_drill', metrics: [
      { kind: 'goal_reached', pieceId: 'player1-marine', xInches: targetX, yInches, radiusInches: 0.1 },
      { kind: 'own_ready_cp' },
    ] },
    selectCandidates(legal) {
      return candidates.map(({ candidateId, mode, x, intent }) => {
        const domain = legal.parameterDomains.find(row => row.executorId ===
          `authority.marine-optional-stimpack-move-v${currentRuntime ? 3 : 2}` && row.moveMode === mode);
        if (!domain) fail('GENERAL_FINAL_CASE_DOMAIN_UNAVAILABLE');
        return { candidateId, intent, proposal: { kind: 'parameterized', domainId: domain.domainId,
          parameters: { leadingModelId: 'player1-marine-model-1',
            path: [{ xMilliInches: x * 1000, yMilliInches: yInches * 1000 }], placements: [] } } };
      });
    } };
}

export async function loadOrCreateFinalStrategyCaseCorpusV1({ root, previousInput, outputPath }) {
  verifySeal(previousInput);
  const codeFiles = ['scripts/support/strategy-final-case-corpus-v1.mjs', 'scripts/support/strategy-case-fixture-v1.mjs',
    'packages/strategy-skills/strategy-case-compiler-v1.mjs', 'packages/strategy-skills/strategy-production-input-v1.mjs',
    'packages/rule-atoms/official-strategy-case-runtime-v1.mjs'];
  const binding = seal({ previousInputHash: previousInput.hash,
    sourceBinding: previousInput.contract.sourceBinding,
    codeHashes: await Promise.all(codeFiles.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
  function verify(corpus) {
    [corpus, corpus.input, corpus.binding, ...corpus.cases].forEach(verifySeal);
    if (corpus.schema !== 'strategy_final_frozen_case_corpus_v1' || corpus.binding.hash !== binding.hash) {
      fail('GENERAL_FINAL_CASE_CORPUS_BINDING_DRIFT');
    }
    const { development, heldout } = partitionStrategyCasesV1(corpus.cases);
    if (hash(development.map(row => row.hash)) !== hash(corpus.input.evaluationManifest.developmentCaseHashes)
      || hash(heldout.map(row => row.hash)) !== hash(corpus.input.evaluationManifest.heldoutCaseHashes)
      || hash(development.map(row => row.prompt)) !== hash(corpus.input.workspace.developmentCases)) {
      fail('GENERAL_FINAL_CASE_CORPUS_INPUT_DRIFT');
    }
    const splits = new Map();
    for (const row of corpus.cases) for (const axis of row.prompt.policyAxes) {
      const counts = splits.get(axis) || { development: 0, heldout: 0 };
      counts[row.evaluation.split] += 1; splits.set(axis, counts);
    }
    const required = ['objective_plan', 'activation_tempo', 'movement_position', 'threat_trade',
      'resource_timing', 'uncertainty', 'opponent_response'];
    if (required.some(axis => !splits.has(axis) || splits.get(axis).development < 1 || splits.get(axis).heldout < 1)) {
      fail('GENERAL_FINAL_CASE_AXIS_DENOMINATOR_INVALID');
    }
    return corpus;
  }
  try { return verify(JSON.parse(await readFile(outputPath, 'utf8'))); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }

  const currentRuntime = true;
  const fixture = await loadStrategyCaseFixtureV1(root, { currentRuntime });
  const compiler = createStrategyCaseCompilerV1(fixture.compilerOptions);
  const move = values => compiler.compile(movementSpecification(fixture, currentRuntime, values));
  const cases = [
    move({ caseId: 'movement.near-v2', familyId: 'movement-resource-dev-v2', split: 'development', yInches: 5,
      policyAxes: ['movement_position', 'resource_timing', 'uncertainty'], targetX: 9,
      candidates: [
        { candidateId: 'ordinary-near', mode: 'base', x: 9, intent: '普通移动到本次目标点并保留Ready卡牌' },
        { candidateId: 'stimpack-near', mode: 'stimpack', x: 9, intent: '使用Stimpack到同一目标点并Exhaust支付卡牌' },
      ], description: '普通移动与Stimpack都能达到同一公开目标时，优先保留Ready卡牌；只证明本次转移。' }),
    move({ caseId: 'movement.far-v2', familyId: 'movement-objective-dev-v2', split: 'development', yInches: 7,
      policyAxes: ['movement_position', 'resource_timing', 'objective_plan'], targetX: 12,
      candidates: [
        { candidateId: 'ordinary-short', mode: 'base', x: 9, intent: '普通移动但本次不能到达公开目标点' },
        { candidateId: 'stimpack-far', mode: 'stimpack', x: 12, intent: '支付Stimpack到达公开目标点' },
      ], description: '只有资源增强移动能兑现本次明确位置目标时，比较兑现目标与Ready卡牌机会成本；不冒充整局目标。' }),
    move({ caseId: 'threat.standoff-v1', familyId: 'threat-standoff-dev-v1', split: 'development', yInches: 9,
      policyAxes: ['threat_trade'], targetX: 9,
      candidates: [
        { candidateId: 'standoff', mode: 'base', x: 9, intent: '停在公开指定的低暴露位置，保持与敌方Marine更远的底座边缘距离' },
        { candidateId: 'overextend', mode: 'stimpack', x: 12, intent: '额外支付并靠近敌方Marine，但本次没有额外目标收益' },
      ], description: '在没有额外任务收益且敌方公开位置不变时，不为接近对方自动支付并扩大暴露；只验证两条合法转移。' }),
    compiler.compile(fixture.initiativeSpecification({ caseId: 'tempo.act-first-v2', firstActor: 'player1',
      yInches: 11, split: 'development', familyId: 'tempo-dev-v2' })),
    compiler.compile({ ...fixture.initiativeSpecification({ caseId: 'tempo.respond-v2', firstActor: 'player2',
      yInches: 13, split: 'development', familyId: 'response-dev-v2' }), policyAxes: ['activation_tempo', 'opponent_response'] }),

    move({ caseId: 'movement.private-v2', familyId: 'movement-resource-heldout-v2', split: 'heldout', yInches: 17,
      policyAxes: ['movement_position', 'resource_timing'], targetX: 8,
      candidates: [
        { candidateId: 'ordinary-private', mode: 'base', x: 8, intent: '普通移动到公开目标点' },
        { candidateId: 'stimpack-private', mode: 'stimpack', x: 8, intent: '使用Stimpack到同一公开目标点' },
      ], description: '留出练习：两个合法候选达到同一目标时比较Ready卡牌机会成本；答案不进入生产上下文。' }),
    move({ caseId: 'objective.private-v1', familyId: 'objective-heldout-v1', split: 'heldout', yInches: 19,
      policyAxes: ['objective_plan'], targetX: 12,
      candidates: [
        { candidateId: 'miss-objective', mode: 'base', x: 9, intent: '保留卡牌但本次无法到达已声明目标' },
        { candidateId: 'reach-objective', mode: 'stimpack', x: 12, intent: '支付并兑现本次已声明目标' },
      ], description: '留出练习：在目标明确且只有增强移动能兑现时选择目标分支；不证明整局计分策略。' }),
    move({ caseId: 'uncertainty.private-v1', familyId: 'uncertainty-heldout-v1', split: 'heldout', yInches: 21,
      policyAxes: ['uncertainty'], targetX: 9,
      candidates: [
        { candidateId: 'low-commitment', mode: 'base', x: 9, intent: '以普通移动达到目标并保留Ready卡牌' },
        { candidateId: 'unneeded-commitment', mode: 'stimpack', x: 9, intent: '在无新增收益时支付Stimpack到相同位置' },
      ], description: '留出练习：收益相同且信息不增加时选择较低承诺分支；答案不进入生产上下文。' }),
    move({ caseId: 'threat.private-v1', familyId: 'threat-standoff-heldout-v1', split: 'heldout', yInches: 23,
      policyAxes: ['threat_trade'], targetX: 9,
      candidates: [
        { candidateId: 'bounded-position', mode: 'base', x: 9, intent: '到达已声明位置且不额外支付' },
        { candidateId: 'unsupported-advance', mode: 'stimpack', x: 12, intent: '额外靠近敌方但没有声明额外收益' },
      ], description: '留出练习：没有新增目标或交换收益时拒绝无依据前压；仅为合法单步候选。' }),
    compiler.compile(fixture.initiativeSpecification({ caseId: 'tempo.private-v2', firstActor: 'player2',
      yInches: 25, split: 'heldout', familyId: 'tempo-heldout-v2' })),
    compiler.compile({ ...fixture.initiativeSpecification({ caseId: 'response.private-v1', firstActor: 'player1',
      yInches: 27, split: 'heldout', familyId: 'response-heldout-v1' }), policyAxes: ['opponent_response'] }),
  ];
  const input = prepareStrategyProductionInputV1({ frozenInput: fixture.frozenInput,
    scope: { family: 'general' }, cases, seed: previousInput.workspace.conditionalStrategySeed });
  const corpus = verify(seal({ schema: 'strategy_final_frozen_case_corpus_v1', binding, cases, input,
    lifecycle: 'compile_execute_replay_once_then_reuse_exact_signed_artifacts',
    heldoutPromptsExcludedFromProductionWorkspace: true, sourceRefreshPerformed: false,
    runtimeAccepted: false, trainingTruth: false }));
  await mkdir(path.dirname(outputPath), { recursive: true });
  try { await writeFile(outputPath, JSON.stringify(corpus, null, 2), { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return verify(JSON.parse(await readFile(outputPath, 'utf8')));
  }
  return corpus;
}
