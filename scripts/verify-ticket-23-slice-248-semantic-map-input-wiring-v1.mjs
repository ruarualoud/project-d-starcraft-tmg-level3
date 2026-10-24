#!/usr/bin/env node
// Concrete regression: the real A-A factory ignored semanticTerrain, and the
// Web runner discarded map configuration arguments before starting that host.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import {
  createOfficialStandardRoomInitialStateAuthorityV1,
  verifyOfficialStandardRoomInitialStateAuthorityV1,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import {
  loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1,
} from "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function argument(name) {
  const entry = process.argv.find((item) => item.startsWith(`--${name}=`));
  assert.ok(entry, `--${name} is required`);
  return path.resolve(entry.slice(name.length + 3));
}
const sourceModule = argument("semantic-source-module");
const clearanceFile = argument("ramp-clearance-report");
const output = argument("output-dir");
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root: ROOT, overrideRoot: argument("fixture-root"),
});
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: fixtureRoot,
});
const imported = await import(pathToFileURL(sourceModule).href);
const bindings = Object.values(imported).filter((value) =>
  value && typeof value === "object" && value.seedId && value.regions);
assert.equal(bindings.length, 1, "candidate module must export one raw binding");
const binding = bindings[0];
const clearance = JSON.parse(await readFile(clearanceFile, "utf8"));
const map = clearance.maps.find((entry) => entry.seedId === binding.seedId);
assert.ok(map?.bindingHash && map?.overlayHash && map.ramps?.length,
  "the selected map must have saved version-bound candidate routes");
const routes = {
  schema: "starcraft_tmg_semantic_ramp_candidate_routes_v1",
  bindingHash: map.bindingHash, overlayHash: map.overlayHash,
  routes: map.ramps.map((ramp) => {
    assert.equal(ramp.route?.rulesPlanPointDenominatorSupported, true);
    return { accessPointId: ramp.accessPointId,
      path: ramp.route.proposedPath, transitionIndex: ramp.route.transitionIndex };
  }),
};
const mapConfiguration = {
  seedId: binding.seedId, elementSelections: [], passageSelections: [],
  semanticTerrain: {
    binding, bindingHash: routes.bindingHash,
    overlayCompilerVersion: "local_ramp_corridor_v3_1",
    rampAdmissionRoutes: routes,
    quarterTargetPolicy: "whole_base_area_v1",
    physicalClearancePolicy: "canonical_round_or_circumcircle_grid250_v1",
  },
};
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  roomId: "ticket23-semantic-input-wiring-probe",
  mapConfiguration,
  serverSeatPlan: [
    { label: "human", seatKey: "player1", roleMode: "supervisor",
      principalType: "human" },
    { label: "bot", seatKey: "player2", roleMode: "supervisor",
      principalType: "human" },
  ],
});
verifyOfficialStandardRoomInitialStateAuthorityV1(authority);
const state = authority.state;
const freeze = state.officialCompetitiveMapRoomFreeze;
const manifest = state.board.battlefieldMapManifest;
const failures = [];
function check(condition, code) { if (!condition) failures.push(code); }
check(freeze.schema === "starcraft_tmg_competitive_map_semantic_room_freeze_v1",
  "LIVE_FACTORY_DISCARDED_SEMANTIC_TERRAIN");
check(freeze.semanticBindingHash === routes.bindingHash,
  "LIVE_FACTORY_SOURCE_BINDING_NOT_PINNED");
check(freeze.overlayReceipt?.overlayHash === routes.overlayHash,
  "LIVE_FACTORY_ACTUAL_OVERLAY_NOT_PINNED");
check(state.board.terrain.length > 9,
  "LIVE_FACTORY_FELL_BACK_TO_NINE_PIECES");
check(manifest.mapArtOverlays?.some((entry) => entry.flipX === true
  && entry.rectangleNormalized.xMin === 0
  && entry.rectangleNormalized.xMax === 1000),
"LIVE_FACTORY_MIRRORED_ART_NOT_BOUND");
const runner = await readFile(path.join(ROOT,
  "scripts/run-ticket-23-slice-248-agent-agent-web-v1.mjs"), "utf8");
const block = runner.match(/const pregameArgs = process\.argv\.filter\([\s\S]*?\);/u);
assert.ok(block, "locate actual runner argument filter");
const filter = vm.runInNewContext(`(process) => { ${block[0]}
  return pregameArgs; }`);
const sentinels = ["--pregame-map-configuration-file=/candidate.json",
  "--pregame-map-configuration-json={}"];
const forwarded = filter({ argv: sentinels });
check(sentinels.every((item) => forwarded.includes(item)),
  "WEB_RUNNER_DISCARDED_MAP_CONFIGURATION");
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "map-configuration.json"),
  `${JSON.stringify(mapConfiguration, null, 2)}\n`);
const report = {
  gate: "actual-live-factory-and-web-runner-semantic-map-input",
  passed: failures.length === 0, failures,
  sourceModule, clearanceFile, sourceDatasetHash: source.dataset.datasetHash,
  seedId: binding.seedId, expectedBindingHash: routes.bindingHash,
  actualBindingHash: freeze.semanticBindingHash || null,
  expectedOverlayHash: routes.overlayHash,
  actualOverlayHash: freeze.overlayReceipt?.overlayHash || null,
  freezeSchema: freeze.schema, terrainCount: state.board.terrain.length,
  artOverlayCount: manifest.mapArtOverlays?.length || 0,
  forwardedMapArgumentCount: forwarded.length,
  authorityVerified: true, providerCalls: 0, roomCreated: false,
  fullMatchAcceptance: false, trainingTruth: false,
};
await writeFile(path.join(output, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
assert.deepEqual(failures, [], "current semantic map must reach real A-A boot");
