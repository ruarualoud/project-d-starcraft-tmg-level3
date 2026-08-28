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
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialSidearmPinpointEffectKernelV1 } from
  "../packages/rule-atoms/official-sidearm-pinpoint-effect-kernel-v1.mjs";
import { createOfficialReplacementWeaponLoadoutV1 } from
  "../packages/rule-atoms/official-weapon-replacement-loadout-v1.mjs";
import {
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-sidearm-pinpoint-ranged-batch-executor-v1.mjs";
import {
  createOfficialSidearmPinpointRuleSliceV1,
  verifyOfficialSidearmPinpointRuleSliceV1,
} from "../packages/rule-atoms/official-sidearm-pinpoint-rule-slice-v1.mjs";
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
const HAYWIRE = "army_units:goliath::assault::Haywire Missiles";
const UNDERBELLY = "army_units:goliath::assault::Underbelly Machine Gun";
const ALL_PROFILES = [AUTOCANNON, HAYWIRE, UNDERBELLY];
const BOTH_SIDEARMS = [HAYWIRE, UNDERBELLY];
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
  path.join(OUTPUT_DIR, "official-specialist-ranged-batch-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialSidearmPinpointRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialSidearmPinpointRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 343);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 569);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 6);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual(slice.newlyExecutableRuleAtomIds,
  [...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_NEW_ATOM_IDS]);
assert.equal(slice.effectKernel.registeredEffectAtoms, 14);
assert.equal(slice.effectKernel.executableEffectAtomIds.length, 12);
assert.deepEqual(slice.effectKernel.knownUnimplementedEffectAtomIds, [
  "attack-effect:indirect-fire-v1",
  "attack-effect:locked-in-v1",
]);
acceptance.push("catalogue_promotes_exactly_six_sidearm_and_pinpoint_atoms");

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
assert.match(
  goliathDocument.fields.upgrades.arrayValue.values
    .map((entry) => entry.mapValue.fields.description.stringValue)
    .join("\n"),
  /PINPOINT, SIDEARM/u,
);
acceptance.push("live_current_goliath_marine_rules_and_pdfs_match_reviewed_sources");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 343);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 683);
assert.equal(runtime.descriptor.runtimeHash,
  "ad6ede455d3da1ad0532361d96810325934025ab3ba2ee31f77f7438dc5bc794");

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

function goliath(id, sideKey, xInches, yInches, selectedUpgradeNames = []) {
  return {
    id,
    name: "Goliath",
    sideKey,
    officialUnitRecordKey: "army_units:goliath",
    sourceRecordHash:
      "e36b38cc46ff9a2fecce9f1fa7bc087923fca2fc29fad2d9f0eead479a68ab16",
    currentModels: 1,
    maxModels: 1,
    currentSupply: 2,
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames,
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(`${id}-m1`, xInches, yInches, 3.15)],
  };
}

function marine(id, sideKey, xInches, yInches) {
  return {
    id,
    name: "Marine",
    sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash:
      "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    currentModels: 1,
    maxModels: 1,
    currentSupply: 0,
    isOnField: true,
    isDestroyed: false,
    combatTag: "ground",
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [model(`${id}-m1`, xInches, yInches, 1.26)],
  };
}

