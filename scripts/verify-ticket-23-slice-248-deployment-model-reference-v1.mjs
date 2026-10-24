#!/usr/bin/env node

// Concrete regression for the accepted C r91 Queen deployment. Read the real
// Room directly; never create a Store writer, replay an action or call a model.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import {
  createOfficialCurrentProductMatchRuntimeV6,
  projectOfficialSingletonIdentityStateV6,
} from "../packages/product-composition/official-current-product-match-runtime-v6.mjs";
import { projectOfficialOmegaWormPieceV1 } from
  "../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs";
import {
  loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1,
} from "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))
  ?.slice(name.length + 3);
const directory = path.resolve(argument("case-dir") || path.join(root,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1",
  "performance-baseline-C-20261010-v1"));
const reportPath = argument("report") ? path.resolve(argument("report")) : null;
const privateState = JSON.parse(await readFile(path.join(directory,
  "runner-private.json"), "utf8"));
const runId = path.basename(directory);
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${runId}`,
  trustLevel: "development_persistent",
});
const database = new DatabaseSync(path.join(directory, "room.sqlite"),
  { readOnly: true });
let row;
try {
  row = database.prepare("SELECT state_revision, aggregate_cipher, initial_envelope_cipher FROM sc_rooms WHERE room_id = ?")
    .get(privateState.roomId);
} finally {
  database.close();
}
assert.ok(row, "actual Room must exist");
const aggregate = codec.decode(row.aggregate_cipher,
  `room:${privateState.roomId}:aggregate`);
const initialEnvelope = codec.decode(row.initial_envelope_cipher,
  `room:${privateState.roomId}:initial-envelope`);
const state = aggregate.envelope.state;
assert.equal(Number(row.state_revision), 91, "use the actual stopped r91, not a substitute state");
const sourceRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root });
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: sourceRoot });
const legacy = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: initialEnvelope.state,
});
const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime: legacy });
const report = {
  schemaVersion: "slice248_deployment_model_reference_regression_v1",
  recordedAt: new Date().toISOString(),
  roomId: privateState.roomId,
  stateRevision: Number(row.state_revision),
  stateHash: aggregate.envelope.stateHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  readOnly: true,
  originalRoomWrites: 0,
  providerCalls: 0,
  replayedActions: 0,
  currentQueen: state.pieces.filter(piece => piece.id === "player2-queen")
    .map(piece => ({ id: piece.id, isOnField: piece.isOnField,
      currentModels: piece.currentModels, models: piece.models.map(model => ({
        id: model.id, isOnField: model.isOnField, isDestroyed: model.isDestroyed,
      })) })),
  ok: false,
  trainingTruth: false,
};
try {
  const originalStateText = JSON.stringify(state);
  // The new source must not reinterpret the frozen legacy accepted prefix.
  assert.throws(() => legacy.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true }), /MODEL_BASE_GEOMETRY_REFERENCE_INVALID/);
  const projected = projectOfficialSingletonIdentityStateV6(state);
  assert.equal(projected.repairs.length, 1);
  assert.equal(new Set(projected.state.pieces.map(piece => piece.id)).size,
    projected.state.pieces.length);
  const active = piece => piece.isOnField === true && piece.isDestroyed !== true
    && Number(piece.currentModels || 0) > 0;
  assert.deepEqual(projected.state.pieces.filter(active), state.pieces.filter(active),
    "repair must preserve every physical live model and its position");
  const point = { xMilliInches: 3000, yMilliInches: 3000 };
  const fresh = projectOfficialOmegaWormPieceV1(projected.state, "player2", point);
  assert.ok(![...projected.state.pieces,
    ...projected.state.officialRetiredSingletonPieces].some(piece => piece.id === fresh.id),
  "new summon must not reuse even a retired identity");
  assert.deepEqual(fresh,
    projectOfficialOmegaWormPieceV1(projected.state, "player2", point),
    "Preview and Apply must allocate the same deterministic identity");
  const ambiguous = structuredClone(state);
  const old = ambiguous.pieces.find(piece => piece.id === "player2-omega-worm");
  old.isOnField = true; old.isDestroyed = false; old.currentModels = 1;
  old.models.forEach(model => { model.isOnField = true; model.isDestroyed = false; });
  assert.throws(() => runtime.enumerate(ambiguous, { sideKey: state.activeSideKey }),
    /CURRENT_PRODUCT_PIECE_ID_COLLISION_UNRESOLVED/,
    "two live incarnations must remain High, never silently selected");
  const legal = runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true });
  assert.ok(legal.candidates.length + legal.parameterDomains.length > 0,
    "accepted nonterminal deployment must retain a legal continuation");
  report.candidateCount = legal.candidates.length;
  report.parameterDomainCount = legal.parameterDomains.length;
  report.identityRepairs = projected.repairs;
  report.futureSummonId = fresh.id;
  report.legacyBehaviorPreserved = true;
  report.physicalLiveBoardUnchanged = true;
  report.ambiguousLiveCollisionRejected = true;
  assert.equal(JSON.stringify(state), originalStateText,
    "diagnostic and runtime projection must not modify the saved input");
  report.ok = true;
} catch (error) {
  report.error = { message: String(error.message), stack: String(error.stack) };
  process.exitCode = 1;
}
if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`,
  { mode: 0o600 });
console.log(JSON.stringify(report));
