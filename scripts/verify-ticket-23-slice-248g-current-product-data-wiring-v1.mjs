import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createOfficialBattlefieldAssetFamilyAdapterV1,
  isOfficialCurrentProductUnitOnCreepV1,
  resolveOfficialCurrentProductSideCapabilityV1,
} from "../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs";
import { auditOfficialCurrentProductDataWiringV1 } from
  "../packages/product-composition/official-current-product-data-wiring-audit-v1.mjs";
import {
  isOfficialSelectedRosterUnitOnCreepV1,
  resolveOfficialSelectedRosterAbilityModifiersV1,
} from "../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs";
import {
  deriveStarcraftTmgLiveStrategySearchTermsV1,
  projectStarcraftTmgLiveDecisionRoomProjectionV1,
} from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createStarcraftTmgPlayerSpatialObservationV1 } from
  "../packages/online-agent-session/player-spatial-observation-v1.mjs";
import { projectOfficialContextualSupplyValueV1 } from
  "../packages/rule-atoms/official-contextual-supply-projection-v1.mjs";
import { validateOfficialFactionRequiredTacticalCardGroupsV1 } from
  "../packages/product-composition/official-faction-army-building-card-requirements-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KERRIGAN_SWARM = "tactical_cards:kerrigan_s_swarm";
const TERRAN = "tactical_cards:terran_armed_forces";
const ZERG_SWARM = "tactical_cards:zerg_swarm";
const ACCELERATING_CREEP = "tactical_cards:accelerating_creep";

function factionCard(state, sideKey) {
  const cards = state.publicRosterDisclosureBySide?.[sideKey]?.publicCards || [];
  const factions = cards.filter((entry) => entry.cardKind === "faction"
    && entry.faceUp === true && entry.public === true);
  assert.equal(factions.length, 1,
    `${sideKey} must expose exactly one public faction card`);
  return factions[0];
}

function addCreepTumorCoverage(state, piece) {
  piece.isOnField = true;
  piece.isInReserves = false;
  piece.isDestroyed = false;
  const anchor = { x: 10, y: 10 };
  for (const [index, model] of (piece.models || []).entries()) {
    model.isOnField = true;
    model.isDestroyed = false;
    model.xInches = anchor.x + ((index % 6) * 0.6);
    model.yInches = anchor.y + (Math.floor(index / 6) * 0.6);
    model.elevation = "ground";
  }
  const tokenId = "slice248g-creep-tumor";
  state.board.tokens.push({
    tokenId,
    tokenKind: "creep_tumor",
    baseShape: "round",
    baseDiameterInches: 28 / 25.4,
    coordinate: anchor,
    isRemoved: false,
    stayInPlay: true,
  });
  state.officialBattlefieldAssetBindings =
    state.officialBattlefieldAssetBindings || [];
  state.officialBattlefieldAssetBindings.push({
    assetId: tokenId,
    assetKind: "creep_tumor",
    sideKey: piece.sideKey,
    consumed: false,
  });
}

const officialSource = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: ROOT,
});
for (const factionRecordKey of [KERRIGAN_SWARM, ZERG_SWARM]) {
  const requirement = validateOfficialFactionRequiredTacticalCardGroupsV1({
    dataset: officialSource.dataset,
    factionRecordKey,
    selectedTacticalCardRecordKeys: [ACCELERATING_CREEP],
  });
  assert.equal(requirement.groups.length, 1);
  assert.equal(requirement.groups[0].groupName, "Creep");
  assert.equal(requirement.groups[0].selectedCount, 1);
  assert.throws(() => validateOfficialFactionRequiredTacticalCardGroupsV1({
    dataset: officialSource.dataset,
    factionRecordKey,
    selectedTacticalCardRecordKeys: [],
  }), /FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID/u);
}

const fixture = await createTicket20AgentAgentDemoFixtureV1({
  root: ROOT,
  roomId: "ticket23-slice248g-current-product-data-wiring",
  roomProfile: "standard_2000_live",
  attachBot: false,
  autoDrive: false,
  issueHumanRecovery: false,
  botDecisionPort: { async decide() {
    throw new Error("DATA_WIRING_GATE_MUST_NOT_CALL_PROVIDER");
  } },
  player1DecisionPort: { async decide() {
    throw new Error("DATA_WIRING_GATE_MUST_NOT_CALL_PROVIDER");
  } },
});

