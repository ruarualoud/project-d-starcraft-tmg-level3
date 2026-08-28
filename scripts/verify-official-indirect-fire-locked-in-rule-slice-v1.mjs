#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

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
import { createOfficialAxisAlignedFullCoverTerrainV1 } from
  "../packages/rule-atoms/official-bounded-full-cover-los-kernel-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-goliath-scatter-ranged-batch-executor-v1.mjs";
import {
  createOfficialIndirectFireLockedInRuleSliceV1,
  verifyOfficialIndirectFireLockedInRuleSliceV1,
} from "../packages/rule-atoms/official-indirect-fire-locked-in-rule-slice-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
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
const CORE_PDF_URL =
  "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf";
const TERRAN_P2P_URL =
  "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf";
const VERSIONS_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions";
const GOLIATH_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/goliath";
const MARINE_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/marine";
const PART8_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/iuUyObNTQ2M8xK4IUqzC";
const PART11_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/FuahgilWtc8nccVSp2Vv";
const AUTOCANNON = "army_units:goliath::assault::Autocannon";
const SCATTER = "army_units:goliath::assault::Scatter Missiles";
const UNDERBELLY = "army_units:goliath::assault::Underbelly Machine Gun";
const ALL_PROFILES = [AUTOCANNON, SCATTER, UNDERBELLY];
const BOTH_SIDEARMS = [SCATTER, UNDERBELLY];
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
  return [
    ...own,
    ...Object.values(value).flatMap((child) => firestoreStrings(child)),
  ];
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
  path.join(OUTPUT_DIR, "official-sidearm-pinpoint-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialIndirectFireLockedInRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialIndirectFireLockedInRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 355);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 557);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 12);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual(slice.newlyExecutableRuleAtomIds,
  [...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_NEW_ATOM_IDS]);
