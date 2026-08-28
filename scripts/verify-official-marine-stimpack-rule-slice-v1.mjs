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
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_NEW_ATOM_IDS,
  applyOfficialMarineStimpackActiveV1,
  enumerateOfficialMarineStimpackActiveV1,
} from "../packages/rule-atoms/official-marine-stimpack-active-executor-v1.mjs";
import {
  createOfficialMarineStimpackRuleSliceV1,
  verifyOfficialMarineStimpackRuleSliceV1,
} from "../packages/rule-atoms/official-marine-stimpack-rule-slice-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
} from "../packages/rule-atoms/official-stimpack-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
} from "../packages/rule-atoms/official-stimpack-ranged-consumer-executor-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";

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
  part8: `${FIRESTORE_ROOT}/rules_sections/iuUyObNTQ2M8xK4IUqzC`,
  part10: `${FIRESTORE_ROOT}/rules_sections/H3Fn8YSvEvpJZpT57qw1`,
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
  path.join(OUTPUT_DIR, "official-life-support-damage-reaction-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialMarineStimpackRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMarineStimpackRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 420);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 492);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 6);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual(
  [...slice.newlyExecutableRuleAtomIds].sort(),
  [...OFFICIAL_MARINE_STIMPACK_ACTIVE_NEW_ATOM_IDS].sort(),
);
acceptance.push("catalogue_promotes_exactly_six_stimpack_composition_atoms");

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
acceptance.push("latest_snapshot_dataset_and_exact_gameplay_bundle_are_bound");

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
  part8: "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
  part10: "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
const marineStrings = firestoreStrings(liveDocuments.marine);
const part10Text = firestoreStrings(liveDocuments.part10).join("\n").replace(/<[^>]*>/gu, "");
const part11Text = firestoreStrings(liveDocuments.part11).join("\n").replace(/<[^>]*>/gu, "");
assert.ok(marineStrings.includes("Stimpack"));
assert.ok(marineStrings.includes(
  "This Unit suffers NON-LETHAL DAMAGE (2). This Unit gains BUFF Speed (3). Additionally, its C-14 Rifle and all Close Combat Weapons gain PRECISION (3).",
));
  assert.match(part10Text, /expire at the End of the (?:Current )?Round/iu);
assert.match(part11Text, /NON-LETHAL DAMAGE/iu);
assert.match(part11Text, /PRECISION/iu);
assert.match(part11Text, /failed Attack Dice/iu);
acceptance.push("live_marine_core_rules_and_pdf_sources_match_current_official_hashes");

function record(recordKey) {
  return getOfficialCurrentProductRecord(dataset, recordKey);
}

function model(id, xInches, yInches) {
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

function card(id, sideKey, readiness = "ready") {
  const source = record("tactical_cards:terran_armed_forces");
  return {
    id,
    sideKey,
    officialCardRecordKey: "tactical_cards:terran_armed_forces",
    cardKind: "faction",
    sourceRecordHash: source.sourceRecordHash,
    resource: 1,
    resourceType: "CP",
    readiness,
    face: readiness === "ready" ? "up" : "down",
    activeEffects: [],
  };
}

function marine(input) {
  const source = record("army_units:marine");
  const onField = input.isInReserves !== true;
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
    isOnField: onField,
    isInReserves: !onField,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: [...(input.selectedUpgradeNames || [])],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(`${input.id}-model`, input.xInches, input.yInches)],
  };
}

function battleState(stimpackSide = "player1") {
  const normalSide = stimpackSide === "player1" ? "player2" : "player1";
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "movement",
    activeSideKey: stimpackSide,
    firstPlayerSideKey: stimpackSide,
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "2:movement": {
        round: 2,
        phase: "movement",
        markerHolderSideKey: stimpackSide,
        chosenFirstActorSideKey: stimpackSide,
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
        id: `${stimpackSide}-stimpack-marine`,
        sideKey: stimpackSide,
        xInches: 1,
        yInches: 5,
        selectedUpgradeNames: ["Stimpack"],
      }),
      marine({
        id: `${normalSide}-normal-marine`,
        sideKey: normalSide,
        xInches: 7,
        yInches: 5,
      }),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 420);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 606);
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(
  historicalRuntime.descriptor.runtimeHash,
  "4a7344b351459dabcd05649efdaf8d4f7a69abd76e2cca534c9568e315c09eb5",
);
acceptance.push("runtime_advances_to_420_while_slice39_runtime_stays_exact");

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

