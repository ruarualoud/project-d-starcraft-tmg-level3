import { seal, verifySeal, hash, exact, fail } from '../skill-production/common.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';
import { withSessionDeadline } from '../skill-production/deadline.mjs';

// Source-reviewed external-audit regression controls, frozen before editing.
// These measure text fidelity and bounded comprehension, not whole-game play.
const DEFINITIONS = [
  ['q01', 'literal', '任何片段是否明确宣称 ACCESS POINT 本身允许视线穿过？即使别处有相反提醒，只要出现该许可就回答true。', false, 'boolean'],
  ['q02', 'literal', '任何片段是否宣称 Flying 模型始终可见、没有掩护？即使后文有例外，只要出现这一普遍断言就回答true。', false, 'boolean'],
  ['q03', 'literal', '任何片段是否建议发生 HIGH GROUND 措辞冲突时优先采用决策/速查表？不要替材料纠错；出现该优先建议即回答true。', false, 'boolean'],
  ['q04', 'literal', '材料是否明确说明派系卡（Faction Card）提供初始 Army Slots？只看实际文字，不能用记忆补齐。', true, 'boolean'],
  ['q05', 'literal', '材料是否明确说明建军时花费 Vespene Gas 购买 Tactical Cards 解锁额外 Army Slots？', true, 'boolean'],
  ['q06', 'literal', 'DISPLACEMENT 说明实际列出了哪些移动类型？从 move,deploy,run,charge,disengage,close_ranks,special_ability_move 中返回全部明确列出的类型；“列出的移动”这类无枚举指代不能补齐。',
    ['move', 'deploy', 'run', 'charge', 'disengage', 'close_ranks', 'special_ability_move'], 'moves'],
  ['q07', 'literal', '按材料明确写出的 DISPLACEMENT 步骤，被重放置的对象是谁？返回 overlapped_token_or_model、leading_model 或 unclear；仅有歧义代词则选 unclear。', 'overlapped_token_or_model', 'object'],
  ['q08', 'literal', '材料明确把 DISPLACEMENT 重放置决定交给谁？返回 leading_model_controller、overlapped_object_controller 或 unspecified；未区分控制者时选 unspecified。', 'leading_model_controller', 'operator'],
  ['q09', 'comprehension', '仅有 ACCESS POINT 的移动与连贯性许可，是否足以让射线忽略仍有效的阻挡地形足迹？', false, 'boolean'],
  ['q10', 'comprehension', '攻击者是 Flying 模型。能否只凭忽略 Full Cover 就省略对另一模型的 Direct Cover / Elevation Dead Zone 检查？', false, 'boolean'],
  ['q11', 'comprehension', '正文 any part 与速查表 Wholly Within 不一致且没有适用权威裁定时，Skill能否自行把其中一条升格为优先规则？', false, 'boolean'],
  ['q12', 'comprehension', '建军时同类型槽位未使用，能否把这些槽位转换或留待以后？', false, 'boolean'],
  ['q13', 'comprehension', '按材料的 DISPLACEMENT 枚举，Close Ranks 是否属于可能触发所述重放置步骤的移动？只问该枚举，不判断整次行动是否合法。', true, 'boolean'],
  ['q14', 'comprehension', '位移对象无法与 Leading Model 底座接触时，材料是否要求把位移对象尽可能靠近摆放？', true, 'boolean'],
];
const REFERENCES = [
  { ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.0', spanId: 'p1' },
  { ref: 'faq-v1:09', spanId: 'p1' },
  { ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.5', spanId: 'p1' },
  { ref: 'core.cB7X7UfOMHh3Wxn79ASF.items.1.subItems.3', spanId: 'p1' },
  { ref: 'core.cB7X7UfOMHh3Wxn79ASF.items.1.subItems.2', spanId: 'p1' },
  { ref: 'core.cB7X7UfOMHh3Wxn79ASF.items.1.subItems.5', spanId: 'p2' },
  { ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.3', spanId: 'p1' },
  { ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.16', spanId: 'p1' },
];

export function createSourceAuditProbesV3({ catalogue, reader }) {
  verifySeal(catalogue);
  const evidence = REFERENCES.map(ref => resolveSpan(reader, ref));
  return seal({ schema: 'starcraft_source_audit_probes_v3', catalogueHash: catalogue.hash, sourceBinding: catalogue.sourceBinding,
    cases: DEFINITIONS.map(([id, group, question, expected, type]) => ({ id, group, question, expected, type })),
    evidence, negativeControlIds: ['q01', 'q02', 'q03', 'q04', 'q05'],
    expectedBeforeAnswers: { q01: true, q02: true, q03: true, q04: false, q05: false },
    scope: 'known_source_failure_controls_and_bounded_comprehension_not_whole_game', trainingTruth: false });
}

export function validateSourceAuditAnswers(output, probes) {
  verifySeal(probes); exact(output, ['answers']);
  if (!Array.isArray(output.answers) || output.answers.length !== probes.cases.length) fail('AUDIT_PROBE_DENOMINATOR_INVALID');
  const pending = new Map(probes.cases.map(c => [c.id, c]));
  return output.answers.map(row => {
    exact(row, ['id', 'answer']); const c = pending.get(row.id);
    if (!c) fail('AUDIT_PROBE_ID_INVALID'); pending.delete(row.id);
    const options = c.type === 'object' ? ['overlapped_token_or_model', 'leading_model', 'unclear']
      : ['leading_model_controller', 'overlapped_object_controller', 'unspecified'];
    if (c.type === 'boolean' ? typeof row.answer !== 'boolean' : c.type === 'moves'
      ? !Array.isArray(row.answer) || new Set(row.answer).size !== row.answer.length || row.answer.some(a => !DEFINITIONS[5][3].includes(a))
      : !options.includes(row.answer)) fail('AUDIT_PROBE_TYPE_INVALID');
    return { ...row, group: c.group, expected: c.expected,
      passed: hash(c.type === 'moves' ? [...row.answer].sort() : row.answer) === hash(c.type === 'moves' ? [...c.expected].sort() : c.expected) };
  });
}

export async function evaluateSourceAuditProbesV3({ packets, probes, store, model, label }) {
  if (!['before', 'after'].includes(label) || packets.length !== 5) fail('AUDIT_PROBE_INPUT_INVALID');
  packets.forEach(verifySeal); verifySeal(probes);
  if (packets.some(p => hash(p.sourceBinding) !== hash(probes.sourceBinding))) fail('AUDIT_PROBE_SOURCE_DRIFT');
  const input = { packetHashes: packets.map(p => p.hash), probesHash: probes.hash, label };
  const id = 'external-audit-probes.' + label, lease = store.acquire(id, input, 330000);
  if (lease.cached) return verifySeal(lease.artifact);
  const body = { packets: packets.map(p => ({ packetId: p.packetId, claims: p.draft.claims })),
    questions: probes.cases.map(({ id, group, question, type }) => ({ id, group, question, type })) };
  const task = '独立材料核验。完整阅读所给五个片段。literal 问题是在检查材料实际写了什么：不得用游戏常识替它补齐或纠错；有矛盾时保留并指出所问断言是否出现。comprehension 问题按材料完整条件作答，不把单项规则当成整次行动合法。没有原始FAQ、外部网页、编辑历史、参考答案或工具可用。只返回finish，content是仅有answers键的对象；answers数组的每项仅有id与answer。覆盖每题，answer类型遵循题目。\n' + JSON.stringify(body);
  let prior = null, schemaError = null;
  try {
    const execution = await withSessionDeadline(300000, async ({ guard, signal }) => {
      for (let repair = 0; repair < 2; repair++) {
        const response = await guard(() => model({ stageId: id + '.schema-' + repair, call: 1, maxOutput: 2048, signal,
          observed: { system: 'Fresh evidence reader, not a game-rule authority. Preserve defects in literal audits.', tools: [],
            messages: [{ role: 'user', content: task + (repair ? '\n只修复答案结构，不改判断；没有成绩或参考答案。' + JSON.stringify({ prior, schemaError }) : '') }] } }))();
        if (response.command.action !== 'finish') fail('AUDIT_PROBE_TOOLS_FORBIDDEN');
        prior = response.command.content;
        try { return { answers: validateSourceAuditAnswers(prior, probes), schemaRepairs: repair, receiptHash: response.receiptHash }; }
        catch (error) { if (repair) throw error; schemaError = error.code; }
      }
    });
    const calibrationPassed = label === 'before' ? probes.negativeControlIds.every(id =>
      hash(execution.answers.find(a => a.id === id).answer) === hash(probes.expectedBeforeAnswers[id])) : null;
    return store.finish(lease, seal({ schema: 'starcraft_source_audit_probe_result_v3', inputHash: hash(input),
      packetHashes: input.packetHashes, probesHash: probes.hash, label, answers: execution.answers,
      correct: execution.answers.filter(a => a.passed).length, total: probes.cases.length,
      passed: execution.answers.every(a => a.passed), calibrationPassed,
      receiptHash: execution.receiptHash, schemaRepairs: execution.schemaRepairs, expectedAnswersExposed: false,
      actualRoomReplayPerformed: false, strategyEffectivenessProven: false, trainingTruth: false }));
  } catch (error) { store.release(lease); throw error; }
}

export function inspectSourceAuditProbeResultV3(result, { probes, packetHashes, label }) {
  verifySeal(result); verifySeal(probes);
  const input = { packetHashes, probesHash: probes.hash, label };
  if (result.schema !== 'starcraft_source_audit_probe_result_v3' || result.inputHash !== hash(input)
    || result.label !== label || result.probesHash !== probes.hash || hash(result.packetHashes) !== hash(packetHashes)
    || result.expectedAnswersExposed !== false || !/^[a-f0-9]{64}$/.test(result.receiptHash || '')) fail('AUDIT_PROBE_RESULT_BINDING_INVALID');
  const answers = validateSourceAuditAnswers({ answers: result.answers.map(({ id, answer }) => ({ id, answer })) }, probes);
  const calibration = label === 'before' ? probes.negativeControlIds.every(id =>
    hash(answers.find(a => a.id === id).answer) === hash(probes.expectedBeforeAnswers[id])) : null;
  if (hash(answers) !== hash(result.answers) || result.total !== probes.cases.length
    || result.correct !== answers.filter(a => a.passed).length || result.passed !== answers.every(a => a.passed)
    || result.calibrationPassed !== calibration) fail('AUDIT_PROBE_SCORE_INVALID');
  if (label === 'before' ? !calibration : !result.passed) fail('AUDIT_PROBE_ACCEPTANCE_FAILED');
  return result;
}
