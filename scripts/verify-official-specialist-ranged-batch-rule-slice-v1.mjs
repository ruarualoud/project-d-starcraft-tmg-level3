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
import { createOfficialSpecialistBatchEffectKernelV1 } from
  "../packages/rule-atoms/official-specialist-batch-effect-kernel-v1.mjs";
import {
  OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS,
} from "../packages/rule-atoms/official-specialist-ranged-batch-executor-v1.mjs";
import {
  createOfficialSpecialistRangedBatchRuleSliceV1,
  verifyOfficialSpecialistRangedBatchRuleSliceV1,
} from "../packages/rule-atoms/official-specialist-ranged-batch-rule-slice-v1.mjs";
import { OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND } from
  "../packages/rule-atoms/official-specialist-loadout-executor-v1.mjs";
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
const MARINE_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/marine";
const GOLIATH_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/goliath";
const PART8_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/iuUyObNTQ2M8xK4IUqzC";
const PART9_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/Rj6sMyNODPQ8OHUc9Clp";

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
  path.join(OUTPUT_DIR, "official-specialist-loadout-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialSpecialistRangedBatchRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialSpecialistRangedBatchRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 337);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 575);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 6);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.deepEqual(slice.newlyExecutableRuleAtomIds,
  [...OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS]);
assert.equal(slice.effectKernel.registeredEffectAtoms, 14);
assert.equal(slice.effectKernel.executableEffectAtomIds.length, 10);
assert.equal(slice.effectKernel.knownUnimplementedEffectAtoms, 4);
assert.equal(slice.specialistProgress.separateAttackBatchExecutable, true);
assert.equal(slice.specialistProgress.sidearmExecutable, false);
assert.equal(slice.specialistProgress.indirectFireExecutable, false);
acceptance.push("catalogue_promotes_six_batch_and_single_visible_target_damage_atoms_only");

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

const [
  versionsResponse,
  marineResponse,
  goliathResponse,
  part8Response,
  part9Response,
  coreResponse,
  terranResponse,
] = await Promise.all([
  fetchOfficial(VERSIONS_URL, "official versions"),
  fetchOfficial(MARINE_URL, "official Marine"),
  fetchOfficial(GOLIATH_URL, "official Goliath"),
  fetchOfficial(PART8_URL, "official Part 8"),
  fetchOfficial(PART9_URL, "official Part 9"),
  fetchOfficial(CORE_PDF_URL, "official Core PDF"),
  fetchOfficial(TERRAN_P2P_URL, "official Terran P2P PDF"),
]);
const versionsDocument = await versionsResponse.json();
const marineDocument = await marineResponse.json();
const goliathDocument = await goliathResponse.json();
const part8Document = await part8Response.json();
const part9Document = await part9Response.json();
const versionsCanonicalHash = documentHash(versionsDocument);
const marineCanonicalHash = documentHash(marineDocument);
const goliathCanonicalHash = documentHash(goliathDocument);
const part8CanonicalHash = documentHash(part8Document);
const part9CanonicalHash = documentHash(part9Document);
const corePdfHash = sha256(Buffer.from(await coreResponse.arrayBuffer()));
const terranP2pHash = sha256(Buffer.from(await terranResponse.arrayBuffer()));
assert.deepEqual({
  unitsVersion: versionsDocument.fields.unitsVersion.integerValue,
  cardsVersion: versionsDocument.fields.cardsVersion.integerValue,
  rulesVersion: versionsDocument.fields.rulesVersion.integerValue,
}, { unitsVersion: "71", cardsVersion: "69", rulesVersion: "48" });
assert.equal(versionsCanonicalHash,
  "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733");
assert.equal(marineCanonicalHash,
  "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1");
assert.equal(goliathCanonicalHash,
  "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc");
assert.equal(part8CanonicalHash,
  "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b");
assert.equal(part9CanonicalHash,
  "0b7f93150a5c915fb1fe52f2b2a276e5eee2f77fa251b3be583de71837bfd2cb");
assert.equal(corePdfHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
assert.equal(terranP2pHash,
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c");
assert.equal(goliathDocument.fields.stats.mapValue.fields.hp.stringValue, "10");
assert.equal(goliathDocument.updateTime, "2026-03-16T21:23:54.477693Z");
acceptance.push("live_versions_units_rules_and_pdfs_match_the_reviewed_current_sources");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 337);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 689);
assert.equal(runtime.descriptor.runtimeHash,
  "888b4340397e9b504444b0d8094c75b13bb04f50f3766ce325911a5bd893735d");

