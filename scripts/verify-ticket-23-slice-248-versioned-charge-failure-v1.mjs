#!/usr/bin/env node

// Concrete r113 regression: read the frozen Room, but settle only a cloned
// state under a new Rules version. Never change the original Room or journal.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createOfficialCurrentProductMatchRuntimeV2,
  OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND,
  OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND,
} from "../packages/product-composition/official-current-product-match-runtime-v2.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import {
  loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1,
} from "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv.find((entry) => entry.startsWith("--run-directory="));
assert(argument, "--run-directory is required");
const revisionArgument = process.argv.find((entry) =>
  entry.startsWith("--expected-revision="));
const pieceArgument = process.argv.find((entry) =>
  entry.startsWith("--expected-piece-id="));
assert(revisionArgument && pieceArgument,
  "--expected-revision and --expected-piece-id are required");
const expectedRevision = Number(revisionArgument.split("=")[1]);
const expectedPieceId = pieceArgument.slice("--expected-piece-id=".length);
const runDirectory = path.resolve(argument.slice("--run-directory=".length));
const runId = path.basename(runDirectory);
const privateState = JSON.parse(await readFile(path.join(runDirectory,
  "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${runId}`,
  trustLevel: "development_persistent",
});
const database = new DatabaseSync(path.join(runDirectory, "room.sqlite"),
  { readOnly: true });
let envelope;
try {
  const row = database.prepare(
    "SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?",
  ).get(privateState.roomId);
  assert(row, "the original Room must exist");
  envelope = codec.decode(row.aggregate_cipher,
    `room:${privateState.roomId}:aggregate`).envelope;
} finally {
  database.close();
}
assert.equal(envelope.stateRevision, expectedRevision);
assert.equal(envelope.state.pendingAction?.pieceId, expectedPieceId);
const frozenOriginalHash = hashStarcraftTmgContract(envelope.state);
const state = structuredClone(envelope.state);
const sourceRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root });
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: sourceRoot });
const openingRosterIds = new Set(["player1", "player2"].flatMap((sideKey) =>
  state.armyCompositionUpgradeAuditsBySide[sideKey].units.map((unit) =>
    unit.unitInstanceId)));
const runtimeSeed = structuredClone(state);
runtimeSeed.pieces = runtimeSeed.pieces.filter((piece) =>
  openingRosterIds.has(piece.id));
const legacyRuntime = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: runtimeSeed,
});
const runtime = createOfficialCurrentProductMatchRuntimeV2({ legacyRuntime });
assert.notEqual(runtime.descriptor.runtimeHash,
  envelope.matchBinding.rulesRuntimeBinding.runtimeHash);
assert.equal(runtime.descriptor.productionRoomEligible, false);
const space = runtime.enumerate(state, { sideKey: state.activeSideKey });
const domain = space.parameterDomains.find((entry) =>
  entry.parameterKind === OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND);
assert(domain, "the v2 Rules domain must own the proven failed Charge");
assert.equal(space.parameterDomains.filter((entry) =>
  entry.actionType === "resolve_charge").length, 1);
assert.equal(domain.constraints.pendingHash, state.pendingAction.pendingHash);
const parameters = { outcome: "failure",
  failureProof: { kind: OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND } };
assert.throws(() => runtime.instantiate(state, domain, {
  ...parameters,
  failureProof: { kind: OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND,
    certificateHash: "forged" },
}), /CHARGE_ENDPOINT_FAILURE_DOMAIN_OR_PARAMETERS_INVALID/);
const preview = runtime.instantiate(state, domain, parameters);
assert.equal(preview.action.chargeResolutionPlan.failureProof.recomputedByRules,
  true);
const prePositions = state.pieces.flatMap((piece) => (piece.models || []).map(
  (model) => [piece.id, model.id, model.xInches, model.yInches]));
const result = runtime.apply(state, preview.action, { postRevision: 114 });
assert.equal(result.events[0]?.type, "charge_failed");
assert.equal(result.events[0]?.modelPositionsChanged, false);
assert.equal(result.state.pendingAction, undefined);
assert.equal(result.state.pieces.find((piece) =>
  piece.id === expectedPieceId)?.activatedPhases?.assault, true);
assert.deepEqual(result.state.pieces.flatMap((piece) =>
  (piece.models || []).map((model) =>
    [piece.id, model.id, model.xInches, model.yInches])), prePositions);
assert.throws(() => runtime.apply(result.state, preview.action,
  { postRevision: 115 }), /CHARGE_ENDPOINT_FAILURE_DOMAIN_STALE/);
assert.equal(hashStarcraftTmgContract(envelope.state), frozenOriginalHash);
const engine = createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime });
const fork = engine.createEnvelope({
  roomId: `${privateState.roomId}-charge-v2-probe`,
  stateRevision: envelope.stateRevision,
  privateJournalSequence: envelope.privateJournalSequence,
  state,
});
const seatAuthority = engine.issueSeatAuthority({
  roomId: fork.roomId,
  matchBindingHash: fork.matchBindingHash,
  seatKey: state.activeSideKey,
  roleMode: "supervisor",
  principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"],
});
const lease = engine.issueControlLease({ seatAuthority,
  sessionId: "charge-v2-probe", leaseFence: 1,
  issuedAtRoomRevision: fork.stateRevision });
const legal = engine.legalSpace(fork, { seatAuthority });
const authorityDomain = legal.parameterDomains.find((entry) =>
  entry.parameterKind === OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND);
assert(authorityDomain, "the new rule kind must reach Authority LegalSpace");
const authorityPreview = engine.preview({
  envelope: fork, seatAuthority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters },
});
assert.equal(authorityPreview.ok, true,
  authorityPreview.reason || "Authority Preview rejected the proof");
const confirmation = engine.confirmPreview({
  envelope: fork, seatAuthority, preview: authorityPreview.preview,
});
assert.equal(confirmation.ok, true,
  confirmation.reason || "test-fork human confirmation rejected");
const applied = engine.apply({
  envelope: fork, seatAuthority, controlLease: lease,
  preview: authorityPreview.preview,
  confirmation: confirmation.confirmation,
  expectedStateRevision: fork.stateRevision,
  idempotencyKey: `charge-v2-probe-r${expectedRevision}`,
});
assert.equal(applied.ok, true,
  applied.reason || "Authority Apply rejected the proof");
const replay = engine.replay({ initialEnvelope: fork,
  journal: [applied.receipt] });
assert.equal(replay.ok, true,
  replay.reason || "Authority Replay diverged");
assert.equal(replay.envelope.stateHash, applied.envelope.stateHash);
process.stdout.write(`${JSON.stringify({
  originalRevision: envelope.stateRevision,
  originalRoomUnchanged: true,
  newRuntimeHash: runtime.descriptor.runtimeHash,
  legacyRuntimeHashMatchesOriginalRoom:
    legacyRuntime.descriptor.runtimeHash
      === envelope.matchBinding.rulesRuntimeBinding.runtimeHash,
  certificateHash: domain.constraints.certificateHash,
  chargeFailed: true,
  noMovement: true,
  forkPreviewApplyReplay: true,
  forkPostRevision: applied.envelope.stateRevision,
  nextActiveSideKey: result.state.activeSideKey,
  trainingTruth: false,
})}\n`);
