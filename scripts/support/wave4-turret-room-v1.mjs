import fs from 'node:fs/promises';
import path from 'node:path';
import { compileWave4TurretCombat } from '../compile-wave4-turret-combat.mjs';
import { atomicWrite } from '../lib/development-context.mjs';
import { createOfficialReleaseRosterStateV2 } from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialSpecialUnitPieceV1 } from '../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../../packages/source-data/official-release-context-v2.mjs';
import { createOfficialHumanConfirmedRuntimeV1 } from '../../packages/product-composition/official-human-confirmed-runtime-v1.mjs';
import { createOfficialEngineeringScopedRoundRuntimeV1 } from '../../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { bindOfficialSpawnRoundAbilityLockV1 } from '../../packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 } from '../../packages/rule-atoms/official-movement-clearance-contract-v13.mjs';
import { createOfficialSpecialTerrainAgreementV1 } from '../../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { declareWave3EngineeringCoherencyV1, createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './wave3-room-boundary-fixture-v1.mjs';

export async function loadWave4TurretInputs(root) {
  const inputs = await compileWave4TurretCombat(root);
  for (const [name, value] of Object.entries({ ...inputs.artifacts, 'release-manifest': inputs.context.manifest })) {
    await atomicWrite(path.join(root, inputs.directory, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
  return inputs;
}
const turretId = 'army_units:infested_missile_turret';
const unit = (id, key) => ({ unitInstanceId: id, recordKey: 'army_units:' + key, compositionKind: 'small', upgrades: [] });
export function createWave4TurretScene(inputs, { kind = 'overwatch', round = 2, suppress = false, zeroSupply = false, includeMelee = false, virusCard = 'healing_pathogen', enemyCard = 'armory', extraReactionDefinitionIds = [], includeUniversalCarrier = false, additionalFriendlyUnits = [], friendlyPositionsById = {} } = {}) {
  const infestation = kind === 'infestation';
  const virusDefinitionId = includeUniversalCarrier && virusCard==='healing_pathogen' ? 'card:healing_pathogen/universal-carrier-any@1' : ({hungering_infestation:'card:hungering_infestation/growing-infestation-any@1', weighted_pustule:'card:weighted_pustule/fetid-touch-any@1'})[virusCard];
  const characteristicIds = ['unit:infested_missile_turret/detection-any-phase@1', ...(virusDefinitionId ? [virusDefinitionId] : [])];
  const sourceDefinitionIds = [...inputs.scope.definitionIds, ...(virusDefinitionId ? [virusDefinitionId] : []), ...extraReactionDefinitionIds,
    ...(infestation ? ['unit:medic/restoration-any-phase@1'] : ['unit:raven/railguns-assault-phase@1'])];
  const own = { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey: 'tactical_cards:stukov_s_forces', tacticalCardRecordKeys: ['tactical_cards:' + virusCard],
    units: [unit('actor', zeroSupply ? 'goliath' : 'hydralisk'), ...additionalFriendlyUnits.map(row=>unit(row.id,row.key))] };
  const opponent = { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:' + enemyCard],
    units: infestation ? [unit('fallen', 'marine'), unit('recipient', 'marine'), unit('restorer', 'medic')]
      : [unit('enemy', 'raven')] };
  const detection = 'unit:infested_missile_turret/detection-any-phase@1';
  const built = createOfficialReleaseRosterStateV2({ context: inputs.context,
    candidatesBySide: { player1: own, player2: opponent }, sourceDefinitionIds,
    unitLifecycleDefinitionIds: inputs.lifecycle.definitionIds,
    structureDefinitionIds: ['unit:infested_missile_turret/structure-any-phase@1'],
    characteristicDefinitionIds: characteristicIds, battlefieldModifierDefinitionIds: ['unit:infested_missile_turret/source-of-creep-any-phase@1'],
    reactionDefinitionIds: ['unit:infested_missile_turret/ocular-overwatch-assault-phase@1',
      'unit:infested_missile_turret/infestation-any-phase@1', ...extraReactionDefinitionIds, ...(infestation ? ['unit:medic/restoration-any-phase@1'] : [])],
    canonicalResourceTypes: true, includeAbilitySourcePhases: true, includeCharacteristicConsumers: true,
    includeHiddenRangedAndEvade: true, includeDetectionHiddenLoss: true, includeMelee });
  const state = { ...built.state, round, phase: 'assault', stage: 'activation_phases',
    activeSideKey: infestation ? 'player1' : 'player2', firstPlayerSideKey: 'player1',
    engagementScale: 'Standard', armyBuildingEngagementScale: 'Standard',
    phaseFirstActorByRound: { [round + ':assault']: { round, phase: 'assault', chosenFirstActorSideKey: infestation ? 'player1' : 'player2' } },
    board: structuredClone(inputs.seed.state.board),
    officialMissionRuntimeDescriptor: structuredClone(inputs.seed.state.officialMissionRuntimeDescriptor), log: [] };
  state.supplyLossLedger = createOfficialSupplyLossLedgerV1({ round, rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
  state.officialModelGapTransitPolicy = structuredClone(OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13);
  state.board.terrain = state.board.terrain.slice(0, 1);
  state.board.accessPoints = []; state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  state.board.specialTerrainAgreement = createOfficialSpecialTerrainAgreementV1({ terrainEntries:
    state.board.specialTerrainAgreement.terrainEntries.filter(entry => entry.terrainId === state.board.terrain[0].id) });
  const place = (piece, x, y) => {
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
    const triangle=piece.models.length===3&&additionalFriendlyUnits.some(row=>row.id===piece.id);
    piece.models.forEach((model, i) => Object.assign(model, { isOnField: true,
      xInches: x + (triangle&&i===2?(model.baseWidthInches+0.05)/2:(i%3)*(model.baseWidthInches+0.05)),
      yInches: y + (triangle&&i===2?(model.baseDepthInches+0.05)*Math.sqrt(3)/2:Math.floor(i/3)*(model.baseDepthInches+0.05)), elevation: 'ground_level' }));
  };
  for (const piece of state.pieces) {
    const [x,y] = ({ actor: [10,10], enemy: [22,10], fallen: [20,10], recipient: [20,14], restorer: [24,15], ...friendlyPositionsById })[piece.id];
    place(piece,x,y);
  }
  if (infestation) {
    const fallen = state.pieces.find(piece => piece.id === 'fallen');
    fallen.statuses.push({ statusName: 'INFESTATION', statusKind: 'DEBUFF', conditionalInitialStatus: true });
    const survivingModels = zeroSupply ? 4 : 1;
    for (const model of fallen.models.slice(survivingModels)) Object.assign(model, { isDestroyed: true, isOnField: false });
    fallen.destroyedModelIds = fallen.models.slice(survivingModels).map(model => model.id);
    fallen.currentModels = survivingModels; fallen.currentSupply = zeroSupply ? 1 : 0; fallen.damageMarker = 1;
    Object.assign(fallen.models[0], { damage: 1, remainingWounds: 1 });
  }
  const turret = createOfficialSpecialUnitPieceV1(state, 'player1', turretId, 'turret');
  place(turret, infestation ? 4 : 15, infestation ? 4 : 10);
  turret.specialDeployment = true;
  bindOfficialSpawnRoundAbilityLockV1(turret, inputs.lifecycle.routes[0].spawnRoundAbilityLockPolicy, suppress ? round : Math.max(1,round-1));
  state.pieces.push(turret);
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave4-turret-' + kind });
  return { state, sourceDefinitionIds,
    ...(virusDefinitionId ? { characteristicRuntimeDefinitionIds: characteristicIds } : {}),
    runtimeOptions: { includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includeMelee,
      weaponDefinitionIds: ['unit:infested_missile_turret/firefly-missiles-assault-phase@1'],
      includeReleasePhaseControl: true },
    scenario: { kind: 'turret_combat_component', declaredPositions: true, estimatedRoundBaseMillimetres: 80,
      estimatedRangeMillimetres: { minimum: 60, maximum: 100 }, officialPhysicalAuthority: false,
      priorTurretSetAndLockDeclared: true, conditionalWoundedInfectedUnit: infestation,
      fullRound: false, fullMatchAdmission: false } };
}

export function createWave4LegacyOverwatchControlScene(inputs) {
  const template=createWave4TurretScene(inputs);
  const sourceDefinitionIds=['unit:auto_turret/overwatch-assault-phase@1','unit:auto_turret/gauss-cannon-assault-phase@1',
    'unit:auto_turret/structure-any-phase@1','unit:raven/railguns-assault-phase@1'];
  const candidatesBySide=Object.fromEntries(['player1','player2'].map(sideKey=>[sideKey,{sideKey,scaleId:'Standard',mineralBudget:2000,
    factionRecordKey:'tactical_cards:terran_armed_forces',tacticalCardRecordKeys:['tactical_cards:armory'],
    units:[unit(sideKey==='player1'?'actor':'enemy',sideKey==='player1'?'goliath':'raven')]}]));
  const built=createOfficialReleaseRosterStateV2({context:inputs.context,candidatesBySide,sourceDefinitionIds,
    reactionDefinitionIds:[sourceDefinitionIds[0]],structureDefinitionIds:[sourceDefinitionIds[2]],includeAbilitySourcePhases:true});
  const keys=['round','phase','stage','activeSideKey','firstPlayerSideKey','engagementScale','armyBuildingEngagementScale',
    'phaseFirstActorByRound','board','officialMissionRuntimeDescriptor','supplyLossLedger','officialModelGapTransitPolicy'];
  const state={...Object.fromEntries(keys.map(key=>[key,structuredClone(template.state[key])])),...built.state,
    officialFaqReactionPolicy:structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13),log:[]};
  const turret=createOfficialSpecialUnitPieceV1(state,'player1','army_units:auto_turret','turret');
  state.pieces.push(turret);
  for(const piece of state.pieces) {
    Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id});
    for(const model of piece.models)Object.assign(model,{isOnField:true,xInches:piece.id==='actor'?10:piece.id==='enemy'?22:15,
      yInches:10,elevation:'ground_level'});
  }
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'wave4-legacy-overwatch-control'});
  return{state,sourceDefinitionIds,characteristicRuntimeDefinitionIds:[],runtimeOptions:{includeRanged:true,
    includePrecisionChoices:true,includeArmourChoices:true,weaponDefinitionIds:[sourceDefinitionIds[1]]},
  scenario:{kind:'legacy_auto_turret_current_snapshot_native_control',fullMatchAdmission:false,modelCalls:0}};
}

