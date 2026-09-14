import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';

export function bindFactionGeneralDependencyV1({ input, generalSkill, generalLayer }) {
  [input, generalSkill, generalLayer].forEach(verifySeal);
  if (generalSkill.skillId !== 'starcraft-tmg.general-rules-and-strategy'
    || generalSkill.strategyLayerHash !== generalLayer.hash
    || generalLayer.contract.referenceHash !== input.overallDependencyHash
    || hash(generalSkill.sourceBinding) !== hash(input.sourceBinding)
    || hash(generalLayer.contract.sourceBinding) !== hash(input.sourceBinding)
    || generalLayer.assessment.sourceReviewPassed !== true
    || generalLayer.assessment.decisionCasesPassed !== true
    || generalSkill.canAffectRules !== false || generalSkill.trainingTruth !== false) {
    fail('FACTION_FINAL_GENERAL_DEPENDENCY_REQUIRED');
  }
  return seal({ version: 'faction_final_general_dependency_v1', inputHash: input.hash,
    generalSkillHash: generalSkill.hash, generalLayerHash: generalLayer.hash,
    generalSkill, generalLayer, trainingTruth: false });
}