let state = battleState("player1");
assert.equal(enumerateOfficialMarineStimpackActiveV1(state, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
}).length, 2);
const activeCandidates = candidates(state).filter((row) => (
  row.executorId === OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID
));
assert.equal(activeCandidates.length, 2);
const beforeAction = activeCandidates.find((row) => row.abilityWindow === "before_action");
const activeApplied = runtime.apply(state, action(beforeAction), {
  matchBinding,
  postRevision: 1,
});
state = activeApplied.state;
const stimpacked = state.pieces.find((row) => row.id === "player1-stimpack-marine");
assert.equal(stimpacked.currentModels, 1);
assert.equal(stimpacked.isDestroyed, false);
assert.equal(stimpacked.damageMarker, 2);
assert.equal(stimpacked.statuses.length, 1);
assert.equal(state.board.effectMarkers.length, 1);
assert.equal(state.cardResources.player1[0].readiness, "exhausted");
assert.equal(activeApplied.events[0].nonLethalDamage.targetDestroyed, false);
acceptance.push("stimpack_pays_one_cp_and_two_non_lethal_damage_never_removes_the_model");

const repeated = structuredClone(state);
repeated.phase = "movement";
repeated.activeSideKey = "player1";
repeated.pieces.find((row) => row.id === stimpacked.id).activatedPhases.movement = false;
assert.equal(candidates(repeated, "player1").some((row) => (
  row.executorId === OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID
)), false);
const staleActive = structuredClone(action(beforeAction));
staleActive.resourceCost = 99;
assert.throws(
  () => applyOfficialMarineStimpackActiveV1(battleState("player1"), staleActive, {
    matchBinding,
  }),
  /STIMPACK_ACTION_STALE/u,
);
const reserve = battleState("player1");
const reserveSource = reserve.pieces.find((row) => row.sideKey === "player1");
reserveSource.isOnField = false;
reserveSource.isInReserves = true;
assert.equal(candidates(reserve).some((row) => (
  row.executorId === OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID
)), false);
acceptance.push("repeat_reserve_and_stale_payment_or_action_material_fail_closed");

const precisionState = structuredClone(state);
precisionState.phase = "assault";
precisionState.activeSideKey = "player1";
precisionState.phaseFirstActorByRound["2:assault"] = {
  round: 2,
  phase: "assault",
  markerHolderSideKey: "player1",
  chosenFirstActorSideKey: "player1",
};
precisionState.players.player1.passedPhases = {};
precisionState.players.player2.passedPhases = {};
for (const piece of precisionState.pieces) piece.activatedPhases.assault = false;
const precisionAttack = candidates(precisionState, "player1").find((row) => (
  row.executorId === OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID
    && row.resolutionMode === "precision_pending_choice"
));
assert.ok(precisionAttack);
const precisionOpened = runtime.apply(precisionState, action(precisionAttack), {
  matchBinding,
  chanceReveals: [2, 1, 6, 4, 4],
  postRevision: 2,
});
assert.equal(precisionOpened.state.pendingAction.hitReveal.maximumConvertedDice, 2);
const choices = candidates(precisionOpened.state, "player1");
assert.equal(choices.length, 4);
assert.ok(choices.every((row) => (
  row.actionType === OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE
    && row.executorId === OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID
)));
assert.deepEqual(choices.map((row) => row.convertedFailedDieIndices), [[], [0], [1], [0, 1]]);
acceptance.push("post_hit_precision_legal_space_contains_every_failed_die_subset_up_to_three");