export async function bindWave4TurretRoom({ inputs, state, sourceDefinitionIds, runtimeOptions, scenario, directory, humanConfirmed = false, roundControl = false, roundDefinitionIds,
  characteristicRuntimeDefinitionIds=['unit:infested_missile_turret/detection-any-phase@1'] }) {
  const sourceRuntimeFor = () => {
    const nativeActions = createOfficialCharacteristicStatusComponentRuntimeV2({ context: inputs.context,
      spatialState: state, definitionIds: characteristicRuntimeDefinitionIds, sourceDefinitionIds, ...runtimeOptions });
    return roundControl ? createOfficialEngineeringScopedRoundRuntimeV1({ context: inputs.context, state, nativeActions,
      definitionIds: roundDefinitionIds || inputs.scope.definitionIds }) : nativeActions;
  };
  const runtimeFor = () => humanConfirmed ? createOfficialHumanConfirmedRuntimeV1(sourceRuntimeFor()) : sourceRuntimeFor();
  const runtime = runtimeFor();
  const m = inputs.context.manifest;
  const manifest = createOfficialReleaseManifestV2({ releaseId: m.releaseId, dataset: inputs.dataset, snapshot: inputs.snapshot,
    sourceRevision: await inputs.read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
    sourceRevisionRef: m.source.sourceRevisionRef, sourcePolicy: m.source.policy, referenceSources: m.source.references,
    components: { ...m.components, rulesRuntime: { ref: 'component-runtime/' + runtime.descriptor.runtimeHash,
      version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
  const context = { ...inputs.context, manifest };
  const authority = createWave3ComponentEngineeringAuthorityV1({ context, state, scenario });
  await fs.mkdir(directory, { recursive: true });
  for (const [name,value] of Object.entries({ authority, runtime: runtime.descriptor, scope: { sourceDefinitionIds, runtimeOptions, scenario, roundControl, ...(roundDefinitionIds ? {roundDefinitionIds} : {}), characteristicRuntimeDefinitionIds } })) {
    await atomicWrite(path.join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
  }
  return { context, authority, runtime, open: (options = {}) => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime: runtimeFor() }), ...options }) };
}
