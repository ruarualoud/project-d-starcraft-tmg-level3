// Concrete C108 bug: production singleton v6 inherits BASE v1, not v4/v5.
// Read original inputs only; exercise the actual factory parent and Host binder.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV6 } from
  "../packages/product-composition/official-current-product-match-runtime-v6.mjs";
import { enumerateOfficialSelectedRosterMeleeActionsV1 } from
  "../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs";
import { resolveStarcraftTmgDeterministicSingletonActionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const [worktree, capturePath, originalDirectory, reportPath] = process.argv.slice(2);
const report = { schemaVersion: "ticket23_C108_actual_base_parent_wiring_v1",
  providerCalls: 0, originalRoomWrites: 0, performancePromotionAdmitted: false,
  onlineHostReplayVerified: false };
const start = performance.now();
try {
  const capture = JSON.parse(gunzipSync(await readFile(capturePath)));
  const state = capture.state;
  assert.equal(hash(state), capture.stateHash);
  assert.equal(capture.stateRevision, 108);
  const fork = JSON.parse(await readFile(path.join(originalDirectory,
    "fork-private.json"), "utf8"));
  assert(fork.sourceDirectory.startsWith(worktree + "/build/"));
  const credentials = JSON.parse(await readFile(path.join(fork.sourceDirectory,
    "runner-private.json"), "utf8"));
  const database = new DatabaseSync(path.join(fork.sourceDirectory,
    "room.sqlite"), { readOnly: true });
  const row = database.prepare(
    "SELECT room_id, initial_envelope_cipher FROM sc_rooms WHERE room_id = ?")
    .get(fork.sourceRoomId);
  database.close();
  assert(row, "ORIGINAL_INITIAL_ENVELOPE_MISSING");
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: credentials.storeEncryptionKeyBase64,
    keyId: "ticket23-slice248-room-store-" + path.basename(fork.sourceDirectory),
    trustLevel: "development_persistent",
  });
  const initial = codec.decode(row.initial_envelope_cipher,
    `room:${row.room_id}:initial-envelope`);
  const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
    root: worktree });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
    root: fixtureRoot });
  // Exactly the production singleton_identity_v6 factory composition.
  const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset,
      state: initial.state }) });
  assert.equal(runtime.descriptor.runtimeHash,
    "c6a7e2b6d4cca71653a069a160458d1d0ec72959d31564d196fe4b1ff94cc52a");
  report.runtimeHash = runtime.descriptor.runtimeHash;
  report.realParentRuntimeId = runtime.legacyRuntimeDescriptor.runtimeId;
  const domain = runtime.enumerate(state, { sideKey: "player1" })
    .parameterDomains.find(entry => entry.actionType === "resolve_charge");
  assert(domain);
  report.exposedOutcomes = domain.parameterSchema.outcome;
  assert.deepEqual(domain.parameterSchema.outcome, ["failure"],
    "ACTUAL_BASE_PARENT_DOES_NOT_EXPOSE_CERTIFIED_C108_FAILURE");
  const selected = { kind: "parameterized", id: domain.domainId, action: domain };
  const forced = resolveStarcraftTmgDeterministicSingletonActionV1([selected]);
  assert(forced, "ACTUAL_FAILURE_NOT_BOUND_BY_EXISTING_HOST_SINGLETON_PATH");
  const instance = runtime.instantiate(state, domain, forced.proposal.parameters);
  const transition = runtime.apply(state, instance.action, { postRevision: 109 });
  assert.equal(transition.ok, true);
  assert.equal(transition.state.pendingAction, undefined);
  const sourceAction = instance.action.sourceAction;
  assert.equal(sourceAction.chargeResolutionPlan.chargeRoll, 6);
  assert.equal(sourceAction.chargeResolutionPlan.pendingHash,
    state.pendingAction.pendingHash);
  assert.equal(sourceAction.chargeResolutionPlan.failureProof.recomputedByRules, true);
  for (const piece of state.pieces) {
    const after = transition.state.pieces.find(entry => entry.id === piece.id);
    assert.deepEqual(after.models, piece.models);
    assert.equal(after.currentSupply, piece.currentSupply);
    if (piece.id === state.pendingAction.pieceId) {
      assert.equal(after.activatedPhases.assault, true);
    }
  }
  // An unsupported access route must not be labelled forced/impossible.
  const portal = structuredClone(state);
  portal.board.accessPoints = [{ id: "test-unresolved-access" }];
  const unknownDomain = enumerateOfficialSelectedRosterMeleeActionsV1(portal,
    { sideKey: "player1" }).parameterDomains.find(entry =>
    entry.actionType === "resolve_charge");
  assert.deepEqual(unknownDomain.parameterSchema.outcome, ["success", "failure"]);
  assert.equal(hash(state), capture.stateHash);
  report.domainId = domain.domainId;
  report.outcome = sourceAction.chargeResolutionPlan.outcome;
  report.forcedParameterBinding = forced.parameterBinding;
  report.rolledSixPreserved = true;
  report.allModelsAndSupplyPreserved = true;
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.message;
  throw error;
} finally {
  report.elapsedMs = performance.now() - start;
  await writeFile(reportPath, JSON.stringify(report) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
}
