import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as control from "../packages/rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from "../packages/online-agent-session/tactical-relationship-graph-v1.mjs";
import { compactQueryReceiptForPrompt } from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1,
  STARCRAFT_TMG_RETIRED_SPATIAL_QUERY_KINDS_V1,
  inspectStarcraftTmgSpatialQueryResultV1 } from "../packages/online-agent-session/spatial-query-contracts-v1.mjs";

// Concrete bugs: absent full qualification; same-authority wrong-tool reply
// accepted as exact. These are actual sealed room snapshots, not synthetic
// strategy positions. No Provider, Room writes, or historical gate reruns.
const fixture = JSON.parse(await readFile(process.argv[2], "utf8"));
const failures = [];
async function check(name, run) {
  try { await run(); console.log(JSON.stringify({ name, ok: true })); }
  catch (error) { failures.push(name); console.log(JSON.stringify({ name, ok: false, error: error.message })); }
}
await check("wrong-query-kind-is-not-exact", async () => {
  const a = fixture.cases[0];
  const hash = "a".repeat(64);
  const input = {
    roomProjection: { room: { roomId: a.roomId, stateRevision: a.stateRevision, stateHash: a.stateHash },
      matchBinding: { bindingHash: a.matchBindingHash }, viewer: { seatKey: "player1", visibilityScope: "seat" } },
    legalSpace: { roomId: a.roomId, stateRevision: a.stateRevision, stateHash: a.stateHash,
      matchBindingHash: a.matchBindingHash, legalSpaceHash: hash, parameterDomains: [] },
    request: { queryKind: "space.inspect_relationships", arguments: {} },
  };
  const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({ rulesQuery: async request => ({
    ok: true, authority: request.authority, precision: "exact", rulesAuthority: true,
    queryKind: "instantiate_parameterized_action", result: { proposalAccepted: true },
  }) });
  const result = await runtime.query(input);
  assert.equal(result.status, "unknown");
  assert.equal(result.reason, "rules_query_kind_mismatch");
});
await check("actual-native-qualification-matches-executed-cleanup", () => {
  assert.equal(typeof control.inspectOfficialMissionMarkerControlV2, "function");
  for (const a of fixture.cases) {
    const before = JSON.stringify(a.state);
    const result = control.inspectOfficialMissionMarkerControlV2({ state: a.state, matchBinding: a.matchBinding });
    assert.equal(JSON.stringify(a.state), before, `${a.id} mutated`);
    assert.equal(result.observedPhase, a.state.phase);
    assert.equal(result.mutationAuthority, false);
    if (a.id === "B136") {
      const row = result.markerResults.find(x => x.markerNumber === 5);
      const bad = fixture.actualBadReason.pieceId;
      assert.equal(typeof bad, "string");
      assert(!Object.values(row.contestingUnitsBySide).flat().some(x => x.unitId === bad));
      assert(row.ineligibleUnits.some(x => x.unitId === bad));
    } else {
      for (const expected of a.expectedRound3MarkerResults) {
        const row = result.markerResults.find(x => x.markerId === expected.markerId);
        assert.deepEqual(row.supplyTotals, expected.supplyTotals, `${a.id}/${row.markerId} supply`);
        assert.deepEqual(row.contestingUnitsBySide, expected.contestingUnitsBySide, `${a.id}/${row.markerId} eligibility/LOS`);
        assert.deepEqual(row.ineligibleUnits, expected.ineligibleUnits, `${a.id}/${row.markerId} exclusion`);
        assert.equal(row.nextControlSideKey, expected.nextControlSideKey, `${a.id}/${row.markerId} control`);
      }
    }
  }
  assert.throws(() => control.resolveOfficialMissionMarkerControlV2({
    state: fixture.cases.find(x => x.id === "B152").state,
    matchBinding: fixture.cases.find(x => x.id === "B152").matchBinding,
  }), /MISSION_MARKER_CONTROL_STATE_INVALID/);
});
await check("both-seats-current-control-no-guessed-domain", async () => {
  const a = fixture.cases.find(x => x.id === "B152");
  for (const seatKey of ["player1", "player2"]) {
    const authority = { roomId: a.roomId, stateRevision: a.stateRevision,
      stateHash: a.stateHash, matchBindingHash: a.matchBindingHash,
      legalSpaceHash: "a".repeat(64), seatKey };
    const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({ seatKey,
      roomStore: { loadRoom: async () => ({ stateRevision: a.stateRevision,
        envelope: { state: a.state, stateHash: a.stateHash, matchBindingHash: a.matchBindingHash,
          matchBinding: a.matchBinding } }) },
      rulesRuntime: { instantiate: () => { throw new Error("current control must not instantiate a candidate"); } },
    });
    const reply = await adapter.query({ authority, queryKind: "mission_marker_control",
      arguments: { markerIds: ["mission-marker-3"] } });
    assert.equal(reply.precision, "exact", reply.reason);
    assert.equal(inspectStarcraftTmgSpatialQueryResultV1("mission_marker_control", reply), null);
    const row = reply.result.markerResults[0];
    const expected = a.expectedRound3MarkerResults.find(x => x.markerNumber === 3);
    assert.deepEqual(row.contestingUnitsBySide, expected.contestingUnitsBySide);
    assert.deepEqual(row.supplyTotals, expected.supplyTotals);
    assert(reply.result.allCompetingUnitsIncluded);
  }
});
await check("actual-out-of-range-reason-survives-graph-and-model-compaction", () => {
  const a = fixture.cases.find(x => x.id === "B136");
  const graph = buildStarcraftTmgTacticalRelationshipGraphV1({ state: a.state, seatKey: "player2",
    request: { subjectUnitIds: [fixture.actualBadReason.pieceId], targetIds: ["mission-marker-5"], intent: "advance" } });
  const edge = graph.relationships.find(x => x.toObjectiveId === "mission-marker-5");
  assert(edge);
  assert.equal(edge.canGeometricallyContestNow, false);
  assert.equal(edge.markerQualification.status, "exact");
  assert.equal(edge.markerQualification.eligibleToContest, false);
  const receipt = { queryKind: "space.inspect_relationships", status: "advisory_estimate", result: graph };
  const compact = compactQueryReceiptForPrompt(receipt);
  const compactEdge = compact.result.relationships.find(x => x.toObjectiveId === "mission-marker-5");
  assert.deepEqual(compactEdge.markerQualification, edge.markerQualification);
});
await check("unimplemented-query-names-not-advertised-as-calculations", async () => {
  for (const name of Object.keys(STARCRAFT_TMG_RETIRED_SPATIAL_QUERY_KINDS_V1)) {
    assert(!STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1.includes(name));
  }
  assert.equal(inspectStarcraftTmgSpatialQueryResultV1("action_specific_threat", {
    queryKind: "action_specific_threat", precision: "exact",
    result: { proposalAccepted: true, domainId: "domain", actionHash: "a".repeat(64), action: {} },
  }), "threat_query_result_invalid");
});
console.log(JSON.stringify({ ok: failures.length === 0, failures, providerCalls: 0, roomWrites: 0 }));
process.exitCode = failures.length ? 1 : 0;
