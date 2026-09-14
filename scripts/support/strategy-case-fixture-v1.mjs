import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './official-development-tranche-source-lock-fixture-v1.mjs';
import { getOfficialCurrentProductRecord } from '../../packages/source-data/official-command-center-adapter-v1.mjs';
import { createOfficialGameplayDataBundleV1 } from '../../packages/source-data/official-gameplay-data-bundle-v1.mjs';
import { createOfficialExecutableRuleRuntimeV1 } from '../../packages/rule-atoms/official-executable-rule-runtime-v1.mjs';
import { createOfficialStrategyCaseRuntimeV1 } from '../../packages/rule-atoms/official-strategy-case-runtime-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { verifySeal } from '../../packages/skill-production/common.mjs';

// No fetch or repository-beta data. Geometry is a declared synthetic fixture;
// every printed unit/card/profile value comes from the current frozen lock.
export async function loadStrategyCaseFixtureV1(root, { currentRuntime = false } = {}) {
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
  const frozenInput = verifySeal(JSON.parse(await readFile(path.join(root,
    'build/ticket-18-faction-production-v1/terran_armed_forces-input.json'), 'utf8')));
  if (source.dataset.datasetHash !== frozenInput.sourceBinding.dataset) throw new Error('STRATEGY_FIXTURE_DATASET_DRIFT');
  const report = JSON.parse(await readFile(path.join(root,
    'build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json'), 'utf8'));
  const rulesRuntime = currentRuntime ? createOfficialStrategyCaseRuntimeV1({ catalogue: report.slice.catalogue,
    sourceBinding: frozenInput.sourceBinding, sources: frozenInput.frozenSources.prompt.sources })
    : createOfficialExecutableRuleRuntimeV1({ catalogue: report.slice.catalogue });
  const gameplayDataBundle = createOfficialGameplayDataBundleV1({ ...source,
    unitRecordKeys: ['army_units:marine', 'army_units:medic'], missionRecordKey: 'faction_cards:mission_hold_position',
    cleanupCardRecordKeys: ['tactical_cards:academy', 'tactical_cards:terran_armed_forces'], reserveDeployData: true });
  const record = key => getOfficialCurrentProductRecord(source.dataset, key);
  const marine = record('army_units:marine'), taf = record('tactical_cards:terran_armed_forces');
  function state({ yInches = 5 } = {}) {
    const pieces = ['player1', 'player2'].map((sideKey, i) => {
      const id = `${sideKey}-marine`;
      return { id, name: marine.payload.name, sideKey, officialUnitRecordKey: 'army_units:marine',
        sourceRecordHash: marine.sourceRecordHash, officialPayloadHash: marine.payloadHash,
        currentModels: 1, maxModels: 1, currentSupply: 0, destroyedModelIds: [], isOnField: true,
        isInReserves: false, isDestroyed: false, combatTag: 'ground', combatTags: ['biological', 'ground', 'light'],
        statuses: [], selectedUpgradeNames: i === 0 ? ['Stimpack'] : [], combatEffects: [], assaultEffects: [], damageMarker: 0,
        activatedPhases: { movement: false, assault: false, combat: false },
        models: [{ id: `${id}-model-1`, xInches: i === 0 ? 2 : 25, yInches,
          baseShape: 'round', baseWidthInches: 1.26, baseDepthInches: 1.26, elevation: 'ground',
          supportTerrainIds: [], adjacentAccessPointIds: [], isOnField: true, isDestroyed: false }] };
    });
    const result = { schemaVersion: 'starcraft_tmg_state_v0', round: 2, phase: 'movement', activeSideKey: 'player1',
      firstPlayerSideKey: 'player1', firstPassSideByPhase: {},
      phaseFirstActorByRound: { '2:movement': { round: 2, phase: 'movement', markerHolderSideKey: 'player1', chosenFirstActorSideKey: 'player1' } },
      players: Object.fromEntries(['player1', 'player2'].map(sideKey => [sideKey, { sideKey, faction: 'Terran', passedPhases: {} }])),
      scores: { player1: 0, player2: 0 }, officialGameplayDataBundle: gameplayDataBundle, activeAbilityUseHistory: [],
      board: { widthInches: 54, heightInches: 36, terrain: [], accessPoints: [], tokens: [], effectMarkers: [],
        engagementGeometry: { schemaVersion: 'starcraft_tmg_engagement_geometry_input_v2', modelCoordinatesComplete: true,
          baseFootprintsComplete: true, terrainFootprintsComplete: true, elevationSupportsComplete: true, accessPointAdjacencyComplete: true } },
      cardResources: Object.fromEntries(['player1', 'player2'].map(sideKey => [sideKey, [{ id: `${sideKey}-taf`, sideKey,
        officialCardRecordKey: 'tactical_cards:terran_armed_forces', cardKind: 'faction', sourceRecordHash: taf.sourceRecordHash,
        resource: 1, resourceType: 'CP', readiness: 'ready', face: 'up', activeEffects: [] }]])),
      pieces, gameOver: false, terminal: false, winner: '', terminalReason: '', log: [] };
    result.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state: result, gameplayDataBundle,
      rulesRuntimeHash: rulesRuntime.descriptor.runtimeHash });
    result.startOfRoundHistory = [{ round: 2, roundSupplyStateHash: result.officialRoundSupplyState.roundSupplyStateHash }];
    return result;
  }
  function specification({ caseId = 'movement.near', targetX = 9, yInches = 5, split = 'development', familyId = 'movement-resource-dev' } = {}) {
    return { caseId, familyId, split, state: state({ yInches }), seatKey: 'player1',
      policyAxes: ['movement_position', 'resource_timing'],
      objective: { description: '本练习只比较本次转移后到达指定点及保留CP，不冒充任务计分或整局最优。',
        scope: 'declared_single_transition_drill', metrics: [
          { kind: 'goal_reached', pieceId: 'player1-marine', xInches: targetX, yInches, radiusInches: 0.1 },
          { kind: 'own_ready_cp' },
        ] },
      selectCandidates(legal) {
        return [['ordinary', 'base', 9], ['enhanced-near', 'stimpack', 9], ['enhanced-far', 'stimpack', 12]].map(([candidateId, mode, x]) => {
          const domain = legal.parameterDomains.find(d => d.executorId === `authority.marine-optional-stimpack-move-v${currentRuntime ? 3 : 2}` && d.moveMode === mode);
          if (!domain) throw new Error('STRATEGY_FIXTURE_DOMAIN_UNAVAILABLE');
          return { candidateId, intent: `${mode === 'base' ? '普通移动' : '使用Stimpack移动'}至(${x},${yInches})`,
            proposal: { kind: 'parameterized', domainId: domain.domainId,
              parameters: { leadingModelId: 'player1-marine-model-1', path: [{ xMilliInches: x * 1000, yMilliInches: yInches * 1000 }], placements: [] } } };
        });
      } };
  }
  function initiativeSpecification({ caseId = 'tempo.act-first', firstActor = 'player1', yInches = 5,
    split = 'development', familyId = 'tempo-dev' } = {}) {
    const initial = state({ yInches }); initial.phaseFirstActorByRound = {};
    return { caseId, familyId, split, state: initial, seatKey: 'player1', policyAxes: ['activation_tempo'],
      objective: { description: `本组件练习已给定短计划要求${firstActor}先行动；只验选择与规则执行，不证明该短计划更优。`,
        scope: 'declared_single_transition_drill', metrics: [{ kind: 'active_side_is', sideKey: firstActor }] },
      selectCandidates(legal) {
        return legal.finiteActions.filter(c => c.action.actionType === 'choose_first_actor').map(c => ({
          candidateId: `first-${c.action.chosenFirstActorSideKey}`, intent: `选择${c.action.chosenFirstActorSideKey}先行动`,
          proposal: { kind: 'finite', actionKey: c.actionKey },
        }));
      } };
  }
  return { frozenInput, state, specification, initiativeSpecification, compilerOptions: { rulesRuntime,
    expectedRuntimeHash: rulesRuntime.descriptor.runtimeHash, sourceBinding: frozenInput.sourceBinding,
    sourceSnapshot: source.snapshot, gameplayDataBundle,
    runtimeCoverage: currentRuntime ? { scope: 'current_frozen_data_versioned_strategy_case_runtime',
      faqRouterHash: rulesRuntime.faq.manifest.hash, faqEntriesAvailable: 68, faq46Corrected: true,
      actualMoveFaq03Audit: true, excludedSourceRefs: ['faq-v1:46#complete_force_field_movement', 'unsupported_unit_terrain_action_combinations'],
      productionQualificationEligible: false, fullGameCoverage: false } : { scope: 'frozen_pre_faq_action_runtime_component_test',
      excludedSourceRefs: ['faq-v1:*'], faqKernelsImplemented: true, faqAlreadyInSkillInput: true,
      movementAdapterGap: 'optional_stimpack_v2_pins_40ba7253_dataset_not_current_b2579b83',
      currentFaqRoomIntegrationProvenByThisFixture: false, productionQualificationEligible: false } } };
}
