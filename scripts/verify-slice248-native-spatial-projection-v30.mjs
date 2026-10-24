import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { enumerateOfficialSelectedRosterSpatialActionsV1,
  instantiateOfficialSelectedRosterSpatialActionV1,
  applyOfficialSelectedRosterSpatialActionV1 } from "../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs";
import { projectStarcraftTmgFormationRelationshipComparisonV1 } from "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { inspectOfficialMissionMarkerControlV2 } from "../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs";

// Concrete candidate-state bug: coordinate-only projection omitted the native
// activation/status/terrain effects. Uses a genuinely sealed Movement state,
// not the unsuccessfully reconstructed historical Run input.
const { state } = JSON.parse(await readFile(process.argv[2], "utf8"));
const domain = enumerateOfficialSelectedRosterSpatialActionsV1(state,
  { sideKey: state.activeSideKey, includeDisabled: true }).parameterDomains
  .find(x => x.actionType === "move" && x.pieceId === "player2-hydralisk");
assert(domain);
const leading = domain.constraints.modelProfiles[0];
const end = { xMilliInches: leading.startPoint.xMilliInches + 50,
  yMilliInches: leading.startPoint.yMilliInches };
const parameters = { leadingModelId: leading.modelId, path: [end], placements: [] };
const instance = instantiateOfficialSelectedRosterSpatialActionV1(state, domain, parameters);
const executed = applyOfficialSelectedRosterSpatialActionV1(state, instance.action).state;
const oldCoordinateOnlyActivation = state.pieces.find(x => x.id === domain.pieceId).activatedPhases.movement;
assert.equal(oldCoordinateOnlyActivation, false);
assert.equal(executed.pieces.find(x => x.id === domain.pieceId).activatedPhases.movement, true);
console.log(JSON.stringify({ stage: "concrete-old-projection-omission", oldCoordinateOnlyActivation,
  nativeActivation: true, providerCalls: 0, roomWrites: 0 }));
const comparison = projectStarcraftTmgFormationRelationshipComparisonV1({ state, source: domain,
  slots: [{ defaultModelId: leading.modelId, position: end }],
  objectives: [{ kind: "control_objective", targetIds: ["mission-marker-3"] }],
  baseline: null, instantiatedAction: instance.action,
  observeProgress: event => console.log(JSON.stringify({ stage: event.stage, elapsedMs: event.elapsedMs })),
});
assert.notEqual(comparison.status, "unknown", comparison.reason);
const expected = inspectOfficialMissionMarkerControlV2({ state: executed });
// Every candidate point row must retain the complete native qualification.
const serialized = JSON.stringify(comparison);
assert(serialized.includes('"markerQualification"'));
for (const marker of expected.markerResults) {
  const contender = Object.values(marker.contestingUnitsBySide).flat().find(x => x.unitId === domain.pieceId);
  const id = `unit:${domain.pieceId}->objective:${marker.markerId}`;
  // Comparison output is intentionally scoped to the requested objective.
  if (!serialized.includes(id)) continue;
  const find = value => {
    if (!value || typeof value !== "object") return null;
    if (value.edgeId === id && value.markerQualification) return value;
    for (const child of Object.values(value)) { const row = find(child); if (row) return row; }
    return null;
  };
  const row = find(comparison);
  assert(row, id);
  assert.equal(row.markerQualification.eligibleToContest, Boolean(contender));
  assert.deepEqual(row.markerQualification.supplyTotals, marker.supplyTotals);
  assert.equal(row.markerQualification.projectedCleanupControlSideKey, marker.nextControlSideKey);
}
console.log(JSON.stringify({ ok: true, nativeCandidateQualified: true,
  currentStateUnchanged: state.pieces.find(x => x.id === domain.pieceId).activatedPhases.movement === false,
  providerCalls: 0, roomWrites: 0 }));
