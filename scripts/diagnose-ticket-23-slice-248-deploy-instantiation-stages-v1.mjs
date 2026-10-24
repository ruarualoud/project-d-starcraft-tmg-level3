// Two actual r69 inputs only: distinguish the remaining Rules phases without
// repeating the completed full query, sampling CPU, or changing live authority.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, originalReportPath, reportPath, focus] = process.argv.slice(2);
assert.ok(focus === undefined || focus === "--final-geometry-only");
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const original = JSON.parse(await readFile(originalReportPath, "utf8"));
assert.equal(hashStarcraftTmgContract(capture.state), capture.authority.stateHash);
assert.equal(hashStarcraftTmgContract(capture.domain.sourceDomain),
  capture.domain.sourceDomainHash);
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
// AuthorityEngine createEnvelope/replay returns a deep-frozen Rules state.
deepFreeze(capture.state);
deepFreeze(capture.domain);
const sourceUrl = new URL(
  "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs",
  import.meta.url);
let source = await readFile(sourceUrl, "utf8");
const phases = ["verifyRuntimeState", "enumerateOfficialSelectedRosterSpatialActionsV1",
  "canonicalPath", "assertPathBoardAndModels", "crossedForceFieldTokenIds",
  "canonicalPlacements", "geometryProjection", "validateFinalGeometry", "deployTerrainResult",
  "instantiateOfficialSelectedRosterSpatialActionV1"];
let wrappers = "";
for (const phase of phases) {
  const declaration = new RegExp(`(export )?function ${phase}\\(`, "u");
  const match = source.match(declaration);
  assert.ok(match, `missing actual phase seam ${phase}`);
  source = source.replace(declaration,
    `${match[1] || ""}function raw_${phase}(`);
  wrappers += `${match[1] || ""}function ${phase}(...args) {
    return observePhase("${phase}", () => raw_${phase}(...args));
  }\n`;
}
source = source.replace("  createOfficialModelBaseFootprintV1,",
  "  createOfficialModelBaseFootprintV1 as rawBaseFootprint,")
  .replace("  evaluateOfficialCoherencyPlacementV1,",
    "  evaluateOfficialCoherencyPlacementV1 as rawCoherencyPlacement,")
  .replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
    (_, before, relative, after) =>
      `${before}${new URL(relative, sourceUrl).href}${after}`);
source += `
let rows = {}, frames = [];
function observePhase(name, run) {
  const row = rows[name] ||= { calls: 0, inclusiveMs: 0, exclusiveMs: 0,
    modelBaseConstructions: 0 };
  const frame = { name, childrenMs: 0 };
  frames.push(frame);
  const start = performance.now();
  try { return run(); } finally {
    const elapsed = performance.now() - start;
    row.calls += 1; row.inclusiveMs += elapsed;
    row.exclusiveMs += elapsed - frame.childrenMs;
    frames.pop();
    if (frames.length) frames.at(-1).childrenMs += elapsed;
  }
}
function createOfficialModelBaseFootprintV1(input) {
  if (frames.length) rows[frames.at(-1).name].modelBaseConstructions += 1;
  return rawBaseFootprint(input);
}
function evaluateOfficialCoherencyPlacementV1(input) {
  return observePhase("official_coherency_kernel", () => rawCoherencyPlacement(input));
}
${wrappers}
export function probeActualDeployInstantiation(state, domain, parameters) {
  rows = {}; frames = [];
  let outcome;
  try {
    instantiateOfficialSelectedRosterSpatialActionV1(state, domain, parameters);
    outcome = { status: "accepted" };
  } catch (error) {
    outcome = { status: "rejected", message: String(error.message) };
  }
  return { outcome, phases: structuredClone(rows) };
}
`;
const { probeActualDeployInstantiation } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const selectedFailures = focus === "--final-geometry-only"
  ? ["SELECTED_SPATIAL_DEPLOY_TERRAIN_BLOCKED"]
  : ["SELECTED_SPATIAL_PATH_MODEL_COLLISION", "SELECTED_SPATIAL_DEPLOY_TERRAIN_BLOCKED"];
const probes = selectedFailures.map(code => {
  const event = original.stages.find(row => row.stage === "rules_instantiation_failed"
    && row.failureCode === code);
  assert.ok(event);
  const parameterIndex = event.instantiatedCandidateCount - 1;
  const observed = probeActualDeployInstantiation(capture.state,
    capture.domain.sourceDomain, capture.parameters[parameterIndex]);
  assert.equal(observed.outcome.message.split(":")[0], code);
  return { parameterIndex, expectedFailureCode: code, ...observed };
});
const report = { schemaVersion: "r69_deploy_instantiation_stage_diagnostic_v1",
  stateRevision: capture.authority.stateRevision, probes,
  stateAndDomainIdentityChecked: true, stateLifecycle: "deep_frozen_authority_state",
  scope: focus === "--final-geometry-only"
    ? "one original call-site input; newly split projection/kernel observation, not whole query timing"
    : "two original selected-Rules call-site inputs, not whole query timing",
  providerCalls: 0, realRoomMutations: 0, cpuSamplingUsed: false };
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
