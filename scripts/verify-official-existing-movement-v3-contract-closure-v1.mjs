#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalStarcraftTmgJson } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialExistingMovementV3ContractClosureRuleSliceV1,
  OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS,
  verifyOfficialExistingMovementV3ContractClosureRuleSliceV1,
} from
  "../packages/rule-atoms/official-existing-movement-v3-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialMovementV3RelationshipExtensionV1,
} from "../packages/rule-atoms/official-movement-v3-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "../packages/rule-atoms/rule-executor-state-contract-coverage-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const SLICE_HASH =
  "78b19c6ef0e4565eda951d3a7e955834748a1cdb1b886d8fd4041e75a7ce47f3";
const CATALOGUE_HASH =
  "f19484a581bf48ad3aa574aea7ae17f636d37af9a8eecbce6d2485d7bbb62d25";
const RUNTIME_HASH =
  "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043";
const GRAPH_HASH =
  "37055400db59c426f8bd5fb20fc23a8e416b9ed7804255c3bf1bc7b6e77d731a";
const EXECUTOR_SOURCE_HASHES = Object.freeze({
  "official-start-of-round-executor-v2.mjs":
    "0dca5a1a8a10f292cf5b03de9139a9f4c2855915a698ea67df6b46d2cee05820",
  "official-reserve-deploy-executor-v2.mjs":
    "8a449b51528dbdf855db2406b2be8377b63cbf9c7d236d6ff8dd80ce73292c09",
  "official-standard-move-executor-v2.mjs":
    "ecddd4e4cef74bf35a495cfe1a96ac8b6231126b6bd1b28bf23ee5b60b686155",
  "official-disengage-casualty-executor-v1.mjs":
    "b37025ef1a6689bec7522261968deb49b836eec9a68bf0227bc05b9335c96068",
  "official-start-of-round-executor-v3.mjs":
    "17513af588bc785f2701a3ebaee4b2735430f589784e4dee8cf53ae1fe8e51e7",
  "official-reserve-deploy-executor-v3.mjs":
    "941894cd17903d011992dc20ef5f6a922a394ea6f360f469b701fd51aa9acbe7",
  "official-standard-move-executor-v3.mjs":
    "269287263a780ab5bd914bc358ea108e9d75e58b0baa20c57567a05548b041df",
  "official-disengage-executor-v3.mjs":
    "85f1a6a37467ceb31cbcd8a40e3105a8576ed4cf51d593d075630c76aad83072",
  "official-current-movement-authority-lineage-v1.mjs":
    "d35349c506f230be3210ec1036471859bcc2bda34115e036f59f32639f962dcf",
});

function contentHash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function documentHash(document) {
  return createHash("sha256")
    .update(`${canonicalStarcraftTmgJson(document)}\n`)
    .digest("hex");
}

