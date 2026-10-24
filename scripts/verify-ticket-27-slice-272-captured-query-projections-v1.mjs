import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { projectPregameMapRouteRequestV1 } from
  "../packages/roster-strategist/pregame-map-evidence-port-v1.mjs";
import { projectPregameSpatialRelationshipV1 } from
  "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import { createRosterStrategistRuntimeV1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";

const filename = process.argv.find(value => value.startsWith("--fixture="))
  ?.slice("--fixture=".length);
assert.ok(filename, "captured query fixture is required");
const fixture = JSON.parse(await readFile(filename, "utf8"));
assert.equal(typeof createRosterStrategistRuntimeV1, "function");
const failures = [];
const check = (name, run) => {
  try { run(); }
  catch (error) { failures.push({ name, message: error.message }); }
};
check("real map-route request retains explicit player1", () => {
  const raw = fixture.mapNeed.toolRequest;
  const original = structuredClone(raw);
  assert.equal(raw.seatKey, "player1");
  assert.equal(raw.sideId, "");
  assert.deepEqual(projectPregameMapRouteRequestV1(raw), {
    sideId: "player1", baseId: raw.baseId, targetId: raw.targetId,
  });
  assert.deepEqual(raw, original);
  assert.deepEqual(projectPregameMapRouteRequestV1({}), {},
    "missing identity must never silently default to a player");
  assert.deepEqual(projectPregameMapRouteRequestV1({
    sideId: "player2", seatKey: "player2", baseId: raw.baseId,
  }), { sideId: "player2", baseId: raw.baseId });
  assert.throws(() => projectPregameMapRouteRequestV1({
    sideId: "player1", seatKey: "player2",
  }), /PREGAME_MAP_ROUTE_SIDE_IDENTITY_CONFLICT/);
});
check("real native objective edge retains complete geometry", () => {
  const edge = fixture.nativeObjectiveEdge;
  assert.equal(edge.edgeKind, "objective_relationship");
  const original = structuredClone(edge);
  const projected = projectPregameSpatialRelationshipV1(edge);
  assert.deepEqual(projected, {
    ...edge, relationshipHash: hashStarcraftTmgContract(edge),
  });
  assert.equal(projected.minimumBaseEdgeDistanceMilliInches, 31552);
  assert.equal(projected.canGeometricallyContestNow, false);
  assert.equal(projected.exactControlStillRequiresCurrentMissionEligibilityAndLos,
    true, "geometric range cannot become a guaranteed scoring result");
  assert.deepEqual(edge, original);
  const futureField = { ...edge, newNativeGeometryFact: { measured: true } };
  assert.deepEqual(projectPregameSpatialRelationshipV1(futureField), {
    ...futureField, relationshipHash: hashStarcraftTmgContract(futureField),
  }, "native objective facts must not be silently whitelist-trimmed");
});
console.log(JSON.stringify({ ok: failures.length === 0, failures,
  capturedBugs: 2, paidCalls: 0, roomWrites: 0, trainingTruth: false }));
if (failures.length) process.exitCode = 1;
