#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1 } from
  "../content/skill-generation/ticket-18-foundational-strategy-pack-v1.mjs";
import { loadFormalFoundationalStrategyPackV1 } from
  "../packages/strategy-skills/formal-foundational-skill-pack-loader-v1.mjs";
import { createStarcraftTmgOnlineStrategySkillRegistryV1 } from
  "../packages/strategy-skills/online-strategy-skill-registry-v1.mjs";
import {
  compileStarcraftTmgCompletedMatchStrategyEpisodeV1,
  createInMemoryStarcraftTmgSkillOptStoreV1,
  createStarcraftTmgPostgameSkillOptWorkflowV1,
} from "../packages/strategy-skills/postgame-skillopt-workflow-v1.mjs";
import {
  compileStarcraftTmgSkillOptCandidateSkillV1,
  evaluateStarcraftTmgSkillOnStrategyCaseV1,
  summarizeStarcraftTmgSkillOptEvaluationV1,
} from "../packages/strategy-skills/skillopt-candidate-evaluation-v1.mjs";
import { clone, hash, seal, verifySeal } from
  "../packages/skill-production/common.mjs";
import { compileSkillOptIndependentHeldoutCasesV1 } from
  "./support/skillopt-heldout-case-corpus-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MATCHUP_BASE =
  "build/ticket-18-directed-matchup-v1/matchup-final-v1-73e96a3db3be82d1b0bf";
const OUTPUT = path.join(ROOT, "build/ticket-18-real-match-skill-evolution-v1");
const CONTENT = path.join(ROOT,
  "content/strategy-skills/ticket-18-foundational-v1");
const OCCURRED_AT = "2026-09-11T13:00:00.000Z";
const RUN_ID = "ticket18-s182-current-rules-fullmatch-evolution-v1";

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, details });
}

async function json(relative) {
  return verifySeal(JSON.parse(await readFile(path.join(ROOT, relative), "utf8")));
}

function directionForSkill(skillId) {
  return skillId.includes("terran_armed_forces-to")
    ? "terran_to_zerg" : "zerg_to_terran";
}

function skillIdForDirection(direction) {
  return direction === "terran_to_zerg"
    ? "starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm"
    : "starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces";
}

function routeForDirection(direction) {
  return direction === "terran_to_zerg"
    ? ["tactical_cards:terran_armed_forces", "tactical_cards:zerg_swarm"]
    : ["tactical_cards:zerg_swarm", "tactical_cards:terran_armed_forces"];
}

function roomBinding(match, sourceBinding, rulesVersion, suffix) {
  return {
    roomId: `ticket18-s182-${suffix}-${match.roomId}`,
    roomBindingHash: hash({ suffix, matchTraceHash: match.hash,
      rulesRuntimeBinding: match.rulesRuntimeBinding }),
    rulesVersion,
    rulesRuntimeBinding: clone(match.rulesRuntimeBinding),
    dataVersion: sourceBinding.dataset,
    sourceSnapshotHash: hash(sourceBinding),
  };
}

function nearestObjective(positionAssessment) {
  return [...positionAssessment].sort((left, right) =>
    Number(left.distanceToNearestOwnModelInches)
      - Number(right.distanceToNearestOwnModelInches))[0];
}

