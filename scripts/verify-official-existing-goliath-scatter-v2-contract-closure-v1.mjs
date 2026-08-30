#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createOfficialExistingGoliathScatterV2ContractClosureRuleSliceV1,
  OFFICIAL_SLICE_70_MIGRATED_ATOM_IDS,
  verifyOfficialExistingGoliathScatterV2ContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-goliath-scatter-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialGoliathScatterV2RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-goliath-scatter-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-goliath-scatter-ranged-batch-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import * as fixture from "./verify-official-goliath-scatter-v2-public-contract-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-life-support-v2-contract-closure-v1-report.json",
), "utf8"));
const liveSourceReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
const acceptance = [];

function action(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function documentHash(document) {
  return sha256(`${canonicalStarcraftTmgJson(document)}\n`);
}

async function fetchOfficial(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response;
      lastError = new Error(`${kind} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const slice = createOfficialExistingGoliathScatterV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialExistingGoliathScatterV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual(audit.counts, {
  executableRuleAtoms: 421,
  reviewRequiredRuleAtoms: 491,
  displayOnlyRuleAtoms: 114,
  changedAtoms: 12,
  strictCompleteAtoms: 391,
  partialContractAtoms: 15,
  noContractAtoms: 15,
  declaredStateContractExecutors: 36,
  missingStateContractExecutors: 6,
});
assert.deepEqual(slice.versionReassignedRuleAtomIds,
  [...OFFICIAL_SLICE_70_MIGRATED_ATOM_IDS]);
assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
acceptance.push("twelve_existing_goliath_atoms_rebound_without_denominator_growth");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const matchBinding = {
  ...fixture.matchBinding,
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const candidates = runtime.enumerate(fixture.battleState(), {
  sideKey: "player1",
  matchBinding,
}).candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID
));
assert.equal(candidates.length, 32);
assert.equal(new Set(candidates.map((candidate) => (
  candidate.selectedBatchProfileKeys.join("+")
))).size, 7);
const single = candidates.find((candidate) => (
  candidate.weaponName === "Scatter Missiles"
    && candidate.targetId === "p2-marine-stationary"
    && candidate.selectedBatchProfileKeys.length === 1
));
assert.ok(single);
const applied = runtime.apply(fixture.battleState(), action(single), {
  matchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: single.chance.count }, () => 1),
});
assert.equal(applied.sequenceComplete, true);
assert.equal(applied.state.activeSideKey, "player2");
assert.equal(applied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  fixture.gameplayDataBundle.gameplayDataBundleHash);
acceptance.push("current_runtime_exposes_32_candidates_and_settles_single_batch");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T14:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-70-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({
    grantId: "slice-70-player1-grant",
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: "slice-70-player1-session",
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const engine = authorityEngine("ticket-11-slice-70-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-70-goliath-scatter-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: liveSourceReport.commandSnapshot,
    },
    dataSnapshot: {
      artifactId: "official-goliath-scatter-gameplay-data-bundle",
      content: fixture.gameplayDataBundle,
    },
  },
  state: fixture.battleState(),
});
assert.equal(initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({
    kind: "action-schema",
    schemaVersion: "hybrid_legal_space_v25",
  }));
const access = credentials(engine, initialEnvelope);
const legalSpace = engine.legalSpace(initialEnvelope, { seatAuthority: access.authority });
const finite = legalSpace.finiteActions.find((entry) => (
  entry.action.executorId === OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID
    && entry.action.weaponName === "Scatter Missiles"
    && entry.action.targetId === "p2-marine-stationary"
    && entry.action.selectedBatchProfileKeys.length === 1
));
assert.ok(finite, JSON.stringify(legalSpace.disabledDiagnostics));
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
const authorityApplied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "slice-70-goliath-scatter-single-batch",
});
assert.equal(authorityApplied.ok, true, JSON.stringify(authorityApplied));
assert.equal(authorityApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");

function registerReplayDependencies(replayEngine) {
  for (const [kind, content] of [
    ["sourceSnapshot", liveSourceReport.commandSnapshot],
    ["dataSnapshot", fixture.gameplayDataBundle],
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

const replayEngine = authorityEngine("ticket-11-slice-70-rotated-short-seal-v2");
registerReplayDependencies(replayEngine);
const journal = [authorityApplied.receipt];
const replayed = replayEngine.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityApplied.envelope.stateHash);
const tampered = structuredClone(journal);
tampered[0].action.dataAdapterReceiptHash = "0".repeat(64);
const rejected = replayEngine.replay({ initialEnvelope, journal: tampered });
assert.equal(rejected.ok, false);
assert.equal(rejected.reason, "SIGNATURE_INVALID");
acceptance.push("authority_preview_confirm_apply_and_ed25519_replay_survive_hmac_rotation");

const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: createOfficialGoliathScatterV2RelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  }),
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.counts.declaredStateContractExecutors, 36);
assert.equal(graphAudit.counts.stateContractMissingExecutors, 6);
assert.equal(graphAudit.counts.blockingGaps, 0);
const brokenGraph = structuredClone(graph);
const targetScope = brokenGraph.coverageScopes.find((entry) => (
  entry.executorId === OFFICIAL_GOLIATH_SCATTER_RANGED_BATCH_V2_EXECUTOR_ID
));
const requiredEdge = targetScope.requiredEdges[0];
brokenGraph.edges = brokenGraph.edges.filter((entry) => !(
  entry.scopeId === requiredEdge.scopeId
    && entry.from === requiredEdge.from
    && entry.relationship === requiredEdge.relationship
    && entry.to === requiredEdge.to
));
brokenGraph.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(brokenGraph).filter(([key]) => key !== "graphHash"),
));
const brokenAudit = auditRuleRelationshipGraphV1(brokenGraph);
assert.equal(brokenAudit.valid, false);
assert.equal(brokenAudit.gaps.requiredEdgeGaps.length > 0, true);
acceptance.push("relationship_graph_is_complete_and_missing_edge_fails_closed");

const oldExecutorBytes = await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-goliath-scatter-ranged-batch-executor-v1.mjs",
));
assert.equal(sha256(oldExecutorBytes),
  "f14728a5af380a419b77a68745f3fca9906d7f3b3b9d356a9d2f607b37a7baa9");
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "fd1c0889ac76848f3d20ebe943f8467e363c0cf6139697ba72046c7968fa05c8");
assert.equal(previousReport.slice.historicalCompatibility.historicalRulesDisplayRetained,
  true);
acceptance.push("slice69_runtime_rules_display_and_v1_executor_bytes_remain_frozen");

const urls = {
  versions:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions",
  goliath:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/goliath",
  marine:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/marine",
  part8:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/iuUyObNTQ2M8xK4IUqzC",
  part11:
    "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/rules_sections/FuahgilWtc8nccVSp2Vv",
  core: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terran:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
};
const responses = Object.fromEntries(await Promise.all(Object.entries(urls).map(
  async ([key, url]) => [key, await fetchOfficial(url, key)],
)));
const documents = Object.fromEntries(await Promise.all([
  "versions", "goliath", "marine", "part8", "part11",
].map(async (key) => [key, await responses[key].json()])));
const liveOfficialRevalidation = {
  versionsCanonicalHash: documentHash(documents.versions),
  goliathCanonicalHash: documentHash(documents.goliath),
  marineCanonicalHash: documentHash(documents.marine),
  part8CanonicalHash: documentHash(documents.part8),
  part11CanonicalHash: documentHash(documents.part11),
  corePdfHash: sha256(Buffer.from(await responses.core.arrayBuffer())),
  terranP2pHash: sha256(Buffer.from(await responses.terran.arrayBuffer())),
  repositoryFallbackUsed: false,
};
assert.deepEqual(liveOfficialRevalidation, {
  versionsCanonicalHash:
    "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
  goliathCanonicalHash:
    "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc",
  marineCanonicalHash:
    "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  part8CanonicalHash:
    "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
  part11CanonicalHash:
    "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdfHash:
    "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2pHash:
    "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
  repositoryFallbackUsed: false,
});
acceptance.push("seven_latest_official_sources_revalidate_without_repository_fallback");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema:
    "starcraft_tmg_official_existing_goliath_scatter_v2_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation,
  frozenV1ExecutorSourceHash: sha256(oldExecutorBytes),
  officialSourceSnapshotHash: fixture.gameplayDataBundle.sourceSnapshotHash,
  officialDatasetHash: fixture.gameplayDataBundle.normalizedDatasetHash,
  gameplayDataBundleHash: fixture.gameplayDataBundle.gameplayDataBundleHash,
  slice,
  sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit,
  coverage: audit.stateContractCoverage,
  sourceHashes: {
    frozenV1ExecutorSourceHash: sha256(oldExecutorBytes),
  },
  authority: {
    previewConfirmApply: true,
    signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true,
    tamperRejected: true,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesEligible: false,
  productionRoomEligible: false,
  rulesTruth: "official_current_goliath_scatter_v2_contract_closure",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-goliath-scatter-v2-contract-closure-v1-report.json",
), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: graph.graphHash,
  stateContractCoverage: audit.counts,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
