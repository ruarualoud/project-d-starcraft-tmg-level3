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
  createOfficialCombatTagShieldedDefenseKernelV1,
  OFFICIAL_COMBAT_TAGS,
} from "../packages/rule-atoms/official-combat-tag-shielded-defense-kernel-v1.mjs";
import {
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-combat-tag-shielded-ranged-executor-v1.mjs";
import {
  createOfficialCombatTagShieldedRuleSliceV1,
  verifyOfficialCombatTagShieldedRuleSliceV1,
} from "../packages/rule-atoms/official-combat-tag-shielded-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
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
  goliath: `${FIRESTORE_ROOT}/army_units/goliath`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  adept: `${FIRESTORE_ROOT}/army_units/adept`,
  stalker: `${FIRESTORE_ROOT}/army_units/stalker`,
  pointDefenseDrone: `${FIRESTORE_ROOT}/army_units/point_defense_drone`,
  part2: `${FIRESTORE_ROOT}/rules_sections/QX7B9DFpviRo84fVCBIj`,
  part5: `${FIRESTORE_ROOT}/rules_sections/u3zNStKpd5XegMjmJfMS`,
  part11: `${FIRESTORE_ROOT}/rules_sections/FuahgilWtc8nccVSp2Vv`,
  corePdf: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terranP2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
  protossP2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf",
});
const RECORD_KEYS = Object.freeze([
  "army_units:goliath",
  "army_units:marine",
  "army_units:adept",
  "army_units:stalker",
]);
const MARINE_C14 = "army_units:marine::assault::C-14 rifle";
const GOLIATH_AUTOCANNON = "army_units:goliath::assault::Autocannon";
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
  path.join(OUTPUT_DIR, "official-indirect-fire-locked-in-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialCombatTagShieldedRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialCombatTagShieldedRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 365);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 547);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 10);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual(slice.newlyExecutableRuleAtomIds,
  [...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_NEW_ATOM_IDS]);
assert.deepEqual(slice.combatTagShieldedProgress.deferredReviewRequiredRuleAtomIds, [
  "rule-atom:shielded-status-heal-restoration-forbidden",
  "rule-atom:singleton:core-11-shielded-dependent-abilities:03c5e18dd1a9",
]);
acceptance.push("catalogue_promotes_exactly_ten_tag_and_shield_atoms_and_defers_two_unproven_atoms");

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
  unitRecordKeys: [...RECORD_KEYS],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
assert.equal(snapshot.snapshotHash,
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
assert.equal(dataset.datasetHash,
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "14935d15740b639e52d790b83311cf9e8fae0cde1898db6b5a9a0b3e81921bf0");
for (const [recordKey, sourceRecordHash, payloadHash] of [
  ["army_units:goliath", "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16", "168f9cdc1199f698cc74fe882e98b8d17106a14c7c12acc903be19a3b1bf946d"],
  ["army_units:marine", "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215", "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6"],
  ["army_units:adept", "daba33c45aa3323b839def7eaca05f208371807ea92065e415d8936dfa7136a3", "8319c1cdf6621e776a2282b8089d74224db6ba202b1ed1f3ed815dd3d369db03"],
  ["army_units:stalker", "8757aed1d9a442ba79fec6f1fa66ec67658ca213f976f9dd9a1bf6dbc3f991d1", "bf7286f7fad582a880f4cbc776456d5b7545a765eeb66e4bfccee56950b87a31"],
  ["army_units:point_defense_drone", "e8c9a2fb937375b2c33c508c79f5253c7c465179aca2b28b97febc36f8d6c2dc", "d248d4d7fa6999a9c5c8eb001871c4256c1ee70e42bfbfaf67065ea011081ddf"],
]) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  assert.equal(record.sourceRecordHash, sourceRecordHash);
  assert.equal(record.payloadHash, payloadHash);
}
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_snapshot_dataset_profiles_and_weaponless_flying_target_are_exactly_bound");