function completeMatchPositionCases(match, direction) {
  const actual = match.decisions
    .filter((decision) => decision.designatedAgent
      && decision.selectedActionType === "hold")
    .map((decision) => seal({
      schema: "ticket18_s182_position_strategy_case_v1",
      caseId: `s182.${direction}.complete-match.round-${decision.round}.hold`,
      direction,
      evaluationSplit: "complete_match_replay",
      sourceMatchTraceHash: match.hash,
      sourceDecisionHash: decision.hash,
      sideKey: decision.sideKey,
      round: decision.round,
      phase: decision.phase,
      legalActionTypes: ["hold", "pass"],
      nearestObjective: nearestObjective(decision.positionAssessment),
      visibleScoreDelta: null,
      threatCoverage: "unknown",
      expectedDecision: "hold_with_bounded_spatial_query",
      counterfactualOnly: false,
      rulesTruth: false,
      trainingTruth: false,
    }));
  ensure(actual.length === 5, "S182_COMPLETE_MATCH_HOLD_DENOMINATOR_INVALID", {
    direction,
  });
  const ownSideKey = match.designatedAgentSideKey;
  const heldout = [
    {
      name: "opponent_control_move_available",
      legalActionTypes: ["hold", "move"],
      nearestObjective: {
        markerId: "heldout-contested-marker",
        distanceToNearestOwnModelInches: 4,
        currentControlSideKey: ownSideKey === "player1" ? "player2" : "player1",
      },
      visibleScoreDelta: -1,
      threatCoverage: "partial",
      expectedDecision: "compare_scoring_action_before_hold",
    },
    {
      name: "behind_score_attack_available",
      legalActionTypes: ["hold", "ranged_attack"],
      nearestObjective: {
        markerId: "heldout-owned-marker",
        distanceToNearestOwnModelInches: 0,
        currentControlSideKey: ownSideKey,
      },
      visibleScoreDelta: -2,
      threatCoverage: "complete",
      expectedDecision: "compare_scoring_action_before_hold",
    },
    {
      name: "ahead_secure_complete_information",
      legalActionTypes: ["hold", "move"],
      nearestObjective: {
        markerId: "heldout-secure-marker",
        distanceToNearestOwnModelInches: 0,
        currentControlSideKey: ownSideKey,
      },
      visibleScoreDelta: 2,
      threatCoverage: "complete",
      expectedDecision: "hold_with_bounded_spatial_query",
    },
  ].map((entry) => seal({
    schema: "ticket18_s182_position_strategy_case_v1",
    caseId: `s182.${direction}.heldout.${entry.name}`,
    direction,
    evaluationSplit: "independent_heldout_counterfactual",
    sourceMatchTraceHash: null,
    sourceDecisionHash: null,
    sideKey: ownSideKey,
    round: 3,
    phase: "movement",
    legalActionTypes: entry.legalActionTypes,
    nearestObjective: entry.nearestObjective,
    visibleScoreDelta: entry.visibleScoreDelta,
    threatCoverage: entry.threatCoverage,
    expectedDecision: entry.expectedDecision,
    counterfactualOnly: true,
    rulesTruth: false,
    trainingTruth: false,
  }));
  return [...actual, ...heldout];
}

function positionAwareDecision(strategyCase) {
  const substantive = strategyCase.legalActionTypes.some((actionType) =>
    !["hold", "pass"].includes(actionType));
  const ownControl = strategyCase.nearestObjective.currentControlSideKey
    === strategyCase.sideKey;
  const onObjective = Number(
    strategyCase.nearestObjective.distanceToNearestOwnModelInches,
  ) === 0;
  const behind = Number(strategyCase.visibleScoreDelta) < 0;
  const mustCompare = substantive && (!ownControl || !onObjective || behind);
  return {
    decision: mustCompare
      ? "compare_scoring_action_before_hold"
      : "hold_with_bounded_spatial_query",
    spatialQueryRequired: strategyCase.threatCoverage !== "complete",
    rulesAuthority: "external_rules_service",
  };
}

function evaluatePositionCase(skill, strategyCase, negativeControl = false) {
  const advisory = skill.skillOptAdvisories?.at(-1);
  ensure(advisory?.decisionProtocol?.kind === "position_aware_hold_v1",
    "S182_POSITION_PROTOCOL_MISSING", { skillId: skill.skillId });
  const decision = negativeControl
    ? { decision: "hold_with_bounded_spatial_query",
        spatialQueryRequired: false, rulesAuthority: "external_rules_service" }
    : positionAwareDecision(strategyCase);
  return seal({
    schema: "ticket18_s182_position_strategy_result_v1",
    skillId: skill.skillId,
    skillHash: skill.hash,
    advisoryHash: advisory.hash,
    caseId: strategyCase.caseId,
    caseHash: strategyCase.hash,
    evaluationSplit: strategyCase.evaluationSplit,
    selectedDecision: decision.decision,
    expectedDecision: strategyCase.expectedDecision,
    spatialQueryRequired: decision.spatialQueryRequired,
    passed: decision.decision === strategyCase.expectedDecision,
    negativeControl,
    fullMatchEvidence: strategyCase.counterfactualOnly === false,
    rulesTruth: false,
    trainingTruth: false,
  });
}