const maximumChoice = choices.find((row) => row.convertedCount === 2);
const precisionResolved = runtime.apply(
  precisionOpened.state,
  action(maximumChoice),
  { matchBinding, postRevision: 3 },
);
assert.equal(precisionResolved.attackResolution.stages.hit.originalHits, 0);
assert.equal(precisionResolved.attackResolution.stages.hit.hits, 2);
assert.equal(precisionResolved.attackResolution.stages.effects.bypassedArmourHits, 2);
assert.equal(precisionResolved.attackResolution.stages.damage.totalDamage, 2);
assert.equal(
  precisionResolved.state.pieces.find((row) => row.id === "player2-normal-marine").isDestroyed,
  true,
);
assert.equal(precisionResolved.state.pendingAction, undefined);
acceptance.push("declared_precision_conversions_count_as_hits_for_surge_and_then_damage");

const tamperedChoice = structuredClone(action(maximumChoice));
tamperedChoice.convertedFailedDieIndices = [99];
assert.throws(
  () => runtime.apply(precisionOpened.state, tamperedChoice, { matchBinding }),
  /STIMPACK_RANGED_ACTION_STALE/u,
);
assert.equal(candidates(precisionOpened.state, "player2").length, 0);
acceptance.push("precision_choice_hash_tamper_wrong_seat_and_unrelated_action_skip_fail_closed");

const standardState = structuredClone(state);
standardState.phase = "assault";
standardState.activeSideKey = "player2";
standardState.phaseFirstActorByRound["2:assault"] = {
  round: 2,
  phase: "assault",
  markerHolderSideKey: "player1",
  chosenFirstActorSideKey: "player2",
};
standardState.players.player1.passedPhases = {};
standardState.players.player2.passedPhases = {};
for (const piece of standardState.pieces) piece.activatedPhases.assault = false;
const standardAttack = candidates(standardState, "player2").find((row) => (
  row.executorId === OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID
    && row.resolutionMode === "later_standard_damage"
));
assert.ok(standardAttack);
const standardApplied = runtime.apply(standardState, action(standardAttack), {
  matchBinding,
  chanceReveals: [6, 1, 1, 1, 1],
  postRevision: 4,
});
const destroyedStimpack = standardApplied.state.pieces.find((row) => (
  row.id === "player1-stimpack-marine"
));
assert.equal(standardApplied.standardDamageResolution.priorDamageMarker, 2);
assert.equal(standardApplied.standardDamageResolution.incomingStandardDamage, 1);
assert.equal(standardApplied.standardDamageResolution.totalDamage, 3);
assert.equal(standardApplied.standardDamageResolution.targetDestroyed, true);
assert.equal(destroyedStimpack.isDestroyed, true);
acceptance.push("later_positive_standard_damage_combines_non_lethal_marker_and_removes_casualty");

const player2Initial = battleState("player2");
const player2Active = candidates(player2Initial, "player2").find((row) => (
  row.executorId === OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID
    && row.abilityWindow === "after_action"
));
assert.ok(player2Active);
const player2Applied = runtime.apply(player2Initial, action(player2Active), { matchBinding });
assert.equal(
  player2Applied.state.pieces.find((row) => row.sideKey === "player2").damageMarker,
  2,
);
acceptance.push("both_player_seats_receive_the_same_exact_stimpack_rules_path");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-stimpack-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function authorityCredentials(engine, envelope, seatKey, fence) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `stimpack-${seatKey}-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority,
    sessionId: `stimpack-${seatKey}-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, lease };
}

function authorityEnvelope(engine, roomId, authorityState) {
  return engine.createEnvelope({
    roomId,
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot-s40", content: snapshot },
      dataSnapshot: { artifactId: "official-stimpack-gameplay-s40", content: gameplayDataBundle },
      geometryArtifact: {
        artifactId: "official-empty-battlefield-geometry-s40",
        content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
      },
    },
    state: authorityState,
  });
}