function battleState() {
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
      goliath("p1-goliath", "player1", 5, 5, ["Haywire Missiles"]),
      marine("p1-engager", "player1", 13.465, 5),
      marine("p2-engaged-marine", "player2", 12.205, 5),
      goliath("p2-goliath-a", "player2", 5, 17),
      goliath("p2-goliath-b", "player2", 17, 5),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

const syntheticMatchBinding = {
  bindingHash: hashStarcraftTmgContract({
    runtimeHash: runtime.descriptor.runtimeHash,
    gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};

const effectKernel = createOfficialSidearmPinpointEffectKernelV1();
const profiles = ALL_PROFILES.map((profileKey) => (
  gameplayDataBundle.attackProfileCatalogue.profilesByProfileKey[profileKey]
));
const initialDirect = runtime.enumerate(battleState(), {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: syntheticMatchBinding,
});
const initialBatches = initialDirect.candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID
));
assert.equal(initialBatches.length, 20, JSON.stringify(initialDirect.candidates, null, 2));
const allSelectionKeys = [...new Set(initialBatches.map((candidate) => (
  candidate.selectedBatchProfileKeys.join("+")
)))];
assert.equal(allSelectionKeys.length, 7);
assert.equal(initialBatches.filter((candidate) => (
  candidate.selectedBatchProfileKeys.length === 1
)).every((candidate) => candidate.sequenceFinalBatch), true);
assert.deepEqual([...new Set(initialBatches.filter((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
)).map((candidate) => candidate.targetId))], ["p2-engaged-marine"]);
assert.equal(initialBatches.filter((candidate) => (
  [AUTOCANNON, HAYWIRE].includes(candidate.attackProfileKey)
)).every((candidate) => candidate.targetId.startsWith("p2-goliath-")), true);
acceptance.push("legal_space_exposes_seven_optional_profile_subsets_and_pinpoint_only_target");

const weaponLoadout = createOfficialReplacementWeaponLoadoutV1({
  catalogue: gameplayDataBundle.attackProfileCatalogue,
  recordKey: "army_units:goliath",
  phase: "assault",
  selectedWeaponUpgradeNames: ["Haywire Missiles"],
  modelIds: ["p1-goliath-m1"],
});
assert.equal(initialBatches.find((candidate) => (
  candidate.selectedBatchProfileKeys.length === 3
)).details.weaponLoadoutHash, weaponLoadout.loadoutHash);
const fullSelectionAuthorization = effectKernel.authorizeSelection({
  profiles,
  weaponLoadout,
  selectedBatchProfileKeys: ALL_PROFILES,
});
assert.equal(fullSelectionAuthorization.allEquippedSidearmsSelected, true);
assert.equal(fullSelectionAuthorization.additionalWeaponLimitOverrideUsed, true);
assert.equal(fullSelectionAuthorization.selectedSidearmProfileKeys.length, 2);
assert.throws(
  () => effectKernel.authorizePinpointTarget({
    profile: profiles.find((profile) => profile.profileKey === AUTOCANNON),
    attackerEngaged: false,
    targetEngaged: true,
    standardTargetEligible: false,
  }),
  /SIDEARM_PINPOINT_TARGET_OVERRIDE_INVALID/u,
);
acceptance.push("effect_kernel_proves_two_sidearms_and_rejects_pinpoint_on_autocannon");

const singleUnderbelly = initialBatches.find((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
    && candidate.selectedBatchProfileKeys.length === 1
));
const singleApplied = runtime.apply(battleState(), action(singleUnderbelly), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: 19 }, () => 1),
});
assert.equal(singleApplied.sequenceComplete, true);
assert.equal(singleApplied.state.pendingRangedAttackSequence, undefined);
assert.equal(singleApplied.state.pieces[0].activatedPhases.assault, true);
assert.equal(singleApplied.state.activeSideKey, "player2");
assert.match(singleApplied.batchReceipt.pinpointAuthorizationHash, /^[a-f0-9]{64}$/u);
acceptance.push("single_sidearm_as_the_chosen_weapon_completes_without_forcing_extra_batches");

const twoSidearmFirst = initialBatches.find((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
    && isDeepStrictEqual(candidate.selectedBatchProfileKeys, BOTH_SIDEARMS)
));
const afterUnderbelly = runtime.apply(battleState(), action(twoSidearmFirst), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: 19 }, () => 1),
});
assert.equal(afterUnderbelly.sequenceComplete, false);
assert.equal(afterUnderbelly.state.activeSideKey, "player1");
assert.deepEqual(afterUnderbelly.state.pendingRangedAttackSequence.remainingBatchProfileKeys,
  [HAYWIRE]);
