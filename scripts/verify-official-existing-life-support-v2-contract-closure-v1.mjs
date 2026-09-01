#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalStarcraftTmgJson, hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createOfficialExistingLifeSupportV2ContractClosureRuleSliceV1,
  verifyOfficialExistingLifeSupportV2ContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-life-support-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialLifeSupportV2RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-life-support-v2-relationship-contract-v1.mjs";
import {
  applyOfficialMedicLifeSupportV2,
  enumerateOfficialMedicLifeSupportV2,
  openOfficialMedicLifeSupportWindowV2,
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
  OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
} from "../packages/rule-atoms/official-medic-life-support-reaction-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import {
  action,
  currentReactionState,
  plan,
} from "./verify-official-medic-life-support-v2-public-contract-v1.mjs";
import { currentMovementState } from
  "./verify-official-academy-medic-v2-public-contract-v1.mjs";
import { matchBinding as fixtureMatchBinding } from
  "./verify-official-medic-medpack-v2-public-contract-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const EXPECTED = Object.freeze({
  sliceHash: "f40b9709b700518a15eebaa5594a8620d7d6fc77ee07ea7c27aa6ac4725d7971",
  catalogueHash: "48f9f27cf603ce6f183e16ee66d4e7cc4b2d0108c4352302ec13eadf6c49a4b7",
  runtimeHash: "fd1c0889ac76848f3d20ebe943f8467e363c0cf6139697ba72046c7968fa05c8",
  graphHash: "9c6060ead883517424891970a4f8071525691f6f85b49dc5f2519ee7decfe766",
  sourceSnapshotHash: "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61",
  datasetHash: "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63",
  gameplayDataBundleHash:
    "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const SOURCE_HASHES = Object.freeze({
  "rule-atoms/official-medic-life-support-reaction-executor-v1.mjs":
    "8dd9754a137ceb607b282f7b9f451fab73d4976ef040e405b27bcc11c2dd8423",
  "rule-atoms/official-current-life-support-data-adapter-v2.mjs":
    "867f3c6ac2b16eb9534209ca0718ea6b2cb602d50a0ad1372ce88cfeb683499c",
  "rule-atoms/official-medic-life-support-reaction-executor-v2.mjs":
    "952566b307e49d9cffff5d9e47f9e3fef9347adc9c73c58e8ba100b7ba1678f2",
  "rule-atoms/official-life-support-v2-relationship-contract-v1.mjs":
    "395036e73e7270ffcc1bca20dd6aaa73f77b8a0285cae66ebfc0252e9411f931",
});
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
const LIVE_HASHES = Object.freeze({
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fetchOfficial(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      lastError = new Error(`HTTP_${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function protectedStateHash(state) {
  return hashStarcraftTmgContract({
    scores: state.scores,
    missionMarkers: state.missionMarkers,
    officialGameplayDataBundle: state.officialGameplayDataBundle,
    officialMissionSetupBinding: state.officialMissionSetupBinding,
    officialRoundSupplyState: state.officialRoundSupplyState,
    supplyLossLedger: state.supplyLossLedger,
    terminal: state.terminal,
    gameOver: state.gameOver,
    winner: state.winner,
    terminalReason: state.terminalReason,
  });
}

function runtimeStep(runtime, state, matchBinding, sideKey, predicate, options = {}) {
  const candidates = runtime.enumerate(state, {
    sideKey,
    includeDisabled: false,
    matchBinding,
  }).candidates;
  const candidate = candidates.find(predicate);
  assert.ok(candidate, JSON.stringify(candidates));
  return runtime.apply(state, action(candidate), { matchBinding, ...options });
}

const acceptance = [];
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-academy-medic-v2-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingLifeSupportV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingLifeSupportV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash, EXPECTED.sliceHash);
assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
assert.equal(slice.versionReassignedRuleAtomIds.length, 7);
acceptance.push("slice_69_migrates_seven_existing_atoms_without_new_atom_or_charge");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const extension = createOfficialLifeSupportV2RelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(slice.catalogueHash, EXPECTED.catalogueHash);
assert.equal(runtime.descriptor.runtimeHash, EXPECTED.runtimeHash);
assert.equal(graph.graphHash, EXPECTED.graphHash);
assert.deepEqual([graph.nodes.length, graph.edges.length, graph.coverageScopes.length],
  [8029, 25632, 34]);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 379,
  partialContractAtoms: 4,
  noContractAtoms: 38,
  executors: 42,
  declaredStateContractExecutors: 35,
  missingStateContractExecutors: 7,
});
const lifeSupportScope = graph.coverageScopes.find((entry) => (
  entry.executorId === OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID
));
assert.ok(lifeSupportScope);
const missingWrite = lifeSupportScope.requiredEdges.find((edge) => (
  edge.relationship === "writes"
));
assert.ok(missingWrite);
const brokenBody = structuredClone(graph);
delete brokenBody.graphHash;
brokenBody.edges = brokenBody.edges.filter((edge) => !(
    edge.scopeId === missingWrite.scopeId
      && edge.from === missingWrite.from
      && edge.relationship === missingWrite.relationship
      && edge.to === missingWrite.to
));
const brokenAudit = auditRuleRelationshipGraphV1({
  ...brokenBody,
  graphHash: hashStarcraftTmgContract(brokenBody),
});
assert.equal(brokenAudit.valid, false);
assert.ok(brokenAudit.counts.blockingGaps > 0);
acceptance.push("life_support_state_contract_is_strict_and_missing_required_write_fails_closed");

const sourceHashes = {};
for (const [relativePath, expectedHash] of Object.entries(SOURCE_HASHES)) {
  const actualHash = sha256(await readFile(path.join(ROOT, "packages", relativePath)));
  assert.equal(actualHash, expectedHash, relativePath);
  sourceHashes[relativePath] = actualHash;
}
acceptance.push("frozen_v1_and_current_adapter_executor_relationship_bytes_are_exact");

const liveReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const dataset = createOfficialCommandCenterDataset({
  snapshot: liveReport.commandSnapshot,
  firestorePayloads,
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:marine", "army_units:medic"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
  reserveDeployData: true,
});
assert.equal(liveReport.commandSnapshot.snapshotHash, EXPECTED.sourceSnapshotHash);
assert.deepEqual(liveReport.commandSnapshot.dataVersions, EXPECTED.dataVersions);
assert.equal(dataset.datasetHash, EXPECTED.datasetHash);
assert.equal(gameplayDataBundle.gameplayDataBundleHash, EXPECTED.gameplayDataBundleHash);
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
const liveBytes = Object.fromEntries(await Promise.all(Object.entries(URLS).map(async (
  [key, url],
) => [key, await fetchOfficial(url)])));
const liveHashes = Object.fromEntries(Object.entries(liveBytes).map(([key, bytes]) => [
  key,
  ["corePdf", "terranP2p"].includes(key)
    ? sha256(bytes)
    : sha256(`${canonicalStarcraftTmgJson(JSON.parse(bytes.toString("utf8")))}\n`),
]));
assert.deepEqual(liveHashes, LIVE_HASHES);
acceptance.push("ten_live_official_sources_confirm_latest_71_69_48_without_repository_fallback");

const matchBinding = {
  ...structuredClone(fixtureMatchBinding),
  rulesRuntimeBinding: {
    runtimeHash: runtime.descriptor.runtimeHash,
    catalogueHash: slice.catalogueHash,
  },
};
const attackAction = {
  actionType: "ranged_attack",
  sideKey: "player2",
  pieceId: "p2-marine",
  targetId: "p1-marine",
};
const baseState = currentReactionState();
const baseOpened = openOfficialMedicLifeSupportWindowV2(baseState, {
  attackAction,
  totalDamageReactionPlan: plan,
  matchBinding,
});
const baseChoices = enumerateOfficialMedicLifeSupportV2(baseOpened.state, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
const baseUse = baseChoices.find((candidate) => (
  candidate.actionType === OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE
));
const basePass = baseChoices.find((candidate) => (
  candidate.actionType === OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE
));
assert.ok(baseUse);
assert.ok(basePass);
assert.equal(baseUse.lifeSupportBaseReduction, 2);
assert.equal(baseUse.passiveBonus, 0);
assert.equal(baseUse.resourceCost, 1);
assert.deepEqual(baseUse.cardResourceIds, ["p1-taf"]);
const beforeProtectedHash = protectedStateHash(baseOpened.state);
const baseApplied = applyOfficialMedicLifeSupportV2(
  baseOpened.state,
  action(baseUse),
  { matchBinding },
);
assert.equal(protectedStateHash(baseApplied.state), beforeProtectedHash);
assert.deepEqual(baseApplied.state.pieces.find((piece) => piece.id === "p1-medic")
  .selectedUpgradeNames, ["Medpack"]);
assert.equal(baseApplied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  EXPECTED.gameplayDataBundleHash);
const stale = action(baseUse);
stale.dataAdapterReceiptHash = "0".repeat(64);
assert.throws(
  () => applyOfficialMedicLifeSupportV2(baseOpened.state, stale, { matchBinding }),
  /LIFE_SUPPORT_V2_ACTION_STALE/u,
);
acceptance.push("current_medic_baseline_projects_to_one_cp_life_support_with_exact_stale_rejection");

const stabilizerState = currentReactionState();
stabilizerState.pieces.find((piece) => piece.id === "p1-medic")
  .selectedUpgradeNames = ["Medpack", "Stabilizer Medpacks"];
const stabilizerOpened = openOfficialMedicLifeSupportWindowV2(stabilizerState, {
  attackAction,
  totalDamageReactionPlan: plan,
  matchBinding,
});
const stabilizerUse = enumerateOfficialMedicLifeSupportV2(stabilizerOpened.state, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
}).find((candidate) => candidate.actionType === OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE);
assert.ok(stabilizerUse);
assert.equal(stabilizerUse.lifeSupportBaseReduction, 2);
assert.equal(stabilizerUse.passiveBonus, 1);
assert.equal(stabilizerUse.lifeSupportReduction, 3);
assert.deepEqual(stabilizerUse.cardResourceIds, ["p1-taf"]);
const stabilizerApplied = applyOfficialMedicLifeSupportV2(
  stabilizerOpened.state,
  action(stabilizerUse),
  { matchBinding },
);
assert.deepEqual(stabilizerApplied.state.pieces.find((piece) => piece.id === "p1-medic")
  .selectedUpgradeNames, ["Medpack", "Stabilizer Medpacks"]);
const invalidLoadout = currentReactionState();
invalidLoadout.pieces.find((piece) => piece.id === "p1-medic")
  .selectedUpgradeNames = ["Stabilizer Medpacks"];
assert.throws(
  () => openOfficialMedicLifeSupportWindowV2(invalidLoadout, {
    attackAction,
    totalDamageReactionPlan: plan,
    matchBinding,
  }),
  /LIFE_SUPPORT_DATA_ADAPTER_V2_CURRENT_LOADOUT_SCOPE_INVALID/u,
);
acceptance.push("stabilizer_bonus_requires_explicit_selection_and_shares_exact_one_cp_reaction_cost");

let opticalState = currentMovementState();
opticalState = runtimeStep(runtime, opticalState, matchBinding, "player1", (candidate) => (
  candidate.executorId === "authority.academy-medic-ability-v2"
    && candidate.actionType === "declare_ability"
    && candidate.abilityId === "optical_flare"
    && candidate.targetId === "p2-marine"
)).state;
opticalState = runtimeStep(runtime, opticalState, matchBinding, "player1", (candidate) => (
  candidate.executorId === "authority.academy-medic-ability-v2"
    && candidate.actionType === "use_ability_reaction"
)).state;
opticalState = runtimeStep(runtime, opticalState, matchBinding, "player1", (candidate) => (
  candidate.executorId === "authority.academy-medic-ability-v2"
    && candidate.actionType === "resolve_ability"
    && candidate.cardResourceIds?.includes("p1-academy")
)).state;
opticalState = runtimeStep(runtime, opticalState, matchBinding, "player2", (candidate) => (
  candidate.executorId === "authority.medic-restoration-reaction-v2"
    && candidate.actionType === "pass_restoration_reaction"
)).state;
opticalState.phase = "assault";
opticalState.activeSideKey = "player2";
opticalState.phaseFirstActorByRound[`${opticalState.round}:assault`] = {
  round: opticalState.round,
  phase: "assault",
  markerHolderSideKey: "player1",
  chosenFirstActorSideKey: "player2",
};
for (const player of Object.values(opticalState.players)) player.passedPhases = {};
for (const piece of opticalState.pieces) piece.activatedPhases.assault = false;
const opticalTarget = opticalState.pieces.find((piece) => piece.id === "p1-marine");
opticalTarget.damageMarker = 1;
const supportingMedic = opticalState.pieces.find((piece) => piece.id === "p1-medic");
supportingMedic.models.forEach((model, index) => {
  model.xInches = 17 + (index * 2);
  model.yInches = 5;
});
const statusesBeforeOptical = hashStarcraftTmgContract(opticalState.pieces.map((piece) => ({
  pieceId: piece.id,
  statuses: piece.statuses,
})));
const opticalAttack = runtimeStep(runtime, opticalState, matchBinding, "player2", (candidate) => (
  candidate.executorId === "authority.optical-flare-ranged-consumer-v2"
    && candidate.pieceId === "p2-marine"
    && candidate.targetId === "p1-marine"
), { chanceReveals: [6, 6, 6, 1, 1] });
assert.equal(opticalAttack.lifeSupportReactionOpened, true);
assert.ok(opticalAttack.state.pendingLifeSupportReaction);
const routedChoices = runtime.enumerate(opticalAttack.state, {
  sideKey: "player1",
  matchBinding,
}).candidates;
assert.equal(routedChoices.every((candidate) => (
  candidate.executorId === OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID
)), true);
const routedUse = routedChoices.find((candidate) => (
  candidate.actionType === OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE
));
assert.ok(routedUse);
const routedApplied = runtime.apply(opticalAttack.state, action(routedUse), { matchBinding });
assert.equal(routedApplied.executorId, OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID);
assert.equal(routedApplied.state.pendingLifeSupportReaction, undefined);
assert.equal(hashStarcraftTmgContract(routedApplied.state.pieces.map((piece) => ({
  pieceId: piece.id,
  statuses: piece.statuses,
}))), statusesBeforeOptical);
acceptance.push("optical_v2_defers_total_damage_and_runtime_routes_only_life_support_v2");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T12:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-69-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `slice-69-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `slice-69-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const engine = authorityEngine("ticket-11-slice-69-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-69-life-support-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: liveReport.commandSnapshot,
    },
    dataSnapshot: {
      artifactId: "official-gameplay-data-bundle",
      content: gameplayDataBundle,
    },
  },
  state: baseOpened.state,
});
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({
    kind: "action-schema",
    schemaVersion: "hybrid_legal_space_v25",
  }));
const access = credentials(engine, initialEnvelope, "life-support-use");
const legalSpace = engine.legalSpace(initialEnvelope, { seatAuthority: access.authority });
const finite = legalSpace.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID
    && entry.action.actionType === OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE
));
assert.ok(finite, JSON.stringify(legalSpace));
const preview = engine.preview({
  envelope: initialEnvelope,
  seatAuthority: access.authority,
  proposal: { kind: "finite", actionKey: finite.actionKey },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmed = engine.confirmPreview({
  envelope: initialEnvelope,
  preview: preview.preview,
  seatAuthority: access.authority,
});
assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
const applied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "slice-69-life-support-use",
});
assert.equal(applied.ok, true, JSON.stringify(applied));
assert.equal(applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");

function registerReplayDependencies(replayEngine) {
  for (const [kind, content] of [
    ["sourceSnapshot", liveReport.commandSnapshot],
    ["dataSnapshot", gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initialEnvelope.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initialEnvelope.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initialEnvelope.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    }],
    ["actionSchema", {
      kind: "action-schema",
      schemaVersion: "hybrid_legal_space_v25",
    }],
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
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}`
      + "\n\nThis development artifact preserves the rules identity used by the match.",
  });
}
const journal = [applied.receipt];
const replayEngine = authorityEngine("ticket-11-slice-69-rotated-short-seal-v2");
registerReplayDependencies(replayEngine);
const replayed = replayEngine.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
const tampered = structuredClone(journal);
tampered[0].action.dataAdapterReceiptHash = "0".repeat(64);
const rejected = replayEngine.replay({ initialEnvelope, journal: tampered });
assert.equal(rejected.ok, false);
assert.equal(rejected.reason, "SIGNATURE_INVALID");
acceptance.push("authority_preview_confirm_apply_and_ed25519_replay_survive_hmac_rotation");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "0e94d259842feec3fb872bb01ed3e6ba0729f2c53e572c76c6e30578a81f4e6e");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.rulesEligible, false);
assert.equal(slice.productionRoomEligible, false);
assert.equal(slice.trainingTruth, false);
acceptance.push("frozen_v1_runtime_display_and_separate_skill_dsh_muzero_gates_are_retained");

const report = {
  schema: "starcraft_tmg_existing_life_support_v2_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  slice,
  sliceAudit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph: {
    graphHash: graph.graphHash,
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    scopes: graph.coverageScopes.length,
  },
  graphAudit,
  coverage,
  sourceHashes,
  liveOfficialRevalidation: {
    urls: URLS,
    hashes: liveHashes,
    sourceSnapshotHash: liveReport.commandSnapshot.snapshotHash,
    datasetHash: dataset.datasetHash,
    gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
    dataVersions: dataset.dataVersions,
    repositoryFallbackUsed: gameplayDataBundle.repositoryFallbackAllowed,
  },
  authority: {
    actionSchemaVersion: "hybrid_legal_space_v25",
    receiptCount: journal.length,
    finalStateHash: applied.envelope.stateHash,
    ed25519Verified: true,
    replayAfterHmacRotation: true,
    tamperRejected: true,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "current_life_support_v2_plus_frozen_v1_history",
  trainingTruth: false,
};
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-life-support-v2-contract-closure-v1-report.json",
), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: graph.graphHash,
  graph: report.graph,
  coverage: coverage.counts,
  liveOfficialSources: Object.keys(liveHashes).length,
  authorityReceipts: journal.length,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