function applyAuthorityPreview(engine, envelope, creds, preview, idempotencyKey) {
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

function authorityPreviewFor(engine, envelope, creds, predicate) {
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

const player1Authority = authorityEngine("ticket-11-stimpack-seal-player1-v1");
const player1Envelope = authorityEnvelope(
  player1Authority,
  "official-stimpack-player1-room",
  precisionState,
);
assert.equal(
  player1Envelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v10" }),
);
const player1AttackCreds = authorityCredentials(player1Authority, player1Envelope, "player1", 1);
const player1Attack = authorityPreviewFor(
  player1Authority,
  player1Envelope,
  player1AttackCreds,
  (authorityAction) => (
    authorityAction.executorId === OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID
      && authorityAction.resolutionMode === "precision_pending_choice"
  ),
);
assert.match(player1Attack.finite.action.attackPlanHash, /^[a-f0-9]{64}$/u);
assert.match(player1Attack.finite.action.statusEffectHash, /^[a-f0-9]{64}$/u);
assert.match(player1Attack.finite.action.markerHash, /^[a-f0-9]{64}$/u);
assert.match(player1Attack.finite.action.precisionGrantHash, /^[a-f0-9]{64}$/u);
const player1AttackApplied = applyAuthorityPreview(
  player1Authority,
  player1Envelope,
  player1AttackCreds,
  player1Attack.preview,
  "stimpack-authority-player1-attack",
);
assert.equal(
  player1AttackApplied.envelope.state.pendingAction.schema,
  "starcraft_tmg_official_stimpack_precision_pending_v1",
);
const player1ChoiceCreds = authorityCredentials(
  player1Authority,
  player1AttackApplied.envelope,
  "player1",
  2,
);
const player1Choice = authorityPreviewFor(
  player1Authority,
  player1AttackApplied.envelope,
  player1ChoiceCreds,
  (authorityAction) => (
    authorityAction.executorId === OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID
      && authorityAction.actionType === OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE
      && authorityAction.convertedCount === 0
  ),
);
assert.match(player1Choice.finite.action.pendingHash, /^[a-f0-9]{64}$/u);
assert.match(player1Choice.finite.action.hitRevealHash, /^[a-f0-9]{64}$/u);
assert.match(player1Choice.finite.action.precisionSelectionHash, /^[a-f0-9]{64}$/u);
assert.deepEqual(player1Choice.finite.action.convertedFailedDieIndices, []);
const player1ChoiceApplied = applyAuthorityPreview(
  player1Authority,
  player1AttackApplied.envelope,
  player1ChoiceCreds,
  player1Choice.preview,
  "stimpack-authority-player1-precision",
);
const player1Journal = [player1AttackApplied.receipt, player1ChoiceApplied.receipt];

const player2Authority = authorityEngine("ticket-11-stimpack-seal-player2-v1");
const player2Envelope = authorityEnvelope(
  player2Authority,
  "official-stimpack-player2-room",
  player2Initial,
);
const player2Creds = authorityCredentials(player2Authority, player2Envelope, "player2", 1);
const player2Use = authorityPreviewFor(
  player2Authority,
  player2Envelope,
  player2Creds,
  (authorityAction) => (
    authorityAction.executorId === OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID
      && authorityAction.abilityWindow === "after_action"
  ),
);
const player2AuthorityApplied = applyAuthorityPreview(
  player2Authority,
  player2Envelope,
  player2Creds,
  player2Use.preview,
  "stimpack-authority-player2-active",
);
assert.equal(
  player2AuthorityApplied.envelope.state.pieces.find((row) => row.sideKey === "player2").damageMarker,
  2,
);
acceptance.push("authority_v10_preserves_multistage_precision_fields_and_both_player_seats");

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
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v10" }],
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

const replayAuthority = authorityEngine("ticket-11-stimpack-rotated-seal-v2");
registerReplayDependencies(replayAuthority, player1Envelope);
const player1Replayed = replayAuthority.replay({
  initialEnvelope: player1Envelope,
  journal: player1Journal,
});
assert.equal(player1Replayed.ok, true, JSON.stringify(player1Replayed));
assert.equal(player1Replayed.envelope.stateHash, player1ChoiceApplied.envelope.stateHash);
const tamperedAuthorityJournal = structuredClone(player1Journal);
tamperedAuthorityJournal.at(-1).events.push({ type: "forged_precision_conversion" });
const tamperedAuthorityReplay = replayAuthority.replay({
  initialEnvelope: player1Envelope,
  journal: tamperedAuthorityJournal,
});
assert.equal(tamperedAuthorityReplay.ok, false);
assert.equal(tamperedAuthorityReplay.reason, "SIGNATURE_INVALID");
registerReplayDependencies(replayAuthority, player2Envelope);
const player2Replayed = replayAuthority.replay({
  initialEnvelope: player2Envelope,
  journal: [player2AuthorityApplied.receipt],
});
assert.equal(player2Replayed.ok, true, JSON.stringify(player2Replayed));
assert.equal(player2Replayed.envelope.stateHash, player2AuthorityApplied.envelope.stateHash);
acceptance.push("ed25519_replay_survives_hmac_rotation_for_both_seats_and_rejects_tamper");

const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const lifecycleState = structuredClone(state);
lifecycleState.phase = "cleanup";
lifecycleState.activeSideKey = null;
lifecycleState.firstPlayerSideKey = "player1";
lifecycleState.officialMissionSetupBinding = missionSetupBinding;
lifecycleState.scoringCleanupProgress = {
  schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
  round: 2,
  completedSteps: [
    "determine_mission_marker_control",
    "score_victory_points",
    "check_end_game_conditions",
  ],
  currentStep: "resolve_end_of_round_effects",
  controlResolutionHash: "3".repeat(64),
  scoringResolutionHash: "4".repeat(64),
  endGameResolutionHash: "5".repeat(64),
  trainingTruth: false,
};
const eor = candidates(lifecycleState, "player1").find((row) => (
  row.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID
));
assert.ok(eor);
const eorApplied = runtime.apply(lifecycleState, action(eor), { matchBinding });
assert.equal(
  eorApplied.state.pieces.find((row) => row.id === stimpacked.id).statuses.length,
  1,
);
assert.equal(eorApplied.events[0].damageMarkerRetained, 2);
const cleanup = candidates(eorApplied.state, "player1").find((row) => (
  row.executorId === OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID
));
assert.ok(cleanup);
const cleanupApplied = runtime.apply(eorApplied.state, action(cleanup), { matchBinding });
const cleanedStimpack = cleanupApplied.state.pieces.find((row) => row.id === stimpacked.id);
assert.equal(cleanedStimpack.statuses.length, 0);
assert.equal(cleanedStimpack.damageMarker, 2);
assert.equal(cleanupApplied.state.board.effectMarkers.length, 0);
assert.equal(cleanupApplied.state.cardResources.player1[0].readiness, "ready");
acceptance.push("eor_retains_then_cleanup_removes_stimpack_state_without_healing_non_lethal_damage");

const unknownStatusState = structuredClone(lifecycleState);
unknownStatusState.pieces.find((row) => row.id === stimpacked.id).statuses.push({
  schema: "unknown_future_status_v1",
});
assert.equal(candidates(unknownStatusState, "player1").some((row) => (
  row.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID && row.isEnabled !== false
)), false);
acceptance.push("unknown_status_marker_and_unhandled_reaction_scope_remain_quarantined");

assert.equal(slice.ctx2skill.skillsRead.length, 0);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

assert.equal(acceptance.length, 16);
const report = {
  schema: "starcraft_tmg_official_marine_stimpack_rule_slice_verification_v1",
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
  authorityFixture: {
    actionSchemaVersion: "hybrid_legal_space_v10",
    player1JournalReceipts: player1Journal.length,
    player1ReplayStateHash: player1Replayed.envelope.stateHash,
    player2JournalReceipts: 1,
    player2ReplayStateHash: player2Replayed.envelope.stateHash,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_current_marine_stimpack_composition_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-marine-stimpack-rule-slice-v1-report.json"),
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
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  trainingTruth: report.trainingTruth,
}, null, 2));