try {
  const aggregate = await fixture.roomRuntime.roomStore.loadRoom(fixture.roomId);
  const state = structuredClone(aggregate.envelope.state);
  const wiringAudit = auditOfficialCurrentProductDataWiringV1(state);
  assert.equal(wiringAudit.definitionCount, 252);
  assert.equal(wiringAudit.executionBindingCount, 252);
  assert.equal(wiringAudit.runtimeInstanceCount >= wiringAudit.definitionCount, true);
  assert.equal(wiringAudit.selectedPieceData.pieceCount, state.pieces.length);
  assert.equal(wiringAudit.selectedPieceData.missingSupplyProfileCount, 0);
  assert.equal(wiringAudit.selectedPieceData.supplyStateMismatchCount, 0);
  assert.equal(wiringAudit.selectedPieceData.missingCombatProfileCount, 0);
  assert.equal(wiringAudit.publicCardData.sideCount, 2);
  assert.equal(wiringAudit.publicCardData.identityMismatchCount, 0);
  assert.equal(wiringAudit.publicCardData.duplicateCardInstanceIdCount, 0);
  assert.equal(wiringAudit.selectedPieceData.duplicatePieceIdCount, 0);
  assert.equal(wiringAudit.selectedPieceData.duplicateModelIdCount, 0);
  assert.deepEqual(wiringAudit.blockingFindings, []);
  assert.deepEqual(wiringAudit.crossAdapterSemanticGroups.map((entry) => (
    entry.definitionName)), [
    "Adrenal Overload",
    "Commander",
    "Creep Removal",
    "Living Glob of Tissue",
    "Raptor Strain",
    "Squadron",
    "Stimpack",
    "Zerg Creep",
  ]);
  assert.equal(factionCard(state, "player1").recordKey, TERRAN);
  assert.equal(factionCard(state, "player2").recordKey, KERRIGAN_SWARM);
  const player1View = await fixture.roomRuntime.readRoom({
    roomId: fixture.roomId,
    seatToken: fixture.createdRoom.credentials.human.seatToken,
  });
  assert.equal(player1View.ok, true);
  const decisionProjection = projectStarcraftTmgLiveDecisionRoomProjectionV1(
    player1View.projection,
  );
  assert.deepEqual(decisionProjection.state.publicRosterDisclosureBySide
    .player2.publicCards.map((entry) => entry.recordKey), [
    "tactical_cards:kerrigan_s_swarm",
    "tactical_cards:accelerating_creep",
    "tactical_cards:hatchery",
    "tactical_cards:hydralisk_den",
    "tactical_cards:overlord",
    "tactical_cards:spawning_pool__six_pool_",
  ]);
  const retrievalTerms = deriveStarcraftTmgLiveStrategySearchTermsV1({
    roomProjection: decisionProjection,
    spatialObservation: {
      tokens: [{ label: "Creep Tumor", source: { tokenKind: "creep_tumor" } }],
      markers: [],
    },
  });
  assert(retrievalTerms.includes("kerrigan_s_swarm"),
    "public faction identity must reach Skill retrieval");
  assert(retrievalTerms.includes("accelerating_creep"),
    "public tactical-card identity must reach Skill retrieval");
  assert(retrievalTerms.includes("creep_tumor"),
    "public battlefield assets must reach Skill retrieval");

  const player1SkillIds = fixture.routedSkillRefsBySeat.player1.map((entry) => entry.id);
  const player2SkillIds = fixture.routedSkillRefsBySeat.player2.map((entry) => entry.id);
  assert.deepEqual(player1SkillIds, [
    "starcraft-tmg.general-rules-and-strategy",
    "starcraft-tmg.faction.terran_armed_forces",
    "starcraft-tmg.matchup.terran_armed_forces-to-kerrigan_s_swarm",
  ]);
  assert.deepEqual(player2SkillIds, [
    "starcraft-tmg.general-rules-and-strategy",
    "starcraft-tmg.faction.kerrigan_s_swarm",
    "starcraft-tmg.matchup.kerrigan_s_swarm-to-terran_armed_forces",
  ]);

  const swarmling = state.pieces.find((entry) =>
    entry.officialUnitRecordKey === "army_units:swarmling__zergling_");
  assert(swarmling, "standard 2000 fixture must contain Swarmling");
  addCreepTumorCoverage(state, swarmling);
  const observationProjection = structuredClone(player1View.projection);
  observationProjection.state = state;
  const spatialObservation = createStarcraftTmgPlayerSpatialObservationV1({
    roomProjection: observationProjection,
  });
  const observedSwarmling = spatialObservation.units.find((entry) =>
    entry.unitId === swarmling.id);
  assert(observedSwarmling, "selected unit must reach the Agent spatial projection");
  assert.equal(observedSwarmling.currentModels, swarmling.currentModels);
  assert.equal(observedSwarmling.currentSupply, swarmling.currentSupply);
  assert.equal(observedSwarmling.supplyControl.status, "exact_rules_profile");
  assert(spatialObservation.tokens.some((entry) =>
    entry.source?.tokenKind === "creep_tumor"),
  "authoritative battlefield token must reach the Agent spatial projection");
  const actualRetrievalTerms = deriveStarcraftTmgLiveStrategySearchTermsV1({
    roomProjection: decisionProjection,
    spatialObservation,
  });
  assert(actualRetrievalTerms.includes("creep_tumor"),
    "actual spatial token must reach Skill retrieval");
  assert.equal(isOfficialCurrentProductUnitOnCreepV1(state, swarmling), true);
  assert.equal(isOfficialSelectedRosterUnitOnCreepV1(state, swarmling), true,
    "all current Rules consumers must share the same ON CREEP fact");
  const modifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, swarmling,
  );
  assert.equal(modifiers.onCreep, true);
  assert.equal(modifiers.onCreepSpeed, 1);
  assert.equal(modifiers.speedModifier, 1);
  const stayInPlay = resolveOfficialCurrentProductSideCapabilityV1(state, {
    sideKey: "player2",
    capability: "creep_tumor_stay_in_play_and_displacement",
  });
  assert.equal(stayInPlay.enabled, true);
  assert.equal(stayInPlay.sources.length, 1,
    "each selected source card must retain its own capability record");
  assert.equal(stayInPlay.sources[0].recordKey,
    "tactical_cards:accelerating_creep");
  const creepRemoval = resolveOfficialCurrentProductSideCapabilityV1(state, {
    sideKey: "player2",
    capability: "creep_tumor_enemy_action_removal",
  });
  assert.equal(creepRemoval.enabled, true);
  assert.equal(creepRemoval.sources.length, 1);
  assert.equal(creepRemoval.sources[0].recordKey,
    "tactical_cards:accelerating_creep");
  const marine = state.pieces.find((entry) =>
    entry.officialUnitRecordKey === "army_units:marine");
  assert(marine, "standard 2000 fixture must contain Marine");
  marine.isOnField = true;
  marine.isInReserves = false;
  marine.isDestroyed = false;
  marine.models[0].isOnField = true;
  marine.models[0].isDestroyed = false;
  marine.models[0].xInches = 10;
  marine.models[0].yInches = 10;
  const afterEnemyMove = createOfficialBattlefieldAssetFamilyAdapterV1(
    state.officialBattlefieldAssetFamilySourceBundle,
  ).lifecycle(state, {
    eventKind: "action_performed",
    actionType: "move",
    pieceId: marine.id,
  });
  assert.equal(afterEnemyMove.board.tokens.some((entry) =>
    entry.tokenId === "slice248g-creep-tumor"), false,
  "Accelerating Creep removal must reach the battlefield lifecycle consumer");
  const kerrigan = state.pieces.find((entry) =>
    entry.officialUnitRecordKey === "army_units:kerrigan");
  assert(kerrigan, "standard 2000 fixture must contain Kerrigan");
  kerrigan.isOnField = true;
  kerrigan.isInReserves = false;
  kerrigan.isDestroyed = false;
  const commanderBinding = state.officialSelectedRosterAbilitySourceBundle
    .passiveBindings.find((entry) => entry.pieceId === kerrigan.id
      && entry.effectKind === "commander");
  assert(commanderBinding, "Kerrigan Commander binding must be selected");
  const commanderDefinition = state.officialCurrentProductAbilityDenominator
    .definitions.find((entry) => entry.sourceFeatureHash
      === commanderBinding.sourceFeatureHash);
  assert(commanderDefinition, "Commander source binding must resolve to one definition");
  const commanderSupply = projectOfficialContextualSupplyValueV1({
    state,
    pieceId: kerrigan.id,
    context: "mission_marker_control",
  });
  assert.equal(commanderSupply.modifier, 1);
  assert.deepEqual(commanderSupply.applicableDefinitionIds,
    [commanderDefinition.definitionId],
  "Commander effect must preserve its exact source definition through the consumer");

  process.stdout.write(`${JSON.stringify({
    schema: "ticket23_slice248g_current_product_data_wiring_gate_v1",
    fullDefinitionAudit: {
      definitionCount: wiringAudit.definitionCount,
      executionBindingCount: wiringAudit.executionBindingCount,
      runtimeInstanceCount: wiringAudit.runtimeInstanceCount,
      semanticDuplicateGroupCount: wiringAudit.semanticDuplicateGroupCount,
      crossAdapterSemanticGroupCount:
        wiringAudit.crossAdapterSemanticGroups.length,
      selectedPieceData: wiringAudit.selectedPieceData,
      publicCardData: wiringAudit.publicCardData,
    },
    factionRoutes: {
      player1: player1SkillIds,
      player2: player2SkillIds,
    },
    onCreep: true,
    acceleratingCreepSpeedModifier: 1,
    creepTumorStayInPlaySource: stayInPlay.sources[0].recordKey,
    creepTumorRemovalSource: creepRemoval.sources[0].recordKey,
    commanderSupplySourceDefinitionId: commanderDefinition.definitionId,
    opponentPublicCardCount: decisionProjection.state
      .publicRosterDisclosureBySide.player2.publicCards.length,
    retrievalTermsVerified: [
      "kerrigan_s_swarm", "accelerating_creep", "creep_tumor",
    ],
    providerCalls: 0,
    trainingTruth: false,
  }, null, 2)}\n`);
} finally {
  await fixture.player1Runtime.close();
  await fixture.botRuntime.close();
}
