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
import {
  applyOfficialAcademyMedicAbilityV1,
  enumerateOfficialAcademyMedicAbilityV1,
  OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_TEXT_HASH_V1,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
  OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
  OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
  OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-academy-medic-ability-executor-v1.mjs";
import {
  createOfficialAcademyOpticalFlareRuleSliceV1,
  verifyOfficialAcademyOpticalFlareRuleSliceV1,
} from "../packages/rule-atoms/official-academy-optical-flare-rule-slice-v1.mjs";
import { createOfficialCharacteristicStatusKernelV1 } from
  "../packages/rule-atoms/official-characteristic-status-kernel-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  applyOfficialCleanupRefreshV3,
  applyOfficialEndOfRoundEffectsV3,
  enumerateOfficialCleanupRefreshActionsV3,
  enumerateOfficialEndOfRoundEffectsActionsV3,
  OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
} from "../packages/rule-atoms/official-optical-flare-lifecycle-executors-v1.mjs";
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
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  medic: `${FIRESTORE_ROOT}/army_units/medic`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  academy: `${FIRESTORE_ROOT}/tactical_cards/academy`,
  terranArmedForces: `${FIRESTORE_ROOT}/tactical_cards/terran_armed_forces`,
  part5: `${FIRESTORE_ROOT}/rules_sections/u3zNStKpd5XegMjmJfMS`,
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
  path.join(OUTPUT_DIR, "official-medic-medpack-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialAcademyOpticalFlareRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialAcademyOpticalFlareRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 403);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 509);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 9);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_exactly_nine_atoms_without_non_target_mutation");

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
  medic: "35e272e5aa48b372d982991fe6f182a355d9caa90cc3f4630b34320429465e35",
  marine: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  academy: "0a1a205eabe0a9b2989fd879365096e295c31ef3e0f4983018b4249cd00d1695",
  terranArmedForces: "832aabd98a5ebad69458c9fd111f0d1fea469634a16cffdcd6ac3d3e86438daa",
  part5: "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
  part10: "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
const academyStrings = firestoreStrings(liveDocuments.academy);
const medicStrings = firestoreStrings(liveDocuments.medic);
assert.ok(academyStrings.some((value) => value.includes("reduced by 1 (to a minimum of 0)")));
assert.ok(academyStrings.some((value) => value.includes("Do not Exhaust this card")));
assert.ok(medicStrings.some((value) => value.includes("apply DEBUFF Range (4)")));
assert.ok(medicStrings.some((value) => value.includes("cannot benefit from LONG RANGE")));
acceptance.push("live_official_firestore_rules_and_pdf_hashes_match_exact_source_text");

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

function record(recordKey) {
  return getOfficialCurrentProductRecord(dataset, recordKey);
}

function card(id, sideKey, recordKey, readiness = "ready") {
  const source = record(recordKey);
  return {
    id,
    sideKey,
    officialCardRecordKey: recordKey,
    cardKind: recordKey === "tactical_cards:academy" ? "tactical" : "faction",
    sourceRecordHash: source.sourceRecordHash,
    resource: 1,
    resourceType: "CP",
    readiness,
    face: readiness === "ready" ? "up" : "down",
    activeEffects: [],
  };
}

function unit(input) {
  const source = record(input.recordKey);
  return {
    id: input.id,
    name: source.payload.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: source.sourceRecordHash,
    officialPayloadHash: source.payloadHash,
    currentModels: input.models.length,
    maxModels: input.maxModels,
    currentSupply: input.recordKey === "army_units:medic" ? 1 : 0,
    destroyedModelIds: Array.from(
      { length: input.maxModels - input.models.length },
      (_value, index) => `${input.id}-destroyed-${index + 1}`,
    ),
    isOnField: true,
    isInReserves: false,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: input.recordKey === "army_units:medic"
      ? ["Medpack", "Optical Flare"]
      : [],
    damageMarker: Number(input.damageMarker || 0),
    activatedPhases: { movement: false, assault: false, combat: false },
    models: input.models,
  };
}

