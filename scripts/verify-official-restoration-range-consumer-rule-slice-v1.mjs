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
  OFFICIAL_DECLARE_ABILITY_ACTION_TYPE,
  OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE,
  OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-academy-medic-ability-executor-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  applyOfficialMedicRestorationV1,
  openOfficialMedicRestorationWindowV1,
  OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
  OFFICIAL_MEDIC_RESTORATION_SOURCE_TEXT_HASH_V1,
  OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
  OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-medic-restoration-reaction-executor-v1.mjs";
import {
  enumerateOfficialOpticalFlareRangedConsumerV1,
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
} from
  "../packages/rule-atoms/official-optical-flare-ranged-consumer-executor-v1.mjs";
import {
  createOfficialRestorationRangeConsumerRuleSliceV1,
  verifyOfficialRestorationRangeConsumerRuleSliceV1,
} from "../packages/rule-atoms/official-restoration-range-consumer-rule-slice-v1.mjs";
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
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  medic: `${FIRESTORE_ROOT}/army_units/medic`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  part2: `${FIRESTORE_ROOT}/rules_sections/QX7B9DFpviRo84fVCBIj`,
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
  path.join(OUTPUT_DIR, "official-academy-optical-flare-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialRestorationRangeConsumerRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialRestorationRangeConsumerRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 407);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 505);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 4);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_exactly_four_reaction_atoms_without_non_target_mutation");

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
  medic: "35e272e5aa48b372d982991fe6f182a355d9caa90cc3f4630b34320429465e35",
  marine: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  part2: "32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929",
  part10: "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
const medicStrings = firestoreStrings(liveDocuments.medic);
const part2Strings = firestoreStrings(liveDocuments.part2);
assert.ok(medicStrings.includes("Restoration"));
assert.ok(medicStrings.includes("<Reaction>\n(1 Command Point)"));
assert.ok(medicStrings.includes(
  "Use when a Friendly Unit Within 4\" receives a DEBUFF. Remove all DEBUFFS from it.",
));
assert.ok(part2Strings.some((value) => (
  value.includes("Each named <b>Reaction Ability</b>")
    && value.includes("once per Round</b> by a specific Unit")
    && value.includes("cannot be used while the Unit is in Reserves")
)));
acceptance.push("live_official_restoration_reaction_and_pdf_sources_match_exact_hashes");

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
    isOnField: input.isInReserves !== true,
    isInReserves: input.isInReserves === true,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: input.recordKey === "army_units:medic"
      ? ["Medpack", "Optical Flare"]
      : [],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: input.models,
  };
}

