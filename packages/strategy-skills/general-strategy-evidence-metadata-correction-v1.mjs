import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { gradeStrategyDecisionV1 } from './strategy-case-compiler-v1.mjs';

const STALE = '本轴没有可引用的开发案例';
const REPLACEMENT = '当前开发案例 movement.far-v2 仅验证“只有增强移动能到达已声明位置目标”这一条合法转移选择，不能证明真实任务计分、分差管理、标记控制或整局目标规划最优；完整对局策略有效性仍未证明。';

function withoutHash(value) { return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'hash')); }

export function correctFinalGeneralStrategyEvidenceMetadataV1({ finalResult, corpus }) {
  [finalResult, corpus, finalResult.skill, finalResult.layer, finalResult.routerManifest,
    ...finalResult.caseResults].forEach(verifySeal);
  if (!finalResult.formalGeneralSkillCompleted || finalResult.skill.version !== '1.0.0-offline-replay-passed'
    || finalResult.skill.hash !== finalResult.routerManifest.generalSkillHash
    || finalResult.layer.hash !== finalResult.skill.strategyLayerHash) fail('GENERAL_EVIDENCE_CORRECTION_PARENT_INVALID');
  const caseById = new Map(corpus.cases.map(row => [row.prompt.caseId, row]));
  const supportingCase = caseById.get('movement.far-v2');
  if (!supportingCase || supportingCase.evaluation.split !== 'development'
    || !supportingCase.prompt.policyAxes.includes('objective_plan')) fail('GENERAL_EVIDENCE_CORRECTION_CASE_INVALID');
  const policies = structuredClone(finalResult.layer.draft.policies);
  const policy = policies.find(row => row.axis === 'objective_plan');
  const procedure = structuredClone(finalResult.skill.procedure);
  const skillPolicy = procedure.find(row => row.axis === 'objective_plan');
  if (!policy?.risk.includes(STALE) || !policy.caseIds.includes('movement.far-v2')
    || skillPolicy?.risk !== policy.risk || !skillPolicy.developmentCaseIds.includes('movement.far-v2')) {
    fail('GENERAL_EVIDENCE_CORRECTION_NOT_APPLICABLE');
  }
  const oldPolicy = structuredClone(policy), oldSkillPolicy = structuredClone(skillPolicy);
  policy.risk = REPLACEMENT; skillPolicy.risk = REPLACEMENT;
  for (const key of Object.keys(oldPolicy)) if (key !== 'risk' && hash(oldPolicy[key]) !== hash(policy[key])) {
    fail('GENERAL_EVIDENCE_CORRECTION_UNAUTHORIZED_FIELD');
  }
  for (const key of Object.keys(oldSkillPolicy)) if (key !== 'risk' && hash(oldSkillPolicy[key]) !== hash(skillPolicy[key])) {
    fail('GENERAL_EVIDENCE_CORRECTION_UNAUTHORIZED_FIELD');
  }
  const correction = seal({ schema: 'general_strategy_evidence_metadata_correction_v1',
    parentResultHash: finalResult.hash, parentSkillHash: finalResult.skill.hash,
    parentLayerHash: finalResult.layer.hash, caseCorpusHash: corpus.hash,
    axis: 'objective_plan', field: 'risk', oldValueHash: hash(oldPolicy.risk), newValue: REPLACEMENT,
    supportingDevelopmentCaseId: supportingCase.prompt.caseId,
    supportingDevelopmentCaseHash: supportingCase.hash,
    changedPolicyFields: ['risk'], strategyDecisionSemanticsChanged: false,
    officialRuleClaimsChanged: false, sourceAuditInheritance: 'all_rule_claim_fields_unchanged',
    runtimeAccepted: false, trainingTruth: false });
  const correctedLayer = seal({ ...withoutHash(finalResult.layer), draft: { policies },
    proof: { ...finalResult.layer.proof, parentLayerHash: finalResult.layer.hash,
      evidenceMetadataCorrectionHash: correction.hash },
    runtimeAccepted: false, published: false, trainingTruth: false });
  const correctedCaseResults = finalResult.caseResults.map(parent => {
    const compiled = caseById.get(parent.caseId);
    const axisPolicy = policies.find(row => row.axis === parent.axis);
    const regraded = gradeStrategyDecisionV1(compiled, parent.artifact.value);
    if (regraded.hash !== parent.grade.hash || !regraded.decisionPreferencePassed) {
      fail('GENERAL_EVIDENCE_CORRECTION_CASE_REGRADE_FAILED');
    }
    if (parent.axis !== 'objective_plan') return parent;
    return seal({ ...withoutHash(parent), policyHash: hash(axisPolicy), evaluatedPolicyHash: parent.policyHash,
      parentCaseResultHash: parent.hash, evidenceMetadataCorrectionHash: correction.hash,
      decisionSemanticInputsChanged: false, grade: regraded,
      runtimeAccepted: false, trainingTruth: false });
  });
  const resultByKey = new Map(correctedCaseResults.map(row => [`${row.caseId}:${row.axis}`, row]));
  const examples = finalResult.skill.examples.map(row => {
    const migrated = resultByKey.get(`${row.caseId}:${row.axis}`);
    return { ...row, receiptHash: migrated.hash };
  });
  const judgeTests = finalResult.skill.judgeTests.map(row => {
    const migrated = resultByKey.get(`${row.caseId}:${row.axis}`);
    return { ...row, receiptHash: migrated.hash };
  });
  const correctedSkill = seal({ ...withoutHash(finalResult.skill), version: '1.0.1-offline-replay-passed',
    strategyLayerHash: correctedLayer.hash, procedure, examples, judgeTests,
    parentSkillHash: finalResult.skill.hash, evidenceMetadataCorrectionHash: correction.hash,
    runtimeAccepted: false, published: false, trainingTruth: false });
  const correctedRouter = seal({ ...withoutHash(finalResult.routerManifest), generalSkillHash: correctedSkill.hash,
    strategyLayerHash: correctedLayer.hash, offlineProductionLoads: [correctedSkill.hash], runtimeLoads: [],
    parentRouterManifestHash: finalResult.routerManifest.hash,
    runtimeAccepted: false, trainingTruth: false });
  if (procedure.some(row => row.developmentCaseIds.length && row.risk.includes(STALE))) {
    fail('GENERAL_EVIDENCE_CORRECTION_STALE_CLAIM_REMAINS');
  }
  return seal({ schema: 'starcraft_general_strategy_evidence_metadata_corrected_result_v1',
    parentResultHash: finalResult.hash, inputHash: finalResult.inputHash, correction,
    layer: correctedLayer, skill: correctedSkill, routerManifest: correctedRouter,
    sourceAudits: finalResult.sourceAudits, caseResults: correctedCaseResults,
    formalGeneralSkillCompleted: true, completeGameStrategyEffectivenessProven: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function assertNoStaleGeneralStrategyCaseClaimsV1(result) {
  verifySeal(result); verifySeal(result.skill);
  if (result.skill.procedure.some(row => row.developmentCaseIds.length && row.risk.includes(STALE))) {
    fail('GENERAL_EVIDENCE_CORRECTION_STALE_CLAIM_REMAINS');
  }
  return seal({ schema: 'general_strategy_case_claim_consistency_v1', skillHash: result.skill.hash,
    checkedPolicies: result.skill.procedure.length, staleClaims: 0,
    runtimeAccepted: false, trainingTruth: false });
}
