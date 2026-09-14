import { loadStrategyCaseFixtureV1 } from './strategy-case-fixture-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './official-development-tranche-source-lock-fixture-v1.mjs';
import { getOfficialCurrentProductRecord } from '../../packages/source-data/official-command-center-adapter-v1.mjs';
import { createOfficialGameplayDataBundleV1 } from '../../packages/source-data/official-gameplay-data-bundle-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createStrategyCaseCompilerV1, partitionStrategyCasesV1 } from '../../packages/strategy-skills/strategy-case-compiler-v1.mjs';
import { fail, seal } from '../../packages/skill-production/common.mjs';

// This exercises ONLY the existing faction-independent first-actor executor.
// A real frozen Zerg record replaces the opposing Marine, not just its label.
// A wounded one-model fixture is explicit; legal full-army reachability, combat,
// Zerg movement, strategic desirability and the other four axes are NOT proved.
export async function compileDirectedMatchupInitiativeCasesV1(root) {
  const fixture = await loadStrategyCaseFixtureV1(root, { currentRuntime: true });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
  if (source.dataset.datasetHash !== fixture.frozenInput.sourceBinding.dataset) fail('MATCHUP_CASE_DATA_DRIFT');
  const record = key => getOfficialCurrentProductRecord(source.dataset, key);
  const zergling = record('army_units:zergling'), swarm = record('tactical_cards:zerg_swarm');
  const bundle = createOfficialGameplayDataBundleV1({ ...source,
    unitRecordKeys: ['army_units:marine', 'army_units:medic', 'army_units:zergling'],
    missionRecordKey: 'faction_cards:mission_hold_position',
    // Frozen cleanup adapter supports exactly these two records. This drill
    // never cleans up or activates the observed Zerg card; do not extend Rules.
    cleanupCardRecordKeys: ['tactical_cards:academy', 'tactical_cards:terran_armed_forces'],
    reserveDeployData: true });
  const runtime = fixture.compilerOptions.rulesRuntime;
  const compiler = createStrategyCaseCompilerV1({ ...fixture.compilerOptions, gameplayDataBundle: bundle,
    runtimeCoverage: { scope: 'existing_first_actor_executor_in_declared_terran_zerg_fixture_only',
      excludedSourceRefs: ['zerg_movement_not_exercised', 'zerg_card_cleanup_not_supported_by_this_fixture', 'combat_and_scoring_not_exercised',
        'matchup_strategy_preference_not_proven'], productionQualificationEligible: false,
      fullGameCoverage: false, faqInterpretationReimplemented: false } });
  const cases = [];
  for (const [index, direction] of ['terran_to_zerg', 'zerg_to_terran'].entries()) {
    const ownSeat = index === 0 ? 'player1' : 'player2';
    const otherSeat = index === 0 ? 'player2' : 'player1';
    for (const [splitIndex, split] of ['development', 'heldout'].entries()) {
      const state = fixture.state({ yInches: 9 + index * 2 + splitIndex * 10 });
      state.officialGameplayDataBundle = bundle;
      state.players.player2.faction = 'Zerg';
      state.firstPlayerSideKey = ownSeat; state.activeSideKey = ownSeat; state.phaseFirstActorByRound = {};
      state.pieces[0].selectedUpgradeNames = [];
      const enemy = state.pieces[1];
      Object.assign(enemy, { id: 'player2-zergling', name: zergling.payload.name,
        officialUnitRecordKey: 'army_units:zergling', sourceRecordHash: zergling.sourceRecordHash,
        officialPayloadHash: zergling.payloadHash, selectedUpgradeNames: [],
        combatTags: zergling.payload.tags.split(',').map(tag => tag.trim().toLowerCase()) });
      enemy.models[0].id = 'player2-zergling-model-1';
      state.cardResources.player2 = [{ id: 'player2-zerg-swarm', sideKey: 'player2',
        officialCardRecordKey: 'tactical_cards:zerg_swarm', sourceRecordHash: swarm.sourceRecordHash,
        cardKind: 'faction', resource: swarm.payload.resource, resourceType: 'Biomass', readiness: 'ready',
        face: 'up', activeEffects: [] }];
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state, gameplayDataBundle: bundle,
        rulesRuntimeHash: runtime.descriptor.runtimeHash });
      state.startOfRoundHistory = [{ round: state.round,
        roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash }];
      const desiredFirstActor = splitIndex === 0 ? ownSeat : otherSeat;
      cases.push(compiler.compile({ caseId: 'matchup.' + direction + '.initiative.' + split,
        familyId: 'matchup.' + direction + '.initiative.' + split,
        split, state, seatKey: ownSeat, policyAxes: ['opening_branches'],
        objective: { description: `已明确的单步执行目标是让 ${desiredFirstActor} 先行动；核对持标记者可以选择谁先行动，不证明这一短计划优于相反计划。`,
          scope: 'declared_single_transition_drill', metrics: [{ kind: 'active_side_is', sideKey: desiredFirstActor }] },
        selectCandidates(legal) {
          return legal.finiteActions.filter(c => c.action.actionType === 'choose_first_actor').map(c => ({
            candidateId: 'first-' + c.action.chosenFirstActorSideKey,
            intent: '选择 ' + c.action.chosenFirstActorSideKey + ' 先行动；不是立刻激活单位或额外获得行动。',
            proposal: { kind: 'finite', actionKey: c.actionKey } }));
        } }));
    }
  }
  partitionStrategyCasesV1(cases);
  return seal({ schema: 'directed_matchup_initiative_corpus_v1', cases,
    sourceBinding: fixture.frozenInput.sourceBinding, sourceRefreshPerformed: false,
    actualRulesCaseCount: cases.length, actualAppliedAndReplayedBranches: cases.reduce((n, c) => n + c.evaluation.outcomes.length, 0),
    caseProvenance: 'rules_executed_synthetic_wounded_unit_fixtures_not_recorded_matches',
    exercisedAxes: ['opening_branches'], unexercisedAxes: ['opponent_profile', 'counterplay', 'resource_exchange', 'endgame'],
    completeFactionSkillDependenciesRequiredBeforeProduction: true,
    strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
}