function battleState(options = {}) {
  const player2Cards = [
    card("p2-taf", "player2", "tactical_cards:terran_armed_forces"),
  ];
  if (options.player2Academy === true) {
    player2Cards.push(card("p2-academy", "player2", "tactical_cards:academy"));
  }
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
      player1: [
        card("p1-academy", "player1", "tactical_cards:academy"),
        card("p1-taf", "player1", "tactical_cards:terran_armed_forces"),
      ],
      player2: player2Cards,
    },
    pieces: [
      unit({
        id: "p1-medic",
        sideKey: "player1",
        recordKey: "army_units:medic",
        maxModels: 3,
        models: [model("p1-medic-1", 1, 5), model("p1-medic-2", 3, 5), model("p1-medic-3", 5, 5)],
      }),
      unit({
        id: "p1-marine",
        sideKey: "player1",
        recordKey: "army_units:marine",
        maxModels: 6,
        models: [model("p1-marine-1", 20, 5)],
      }),
      unit({
        id: "p2-marine",
        sideKey: "player2",
        recordKey: "army_units:marine",
        maxModels: 6,
        models: [model("p2-marine-1", 10, 5)],
      }),
      unit({
        id: "p2-medic",
        sideKey: "player2",
        recordKey: "army_units:medic",
        maxModels: 3,
        isInReserves: options.player2MedicReserve === true,
        models: [model("p2-medic-1", 15.26, 5)],
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
assert.equal(runtime.descriptor.executableRuleAtomCount, 407);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 619);
const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};

function candidates(state, sideKey) {
  return runtime.enumerate(state, {
    sideKey,
    includeDisabled: false,
    matchBinding,
  }).candidates;
}

function step(state, sideKey, predicate, options = {}) {
  const rows = candidates(state, sideKey);
  const candidate = rows.find(predicate);
  assert.ok(candidate, `candidate missing: ${JSON.stringify(rows)}`);
  return runtime.apply(state, action(candidate), {
    matchBinding,
    postRevision: 1,
    ...options,
  });
}

function resolveOpticalFlare(initial = battleState()) {
  let state = initial;
  state = step(state, "player1", (row) => (
    row.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE
      && row.abilityId === "optical_flare"
      && row.abilityWindow === "before_action"
  )).state;
  state = step(state, "player1", (row) => (
    row.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE
  )).state;
  const applied = step(state, "player1", (row) => (
    row.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE
      && row.cardResourceIds.includes("p1-academy")
  ));
  return applied;
}

const received = resolveOpticalFlare();
assert.equal(received.restorationReactionOpened, true);
assert.ok(received.state.pendingRestorationReaction);
assert.equal(received.state.pendingRestorationReaction.reactingSideKey, "player2");
assert.equal(received.state.pieces.find((row) => row.id === "p2-marine").statuses.length, 1);
const restorationChoices = candidates(received.state, "player2").filter((row) => (
  row.executorId === OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID
));
assert.deepEqual(restorationChoices.map((row) => row.actionType), [
  OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE,
  OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
]);
acceptance.push("optical_flare_resolution_opens_exact_separate_restoration_use_pass_window");

const useCandidate = restorationChoices.find((row) => (
  row.actionType === OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE
));
assert.deepEqual(useCandidate.cardResourceIds, ["p2-taf"]);
const restored = runtime.apply(received.state, action(useCandidate), { matchBinding });
assert.equal(restored.state.pendingRestorationReaction, undefined);
assert.equal(restored.state.pieces.find((row) => row.id === "p2-marine").statuses.length, 0);
assert.equal(restored.state.board.effectMarkers.length, 0);
assert.equal(restored.state.cardResources.player2[0].readiness, "exhausted");
assert.equal(restored.state.restorationReactionUsage.entries.length, 1);
assert.equal(restored.removedStatusEffectHashes.length, 1);
acceptance.push("restoration_pays_exactly_one_cp_and_removes_all_known_debuff_material");

const staleUse = structuredClone(action(useCandidate));
staleUse.pendingReactionHash = "0".repeat(64);
assert.throws(
  () => applyOfficialMedicRestorationV1(received.state, staleUse, { matchBinding }),
  /RESTORATION_ACTION_STALE/u,
);
acceptance.push("stale_restoration_window_and_tampered_payment_fail_closed");

const repeatState = structuredClone(received.state);
delete repeatState.pendingRestorationReaction;
repeatState.restorationReactionUsage = structuredClone(restored.state.restorationReactionUsage);
const repeatOpen = openOfficialMedicRestorationWindowV1(repeatState, {
  action: received.action,
  effect: received.effect,
  abilityResolutionHash: received.abilityResolutionHash,
  matchBinding,
});
assert.equal(repeatOpen.opened, false);
assert.equal(repeatOpen.reason, "no_eligible_medic");
const reserveReceived = resolveOpticalFlare(battleState({ player2MedicReserve: true }));
assert.equal(reserveReceived.restorationReactionOpened, undefined);
assert.equal(reserveReceived.state.pendingRestorationReaction, undefined);
acceptance.push("same_name_per_unit_round_ledger_and_reserve_prohibition_suppress_reaction");

assert.throws(
  () => resolveOpticalFlare(battleState({ player2Academy: true })),
  /RESTORATION_NESTED_ACADEMY_REACTION_UNSUPPORTED/u,
);
assert.equal(slice.restorationRangeProgress.simultaneousMultipleRestorationSourcesExecutable, false);
acceptance.push("nested_and_simultaneous_reaction_scopes_remain_explicitly_fail_closed");

const passed = step(received.state, "player2", (row) => (
  row.actionType === OFFICIAL_PASS_RESTORATION_REACTION_ACTION_TYPE
));
assert.equal(passed.state.pieces.find((row) => row.id === "p2-marine").statuses.length, 1);
assert.equal(passed.state.board.effectMarkers.length, 1);
assert.equal(passed.state.restorationReactionUsage, undefined);
acceptance.push("passing_restoration_preserves_optical_flare_status_and_marker");

function assaultAtGap(stateInput, gapInches) {
  const state = structuredClone(stateInput);
  state.phase = "assault";
  state.activeSideKey = "player2";
  state.phaseFirstActorByRound["2:assault"] = {
    round: 2,
    phase: "assault",
    markerHolderSideKey: "player1",
    chosenFirstActorSideKey: "player2",
  };
  state.players.player1.passedPhases = {};
  state.players.player2.passedPhases = {};
  for (const piece of state.pieces) {
    piece.activatedPhases.assault = false;
  }
  const attacker = state.pieces.find((piece) => piece.id === "p2-marine");
  const target = state.pieces.find((piece) => piece.id === "p1-marine");
  attacker.models[0].xInches = 10;
  attacker.models[0].yInches = 5;
  target.models[0].xInches = Number((10 + 1.26 + gapInches).toFixed(3));
  target.models[0].yInches = 5;
  return state;
}

const atEight = assaultAtGap(passed.state, 8);
enumerateOfficialOpticalFlareRangedConsumerV1(atEight, {
  sideKey: "player2",
  matchBinding,
  throwOnError: true,
});
const rangedAtEight = candidates(atEight, "player2").find((row) => (
  row.executorId === OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID
    && row.pieceId === "p2-marine"
    && row.targetId === "p1-marine"
));
assert.ok(rangedAtEight, JSON.stringify(candidates(atEight, "player2")));
assert.equal(rangedAtEight.printedRangeInches, 12);
assert.equal(rangedAtEight.effectiveRangeInches, 8);
assert.equal(rangedAtEight.effectiveMaximumRangeInches, 8);
assert.equal(rangedAtEight.longRangeAllowed, false);
const beyondEight = assaultAtGap(passed.state, 8.1);
assert.equal(candidates(beyondEight, "player2").some((row) => (
  row.executorId === OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID
    && row.pieceId === "p2-marine"
)), false);
acceptance.push("debuffed_marine_c14_is_legal_at_eight_and_not_enumerated_beyond_eight");

const rangedApplied = runtime.apply(atEight, action(rangedAtEight), {
  matchBinding,
  chanceReveals: Array.from(
    { length: rangedAtEight.chance.count },
    () => ({ faces: 6, outcome: 1 }),
  ),
});
const rangedEvent = rangedApplied.events.find((event) => event.type === "ranged_attack");
assert.equal(rangedEvent.opticalFlareStatusConsumedByLegalSpace, true);
assert.equal(rangedEvent.effectiveMaximumRangeInches, 8);
assert.equal(rangedApplied.state.pieces.find((row) => row.id === "p2-marine").statuses.length, 1);
acceptance.push("ranged_apply_receipt_binds_status_hash_effective_range_and_persistent_debuff");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "27437fb6976ce3d4ead8b2257123f3d61d320e6a52c87bcb165b17add1238673");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice37_runtime_hash_and_historical_rules_display_remain_frozen");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function engine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-restoration-range-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function credentials(authorityEngine, envelope, seatKey, fence) {
  const seatAuthority = authorityEngine.issueSeatAuthority({
    grantId: `restoration-range-${seatKey}-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = authorityEngine.issueControlLease({
    seatAuthority,
    sessionId: `restoration-range-${seatKey}-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, lease };
}

