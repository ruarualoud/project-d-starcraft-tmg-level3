import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { STRATEGY_AXES, createStrategyContractV1 } from './strategy-contract-v1.mjs';
import { createStrategyOutputContractV1 } from './strategy-production-input-v1.mjs';

export const EXTRA_FACTION_KEYS_V1 = Object.freeze([
  'tactical_cards:daelaam',
  'tactical_cards:kerrigan_s_swarm',
]);

// New factions are a separate versioned input family. The original first-five
// compiler and its completed Terran/Zerg receipts remain immutable.
export function prepareExtraFactionInputV1({ frozenInput, factionEvidence,
  generalSkill, generalLayer }) {
  [frozenInput, frozenInput.frozenSources, factionEvidence,
    generalSkill, generalLayer].forEach(verifySeal);
  if (!EXTRA_FACTION_KEYS_V1.includes(factionEvidence.factionRecordKey)) {
    fail('EXTRA_FACTION_SCOPE_INVALID');
  }
  if (factionEvidence.schema !== 'starcraft_faction_production_evidence_v1'
    || factionEvidence.catalogueHash !== frozenInput.catalogueHash
    || hash(factionEvidence.sourceBinding) !== hash(frozenInput.sourceBinding)
    || factionEvidence.sourceRefreshPerformed !== false
    || factionEvidence.runtimeAccepted !== false
    || factionEvidence.trainingTruth !== false) {
    fail('EXTRA_FACTION_EVIDENCE_INVALID');
  }
  if (generalSkill.skillId !== 'starcraft-tmg.general-rules-and-strategy'
    || generalSkill.strategyLayerHash !== generalLayer.hash
    || generalLayer.contract.referenceHash !== frozenInput.overallDependencyHash
    || generalLayer.assessment.sourceReviewPassed !== true
    || generalLayer.assessment.decisionCasesPassed !== true
    || hash(generalSkill.sourceBinding) !== hash(frozenInput.sourceBinding)) {
    fail('EXTRA_FACTION_GENERAL_DEPENDENCY_INVALID');
  }
  const scope = { family: 'faction', ownFaction: factionEvidence.factionRecordKey };
  const contract = createStrategyContractV1({ scope,
    sourceBinding: frozenInput.sourceBinding,
    referenceHash: frozenInput.overallDependencyHash,
    dependencies: [generalLayer] });
  if (hash(contract.requiredAxes) !== hash(STRATEGY_AXES.faction)) {
    fail('EXTRA_FACTION_AXES_DRIFT');
  }
  return seal({ schema: 'starcraft_strategy_production_input_v1', contract,
    outputContract: createStrategyOutputContractV1(contract),
    workspace: {
      fullFrozenSources: frozenInput.frozenSources.prompt,
      rulesReference: frozenInput.overallSkill,
      operationalGuide: generalLayer,
      strategyDependencies: { generalSkill, generalLayer },
      factionEvidence,
      developmentCases: [],
      instruction: 'Produce one conditional faction strategy Skill for the selected Faction Card. '
        + 'Use the complete current official Core, FAQ and product catalogue plus the exact general strategy dependency. '
        + 'Distinguish race-wide cards from sub-faction-only cards, and derive eligible units/cards from factionEvidence. '
        + 'Write decision policies rather than a rules digest: compare alternatives, opponent responses, position/tempo/resource tradeoffs and replan conditions. '
        + 'Do not invent a fixed roster, hidden opponent information, RTS mechanics, win rate, rule authority or runtime acceptance. '
        + 'No real decision case is supplied in this production round; keep untested effectiveness explicit.'
    },
    evaluationManifest: {
      heldoutCount: 0,
      heldoutInputsIncludedInWorkspace: false,
      developmentCaseHashes: [],
      heldoutCaseHashes: [],
      uncoveredAxes: [...STRATEGY_AXES.faction],
      runtimeCoverageGaps: ['no_extra_faction_position_case_yet',
        'no_extra_faction_complete_game_yet'],
      sourceReviewRequired: true,
      decisionConsumerRunRequired: true,
      wholeGameEvaluationRequired: true,
    },
    sourceRefreshPerformed: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
}
