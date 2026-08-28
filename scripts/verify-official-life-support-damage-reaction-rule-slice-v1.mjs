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
  applyOfficialMedicLifeSupportV1,
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
  OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MEDIC_STABILIZER_SOURCE_TEXT_HASH_V1,
  OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-medic-life-support-reaction-executor-v1.mjs";
import { OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID } from
  "../packages/rule-atoms/official-medic-restoration-reaction-executor-v1.mjs";
import { OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID } from
  "../packages/rule-atoms/official-optical-flare-ranged-consumer-executor-v1.mjs";
import {
  createOfficialLifeSupportDamageReactionRuleSliceV1,
  verifyOfficialLifeSupportDamageReactionRuleSliceV1,
} from "../packages/rule-atoms/official-life-support-damage-reaction-rule-slice-v1.mjs";
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
  path.join(OUTPUT_DIR, "official-restoration-range-consumer-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialLifeSupportDamageReactionRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialLifeSupportDamageReactionRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 414);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 498);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 7);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual(
  [...slice.newlyExecutableRuleAtomIds].sort(),
  [...OFFICIAL_MEDIC_LIFE_SUPPORT_NEW_ATOM_IDS].sort(),
);
acceptance.push("catalogue_promotes_exactly_seven_total_damage_reaction_atoms");

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
  part8: "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
  part10: "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
const medicStrings = firestoreStrings(liveDocuments.medic);
const part2Text = firestoreStrings(liveDocuments.part2).join("\n").replace(/<[^>]*>/gu, "");
const part8Text = firestoreStrings(liveDocuments.part8).join("\n").replace(/<[^>]*>/gu, "");
const part10Text = firestoreStrings(liveDocuments.part10).join("\n").replace(/<[^>]*>/gu, "");
const part11Text = firestoreStrings(liveDocuments.part11).join("\n").replace(/<[^>]*>/gu, "");
assert.ok(medicStrings.includes("Life Support"));
assert.ok(medicStrings.includes("<Reaction>\n(1 Command Point)"));
assert.ok(medicStrings.includes(
  "Use when another Friendly Biological Unit suffers Damage Within 4\". Reduce the Total Damage before allocation by 1 for each model in this Unit that is Within 4\" of the damaged Unit.",
));
assert.ok(medicStrings.includes("Stabilizer Medpacks"));
assert.ok(medicStrings.includes(
  "When this Unit resolves a Life Support or Medpack ability, treat it as having 1 additional model Within Range for calculating that ability's effects.",
));
assert.match(part2Text, /one Reaction per Activation/iu);
assert.match(part8Text, /Total Damage/iu);
assert.match(part10Text, /Passive/iu);
assert.match(part11Text, /TOTAL DAMAGE/iu);
acceptance.push("live_medic_core_rules_and_pdf_sources_match_current_official_hashes");

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
  const reserve = input.isInReserves === true;
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
    isOnField: !reserve,
    isInReserves: reserve,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: [...(input.selectedUpgradeNames || [])],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: Number(input.damageMarker || 0),
    activatedPhases: { movement: false, assault: false, combat: false },
    models: input.models,
  };
}

