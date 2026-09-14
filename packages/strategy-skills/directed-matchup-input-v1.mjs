import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { STRATEGY_AXES, STRATEGY_CONTRACT_VERSION } from './strategy-contract-v1.mjs';
import { createStrategyOutputContractV1 } from './strategy-production-input-v1.mjs';
import { partitionStrategyCasesV1 } from './strategy-case-compiler-v1.mjs';

// Dependencies here are complete evaluated game Skills, not reconstructed
// strategy-layer stand-ins. Their native knowledge is preserved in full.
export function prepareDirectedMatchupInputV1({ frozenInput, generalSkill,
  generalLayer, ownSkill, opponentSkill, cases }) {
  [frozenInput, frozenInput.frozenSources, generalSkill, generalLayer, ownSkill, opponentSkill].forEach(verifySeal);
  const sourceBinding = frozenInput.sourceBinding;
  if (generalSkill.strategyLayerHash !== generalLayer.hash
    || generalSkill.skillId !== 'starcraft-tmg.general-rules-and-strategy'
    || !generalLayer.assessment.sourceReviewPassed || !generalLayer.assessment.decisionCasesPassed
    || generalLayer.contract.referenceHash !== frozenInput.overallDependencyHash) {
    fail('MATCHUP_GENERAL_DEPENDENCY_UNQUALIFIED');
  }
  if (ownSkill.factionRecordKey === opponentSkill.factionRecordKey) fail('MATCHUP_DIRECTION_INVALID');
  for (const skill of [ownSkill, opponentSkill]) {
    if (skill.schema !== 'project_d_game_skill_v1' || skill.gameId !== 'starcraft-tmg'
      || !['offline_evaluated_advisory', 'offline_source_reviewed_advisory'].includes(skill.trustTier)
      || skill.dependencies.generalSkillHash !== generalSkill.hash
      || skill.dependencies.generalLayerHash !== generalLayer.hash
      || !skill.judgeTests.productionEvidenceHash || !skill.judgeTests.consumerEvidenceHash
      || !skill.judgeTests.rosterEvaluationHash || !skill.judgeTests.ruleEvaluationHash
      || skill.canAffectRules !== false || skill.trainingTruth !== false
      || skill.status !== 'offline_candidate' || skill.runtimeAccepted !== false
      || !skill.knowledge?.length) fail('MATCHUP_FACTION_DEPENDENCY_UNQUALIFIED');
  }
  if ([generalSkill, ownSkill, opponentSkill].some(s => hash(s.sourceBinding) !== hash(sourceBinding))
    || hash(frozenInput.frozenSources.sourceBinding) !== hash(sourceBinding)
    || frozenInput.frozenSources.completeCoreAndFaqExposed !== true
    || frozenInput.frozenSources.refreshPerformed !== false) fail('MATCHUP_SOURCE_BINDING_DRIFT');
  const scope = { family: 'matchup', ownFaction: ownSkill.factionRecordKey,
    opponentFaction: opponentSkill.factionRecordKey };
  const contract = seal({ schema: STRATEGY_CONTRACT_VERSION, scope,
    sourceBinding, referenceHash: frozenInput.overallDependencyHash,
    dependencyHashes: [generalSkill.hash, ownSkill.hash, opponentSkill.hash],
    dependencyProtocol: 'complete_evaluated_game_skills_v1',
    requiredAxes: STRATEGY_AXES.matchup,
    proofBoundary: 'source_support_and_bounded_decisions_separate_from_full_game_effectiveness',
    runtimeAccepted: false, trainingTruth: false });
  const { development, heldout } = partitionStrategyCasesV1(cases);
  if (!development.length || !heldout.length) fail('MATCHUP_DEVELOPMENT_AND_HELDOUT_CASES_REQUIRED');
  const factionNames = {
    'tactical_cards:terran_armed_forces': 'Terran',
    'tactical_cards:zerg_swarm': 'Zerg',
    'tactical_cards:daelaam': 'Protoss',
    'tactical_cards:kerrigan_s_swarm': 'Zerg',
  };
  if (!factionNames[scope.ownFaction] || !factionNames[scope.opponentFaction]) fail('MATCHUP_FACTION_SCOPE_UNSUPPORTED');
  for (const compiled of cases) {
    if (hash(compiled.prompt.binding.sourceBinding) !== hash(sourceBinding)) fail('MATCHUP_CASE_SOURCE_DRIFT');
    const ownSeat = compiled.prompt.seatKey, opponentSeat = ownSeat === 'player1' ? 'player2' : 'player1';
    const players = compiled.prompt.observation.players;
    if (players?.[ownSeat]?.faction !== factionNames[scope.ownFaction]
      || players?.[opponentSeat]?.faction !== factionNames[scope.opponentFaction]) fail('MATCHUP_CASE_DIRECTION_DRIFT');
    if (compiled.prompt.policyAxes.some(axis => !STRATEGY_AXES.matchup.includes(axis))) fail('MATCHUP_CASE_AXIS_INVALID');
  }
  return seal({ schema: 'starcraft_strategy_production_input_v1', contract,
    outputContract: createStrategyOutputContractV1(contract),
    workspace: { fullFrozenSources: frozenInput.frozenSources.prompt,
      rulesReference: frozenInput.overallSkill, operationalGuide: generalLayer,
      strategyDependencies: { generalSkill, ownSkill, opponentSkill },
      direction: scope, developmentCases: development.map(c => c.prompt),
      instruction: 'Produce the declared direction only. Read both complete faction Skills and frozen official rules/FAQ. '
        + 'Write conditional strategic decisions with alternatives and opponent responses. '
        + 'Faction/unit/card eligibility is not complete roster legality. Use current visible force, upgrades, scenario, phase and resources; '
        + 'do not assume a fixed list or RTS economy. The reverse matchup is a separately generated Skill. '
        + 'Do not claim victories or complete-game evaluation. Never treat generated strategy as an official rule.' },
    evaluationManifest: { heldoutCount: heldout.length,
      heldoutInputsIncludedInWorkspace: false,
      developmentCaseHashes: development.map(c => c.hash), heldoutCaseHashes: heldout.map(c => c.hash),
      uncoveredAxes: STRATEGY_AXES.matchup.filter(axis => !development.some(c => c.prompt.policyAxes.includes(axis))),
      runtimeCoverageGaps: [...new Set(cases.flatMap(c => c.prompt.runtimeCoverage.excludedSourceRefs))],
      sourceReviewRequired: true, decisionConsumerRunRequired: true, wholeGameEvaluationRequired: true },
    sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false });
}