function marinePiece() {
  return {
    id: "p1-marines",
    name: "Marine",
    sideKey: "player1",
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash:
      "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    currentModels: 6,
    maxModels: 6,
    currentSupply: 1,
    isOnField: false,
    isDestroyed: false,
    statuses: [],
    combatEffects: [],
    assaultEffects: [],
    selectedUpgradeNames: ["AGG-12"],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: Array.from({ length: 6 }, (_unused, index) => ({
      id: `p1-marines-m${index + 1}`,
      isOnField: false,
      isDestroyed: false,
    })),
  };
}

function baseState() {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "army_building",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
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
    pieces: [marinePiece()],
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
const armyState = baseState();
const armyLegal = runtime.enumerate(armyState, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
});
const loadoutDomain = armyLegal.parameterDomains.find((domain) => (
  domain.parameterKind === OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND
));
assert.ok(loadoutDomain);
const loadoutInstantiation = runtime.instantiate(armyState, loadoutDomain, {
  assignments: [{ weaponName: "AGG-12", modelId: "p1-marines-m1" }],
}, { matchBinding: syntheticMatchBinding });
const configuredTransition = runtime.apply(
  armyState,
  loadoutInstantiation.action,
  { matchBinding: syntheticMatchBinding, postRevision: 1 },
);
const configuredMarine = configuredTransition.state.pieces[0];
assert.equal(configuredMarine.specialistLoadout.attackBatchExecutionAuthorized, false);
assert.equal(configuredMarine.specialistLoadout.attackBatchStatus, "review_required");
assert.deepEqual(configuredMarine.models[0].assaultWeaponNames, ["AGG-12"]);
assert.deepEqual(configuredMarine.models[1].assaultWeaponNames, ["C-14 rifle"]);
acceptance.push("slice31_frozen_loadout_is_consumed_without_rewriting_its_old_authority_claim");

function onFieldModel(model, index) {
  return {
    ...structuredClone(model),
    xInches: 5,
    yInches: 5 + (index * 1.5),
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

function goliath(id, yInches) {
  return {
    id,
    name: "Goliath",
    sideKey: "player2",
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
    selectedUpgradeNames: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [{
      id: `${id}-m1`,
      xInches: 16,
      yInches,
      baseShape: "round",
      baseWidthInches: 3.15,
      baseDepthInches: 3.15,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
      isOnField: true,
      isDestroyed: false,
    }],
  };
}

function battleState() {
  const state = structuredClone(configuredTransition.state);
  state.phase = "assault";
  state.activeSideKey = "player1";
  state.round = 2;
  state.phaseFirstActorByRound = {
    "2:assault": {
      round: 2,
      phase: "assault",
      markerHolderSideKey: "player1",
      chosenFirstActorSideKey: "player1",
    },
  };
  state.log = [];
  const marine = state.pieces[0];
  marine.isOnField = true;
  marine.combatTag = "ground";
  marine.models = marine.models.map(onFieldModel);
  state.pieces.push(goliath("p2-goliath-a", 7));
  state.pieces.push(goliath("p2-goliath-b", 12));
  return state;
}

const firstLegal = runtime.enumerate(battleState(), {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: syntheticMatchBinding,
});
const firstBatches = firstLegal.candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID
));
assert.equal(firstBatches.length, 4, JSON.stringify(firstLegal.candidates, null, 2));
assert.deepEqual([...new Set(firstBatches.map((candidate) => candidate.weaponName))].sort(),
  ["AGG-12", "C-14 rifle"]);
assert.deepEqual(firstBatches.find((candidate) => candidate.weaponName === "AGG-12").chance.layout,
  { hit: 2, surge: 1, armour: 2, evade: 0 });
assert.deepEqual(firstBatches.find((candidate) => candidate.weaponName === "C-14 rifle").chance.layout,
  { hit: 10, surge: 1, armour: 10, evade: 0 });
acceptance.push("initial_legal_space_exposes_either_profile_against_either_live_target");

const c14First = firstBatches.find((candidate) => (
  candidate.weaponName === "C-14 rifle" && candidate.targetId === "p2-goliath-a"
));
const afterC14 = runtime.apply(battleState(), action(c14First), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: [
    ...Array.from({ length: 10 }, () => 3),
    1,
    ...Array.from({ length: 10 }, () => 1),
  ],
});
assert.equal(afterC14.sequenceComplete, false);
assert.equal(afterC14.state.activeSideKey, "player1");
assert.equal(afterC14.state.pieces[0].activatedPhases.assault, false);
assert.equal(afterC14.state.pieces[1].isDestroyed, true);
assert.match(afterC14.state.pendingRangedAttackSequence.pendingHash, /^[a-f0-9]{64}$/u);
const continuationLegal = runtime.enumerate(afterC14.state, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
});
assert.equal(continuationLegal.stateSummary.pendingRangedAttackSequenceHash,
  afterC14.state.pendingRangedAttackSequence.pendingHash);
assert.deepEqual(continuationLegal.stateSummary.remainingBatchProfileKeys,
  ["army_units:marine::assault::AGG-12"]);