const [
  versionsResponse,
  goliathResponse,
  marineResponse,
  adeptResponse,
  stalkerResponse,
  pointDefenseDroneResponse,
  part2Response,
  part5Response,
  part11Response,
  corePdfResponse,
  terranP2pResponse,
  protossP2pResponse,
] = await Promise.all([
  fetchOfficial(URLS.versions, "official versions"),
  fetchOfficial(URLS.goliath, "official Goliath"),
  fetchOfficial(URLS.marine, "official Marine"),
  fetchOfficial(URLS.adept, "official Adept"),
  fetchOfficial(URLS.stalker, "official Stalker"),
  fetchOfficial(URLS.pointDefenseDrone, "official Point Defense Drone"),
  fetchOfficial(URLS.part2, "official Part 2"),
  fetchOfficial(URLS.part5, "official Part 5"),
  fetchOfficial(URLS.part11, "official Part 11"),
  fetchOfficial(URLS.corePdf, "official Core PDF"),
  fetchOfficial(URLS.terranP2p, "official Terran P2P PDF"),
  fetchOfficial(URLS.protossP2p, "official Protoss P2P PDF"),
]);
const versionsDocument = await versionsResponse.json();
const goliathDocument = await goliathResponse.json();
const marineDocument = await marineResponse.json();
const adeptDocument = await adeptResponse.json();
const stalkerDocument = await stalkerResponse.json();
const pointDefenseDroneDocument = await pointDefenseDroneResponse.json();
const part2Document = await part2Response.json();
const part5Document = await part5Response.json();
const part11Document = await part11Response.json();
const liveHashes = {
  versions: documentHash(versionsDocument),
  goliath: documentHash(goliathDocument),
  marine: documentHash(marineDocument),
  adept: documentHash(adeptDocument),
  stalker: documentHash(stalkerDocument),
  pointDefenseDrone: documentHash(pointDefenseDroneDocument),
  part2: documentHash(part2Document),
  part5: documentHash(part5Document),
  part11: documentHash(part11Document),
  corePdf: sha256(Buffer.from(await corePdfResponse.arrayBuffer())),
  terranP2p: sha256(Buffer.from(await terranP2pResponse.arrayBuffer())),
  protossP2p: sha256(Buffer.from(await protossP2pResponse.arrayBuffer())),
};
assert.deepEqual(liveHashes, {
  versions: "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
  goliath: "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc",
  marine: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  adept: "adbd3e08cf9d7c0141cc24d4651c81da8f813dafd087f96a63f9d7df2a0cb7b6",
  stalker: "1f5ebec5ba1b6d429ef0cb9135daa39afed4b60275051ea7959b923a676603bf",
  pointDefenseDrone: "db9d0face167edade6f313a1c642a9ea0787fd5100ff557648c9a71274dbcaa4",
  part2: "32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929",
  part5: "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
  protossP2p: "4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212",
});
const part2Text = firestoreStrings(part2Document).join("\n").replace(/<[^>]*>/gu, " ");
const part5Text = firestoreStrings(part5Document).join("\n").replace(/<[^>]*>/gu, " ");
const part11Text = firestoreStrings(part11Document).join("\n").replace(/<[^>]*>/gu, " ");
assert.match(part2Text, /Armoured, Biological, Light, Mechanical, Psionic, Flying, and Ground/u);
assert.match(part5Text, /Total\s+Damage\s+assigned to it exceeds its\s+Shield\s+value/u);
assert.match(part11Text,
  /Losing\s+Shielded Status\s+does not remove any remaining\s+Hit Points/u);
assert.match(part11Text, /Shielded Status\s+cannot be restored by\s+HEAL/u);
acceptance.push("live_official_units_rules_and_pdf_sources_revalidate_without_repository_fallback");

const defenseKernel = createOfficialCombatTagShieldedDefenseKernelV1();
assert.deepEqual(defenseKernel.descriptor.officialCombatTags, [...OFFICIAL_COMBAT_TAGS]);
const groundAgainstFlying = defenseKernel.authorizeTarget({
  profileTargetTags: ["ground"],
  targetCombatTags: ["armoured", "flying", "mechanical"],
});
assert.equal(groundAgainstFlying.authorized, false);
const allAgainstFlying = defenseKernel.authorizeTarget({
  profileTargetTags: ["all"],
  targetCombatTags: ["armoured", "flying", "mechanical"],
});
assert.equal(allAgainstFlying.authorized, true);
assert.throws(
  () => defenseKernel.authorizeTarget({
    profileTargetTags: ["ground"],
    targetCombatTags: ["ground-level"],
  }),
  /COMBAT_TAG_UNKNOWN/u,
);
acceptance.push("combat_tag_kernel_separates_ground_tag_from_elevation_and_authorizes_all_exactly");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 365);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 661);
assert.equal(runtime.descriptor.runtimeHash,
  "4c72c2953a71db039e0391c2643a2228ba36cfd727cf1b105b6ffacdae20ca93");

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

