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
  createOfficialExistingAcademyMedicV2ContractClosureRuleSliceV1,
  verifyOfficialExistingAcademyMedicV2ContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-academy-medic-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialAcademyMedicV2RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-academy-medic-v2-relationship-contract-v1.mjs";
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
  currentInitialState,
} from "./verify-official-academy-medic-v2-public-contract-v1.mjs";

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
  sliceHash: "18d162941b3f83c7efed2e52c4dea1b3ec57854878139ed34e3e55723f77efca",
  catalogueHash: "4043ad65b05c9f5c8742a7bfffeea36404575f58b10d9c5a51081cd06cfcbf8a",
  runtimeHash: "0e94d259842feec3fb872bb01ed3e6ba0729f2c53e572c76c6e30578a81f4e6e",
  graphHash: "c4aacd18eef0e9d4ed63ef1925eaf84f75af7b728df59cf3a04f152aa82a21e4",
  sourceSnapshotHash: "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61",
  datasetHash: "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63",
  gameplayDataBundleHash:
    "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const SOURCE_HASHES = Object.freeze({
  "rule-atoms/official-academy-medic-ability-executor-v1.mjs":
    "f6d1c7051f916feddafaac54163f491987935cd77b0ce80de2ea51ebc5491e95",
  "rule-atoms/official-medic-restoration-reaction-executor-v1.mjs":
    "43d848fd91d8026bc141bde294f114353ef89ab2d4a112c1a381c368f08ac69c",
  "rule-atoms/official-optical-flare-ranged-consumer-executor-v1.mjs":
    "c0af4df57a9b62383f6ce70660dea6b4160559ed2e0542a614a05e4cf6d4df55",
  "rule-atoms/official-current-academy-medic-data-adapter-v2.mjs":
    "fb2eb41ce23cc4ae17c14ed3dceee56fa2bfbbd0e5238c22969eda29e6a9088a",
  "rule-atoms/official-academy-medic-ability-executor-v2.mjs":
    "ec2e5e02d397a569c678fc538d14f4a8b227ee43d6dc3f63d40f2c626ba514b0",
  "rule-atoms/official-medic-restoration-reaction-executor-v2.mjs":
    "9838f6c31468c2f74c427e6775975b46ee924751dca970156d167a41f02fd1d6",
  "rule-atoms/official-optical-flare-ranged-consumer-executor-v2.mjs":
    "496b4623282b13df2a24cfd3e7e8a5fcd9e94ad1613d1a69a18c97c73e3933f7",
  "rule-atoms/official-academy-medic-v2-relationship-contract-v1.mjs":
    "39ae53ae23f17cea69ef04e29fe88f2ae8b8b9dc4c833ecf1903e5f103003332",
  "rule-atoms/official-executable-rule-runtime-v1.mjs":
    "f1cd16668376fbdb0dab8c133fe77c4572c04b5b56c87bc6cc5b17ae5a3784c1",
  "authoritative-engine/transition-v1.mjs":
    "4d0ef223f232b55bb332b29b2dec909b5dff4cb908065817849fd92f01e43518",
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

function credentials(engine, envelope, seatKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `slice-68-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `slice-68-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, seatKey, predicate, suffix) {
  const access = credentials(engine, envelope, seatKey, suffix);
  const legalSpace = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legalSpace.finiteActions.find((entry) => predicate(entry.action));
  assert.ok(finite, `${suffix}:${JSON.stringify(legalSpace.disabledDiagnostics)}`);
  const preview = engine.preview({
    envelope,
    seatAuthority: access.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: access.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const result = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: access.authority,
    controlLease: access.lease,
    idempotencyKey: `slice-68-${suffix}`,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

const acceptance = [];
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-ranged-attack-v6-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingAcademyMedicV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingAcademyMedicV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash, EXPECTED.sliceHash);
assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
assert.equal(slice.versionReassignedRuleAtomIds.length, 12);
acceptance.push("slice_68_migrates_twelve_existing_atoms_without_new_atom_or_charge");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: createOfficialAcademyMedicV2RelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  }),
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
assert.equal(slice.catalogueHash, EXPECTED.catalogueHash);
assert.equal(runtime.descriptor.runtimeHash, EXPECTED.runtimeHash);
assert.equal(graph.graphHash, EXPECTED.graphHash);
assert.equal(graph.nodes.length, 7970);
assert.equal(graph.edges.length, 25373);
assert.equal(graph.coverageScopes.length, 33);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 372,
  partialContractAtoms: 4,
  noContractAtoms: 45,
  executors: 42,
  declaredStateContractExecutors: 34,
  missingStateContractExecutors: 8,
});
acceptance.push("three_current_executor_scopes_and_strict_partial_none_denominators_are_frozen");