assert.equal(continuationLegal.candidates.every((candidate) => (
  candidate.executorId === OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID
    && candidate.weaponName === "AGG-12"
)), true);
assert.equal(continuationLegal.candidates.length, 1);
const afterAgg = runtime.apply(afterC14.state, action(continuationLegal.candidates[0]), {
  matchBinding: syntheticMatchBinding,
  postRevision: 2,
  chanceReveals: [3, 3, 6, 1, 1],
});
assert.equal(afterAgg.sequenceComplete, true);
assert.equal(afterAgg.state.pendingRangedAttackSequence, undefined);
assert.equal(afterAgg.state.pieces[0].activatedPhases.assault, true);
assert.equal(afterAgg.state.activeSideKey, "player2");
assert.equal(afterAgg.state.pieces[2].damageMarker, 2);
acceptance.push("first_batch_retains_priority_and_second_batch_completes_assault_activation");

const aggFirst = firstBatches.find((candidate) => (
  candidate.weaponName === "AGG-12" && candidate.targetId === "p2-goliath-a"
));
const afterAggSameTarget = runtime.apply(battleState(), action(aggFirst), {
  matchBinding: syntheticMatchBinding,
  postRevision: 1,
  chanceReveals: [3, 3, 6, 1, 1],
});
assert.equal(afterAggSameTarget.state.pieces[1].damageMarker, 2);
const sameTargetContinuation = runtime.enumerate(afterAggSameTarget.state, {
  sideKey: "player1",
  matchBinding: syntheticMatchBinding,
}).candidates.find((candidate) => candidate.targetId === "p2-goliath-a");
assert.ok(sameTargetContinuation);
const overflow = runtime.apply(afterAggSameTarget.state, action(sameTargetContinuation), {
  matchBinding: syntheticMatchBinding,
  postRevision: 2,
  chanceReveals: [
    ...Array.from({ length: 10 }, () => 3),
    1,
    ...Array.from({ length: 10 }, () => 1),
  ],
});
assert.equal(overflow.batchReceipt.incomingDamage, 10);
assert.equal(overflow.batchReceipt.appliedDamage, 8);
assert.equal(overflow.batchReceipt.discardedOverflowDamage, 2);
assert.deepEqual(overflow.batchReceipt.casualtyModelIds, ["p2-goliath-a-m1"]);
assert.equal(overflow.state.pieces[1].isDestroyed, true);
acceptance.push("same_target_sequence_caps_visible_casualty_and_discards_unassignable_overflow");

