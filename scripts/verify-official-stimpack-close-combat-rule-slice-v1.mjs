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
  createOfficialMarineStimpackKernelV1,
} from "../packages/rule-atoms/official-marine-stimpack-kernel-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
} from "../packages/rule-atoms/official-marine-stimpack-active-executor-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-marine-stimpack-active-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialStimpackCloseCombatRelationshipExtensionV1,
} from "../packages/rule-atoms/official-stimpack-close-combat-relationship-contract-v1.mjs";
import {
  createOfficialStimpackCloseCombatRuleSliceV1,
  verifyOfficialStimpackCloseCombatRuleSliceV1,
} from "../packages/rule-atoms/official-stimpack-close-combat-rule-slice-v1.mjs";
import {
  enumerateOfficialStimpackCloseCombatConsumerV1,
  OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA,
} from "../packages/rule-atoms/official-stimpack-close-combat-consumer-executor-v1.mjs";
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
  part11: `${FIRESTORE_ROOT}/rules_sections/FuahgilWtc8nccVSp2Vv`,
  corePdf: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terranP2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
});
const acceptance = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fetchOfficial(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        return new Response(bytes, {
          status: response.status,
          headers: response.headers,
        });
      }
      lastError = new Error(`${kind} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

function documentHash(document) {
  return sha256(`${canonicalStarcraftTmgJson(document)}\n`);
}

function firestoreStrings(value) {
  if (!value || typeof value !== "object") return [];
  const own = typeof value.stringValue === "string" ? [value.stringValue] : [];
  return [...own, ...Object.values(value).flatMap((child) => firestoreStrings(child))];
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
  path.join(OUTPUT_DIR, "official-rule-relationship-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialStimpackCloseCombatRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialStimpackCloseCombatRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 421);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 491);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 0);
assert.equal(audit.counts.changedAtoms, 0);
assert.equal(audit.counts.relationshipBlockingGaps, 0);
assert.equal(audit.counts.stateContractMissingExecutors, 34);
acceptance.push("composition_closes_existing_atoms_without_mutating_the_frozen_denominator");

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
  cleanupCardRecordKeys: ["tactical_cards:academy", "tactical_cards:terran_armed_forces"],
});
assert.equal(snapshot.snapshotHash,
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
assert.equal(dataset.datasetHash,
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b");
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_official_71_69_48_gameplay_bundle_is_bound_without_repository_fallback");

const liveResponses = await Promise.all(Object.entries(URLS).map(async ([key, url]) => (
  [key, await fetchOfficial(url, key)]
)));
const liveDocuments = {};
const liveHashes = {};
for (const [key, response] of liveResponses) {
  if (["corePdf", "terranP2p"].includes(key)) {
    liveHashes[key] = sha256(Buffer.from(await response.arrayBuffer()));
  } else {
    liveDocuments[key] = await response.json();
    liveHashes[key] = documentHash(liveDocuments[key]);
  }
}
assert.deepEqual(liveHashes, {
  versions: "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
  marine: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
const marineStrings = firestoreStrings(liveDocuments.marine);
const part11Text = firestoreStrings(liveDocuments.part11).join("\n").replace(/<[^>]*>/gu, "");
assert.ok(marineStrings.includes("Strike"));
assert.ok(marineStrings.includes("Bayonet"));
assert.ok(marineStrings.includes(
  "This Unit suffers NON-LETHAL DAMAGE (2). This Unit gains BUFF Speed (3). Additionally, its C-14 Rifle and all Close Combat Weapons gain PRECISION (3).",
));
assert.match(part11Text, /PRECISION/iu);
assert.match(part11Text, /failed Attack Dice/iu);
acceptance.push("live_marine_strike_bayonet_stimpack_precision_and_core_semantics_match");

function record(recordKey) {
  return getOfficialCurrentProductRecord(dataset, recordKey);
}

function model(id, xInches, yInches = 5) {
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
    isOnField: true,
    isDestroyed: false,
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
  return {
    id: input.id,
    name: source.payload.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash: source.sourceRecordHash,
    officialPayloadHash: source.payloadHash,
    currentModels: 1,
    maxModels: 1,
    currentSupply: 0,
    destroyedModelIds: [],
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
    models: [model(`${input.id}-model`, input.xInches)],
  };
}

function movementState(selectedUpgradeNames, sideKey = "player1") {
  const other = sideKey === "player1" ? "player2" : "player1";
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
      player1: [card("p1-taf", "player1")],
      player2: [card("p2-taf", "player2")],
    },
    pieces: [
      marine({
        id: `${sideKey}-attacker`,
        sideKey,
        xInches: 1,
        selectedUpgradeNames,
      }),
      marine({ id: `${other}-target`, sideKey: other, xInches: 7 }),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c");
assert.equal(runtime.descriptor.runtimeHash,
  "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc");
assert.equal(runtime.descriptor.executableRuleAtomCount, 421);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 605);
acceptance.push("slice43_runtime_is_frozen_and_slice44_adds_only_explicit_versioned_composition");

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

function activate(selectedUpgradeNames, expectedExecutorId, sideKey = "player1") {
  const state = movementState(selectedUpgradeNames, sideKey);
  const use = candidates(state, sideKey).find((row) => (
    row.executorId === expectedExecutorId && row.abilityWindow === "before_action"
  ));
  assert.ok(use, JSON.stringify(candidates(state, sideKey)));
  const applied = runtime.apply(state, action(use), { matchBinding, postRevision: 1 });
  const piece = applied.state.pieces.find((entry) => entry.id === `${sideKey}-attacker`);
  assert.deepEqual(piece.selectedUpgradeNames, selectedUpgradeNames);
  assert.equal(piece.damageMarker, 2);
  assert.equal(piece.statuses.length, 1);
  assert.equal(applied.state.board.effectMarkers.length, 1);
  return applied.state;
}

const strikeActivated = activate(["Stimpack"], OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID);
const bayonetActivated = activate(
  ["Bayonet", "Stimpack"],
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
);
acceptance.push("stimpack_active_v2_preserves_bayonet_and_makes_the_replacement_path_reachable");

function combatState(state, sideKey = "player1") {
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
  attacker.models[0].xInches = 10;
  target.models[0].xInches = 11.26;
  attacker.activatedPhases.combat = false;
  target.activatedPhases.combat = false;
  delete result.pendingAction;
  return result;
}

const strikeState = combatState(strikeActivated);
const strikeAttack = candidates(strikeState).find((row) => (
  row.executorId === OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(strikeAttack);
assert.equal(strikeAttack.weaponName, "Strike");
assert.equal(strikeAttack.chance.count, 2);
const strikeOpened = runtime.apply(strikeState, action(strikeAttack), {
  matchBinding,
  chanceReveals: [2, 1],
  postRevision: 2,
});
assert.equal(strikeOpened.state.pendingAction.schema,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA);
const strikeChoices = candidates(strikeOpened.state);
assert.deepEqual(strikeChoices.map((row) => row.convertedFailedDieIndices), [[], [0]]);
const strikeMaximum = strikeChoices.find((row) => row.convertedCount === 1);
const strikeResolved = runtime.apply(strikeOpened.state, action(strikeMaximum), {
  matchBinding,
  postRevision: 3,
});
assert.equal(strikeResolved.attackResolution.stages.hit.originalHits, 0);
assert.equal(strikeResolved.attackResolution.stages.hit.hits, 1);
assert.equal(strikeResolved.attackResolution.stages.damage.totalDamage, 1);
assert.equal(strikeResolved.state.pieces.find((entry) => entry.sideKey === "player2").damageMarker, 1);
acceptance.push("strike_roa_one_exposes_and_resolves_the_exact_post_hit_precision_domain");

const bayonetState = combatState(bayonetActivated);
const bayonetAttack = candidates(bayonetState).find((row) => (
  row.executorId === OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(bayonetAttack);
assert.equal(bayonetAttack.weaponName, "Bayonet");
assert.equal(bayonetAttack.replacedWeaponName, "Strike");
assert.equal(bayonetAttack.chance.count, 4);
const bayonetOpened = runtime.apply(bayonetState, action(bayonetAttack), {
  matchBinding,
  chanceReveals: [2, 3, 1, 1],
  postRevision: 2,
});
const bayonetChoices = candidates(bayonetOpened.state);
assert.deepEqual(
  bayonetChoices.map((row) => row.convertedFailedDieIndices),
  [[], [0], [1], [0, 1]],
);
const bayonetMaximum = bayonetChoices.find((row) => row.convertedCount === 2);
const bayonetResolved = runtime.apply(bayonetOpened.state, action(bayonetMaximum), {
  matchBinding,
  postRevision: 3,
});
assert.equal(bayonetResolved.attackResolution.stages.hit.originalHits, 0);
assert.equal(bayonetResolved.attackResolution.stages.hit.hits, 2);
assert.equal(bayonetResolved.attackResolution.stages.damage.totalDamage, 2);
assert.equal(
  bayonetResolved.state.pieces.find((entry) => entry.sideKey === "player2").isDestroyed,
  true,
);
acceptance.push("bayonet_replaces_strike_and_roa_two_exposes_every_failed_die_subset");

const ordinaryState = movementState([], "player1");
const ordinaryCombat = combatState(ordinaryState);
const ordinaryAttack = candidates(ordinaryCombat).find((row) => (
  row.executorId === OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(ordinaryAttack);
assert.equal(ordinaryAttack.resolutionMode, "ordinary_no_precision");
assert.equal(ordinaryAttack.statusEffectHash, null);
assert.equal(ordinaryAttack.precisionGrantHash, null);
const ordinaryApplied = runtime.apply(ordinaryCombat, action(ordinaryAttack), {
  matchBinding,
  chanceReveals: [6, 1],
});
assert.equal(ordinaryApplied.events[0].precision.available, false);
assert.equal(ordinaryApplied.state.pendingAction, undefined);
acceptance.push("ordinary_close_combat_resolves_in_the_same_current_bundle_without_precision");

const cleanupKernel = createOfficialMarineStimpackKernelV1();
const cleanedPending = structuredClone(bayonetOpened.state);
const attackerBeforeCleanup = cleanedPending.pieces.find((entry) => entry.sideKey === "player1");
const cleanup = cleanupKernel.removeAtCleanup({
  statuses: attackerBeforeCleanup.statuses,
  markers: cleanedPending.board.effectMarkers,
});
attackerBeforeCleanup.statuses = cleanup.statuses;
cleanedPending.board.effectMarkers = cleanup.markers;
assert.equal(candidates(cleanedPending).length, 0);
assert.throws(
  () => runtime.apply(cleanedPending, action(bayonetMaximum), { matchBinding }),
  /STIMPACK_CLOSE_COMBAT_EXACT_STATUS_REQUIRED|STIMPACK_CLOSE_COMBAT_PENDING_STATE_DRIFT|STIMPACK_CLOSE_COMBAT_ACTION_STALE/u,
);
acceptance.push("cleanup_status_and_marker_removal_invalidates_the_old_precision_choice_domain");

const unknownWeapon = structuredClone(bayonetState);
unknownWeapon.pieces.find((entry) => entry.sideKey === "player1")
  .selectedUpgradeNames = ["Unknown Blade", "Stimpack"];
assert.equal(enumerateOfficialStimpackCloseCombatConsumerV1(unknownWeapon, {
  sideKey: "player1",
  matchBinding,
}).length, 0);
const unknownStatus = structuredClone(bayonetState);
unknownStatus.pieces.find((entry) => entry.sideKey === "player1").statuses[0].precision = 99;
assert.equal(enumerateOfficialStimpackCloseCombatConsumerV1(unknownStatus, {
  sideKey: "player1",
  matchBinding,
}).length, 0);
const unknownHistory = movementState(["Bayonet", "Stimpack"]);
unknownHistory.activeAbilityUseHistory = {};
assert.equal(candidates(unknownHistory).some((row) => (
  row.executorId === OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID
)), false);
acceptance.push("unknown_weapon_status_and_history_material_all_fail_closed");

const player2Activated = activate(
  ["Bayonet", "Stimpack"],
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
  "player2",
);
const player2Combat = combatState(player2Activated, "player2");
const player2Attack = candidates(player2Combat, "player2").find((row) => (
  row.executorId === OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
));
assert.ok(player2Attack);
assert.equal(player2Attack.sideKey, "player2");
acceptance.push("both_player_seats_receive_the_same_stimpack_bayonet_close_combat_path");

const relationshipGraph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: createOfficialStimpackCloseCombatRelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  }),
});
const relationshipAudit = auditRuleRelationshipGraphV1(relationshipGraph);
assert.equal(relationshipAudit.counts.nodes, 5087);
assert.equal(relationshipAudit.counts.edges, 19667);
assert.equal(relationshipAudit.counts.executors, 37);
assert.equal(relationshipAudit.counts.declaredStateContractExecutors, 3);
assert.equal(relationshipAudit.counts.stateContractMissingExecutors, 34);
assert.equal(relationshipAudit.counts.blockingGaps, 0);
const impact = queryRuleRelationshipImpactV1(relationshipGraph, {
  startNodeId: "official_characteristic:Marine.Stimpack.closeCombatPrecision3",
  targetNodeIds: [
    "derived_value:stimpack.closeCombatPrecisionResolution",
    "judge_test:stimpack-bayonet-precision-domain",
    "judge_test:cleanup-invalidates-close-combat-precision-domain",
  ],
  relationships: ["derives", "parameterized_by", "verified_by"],
  maxDepth: 8,
});
assert.deepEqual(impact.reachedNodeIds, [
  "derived_value:stimpack.closeCombatPrecisionResolution",
  "judge_test:cleanup-invalidates-close-combat-precision-domain",
  "judge_test:stimpack-bayonet-precision-domain",
]);
acceptance.push("relationship_graph_connects_source_status_weapon_domain_resolution_tests_and_debt");

const refereeKeys = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-stimpack-close-combat-referee-v1",
      ...refereeKeys,
      hmacSecret,
    },
  });
}

function authorityEnvelope(engine, roomId, authorityState) {
  return engine.createEnvelope({
    roomId,
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot-s44", content: snapshot },
      dataSnapshot: { artifactId: "official-stimpack-close-combat-s44", content: gameplayDataBundle },
      geometryArtifact: {
        artifactId: "official-empty-engagement-geometry-s44",
        content: { kind: "geometry-artifact", geometryVersion: "empty_engagement_v1" },
      },
    },
    state: authorityState,
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
  return { legal, finite, preview };
}

function applyPreview(engine, envelope, creds, preview, idempotencyKey) {
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: creds.seatAuthority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: creds.seatAuthority,
    controlLease: creds.lease,
    idempotencyKey,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

const authority = authorityEngine("ticket-11-s44-seal-v1");
const initialEnvelope = authorityEnvelope(
  authority,
  "official-stimpack-close-combat-room",
  bayonetState,
);
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v13" }));
const attackCreds = credentials(authority, initialEnvelope, "player1", 1);
const attackPreview = previewFor(authority, initialEnvelope, attackCreds, (entry) => (
  entry.executorId === OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
    && entry.resolutionMode === "precision_pending_choice"
));
const attackApplied = applyPreview(
  authority,
  initialEnvelope,
  attackCreds,
  attackPreview.preview,
  "s44-authority-attack",
);
assert.equal(attackApplied.envelope.state.pendingAction.schema,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA);
const choiceCreds = credentials(authority, attackApplied.envelope, "player1", 2);
const choicePreview = previewFor(authority, attackApplied.envelope, choiceCreds, (entry) => (
  entry.executorId === OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
    && entry.actionType === OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE
    && entry.convertedCount === 0
));
const choiceApplied = applyPreview(
  authority,
  attackApplied.envelope,
  choiceCreds,
  choicePreview.preview,
  "s44-authority-choice",
);
const journal = [attackApplied.receipt, choiceApplied.receipt];
acceptance.push("authority_v13_exposes_preview_confirm_and_exact_post_hit_choice_for_the_ui_harness");

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
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "empty_engagement_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v13" }],
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

const replayAuthority = authorityEngine("ticket-11-s44-rotated-seal-v2");
registerReplayDependencies(replayAuthority, initialEnvelope);
const replayed = replayAuthority.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, choiceApplied.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal.at(-1).events.push({ type: "forged_close_combat_precision" });
const tamperedReplay = replayAuthority.replay({
  initialEnvelope,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tampered_precision_history");

assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.equal(slice.harness.harnessLoopUsed, true);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs_in_the_rule_slice");

assert.equal(acceptance.length, 15);
const report = {
  schema: "starcraft_tmg_official_stimpack_close_combat_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    urls: URLS,
    hashes: liveHashes,
    updateTimes: Object.fromEntries(Object.entries(liveDocuments).map(([key, document]) => (
      [key, document.updateTime]
    ))),
    repositoryFallbackUsed: false,
  },
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  relationshipGraph: {
    graphHash: relationshipGraph.graphHash,
    nodeCount: relationshipGraph.nodes.length,
    edgeCount: relationshipGraph.edges.length,
    audit: relationshipAudit,
    sourceImpactQuery: impact,
  },
  authorityFixture: {
    actionSchemaVersion: "hybrid_legal_space_v13",
    journalReceipts: journal.length,
    replayStateHash: replayed.envelope.stateHash,
    bothSeatsChecked: true,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth:
    "official_current_stimpack_close_combat_precision_composition_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-stimpack-close-combat-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  graphHash: report.relationshipGraph.graphHash,
  graphNodes: report.relationshipGraph.nodeCount,
  graphEdges: report.relationshipGraph.edgeCount,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  trainingTruth: report.trainingTruth,
}, null, 2));