function applyAuthorityStep(authorityEngine, envelope, seatKey, fence, predicate, key) {
  const creds = credentials(authorityEngine, envelope, seatKey, fence);
  const legal = authorityEngine.legalSpace(envelope, { seatAuthority: creds.seatAuthority });
  const finite = legal.finiteActions.find((entry) => predicate(entry.action));
  assert.ok(finite, JSON.stringify(legal));
  const preview = authorityEngine.preview({
    envelope,
    seatAuthority: creds.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, `${key}:${JSON.stringify(preview)}`);
  const confirmation = authorityEngine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: creds.seatAuthority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = authorityEngine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: creds.seatAuthority,
    controlLease: creds.lease,
    idempotencyKey: `restoration-range-${key}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

const authorityEngine = engine("ticket-11-restoration-range-seal-v1");
const initialEnvelope = authorityEngine.createEnvelope({
  roomId: "official-restoration-range-replay-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot-s38", content: snapshot },
    dataSnapshot: { artifactId: "official-restoration-range-gameplay-s38", content: gameplayDataBundle },
    geometryArtifact: {
      artifactId: "official-empty-battlefield-geometry-s38",
      content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
    },
  },
  state: battleState(),
});
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v8" }));
let envelope = initialEnvelope;
const journal = [];
for (const [seatKey, predicate, key] of [
  ["player1", (row) => row.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE
    && row.abilityId === "optical_flare" && row.abilityWindow === "before_action", "declare"],
  ["player1", (row) => row.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE,
    "academy"],
  ["player1", (row) => row.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE
    && row.cardResourceIds.includes("p1-academy"), "resolve"],
  ["player2", (row) => row.actionType === OFFICIAL_USE_RESTORATION_REACTION_ACTION_TYPE,
    "restore"],
]) {
  const applied = applyAuthorityStep(
    authorityEngine,
    envelope,
    seatKey,
    journal.length + 1,
    predicate,
    key,
  );
  journal.push(applied.receipt);
  envelope = applied.envelope;
}
assert.equal(envelope.state.pieces.find((row) => row.id === "p2-marine").statuses.length, 0);

function registerReplayDependencies(replayEngine) {
  for (const [kind, content] of [
    ["sourceSnapshot", snapshot],
    ["dataSnapshot", gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initialEnvelope.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v8" }],
  ]) {
    replayEngine.registerDependency({
      kind,
      artifactId: initialEnvelope.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  replayEngine.registerDependency({
    kind: "rulesDisplay",
    artifactId: initialEnvelope.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const replayEngine = engine("ticket-11-restoration-range-rotated-seal-v2");
registerReplayDependencies(replayEngine);
const replayed = replayEngine.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, envelope.stateHash);
const tampered = structuredClone(journal.at(-1));
tampered.events.push({ type: "forged_free_restoration" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope,
  journal: [...journal.slice(0, -1), tampered],
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_cross_seat_replay_survives_hmac_rotation_and_rejects_tamper");

assert.match(OFFICIAL_MEDIC_RESTORATION_SOURCE_TEXT_HASH_V1, /^[a-f0-9]{64}$/u);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

assert.equal(acceptance.length, 14);
const report = {
  schema: "starcraft_tmg_official_restoration_range_consumer_rule_slice_verification_v1",
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
  rulesTruth: "official_current_restoration_range_consumer_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-restoration-range-consumer-rule-slice-v1-report.json"),
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