assert.equal(slice.effectKernel.registeredEffectAtoms, 14);
assert.equal(slice.effectKernel.executableEffectAtomIds.length, 14);
assert.deepEqual(slice.effectKernel.knownUnimplementedEffectAtomIds, []);
acceptance.push("catalogue_promotes_exactly_twelve_indirect_locked_and_full_cover_atoms");

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
  unitRecordKeys: ["army_units:goliath", "army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
assert.equal(snapshot.snapshotHash,
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
assert.equal(dataset.datasetHash,
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "31369902352d6459c723e880a50e4b5a23eed695a6feef38406e11141263cb21");

const [
  versionsResponse,
  goliathResponse,
  marineResponse,
  part8Response,
  part11Response,
  coreResponse,
  terranResponse,
] = await Promise.all([
  fetchOfficial(VERSIONS_URL, "official versions"),
  fetchOfficial(GOLIATH_URL, "official Goliath"),
  fetchOfficial(MARINE_URL, "official Marine"),
  fetchOfficial(PART8_URL, "official Part 8"),
  fetchOfficial(PART11_URL, "official Part 11"),
  fetchOfficial(CORE_PDF_URL, "official Core PDF"),
  fetchOfficial(TERRAN_P2P_URL, "official Terran P2P PDF"),
]);
const versionsDocument = await versionsResponse.json();
const goliathDocument = await goliathResponse.json();
const marineDocument = await marineResponse.json();
const part8Document = await part8Response.json();
const part11Document = await part11Response.json();
const versionsCanonicalHash = documentHash(versionsDocument);
const goliathCanonicalHash = documentHash(goliathDocument);
const marineCanonicalHash = documentHash(marineDocument);
const part8CanonicalHash = documentHash(part8Document);
const part11CanonicalHash = documentHash(part11Document);
const corePdfHash = sha256(Buffer.from(await coreResponse.arrayBuffer()));
const terranP2pHash = sha256(Buffer.from(await terranResponse.arrayBuffer()));
assert.deepEqual({
  unitsVersion: versionsDocument.fields.unitsVersion.integerValue,
  cardsVersion: versionsDocument.fields.cardsVersion.integerValue,
  rulesVersion: versionsDocument.fields.rulesVersion.integerValue,
}, { unitsVersion: "71", cardsVersion: "69", rulesVersion: "48" });
assert.equal(versionsCanonicalHash,
  "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733");
assert.equal(goliathCanonicalHash,
  "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc");
assert.equal(marineCanonicalHash,
  "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1");
assert.equal(part8CanonicalHash,
  "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b");
assert.equal(part11CanonicalHash,
  "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c");
assert.equal(corePdfHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
assert.equal(terranP2pHash,
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c");
const goliathText = goliathDocument.fields.upgrades.arrayValue.values
  .map((entry) => entry.mapValue.fields.description.stringValue)
  .join("\n");
const part11Text = firestoreStrings(part11Document).join("\n");
const part11PlainText = part11Text.replace(/<[^>]*>/gu, "");
assert.match(goliathText,
  /INDIRECT FIRE, LOCKED IN \(6\), LONG RANGE \(24"\), SIDEARM/u);
assert.match(part11PlainText, /may ignore Line of Sight/u);
assert.match(part11PlainText, /target Unit has Stationary Status/u);
acceptance.push("live_official_scatter_indirect_locked_stationary_and_pdf_sources_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 355);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 671);
assert.equal(runtime.descriptor.runtimeHash,
  "a6f1264ecee7adb0ce99d2ff8357d137bc44c14031c2663ed6e1609d31037258");

function model(id, xInches, yInches, baseWidthInches) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches,
    baseDepthInches: baseWidthInches,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: true,
    isDestroyed: false,
  };
}

function unit(input) {
  const goliath = input.recordKey === "army_units:goliath";
  return {
    id: input.id,
    name: goliath ? "Goliath" : "Marine",
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: goliath
      ? "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16"
      : "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    sizeCharacteristic: goliath ? 3 : 1,
    currentModels: 1,
    maxModels: 1,
    currentSupply: goliath ? 2 : 0,
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: input.statuses || [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: input.upgrades || [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(
      `${input.id}-m1`,
      input.xInches,
      input.yInches,
      goliath ? 3.15 : 1.26,
    )],
  };
}

function battleState() {
  const terrain = createOfficialAxisAlignedFullCoverTerrainV1({
    id: "full-cover-wall",
    xInches: 12,
    yInches: 18,
    widthInches: 4,
    heightInches: 12,
    effectiveSize: 3,
  });
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    phaseFirstActorByRound: {
      "2:assault": {
        round: 2,
        phase: "assault",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    board: {
      widthInches: 36,
      heightInches: 36,
      terrain: [terrain],
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
    cardResources: { player1: [], player2: [] },
    pieces: [
      unit({
        id: "p1-goliath",
        sideKey: "player1",
        recordKey: "army_units:goliath",
        xInches: 4,
        yInches: 18,
        upgrades: ["Scatter Missiles"],
      }),
      unit({
        id: "p2-goliath-a",
        sideKey: "player2",
        recordKey: "army_units:goliath",
        xInches: 4,
        yInches: 28,
      }),
      unit({
        id: "p2-goliath-b",
        sideKey: "player2",
        recordKey: "army_units:goliath",
        xInches: 4,
        yInches: 8,
      }),
      unit({
        id: "p2-marine-stationary",
        sideKey: "player2",
        recordKey: "army_units:marine",
        xInches: 22,
        yInches: 18,
        statuses: ["stationary"],
      }),
      unit({
        id: "p2-marine-moved",
        sideKey: "player2",
        recordKey: "army_units:marine",
        xInches: 28,
        yInches: 18,
      }),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

const syntheticMatchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const initialDirect = runtime.enumerate(battleState(), {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: syntheticMatchBinding,
});
const initialBatches = initialDirect.candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID
));
assert.equal(initialBatches.length, 32);
assert.equal(new Set(initialBatches.map((candidate) => (
  candidate.selectedBatchProfileKeys.join("+")
))).size, 7);
assert.equal(initialBatches.filter((candidate) => (
  candidate.attackProfileKey === AUTOCANNON
)).length, 8);
assert.equal(initialBatches.filter((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
)).length, 8);
assert.equal(initialBatches.filter((candidate) => (
  candidate.attackProfileKey === SCATTER
)).length, 16);
assert.equal(initialBatches.filter((candidate) => (
  [AUTOCANNON, UNDERBELLY].includes(candidate.attackProfileKey)
)).every((candidate) => candidate.lineOfSightStatus === "visible"), true);
acceptance.push("legal_space_exposes_thirty_two_candidates_across_seven_profile_subsets");

const stationary = initialBatches.find((candidate) => (
  candidate.attackProfileKey === SCATTER
    && candidate.targetId === "p2-marine-stationary"
    && candidate.selectedBatchProfileKeys.length === 1
));
const moved = initialBatches.find((candidate) => (
  candidate.attackProfileKey === SCATTER
    && candidate.targetId === "p2-marine-moved"
    && candidate.selectedBatchProfileKeys.length === 1
));
assert.ok(stationary);
assert.equal(stationary.lineOfSightStatus, "blocked_by_full_cover");
assert.equal(stationary.indirectFireUsed, true);
assert.equal(stationary.lockedInAdditionalRateOfAttack, 6);
assert.equal(stationary.effectiveRateOfAttack, 12);
assert.equal(stationary.rangeBand, "normal");
assert.equal(stationary.evadeEligibilityReason,
  "indirect_fire_target_not_within_line_of_sight");
assert.equal(stationary.chance.layout.indirectFireEvade, 12);
assert.equal(moved.lockedInAdditionalRateOfAttack, 0);
assert.equal(moved.effectiveRateOfAttack, 6);
assert.equal(moved.rangeBand, "extended");
assert.equal(moved.chance.layout.indirectFireEvade, 6);
acceptance.push("stationary_normal_and_moved_extended_off_los_scatter_are_distinct");

const outOfRangeState = battleState();
outOfRangeState.pieces.find((piece) => piece.id === "p2-marine-moved")
  .models[0].xInches = 31;
const outOfRangeRows = runtime.enumerate(outOfRangeState, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
}).candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID
));
assert.equal(outOfRangeRows.some((candidate) => (
  candidate.targetId === "p2-marine-moved"
)), false);
assert.equal(initialBatches.some((candidate) => (
  candidate.targetId.startsWith("p2-marine-")
    && candidate.attackProfileKey !== SCATTER
)), false);
acceptance.push("ordinary_off_los_and_scatter_beyond_twenty_four_are_omitted");

const singleApplied = runtime.apply(battleState(), action(stationary), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: stationary.chance.count }, () => 1),
});
assert.equal(singleApplied.sequenceComplete, true);
assert.equal(singleApplied.batchReceipt.attackPoolDice, 12);
assert.equal(singleApplied.batchReceipt.evadeEligibilityReason,
  "indirect_fire_target_not_within_line_of_sight");
assert.equal(singleApplied.state.pendingRangedAttackSequence, undefined);
acceptance.push("single_stationary_off_los_batch_resolves_armour_evade_damage_then_completes");

const twoFirst = initialBatches.find((candidate) => (
  candidate.attackProfileKey === SCATTER
    && candidate.targetId === "p2-marine-stationary"
    && isDeepStrictEqual(candidate.selectedBatchProfileKeys, BOTH_SIDEARMS)
));
const afterScatter = runtime.apply(battleState(), action(twoFirst), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: twoFirst.chance.count }, () => 1),
});
assert.equal(afterScatter.sequenceComplete, false);
assert.deepEqual(afterScatter.state.pendingRangedAttackSequence.remainingBatchProfileKeys,
  [UNDERBELLY]);