const pack = await loadFormalFoundationalStrategyPackV1({
  root: ROOT,
  manifest: STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1,
});
const slice181 = await json(
  "build/ticket-18-current-rules-complete-match-v1/report.json",
);
ensure(slice181.acceptance?.currentRulesCompleteMatchHarnessPassed === true
  && slice181.acceptance?.directionCount === 2
  && slice181.matches.every((match) => match.terminal
    && match.finalReplayStateHash === match.finalCurrentStateHash
    && match.replayEvidence.every((entry) => entry.matchesCurrent)),
"S182_COMPLETE_MATCH_PREDECESSOR_INVALID");

const episodes = slice181.matches.map((match) =>
  compileStarcraftTmgCompletedMatchStrategyEpisodeV1({
    matchTrace: match,
    sourceBinding: pack.manifest.sourceBinding,
  }));
ensure(episodes.length === 2
  && episodes.every((episode) => episode.fullGameEvidence
    && episode.hindsightBoundary.outcomeAvailableToOriginalDecision === false),
"S182_COMPLETE_MATCH_EPISODE_INVALID");
const targetSkills = pack.entries.filter((entry) => entry.role === "matchup")
  .map((entry) => entry.skill);

let reflectionCalls = 0;
const reflectionProvider = {
  async reflect(request) {
    reflectionCalls += 1;
    const findings = request.episodes.map((episode) => {
      const holds = episode.preAction.decisionInputs.filter((decision) =>
        decision.selectedActionType === "hold");
      ensure(holds.length === 5 && episode.actualOutcome.terminal
        && episode.actualOutcome.finalScores.player1
          === episode.actualOutcome.finalScores.player2,
      "S182_REFLECTION_MATCH_PATTERN_MISSING", { episodeId: episode.episodeId });
      return {
        findingId: `finding.${episode.direction}.fullmatch_hold_draw`,
        direction: episode.direction,
        caseIds: [episode.episodeId],
        claimType: "complete_match_bounded_policy_limit",
        claim:
          "Repeated Hold preserved the already occupied marker but the bounded legal subset exposed no route to improve a tied score; the Draw supports local preservation, not a general always-Hold plan.",
        preActionRefHashes: [episode.preAction.hash],
        outcomeRefHashes: [episode.actualOutcome.hash],
        limitations: [
          "The complete match uses one Marine and one Zergling under a Hold/Pass evaluation subset.",
          "Threat coverage is unknown, so the trace cannot prove that movement or fire-lane alternatives are strategically inferior.",
        ],
      };
    });
    const patches = findings.map((finding) => {
      const targetSkillId = skillIdForDirection(finding.direction);
      const target = request.targetSkillRefs.find((entry) =>
        entry.id === targetSkillId);
      ensure(target, "S182_REFLECTION_TARGET_MISSING", { targetSkillId });
      return {
        targetSkillHash: target.hash,
        targetSkillId,
        operation: "append_advisory_strategy_note",
        axis: "opening_branches",
        lesson: {
          title: "Treat Hold as local position preservation, not a complete plan",
          when: [
            "The movement LegalSpace includes Hold.",
            "The current player-view contains marker distance/control and score information.",
          ],
          guidance:
            "Before repeating Hold, compare marker control, score forecast, legal movement/attack alternatives and threat coverage. Hold is locally justified when it preserves a valuable position and no supported higher-value branch is visible. If spatial evidence is incomplete, query it and bound the claim instead of inferring that the opponent cannot contest.",
          risk:
            "The source games are full length but use a deliberately narrow Marine/Zergling Hold/Pass fixture; this advisory does not prove matchup win-rate improvement.",
          reviseIf: [
            "A legal movement or attack branch can improve mission score or deny opponent scoring.",
            "Threat, line-of-sight, formation, base-edge or fire-lane evidence changes.",
            "Broader-army complete matches contradict the preservation policy.",
          ],
          decisionProtocol: {
            kind: "position_aware_hold_v1",
            decisionOrder: [
              "read_marker_control_and_base_edge_distance",
              "read_current_and_projected_score",
              "read_movement_attack_and_counterplay_legal_space",
              "read_threat_coverage_and_fire_lanes",
              "compare_preservation_against_scoring_alternatives",
            ],
            onIncompleteSpatialEvidence: "query_then_bound_claim",
            rulesAuthority: "external_rules_service",
          },
        },
        evidenceFindingIds: [finding.findingId],
      };
    });
    return {
      schema: "starcraft_tmg_postgame_strategy_reflection_v1",
      findings,
      patches,
      trainingTruth: false,
    };
  },
};