const twoContinuation = runtime.enumerate(afterUnderbelly.state, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
});
assert.equal(twoContinuation.candidates.length, 2);
assert.equal(twoContinuation.candidates.every((candidate) => (
  candidate.executorId === OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID
    && candidate.attackProfileKey === HAYWIRE
)), true);
const afterTwoSidearms = runtime.apply(
  afterUnderbelly.state,
  action(twoContinuation.candidates.find((candidate) => (
    candidate.targetId === "p2-goliath-a"
  ))),
  {
    matchBinding: syntheticMatchBinding,
    postRevision: 2,
    chanceReveals: Array.from({ length: 7 }, () => 1),
  },
);
assert.equal(afterTwoSidearms.sequenceComplete, true);
assert.equal(afterTwoSidearms.state.pendingRangedAttackSequence, undefined);
acceptance.push("both_sidearms_resolve_as_independent_batches_against_different_targets");

const fullFirst = initialBatches.find((candidate) => (
  candidate.attackProfileKey === UNDERBELLY
    && isDeepStrictEqual(candidate.selectedBatchProfileKeys, ALL_PROFILES)
));
const afterFullOne = runtime.apply(battleState(), action(fullFirst), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: 19 }, () => 1),
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
  chanceReveals: Array.from({ length: 18 }, () => 1),
});
assert.equal(afterFullTwo.sequenceComplete, false);
assert.equal(afterFullTwo.state.activeSideKey, "player1");
assert.deepEqual(afterFullTwo.state.pendingRangedAttackSequence.remainingBatchProfileKeys,
  [HAYWIRE]);
const fullThird = runtime.enumerate(afterFullTwo.state, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
}).candidates.find((candidate) => candidate.targetId === "p2-goliath-b");
assert.ok(fullThird);
const afterFullThree = runtime.apply(afterFullTwo.state, action(fullThird), {
  matchBinding: syntheticMatchBinding,
  postRevision: 3,
  chanceReveals: Array.from({ length: 7 }, () => 1),
});
assert.equal(afterFullThree.sequenceComplete, true);
assert.equal(afterFullThree.state.activeSideKey, "player2");
assert.equal(afterFullThree.state.pieces[0].activatedPhases.assault, true);
acceptance.push("primary_and_two_sidearms_preserve_priority_until_exact_third_batch");

