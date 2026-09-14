import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { ROOT, BUILD, DB_PATH, json, ledgerSnapshot, codeHashes } from './support/strategy-live-production-support-v1.mjs';

// A fixed, independently read actual counterexample catalogue. This diagnoses
// reviewer false positives; it is NOT a generic NL semantic validator or an
// automatic waiver permitting future candidates to skip source review.
const beforeLedger = ledgerSnapshot();
const input = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/production-input.json');
const report = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/opening-fence-continuation-v2/report.json');
assert.equal(report.failure.code, 'STRATEGY_REPAIR_BUDGET_EXHAUSTED');
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = db.prepare("SELECT artifact FROM steps WHERE run=? AND state='complete'").all(PARENT_RUN)
  .map(r => verifySeal(JSON.parse(r.artifact)).value);
db.close();
const materialized = rows.find(a => a.schema === 'strategy_host_materialized_role_v2'
  && a.parentProposal.axis === 'objective_plan' && a.parentProposal.round === 1);
const review = rows.find(a => a.schema === 'strategy_role_artifact_v1' && a.axis === 'objective_plan'
  && a.stage === 'source-review' && a.round === 2);
assert.equal(review.hash, '0b59b2dcb8b6d346c5cb7221ee7533e712bc27e2792a91ba58c6b5cd73bfc5a1');
verifySeal(materialized); verifySeal(materialized.patch); verifySeal(review);
const policy = materialized.value.policy;
assert.equal(hash(policy), hash(materialized.patch.policy));
const reviewWireFiles = report.ledger.attempts.filter(a => a.state === 'received');
let matchingWire = null;
for (const attempt of reviewWireFiles) {
  let wire;
  try { wire = await json('build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/opening-fence-continuation-v2/wire/' + attempt.id + '.json'); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  const task = JSON.parse(wire.request.body.input);
  if (task.hostTask.stage === 'source-review' && task.hostTask.round === 2) {
    assert.equal(hash(task.currentPolicy), hash(policy));
    assert.equal(hash(task.workspace.fullFrozenSources), hash(input.workspace.fullFrozenSources));
    matchingWire = wire;
  }
}
assert(matchingWire);
const checks = [
  ['decisionProcedure', policy.decisionProcedure[1], '若当前回合为第1回合，任务标记VP尚未启用，不计入本回合得分', '当前正文已经区分第一回合与第二回合后的标记计分。'],
  ['decisionProcedure', policy.decisionProcedure[5], '仍有合法部署机会时，提前比较', '当前正文已把规划前置，并区分最终计分开始的摧毁时点；审查引用了修正句却仍下相反结论。'],
  ['alternatives', policy.alternatives[2].preferWhen, '若放弃的是对方色标记（2 VP），击杀1补给单位通常不足以替代', '当前备选条件已经明示对方色标记的2 VP机会成本。'],
  ['opponentBranches', policy.opponentBranches[2].response, '对手通过控制中立或己方色标记', '当前已有第三条对手控制标记扩大分差的回应与调整；不是仅两条。'],
  ['risk', policy.risk, '信息不足时选择低承诺、可逆的保守分支', '当前风险已经描述信息不完整、查询确认与保守分支。'],
  ['requiredQueries', policy.decisionProcedure[2], '使用期望值而非单次骰点结果', '当前决策程序第3步明确查询概率或伤害分布并使用期望值，查询列表也包含probability。'],
  ['ruleRefs', JSON.stringify(policy.ruleRefs), 'core.iuUyObNTQ2M8xK4IUqzC.items.9.subItems.7', '当前引用列表同时包含审查声称缺少的结束检查与确定先手两条。'],
];
assert.equal(review.value.findings.length, checks.length);
const findings = checks.map(([field, exactCurrentText, required, explanation], index) => {
  assert.equal(review.value.findings[index].field, field);
  assert(exactCurrentText.includes(required));
  return seal({ index, reviewFindingHash: hash(review.value.findings[index]), field,
    currentFieldHash: hash(policy[field]), exactCurrentText, explanation,
    disposition: 'agent_audited_false_absence_or_contradictory_claim',
    machineCheckScope: 'exact_bound_fixture_and_text_presence_only_not_general_semantic_proof' });
});
assert(policy.requiredQueries.includes('probability'));
assert(policy.ruleRefs.includes('core.iuUyObNTQ2M8xK4IUqzC.items.9.subItems.4'));
assert(policy.decisionProcedure[5].includes('而非等到计分阶段开始才评估'));
const evidence = seal({ schema: 'ticket18_current_strategy_review_counterexamples_v1', passed: true,
  inputHash: input.hash, policyHash: hash(policy), materializationHash: materialized.hash,
  reviewHash: review.hash, exactSentWireHash: matchingWire.hash, findings,
  sourceErrorChecks: ['round_1_marker_vp_disabled', 'reserve_planning_before_final_scoring'],
  transportCurrentPolicyMatched: true, providerCalls: 0,
  rootCauseScope: 'reviewer_repeats_resolved_claims_despite_correct_current_policy_transport',
  codeHashes: await codeHashes(['scripts/verify-ticket-18-general-strategy-current-review-v1.mjs']),
  reviewerRepairStillRequired: true, reviewerClaimsAutomaticallyWaived: false,
  generalStrategyComplete: false, independentWholePolicySourceAuditPassed: false,
  runtimeAccepted: false, trainingTruth: false });
assert.equal(ledgerSnapshot().hash, beforeLedger.hash);
const out = path.join(BUILD, PARENT_RUN, 'independent-current-review-v1');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'counterexamples.json'), JSON.stringify(evidence, null, 2), { mode: 0o600 });
const markdown = ['# 总规则策略首个维度：目标规划（真实候选，未发布）', '',
  '这只是8个通用策略维度中的第1个，不是完整总规则Skill。正文为真实模型产出，经Host限定字段补丁应用；未通过完整来源与对战验收。', '',
  `## ${policy.title}`, '', `适用：${policy.when.join('；')}`, '', `目标：${policy.objective}`, '',
  ...policy.decisionProcedure.map((s, i) => `${i + 1}. ${s}`), '', '## 备选与对手回应', '',
  ...policy.alternatives.map(a => `- ${a.option}：${a.preferWhen}`), '',
  ...policy.opponentBranches.map(b => `- ${b.response}：${b.adaptation}`), '',
  `风险：${policy.risk}`, '', `改计划：${policy.reviseIf.join('；')}`, '',
  `查询：${policy.requiredQueries.join('；')}`, '', `来源：${policy.ruleRefs.join('；')}`, '',
  '## 验收状态', '',
  '已确认本次两处具体修正：第一回合不计标记分；预备队在仍能合法部署时规划。', '',
  '来源审查器仍重复7条已被当前正文反驳的意见，已固定为审查器回归反例；未直接删掉意见或改成通过。', '',
  '尚缺其余7个通用维度、该维度的权威策略Case、独立完整来源审查和整局实战证据。', '',
  `候选hash：${hash(policy)}`, `审查反例报告hash：${evidence.hash}`, ''].join('\n');
await writeFile(path.join(out, 'objective-plan-candidate.md'), markdown);
console.log(JSON.stringify({ passed: true, counterexamples: findings.length, policyHash: hash(policy),
  reportHash: evidence.hash, providerCalls: 0, candidatePath: path.relative(ROOT, path.join(out, 'objective-plan-candidate.md')) }));
