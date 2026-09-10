import { loadStrategyCaseFixtureV1 } from "./strategy-case-fixture-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./official-development-tranche-source-lock-fixture-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "../../packages/rule-atoms/official-round-supply-state-v1.mjs";
import { createStrategyCaseCompilerV1, partitionStrategyCasesV1 } from
  "../../packages/strategy-skills/strategy-case-compiler-v1.mjs";
import { fail, seal } from "../../packages/skill-production/common.mjs";

function desiredActors(direction) {
  return direction === "terran_to_zerg"
    ? ["player2", "player1"]
    : ["player1", "player2"];
}

export async function compileSkillOptIndependentHeldoutCasesV1(root) {
  const fixture = await loadStrategyCaseFixtureV1(root, { currentRuntime: true });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
  if (source.dataset.datasetHash !== fixture.frozenInput.sourceBinding.dataset) {
    fail("SKILLOPT_HELDOUT_DATA_DRIFT");
  }
  const record = (key) => getOfficialCurrentProductRecord(source.dataset, key);
  const zergling = record("army_units:zergling");
  const swarm = record("tactical_cards:zerg_swarm");
  const bundle = createOfficialGameplayDataBundleV1({
    ...source,
    unitRecordKeys: ["army_units:marine", "army_units:medic", "army_units:zergling"],
    missionRecordKey: "faction_cards:mission_hold_position",
    cleanupCardRecordKeys: [
      "tactical_cards:academy",
      "tactical_cards:terran_armed_forces",
    ],
    reserveDeployData: true,
  });
  const runtime = fixture.compilerOptions.rulesRuntime;
  const compiler = createStrategyCaseCompilerV1({
    ...fixture.compilerOptions,
    gameplayDataBundle: bundle,
    runtimeCoverage: {
      scope: "skillopt_independent_first_actor_heldout_fixture_only",
      excludedSourceRefs: [
        "zerg_movement_not_exercised",
        "zerg_card_cleanup_not_supported_by_this_fixture",
        "combat_and_scoring_not_exercised",
        "full_game_strategy_effectiveness_not_proven",
      ],
      productionQualificationEligible: false,
      fullGameCoverage: false,
      faqInterpretationReimplemented: false,
    },
  });
  const cases = [];
  const directions = ["terran_to_zerg", "zerg_to_terran"];
  for (const [directionIndex, direction] of directions.entries()) {
    const ownSeat = directionIndex === 0 ? "player1" : "player2";
    const yPositions = directionIndex === 0 ? [13, 29] : [15, 31];
    for (const [variantIndex, desiredFirstActor] of
      desiredActors(direction).entries()) {
      const variant = variantIndex === 0 ? "a" : "b";
      const state = fixture.state({ yInches: yPositions[variantIndex] });
      state.officialGameplayDataBundle = bundle;
      state.players.player2.faction = "Zerg";
      state.firstPlayerSideKey = ownSeat;
      state.activeSideKey = ownSeat;
      state.phaseFirstActorByRound = {};
      state.pieces[0].selectedUpgradeNames = [];
      const enemy = state.pieces[1];
      Object.assign(enemy, {
        id: "player2-zergling",
        name: zergling.payload.name,
        officialUnitRecordKey: "army_units:zergling",
        sourceRecordHash: zergling.sourceRecordHash,
        officialPayloadHash: zergling.payloadHash,
        selectedUpgradeNames: [],
        combatTags: zergling.payload.tags.split(",")
          .map((tag) => tag.trim().toLowerCase()),
      });
      enemy.models[0].id = "player2-zergling-model-1";
      state.cardResources.player2 = [{
        id: "player2-zerg-swarm",
        sideKey: "player2",
        officialCardRecordKey: "tactical_cards:zerg_swarm",
        sourceRecordHash: swarm.sourceRecordHash,
        cardKind: "faction",
        resource: swarm.payload.resource,
        resourceType: "Biomass",
        readiness: "ready",
        face: "up",
        activeEffects: [],
      }];
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
        state,
        gameplayDataBundle: bundle,
        rulesRuntimeHash: runtime.descriptor.runtimeHash,
      });
      state.startOfRoundHistory = [{
        round: state.round,
        roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      }];
      cases.push(compiler.compile({
        caseId: `matchup.${direction}.initiative.skillopt-heldout-${variant}`,
        familyId: `matchup.${direction}.skillopt-independent-family-${variant}`,
        split: "heldout",
        state,
        seatKey: ownSeat,
        policyAxes: ["opening_branches"],
        objective: {
          description:
            `本独立留出单步目标要求 ${desiredFirstActor} 先行动；只核对条件策略、Rules 执行与重放。`,
          scope: "declared_single_transition_drill",
          metrics: [{ kind: "active_side_is", sideKey: desiredFirstActor }],
        },
        selectCandidates(legal) {
          return legal.finiteActions
            .filter((candidate) =>
              candidate.action.actionType === "choose_first_actor")
            .map((candidate) => ({
              candidateId: `first-${candidate.action.chosenFirstActorSideKey}`,
              intent:
                `选择 ${candidate.action.chosenFirstActorSideKey} 先行动；不创造额外激活。`,
              proposal: { kind: "finite", actionKey: candidate.actionKey },
            }));
        },
      }));
    }
  }
  partitionStrategyCasesV1(cases);
  return seal({
    schema: "starcraft_tmg_skillopt_independent_heldout_corpus_v1",
    cases,
    sourceBinding: fixture.frozenInput.sourceBinding,
    sourceRefreshPerformed: false,
    caseCount: cases.length,
    appliedAndReplayedBranches: cases.reduce((count, entry) =>
      count + entry.evaluation.outcomes.length, 0),
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
}