const sourceHashes = {};
for (const [relativePath, expectedHash] of Object.entries(SOURCE_HASHES)) {
  const actualHash = sha256(await readFile(path.join(ROOT, "packages", relativePath)));
  assert.equal(actualHash, expectedHash, relativePath);
  sourceHashes[relativePath] = actualHash;
}
acceptance.push("frozen_v1_and_current_v2_adapter_executor_runtime_authority_bytes_are_exact");

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
acceptance.push("latest_official_71_69_48_unified_bundle_is_bound_without_repository_fallback");

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
acceptance.push("ten_live_official_firestore_and_pdf_sources_match_current_exact_hashes");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-29T12:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-68-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}
const engine = authorityEngine("ticket-11-slice-68-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-68-academy-medic-room",
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
  state: currentInitialState(),
});
assert.equal(
  initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({
    kind: "action-schema",
    schemaVersion: "hybrid_legal_space_v25",
  }),
);
const started = applyFinite(engine, initialEnvelope, "player1", (candidate) => (
  candidate.executorId === "authority.start-of-round-v5"
), "start-v5");
const initiative = applyFinite(engine, started.envelope, "player1", (candidate) => (
  candidate.actionType === "choose_first_actor"
    && candidate.chosenFirstActorSideKey === "player1"
), "movement-initiative");
const declared = applyFinite(engine, initiative.envelope, "player1", (candidate) => (
  candidate.executorId === "authority.academy-medic-ability-v2"
    && candidate.actionType === "declare_ability"
    && candidate.abilityId === "optical_flare"
    && candidate.targetId === "p2-marine"
    && candidate.abilityWindow === "before_action"
), "academy-declare");
const reacted = applyFinite(engine, declared.envelope, "player1", (candidate) => (
  candidate.executorId === "authority.academy-medic-ability-v2"
    && candidate.actionType === "use_ability_reaction"
), "academy-react");
const resolved = applyFinite(engine, reacted.envelope, "player1", (candidate) => (
  candidate.executorId === "authority.academy-medic-ability-v2"
    && candidate.actionType === "resolve_ability"
    && candidate.cardResourceIds?.includes("p1-academy")
), "academy-resolve");
assert.equal(resolved.receipt.action.dataAdapterReceiptHash.length, 64);
const restoration = applyFinite(engine, resolved.envelope, "player2", (candidate) => (
  candidate.executorId === "authority.medic-restoration-reaction-v2"
    && candidate.actionType === "use_restoration_reaction"
), "restoration-use");
assert.deepEqual(
  restoration.envelope.state.pieces.find((piece) => piece.id === "p2-marine").statuses,
  ["stationary"],
);
assert.equal(restoration.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("authority_preview_confirm_apply_executes_academy_and_restoration_multistage_flow");

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
const journal = [started, initiative, declared, reacted, resolved, restoration]
  .map((result) => result.receipt);
const replayEngine = authorityEngine("ticket-11-slice-68-rotated-short-seal-v2");
registerReplayDependencies(replayEngine);
const replayed = replayEngine.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, restoration.envelope.stateHash);
const tampered = structuredClone(journal);
tampered[4].action.dataAdapterReceiptHash = "0".repeat(64);
const rejected = replayEngine.replay({ initialEnvelope, journal: tampered });
assert.equal(rejected.ok, false);
assert.equal(rejected.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_adapter_hash_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41");
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice_67_runtime_and_v1_rules_display_remain_frozen_and_queryable");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.equal(slice.harness.trainingTraceCandidates.length, 0);
assert.equal(slice.rulesEligible, false);
assert.equal(slice.productionRoomEligible, false);
assert.equal(slice.trainingTruth, false);
acceptance.push("rules_skill_dsh_muzero_memory_and_training_promotion_remain_separate");

const report = {
  schema: "starcraft_tmg_existing_academy_medic_v2_contract_closure_verification_v1",
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
    finalStateHash: restoration.envelope.stateHash,
    ed25519Verified: true,
    replayAfterHmacRotation: true,
    tamperRejected: true,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth:
    "academy_medic_restoration_optical_flare_current_v2_and_frozen_v1_history",
  trainingTruth: false,
};
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-academy-medic-v2-contract-closure-v1-report.json",
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
