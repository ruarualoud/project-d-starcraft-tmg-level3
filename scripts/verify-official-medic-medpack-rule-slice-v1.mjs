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
import { createOfficialHealResolutionKernelV1 } from
  "../packages/rule-atoms/official-heal-resolution-kernel-v1.mjs";
import {
  applyOfficialMedicMedpackActiveV1,
  enumerateOfficialMedicMedpackActiveV1,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1,
  OFFICIAL_MEDIC_MEDPACK_SOURCE_V1,
} from "../packages/rule-atoms/official-medic-medpack-active-executor-v1.mjs";
import {
  createOfficialMedicMedpackRuleSliceV1,
  verifyOfficialMedicMedpackRuleSliceV1,
} from "../packages/rule-atoms/official-medic-medpack-rule-slice-v1.mjs";
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
  academy: `${FIRESTORE_ROOT}/tactical_cards/academy`,
  terranArmedForces: `${FIRESTORE_ROOT}/tactical_cards/terran_armed_forces`,
  part2: `${FIRESTORE_ROOT}/rules_sections/QX7B9DFpviRo84fVCBIj`,
  part4: `${FIRESTORE_ROOT}/rules_sections/I03mzBYujgXw6xN2qXhH`,
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
  path.join(OUTPUT_DIR, "official-combat-tag-shielded-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialMedicMedpackRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialMedicMedpackRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 394);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 518);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 29);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual(slice.newlyExecutableRuleAtomIds, [...OFFICIAL_MEDIC_MEDPACK_ACTIVE_NEW_ATOM_IDS]);
acceptance.push("catalogue_promotes_exactly_twenty_nine_medpack_atoms_without_non_target_mutation");

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
for (const [recordKey, sourceRecordHash, payloadHash] of [
  ["army_units:medic", "1a673c3081628d422bf7d38ad3db7c92a7e43f0e305e1f8eb610ec9c748dc203", "5ef39b4365da4f36cb5b939aea1290f645f368f730a149693ad3afa4e4b678ba"],
  ["army_units:marine", "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215", "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6"],
  ["tactical_cards:academy", "fa44c19baa21f3c6c9d983a11b61cd9e8e7ed5904e74fea2cbca7931109fc939", "3bbb8f03e371a6d0052df5191ea877ef2e2e5fd3da4037fb99aafa8b9e0b6fa7"],
  ["tactical_cards:terran_armed_forces", "44aa8b4d52a065dbbc5e93a9bfc203957647393efe4c123e1a0b2b909dbf63c5", "91ff4f8d459869ecadc9c3271ad651ba81ae324ca1d71184ac3d64c37caf20d7"],
]) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  assert.equal(record.sourceRecordHash, sourceRecordHash);
  assert.equal(record.payloadHash, payloadHash);
}
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_snapshot_dataset_medic_marine_cards_and_bundle_are_exactly_bound");

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
  part2: "32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929",
  part4: "bd4ad276a2ea528824be4501faedf0249fc164ab8918c0c240f692a1a0a98424",
  part5: "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
  part10: "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
acceptance.push("live_official_firestore_and_pdf_hashes_match_the_frozen_slice_policy");

const medicStrings = firestoreStrings(liveDocuments.medic);
assert.ok(medicStrings.includes(OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.activation));
assert.ok(medicStrings.includes(OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.phase));
assert.ok(medicStrings.includes(OFFICIAL_MEDIC_MEDPACK_SOURCE_V1.description));
assert.equal(OFFICIAL_MEDIC_MEDPACK_SOURCE_TEXT_HASH_V1,
  "e54d5941476c9ce97121fbdcdb971a203796d66edd5638d05390ce11064e52fe");
const plainOfficialText = (value) => firestoreStrings(value).join("\n")
  .replace(/<[^>]+>/gu, " ")
  .replace(/\s+/gu, " ");