function battleState() {
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
      player2: [card("p2-taf", "player2", "tactical_cards:terran_armed_forces")],
    },
    pieces: [
      unit({
        id: "p1-optical-medic",
        sideKey: "player1",
        recordKey: "army_units:medic",
        maxModels: 3,
        selectedUpgradeNames: ["Medpack", "Optical Flare"],
        models: [model("p1-optical-medic-1", 1, 5)],
      }),
      unit({
        id: "p1-life-support-alpha",
        sideKey: "player1",
        recordKey: "army_units:medic",
        maxModels: 3,
        selectedUpgradeNames: ["Life Support", "Stabilizer Medpacks"],
        models: [
          model("p1-life-support-alpha-1", 2, 10),
          model("p1-life-support-alpha-2", 4, 10),
          model("p1-life-support-alpha-3", 6, 10),
        ],
      }),
      unit({
        id: "p1-life-support-beta",
        sideKey: "player1",
        recordKey: "army_units:medic",
        maxModels: 3,
        selectedUpgradeNames: ["Life Support"],
        models: [model("p1-life-support-beta-1", 8, 10)],
      }),
      unit({
        id: "p1-reserve-life-support",
        sideKey: "player1",
        recordKey: "army_units:medic",
        maxModels: 3,
        selectedUpgradeNames: ["Life Support"],
        isInReserves: true,
        models: [model("p1-reserve-life-support-1", 20, 5)],
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
        selectedUpgradeNames: ["Medpack", "Optical Flare"],
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
assert.equal(runtime.descriptor.executableRuleAtomCount, 414);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 612);
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

function prepareDebuffedAttacker() {
  let state = battleState();
  state = step(state, "player1", (row) => (
    row.actionType === OFFICIAL_DECLARE_ABILITY_ACTION_TYPE
      && row.abilityId === "optical_flare"
      && row.abilityWindow === "before_action"
      && row.pieceId === "p1-optical-medic"
  )).state;
  state = step(state, "player1", (row) => (
    row.actionType === OFFICIAL_USE_ABILITY_REACTION_ACTION_TYPE
  )).state;
  const resolved = step(state, "player1", (row) => (
    row.actionType === OFFICIAL_RESOLVE_ABILITY_ACTION_TYPE
      && row.cardResourceIds.includes("p1-academy")
  ));
  assert.equal(resolved.restorationReactionOpened, true);
  return step(resolved.state, "player2", (row) => (
    row.executorId === OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID
      && row.actionType === "pass_restoration_reaction"
  )).state;
}

function assaultAtEight(stateInput) {
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
  for (const piece of state.pieces) piece.activatedPhases.assault = false;
  const attacker = state.pieces.find((piece) => piece.id === "p2-marine");
  const target = state.pieces.find((piece) => piece.id === "p1-marine");
  const alpha = state.pieces.find((piece) => piece.id === "p1-life-support-alpha");
  const beta = state.pieces.find((piece) => piece.id === "p1-life-support-beta");
  attacker.models[0].xInches = 10;
  attacker.models[0].yInches = 5;
  target.models[0].xInches = 19.26;
  target.models[0].yInches = 5;
  target.damageMarker = 1;
  alpha.models[0].xInches = 21.26;
  alpha.models[0].yInches = 5;
  alpha.models[1].xInches = 23.26;
  alpha.models[1].yInches = 5;
  alpha.models[2].xInches = 26.26;
  alpha.models[2].yInches = 5;
  beta.models[0].xInches = 23.76;
  beta.models[0].yInches = 5;
  return state;
}

const attackState = assaultAtEight(prepareDebuffedAttacker());
assert.equal(attackState.cardResources.player1.find((row) => row.id === "p1-academy").readiness,
  "exhausted");
const attackCandidate = candidates(attackState, "player2").find((row) => (
  row.executorId === OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID
    && row.pieceId === "p2-marine"
    && row.targetId === "p1-marine"
));
assert.ok(attackCandidate, JSON.stringify(candidates(attackState, "player2")));
assert.deepEqual(attackCandidate.chance.layout, { hit: 2, surge: 1, armour: 2, evade: 0 });
const pendingAttack = runtime.apply(attackState, action(attackCandidate), {
  matchBinding,
  chanceReveals: [6, 6, 6, 1, 1],
});
assert.equal(pendingAttack.lifeSupportReactionOpened, true);
assert.ok(pendingAttack.state.pendingLifeSupportReaction);
assert.equal(pendingAttack.state.activeSideKey, "player2");
assert.equal(pendingAttack.state.pieces.find((row) => row.id === "p1-marine").damageMarker, 1);
assert.equal(pendingAttack.state.pieces.find((row) => row.id === "p1-marine").isDestroyed, false);
const attackEvent = pendingAttack.events.find((event) => (
  event.subtype === "optical_flare_range_consumer"
));
assert.equal(attackEvent.damageAllocationDeferred, true);
assert.equal(attackEvent.damagePool.incomingDamage, 2);
assert.equal(attackEvent.damagePool.totalDamage, 3);
assert.equal(attackEvent.unreducedTargetWouldBeDestroyed, true);
acceptance.push("attack_pauses_after_total_damage_before_any_casualty_allocation");

const reactionChoices = candidates(pendingAttack.state, "player1").filter((row) => (
  row.executorId === OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID
));
assert.equal(reactionChoices.length, 3);
assert.deepEqual(reactionChoices.map((row) => row.actionType), [
  OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
]);
const alphaUse = reactionChoices.find((row) => (
  row.sourcePieceId === "p1-life-support-alpha"
));
const betaUse = reactionChoices.find((row) => (
  row.sourcePieceId === "p1-life-support-beta"
));
const pass = reactionChoices.find((row) => (
  row.actionType === OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE
));
assert.deepEqual(alphaUse.cardResourceIds, ["p1-taf"]);
assert.deepEqual(alphaUse.contributingModelIds, [
  "p1-life-support-alpha-1",
  "p1-life-support-alpha-2",
]);
assert.equal(alphaUse.lifeSupportBaseReduction, 2);
assert.equal(alphaUse.passiveBonus, 1);
assert.equal(alphaUse.lifeSupportReduction, 3);
assert.equal(betaUse.lifeSupportBaseReduction, 1);
assert.equal(betaUse.passiveBonus, 0);
assert.equal(betaUse.lifeSupportReduction, 1);
assert.equal(reactionChoices.some((row) => row.sourcePieceId === "p1-reserve-life-support"), false);
acceptance.push("finite_legal_space_offers_each_eligible_medic_as_alternative_plus_one_pass");

const stabilized = runtime.apply(pendingAttack.state, action(alphaUse), { matchBinding });
const stabilizedTarget = stabilized.state.pieces.find((row) => row.id === "p1-marine");
assert.equal(stabilizedTarget.isDestroyed, false);
assert.equal(stabilizedTarget.damageMarker, 0);
assert.equal(stabilized.state.pendingLifeSupportReaction, undefined);
assert.equal(stabilized.state.cardResources.player1.find((row) => row.id === "p1-taf").readiness,
  "exhausted");
assert.equal(stabilized.state.lifeSupportReactionUsage.entries.length, 1);
assert.equal(stabilized.state.reactionActivationUsage.entries.length, 1);
assert.equal(stabilized.totalDamageResolution.totalDamageBeforeReduction, 3);
assert.equal(stabilized.totalDamageResolution.appliedReduction, 3);
assert.equal(stabilized.totalDamageResolution.totalDamageAfterReduction, 0);
acceptance.push("stabilizer_adds_one_model_and_exact_one_cp_use_preserves_target");

const passed = runtime.apply(pendingAttack.state, action(pass), { matchBinding });
const passedTarget = passed.state.pieces.find((row) => row.id === "p1-marine");
assert.equal(passedTarget.isDestroyed, true);
assert.equal(passedTarget.currentModels, 0);
assert.equal(passed.totalDamageResolution.appliedReduction, 0);
assert.deepEqual(passed.totalDamageResolution.casualtyModelIds, ["p1-marine-1"]);
assert.equal(passed.state.lifeSupportReactionUsage, undefined);
assert.equal(passed.state.reactionActivationUsage, undefined);
acceptance.push("pass_allocates_unreduced_total_damage_and_destroys_target");

const weak = runtime.apply(pendingAttack.state, action(betaUse), { matchBinding });
assert.equal(weak.totalDamageResolution.appliedReduction, 1);
assert.equal(weak.totalDamageResolution.totalDamageAfterReduction, 2);
assert.equal(weak.state.pieces.find((row) => row.id === "p1-marine").isDestroyed, true);
acceptance.push("non_stabilized_source_reduces_exact_model_count_before_casualty");

const staleUse = structuredClone(action(alphaUse));
staleUse.reductionSourceHash = "0".repeat(64);
assert.throws(
  () => applyOfficialMedicLifeSupportV1(pendingAttack.state, staleUse, { matchBinding }),
  /LIFE_SUPPORT_ACTION_STALE/u,
);
assert.throws(
  () => runtime.apply(pendingAttack.state, action(attackCandidate), {
    matchBinding,
    chanceReveals: [6, 6, 6, 1, 1],
  }),
  /RULE_RUNTIME_PENDING_MEDIC_LIFE_SUPPORT_REQUIRED/u,
);
acceptance.push("stale_source_and_attempt_to_skip_pending_reaction_fail_closed");

const noDamage = runtime.apply(attackState, action(attackCandidate), {
  matchBinding,
  chanceReveals: [1, 1, 1, 1, 1],
});
assert.equal(noDamage.lifeSupportReactionOpened, undefined);
assert.equal(noDamage.state.pendingLifeSupportReaction, undefined);
assert.equal(noDamage.events.some((row) => (
  row.type === "total_damage_allocated_after_reaction_window"
    && row.incomingDamage === 0
)), true);
acceptance.push("zero_incoming_damage_skips_reaction_and_settles_original_activation");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "4260abf38957d9bbcb307171a346d35408778c446905306eefc8404de76edda4");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice38_runtime_and_historical_rules_display_remain_strictly_frozen");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function engine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-life-support-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function credentials(authorityEngine, envelope, seatKey, fence) {
  const seatAuthority = authorityEngine.issueSeatAuthority({
    grantId: `life-support-${seatKey}-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = authorityEngine.issueControlLease({
    seatAuthority,
    sessionId: `life-support-${seatKey}-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, lease };
}

function createAuthorityInitial(authorityEngine) {
  return authorityEngine.createEnvelope({
    roomId: "official-life-support-replay-room",
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot-s39", content: snapshot },
      dataSnapshot: { artifactId: "official-life-support-gameplay-s39", content: gameplayDataBundle },
      geometryArtifact: {
        artifactId: "official-empty-battlefield-geometry-s39",
        content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
      },
    },
    state: attackState,
  });
}

