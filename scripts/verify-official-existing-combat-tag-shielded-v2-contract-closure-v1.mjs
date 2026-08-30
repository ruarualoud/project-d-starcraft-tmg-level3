#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalStarcraftTmgJson, hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createOfficialExistingCombatTagShieldedV2ContractClosureRuleSliceV1,
  OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS,
  verifyOfficialExistingCombatTagShieldedV2ContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-combat-tag-shielded-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialCombatTagShieldedV2RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-combat-tag-shielded-v2-relationship-contract-v1.mjs";
import { OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID } from
  "../packages/rule-atoms/official-combat-tag-shielded-ranged-executor-v2.mjs";
import { auditRuleRelationshipGraphV1, createRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import * as fixture from "./verify-official-combat-tag-shielded-v2-public-contract-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-goliath-scatter-v2-contract-closure-v1-report.json",
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

const slice = createOfficialExistingCombatTagShieldedV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialExistingCombatTagShieldedV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual(audit.counts, {
  executableRuleAtoms: 421,
  reviewRequiredRuleAtoms: 491,
  displayOnlyRuleAtoms: 114,
  changedAtoms: 10,
  strictCompleteAtoms: 401,
  partialContractAtoms: 15,
  noContractAtoms: 5,
  declaredStateContractExecutors: 37,
  missingStateContractExecutors: 5,
});
assert.deepEqual(slice.versionReassignedRuleAtomIds,
  [...OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS]);
assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
acceptance.push("ten_existing_combat_tag_shielded_atoms_rebound_without_denominator_growth");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const matchBinding = {
  ...fixture.matchBinding,
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const candidates = runtime.enumerate(fixture.battleState(), {
  sideKey: "player1",
  matchBinding,
}).candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID
));
assert.equal(candidates.length, 5);
const selected = candidates.find((candidate) => (
  candidate.attackProfileKey === "army_units:marine::assault::C-14 rifle"
    && candidate.targetId === "p2-adept"
));
assert.ok(selected);
const applied = runtime.apply(fixture.battleState(), action(selected), {
  matchBinding,
  postRevision: 1,
  chanceReveals: Array.from({ length: selected.chance.count }, () => 1),
});
assert.equal(applied.state.officialGameplayDataBundle.gameplayDataBundleHash,
  fixture.gameplayDataBundle.gameplayDataBundleHash);
acceptance.push("current_runtime_exposes_five_exact_candidates_and_restores_current_bundle");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T15:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-71-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({
    grantId: "slice-71-player1-grant",
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: "slice-71-player1-session",
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const engine = authorityEngine("ticket-11-slice-71-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-71-combat-tag-shielded-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: liveSourceReport.commandSnapshot,
    },
    dataSnapshot: {
      artifactId: "official-combat-tag-shielded-gameplay-data-bundle",
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
  entry.action.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID
    && entry.action.attackProfileKey === "army_units:marine::assault::C-14 rifle"
    && entry.action.targetId === "p2-adept"
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
  idempotencyKey: "slice-71-combat-tag-shielded",
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

const replayEngine = authorityEngine("ticket-11-slice-71-rotated-short-seal-v2");
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
  extension: createOfficialCombatTagShieldedV2RelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  }),
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.counts.declaredStateContractExecutors, 37);
assert.equal(graphAudit.counts.stateContractMissingExecutors, 5);
const brokenGraph = structuredClone(graph);
const targetScope = brokenGraph.coverageScopes.find((entry) => (
  entry.executorId === OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID
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
assert.equal(auditRuleRelationshipGraphV1(brokenGraph).valid, false);
acceptance.push("relationship_graph_is_complete_and_missing_edge_fails_closed");

const oldExecutorBytes = await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-combat-tag-shielded-ranged-executor-v1.mjs",
));
assert.equal(sha256(oldExecutorBytes),
  "00c338293415cef8084b15e569456528538bdbc3492eeee904c070f44245f7d7");
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash,
  "3694d34c2e8c7df4b87cdb9a3dafb6222552f577731b86fa786c24c5a9fb619e");