const part10Text = plainOfficialText(liveDocuments.part10);
const part11Text = plainOfficialText(liveDocuments.part11);
assert.match(part10Text, /immediately before declaring an action/u);
assert.match(part10Text, /immediately after fully resolving one/u);
assert.match(part10Text, /Costs must be paid in full/u);
assert.match(part11Text, /Remove X points of accumulated Damage/u);
assert.match(part11Text, /cannot return Destroyed models/u);
acceptance.push("current_medic_and_core_text_bind_timing_full_payment_within_and_heal_semantics");

const healKernel = createOfficialHealResolutionKernelV1();
const casualtyHeal = healKernel.resolveHeal({
  currentModels: 2,
  maxModels: 6,
  destroyedModelIds: ["marine-3", "marine-4", "marine-5", "marine-6"],
  damageMarker: 1,
  healValue: 2,
  statuses: [],
  shieldValue: 0,
});
assert.equal(casualtyHeal.damageMarkerAfter, 0);
assert.equal(casualtyHeal.effectiveHeal, 1);
assert.equal(casualtyHeal.discardedHeal, 1);
assert.equal(casualtyHeal.currentModelsAfter, 2);
assert.equal(casualtyHeal.destroyedModelsReturned, 0);
assert.equal(casualtyHeal.respawnPerformed, false);
const shieldHeal = healKernel.resolveHeal({
  currentModels: 1,
  maxModels: 1,
  destroyedModelIds: [],
  damageMarker: 3,
  healValue: 2,
  statuses: [],
  shieldValue: 2,
});
assert.equal(shieldHeal.damageMarkerAfter, 1);
assert.equal(shieldHeal.shieldedAfter, false);
assert.equal(shieldHeal.shieldedStatusRestored, false);
acceptance.push("heal_kernel_reduces_damage_without_respawn_or_lost_shielded_restoration");

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

function card(input) {
  return {
    id: input.id,
    sideKey: input.sideKey,
    officialCardRecordKey: input.recordKey,
    cardKind: input.recordKey.endsWith("academy") ? "tactical" : "faction",
    sourceRecordHash: getOfficialCurrentProductRecord(dataset, input.recordKey).sourceRecordHash,
    resource: 1,
    resourceType: "CP",
    readiness: input.readiness,
    face: input.readiness === "ready" ? "up" : "down",
  };
}

function unit(input) {
  const record = getOfficialCurrentProductRecord(dataset, input.recordKey);
  return {
    id: input.id,
    name: record.payload.name,
    sideKey: input.sideKey,
    officialUnitRecordKey: input.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    officialPayloadHash: record.payloadHash,
    currentModels: input.models.length,
    maxModels: input.maxModels,
    currentSupply: input.currentSupply,
    destroyedModelIds: [...input.destroyedModelIds],
    isOnField: input.isOnField !== false,
    isInReserves: input.isOnField === false,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames: input.recordKey === "army_units:medic" ? ["Medpack"] : [],
    damageMarker: Number(input.damageMarker || 0),
    activatedPhases: { movement: false, assault: false, combat: false },
    models: input.models.map((entry) => model(...entry)),
  };
}

