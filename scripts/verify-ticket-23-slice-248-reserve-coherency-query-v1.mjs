#!/usr/bin/env node
// Concrete r57 failure: a reserve Goliath coherency read accidentally asks a
// fielded Queen to detect an unpositioned hypothetical model. No paid calls.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import * as characteristics from
  "../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs";

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
const room = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let state;
try {
  state = codec.decode(room.prepare(
    "SELECT checkpoint_cipher FROM sc_checkpoints WHERE room_id=? AND state_revision=56"
  ).get(privateState.roomId).checkpoint_cipher,
  `room:${privateState.roomId}:checkpoint:56`).state;
} finally { room.close(); }
// r57 only finishes the previous activation. This immutable checkpoint has
// the same reserve/Queen geometry; this test stops at the Rules boundary and
// does NOT pretend to reaccept a r57 action against a r56 authority.
const provider = new DatabaseSync(path.join(directory,
  "seats/player1/provider/live-decisions.sqlite"), { readOnly: true });
let choice;
try {
  const record = JSON.parse(provider.prepare(
    "SELECT record_json FROM sc_live_decision_records"
  ).get().record_json);
  choice = Object.values(record.decisions).find((entry) =>
    entry.authority?.stateRevision === 57);
} finally { provider.close(); }
const domain = choice.actionIndex.find((entry) =>
  entry.action?.pieceId === "player1-goliath-2"
    && entry.action?.actionType === "deploy").action;
const submitted = Object.values(choice.attempts).flatMap((entry) =>
  entry.safeOutput?.providerTurn?.toolCalls || []).find((entry) =>
  entry.name === "submit_planning"
    && entry.arguments?.recommendedCandidateId === domain.domainId).arguments;
const original = structuredClone(state);
const started = performance.now();
let instantiationBoundaryCalls = 0;
const result = searchStarcraftTmgLegalFormationOptionsV1({
  state, domain,
  request: {
    maximumOptions: 1, maximumCandidateAttempts: 1,
    preferredAnchor: { xMilliInches: submitted.formationPreferredX,
      yMilliInches: submitted.formationPreferredY },
    formationObjectives: submitted.formationObjectives,
    tacticalPurpose: submitted.formationTacticalPurpose,
  },
  instantiate: () => {
    instantiationBoundaryCalls += 1;
    throw new Error("FOCUSED_RULES_BOUNDARY_REACHED");
  },
});
assert.equal(instantiationBoundaryCalls, 1,
  "reserve layout must reach Rules instead of unrelated detection geometry");
assert.equal(result.failureCounts.FOCUSED_RULES_BOUNDARY_REACHED, 1);
assert.equal(result.optionCount, 0, "stub does not certify any placement");
const bundle = state.officialCharacteristicStatusFamilySourceBundle;
const narrow = characteristics.projectOfficialHorizontalCoherencyV1;
assert.equal(narrow(bundle, state, { pieceId: domain.pieceId,
  assumeDeployed: true }).horizontalCoherencyMilliInches, 3000);
const fielded = state.pieces.filter((piece) => piece.isOnField === true
  && piece.isDestroyed !== true && piece.currentModels > 0);
const comparisons = fielded.map((piece) => {
  const exact = characteristics.projectOfficialCharacteristicStatusFamilyModifiersV1(
    bundle, state, { pieceId: piece.id }).horizontalCoherencyMilliInches;
  assert.equal(narrow(bundle, state, { pieceId: piece.id })
    .horizontalCoherencyMilliInches, exact);
  return { pieceId: piece.id, range: exact };
});
assert(comparisons.some((entry) => entry.range === 4000),
  "the real swarm's printed coherency exception is retained");
const malformed = structuredClone(state);
const hypothetical = malformed.pieces.find((piece) => piece.id === domain.pieceId);
hypothetical.isOnField = true;
hypothetical.isInReserves = false;
for (const model of hypothetical.models) model.isOnField = true;
assert.throws(() => characteristics.projectOfficialCharacteristicStatusFamilyModifiersV1(
  bundle, malformed, { pieceId: domain.pieceId }), /MODEL_BASE_GEOMETRY_VALUE_INVALID/,
"full detection projection must still reject a positioned-unit claim without coordinates");
assert.deepEqual(state, original, "no input or Room mutation");
const report = { schema: "ticket23_slice248_reserve_coherency_query_v1", ok: true,
  fixtureCheckpointRevision: 56, capturedDecisionRevision: 57,
  instantiationBoundaryCalls, realRulesPlacementCertified: false,
  fieldedProjectionComparisons: comparisons, malformedFullProjectionStillRejected: true,
  inputUnchanged: true, elapsedMs: Math.round(performance.now() - started),
  providerCalls: 0, roomMutations: 0, trainingTruth: false };
await writeFile(path.join(directory, "reserve-coherency-query-report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
