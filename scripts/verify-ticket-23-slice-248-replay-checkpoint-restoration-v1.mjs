// Reproduce unnecessary checkpoint-state restoration on an exact replay memo hit.
// The compatibility fixture isolates AuthorityEngine work, not current game rules.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from
  "../../scripts/starcraft-tmg-rules-v0.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = path.resolve(path.dirname(fileURLToPath(
  import.meta.resolve("../../scripts/starcraft-tmg-rules-v0.mjs"))), "..");
const data = await loadStarcraftTmgData(projectRoot);
const engine = createStarcraftTmgAuthoritativeEngine();
const state = createStarcraftTmgSampleState(data);
state.board.terrain = [];
const plain = value => JSON.parse(JSON.stringify(value));
const initialEnvelope = plain(engine.createEnvelope({
  roomId: "s248-checkpoint-restoration-local-fixture", state,
  dataVersion: data.version,
}));
const checkpointResult = engine.createCheckpoint(initialEnvelope);
assert.equal(checkpointResult.ok, true);
const checkpoint = plain(checkpointResult.checkpoint);
const seatAuthority = engine.issueSeatAuthority({
  grantId: "s248-checkpoint-restoration-local-player1",
  roomId: initialEnvelope.roomId,
  matchBindingHash: initialEnvelope.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "apply"],
});
const controlLease = engine.issueControlLease({
  seatAuthority, sessionId: "s248-checkpoint-restoration-local", leaseFence: 1,
  issuedAtRoomRevision: 0,
});
const legal = engine.legalSpace(initialEnvelope, { seatAuthority });
const domain = legal.parameterDomains.find(entry => entry.actionType === "move");
assert.ok(domain);
const preview = engine.preview({ envelope: initialEnvelope, seatAuthority,
  proposal: { kind: "parameterized", domainId: domain.domainId, parameters: {
    path: [domain.constraints.start, {
      xMilliInches: domain.constraints.start.xMilliInches,
      yMilliInches: domain.constraints.start.yMilliInches + 500,
    }],
  } },
});
assert.equal(preview.ok, true, preview.reason);
const applied = engine.apply({ envelope: initialEnvelope, seatAuthority,
  controlLease, preview: preview.preview, expectedStateRevision: 0,
  idempotencyKey: "s248-checkpoint-restoration-local-move",
});
assert.equal(applied.ok, true, applied.reason);
const journal = plain([applied.receipt]);
const input = { initialEnvelope, checkpoint, journal };
const sourceBefore = JSON.stringify(input);
const cold = engine.replay(input);
assert.equal(cold.ok, true, cold.reason);
assert.deepEqual(cold.envelope, applied.envelope);

const originalStringify = JSON.stringify;
let checkpointStateClones = 0;
JSON.stringify = function (value, ...args) {
  if (value === checkpoint.state) checkpointStateClones += 1;
  return originalStringify(value, ...args);
};
const started = performance.now();
let warm;
try { warm = engine.replay(input); }
finally { JSON.stringify = originalStringify; }
const warmElapsedMs = performance.now() - started;
assert.deepEqual(warm, cold, "complete replay result must remain identical");
console.log(JSON.stringify({ stage: "warm_checkpoint_restoration",
  checkpointStateClones, warmElapsedMs, providerCalls: 0, originalRoomWrites: 0,
  fixtureAuthority: "legacy_compatibility_fixture_only", trainingTruth: false,
}));
assert.equal(checkpointStateClones, 1,
  "warm replay must validate checkpoint state once, without restoring an unused envelope");

// These input branches directly govern whether restoration is skipped.
const tampered = plain(input);
tampered.checkpoint.state.round += 1;
assert.equal(engine.replay(tampered).reason, "SIGNATURE_INVALID");
const changedReceipt = plain(input);
changedReceipt.journal[0].events.push({ type: "forged" });
assert.equal(engine.replay(changedReceipt).reason, "SIGNATURE_INVALID");
const noMemo = engine.replay({ initialEnvelope, checkpoint, journal: [] });
assert.equal(noMemo.ok, true, noMemo.reason);
assert.deepEqual(noMemo.envelope, initialEnvelope);
const noCheckpoint = engine.replay({ initialEnvelope, journal });
assert.equal(noCheckpoint.ok, true, noCheckpoint.reason);
assert.deepEqual(noCheckpoint.envelope, applied.envelope);
assert.equal(JSON.stringify(input), sourceBefore, "caller inputs remain unchanged");
assert.notEqual(warm.envelope, cold.envelope, "returned graph is private");
console.log(JSON.stringify({ passed: true, checkpointStateClones,
  completeReplayResultEqual: true, checkpointTamperingRejected: true,
  receiptTamperingRejected: true, emptyTailPreserved: true,
  noCheckpointPreserved: true, inputUnchanged: true,
  providerCalls: 0, originalRoomWrites: 0,
  doesNotProveWholeActionOneMinute: true, trainingTruth: false,
}));