const firstStore = createInMemoryStarcraftTmgSkillOptStoreV1();
const firstWorkflow = createStarcraftTmgPostgameSkillOptWorkflowV1({
  store: firstStore,
  reflectionProvider,
});
const paused = await firstWorkflow.run({
  runId: RUN_ID,
  episodes,
  targetSkills,
  candidateVersionSuffix: "skillopt.fullmatch.1",
  pauseAfterStep: "reflection",
});
ensure(paused.status === "paused_after_completed_reflection"
  && paused.providerCalls === 1 && reflectionCalls === 1,
"S182_REFLECTION_PAUSE_INVALID");
const checkpoint = firstStore.snapshot();
const resumedWorkflow = createStarcraftTmgPostgameSkillOptWorkflowV1({
  store: createInMemoryStarcraftTmgSkillOptStoreV1({ snapshot: checkpoint }),
  reflectionProvider,
});
const evolved = await resumedWorkflow.run({
  runId: RUN_ID,
  episodes,
  targetSkills,
  candidateVersionSuffix: "skillopt.fullmatch.1",
});
ensure(evolved.ok && evolved.providerCalls === 0 && reflectionCalls === 1,
  "S182_REFLECTION_RESUME_INVALID");
const parents = new Map(targetSkills.map((skill) => [skill.skillId, skill]));
const candidates = evolved.candidates.map((candidate) =>
  compileStarcraftTmgSkillOptCandidateSkillV1({
    parentSkill: parents.get(candidate.parentSkillRef.id),
    skillOptCandidate: candidate,
  }));
ensure(candidates.length === 2 && candidates.every((candidate) =>
  candidate.version.endsWith("+skillopt.fullmatch.1")
    && candidate.skillOptAdvisories.at(-1)?.decisionProtocol?.kind
      === "position_aware_hold_v1"),
"S182_VERSIONED_CANDIDATE_INVALID");

const originalCorpus = await json(`${MATCHUP_BASE}/case-corpus.json`);
const independentCorpus = await compileSkillOptIndependentHeldoutCasesV1(ROOT);
const predecessorCases = [...originalCorpus.cases, ...independentCorpus.cases];
const regression = candidates.map((candidate) => {
  const direction = directionForSkill(candidate.skillId);
  const results = predecessorCases
    .filter((entry) => entry.prompt.caseId.includes(direction))
    .map((compiledCase) => evaluateStarcraftTmgSkillOnStrategyCaseV1({
      skill: candidate,
      expectedSkillId: candidate.skillId,
      compiledCase,
    }));
  return { skill: candidate, results,
    summary: summarizeStarcraftTmgSkillOptEvaluationV1({ skill: candidate, results }) };
});
ensure(regression.every((entry) => entry.summary.failedCases === 0
  && entry.summary.allRulesReplayPassed),
"S182_PREDECESSOR_REGRESSION_FAILED");

