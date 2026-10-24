// Concrete B r69/r70: the same Queen placed two tumors in round 2.
// Read the original room only; derived fixtures never write to it or call a model.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs";

const directory = process.argv[2];
assert(directory, "original B run directory required");
const privateState = JSON.parse(await readFile(path.join(directory,
  "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
  trustLevel: "development_persistent",
});
const db = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let aggregate;
try {
  const row = db.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?")
    .get(privateState.roomId);
  assert(row);
  aggregate = codec.decode(row.aggregate_cipher, `room:${privateState.roomId}:aggregate`);
} finally { db.close(); }
assert.equal(aggregate.stateRevision, 71, "fixed captured boundary, not a live writer");
const state = aggregate.envelope.state;
const original = structuredClone(state);
assert.equal(state.round, 2);
const bundle = state.officialUnitLifecycleFamilySourceBundle;
const adapter = createOfficialUnitLifecycleFamilyAdapterV1(bundle);
const route = bundle.routes.find(entry => entry.effectKind === "spawn_creep_tumor");
assert(route);
assert(!/\bREPEATABLE\b/u.test(`${route.activationText} ${route.sourceText}`));
const originalUses = state.unitLifecycleUseHistory.filter(entry =>
  entry.definitionId === route.definitionId && entry.pieceId === "player2-queen"
    && entry.round === 2);
assert.equal(originalUses.length, 2, "both actual tumor placements are retained");
const legal = adapter.legalSpace(state, { sideKey: "player2", includeDisabled: true });
assert(!legal.parameterDomains.some(entry => entry.definitionId === route.definitionId
  && entry.pieceId === "player2-queen"),
"Rules must not offer the same named Active again in this round");
assert(legal.candidates.some(entry => entry.definitionId === route.definitionId
  && /ONCE_PER_ROUND/.test(entry.disabledReason)), "disabled reason must identify frequency");

// Isolate only the frequency ledger to check the opposite boundary. This is not
// a historical rollback or a claim that the original r71 is a valid match.
const unused = structuredClone(state);
unused.unitLifecycleUseHistory = unused.unitLifecycleUseHistory.filter(entry =>
  !(entry.round === 2 && entry.pieceId === "player2-queen"
    && entry.definitionId === route.definitionId));
unused.activeAbilityUseHistory = (unused.activeAbilityUseHistory || []).filter(entry =>
  !(entry.round === 2 && entry.pieceId === "player2-queen"
    && entry.abilityName === route.abilityName));
const unusedDomain = adapter.legalSpace(unused, { sideKey: "player2" })
  .parameterDomains.find(entry => entry.definitionId === route.definitionId
    && entry.pieceId === "player2-queen");
assert(unusedDomain, "a first use is not globally disabled");
const claimedUsed = structuredClone(unused);
claimedUsed.activeAbilityUseHistory.push({ round: 2, pieceId: "player2-queen",
  abilityName: route.abilityName, routeId: "another-source-of-the-same-name" });
assert(!adapter.legalSpace(claimedUsed, { sideKey: "player2" }).parameterDomains
  .some(entry => entry.definitionId === route.definitionId
    && entry.pieceId === "player2-queen"), "source copies cannot bypass named quota");
assert.throws(() => adapter.preview(state, { domain: unusedDomain, parameters: {
  activeUnitId: "player2-queen", paymentCardInstanceIds: [],
  coordinate: { xMilliInches: 27000, yMilliInches: 4551 },
} }), /UNIT_LIFECYCLE_PARAMETER_DOMAIN_STALE/u,
"Preview independently rejects the stale first-use domain");
assert.deepEqual(state, original, "original accepted history is immutable");
console.log(JSON.stringify({ ok: true, capturedRevision: 71,
  originalRepeatedUses: originalUses.length, providerCalls: 0, roomMutations: 0 }));