function battleState(overrides = {}) {
  const targetSideKey = overrides.targetSideKey || "player1";
  const medicOnField = overrides.medicOnField !== false;
  const targetX = Number(overrides.targetX ?? 5.26);
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 2,
    phase: overrides.phase || "movement",
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
    pendingAction: overrides.pendingAction,
    board: {
      widthInches: 54,
      heightInches: 36,
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: {
      player1: overrides.noReadyCp ? [
        card({ id: "p1-academy", sideKey: "player1", recordKey: "tactical_cards:academy", readiness: "exhausted" }),
        card({ id: "p1-taf", sideKey: "player1", recordKey: "tactical_cards:terran_armed_forces", readiness: "exhausted" }),
      ] : [
        card({ id: "p1-academy", sideKey: "player1", recordKey: "tactical_cards:academy", readiness: "exhausted" }),
        card({ id: "p1-taf", sideKey: "player1", recordKey: "tactical_cards:terran_armed_forces", readiness: "ready" }),
      ],
      player2: [],
    },
    pieces: [
      unit({
        id: "p1-medic",
        sideKey: "player1",
        recordKey: "army_units:medic",
        maxModels: 3,
        currentSupply: 1,
        destroyedModelIds: [],
        isOnField: medicOnField,
        models: [["medic-1", 0, 0], ["medic-2", 2, 0], ["medic-3", 12, 0]],
      }),
      unit({
        id: "p1-marine",
        sideKey: targetSideKey,
        recordKey: "army_units:marine",
        maxModels: 6,
        currentSupply: 0,
        destroyedModelIds: ["marine-3", "marine-4", "marine-5", "marine-6"],
        damageMarker: 1,
        models: [["marine-1", targetX, 0], ["marine-2", targetX, 2]],
      }),
      unit({
        id: "p2-marine",
        sideKey: "player2",
        recordKey: "army_units:marine",
        maxModels: 6,
        currentSupply: 0,
        destroyedModelIds: ["p2-marine-2", "p2-marine-3", "p2-marine-4", "p2-marine-5", "p2-marine-6"],
        models: [["p2-marine-1", 40, 20]],
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
assert.equal(runtime.descriptor.executableRuleAtomCount, 394);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 632);
const syntheticMatchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
function medpackCandidates(state = battleState()) {
  return runtime.enumerate(state, {
    sideKey: "player1",
    includeDisabled: true,
    matchBinding: syntheticMatchBinding,
  }).candidates.filter((candidate) => (
    candidate.executorId === OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID
  ));
}

const candidates = medpackCandidates();
assert.equal(candidates.length, 2);
assert.deepEqual(candidates.map((row) => row.abilityWindow), ["after_action", "before_action"]);
assert.ok(candidates.every((row) => row.amount === 2));
assert.ok(candidates.every((row) => row.resourceType === "CP" && row.resourceCost === 1));
assert.ok(candidates.every((row) => row.lineOfSightStatus === "unobstructed"));
assert.ok(candidates.every((row) => row.targetRangeMilliInches === 4000));
assert.ok(candidates.every((row) => row.targetDistanceMilliInches === 2000));
assert.ok(candidates.every((row) => (
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_ACTION_ATOM_IDS.every((atomId) => row.ruleAtomIds.includes(atomId))
)));
acceptance.push("legal_space_exposes_two_exact_windows_cp_cost_clear_los_and_two_model_heal_x");

const beforeCandidate = candidates.find((row) => row.abilityWindow === "before_action");
const beforeResult = runtime.apply(battleState(), action(beforeCandidate), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
});
assert.deepEqual(beforeResult.events.slice(0, 2).map((event) => event.type), ["use_ability", "hold"]);
const beforeTarget = beforeResult.state.pieces.find((piece) => piece.id === "p1-marine");
const beforeMedic = beforeResult.state.pieces.find((piece) => piece.id === "p1-medic");
assert.equal(beforeTarget.damageMarker, 0);
assert.equal(beforeTarget.currentModels, 2);
assert.equal(beforeTarget.destroyedModelIds.length, 4);
assert.equal(beforeMedic.activatedPhases.movement, true);
assert.equal(beforeResult.state.cardResources.player1.find((row) => row.id === "p1-taf").readiness,
  "exhausted");
assert.equal(beforeResult.state.activeAbilityUseHistory.length, 1);
assert.equal(medpackCandidates(beforeResult.state).length, 0);
acceptance.push("before_action_payment_heal_hold_activation_and_named_round_limit_apply_atomically");

const standaloneAfter = enumerateOfficialMedicMedpackActiveV1(battleState(), {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
}).find((row) => row.abilityWindow === "after_action");
const afterResult = applyOfficialMedicMedpackActiveV1(battleState(), action(standaloneAfter), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
});
assert.deepEqual(afterResult.events.map((event) => event.type), ["hold", "use_ability"]);
assert.equal(afterResult.healResolution.damageMarkerAfter, 0);
assert.equal(afterResult.events[1].resourcePayment.readinessAfter, "exhausted");
acceptance.push("after_action_window_fully_resolves_hold_before_medpack_with_the_same_exact_effect");

assert.equal(medpackCandidates(battleState({ noReadyCp: true })).length, 0);
assert.equal(medpackCandidates(battleState({ targetX: 20 })).length, 0);
assert.equal(medpackCandidates(battleState({ targetSideKey: "player2" })).length, 0);
assert.equal(medpackCandidates(battleState({ medicOnField: false })).length, 0);
assert.equal(medpackCandidates(battleState({ pendingAction: { actionType: "move" } })).length, 0);
const forged = action(beforeCandidate);
forged.amount = 99;
assert.throws(
  () => runtime.apply(battleState(), forged, { matchBinding: syntheticMatchBinding }),
  /MEDPACK_ACTION_MISMATCH/u,
);
acceptance.push("payment_range_friend_reserve_mid_action_repeat_and_action_tamper_fail_closed");

const tamperedBundleState = battleState();
tamperedBundleState.officialGameplayDataBundle = structuredClone(gameplayDataBundle);
tamperedBundleState.officialGameplayDataBundle.normalizedDatasetHash = "f".repeat(64);
assert.equal(medpackCandidates(tamperedBundleState).length, 0);
const wrongCardState = battleState();
wrongCardState.cardResources.player1.find((row) => row.id === "p1-taf").sourceRecordHash =
  "f".repeat(64);
assert.equal(medpackCandidates(wrongCardState).length, 0);
acceptance.push("official_bundle_and_resource_card_identity_tamper_fail_closed");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-medic-medpack-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function issueCredentials(engine, envelope, sideKey, fence) {
  const authority = engine.issueSeatAuthority({
    grantId: `medic-medpack-${sideKey}-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `medic-medpack-${sideKey}-session-${fence}`,
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
  if (finite.action.executorId === OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID) {
    assert.equal(preview.preview.core.action.abilityWindow, "before_action");
    assert.equal(preview.preview.core.action.resourceType, "CP");
    assert.equal(preview.preview.core.action.resourceCost, 1);
    assert.equal(preview.preview.core.action.amount, 2);
    assert.match(preview.preview.core.action.abilityPlanHash, /^[a-f0-9]{64}$/u);
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

const engine = authoritativeEngine("ticket-11-medic-medpack-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-medic-medpack-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-medic-medpack-gameplay", content: gameplayDataBundle },
    geometryArtifact: {
      artifactId: "official-empty-battlefield-geometry-v1",
      content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
    },
  },
  state: battleState(),
});
assert.equal(initial.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v6" }));
const credentials = issueCredentials(engine, initial, "player1", 1);
const legal = engine.legalSpace(initial, { seatAuthority: credentials.authority });
const finite = legal.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_MEDIC_MEDPACK_ACTIVE_EXECUTOR_ID
    && entry.action.abilityWindow === "before_action"
));
assert.ok(finite);
const applied = applyFinite(engine, initial, credentials, finite, "medic-medpack-one");
assert.equal(applied.ok, true, JSON.stringify(applied));

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
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v6" }],
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

const replayEngine = authoritativeEngine("ticket-11-medic-medpack-rotated-seal-v2");
registerReplayDependencies(replayEngine);
const replayed = replayEngine.replay({ initialEnvelope: initial, journal: [applied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
const tamperedReceipt = structuredClone(applied.receipt);
tamperedReceipt.events.push({ type: "forged_free_heal" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: [tamperedReceipt],
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "4c72c2953a71db039e0391c2643a2228ba36cfd727cf1b105b6ffacdae20ca93");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("authority_v6_preview_confirm_apply_ed25519_replay_and_frozen_v5_history_pass");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

assert.equal(acceptance.length, 12);
const report = {
  schema: "starcraft_tmg_official_medic_medpack_rule_slice_verification_v1",
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
  rulesTruth: "official_current_medic_medpack_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-medic-medpack-rule-slice-v1-report.json"),
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
