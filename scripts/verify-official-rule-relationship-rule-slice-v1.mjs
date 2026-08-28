#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalStarcraftTmgJson,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  createOfficialRuleRelationshipExtensionV1,
  OFFICIAL_RULE_RELATIONSHIP_NODE_IDS_V1,
} from "../packages/rule-atoms/official-rule-relationship-contract-v1.mjs";
import {
  createOfficialRuleRelationshipRuleSliceV1,
  verifyOfficialRuleRelationshipRuleSliceV1,
} from "../packages/rule-atoms/official-rule-relationship-rule-slice-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const EXPECTED_SLICE_HASH =
  "910f289b54b73dfcd5b69b52a6d9ad500af68a4e531d311fa3c9d5b0a456fd23";
const EXPECTED_GRAPH_HASH =
  "150345cb69a0e1f9a4ebe93efcd336b280dca3013c57d339a2c372e96a26de06";
const EXPECTED_CATALOGUE_HASH =
  "7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede";
const EXPECTED_RUNTIME_HASH =
  "6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c";
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  part5: `${FIRESTORE_ROOT}/rules_sections/u3zNStKpd5XegMjmJfMS`,
  corePdf: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terranP2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
});
const acceptance = [];
const id = OFFICIAL_RULE_RELATIONSHIP_NODE_IDS_V1;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function documentHash(document) {
  return sha256(`${canonicalStarcraftTmgJson(document)}\n`);
}

function firestoreStrings(value) {
  if (!value || typeof value !== "object") return [];
  const own = typeof value.stringValue === "string" ? [value.stringValue] : [];
  return [...own, ...Object.values(value).flatMap((child) => firestoreStrings(child))];
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

function graphFor(catalogue, extension = createOfficialRuleRelationshipExtensionV1()) {
  return createRuleRelationshipGraphV1({ catalogue, extension });
}

function clone(value) {
  return structuredClone(value);
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-marine-optional-stimpack-move-rule-slice-v2-report.json"),
  "utf8",
));
const slice = createOfficialRuleRelationshipRuleSliceV1({
  previousSlice: previousReport.slice,
});
const sliceAudit = verifyOfficialRuleRelationshipRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(slice.sliceHash, EXPECTED_SLICE_HASH);
assert.equal(slice.catalogueHash, EXPECTED_CATALOGUE_HASH);
assert.equal(sliceAudit.counts.changedAtoms, 0);
assert.equal(sliceAudit.counts.newlyExecutableRuleAtoms, 0);
assert.equal(sliceAudit.counts.versionReassignedRuleAtoms, 0);
assert.deepEqual(slice.executorIds, []);
acceptance.push("audit_slice_changes_no_rule_atom_catalogue_executor_or_runtime_truth");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.runtimeHash, EXPECTED_RUNTIME_HASH);
assert.equal(runtime.descriptor.executableRuleAtomCount, 421);
const extension = createOfficialRuleRelationshipExtensionV1();
const graph = graphFor(slice.catalogue, extension);
const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graph.graphHash, EXPECTED_GRAPH_HASH);
assert.equal(slice.ruleRelationshipGraphBinding.graphHash, graph.graphHash);
assert.deepEqual(graphAudit.counts, {
  nodes: 5058,
  edges: 19494,
  sourceSnapshots: 2,
  sourceClauses: 1093,
  ruleAtoms: 1026,
  executableRuleAtoms: 421,
  executors: 35,
  evidenceFixtures: 2829,
  coverageScopes: 1,
  declaredStateContractExecutors: 1,
  stateContractMissingExecutors: 34,
  remainingActionableRuleAtoms: 491,
  blockingGaps: 0,
});
acceptance.push("content_hashed_graph_node_edge_and_denominator_counts_are_exact");

assert.equal(graphAudit.gaps.sourceClauseGaps.length, 0);
assert.equal(graphAudit.gaps.atomSourceGaps.length, 0);
assert.equal(graphAudit.gaps.executableAtomConsumerGaps.length, 0);
assert.equal(graphAudit.gaps.executableAtomEvidenceGaps.length, 0);
acceptance.push("every_source_clause_atom_consumer_and_six_kind_evidence_link_is_auditable");

assert.equal(extension.executorLineages.length, 4);
assert.deepEqual(extension.executorLineages.map((entry) => entry.executorId).sort(), [
  "authority.end-of-round-effects-v3",
  "authority.end-of-round-effects-v4",
  "authority.marine-optional-stimpack-move-v2",
  "authority.optical-flare-ranged-consumer-v1",
]);
assert.deepEqual(graphAudit.gaps.executorConsumerGaps, []);
acceptance.push("four_composition_executors_have_explicit_executable_atom_lineage_consumers");

