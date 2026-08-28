#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING,
} from
  "../packages/rule-atoms/official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
} from
  "../packages/rule-atoms/official-marine-multi-model-stimpack-active-executor-v3.mjs";
import {
  enumerateOfficialMarineMultiModelStimpackCloseCombatV2,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
} from
  "../packages/rule-atoms/official-marine-multi-model-stimpack-close-combat-executor-v2.mjs";
import {
  createOfficialMarineMultiModelStimpackCloseCombatRelationshipExtensionV2,
} from
  "../packages/rule-atoms/official-marine-multi-model-stimpack-close-combat-relationship-contract-v2.mjs";
import {
  createOfficialMarineMultiModelStimpackCloseCombatRuleSliceV2,
  verifyOfficialMarineMultiModelStimpackCloseCombatRuleSliceV2,
} from
  "../packages/rule-atoms/official-marine-multi-model-stimpack-close-combat-rule-slice-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  part8:
    `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part8DocumentId}`,
  part9:
    `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part9DocumentId}`,
  part12:
    `${FIRESTORE_ROOT}/rules_sections/${OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part12DocumentId}`,
});
const acceptance = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function documentHash(document) {
  return sha256(`${canonicalStarcraftTmgJson(document)}\n`);
}

async function fetchOfficial(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response.json();
      lastError = new Error(`${kind} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function action(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...result
  } = candidate;
  return result;
}

const previousReport = JSON.parse(await readFile(
  path.join(
    OUTPUT_DIR,
    "official-marine-multi-model-close-combat-denominator-v1-report.json",
  ),
  "utf8",
));
const slice = createOfficialMarineMultiModelStimpackCloseCombatRuleSliceV2({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMarineMultiModelStimpackCloseCombatRuleSliceV2({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash,
  "2d6214ab7962db7d89a96af8ef3fba8484cafa2956e3430b81c0a1a5539b2454");
assert.equal(slice.catalogueHash,
  "89f9cd56e8eaaa416557cd993f467daf332533d7582c66f5452078899dcc7e6b");
assert.equal(audit.runtimeHash,
  "5f0aac1f49280b9c263c8744d74427b967aa81283a5d17b5357320266930b441");
assert.equal(audit.graphHash,
  "2af2fd17b7e444ff49f789897177fb104c62f19a9f2a6c427316f2c81837b4c5");
assert.deepEqual({
  executable: audit.counts.executableRuleAtoms,
  review: audit.counts.reviewRequiredRuleAtoms,
  display: audit.counts.displayOnlyRuleAtoms,
  executors: audit.counts.executors,
  declaredStateContracts: audit.counts.declaredStateContractExecutors,
  stateContractDebt: audit.counts.stateContractMissingExecutors,
}, {
  executable: 421,
  review: 491,
  display: 114,
  executors: 39,
  declaredStateContracts: 5,
  stateContractDebt: 34,
});
acceptance.push("slice46_freezes_two_composition_executors_without_mutating_rule_atoms");

const basePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const driftReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-v2-report.json"),
  "utf8",
));
const firstFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const secondFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: firstFactionApplication.firestorePayload,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1,
});
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({
  snapshot,
  firestorePayloads: {
    ...basePayloads,
    faction_cards: secondFactionApplication.firestorePayload,
  },
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:medic", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
});
assert.equal(snapshot.snapshotHash,
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
assert.equal(dataset.datasetHash,
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b");
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_official_gameplay_bundle_is_bound_without_repository_fallback");

function record(recordKey) {
  return getOfficialCurrentProductRecord(dataset, recordKey);
}

function supplyAt(count) {
  if (count <= 3) return 0;
  if (count <= 6) return 1;
  return 2;
}

function model(id, xInches, yInches, active) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: active,
    isDestroyed: !active,
  };
}

function card(id, sideKey) {
  const source = record("tactical_cards:terran_armed_forces");
  return {
    id,
    sideKey,
    officialCardRecordKey: "tactical_cards:terran_armed_forces",
    cardKind: "faction",
    sourceRecordHash: source.sourceRecordHash,
    resource: 1,
    resourceType: "CP",
    readiness: "ready",
    face: "up",
    activeEffects: [],
  };
}

function marine(input) {
  const source = record("army_units:marine");
  const positions = input.positions || [];
  const models = Array.from({ length: input.maxModels }, (_, index) => {
    const active = index < input.currentModels;
    const position = positions[index] || {
      xInches: input.baseX + (index * 3),
      yInches: input.baseY,
    };
    return model(
      `${input.id}-m${index + 1}`,
      position.xInches,
      position.yInches,
      active,
    );
  });
  return {
    id: input.id,
    name: source.payload.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash: source.sourceRecordHash,
    officialPayloadHash: source.payloadHash,
    currentModels: input.currentModels,
    maxModels: input.maxModels,
    currentSupply: supplyAt(input.currentModels),
    destroyedModelIds: models.filter((entry) => entry.isDestroyed).map((entry) => entry.id),
    isOnField: true,
    isInReserves: false,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: [...(input.selectedUpgradeNames || [])],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models,
  };
}

function movementState(input = {}) {
  const sideKey = input.sideKey || "player1";
  const other = sideKey === "player1" ? "player2" : "player1";
  const maxModels = input.maxModels || 6;
  const currentModels = input.currentModels || maxModels;
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "movement",
    activeSideKey: sideKey,
    firstPlayerSideKey: sideKey,
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "2:movement": {
        round: 2,
        phase: "movement",
        markerHolderSideKey: sideKey,
        chosenFirstActorSideKey: sideKey,
      },
    },
    players: {
      player1: { sideKey: "player1", faction: "Terran", passedPhases: {} },
      player2: { sideKey: "player2", faction: "Terran", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    activeAbilityUseHistory: [],
    board: {
      widthInches: 54,
      heightInches: 36,
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
    },
    cardResources: {
      player1: [card("player1-taf", "player1")],
      player2: [card("player2-taf", "player2")],
    },
    pieces: [
      marine({
        id: `${sideKey}-attacker`,
        sideKey,
        maxModels,
        currentModels,
        baseX: 4,
        baseY: 20,
        selectedUpgradeNames: input.selectedUpgradeNames || [],
      }),
      marine({
        id: `${other}-target`,
        sideKey: other,
        maxModels: 6,
        currentModels: 1,
        baseX: 40,
        baseY: 10,
        selectedUpgradeNames: [],
      }),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function combatState(state, sideKey = state.firstPlayerSideKey) {
  const result = structuredClone(state);
  result.phase = "combat";
  result.activeSideKey = sideKey;
  result.firstPlayerSideKey = sideKey;
  result.firstPassSideByPhase = {};
  result.phaseFirstActorByRound["2:combat"] = {
    round: 2,
    phase: "combat",
    markerHolderSideKey: sideKey,
    chosenFirstActorSideKey: sideKey,
  };
  result.players.player1.passedPhases = {};
  result.players.player2.passedPhases = {};
  const attacker = result.pieces.find((entry) => entry.id === `${sideKey}-attacker`);
  const target = result.pieces.find((entry) => entry.id !== attacker.id);
  const attackerActive = attacker.models.filter((entry) => !entry.isDestroyed);
  attackerActive.forEach((entry, index) => {
    entry.xInches = index === 0 ? 18.74 : index === 1 ? 17.48 : 4 + (index * 3);
    entry.yInches = index < 2 ? 10 : 20;
  });
  const targetActive = target.models.find((entry) => !entry.isDestroyed);
  targetActive.xInches = 20;
  targetActive.yInches = 10;
  attacker.activatedPhases.combat = false;
  target.activatedPhases.combat = false;
  delete result.pendingAction;
  return result;
}

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc");
assert.equal(runtime.descriptor.runtimeHash, audit.runtimeHash);
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
function candidates(state, sideKey = state.activeSideKey) {
  return runtime.enumerate(state, {
    sideKey,
    includeDisabled: false,
    matchBinding,
  }).candidates;
}

function activate(input) {
  const state = movementState(input);
  const use = candidates(state, input.sideKey).find((row) => (
    row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID
      && row.abilityWindow === "before_action"
  ));
  assert.ok(use, JSON.stringify(candidates(state, input.sideKey)));
  const applied = runtime.apply(state, action(use), {
    matchBinding,
    postRevision: 1,
  });
  const piece = applied.state.pieces.find((entry) => entry.id === use.pieceId);
  assert.equal(piece.damageMarker, 2);
  assert.equal(piece.statuses.length, 1);
  assert.equal(applied.state.board.effectMarkers.length, 1);
  assert.equal(applied.state.activeAbilityUseHistory.length, 1);
  return applied.state;
}

const strikeActivated = activate({
  maxModels: 6,
  currentModels: 6,
  selectedUpgradeNames: ["Stimpack"],
  sideKey: "player1",
});
const bayonetActivated = activate({
  maxModels: 9,
  currentModels: 9,
  selectedUpgradeNames: ["Bayonet", "Stimpack"],
  sideKey: "player1",
});
assert.equal(strikeActivated.activeAbilityUseHistory[0].modelLedgerHash.length, 64);
assert.equal(bayonetActivated.activeAbilityUseHistory[0].unitWideLoadoutHash.length, 64);
acceptance.push("multi_model_stimpack_active_binds_full_ledger_and_unit_wide_loadout");

const ordinaryStrikeState = combatState(movementState({
  maxModels: 6,
  currentModels: 6,
  selectedUpgradeNames: [],
  sideKey: "player1",
}));
const ordinaryStrike = candidates(ordinaryStrikeState).find((row) => (
  row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(ordinaryStrike);
assert.equal(ordinaryStrike.weaponName, "Strike");
assert.equal(ordinaryStrike.details.attackDice, 2);
const ordinaryStrikeApplied = runtime.apply(ordinaryStrikeState, action(ordinaryStrike), {
  matchBinding,
  chanceReveals: [6, 2, 1, 1],
});
assert.equal(ordinaryStrikeApplied.events[0].precision.available, false);

const ordinaryBayonetState = combatState(movementState({
  maxModels: 9,
  currentModels: 7,
  selectedUpgradeNames: ["Bayonet"],
  sideKey: "player1",
}));
const ordinaryBayonet = candidates(ordinaryBayonetState).find((row) => (
  row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(ordinaryBayonet);
assert.equal(ordinaryBayonet.weaponName, "Bayonet");
assert.equal(ordinaryBayonet.replacedWeaponName, "Strike");
assert.equal(ordinaryBayonet.details.attackDice, 4);
assert.deepEqual(ordinaryBayonet.selectedUpgradeNames, ["Bayonet"]);
acceptance.push("ordinary_strike_and_unit_wide_bayonet_use_fighting_supporting_rank_pools");

const strikeCombat = combatState(strikeActivated);
const strikeAttack = candidates(strikeCombat).find((row) => (
  row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(strikeAttack);
assert.equal(strikeAttack.details.attackDice, 2);
assert.equal(strikeAttack.details.precisionAvailable, true);

const bayonetCombat = combatState(bayonetActivated);
const bayonetAttack = candidates(bayonetCombat).find((row) => (
  row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(bayonetAttack);
assert.equal(bayonetAttack.details.attackDice, 4);
const opened = runtime.apply(bayonetCombat, action(bayonetAttack), {
  matchBinding,
  chanceReveals: [2, 3, 6, 1, 1, 1, 1, 1],
  postRevision: 2,
});
assert.equal(opened.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA);
const choices = candidates(opened.state);
assert.equal(choices.length, 8);
assert.deepEqual(choices.map((entry) => entry.convertedFailedDieIndices), [
  [], [0], [1], [3], [0, 1], [0, 3], [1, 3], [0, 1, 3],
]);
const maximum = choices.find((entry) => entry.convertedCount === 3);
const resolved = runtime.apply(opened.state, action(maximum), {
  matchBinding,
  postRevision: 3,
});
assert.equal(resolved.attackResolution.stages.hit.originalHits, 1);
assert.equal(resolved.attackResolution.stages.hit.hits, 4);
assert.equal(resolved.state.pieces.find((entry) => entry.sideKey === "player2").isDestroyed,
  true);
acceptance.push("stimpack_strike_bayonet_and_precision_three_complete_choice_domain_execute");

const staleCasualtyState = combatState(bayonetActivated);
const staleCasualtyAction = candidates(staleCasualtyState).find((row) => (
  row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
const staleAttacker = staleCasualtyState.pieces.find((entry) => entry.sideKey === "player1");
const lostSupport = staleAttacker.models.find((entry) => entry.id.endsWith("-m2"));
lostSupport.isDestroyed = true;
lostSupport.isOnField = false;
staleAttacker.currentModels = 8;
staleAttacker.currentSupply = 2;
staleAttacker.destroyedModelIds = staleAttacker.models
  .filter((entry) => entry.isDestroyed)
  .map((entry) => entry.id)
  .sort();
assert.throws(
  () => runtime.apply(staleCasualtyState, action(staleCasualtyAction), {
    matchBinding,
    chanceReveals: [1, 1, 1, 1, 1, 1, 1, 1],
  }),
  /ACTION_STALE|PLAN_STALE/u,
);
const rederived = candidates(staleCasualtyState).find((row) => (
  row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.equal(rederived.details.attackDice, 2);
acceptance.push("casualty_rederives_supply_rank_pool_and_rejects_the_old_action");

const stalePending = structuredClone(opened.state);
const pendingSupport = stalePending.pieces.find((entry) => entry.sideKey === "player1")
  .models.find((entry) => entry.id.endsWith("-m2"));
pendingSupport.xInches = 12;
pendingSupport.yInches = 20;
assert.equal(candidates(stalePending).length, 0);
assert.throws(
  () => runtime.apply(stalePending, action(maximum), { matchBinding }),
  /PENDING_STATE_DRIFT|ACTION_STALE/u,
);
acceptance.push("geometry_rank_drift_invalidates_the_pending_precision_domain");

const mixedCarrier = structuredClone(ordinaryBayonetState);
mixedCarrier.pieces.find((entry) => entry.sideKey === "player1")
  .models[0].combatWeaponName = "Bayonet";
assert.equal(enumerateOfficialMarineMultiModelStimpackCloseCombatV2(mixedCarrier, {
  sideKey: "player1",
  matchBinding,
}).length, 0);
acceptance.push("per_model_mixed_strike_bayonet_material_fails_closed");

const player2Activated = activate({
  maxModels: 6,
  currentModels: 4,
  selectedUpgradeNames: ["Bayonet", "Stimpack"],
  sideKey: "player2",
});
const player2Combat = combatState(player2Activated, "player2");
assert.ok(candidates(player2Combat, "player2").some((row) => (
  row.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
    && row.sideKey === "player2"
)));
acceptance.push("both_player_seats_receive_the_same_multi_model_authority_path");

const relationshipExtension =
  createOfficialMarineMultiModelStimpackCloseCombatRelationshipExtensionV2({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
const relationshipGraph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: relationshipExtension,
});
const relationshipAudit = auditRuleRelationshipGraphV1(relationshipGraph);
assert.equal(relationshipAudit.counts.nodes, 5138);
assert.equal(relationshipAudit.counts.edges, 19927);
assert.equal(relationshipAudit.counts.blockingGaps, 0);
const brokenExtension = structuredClone(relationshipExtension);
brokenExtension.edges = brokenExtension.edges.filter((entry) => (
  entry.provenance !== "official_replacement_source"
));
const brokenGraph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: brokenExtension,
});
const brokenAudit = auditRuleRelationshipGraphV1(brokenGraph);
assert.equal(brokenAudit.valid, false);
assert.ok(brokenAudit.gaps.requiredEdgeGaps.length > 0);
assert.ok(brokenAudit.counts.blockingGaps > 0);
acceptance.push("relationship_gate_blocks_a_missing_source_state_consumer_or_test_path");

const refereeKeys = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-marine-multi-model-referee-v2",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

function authorityEnvelope(engine, roomId, state) {
  return engine.createEnvelope({
    roomId,
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-s46", content: snapshot },
      dataSnapshot: { artifactId: "official-marine-multi-model-s46", content: gameplayDataBundle },
      geometryArtifact: {
        artifactId: "official-marine-multi-model-geometry-s46",
        content: { kind: "geometry-artifact", geometryVersion: "multi_model_rank_v1" },
      },
    },
    state,
  });
}

function credentials(engine, envelope, seatKey, fence) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `${envelope.roomId}-${seatKey}-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority,
    sessionId: `${envelope.roomId}-${seatKey}-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, lease };
}

function previewFor(engine, envelope, creds, predicate) {
  const legal = engine.legalSpace(envelope, { seatAuthority: creds.seatAuthority });
  const finite = legal.finiteActions.find((entry) => predicate(entry.action));
  assert.ok(finite, JSON.stringify(legal));
  const preview = engine.preview({
    envelope,
    seatAuthority: creds.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  return preview.preview;
}

function applyPreview(engine, envelope, creds, preview, idempotencyKey) {
  const confirmation = engine.confirmPreview({
    envelope,
    preview,
    seatAuthority: creds.seatAuthority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview,
    confirmation: confirmation.confirmation,
    seatAuthority: creds.seatAuthority,
    controlLease: creds.lease,
    idempotencyKey,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

const authority = authorityEngine("ticket-11-s46-seal-v1");
const initialEnvelope = authorityEnvelope(
  authority,
  "official-marine-multi-model-room",
  bayonetCombat,
);
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v14" }));
const attackCreds = credentials(authority, initialEnvelope, "player1", 1);
const attackPreview = previewFor(authority, initialEnvelope, attackCreds, (entry) => (
  entry.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
const attackApplied = applyPreview(
  authority,
  initialEnvelope,
  attackCreds,
  attackPreview,
  "s46-authority-attack",
);
assert.equal(attackApplied.envelope.state.pendingAction.schema,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA);
const choiceCreds = credentials(authority, attackApplied.envelope, "player1", 2);
const choicePreview = previewFor(
  authority,
  attackApplied.envelope,
  choiceCreds,
  (entry) => (
    entry.executorId
      === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
      && entry.actionType
        === OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE
      && entry.convertedCount === 0
  ),
);
const choiceApplied = applyPreview(
  authority,
  attackApplied.envelope,
  choiceCreds,
  choicePreview,
  "s46-authority-choice",
);
const journal = [attackApplied.receipt, choiceApplied.receipt];

function registerReplayDependencies(engine, envelope) {
  for (const [kind, content] of [
    ["sourceSnapshot", snapshot],
    ["dataSnapshot", gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: envelope.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", {
      kind: "geometry-artifact",
      geometryVersion: "multi_model_rank_v1",
    }],
    ["actionSchema", {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v14",
    }],
  ]) {
    engine.registerDependency({
      kind,
      artifactId: envelope.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: envelope.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const replayAuthority = authorityEngine("ticket-11-s46-rotated-seal-v2");
registerReplayDependencies(replayAuthority, initialEnvelope);
const replayed = replayAuthority.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, choiceApplied.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal.at(-1).events.push({ type: "forged_multi_model_precision" });
assert.equal(replayAuthority.replay({
  initialEnvelope,
  journal: tamperedJournal,
}).reason, "SIGNATURE_INVALID");
acceptance.push("authority_v14_ed25519_replay_survives_hmac_rotation_and_rejects_tampering");

const liveDocuments = Object.fromEntries(await Promise.all(Object.entries(URLS).map(
  async ([kind, url]) => [kind, await fetchOfficial(url, kind)],
)));
const versions = liveDocuments.versions.fields;
assert.deepEqual({
  unitsVersion: versions.unitsVersion.integerValue,
  cardsVersion: versions.cardsVersion.integerValue,
  rulesVersion: versions.rulesVersion.integerValue,
}, {
  unitsVersion: "71",
  cardsVersion: "69",
  rulesVersion: "48",
});
assert.equal(documentHash(liveDocuments.marine),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.marineDocumentHash);
assert.equal(documentHash(liveDocuments.part8),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part8DocumentHash);
assert.equal(documentHash(liveDocuments.part9),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part9DocumentHash);
assert.equal(documentHash(liveDocuments.part12),
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part12DocumentHash);
acceptance.push("live_official_versions_marine_and_part8_part9_part12_match_the_frozen_binding");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_memory_muzero_or_training_promotion_occurs_in_this_rule_slice");

assert.equal(acceptance.length, 13);
const report = {
  schema:
    "starcraft_tmg_official_marine_multi_model_stimpack_close_combat_verification_v2",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    urls: URLS,
    hashes: Object.fromEntries(Object.entries(liveDocuments).map(([key, document]) => (
      [key, documentHash(document)]
    ))),
    repositoryFallbackUsed: false,
  },
  slice,
  audit,
  runtime: runtime.descriptor,
  relationshipGraph: {
    graphHash: relationshipGraph.graphHash,
    nodeCount: relationshipGraph.nodes.length,
    edgeCount: relationshipGraph.edges.length,
    audit: relationshipAudit,
    negativeGapGate: {
      valid: brokenAudit.valid,
      requiredEdgeGaps: brokenAudit.gaps.requiredEdgeGaps.length,
      requiredPathGaps: brokenAudit.gaps.requiredPathGaps.length,
    },
  },
  authorityFixture: {
    actionSchemaVersion: "hybrid_legal_space_v14",
    journalReceipts: journal.length,
    replayStateHash: replayed.envelope.stateHash,
    bothSeatsChecked: true,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  skillGeneration: false,
  dshUsed: false,
  muzeroTrainingTruth: false,
  rulesTruth:
    "official_current_marine_multi_model_stimpack_close_combat_and_relationship_gate_frozen",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(
    OUTPUT_DIR,
    "official-marine-multi-model-stimpack-close-combat-v2-report.json",
  ),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  acceptancePassed: report.acceptancePassed,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: audit.runtimeHash,
  graphHash: relationshipGraph.graphHash,
  graphNodes: relationshipGraph.nodes.length,
  graphEdges: relationshipGraph.edges.length,
  executableRuleAtoms: audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: audit.counts.displayOnlyRuleAtoms,
  executors: audit.counts.executors,
  stateContracts: audit.counts.declaredStateContractExecutors,
  stateContractDebt: audit.counts.stateContractMissingExecutors,
  actionSchemaVersion: report.authorityFixture.actionSchemaVersion,
  officialVersions:
    OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.dataVersions,
}, null, 2));