const twoContinuation = runtime.enumerate(afterScatter.state, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
}).candidates;
assert.equal(twoContinuation.length, 2);
assert.equal(twoContinuation.every((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
    && candidate.lineOfSightStatus === "visible"
)), true);
const afterTwo = runtime.apply(
  afterScatter.state,
  action(twoContinuation[0]),
  {
    matchBinding: syntheticMatchBinding,
    postRevision: 2,
    chanceReveals: Array.from({ length: twoContinuation[0].chance.count }, () => 1),
  },
);
assert.equal(afterTwo.sequenceComplete, true);
acceptance.push("two_sidearms_keep_independent_targets_and_exact_pending_profile_lock");

const fullFirst = initialBatches.find((candidate) => (
  candidate.attackProfileKey === SCATTER
    && candidate.targetId === "p2-marine-stationary"
    && isDeepStrictEqual(candidate.selectedBatchProfileKeys, ALL_PROFILES)
));
const afterFullOne = runtime.apply(battleState(), action(fullFirst), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: fullFirst.chance.count }, () => 1),
});
const fullSecond = runtime.enumerate(afterFullOne.state, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
}).candidates.find((candidate) => (
  candidate.attackProfileKey === AUTOCANNON
    && candidate.targetId === "p2-goliath-a"
));
assert.ok(fullSecond);
const afterFullTwo = runtime.apply(afterFullOne.state, action(fullSecond), {
  matchBinding: syntheticMatchBinding,
  postRevision: 2,
  chanceReveals: Array.from({ length: fullSecond.chance.count }, () => 1),
});
const fullThird = runtime.enumerate(afterFullTwo.state, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
}).candidates.find((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
    && candidate.targetId === "p2-goliath-b"
));
assert.ok(fullThird);
const afterFullThree = runtime.apply(afterFullTwo.state, action(fullThird), {
  matchBinding: syntheticMatchBinding,
  postRevision: 3,
  chanceReveals: Array.from({ length: fullThird.chance.count }, () => 1),
});
assert.equal(afterFullThree.sequenceComplete, true);
assert.equal(afterFullThree.state.activeSideKey, "player2");
assert.equal(afterFullThree.state.pieces[0].activatedPhases.assault, true);
acceptance.push("three_profile_sequence_retains_priority_until_exact_third_batch");