const UNIT = Object.freeze({
  "army_units:goliath": {
    name: "Goliath", sourceRecordHash: "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16",
    combatTags: ["armoured", "ground", "mechanical"], combatTag: "ground", supply: 2, base: 3.15,
  },
  "army_units:marine": {
    name: "Marine", sourceRecordHash: "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    combatTags: ["biological", "ground", "light"], combatTag: "ground", supply: 0, base: 1.26,
  },
  "army_units:adept": {
    name: "Adept", sourceRecordHash: "daba33c45aa3323b839def7eaca05f208371807ea92065e415d8936dfa7136a3",
    combatTags: ["biological", "ground", "light"], combatTag: "ground", supply: 0, base: 1.575,
  },
  "army_units:stalker": {
    name: "Stalker", sourceRecordHash: "8757aed1d9a442ba79fec6f1fa66ec67658ca213f976f9dd9a1bf6dbc3f991d1",
    combatTags: ["armoured", "ground", "mechanical"], combatTag: "ground", supply: 1, base: 3.15,
  },
  "army_units:point_defense_drone": {
    name: "Point Defense Drone", sourceRecordHash: "e8c9a2fb937375b2c33c508c79f5253c7c465179aca2b28b97febc36f8d6c2dc",
    combatTags: ["armoured", "flying", "mechanical"], combatTag: "flying", supply: 0, base: 1.26,
  },
});

function unit(input) {
  const scope = UNIT[input.recordKey];
  return {
    id: input.id,
    name: scope.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: scope.sourceRecordHash,
    officialPayloadHash: getOfficialCurrentProductRecord(dataset, input.recordKey).payloadHash,
    sizeCharacteristic: input.recordKey === "army_units:stalker" ? 3 : 1,
    currentModels: 1,
    maxModels: 1,
    currentSupply: scope.supply,
    isOnField: true,
    isDestroyed: false,
    combatTag: scope.combatTag,
    combatTags: [...scope.combatTags],
    statuses: [...(input.statuses || [])],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: [],
    damageMarker: Number(input.damageMarker || 0),
    activatedPhases: { movement: false, assault: Boolean(input.assaultActivated), combat: false },
    models: [model(`${input.id}-m1`, input.xInches, input.yInches, scope.base)],
  };
}

