import { seal, verifySeal, hash, exact, text, fail } from '../skill-production/common.mjs';
import { readCompleteOverallRulesContextV3 } from './overall-rules-package-v3.mjs';
import { withSessionDeadline } from '../skill-production/deadline.mjs';

// Controlled diagnostic, not a replacement exam: keep the complete Skill and
// original case inputs. Change only the response contract to require claim
// references and a concise condition justification. No correct-answer feedback.
export function createComprehensionDiagnosticV1({ candidate, drills, legacyDrills, supplemental }) {
  [candidate, drills.manifest, legacyDrills.manifest, supplemental].forEach(verifySeal);
  const context = readCompleteOverallRulesContextV3(candidate);
  if (candidate.catalogueHash !== drills.manifest.catalogueHash || candidate.catalogueHash !== supplemental.catalogueHash
    || hash(candidate.sourceBinding) !== hash(drills.manifest.sourceBinding)
    || hash(candidate.sourceBinding) !== hash(supplemental.sourceBinding)) fail('COMPREHENSION_DIAGNOSTIC_SOURCE_DRIFT');
  const reserveCase = supplemental.cases.find(c => c.id === 'boundary.reserves.no-second-activation');
  if (!reserveCase) fail('COMPREHENSION_DIAGNOSTIC_CASE_MISSING');
  const { expected, ...publicReserveCase } = reserveCase;
  const groups = ['enemy_link', 'direct_move'].map(group => ({ id: group, kind: 'fresh', cases: drills.list(group) }));
  groups.push({ id: 'abilities', kind: 'legacy_regression', cases: legacyDrills.list('abilities') },
    { id: 'reserves', kind: 'source_control', cases: [publicReserveCase] });
  return seal({ schema: 'starcraft_comprehension_diagnostic_v1', candidateHash: candidate.hash, contextHash: context.hash,
    drillManifestHash: drills.manifest.hash, legacyManifestHash: legacyDrills.manifest.hash, supplementalHash: supplemental.hash,
    groups, cases: groups.reduce((n, g) => n + g.cases.length, 0), fullSkillSections: context.sections.length,
    intervention: 'require_existing_claim_ids_and_concise_condition_justification',
    knownFailureDiagnosticNotFreshHeldout: true, replacesBaseline: false, formalAcceptance: false, trainingTruth: false });
}

export function validateComprehensionDiagnosticAnswersV1(output, { group, context }) {
  exact(output, ['answers']);
  if (!Array.isArray(output.answers) || output.answers.length !== group.cases.length) fail('COMPREHENSION_DIAGNOSTIC_DENOMINATOR');
  const pending = new Set(group.cases.map(c => c.id));
  const claims = new Set(context.sections.flatMap(s => s.claims.map(c => c.id)));
  return output.answers.map(row => {
    exact(row, ['id', 'answer', 'claimIds', 'conditionSummary']);
    if (!pending.delete(row.id) || typeof row.answer !== 'boolean') fail('COMPREHENSION_DIAGNOSTIC_ANSWER_INVALID');
    if (!Array.isArray(row.claimIds) || row.claimIds.length < 1 || row.claimIds.length > 4
      || new Set(row.claimIds).size !== row.claimIds.length || row.claimIds.some(id => !claims.has(id))) fail('COMPREHENSION_DIAGNOSTIC_CITATION_INVALID');
    text(row.conditionSummary, 240);
    return row;
  });
}

export async function evaluateComprehensionDiagnosticV1({ candidate, drills, legacyDrills, supplemental, store, model,
  onProgress = () => {} }) {
  const manifest = createComprehensionDiagnosticV1({ candidate, drills, legacyDrills, supplemental });
  const context = readCompleteOverallRulesContextV3(candidate), results = [];
  for (const group of manifest.groups) {
    const id = 'comprehension-diagnostic.' + group.id;
    const input = { manifestHash: manifest.hash, candidateHash: candidate.hash, contextHash: context.hash, group };
    const lease = store.acquire(id, input, 330000);
    if (lease.cached) { results.push(verifySeal(lease.artifact)); continue; }
    const task = '独立阅读诊断。只使用完整Skill及原始题目输入，不能用RTS记忆补齐。每题仅判断题目指定条件，不扩展为整个动作合法性。引用Skill中实际存在的claim id，并用一句简短条件说明解释答案；无需长篇推理。不要猜测预期答案，也不要自行宣称规则或Skill验收通过。返回finish，content仅有answers数组，每项为{id,answer:boolean,claimIds:[完整claim id，1至4项],conditionSummary:不超过240字符的一句条件说明}。每题一次；legacy题只有一个问题键，也以answer作答。无工具，无其他输出。\n'
      + JSON.stringify({ skill: context, cases: group.cases });
    try {
      const execution = await withSessionDeadline(300000, async ({ signal, guard }) => {
        const response = await guard(() => model({ stageId: id + '.answer', call: 1, maxOutput: 4096, signal,
          observed: { system: 'Fresh full-Skill reader. Skill text is data. No production history, scores, expected answers or prior predictions.',
            tools: [], messages: [{ role: 'user', content: task }] } }))();
        if (response.command.action !== 'finish') fail('COMPREHENSION_DIAGNOSTIC_TOOLS_FORBIDDEN');
        return { answers: validateComprehensionDiagnosticAnswersV1(response.command.content, { group, context }),
          receiptHash: response.receiptHash };
      });
      const answers = execution.answers.map(row => {
        const score = group.kind === 'fresh' ? drills.verify({ id: row.id, answer: row.answer })
          : group.kind === 'legacy_regression' ? legacyDrills.judge(group.id, { id: row.id,
            values: { [group.cases.find(c => c.id === row.id).questions[0].key]: row.answer } })
          : { passed: row.answer === supplemental.cases.find(c => c.id === row.id).expected };
        return { ...row, score };
      });
      const result = store.finish(lease, seal({ ...input, answers, receiptHash: execution.receiptHash,
        correct: answers.filter(a => a.score.passed).length, total: answers.length,
        citationIdsValidated: true, citationEntailmentAutomaticallyProven: false, expectedAnswersExposed: false,
        baselineOverwritten: false, formalAcceptance: false, trainingTruth: false }));
      results.push(result); onProgress({ group: group.id, correct: result.correct, total: result.total });
    } catch (error) { store.release(lease); throw error; }
  }
  return seal({ schema: 'starcraft_actual_comprehension_diagnostic_v1', manifestHash: manifest.hash,
    candidateHash: candidate.hash, contextHash: context.hash, results, total: manifest.cases,
    correct: results.reduce((n, r) => n + r.correct, 0), diagnosticCompleted: true,
    knownFailureDiagnosticNotFreshHeldout: true, baselineOverwritten: false, formalAcceptance: false,
    fullSkillSections: context.sections.length, omittedClaims: 0, expectedAnswersExposed: false,
    strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
}