function battleState(overrides = {}) {
  const enemyX = Number(overrides.enemyX ?? 10);
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "2:movement": {
        round: 2,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
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
    },
    cardResources: {
      player1: [
        card("p1-academy", "player1", "tactical_cards:academy"),
        card("p1-taf", "player1", "tactical_cards:terran_armed_forces"),
      ],
      player2: [],
    },
    pieces: [
      unit({
        id: "p1-medic",
        sideKey: "player1",
        recordKey: "army_units:medic",
        maxModels: 3,
        models: [model("medic-1", 0, 0), model("medic-2", 2, 0), model("medic-3", 12, 0)],
      }),
      unit({
        id: "p1-marine",
        sideKey: "player1",
        recordKey: "army_units:marine",
        maxModels: 6,
        damageMarker: 1,
        models: [model("friendly-1", 5.26, 0), model("friendly-2", 5.26, 2)],
      }),
      unit({
        id: "p2-marine",
        sideKey: "player2",
        recordKey: "army_units:marine",
        maxModels: 6,
        models: [model("enemy-1", enemyX, 0)],
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
assert.equal(runtime.descriptor.executableRuleAtomCount, 403);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 623);
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};

function candidates(state, sideKey = "player1") {
  return runtime.enumerate(state, {
    sideKey,
    includeDisabled: false,
    matchBinding,
  }).candidates;
}

function step(state, predicate) {
  const candidate = candidates(state).find(predicate);
  assert.ok(candidate, `candidate missing: ${JSON.stringify(candidates(state))}`);
  return runtime.apply(state, action(candidate), { matchBinding, postRevision: 1 });
}

enumerateOfficialAcademyMedicAbilityV1(battleState(), {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
const declarations = candidates(battleState()).filter((candidate) => (
  candidate.executorId === OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID
));
assert.equal(declarations.length, 4);
assert.deepEqual([...new Set(declarations.map((row) => row.abilityId))], ["medpack", "optical_flare"]);
assert.ok(declarations.every((row) => row.reactionCardId === "p1-academy"));
assert.ok(declarations.every((row) => row.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE));
acceptance.push("legal_space_exposes_exact_medpack_and_optical_flare_reaction_declarations");

let medpackState = battleState();
medpackState = step(medpackState, (row) => (
  row.abilityId === "medpack" && row.abilityWindow === "before_action"
)).state;
assert.equal(medpackState.pendingAbility.stage, "reaction_open");
const medpackUse = candidates(medpackState).find((row) => (
  row.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE
));
assert.ok(medpackUse);
medpackState = runtime.apply(medpackState, action(medpackUse), { matchBinding }).state;
assert.equal(medpackState.pendingAbility.originalResourceCost, 1);
assert.equal(medpackState.pendingAbility.modifiedResourceCost, 0);
assert.equal(medpackState.cardResources.player1[0].readiness, "ready");
const medpackResolve = candidates(medpackState).find((row) => (
  row.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE
));
assert.deepEqual(medpackResolve.cardResourceIds, []);
const medpackApplied = runtime.apply(medpackState, action(medpackResolve), { matchBinding });
assert.equal(medpackApplied.state.pieces.find((row) => row.id === "p1-marine").damageMarker, 0);
assert.ok(medpackApplied.state.cardResources.player1.every((row) => row.readiness === "ready"));
assert.equal(medpackApplied.events[0].resourcePayment.zeroCostRequiresNoResource, true);
acceptance.push("academy_reduces_medpack_one_to_zero_without_exhausting_or_paying_a_card");

let flareState = battleState();
flareState = step(flareState, (row) => (
  row.abilityId === "optical_flare" && row.abilityWindow === "before_action"
)).state;
flareState = step(flareState, (row) => (
  row.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE
)).state;
assert.equal(flareState.pendingAbility.originalResourceCost, 2);
assert.equal(flareState.pendingAbility.modifiedResourceCost, 1);
const flarePaymentCandidates = candidates(flareState).filter((row) => (
  row.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE
));
assert.deepEqual(flarePaymentCandidates.map((row) => row.cardResourceIds), [
  ["p1-academy"],
  ["p1-taf"],
]);
const flareResolve = flarePaymentCandidates.find((row) => (
  row.cardResourceIds.includes("p1-academy")
));
const flareApplied = runtime.apply(flareState, action(flareResolve), { matchBinding });
flareState = flareApplied.state;
assert.equal(flareState.cardResources.player1.find((row) => row.id === "p1-academy").readiness,
  "exhausted");
assert.equal(flareApplied.events[0].resourcePayment.generatedResourceRetained, 0);
assert.equal(flareState.pieces.find((row) => row.id === "p2-marine").statuses.length, 1);
assert.equal(flareState.board.effectMarkers.length, 1);
acceptance.push("academy_stays_ready_for_reaction_then_pays_reduced_optical_flare_as_tactical_cp");

const statusKernel = createOfficialCharacteristicStatusKernelV1();
const opticalStatus = flareState.pieces.find((row) => row.id === "p2-marine").statuses[0];
const marineRange = statusKernel.applyRangeDebuff({
  status: opticalStatus,
  printedRangeInches: 12,
  printedLongRangeInches: 18,
});
assert.equal(marineRange.effectiveRangeInches, 8);
assert.equal(marineRange.longRangeAllowed, false);
assert.equal(marineRange.effectiveMaximumRangeInches, 8);
const floorRange = statusKernel.applyRangeDebuff({
  status: opticalStatus,
  printedRangeInches: 3,
  printedLongRangeInches: null,
});
assert.equal(floorRange.effectiveRangeInches, 0);
assert.equal(floorRange.floorApplied, true);
acceptance.push("typed_range_debuff_applies_zero_floor_and_disables_long_range");

const outOfRange = battleState({ enemyX: 30 });
assert.equal(candidates(outOfRange).some((row) => row.abilityId === "optical_flare"), false);
const staleReaction = structuredClone(medpackUse);
staleReaction.modifiedResourceCost = 99;
assert.throws(
  () => applyOfficialAcademyMedicAbilityV1(
    step(battleState(), (row) => row.abilityId === "medpack").state,
    action(staleReaction),
    { matchBinding },
  ),
  /ACADEMY_MEDIC_ACTION_STALE/u,
);
acceptance.push("range_payment_window_and_action_tamper_fail_closed");

const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
function lifecycleState(state) {
  const result = structuredClone(state);
  result.phase = "cleanup";
  result.activeSideKey = null;
  result.firstPlayerSideKey = "player1";
  result.officialMissionSetupBinding = missionSetupBinding;
  result.scoringCleanupProgress = {
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
  return result;
}
let cleanupState = lifecycleState(flareState);
const eorCandidate = enumerateOfficialEndOfRoundEffectsActionsV3(cleanupState, {
  sideKey: "player1",
  matchBinding,
  includeDisabled: true,
})[0];
assert.equal(eorCandidate.executorId, OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID);
assert.equal(eorCandidate.isEnabled, true, JSON.stringify(eorCandidate));
const eorApplied = applyOfficialEndOfRoundEffectsV3(cleanupState, action(eorCandidate), {
  matchBinding,
});
cleanupState = eorApplied.state;
assert.equal(cleanupState.pieces.find((row) => row.id === "p2-marine").statuses.length, 1);
assert.equal(eorApplied.events[0].removalDeferredToCleanup, true);
const cleanupCandidate = enumerateOfficialCleanupRefreshActionsV3(cleanupState, {
  sideKey: "player1",
  matchBinding,
})[0];
assert.equal(cleanupCandidate.executorId, OFFICIAL_CLEANUP_REFRESH_V3_EXECUTOR_ID);
const cleanupApplied = applyOfficialCleanupRefreshV3(cleanupState, action(cleanupCandidate), {
  matchBinding,
});
assert.equal(cleanupApplied.state.pieces.find((row) => row.id === "p2-marine").statuses.length, 0);
assert.equal(cleanupApplied.state.board.effectMarkers.length, 0);
assert.ok(cleanupApplied.state.cardResources.player1.every((row) => row.readiness === "ready"));
assert.equal(cleanupApplied.state.academyReactionUsage, undefined);
acceptance.push("optical_flare_persists_through_end_round_then_cleanup_removes_and_refreshes");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "acead33c1486645a149466848b7d276c54c99c51261c641786e9633dafde815d");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice36_runtime_hash_and_historical_display_remain_frozen");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function engine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-academy-optical-flare-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function credentials(authorityEngine, envelope, fence = 1) {
  const seatAuthority = authorityEngine.issueSeatAuthority({
    grantId: `academy-optical-flare-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = authorityEngine.issueControlLease({
    seatAuthority,
    sessionId: `academy-optical-flare-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, lease };
}

function finiteFor(authorityEngine, envelope, seatAuthority, predicate) {
  const legal = authorityEngine.legalSpace(envelope, { seatAuthority });
  return legal.finiteActions.find((entry) => predicate(entry.action));
}

function applyFinite(authorityEngine, envelope, creds, finite, idempotencyKey) {
  assert.ok(finite);
  const preview = authorityEngine.preview({
    envelope,
    seatAuthority: creds.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmation = authorityEngine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: creds.seatAuthority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  return authorityEngine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: creds.seatAuthority,
    controlLease: creds.lease,
    idempotencyKey,
  });
}

const authorityEngine = engine("ticket-11-academy-optical-flare-seal-v1");
let envelope = authorityEngine.createEnvelope({
  roomId: "official-academy-optical-flare-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-academy-optical-flare-gameplay", content: gameplayDataBundle },
    geometryArtifact: {
      artifactId: "official-empty-battlefield-geometry-v1",
      content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
    },
  },
  state: battleState(),
});
assert.equal(envelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v7" }));
let creds = credentials(authorityEngine, envelope, 1);
const journal = [];
for (const [predicate, key] of [
  [(row) => row.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE
    && row.abilityId === "optical_flare" && row.abilityWindow === "before_action", "declare"],
  [(row) => row.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE, "reaction"],
  [(row) => row.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE
    && row.cardResourceIds.includes("p1-academy"), "resolve"],
]) {
  const finite = finiteFor(authorityEngine, envelope, creds.seatAuthority, predicate);
  const applied = applyFinite(
    authorityEngine,
    envelope,
    creds,
    finite,
    `academy-optical-flare-${key}`,
  );
  assert.equal(applied.ok, true, JSON.stringify(applied));
  journal.push(applied.receipt);
  envelope = applied.envelope;
  creds = credentials(authorityEngine, envelope, journal.length + 1);
}
assert.equal(envelope.state.pieces.find((row) => row.id === "p2-marine").statuses.length, 1);
acceptance.push("authority_v7_preview_confirm_apply_executes_three_stage_optical_flare");

function registerReplayDependencies(replayEngine, initial) {
  for (const [kind, content] of [
    ["sourceSnapshot", snapshot],
    ["dataSnapshot", gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v7" }],
  ]) {
    replayEngine.registerDependency({
      kind,
      artifactId: initial.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  replayEngine.registerDependency({
    kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const initialEnvelope = authorityEngine.createEnvelope({
  roomId: "official-academy-optical-flare-replay-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot-replay", content: snapshot },
    dataSnapshot: { artifactId: "official-academy-optical-flare-gameplay-replay", content: gameplayDataBundle },
    geometryArtifact: {
      artifactId: "official-empty-battlefield-geometry-replay-v1",
      content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
    },
  },
  state: battleState(),
});
let replaySourceEnvelope = initialEnvelope;
let replayCreds = credentials(authorityEngine, replaySourceEnvelope, 20);
const replayJournal = [];
for (const [predicate, key] of [
  [(row) => row.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE
    && row.abilityId === "medpack" && row.abilityWindow === "before_action", "declare"],
  [(row) => row.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE, "reaction"],
  [(row) => row.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE, "resolve"],
]) {
  const finite = finiteFor(authorityEngine, replaySourceEnvelope, replayCreds.seatAuthority, predicate);
  const applied = applyFinite(
    authorityEngine,
    replaySourceEnvelope,
    replayCreds,
    finite,
    `academy-medpack-replay-${key}`,
  );
  replayJournal.push(applied.receipt);
  replaySourceEnvelope = applied.envelope;
  replayCreds = credentials(authorityEngine, replaySourceEnvelope, 21 + replayJournal.length);
}
const replayEngine = engine("ticket-11-academy-optical-flare-rotated-seal-v2");
registerReplayDependencies(replayEngine, initialEnvelope);
const replayed = replayEngine.replay({
  initialEnvelope,
  journal: replayJournal,
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, replaySourceEnvelope.stateHash);
const tamperedReceipt = structuredClone(replayJournal[2]);
tamperedReceipt.events.push({ type: "forged_free_optical_flare" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope,
  journal: [replayJournal[0], replayJournal[1], tamperedReceipt],
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_multistep_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(OFFICIAL_ACADEMY_ADVANCED_TRAINING_SOURCE_TEXT_HASH_V1,
  "76f0023d663b88695ca240e81a916fb88c27d359c7d1f7df4b6f7bcfd6b12868");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

assert.equal(acceptance.length, 13);
const report = {
  schema: "starcraft_tmg_official_academy_optical_flare_rule_slice_verification_v1",
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
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_current_academy_optical_flare_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-academy-optical-flare-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  combatEffectDenominatorHash: report.slice.combatEffectDenominatorHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  trainingTruth: report.trainingTruth,
}, null, 2));