async function fetchOfficial(url, kind, json = false) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`${kind} HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      return json ? JSON.parse(new TextDecoder().decode(bytes)) : bytes;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-standard-move-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingMovementV3ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialExistingMovementV3ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
const extension = createOfficialMovementV3RelationshipExtensionV1({
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const graph = createRuleRelationshipGraphV1({ catalogue: slice.catalogue, extension });
const graphAudit = auditRuleRelationshipGraphV1(graph);
const coverage = auditExecutableAtomStateContractCoverageV1(graph);
const acceptance = [];

assert.equal(slice.sliceHash, SLICE_HASH);
assert.equal(slice.catalogueHash, CATALOGUE_HASH);
assert.equal(runtime.descriptor.runtimeHash, RUNTIME_HASH);
assert.equal(graph.graphHash, GRAPH_HASH);
assert.equal(sliceAudit.counts.changedAtoms, 63);
assert.equal(sliceAudit.counts.changedNonTargetAtoms, 0);
assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
assert.equal(sliceAudit.counts.compatibilityOnlyMigratedAtoms, 53);
assert.equal(sliceAudit.counts.newlyStrictDisengageAtoms, 10);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.counts.blockingGaps, 0);
assert.deepEqual(coverage.counts, {
  executableAtoms: 421,
  strictCompleteAtoms: 235,
  partialContractAtoms: 58,
  noContractAtoms: 128,
  executors: 42,
  declaredStateContractExecutors: 28,
  missingStateContractExecutors: 14,
});
acceptance.push("sixty_three_existing_atoms_migrate_without_new_atom_or_non_target_mutation");

const observedSourceHashes = {};
for (const [filename, expectedHash] of Object.entries(EXECUTOR_SOURCE_HASHES)) {
  const actualHash = contentHash(await readFile(path.join(
    ROOT,
    "packages/rule-atoms",
    filename,
  )));
  assert.equal(actualHash, expectedHash, filename);
  observedSourceHashes[filename] = actualHash;
}
assert.equal(historicalRuntime.descriptor.runtimeHash,
  previousReport.runtimeHash);
assert.equal(slice.historicalCompatibility.historicalRuntimeStillSupported, true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
acceptance.push("all_v2_sources_runtime_and_rules_display_are_frozen_without_silent_compatibility");

const currentIds = new Set(slice.executorIds);
const previousIds = new Set(slice.historicalCompatibility.frozenExecutorIds);
assert.equal(currentIds.size, 4);
assert.equal(previousIds.size, 4);
assert.ok(runtime.descriptor.executorManifest.every((entry) => (
  !previousIds.has(entry.executorId)
)));
assert.ok([...currentIds].every((executorId) => (
  runtime.descriptor.executorManifest.some((entry) => entry.executorId === executorId)
)));
assert.equal(OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS.length, 63);
acceptance.push("current_runtime_routes_four_v3_executors_and_excludes_their_retired_v2_identities");

const live = {};
for (const [key, url] of Object.entries(previousReport.liveOfficialRevalidation.urls)) {
  const json = ["versions", "marine", "gauntlet"].includes(key);
  live[key] = await fetchOfficial(url, key, json);
  const actualHash = json ? documentHash(live[key]) : contentHash(live[key]);
  assert.equal(actualHash, previousReport.liveOfficialRevalidation.hashes[key], key);
}
assert.deepEqual(previousReport.liveOfficialRevalidation.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});
assert.equal(previousReport.liveOfficialRevalidation.repositoryFallbackUsed, false);
acceptance.push("live_official_core_p2p_marine_gauntlet_image_and_71_69_48_sources_are_current");

assert.equal(slice.historicalCompatibility.actionSchemaVersion,
  "hybrid_legal_space_v22");
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("v22_authority_contract_promotes_no_skill_dsh_muzero_memory_or_training_truth");

const report = {
  schema: "starcraft_tmg_existing_movement_v3_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  dataVersions: previousReport.liveOfficialRevalidation.dataVersions,
  liveOfficialRevalidation: {
    urls: previousReport.liveOfficialRevalidation.urls,
    hashes: previousReport.liveOfficialRevalidation.hashes,
    dataVersions: previousReport.liveOfficialRevalidation.dataVersions,
    repositoryFallbackUsed: false,
  },
  slice,
  sliceAudit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit,
  coverage,
  previousCoverage: previousReport.coverage,
  executorSourceHashes: observedSourceHashes,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  authorityFixture: {
    actionSchemaVersion: "hybrid_legal_space_v22",
    currentExecutorIds: [...currentIds].sort(),
    contentHashAlgorithm: "sha256",
    longTermSignatureAlgorithm: "ed25519",
    shortTermSealAlgorithm: "hmac-sha256",
    focusedPublicContractsRequiredByCompositeGate: true,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "current_movement_v3_shared_supply_loss_authority_lineage",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-movement-v3-contract-closure-v1-report.json",
), `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.catalogueHash,
  runtimeHash: report.runtimeHash,
  graphHash: report.graph.graphHash,
  graphNodes: report.graph.nodes.length,
  graphEdges: report.graph.edges.length,
  strictCompleteAtoms: report.coverage.counts.strictCompleteAtoms,
  partialContractAtoms: report.coverage.counts.partialContractAtoms,
  noContractAtoms: report.coverage.counts.noContractAtoms,
  stateContractMissingExecutors: report.coverage.counts.missingStateContractExecutors,
  repositoryFallbackUsed: report.liveOfficialRevalidation.repositoryFallbackUsed,
  trainingTruth: report.trainingTruth,
}, null, 2));