const tamperedPending = structuredClone(afterFullOne.state);
tamperedPending.pendingRangedAttackSequence.remainingBatchProfileKeys = [UNDERBELLY];
assert.throws(
  () => runtime.enumerate(tamperedPending, {
    sideKey: "player1",
    matchBinding: syntheticMatchBinding,
  }),
  /SIDEARM_PINPOINT_PENDING_SEQUENCE_INVALID/u,
);
assert.throws(
  () => runtime.apply(afterFullOne.state, {
    actionType: "hold",
    executorId: "authority.assault-hold-v2",
  }, { matchBinding: syntheticMatchBinding }),
  /RULE_RUNTIME_PENDING_SIDEARM_BATCH_REQUIRED/u,
);
const forged = action(fullSecond);
forged.selectedBatchProfileKeys = BOTH_SIDEARMS;
assert.throws(
  () => runtime.apply(afterFullOne.state, forged, {
    matchBinding: syntheticMatchBinding,
    chanceReveals: Array.from({ length: 18 }, () => 1),
  }),
  /SIDEARM_PINPOINT_ACTION_MISMATCH/u,
);
acceptance.push("pending_sequence_skip_hash_and_declared_profile_tamper_fail_closed");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-sidearm-pinpoint-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function issueCredentials(engine, envelope, fence) {
  const authority = engine.issueSeatAuthority({
    grantId: `sidearm-pinpoint-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `sidearm-pinpoint-session-${fence}`,
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

const engine = authoritativeEngine("ticket-11-sidearm-pinpoint-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-sidearm-pinpoint-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-sidearm-pinpoint-gameplay", content: gameplayDataBundle },
  },
  state: battleState(),
});
assert.equal(
  initial.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({
    kind: "action-schema",
    schemaVersion: "hybrid_legal_space_v3",
  }),
);
const credentialsOne = issueCredentials(engine, initial, 1);
const authorityLegalOne = engine.legalSpace(initial, {
  seatAuthority: credentialsOne.authority,
});
const authorityFirst = authorityLegalOne.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID
    && entry.action.attackProfileKey === UNDERBELLY
    && entry.action.selectedBatchProfileKeys.length === 3
));
assert.ok(authorityFirst);
const authorityAppliedOne = applyFinite(
  engine,
  initial,
  credentialsOne,
  authorityFirst,
  "sidearm-pinpoint-authority-one",
);
assert.equal(authorityAppliedOne.ok, true, JSON.stringify(authorityAppliedOne));
const credentialsTwo = issueCredentials(engine, authorityAppliedOne.envelope, 2);
const authorityLegalTwo = engine.legalSpace(authorityAppliedOne.envelope, {
  seatAuthority: credentialsTwo.authority,
});
const authoritySecond = authorityLegalTwo.finiteActions.find((entry) => (
  entry.action.attackProfileKey === AUTOCANNON
    && entry.action.targetId === "p2-goliath-a"
));
assert.ok(authoritySecond);
const authorityAppliedTwo = applyFinite(
  engine,
  authorityAppliedOne.envelope,
  credentialsTwo,
  authoritySecond,
  "sidearm-pinpoint-authority-two",
);
assert.equal(authorityAppliedTwo.ok, true, JSON.stringify(authorityAppliedTwo));
const credentialsThree = issueCredentials(engine, authorityAppliedTwo.envelope, 3);
const authorityLegalThree = engine.legalSpace(authorityAppliedTwo.envelope, {
  seatAuthority: credentialsThree.authority,
});
assert.equal(authorityLegalThree.finiteActions.every((entry) => (
  entry.action.attackProfileKey === HAYWIRE
    && entry.action.executorId === OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID
)), true);
const authorityThird = authorityLegalThree.finiteActions.find((entry) => (
  entry.action.targetId === "p2-goliath-b"
));
assert.ok(authorityThird);
const authorityAppliedThree = applyFinite(
  engine,
  authorityAppliedTwo.envelope,
  credentialsThree,
  authorityThird,
  "sidearm-pinpoint-authority-three",
);
assert.equal(authorityAppliedThree.ok, true, JSON.stringify(authorityAppliedThree));
assert.equal(authorityAppliedThree.envelope.state.pendingRangedAttackSequence, undefined);
acceptance.push("authority_v3_preserves_declared_profile_set_across_three_confirmed_receipts");

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
      geometryVersion: "fixed_point_round_base_v1",
    }],
    ["actionSchema", {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v3",
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

const replayEngine = authoritativeEngine("ticket-11-sidearm-pinpoint-rotated-seal-v2");
registerReplayDependencies(replayEngine);
const journal = [
  authorityAppliedOne.receipt,
  authorityAppliedTwo.receipt,
  authorityAppliedThree.receipt,
];
const replayed = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityAppliedThree.envelope.stateHash);
const tamperedJournal = journal.map((receipt) => structuredClone(receipt));
tamperedJournal[2].events.push({ type: "forged_fourth_batch" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("three_batch_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "888b4340397e9b504444b0d8094c75b13bb04f50f3766ce325911a5bd893735d");
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 337);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice32_runtime_action_schema_and_rules_display_remain_frozen");

const nonFinalInitialBatch = initialBatches.find((candidate) => !candidate.sequenceFinalBatch);
assert.ok(nonFinalInitialBatch);
assert.deepEqual([...nonFinalInitialBatch.ruleAtomIds].sort(),
  [...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_ATOM_IDS].sort());
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_sidearm_pinpoint_rule_slice_verification_v1",
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
  rulesTruth: "official_sidearm_pinpoint_sequential_ranged_batch_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-sidearm-pinpoint-rule-slice-v1-report.json"),
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
