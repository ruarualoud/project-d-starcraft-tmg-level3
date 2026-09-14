import { loadStrategyCaseFixtureV1 } from './strategy-case-fixture-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from './official-development-tranche-source-lock-fixture-v1.mjs';
import { getOfficialCurrentProductRecord }
  from '../../packages/source-data/official-command-center-adapter-v1.mjs';
import { createOfficialGameplayDataBundleV1 }
  from '../../packages/source-data/official-gameplay-data-bundle-v1.mjs';
import { createOfficialRoundSupplyStateV1 }
  from '../../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createStrategyCaseCompilerV1, partitionStrategyCasesV1 }
  from '../../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { fail, seal }
  from '../../packages/skill-production/common.mjs';

const DIRECTIONS = Object.freeze([
  Object.freeze({ id: 'terran_to_daelaam', ownSeat: 'player1',
    opponentFaction: 'Protoss', unitKey: 'army_units:zealot',
    cardKey: 'tactical_cards:daelaam', resourceType: 'CP' }),
  Object.freeze({ id: 'daelaam_to_terran', ownSeat: 'player2',
    opponentFaction: 'Protoss', unitKey: 'army_units:zealot',
    cardKey: 'tactical_cards:daelaam', resourceType: 'CP' }),
  Object.freeze({ id: 'terran_to_kerrigan_s_swarm', ownSeat: 'player1',
    opponentFaction: 'Zerg', unitKey: 'army_units:zergling',
    cardKey: 'tactical_cards:kerrigan_s_swarm', resourceType: 'Biomass' }),
  Object.freeze({ id: 'kerrigan_s_swarm_to_terran', ownSeat: 'player2',
    opponentFaction: 'Zerg', unitKey: 'army_units:zergling',
    cardKey: 'tactical_cards:kerrigan_s_swarm', resourceType: 'Biomass' }),
]);

// These are deliberately narrow Rules-executed cases. They establish that
// every declared direction can select and replay the current first-actor
// transition. They do not assert that the selected short plan is globally
// optimal, nor exercise faction-card abilities, combat or scoring.
export async function compileExtraDirectedMatchupInitiativeCasesV1(root) {
  const fixture = await loadStrategyCaseFixtureV1(root, { currentRuntime: true });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
  if (source.dataset.datasetHash !== fixture.frozenInput.sourceBinding.dataset) {
    fail('EXTRA_MATCHUP_CASE_DATA_DRIFT');
  }
  const record = key => getOfficialCurrentProductRecord(source.dataset, key);
  const bundle = createOfficialGameplayDataBundleV1({ ...source,
    unitRecordKeys: ['army_units:marine', 'army_units:medic',
      'army_units:zealot', 'army_units:zergling'],
    missionRecordKey: 'faction_cards:mission_hold_position',
    // Cleanup remains restricted to the already implemented exact adapters.
    // The added faction cards are observed but never activated or refreshed in
    // this first-actor drill.
    cleanupCardRecordKeys: ['tactical_cards:academy',
      'tactical_cards:terran_armed_forces'],
    reserveDeployData: true,
  });
  const runtime = fixture.compilerOptions.rulesRuntime;
  const compiler = createStrategyCaseCompilerV1({
    ...fixture.compilerOptions,
    gameplayDataBundle: bundle,
    runtimeCoverage: {
      scope: 'existing_first_actor_executor_in_declared_extra_matchup_fixtures_only',
      excludedSourceRefs: [
        'extra_faction_movement_not_exercised',
        'extra_faction_card_activation_and_cleanup_not_exercised',
        'combat_and_scoring_not_exercised',
        'matchup_strategy_preference_not_proven',
      ],
      productionQualificationEligible: false,
      fullGameCoverage: false,
      faqInterpretationReimplemented: false,
    },
  });
  const cases = [];
  for (const [directionIndex, direction] of DIRECTIONS.entries()) {
    const otherSeat = direction.ownSeat === 'player1' ? 'player2' : 'player1';
    const unit = record(direction.unitKey);
    const card = record(direction.cardKey);
    for (const [splitIndex, split] of ['development', 'heldout'].entries()) {
      const state = fixture.state({ yInches: 7 + directionIndex * 4 + splitIndex });
      state.officialGameplayDataBundle = bundle;
      state.players.player2.faction = direction.opponentFaction;
      state.firstPlayerSideKey = direction.ownSeat;
      state.activeSideKey = direction.ownSeat;
      state.phaseFirstActorByRound = {};
      state.pieces[0].selectedUpgradeNames = [];
      const player2Unit = state.pieces[1];
      Object.assign(player2Unit, {
        id: `player2-${unit.payload.id}`,
        name: unit.payload.name,
        officialUnitRecordKey: direction.unitKey,
        sourceRecordHash: unit.sourceRecordHash,
        officialPayloadHash: unit.payloadHash,
        selectedUpgradeNames: [],
        combatTags: String(unit.payload.tags || '').split(',')
          .map(tag => tag.trim().toLowerCase()).filter(Boolean),
      });
      player2Unit.models[0].id = `${player2Unit.id}-model-1`;
      state.cardResources.player2 = [{
        id: `player2-${card.payload.id}`,
        sideKey: 'player2',
        officialCardRecordKey: direction.cardKey,
        sourceRecordHash: card.sourceRecordHash,
        cardKind: 'faction',
        resource: card.payload.resource,
        resourceType: direction.resourceType,
        readiness: 'ready',
        face: 'up',
        activeEffects: [],
      }];
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
        state,
        gameplayDataBundle: bundle,
        rulesRuntimeHash: runtime.descriptor.runtimeHash,
      });
      state.startOfRoundHistory = [{ round: state.round,
        roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash }];
      const desiredFirstActor = splitIndex === 0 ? direction.ownSeat : otherSeat;
      cases.push(compiler.compile({
        caseId: `matchup.${direction.id}.initiative.${split}`,
        familyId: `matchup.${direction.id}.initiative.${split}`,
        split,
        state,
        seatKey: direction.ownSeat,
        policyAxes: ['opening_branches'],
        objective: {
          description: `已明确的单步执行目标是让 ${desiredFirstActor} 先行动；核对持标记者可以选择谁先行动，不证明这一短计划优于相反计划。`,
          scope: 'declared_single_transition_drill',
          metrics: [{ kind: 'active_side_is', sideKey: desiredFirstActor }],
        },
        selectCandidates(legal) {
          return legal.finiteActions
            .filter(candidate => candidate.action.actionType === 'choose_first_actor')
            .map(candidate => ({
              candidateId: `first-${candidate.action.chosenFirstActorSideKey}`,
              intent: `选择 ${candidate.action.chosenFirstActorSideKey} 先行动；不是立刻激活单位或额外获得行动。`,
              proposal: { kind: 'finite', actionKey: candidate.actionKey },
            }));
        },
      }));
    }
  }
  partitionStrategyCasesV1(cases);
  return seal({
    schema: 'extra_directed_matchup_initiative_corpus_v1',
    cases,
    sourceBinding: fixture.frozenInput.sourceBinding,
    sourceRefreshPerformed: false,
    actualRulesCaseCount: cases.length,
    actualAppliedAndReplayedBranches: cases.reduce((count, testCase) =>
      count + testCase.evaluation.outcomes.length, 0),
    caseProvenance: 'rules_executed_synthetic_wounded_unit_fixtures_not_recorded_matches',
    exercisedAxes: ['opening_branches'],
    unexercisedAxes: ['opponent_profile', 'counterplay', 'resource_exchange', 'endgame'],
    completeFactionSkillDependenciesRequiredBeforeProduction: true,
    strategyEffectivenessProven: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
}