function battleState(overrides = {}) {
  const adeptDamage = Number(overrides.adeptDamage || 0);
  const stalkerDamage = Number(overrides.stalkerDamage || 0);
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
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
    cardResources: { player1: [], player2: [] },
    pieces: [
      unit({ id: "p1-goliath", sideKey: "player1", recordKey: "army_units:goliath", xInches: 4, yInches: 10 }),
      unit({ id: "p1-marine", sideKey: "player1", recordKey: "army_units:marine", xInches: 4, yInches: 20 }),
      unit({
        id: "p2-adept", sideKey: "player2", recordKey: "army_units:adept", xInches: 10, yInches: 10,
        damageMarker: adeptDamage, statuses: adeptDamage <= 2 ? ["shielded"] : [],
      }),
      unit({
        id: "p2-stalker", sideKey: "player2", recordKey: "army_units:stalker", xInches: 10, yInches: 20,
        damageMarker: stalkerDamage, statuses: stalkerDamage <= 3 ? ["shielded"] : [],
      }),
      unit({
        id: "p2-pdd", sideKey: "player2", recordKey: "army_units:point_defense_drone", xInches: 10, yInches: 15,
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
function sliceCandidates(state = battleState()) {
  return runtime.enumerate(state, {
    sideKey: "player1",
    includeDisabled: true,
    matchBinding: syntheticMatchBinding,
  }).candidates.filter((candidate) => (
    candidate.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID
  ));
}

const initialCandidates = sliceCandidates();
assert.equal(initialCandidates.length, 5);
assert.deepEqual(initialCandidates.filter((row) => row.attackProfileKey === GOLIATH_AUTOCANNON)
  .map((row) => row.targetId).sort(), ["p2-adept", "p2-stalker"]);
assert.deepEqual(initialCandidates.filter((row) => row.attackProfileKey === MARINE_C14)
  .map((row) => row.targetId).sort(), ["p2-adept", "p2-pdd", "p2-stalker"]);
acceptance.push("legal_space_has_five_actions_and_ground_autocannon_omits_flying_drone");

const marineAdept = initialCandidates.find((row) => (
  row.attackProfileKey === MARINE_C14 && row.targetId === "p2-adept"
));
const marineStalker = initialCandidates.find((row) => (
  row.attackProfileKey === MARINE_C14 && row.targetId === "p2-stalker"
));
const marinePdd = initialCandidates.find((row) => (
  row.attackProfileKey === MARINE_C14 && row.targetId === "p2-pdd"
));
assert.equal(marineAdept.surgeTagMatched, true);
assert.equal(marineStalker.surgeTagMatched, false);
assert.equal(marinePdd.surgeTagMatched, false);
assert.deepEqual(marineAdept.targetCombatTags, ["biological", "ground", "light"]);
assert.deepEqual(marineAdept.profileTargetTags, ["all"]);
assert.equal(marineAdept.printedHitPoints, 3);
assert.equal(marineAdept.shieldValue, 2);
assert.equal(marineAdept.effectiveFirstModelHitPoints, 5);
assert.equal(marineAdept.shieldedBefore, true);
acceptance.push("harness_action_contract_exposes_tag_surge_and_effective_shielded_hit_points");

const equalResult = runtime.apply(battleState(), action(marineAdept), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: [6, 6, 1, 1, 1],
});
const equalAdept = equalResult.state.pieces.find((piece) => piece.id === "p2-adept");
assert.equal(equalAdept.damageMarker, 2);
assert.deepEqual(equalAdept.statuses, ["shielded"]);
assert.equal(equalResult.events[0].shieldedLifecycle.shieldedAfter, true);
acceptance.push("damage_equal_to_shield_value_retains_shielded_status");

const crossingState = battleState({ adeptDamage: 2 });
const crossingCandidate = sliceCandidates(crossingState).find((row) => (
  row.attackProfileKey === MARINE_C14 && row.targetId === "p2-adept"
));
const crossingResult = runtime.apply(crossingState, action(crossingCandidate), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: [6, 1, 1, 6, 6],
});
const crossedAdept = crossingResult.state.pieces.find((piece) => piece.id === "p2-adept");
assert.equal(crossedAdept.damageMarker, 3);
assert.deepEqual(crossedAdept.statuses, []);
assert.equal(crossingResult.events[0].shieldedLifecycle.shieldLossReason,
  "total_damage_exceeds_shield_value");
assert.equal(crossingResult.events[0].shieldedLifecycle.remainingHitPoints, 2);
assert.equal(crossingResult.events[0].shieldedLifecycle
  .losingShieldedRemovedRemainingHitPoints, false);
acceptance.push("strict_threshold_crossing_loses_shielded_and_preserves_two_remaining_hit_points");

const removalState = battleState({ adeptDamage: 2 });
const goliathAdept = sliceCandidates(removalState).find((row) => (
  row.attackProfileKey === GOLIATH_AUTOCANNON && row.targetId === "p2-adept"
));
const removalResult = runtime.apply(removalState, action(goliathAdept), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: [...Array(9).fill(6), ...Array(9).fill(1)],
});
const removedAdept = removalResult.state.pieces.find((piece) => piece.id === "p2-adept");
assert.equal(removedAdept.isDestroyed, true);
assert.equal(removalResult.events[0].shieldedLifecycle.shieldLossReason, "first_model_removed");
assert.equal(removalResult.events[0].damagePool.discardedOverflowDamage, 6);
acceptance.push("first_model_removal_ends_shielded_and_discards_bounded_overflow_damage");

const nonLightResult = runtime.apply(battleState(), action(marineStalker), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: [6, 6, 6, 1, 1],
});
assert.equal(nonLightResult.events[0].surgePool.matched, false);
assert.equal(nonLightResult.events[0].surgePool.bypassedArmourHits, 0);
assert.equal(nonLightResult.state.pieces.find((piece) => piece.id === "p2-stalker")
  .damageMarker, 2);
const pddResult = runtime.apply(battleState(), action(marinePdd), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: [6, 1, 6, 1, 1],
});
assert.equal(pddResult.state.pieces.find((piece) => piece.id === "p2-pdd").damageMarker, 1);
assert.equal(pddResult.events[0].profileTargetTags[0], "all");
acceptance.push("non_light_surge_does_not_bypass_armour_and_target_all_reaches_flying_drone");