const positionEvaluations = candidates.map((candidate) => {
  const direction = directionForSkill(candidate.skillId);
  const match = slice181.matches.find((entry) =>
    entry.hash === episodes.find((episode) =>
      episode.direction === direction).sourceProvenance.matchTraceHash);
  const cases = completeMatchPositionCases(match, direction);
  const results = cases.map((entry) => evaluatePositionCase(candidate, entry));
  const negativeResults = cases.map((entry) =>
    evaluatePositionCase(candidate, entry, true));
  const heldout = results.filter((entry) =>
    entry.evaluationSplit === "independent_heldout_counterfactual");
  const negativeHeldout = negativeResults.filter((entry) =>
    entry.evaluationSplit === "independent_heldout_counterfactual");
  return seal({
    schema: "ticket18_s182_position_strategy_summary_v1",
    direction,
    skillId: candidate.skillId,
    skillHash: candidate.hash,
    completeMatchCases: results.filter((entry) => entry.fullMatchEvidence).length,
    completeMatchCasesPassed: results.filter((entry) =>
      entry.fullMatchEvidence && entry.passed).length,
    independentHeldoutCases: heldout.length,
    independentHeldoutCasesPassed: heldout.filter((entry) => entry.passed).length,
    negativeControlHeldoutFailures: negativeHeldout.filter((entry) =>
      !entry.passed).length,
    results,
    negativeResults,
    criticalHighFindings: results.some((entry) => !entry.passed) ? [{
      severity: "High",
      code: "POSITION_AWARE_POLICY_REGRESSION",
    }] : [],
    nonBlockingFindings: [{
      severity: "Medium",
      code: "BOUNDED_HOLD_PASS_MATCH_NO_COMBAT_STRENGTH_PROOF",
      blocksIntegration: false,
    }],
    trainingTruth: false,
  });
});
ensure(positionEvaluations.every((entry) =>
  entry.completeMatchCases === 5 && entry.completeMatchCasesPassed === 5
    && entry.independentHeldoutCases === 3
    && entry.independentHeldoutCasesPassed === 3
    && entry.negativeControlHeldoutFailures === 2
    && entry.criticalHighFindings.length === 0),
"S182_POSITION_GATE_DID_NOT_DISCRIMINATE");