function attackAuthorityPreview(authorityEngine, envelope, fence) {
  const creds = credentials(authorityEngine, envelope, "player2", fence);
  const legal = authorityEngine.legalSpace(envelope, { seatAuthority: creds.seatAuthority });
  const finite = legal.finiteActions.find((entry) => (
    entry.action.executorId === OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID
      && entry.action.pieceId === "p2-marine"
      && entry.action.targetId === "p1-marine"
  ));
  assert.ok(finite, JSON.stringify(legal));
  const preview = authorityEngine.preview({
    envelope,
    seatAuthority: creds.seatAuthority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  return { creds, preview };
}

function findDamageAuthorityFixture() {
  for (let index = 1; index <= 256; index += 1) {
    const authorityEngine = engine(`ticket-11-life-support-seal-fixture-${index}`);
    const envelope = createAuthorityInitial(authorityEngine);
    const prepared = attackAuthorityPreview(authorityEngine, envelope, 1);
    const outcomes = prepared.preview.preview.core.chanceTicket.tickets.map((ticket) => (
      authorityEngine.revealChanceTicket(ticket).outcome
    ));
    if (outcomes[0] >= 3 && outcomes[1] >= 3
      && outcomes[3] < 4 && outcomes[4] < 4) {
      return { authorityEngine, envelope, prepared, outcomes, index };
    }
  }
  throw new Error("LIFE_SUPPORT_AUTHORITY_DAMAGE_FIXTURE_NOT_FOUND");
}

function confirmAndApply(authorityEngine, envelope, creds, preview, idempotencyKey) {
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
    idempotencyKey,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

const authorityFixture = findDamageAuthorityFixture();
const authorityEngine = authorityFixture.authorityEngine;
const initialEnvelope = authorityFixture.envelope;
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v9" }));
const attackApplied = confirmAndApply(
  authorityEngine,
  initialEnvelope,
  authorityFixture.prepared.creds,
  authorityFixture.prepared.preview,
  "life-support-authority-attack",
);
assert.equal(attackApplied.envelope.state.pendingLifeSupportReaction !== undefined, true);
assert.equal(attackApplied.receipt.chanceReveal.reveals.length, 5);
const defenderCreds = credentials(authorityEngine, attackApplied.envelope, "player1", 2);
const defenderLegal = authorityEngine.legalSpace(attackApplied.envelope, {
  seatAuthority: defenderCreds.seatAuthority,
});
const authorityUse = defenderLegal.finiteActions.find((entry) => (
  entry.action.actionType === OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE
    && entry.action.sourcePieceId === "p1-life-support-alpha"
));
assert.ok(authorityUse, JSON.stringify(defenderLegal));
const usePreview = authorityEngine.preview({
  envelope: attackApplied.envelope,
  seatAuthority: defenderCreds.seatAuthority,
  proposal: { kind: "finite", actionKey: authorityUse.actionKey },
});
assert.equal(usePreview.ok, true, JSON.stringify(usePreview));
const lifeSupportApplied = confirmAndApply(
  authorityEngine,
  attackApplied.envelope,
  defenderCreds,
  usePreview,
  "life-support-authority-reaction",
);
assert.equal(lifeSupportApplied.envelope.state.pieces.find((row) => (
  row.id === "p1-marine"
)).isDestroyed, false);
const journal = [attackApplied.receipt, lifeSupportApplied.receipt];
acceptance.push("authority_v9_switches_seat_for_reaction_then_resumes_original_activation");

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
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v9" }],
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

const replayEngine = engine("ticket-11-life-support-rotated-seal-v2");
registerReplayDependencies(replayEngine);
const replayed = replayEngine.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, lifeSupportApplied.envelope.stateHash);
const tampered = structuredClone(journal.at(-1));
tampered.events.push({ type: "forged_free_life_support" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope,
  journal: [...journal.slice(0, -1), tampered],
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_cross_seat_replay_survives_hmac_rotation_and_rejects_tamper");

assert.match(OFFICIAL_MEDIC_LIFE_SUPPORT_SOURCE_TEXT_HASH_V1, /^[a-f0-9]{64}$/u);
assert.match(OFFICIAL_MEDIC_STABILIZER_SOURCE_TEXT_HASH_V1, /^[a-f0-9]{64}$/u);
acceptance.push("life_support_and_stabilizer_exact_source_text_hashes_are_bound");
assert.equal(slice.ctx2skill.ctx2skillLoopUsed, true);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.harnessLoopUsed, true);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("ctx2skill_and_harness_gates_emit_no_unverified_training_promotion");

assert.equal(acceptance.length, 15);
const report = {
  schema: "starcraft_tmg_official_life_support_damage_reaction_rule_slice_verification_v1",
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
  authorityFixture: {
    fixtureIndex: authorityFixture.index,
    chanceOutcomes: authorityFixture.outcomes,
    actionSchemaVersion: "hybrid_legal_space_v9",
    journalReceipts: journal.length,
    replayStateHash: replayed.envelope.stateHash,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_current_life_support_damage_reaction_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-life-support-damage-reaction-rule-slice-v1-report.json"),
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
  totalDamageReactionKernelHash: report.slice.totalDamageReactionKernel.kernelHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  authorityJournalReceipts: report.authorityFixture.journalReceipts,
  trainingTruth: report.trainingTruth,
}, null, 2));
