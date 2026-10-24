// Regression for the captured full-product standard-d6-1 SEED_UNKNOWN bug.
// This checks the changed composition seam, not the already-passed map audit
// suite or stable complete play. No Provider, old Room, or old draft writes.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createOfficialCompetitiveMapConfiguratorV1 } from
  "../packages/product-composition/official-competitive-map-configurator-v1.mjs";
import { createOfficialStandardRoomInitialStateAuthorityV1 } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } from
  "../packages/http-adapter/handler-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1,
  loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { evaluateOfficialTerrainLineOfSightBatchOutcomesV1 } from
  "../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))
  ?.slice(name.length + 3);
const presetPath = arg("preset");
const outputDirectory = arg("output-directory");
const resumeAfterHttp = arg("resume-after") === "public-http";
assert(presetPath && outputDirectory, "captured preset and isolated output required");
const checks = [];
const startedAt = new Date().toISOString();
await mkdir(outputDirectory, { recursive: true });
try {
  const preset = JSON.parse(await readFile(presetPath, "utf8"));
  const raw = { seedId: "standard-d6-1", elementSelections: [], passageSelections: [],
    terrainSetup: { valuesByInstance: preset.valuesByInstance } };
  const configurator = createOfficialCompetitiveMapConfiguratorV1();
  const preview = configurator.preview(raw);
  if (resumeAfterHttp) {
    const prior = JSON.parse(await readFile(path.join(outputDirectory, "receipt.json"), "utf8"));
    assert.deepEqual(prior.checks, [
      "original_product_configurator_resolves_native_seed_and_exact_cells",
      "public_http_accepts_explicit_attribute_edits",
    ], "only the captured factory failure may resume after these two green checks");
    await writeFile(path.join(outputDirectory, "prior-factory-blocker-receipt.json"),
      JSON.stringify(prior, null, 2) + "\n");
    checks.push(...prior.checks);
  } else {
    const catalogue = configurator.readCatalogue();
    assert.equal(catalogue.counts.officialPremade, 9);
    assert.equal(catalogue.counts.total, 29);
    assert.equal(catalogue.maps.find(row => row.seedId === raw.seedId).engagementScale, "Standard");
    assert.equal(preview.status, "explicit_setup_rules_preview_not_room_admission");
    assert.equal(preview.actualCounts.terrainGroups, 30);
    assert.equal(preview.actualCounts.total, 1804);
    checks.push("original_product_configurator_resolves_native_seed_and_exact_cells");
    const http = createStarcraftTmgLevel3HttpAdapter({ mapConfigurationPort: configurator });
    const response = await http.handle({ method: "POST",
      pathname: `${STARCRAFT_TMG_LEVEL3_API_PREFIX}/map-configurator/preview`, body: raw });
    assert.equal(response.status, 200);
    checks.push("public_http_accepts_explicit_attribute_edits");
  }
  const mapConfiguration = configurator.prepareRoomConfiguration(raw, {
    roomId: "slice248-three-arm-shared-map-input", setupRequestedAt: "2026-10-08",
  });
  // Freeze ONCE and share this exact server-prepared input with all planners
  // and rooms. Their individual Room freezes and memories stay independent.
  const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: fixtureRoot });
  const authority = createOfficialStandardRoomInitialStateAuthorityV1({
    dataset: source.dataset, snapshot: source.snapshot,
    roomId: "slice248-native-map-product-regression", mapConfiguration,
  });
  const state = authority.state;
  const freeze = state.officialCompetitiveMapRoomFreeze;
  assert.equal(freeze.seedId, raw.seedId);
  assert.equal(state.board.widthInches, 54);
  assert.equal(state.board.heightInches, 36);
  assert.equal(state.engagementScale, "Standard");
  assert.equal(state.board.terrain.length, 1804);
  assert.equal(freeze.overlayReceipt.logicalTerrainGroupCount, 30);
  const placementBlockerCount = state.board.terrain.filter(row => row.blocksPlacement === true).length;
  const movementBlockerCount = state.board.terrain.filter(row => (
    row.terrainKind === "impassable" || row.terrainKind === "ordinary" && row.size >= 2
  )).length;
  // Size-one ordinary pieces may be crossed but cannot be occupied. Do not
  // confuse their placement profile with the movement-blocker denominator.
  assert.equal(placementBlockerCount, preview.rulesTerrain.filter(row => row.blocksPlacement === true).length);
  assert.equal(movementBlockerCount, 1146);
  assert.equal(state.board.battlefieldMapManifest.mapSourceFamily, "official_tmg_premade");
  const cells = rows => rows.map(row => ({
    groupId: row.terrainGroupId, kind: row.terrainKind, size: row.size,
    footprint: row.footprintMilliInches || row.footprint,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(cells(state.board.terrain), cells(preview.rulesTerrain));
  checks.push("actual_standard_2000_factory_preserves_preview_cells_and_profiles");
  const product = await createRosterPlanningProductModuleV1({ root, fixtureRoot,
    dataDirectory: path.join(outputDirectory, "isolated-workspace"), mapConfiguration });
  const summary = product.mapEvidencePort.summarizeMap({ queryId: "native-integration-summary" });
  assert.equal(summary.resultStatus, "certified_map_summary");
  assert.equal(summary.mapBinding.seedId, raw.seedId);
  assert.equal(summary.mapBinding.compilationHash, freeze.compilationHash);
  assert.equal(summary.mapBinding.rulesReachabilityAuditHash, freeze.missionSpatialReachabilityAuditHash);
  assert.equal(product.descriptor().liveDeliberationAttached, false);
  assert.equal(typeof evaluateOfficialTerrainLineOfSightBatchOutcomesV1, "function");
  checks.push("real_roster_workspace_and_match_share_compiled_geometry_and_task_audit");
  const artPath = path.join(root, preview.artAsset.path.replace(/^\//u, ""));
  const artHash = createHash("sha256").update(await readFile(artPath)).digest("hex");
  assert.equal(artHash, preview.artAsset.sha256);
  checks.push("published_native_art_is_the_frozen_source");
  await writeFile(path.join(outputDirectory, "shared-native-map-configuration.json"),
    JSON.stringify(mapConfiguration, null, 2) + "\n", { mode: 0o600 });
  const receipt = { status: "passed", startedAt, finishedAt: new Date().toISOString(), checks,
    seedId: raw.seedId, terrainGroups: 30, actualRulesCells: state.board.terrain.length,
    movementBlockers: movementBlockerCount, placementBlockers: placementBlockerCount,
    mapCompilationHash: freeze.compilationHash,
    rulesReachabilityAuditHash: freeze.missionSpatialReachabilityAuditHash,
    providerCalls: 0, originalRoomMutations: 0, oldWorkspaceWrites: 0,
    fullGamesCompleted: 0, completedMapAuditSuitesRerun: false,
    reusedPassedChecks: resumeAfterHttp ? checks.slice(0, 2) : [],
    scope: "changed_product_native_map_composition_seam_not_full_game_or_plan_admission" };
  await writeFile(path.join(outputDirectory, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt));
} catch (error) {
  const receipt = { status: "failed", startedAt, finishedAt: new Date().toISOString(), checks,
    failure: error.message, providerCalls: 0, originalRoomMutations: 0,
    completedMapAuditSuitesRerun: false };
  await writeFile(path.join(outputDirectory, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.error(error.stack);
  process.exitCode = 1;
}