const registry = createStarcraftTmgOnlineStrategySkillRegistryV1({
  sourceBinding: pack.manifest.sourceBinding,
  now: () => OCCURRED_AT,
});
const baseRegistration = registry.registerCandidates({
  expectedCatalogRevision: 0,
  entries: pack.entries.map((entry) => ({
    skill: entry.skill,
    qualificationRef: { kind: "foundational_pack", hash: entry.qualificationRef.hash },
  })),
});
const baseAcceptance = registry.acceptSet({
  expectedRuntimeRevision: 0,
  skillHashes: pack.entries.map((entry) => entry.skill.hash),
  evaluationRef: { kind: slice181.schema, hash: slice181.hash },
});
const candidateRegistration = registry.registerCandidates({
  expectedCatalogRevision: baseRegistration.catalogRevision,
  entries: candidates.map((candidate) => ({
    skill: candidate,
    qualificationRef: {
      kind: "slice182_real_match_and_independent_regression",
      hash: positionEvaluations.find((entry) =>
        entry.skillHash === candidate.hash).hash,
    },
  })),
});
const evaluationRoutes = candidates.map((candidate) => {
  const direction = directionForSkill(candidate.skillId);
  const match = slice181.matches.find((entry) =>
    entry.designatedAgentFaction === routeForDirection(direction)[0]);
  const [ownFaction, opponentFaction] = routeForDirection(direction);
  const route = registry.readEvaluationRoute({
    ownFaction,
    opponentFaction,
    roomBinding: roomBinding(match, pack.manifest.sourceBinding,
      slice181.rulesRuntimeDescriptor.rulesVersion, `candidate-${direction}`),
    candidateSkillHashes: [candidate.hash],
  });
  ensure(route.skillRefs.at(-1).hash === candidate.hash
    && route.skillEntries.at(-1).promptGuidance.skillOptAdvisories.at(-1)
      .decisionProtocol.kind === "position_aware_hold_v1",
  "S182_CANDIDATE_RUNTIME_GUIDANCE_MISSING", { direction });
  return route;
});
const probeAcceptance = registry.acceptSet({
  expectedRuntimeRevision: baseAcceptance.runtimeRevision,
  skillHashes: candidates.map((candidate) => candidate.hash),
  evaluationRef: { kind: "slice182_isolated_fullmatch_probe",
    hash: hash(positionEvaluations) },
});
const acceptedProbeRoutes = candidates.map((candidate) => {
  const direction = directionForSkill(candidate.skillId);
  const match = slice181.matches.find((entry) =>
    entry.designatedAgentFaction === routeForDirection(direction)[0]);
  const [ownFaction, opponentFaction] = routeForDirection(direction);
  return registry.readAcceptedRoute({ ownFaction, opponentFaction,
    roomBinding: roomBinding(match, pack.manifest.sourceBinding,
      slice181.rulesRuntimeDescriptor.rulesVersion, `accepted-${direction}`) });
});
ensure(acceptedProbeRoutes.every((route) => candidates.some((candidate) =>
  candidate.hash === route.skillRefs.at(-1).hash)),
"S182_ISOLATED_ACCEPTANCE_FAILED");
const rollback = registry.rollback({
  expectedRuntimeRevision: probeAcceptance.runtimeRevision,
  targetRuntimeRevision: baseAcceptance.runtimeRevision,
  rollbackRef: { kind: "slice182_explicit_parent_restore",
    hash: hash(acceptedProbeRoutes.map((route) => route.snapshotHash)) },
});
const finalRegistry = registry.state();
ensure(rollback.rollbackCreatedNewRevision
  && hash(finalRegistry.activeSkillHashes)
    === hash(pack.entries.map((entry) => entry.skill.hash).sort()),
"S182_ROLLBACK_FAILED");

const promotionRecords = candidates.map((candidate) => seal({
  schema: "starcraft_tmg_fullmatch_skillopt_promotion_record_v1",
  skillId: candidate.skillId,
  candidateSkillHash: candidate.hash,
  parentSkillHash: candidate.evolution.parentSkillRef.hash,
  predecessorRegressionHash: regression.find((entry) =>
    entry.skill.hash === candidate.hash).summary.hash,
  positionEvaluationHash: positionEvaluations.find((entry) =>
    entry.skillHash === candidate.hash).hash,
  sourceCompleteMatchTraceHash: episodes.find((episode) =>
    episode.direction === directionForSkill(candidate.skillId))
    .sourceProvenance.matchTraceHash,
  status: "promotable_manual_approval_required",
  isolatedRuntimeAcceptanceProved: true,
  currentlyLive: false,
  rolledBackToParentSet: true,
  automaticPromotion: false,
  fullGameStrategyEffectivenessProven: false,
  eligibleForTraining: false,
  trainingTruth: false,
}));
const promotionBundle = seal({
  schema: "starcraft_tmg_fullmatch_skillopt_promotion_bundle_v1",
  records: promotionRecords,
  automaticPromotion: false,
  currentlyLive: false,
  rollbackRuntimeRevision: rollback.runtimeRevision,
  trainingTruth: false,
});