const tamperedPending = structuredClone(afterFullOne.state);
tamperedPending.pendingRangedAttackSequence.remainingBatchProfileKeys = [SCATTER];
assert.throws(
  () => runtime.enumerate(tamperedPending, {
    sideKey: "player1",
    matchBinding: syntheticMatchBinding,
  }),
  /GOLIATH_SCATTER_PENDING_SEQUENCE_INVALID/u,
);
assert.throws(
  () => runtime.apply(afterFullOne.state, {
    actionType: "hold",
    executorId: "authority.assault-hold-v2",
  }, { matchBinding: syntheticMatchBinding }),
  /RULE_RUNTIME_PENDING_GOLIATH_SCATTER_BATCH_REQUIRED/u,
);
const forged = action(fullSecond);
forged.effectiveRateOfAttack = 99;
assert.throws(
  () => runtime.apply(afterFullOne.state, forged, {
    matchBinding: syntheticMatchBinding,
    chanceReveals: Array.from({ length: fullSecond.chance.count }, () => 1),
  }),
  /GOLIATH_SCATTER_ACTION_MISMATCH/u,
);
acceptance.push("pending_sequence_skip_hash_and_observable_action_tamper_fail_closed");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-indirect-locked-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function issueCredentials(engine, envelope, fence) {
  const authority = engine.issueSeatAuthority({
    grantId: `indirect-locked-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `indirect-locked-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, credentials, finite, idempotencyKey) {
  const preview = engine.preview({
    envelope,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  assert.equal(preview.preview.core.action.selectedBatchProfileKeys.length, 3);
  assert.ok(["visible", "blocked_by_full_cover"].includes(
    preview.preview.core.action.lineOfSightStatus,
  ));
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credentials.authority,
  });
  return engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey,
  });
}