const gridTests = [
  id.multiModelGridTest,
  id.initialSingleGridTest,
  id.reducedSingleGridTest,
  id.casualtyStaleGridTest,
];
const casualtyImpact = queryRuleRelationshipImpactV1(graph, {
  startNodeId: id.casualty,
  targetNodeIds: gridTests,
  relationships: ["writes", "derives", "invalidates", "verified_by"],
  maxDepth: 6,
});
assert.deepEqual(casualtyImpact.paths.map((entry) => entry.nodeIds), gridTests.sort().map((testId) => [
  id.casualty,
  id.currentModels,
  id.splitSpeedSelection,
  id.moveDomain,
  testId,
]));
acceptance.push("casualty_current_models_split_speed_invalidation_reaches_all_four_grid_tests");

const baseSizeImpact = queryRuleRelationshipImpactV1(graph, {
  startNodeId: id.baseSize,
  targetNodeIds: [id.moveDomain, id.splitSpeedSelection],
  relationships: ["derives", "constrains"],
  maxDepth: 4,
});
assert.deepEqual(baseSizeImpact.paths.find((entry) => (
  entry.targetNodeId === id.moveDomain
)).nodeIds, [
  id.baseSize,
  id.geometryFootprint,
  id.moveDomain,
]);
assert.equal(baseSizeImpact.paths.find((entry) => (
  entry.targetNodeId === id.splitSpeedSelection
)).reached, false);
acceptance.push("base_size_controls_geometry_without_selecting_split_speed");

const printedSizeImpact = queryRuleRelationshipImpactV1(graph, {
  startNodeId: id.printedSize,
  targetNodeIds: [id.effectiveSizeAtom, id.moveDomain, id.splitSpeedSelection],
  relationships: ["derives", "projects_to", "parameterized_by", "constrains"],
  maxDepth: 8,
});
assert.deepEqual(printedSizeImpact.paths.find((entry) => (
  entry.targetNodeId === id.effectiveSizeAtom
)).nodeIds, [id.printedSize, id.visibilityHeight, id.effectiveSizeAtom]);
assert.equal(printedSizeImpact.paths.find((entry) => entry.targetNodeId === id.moveDomain).reached, false);
assert.equal(printedSizeImpact.paths.find((entry) => (
  entry.targetNodeId === id.splitSpeedSelection
)).reached, false);
acceptance.push("printed_size_routes_to_visibility_height_and_never_to_speed_or_move_domain");

const branchWrites = queryRuleRelationshipImpactV1(graph, {
  startNodeId: id.baseVariant,
  targetNodeIds: [
    id.modelPositions,
    id.paymentCardReadiness,
    id.damageMarker,
    id.statuses,
    id.effectMarkers,
    id.abilityHistory,
  ],
  relationships: ["writes"],
  maxDepth: 2,
});
assert.equal(branchWrites.paths.find((entry) => entry.targetNodeId === id.modelPositions).reached, true);
assert.ok(branchWrites.paths.filter((entry) => entry.targetNodeId !== id.modelPositions)
  .every((entry) => entry.reached === false));
const stimpackWrites = queryRuleRelationshipImpactV1(graph, {
  startNodeId: id.stimpackVariant,
  targetNodeIds: [
    id.modelPositions,
    id.paymentCardReadiness,
    id.damageMarker,
    id.statuses,
    id.effectMarkers,
    id.abilityHistory,
  ],
  relationships: ["writes"],
  maxDepth: 2,
});
assert.ok(stimpackWrites.paths.every((entry) => entry.reached));
acceptance.push("base_and_stimpack_write_sets_preserve_payment_damage_status_separation");

const reversedImpact = queryRuleRelationshipImpactV1(graph, {
  startNodeId: id.casualty,
  targetNodeIds: [...gridTests].reverse(),
  relationships: ["verified_by", "invalidates", "derives", "writes"],
  maxDepth: 6,
});
assert.deepEqual(reversedImpact, casualtyImpact);
acceptance.push("impact_queries_are_deterministic_under_target_and_relationship_input_order");

const missingInvalidation = clone(extension);
missingInvalidation.edges = missingInvalidation.edges.filter((entry) => (
  entry.provenance !== "parameter_domain_state_binding"
));
const missingInvalidationAudit = auditRuleRelationshipGraphV1(
  graphFor(slice.catalogue, missingInvalidation),
);
assert.equal(missingInvalidationAudit.valid, false);
assert.ok(missingInvalidationAudit.gaps.requiredEdgeGaps.length > 0);
assert.ok(missingInvalidationAudit.gaps.requiredPathGaps.length > 0);
acceptance.push("missing_state_to_domain_invalidation_fails_declared_scope_closed");

const missingTest = clone(extension);
missingTest.edges = missingTest.edges.filter((entry) => !(
  entry.provenance === "slice42_judge_test" && entry.to === id.casualtyStaleGridTest
));
const missingTestAudit = auditRuleRelationshipGraphV1(graphFor(slice.catalogue, missingTest));
assert.equal(missingTestAudit.valid, false);
assert.ok(missingTestAudit.gaps.requiredEdgeGaps.length > 0);
assert.ok(missingTestAudit.gaps.evidenceTestGaps.length > 0);
acceptance.push("missing_judge_test_edge_fails_declared_scope_closed");