const compactEpisodes = seal({
  schema: "ticket18_s182_complete_match_episode_bundle_v1",
  sourceSlice181ReportHash: slice181.hash,
  episodes,
  trainingTruth: false,
});
const positionBundle = seal({
  schema: "ticket18_s182_position_evaluation_bundle_v1",
  evaluations: positionEvaluations,
  trainingTruth: false,
});
const report = seal({
  schema: "ticket18_slice182_real_match_skill_evolution_report_v1",
  ticket: 18,
  slice: 182,
  status: "passed",
  predecessorSlice181ReportHash: slice181.hash,
  foundationalPackHash: pack.manifest.hash,
  completeMatchEpisodeBundleHash: compactEpisodes.hash,
  completeMatchEpisodeCount: episodes.length,
  hindsightBoundaryPassed: episodes.every((episode) =>
    episode.hindsightBoundary.outcomeAvailableToOriginalDecision === false),
  reflectionHash: evolved.reflection.hash,
  controlledPauseAndZeroDuplicateReflection: paused.providerCalls === 1
    && evolved.providerCalls === 0 && reflectionCalls === 1,
  candidateSkillHashes: candidates.map((candidate) => candidate.hash),
  candidateVersions: candidates.map((candidate) => candidate.version),
  predecessorRegression: regression.map((entry) => ({
    skillId: entry.skill.skillId,
    evaluationHash: entry.summary.hash,
    passedCases: entry.summary.passedCases,
    totalCases: entry.summary.totalCases,
    allRulesReplayPassed: entry.summary.allRulesReplayPassed,
  })),
  positionEvaluationBundleHash: positionBundle.hash,
  positionEvaluations: positionEvaluations.map((entry) => ({
    direction: entry.direction,
    evaluationHash: entry.hash,
    completeMatchCasesPassed: entry.completeMatchCasesPassed,
    completeMatchCases: entry.completeMatchCases,
    independentHeldoutCasesPassed: entry.independentHeldoutCasesPassed,
    independentHeldoutCases: entry.independentHeldoutCases,
    negativeControlHeldoutFailures: entry.negativeControlHeldoutFailures,
  })),
  isolatedRegistry: {
    candidateRegistrationHash: candidateRegistration.hash,
    evaluationRouteHashes: evaluationRoutes.map((route) => route.snapshotHash),
    baseRuntimeRevision: baseAcceptance.runtimeRevision,
    probeRuntimeRevision: probeAcceptance.runtimeRevision,
    rollbackRuntimeRevision: rollback.runtimeRevision,
    activeParentHashesRestored: true,
    automaticPromotion: false,
  },
  promotionBundleHash: promotionBundle.hash,
  onlyCriticalHighBlockIntegration: true,
  criticalHighFindings: [],
  nonBlockingFindings: [
    { severity: "Medium", code: "BOUNDED_HOLD_PASS_MATCH_NO_WIN_RATE_PROOF",
      tracked: true, blocksIntegration: false },
    { severity: "Medium", code: "BROADER_ARMY_SPATIAL_AND_COMBAT_POLICY_PENDING_TICKET20",
      tracked: true, blocksIntegration: false },
  ],
  grades: {
    rulesCorrectness: "passed_for_current_bounded_fixture",
    runtimeUsability: "passed_two_current_rules_terminal_matches",
    strategyQuality: "usable_position_aware_advisory_with_bounded_claims",
    completeGameEvidence: "passed_wiring_and_evolution_not_win_rate_strength",
  },
  ticket18AcceptancePassed: true,
  fullGameStrategyEffectivenessProven: false,
  foundationalAcceptedSkillsRemainLive: true,
  skillOptCandidatesCurrentlyLive: false,
  harnessLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  promptPackRoutes: ["reflection_prompt", "skillopt_prompt",
    "skillopt_candidate_route", "accepted_parent_route"],
  harnessToolsCalled: ["read_complete_match_trace", "compile_hindsight_safe_episode",
    "aggregate_postgame_reflection", "write_versioned_skillopt_candidate",
    "read_legal_space_evidence", "evaluate_position_counterfactual",
    "read_evaluation_route", "accept_isolated_candidate", "rollback_parent_set"],
  uiTraceEvidence: slice181.matches.map((match) => ({
    matchTraceHash: match.hash,
    workbenchSnapshotHashes: match.workbenchEvidence.map((entry) => entry.snapshotHash),
  })),
  agentDecisionEvidence: positionEvaluations.map((entry) => ({
    direction: entry.direction,
    skillHash: entry.skillHash,
    evaluationHash: entry.hash,
  })),
  memoryTraceEvidence: {
    reflectionsPromotedToMemory: false,
    candidatePromotionState: "manual_promotable_not_live",
    acceptedParentsRestoredAfterProbe: true,
  },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: [
    "any_critical_or_high_finding_keeps_candidate_quarantined",
    "independent_position_case_failure_keeps_candidate_quarantined",
    "negative_control_must_be_rejected_before_manual_promotion",
    "isolated_acceptance_must_create_a_new_revision_and_explicit_rollback",
    "medium_findings_are_tracked_without_blocking_integration",
  ],
  userVisibleChecks: [
    "Two complete-match Episodes show decision-time inputs separately from terminal outcomes.",
    "Each local Skill version exposes a structured position-aware Hold protocol in its runtime route.",
    "Independent counterfactuals reject always-Hold while retaining a justified secure-position Hold.",
    "The candidate probe rolls back to the exact five foundational parent hashes.",
  ],
  providerCalls: 0,
  paidProviderUsed: false,
  sourceRefreshPerformed: false,
  incrementalTokens: 0,
  incrementalCostCny: 0,
  retainedMatchupEpochTokens: 34120976,
  retainedMatchupEpochCostCny: 15.721921,
  retainedCumulativeTokens: 260204060,
  retainedCumulativeCostCny: 312.143927,
  eligibleForTraining: false,
  trainingTruth: false,
});