const tamperedPending = structuredClone(afterAggSameTarget.state);
tamperedPending.pendingRangedAttackSequence.remainingBatchProfileKeys = [
  "army_units:marine::assault::AGG-12",
];
assert.throws(
  () => runtime.enumerate(tamperedPending, {
    sideKey: "player1",
    matchBinding: syntheticMatchBinding,
  }),
  /SPECIALIST_BATCH_PENDING_SEQUENCE_INVALID/u,
);
assert.throws(
  () => runtime.apply(afterAggSameTarget.state, {
    actionType: "hold",
    executorId: "authority.assault-hold-v2",
  }, { matchBinding: syntheticMatchBinding }),
  /RULE_RUNTIME_PENDING_SPECIALIST_BATCH_REQUIRED/u,
);
const forgedAction = action(sameTargetContinuation);
forgedAction.contributingModelIds = ["p1-marines-m1", "p1-marines-m2"];
assert.throws(
  () => runtime.apply(afterAggSameTarget.state, forgedAction, {
    matchBinding: syntheticMatchBinding,
    chanceReveals: Array.from({ length: 21 }, () => 1),
  }),
  /SPECIALIST_BATCH_ACTION_MISMATCH/u,
);
const effectKernel = createOfficialSpecialistBatchEffectKernelV1();
assert.throws(
  () => effectKernel.authorize({
    profile: gameplayDataBundle.attackProfileCatalogue.profilesByProfileKey[
      "army_units:marine::assault::AGG-12"
    ],
    specialistLoadout: configuredMarine.specialistLoadout,
    contributingModelIds: ["p1-marines-m2"],
  }),
  /SPECIALIST_BATCH_CARRIER_MISMATCH/u,
);
acceptance.push("pending_sequence_skip_tamper_and_forged_carrier_fail_closed");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-specialist-batch-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function issueCredentials(engine, envelope, fence) {
  const authority = engine.issueSeatAuthority({
    grantId: `specialist-batch-grant-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `specialist-batch-session-${fence}`,
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
  assert.ok(preview.preview.core.chanceTicket.tickets.length > 0);
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

const engine = authoritativeEngine("ticket-11-specialist-batch-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-specialist-batch-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
    dataSnapshot: { artifactId: "official-specialist-batch-gameplay", content: gameplayDataBundle },
  },
  state: battleState(),
});
const firstCredentials = issueCredentials(engine, initial, 1);
const authorityLegalOne = engine.legalSpace(initial, {
  seatAuthority: firstCredentials.authority,
});
const authorityFirst = authorityLegalOne.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID
    && entry.action.weaponName === "AGG-12"
    && entry.action.targetId === "p2-goliath-a"
));
assert.ok(authorityFirst);
const directAuthorityFirst = runtime.enumerate(initial.state, {
  sideKey: "player1",
  matchBinding: initial.matchBinding,
}).candidates.find((candidate) => (
  candidate.executorId === OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID
    && candidate.weaponName === "AGG-12"
    && candidate.targetId === "p2-goliath-a"
));
assert.deepEqual(authorityFirst.action, action(directAuthorityFirst), JSON.stringify({
  authority: authorityFirst.action,
  direct: action(directAuthorityFirst),
}, null, 2));
const authorityAppliedOne = applyFinite(
  engine,
  initial,
  firstCredentials,
  authorityFirst,
  "specialist-batch-authority-one",
);
assert.equal(authorityAppliedOne.ok, true, JSON.stringify(authorityAppliedOne));
assert.equal(authorityAppliedOne.envelope.state.activeSideKey, "player1");
assert.match(authorityAppliedOne.envelope.state.pendingRangedAttackSequence.pendingHash,
  /^[a-f0-9]{64}$/u);
const secondCredentials = issueCredentials(engine, authorityAppliedOne.envelope, 2);
const authorityLegalTwo = engine.legalSpace(authorityAppliedOne.envelope, {
  seatAuthority: secondCredentials.authority,
});
assert.equal(authorityLegalTwo.finiteActions.every((entry) => (
  entry.action.executorId === OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID
)), true);
const authoritySecond = authorityLegalTwo.finiteActions.find((entry) => (
  entry.action.targetId === "p2-goliath-b"
));
assert.ok(authoritySecond);
const authorityAppliedTwo = applyFinite(
  engine,
  authorityAppliedOne.envelope,
  secondCredentials,
  authoritySecond,
  "specialist-batch-authority-two",
);
assert.equal(authorityAppliedTwo.ok, true, JSON.stringify(authorityAppliedTwo));
assert.equal(authorityAppliedTwo.envelope.state.pendingRangedAttackSequence, undefined);
assert.equal(authorityAppliedTwo.envelope.state.pieces[0].activatedPhases.assault, true);
assert.equal(authorityAppliedOne.receipt.trainingTruth, false);
assert.equal(authorityAppliedTwo.receipt.eligibleForTraining, false);
acceptance.push("authority_preview_confirm_apply_exposes_only_the_pending_batch_continuation");

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
      schemaVersion: "hybrid_legal_space_v2",
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

const replayEngine = authoritativeEngine("ticket-11-specialist-batch-rotated-seal-v2");
registerReplayDependencies(replayEngine);
const replayed = replayEngine.replay({
  initialEnvelope: initial,
  journal: [authorityAppliedOne.receipt, authorityAppliedTwo.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityAppliedTwo.envelope.stateHash);
const tamperedJournal = [
  structuredClone(authorityAppliedOne.receipt),
  structuredClone(authorityAppliedTwo.receipt),
];
tamperedJournal[1].events.push({ type: "forged_third_batch" });
const tamperedReplay = replayEngine.replay({ initialEnvelope: initial, journal: tamperedJournal });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("two_batch_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "fdba261a92b50f35d37b15c727141ff615833dfff0a559993ea1db85f85ee54a");
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 331);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice31_runtime_effect_denominator_and_rules_display_remain_frozen");

assert.deepEqual(slice.newlyExecutableRuleAtomIds,
  [...OFFICIAL_SPECIALIST_RANGED_BATCH_NEW_ATOM_IDS]);
assert.deepEqual([...firstBatches[0].ruleAtomIds].sort(),
  [...OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_ATOM_IDS].sort());
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_specialist_ranged_batch_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    versionsUrl: VERSIONS_URL,
    versionsCanonicalHash,
    versionsUpdateTime: versionsDocument.updateTime,
    marineUrl: MARINE_URL,
    marineCanonicalHash,
    marineUpdateTime: marineDocument.updateTime,
    goliathUrl: GOLIATH_URL,
    goliathCanonicalHash,
    goliathUpdateTime: goliathDocument.updateTime,
    part8Url: PART8_URL,
    part8CanonicalHash,
    part8UpdateTime: part8Document.updateTime,
    part9Url: PART9_URL,
    part9CanonicalHash,
    part9UpdateTime: part9Document.updateTime,
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
  rulesTruth: "official_specialist_sequential_ranged_batch_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-specialist-ranged-batch-rule-slice-v1-report.json"),
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