const forgedAction = action(marineAdept);
forgedAction.shieldValue = 99;
assert.throws(
  () => runtime.apply(battleState(), forgedAction, {
    matchBinding: syntheticMatchBinding,
    chanceReveals: [6, 1, 1, 6, 6],
  }),
  /COMBAT_TAG_SHIELDED_ACTION_MISMATCH/u,
);
const invalidShieldState = battleState({ adeptDamage: 3 });
invalidShieldState.pieces.find((piece) => piece.id === "p2-adept").statuses = ["shielded"];
assert.equal(sliceCandidates(invalidShieldState).some((row) => row.targetId === "p2-adept"), false);
const tamperedBundleState = battleState();
tamperedBundleState.officialGameplayDataBundle = structuredClone(gameplayDataBundle);
tamperedBundleState.officialGameplayDataBundle.normalizedDatasetHash = "f".repeat(64);
assert.equal(sliceCandidates(tamperedBundleState).length, 0);
acceptance.push("action_shield_state_and_official_data_tamper_fail_closed");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-combat-tag-shielded-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function issueCredentials(engine, envelope, sideKey, fence) {
  const authority = engine.issueSeatAuthority({
    grantId: `combat-tag-shielded-${sideKey}-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `combat-tag-shielded-${sideKey}-session-${fence}`,
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
  if (finite.action.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID) {
    assert.equal(typeof preview.preview.core.action.shieldedBefore, "boolean");
    assert.match(preview.preview.core.action.targetAuthorizationHash, /^[a-f0-9]{64}$/u);
    assert.match(preview.preview.core.action.shieldStateHash, /^[a-f0-9]{64}$/u);
  }
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: credentials.authority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
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

const engine = authoritativeEngine("ticket-11-combat-tag-shielded-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-combat-tag-shielded-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-combat-tag-shielded-gameplay", content: gameplayDataBundle },
    geometryArtifact: {
      artifactId: "official-empty-battlefield-geometry-v1",
      content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
    },
  },
  state: battleState(),
});
assert.equal(initial.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v5" }));
const credentialsOne = issueCredentials(engine, initial, "player1", 1);
const legalOne = engine.legalSpace(initial, { seatAuthority: credentialsOne.authority });
const finiteOne = legalOne.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID
    && entry.action.attackProfileKey === MARINE_C14
    && entry.action.targetId === "p2-adept"
));
assert.ok(finiteOne);
const appliedOne = applyFinite(engine, initial, credentialsOne, finiteOne, "combat-tag-shielded-one");
assert.equal(appliedOne.ok, true, JSON.stringify(appliedOne));
const credentialsTwo = issueCredentials(engine, appliedOne.envelope, "player2", 2);
const legalTwo = engine.legalSpace(appliedOne.envelope, { seatAuthority: credentialsTwo.authority });
const finiteTwo = legalTwo.finiteActions.find((entry) => (
  entry.action.actionType === "hold" && entry.action.pieceId === "p2-stalker"
));
assert.ok(finiteTwo);
const appliedTwo = applyFinite(engine, appliedOne.envelope, credentialsTwo, finiteTwo,
  "combat-tag-shielded-two");
assert.equal(appliedTwo.ok, true, JSON.stringify(appliedTwo));
const credentialsThree = issueCredentials(engine, appliedTwo.envelope, "player1", 3);
const legalThree = engine.legalSpace(appliedTwo.envelope, { seatAuthority: credentialsThree.authority });
const finiteThree = legalThree.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID
    && entry.action.attackProfileKey === GOLIATH_AUTOCANNON
    && entry.action.targetId === "p2-stalker"
));
assert.ok(finiteThree);
const appliedThree = applyFinite(engine, appliedTwo.envelope, credentialsThree, finiteThree,
  "combat-tag-shielded-three");
assert.equal(appliedThree.ok, true, JSON.stringify(appliedThree));

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
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v5" }],
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

const replayEngine = authoritativeEngine("ticket-11-combat-tag-shielded-rotated-seal-v2");
registerReplayDependencies(replayEngine);
const journal = [appliedOne.receipt, appliedTwo.receipt, appliedThree.receipt];
const replayed = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, appliedThree.envelope.stateHash);
const tamperedJournal = journal.map((receipt) => structuredClone(receipt));
tamperedJournal[2].events.push({ type: "forged_shield_restoration" });
const tamperedReplay = replayEngine.replay({ initialEnvelope: initial, journal: tamperedJournal });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "a6f1264ecee7adb0ce99d2ff8357d137bc44c14031c2663ed6e1609d31037258");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("authority_v5_three_receipt_replay_survives_hmac_rotation_and_old_runtime_stays_frozen");

assert.equal(OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_ATOM_IDS.every((atomId) => (
  marineAdept.ruleAtomIds.includes(atomId)
)), true);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

assert.equal(acceptance.length, 13);
const report = {
  schema: "starcraft_tmg_official_combat_tag_shielded_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    urls: URLS,
    hashes: liveHashes,
    updateTimes: {
      versions: versionsDocument.updateTime,
      goliath: goliathDocument.updateTime,
      marine: marineDocument.updateTime,
      adept: adeptDocument.updateTime,
      stalker: stalkerDocument.updateTime,
      pointDefenseDrone: pointDefenseDroneDocument.updateTime,
      part2: part2Document.updateTime,
      part5: part5Document.updateTime,
      part11: part11Document.updateTime,
    },
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
  rulesTruth: "official_combat_tag_and_shielded_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-combat-tag-shielded-rule-slice-v1-report.json"),
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