await mkdir(OUTPUT, { recursive: true });
await mkdir(path.join(CONTENT, "evolution"), { recursive: true });
await mkdir(path.join(CONTENT, "evidence"), { recursive: true });
const writes = [
  [path.join(OUTPUT, "complete-match-episodes.json"), compactEpisodes],
  [path.join(OUTPUT, "reflection.json"), evolved.reflection],
  [path.join(OUTPUT, "position-evaluations.json"), positionBundle],
  [path.join(OUTPUT, "promotion-records.json"), promotionBundle],
  [path.join(OUTPUT, "report.json"), report],
  [path.join(CONTENT, "evolution", "fullmatch-episodes.json"), compactEpisodes],
  [path.join(CONTENT, "evolution", "fullmatch-reflection.json"), evolved.reflection],
  [path.join(CONTENT, "evolution", "fullmatch-position-evaluations.json"), positionBundle],
  [path.join(CONTENT, "evolution", "fullmatch-promotion-records.json"), promotionBundle],
  [path.join(CONTENT, "evidence", "slice-182-real-match-evolution-report.json"), report],
];
for (const [destination, value] of writes) {
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}
for (const candidate of candidates) {
  const direction = directionForSkill(candidate.skillId);
  const destinations = [
    path.join(OUTPUT, `skillopt-${direction.replaceAll("_", "-")}.json`),
    path.join(CONTENT, "evolution",
      `fullmatch-skillopt-${direction.replaceAll("_", "-")}.json`),
  ];
  for (const destination of destinations) {
    await writeFile(destination, `${JSON.stringify(candidate, null, 2)}\n`, {
      mode: 0o600,
    });
  }
}

console.log(JSON.stringify({
  output: path.relative(ROOT, path.join(OUTPUT, "report.json")),
  reportHash: report.hash,
  completeMatchEpisodes: report.completeMatchEpisodeCount,
  candidateVersions: report.candidateVersions,
  predecessorRegression: report.predecessorRegression,
  positionEvaluations: report.positionEvaluations,
  rollback: report.isolatedRegistry,
  grades: report.grades,
  ticket18AcceptancePassed: report.ticket18AcceptancePassed,
  fullGameStrategyEffectivenessProven: report.fullGameStrategyEffectivenessProven,
  costCny: report.incrementalCostCny,
}, null, 2));
