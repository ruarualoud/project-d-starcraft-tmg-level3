#!/usr/bin/env node
// Concrete r49 bug: valid Roachling layouts use new model IDs, but the
// relationship projection checked those IDs against the unchanged Corpser.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "../packages/online-agent-session/tactical-relationship-graph-v1.mjs";

const directory = process.argv.find((arg) => arg.startsWith("--run-directory="))
  ?.slice("--run-directory=".length);
assert(directory, "--run-directory required");
const privateState = JSON.parse(await readFile(
  path.join(directory, "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
  trustLevel: "development_persistent",
});
const db = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let checkpoint;
try {
  checkpoint = codec.decode(db.prepare(
    "SELECT checkpoint_cipher FROM sc_checkpoints WHERE room_id=? AND state_revision=48"
  ).get(privateState.roomId).checkpoint_cipher,
  `room:${privateState.roomId}:checkpoint:48`);
} finally { db.close(); }
// The persisted pre-summon checkpoint is immutable. This is a focused
// consumer fixture, not a reconstruction/reacceptance of the whole r49 plan.
const state = checkpoint.state;
const original = structuredClone(state);
const adapter = createOfficialUnitLifecycleFamilyAdapterV1(
  state.officialUnitLifecycleFamilySourceBundle);
const domain = adapter.legalSpace(state, { sideKey: "player2" })
  .parameterDomains.find((entry) => entry.effectKind === "summon_roachling");
assert(domain, "frozen real scene exposes the summon domain");
const actions = new Map();
const started = performance.now();
const result = searchStarcraftTmgLegalFormationOptionsV1({
  state, domain,
  request: { maximumOptions: 1, maximumCandidateAttempts: 128,
    preferredAnchor: { xMilliInches: 18000, yMilliInches: 12000 },
    formationObjectives: [{ kind: "advance", weight: 4,
      targetIds: ["mission-marker-4"] }] },
  instantiate: (authorityState, authorityDomain, parameters) => {
    const preview = adapter.preview(authorityState, {
      domain: authorityDomain, parameters,
    });
    const canonicalParameters = preview.action.unitLifecyclePlan.canonicalParameters;
    actions.set(JSON.stringify(canonicalParameters), preview.action);
    // Product composition wraps the adapter action; exercise the real seam.
    return { canonicalParameters, action: {
      actionType: preview.action.actionType, pieceId: preview.action.pieceId,
      sideKey: preview.action.sideKey, sourceAction: preview.action,
    } };
  },
});
assert.equal(result.optionCount, 1, "a real Rules-validated summon option exists");
const option = result.formationOptions[0];
assert.equal(option.relationshipComparison.status, "available",
  `new-unit geometry must not be compared with the caster IDs: ${option.relationshipComparison.reason}`);
const action = actions.get(JSON.stringify(option.canonicalParameters));
assert(action, "selected option retains its canonical Rules action");
const reference = adapter.apply(state, { action }).state;
const createdId = option.canonicalParameters.createdPieceId;
const created = reference.pieces.find((piece) => piece.id === createdId);
assert.equal(created.officialUnitRecordKey, "army_units:roachling");
assert.equal(created.currentModels, option.slots.length);
assert.equal(created.currentSupply, 0);
assert.equal(created.activatedPhases.movement, true);
assert.deepEqual(reference.pieces.find((piece) => piece.id === domain.pieceId),
  state.pieces.find((piece) => piece.id === domain.pieceId),
  "the summoner is not moved or replaced by the summoned layout");
const enemies = reference.pieces.filter((piece) => piece.sideKey !== created.sideKey
  && piece.isOnField === true && !piece.isDestroyed && piece.currentModels > 0)
  .map((piece) => piece.id);
const graph = buildStarcraftTmgTacticalRelationshipGraphV1({
  state: reference, seatKey: created.sideKey, hypotheticalProjection: true,
  request: { intent: option.relationshipComparison.intent,
    subjectUnitIds: [created.id], targetIds: ["mission-marker-4", ...enemies],
    maximumRelations: 64 },
});
const compared = option.relationshipComparison.relationships;
assert(compared.length > 0);
for (const edge of compared) {
  const expected = graph.relationships.find((item) => item.edgeId === edge.edgeId);
  assert(expected, `edge belongs to the actual summoned Unit: ${edge.edgeId}`);
  if (edge.edgeKind === "unit_spatial_relationship") {
    assert.equal(edge.fromUnitId, createdId);
    assert.equal(edge.minimumBaseEdgeDistanceMilliInches,
      expected.nearestPhysicalEdges.distanceMilliInches);
    assert.equal(edge.outgoingThreatActionWindow.movementCurrentRoundAvailable, false,
      "summoned Unit already spent its current Movement activation");
  }
}
assert.equal(option.relationshipComparison.subjectUnitId, createdId);
assert.equal(option.relationshipComparison.sourceActorUnitId, domain.pieceId);
assert.deepEqual(state, original, "hypothetical evaluation never mutates the Room input");
const report = { schema: "ticket23_slice248_summoned_formation_subject_v1", ok: true,
  fixtureStateRevision: checkpoint.stateRevision, createdUnitId: createdId,
  comparedEdges: compared.length, actualRulesCreationAndActivationUsed: true,
  parentUnmoved: true, roomInputUnchanged: true,
  elapsedMs: Math.round(performance.now() - started),
  providerCalls: 0, roomMutations: 0, trainingTruth: false };
await writeFile(path.join(directory, "summoned-formation-subject-report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