const missingConsumer = clone(extension);
missingConsumer.executorLineages = missingConsumer.executorLineages.filter((entry) => (
  entry.executorId !== "authority.marine-optional-stimpack-move-v2"
));
const missingConsumerAudit = auditRuleRelationshipGraphV1(
  graphFor(slice.catalogue, missingConsumer),
);
assert.equal(missingConsumerAudit.valid, false);
assert.ok(missingConsumerAudit.gaps.executorConsumerGaps.some((entry) => (
  entry.includes("authority.marine-optional-stimpack-move-v2")
)));
acceptance.push("missing_composition_executor_consumer_lineage_fails_closed");

const missingVersion = clone(extension);
missingVersion.edges = missingVersion.edges.filter((entry) => (
  entry.provenance !== "runtime_version_ancestry"
));
const missingVersionAudit = auditRuleRelationshipGraphV1(graphFor(slice.catalogue, missingVersion));
assert.equal(missingVersionAudit.valid, false);
assert.ok(missingVersionAudit.gaps.requiredEdgeGaps.length > 0);
acceptance.push("missing_slice_catalogue_or_runtime_ancestry_edge_fails_closed");

const tamperedGraph = clone(graph);
tamperedGraph.edges[0].provenance = "tampered";
assert.throws(
  () => auditRuleRelationshipGraphV1(tamperedGraph),
  /RULE_RELATIONSHIP_GRAPH_HASH_MISMATCH/u,
);
acceptance.push("graph_content_tamper_is_rejected_by_content_hash");

assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.declaredScopesValid, true);
assert.equal(graphAudit.globalRelationshipCoverageComplete, false);
assert.equal(graphAudit.productionEligible, false);
assert.deepEqual(graphAudit.coverageDebtCodes, [
  "STATE_CONTRACTS_PARTIAL",
  "ACTIONABLE_RULE_ATOMS_REMAIN",
]);
assert.equal(graphAudit.gaps.stateContractMissingExecutorIds.length, 34);
acceptance.push("partial_global_state_contract_coverage_is_visible_and_never_production_eligible");

assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
assert.equal(slice.previousCatalogueHash, previousReport.slice.catalogueHash);
assert.equal(slice.historicalCompatibility.previousRuntimeHash, EXPECTED_RUNTIME_HASH);
assert.equal(slice.historicalCompatibility.rulesRuntimeChanged, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
acceptance.push("slice42_catalogue_runtime_action_schema_and_old_rules_display_remain_frozen");

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
  marine: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  part5: "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
const versions = liveDocuments.versions.fields;
assert.deepEqual({
  unitsVersion: versions.unitsVersion.integerValue,
  cardsVersion: versions.cardsVersion.integerValue,
  rulesVersion: versions.rulesVersion.integerValue,
}, { unitsVersion: "71", cardsVersion: "69", rulesVersion: "48" });
const marineText = firestoreStrings(liveDocuments.marine).join("\n");
const part5Text = firestoreStrings(liveDocuments.part5).join("\n").replace(/<[^>]*>/gu, " ");
assert.match(marineText, /"4\/7"|4\/7/u);
assert.match(marineText, /Biological, Light, Ground/u);
assert.match(part5Text, /second value only when the Unit is reduced to a single remaining model/iu);
assert.equal(slice.officialDataPolicy.repositoryFallbackAllowed, false);
acceptance.push("live_official_71_69_48_marine_core_and_p2p_sources_revalidate_without_fallback");

assert.equal(graph.relationshipAuthority, "derived_audit_evidence_only");
assert.equal(graph.rulesAuthority, false);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("relationship_audit_never_becomes_rules_skill_dsh_muzero_memory_or_training_truth");

assert.equal(acceptance.length, 18);
const report = {
  schema: "starcraft_tmg_official_rule_relationship_rule_slice_verification_v1",
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
  slice,
  audit: sliceAudit,
  relationshipGraph: graph,
  relationshipGraphAudit: graphAudit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: previousReport.runtime.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth:
    "derived_cross_layer_relationship_audit_for_current_exact_rules_subset",
  productionRoomEligible: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-rule-relationship-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  relationshipGraphHash: report.relationshipGraph.graphHash,
  relationshipNodes: report.relationshipGraphAudit.counts.nodes,
  relationshipEdges: report.relationshipGraphAudit.counts.edges,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  stateContractMissingExecutors:
    report.relationshipGraphAudit.counts.stateContractMissingExecutors,
  productionRoomEligible: report.productionRoomEligible,
  trainingTruth: report.trainingTruth,
}, null, 2));