const engine = authoritativeEngine("ticket-11-indirect-locked-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-indirect-locked-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-indirect-locked-gameplay", content: gameplayDataBundle },
    geometryArtifact: {
      artifactId: "official-bounded-full-cover-geometry-v1",
      content: {
        kind: "geometry-artifact",
        geometryVersion: "bounded_full_cover_rectangle_v1",
      },
    },
  },
  state: battleState(),
});
assert.equal(
  initial.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({
    kind: "action-schema",
    schemaVersion: "hybrid_legal_space_v4",
  }),
);
const credentialsOne = issueCredentials(engine, initial, 1);
const legalOne = engine.legalSpace(initial, { seatAuthority: credentialsOne.authority });
const finiteOne = legalOne.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_EXECUTOR_ID
    && entry.action.attackProfileKey === SCATTER
    && entry.action.targetId === "p2-marine-stationary"
    && entry.action.selectedBatchProfileKeys.length === 3
));
assert.ok(finiteOne);
const appliedOne = applyFinite(
  engine,
  initial,
  credentialsOne,
  finiteOne,
  "indirect-locked-authority-one",
);
assert.equal(appliedOne.ok, true, JSON.stringify(appliedOne));
const credentialsTwo = issueCredentials(engine, appliedOne.envelope, 2);
const legalTwo = engine.legalSpace(appliedOne.envelope, {
  seatAuthority: credentialsTwo.authority,
});
const finiteTwo = legalTwo.finiteActions.find((entry) => (
  entry.action.attackProfileKey === AUTOCANNON
    && entry.action.targetId === "p2-goliath-a"
));
assert.ok(finiteTwo);
const appliedTwo = applyFinite(
  engine,
  appliedOne.envelope,
  credentialsTwo,
  finiteTwo,
  "indirect-locked-authority-two",
);
assert.equal(appliedTwo.ok, true, JSON.stringify(appliedTwo));
const credentialsThree = issueCredentials(engine, appliedTwo.envelope, 3);
const legalThree = engine.legalSpace(appliedTwo.envelope, {
  seatAuthority: credentialsThree.authority,
});
const finiteThree = legalThree.finiteActions.find((entry) => (
  entry.action.attackProfileKey === UNDERBELLY
    && entry.action.targetId === "p2-goliath-b"
));
assert.ok(finiteThree);
const appliedThree = applyFinite(
  engine,
  appliedTwo.envelope,
  credentialsThree,
  finiteThree,
  "indirect-locked-authority-three",
);
assert.equal(appliedThree.ok, true, JSON.stringify(appliedThree));
assert.equal(appliedThree.envelope.state.pendingRangedAttackSequence, undefined);
acceptance.push("authority_v4_runs_legal_preview_confirm_apply_across_three_receipts");

function registerReplayDependencies(replayEngine) {
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
    ["geometryArtifact", {
      kind: "geometry-artifact",
      geometryVersion: "bounded_full_cover_rectangle_v1",
    }],
    ["actionSchema", {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v4",
    }],
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

const replayEngine = authoritativeEngine("ticket-11-indirect-locked-rotated-seal-v2");
registerReplayDependencies(replayEngine);
const journal = [appliedOne.receipt, appliedTwo.receipt, appliedThree.receipt];
const replayed = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, appliedThree.envelope.stateHash);
const tamperedJournal = journal.map((receipt) => structuredClone(receipt));
tamperedJournal[2].events.push({ type: "forged_fourth_batch" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "ad6ede455d3da1ad0532361d96810325934025ab3ba2ee31f77f7438dc5bc794");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice33_runtime_action_schema_and_rules_display_remain_frozen");

assert.deepEqual([...fullFirst.ruleAtomIds].sort(),
  [...OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_ACTION_ATOM_IDS].sort());
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_indirect_fire_locked_in_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    versionsUrl: VERSIONS_URL,
    versionsCanonicalHash,
    versionsUpdateTime: versionsDocument.updateTime,
    goliathUrl: GOLIATH_URL,
    goliathCanonicalHash,
    goliathUpdateTime: goliathDocument.updateTime,
    marineUrl: MARINE_URL,
    marineCanonicalHash,
    marineUpdateTime: marineDocument.updateTime,
    part8Url: PART8_URL,
    part8CanonicalHash,
    part8UpdateTime: part8Document.updateTime,
    part11Url: PART11_URL,
    part11CanonicalHash,
    part11UpdateTime: part11Document.updateTime,
    corePdfUrl: CORE_PDF_URL,
    corePdfHash,
    terranP2pUrl: TERRAN_P2P_URL,
    terranP2pHash,
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
  rulesTruth: "official_indirect_fire_locked_in_full_cover_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-indirect-fire-locked-in-rule-slice-v1-report.json"),
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
  executableEffectAtoms: report.slice.effectKernel.executableEffectAtomIds.length,
  knownUnimplementedEffectAtoms: report.slice.effectKernel.knownUnimplementedEffectAtoms,
  trainingTruth: report.trainingTruth,
}, null, 2));
