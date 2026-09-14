import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { gradeStrategyDecisionV1, verifyCompiledStrategyCaseV1 } from './strategy-case-compiler-v1.mjs';

const REJECTED_SCHEMA = 'starcraft_tmg_structured_generation_runtime_v1.rejected-candidate';

function structurallyComplete(prompt, providerValue, sourceHash) {
  verifySeal(prompt);
  const value = structuredClone(providerValue);
  const ids = prompt.candidates.map(row => row.candidateId);
  const comparisons = Array.isArray(value.comparisons) ? value.comparisons : [];
  const present = comparisons.map(row => row.candidateId);
  const uniquePresent = [...new Set(present)];
  const missing = ids.filter(id => !uniquePresent.includes(id));
  if (!ids.includes(value.candidateId) || present.some(id => !ids.includes(id))
    || missing.length !== 1 || missing[0] !== value.candidateId
    || uniquePresent.length !== ids.length - 1 || comparisons.length > ids.length) {
    fail('STRATEGY_DECISION_LOCAL_REPAIR_NOT_SAFE');
  }
  const kept = new Map(); const discardedDuplicateComparisonHashes = [];
  for (const comparison of comparisons) {
    if (kept.has(comparison.candidateId)) discardedDuplicateComparisonHashes.push(hash(comparison));
    else kept.set(comparison.candidateId, comparison);
  }
  const originalComparisonHashes = comparisons.map(row => hash(row));
  const selected = { candidateId: value.candidateId,
    tradeoff: '该项是模型已选候选；相对取舍由其余候选比较、对手回应与改计划条件共同限定，主机未新增战略优劣判断。' };
  value.comparisons = ids.map(id => id === selected.candidateId ? selected : kept.get(id));
  return seal({ schema: 'strategy_decision_comparison_coverage_structural_completion_v1',
    promptHash: prompt.hash, sourceHash, beforeValueHash: hash(providerValue), value,
    afterValueHash: hash(value), localChange: { repairedFields: ['comparisons'],
      addedComparisonForSelectedCandidate: value.candidateId, originalComparisonHashes,
      discardedDuplicateComparisonHashes, preferenceChanged: false,
      opponentResponseChanged: false, reviseIfChanged: false },
    providerRegenerationCalls: 0, semanticAcceptanceInherited: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function completeStrategyDecisionComparisonCoverageV1({ prompt, providerValue, validation,
  sourceHash = null }) {
  const issues = validation?.issues;
  if (validation?.ok !== false || !Array.isArray(issues) || issues.length !== 1
    || issues[0].path !== '$.comparisons' || issues[0].code !== 'array_too_short') {
    fail('STRATEGY_DECISION_LOCAL_REPAIR_NOT_APPLICABLE');
  }
  if (validation.valueHash && validation.valueHash !== hash(providerValue)) fail('STRATEGY_DECISION_LOCAL_REPAIR_SOURCE_DRIFT');
  if (issues[0].actualItems !== providerValue.comparisons?.length
    || issues[0].minItems > prompt.candidates.length) fail('STRATEGY_DECISION_LOCAL_REPAIR_NOT_SAFE');
  return structurallyComplete(prompt, providerValue, sourceHash);
}

export function completeStrategyDecisionDynamicCoverageV1({ prompt, providerValue, sourceHash = null }) {
  return structurallyComplete(prompt, providerValue, sourceHash);
}

// Safe only for the common two-candidate interpretation mismatch where the
// model compared every alternative but omitted a row for its selected option.
// The host adds no preference or game claim; the rules-executed case grades the
// unchanged selection again after structural completion.
export function repairStrategyDecisionComparisonCoverageV1({ compiled, rejectedCandidate }) {
  verifyCompiledStrategyCaseV1(compiled); verifySeal(rejectedCandidate);
  if (rejectedCandidate.version !== REJECTED_SCHEMA) {
    fail('STRATEGY_DECISION_LOCAL_REPAIR_NOT_APPLICABLE');
  }
  const completion = completeStrategyDecisionComparisonCoverageV1({ prompt: compiled.prompt,
    providerValue: rejectedCandidate.providerValue, validation: rejectedCandidate.validation,
    sourceHash: rejectedCandidate.hash });
  const grade = gradeStrategyDecisionV1(compiled, completion.value);
  if (!grade.decisionPreferencePassed || !grade.legalCandidateSelected || !grade.rationaleStructurePassed) {
    fail('STRATEGY_DECISION_LOCAL_REPAIR_REPLAY_FAILED');
  }
  return seal({ schema: 'strategy_decision_comparison_coverage_local_repair_v1',
    caseId: compiled.prompt.caseId, caseHash: compiled.hash,
    rejectedCandidateHash: rejectedCandidate.hash, beforeValueHash: hash(rejectedCandidate.providerValue),
    structuralCompletionHash: completion.hash, value: completion.value,
    afterValueHash: completion.afterValueHash, grade, localChange: completion.localChange,
    providerRegenerationCalls: 0, semanticAcceptanceInherited: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function repairAcceptedStrategyDecisionComparisonCoverageV1({ compiled, roleArtifact }) {
  verifyCompiledStrategyCaseV1(compiled); verifySeal(roleArtifact);
  if (roleArtifact.schema !== 'strategy_role_artifact_v1') fail('STRATEGY_DECISION_ACCEPTED_REPAIR_NOT_APPLICABLE');
  const completion = completeStrategyDecisionDynamicCoverageV1({ prompt: compiled.prompt,
    providerValue: roleArtifact.value, sourceHash: roleArtifact.hash });
  const grade = gradeStrategyDecisionV1(compiled, completion.value);
  if (!grade.decisionPreferencePassed || !grade.legalCandidateSelected || !grade.rationaleStructurePassed) {
    fail('STRATEGY_DECISION_LOCAL_REPAIR_REPLAY_FAILED');
  }
  return seal({ schema: 'strategy_decision_accepted_comparison_coverage_local_repair_v1',
    caseId: compiled.prompt.caseId, caseHash: compiled.hash, parentRoleArtifactHash: roleArtifact.hash,
    structuralCompletionHash: completion.hash, value: completion.value,
    afterValueHash: completion.afterValueHash, grade, localChange: completion.localChange,
    providerRegenerationCalls: 0, semanticAcceptanceInherited: false,
    runtimeAccepted: false, trainingTruth: false });
}