assert.equal(previousReport.slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice70_runtime_rules_display_and_v1_executor_bytes_remain_frozen");

const firestoreRoot =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const urls = {
  versions: `${firestoreRoot}/system_metadata/versions`,
  goliath: `${firestoreRoot}/army_units/goliath`,
  marine: `${firestoreRoot}/army_units/marine`,
  adept: `${firestoreRoot}/army_units/adept`,
  stalker: `${firestoreRoot}/army_units/stalker`,
  pointDefenseDrone: `${firestoreRoot}/army_units/point_defense_drone`,
  part2: `${firestoreRoot}/rules_sections/QX7B9DFpviRo84fVCBIj`,
  part5: `${firestoreRoot}/rules_sections/u3zNStKpd5XegMjmJfMS`,
  part11: `${firestoreRoot}/rules_sections/FuahgilWtc8nccVSp2Vv`,
  core: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terran: "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
  protoss: "https://starcraft-tmg.com/files/downloads/StarCraft-Protoss-P2P-Card-Sheets-A4_EN.pdf",
};
const responses = Object.fromEntries(await Promise.all(Object.entries(urls).map(
  async ([key, url]) => [key, await fetchOfficial(url, key)],
)));
const documents = Object.fromEntries(await Promise.all([
  "versions", "goliath", "marine", "adept", "stalker", "pointDefenseDrone",
  "part2", "part5", "part11",
].map(async (key) => [key, await responses[key].json()])));
const liveOfficialRevalidation = {
  versionsCanonicalHash: documentHash(documents.versions),
  goliathCanonicalHash: documentHash(documents.goliath),
  marineCanonicalHash: documentHash(documents.marine),
  adeptCanonicalHash: documentHash(documents.adept),
  stalkerCanonicalHash: documentHash(documents.stalker),
  pointDefenseDroneCanonicalHash: documentHash(documents.pointDefenseDrone),
  part2CanonicalHash: documentHash(documents.part2),
  part5CanonicalHash: documentHash(documents.part5),
  part11CanonicalHash: documentHash(documents.part11),
  corePdfHash: sha256(Buffer.from(await responses.core.arrayBuffer())),
  terranP2pHash: sha256(Buffer.from(await responses.terran.arrayBuffer())),
  protossP2pHash: sha256(Buffer.from(await responses.protoss.arrayBuffer())),
  repositoryFallbackUsed: false,
};
assert.deepEqual(liveOfficialRevalidation, {
  versionsCanonicalHash: "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
  goliathCanonicalHash: "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc",
  marineCanonicalHash: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  adeptCanonicalHash: "adbd3e08cf9d7c0141cc24d4651c81da8f813dafd087f96a63f9d7df2a0cb7b6",
  stalkerCanonicalHash: "1f5ebec5ba1b6d429ef0cb9135daa39afed4b60275051ea7959b923a676603bf",
  pointDefenseDroneCanonicalHash: "db9d0face167edade6f313a1c642a9ea0787fd5100ff557648c9a71274dbcaa4",
  part2CanonicalHash: "32f1ff544aa558c5b72f242d7c05df659694570f4f8794f6637de2b3181df929",
  part5CanonicalHash: "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
  part11CanonicalHash: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdfHash: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2pHash: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
  protossP2pHash: "4e8547b2df8d545df3d0ebb7d7821521a888dc0437d6f4dde21d82145337a212",
  repositoryFallbackUsed: false,
});
acceptance.push("twelve_latest_official_sources_revalidate_without_repository_fallback");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema:
    "starcraft_tmg_official_existing_combat_tag_shielded_v2_contract_closure_verification_v1",
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
  rulesTruth: "official_current_combat_tag_shielded_v2_contract_closure",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-combat-tag-shielded-v2-contract-closure-v1-report.json",
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
