#!/usr/bin/env node

// Real r56 checkpoint: four Queen tumors already occupy one exact coordinate.
// The r57 authority nevertheless accepted a fifth. Reproduce that concrete
// collision without mutating the original room or contacting the Provider.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs";
import { searchStarcraftTmgLegalAssetPlacementOptionsV1 } from
  "../packages/online-agent-session/legal-asset-placement-search-v1.mjs";

const directory = process.argv.find((arg) => arg.startsWith("--run-directory="))
  ?.slice("--run-directory=".length);
assert(directory, "--run-directory required");
const privateState = JSON.parse(await readFile(path.join(directory,
  "runner-private.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(directory)}`,
  trustLevel: "development_persistent",
});
const db = new DatabaseSync(path.join(directory, "room.sqlite"),
  { readOnly: true });
let checkpoint;
try {
  const row = db.prepare("SELECT checkpoint_cipher FROM sc_checkpoints "
    + "WHERE room_id=? AND state_revision=56").get(privateState.roomId);
  assert(row, "real r56 checkpoint required");
  checkpoint = codec.decode(row.checkpoint_cipher,
    `room:${privateState.roomId}:checkpoint:56`);
} finally { db.close(); }
const state = checkpoint.state;
const original = structuredClone(state);
const occupied = { xMilliInches: 18000, yMilliInches: 4126 };
const stacked = state.board.tokens.filter((token) => (
  token.tokenKind === "creep_tumor" && token.isRemoved !== true
  && Math.round(token.coordinate.x * 1000) === occupied.xMilliInches
  && Math.round(token.coordinate.y * 1000) === occupied.yMilliInches));
assert.ok(stacked.length >= 4, "r56 contains the repeated tumor collision");
const adapter = createOfficialUnitLifecycleFamilyAdapterV1(
  state.officialUnitLifecycleFamilySourceBundle);
const domain = adapter.legalSpace(state, { sideKey: "player2" })
  .parameterDomains.find((entry) => entry.effectKind === "spawn_creep_tumor"
    && entry.pieceId === "player2-queen");
assert(domain, "real Queen ability remains legal to request");
const parameters = { activeUnitId: "player2-queen",
  paymentCardInstanceIds: ["player2-tactical-5"], coordinate: occupied };
assert.throws(() => adapter.preview(state, { domain, parameters }),
  /UNIT_LIFECYCLE_TUMOR_OVERLAP/u,
  "Rules must reject a fifth physical token at the occupied coordinate");

const search = searchStarcraftTmgLegalAssetPlacementOptionsV1({
  state, domain,
  request: { maximumOptions: 4, preferredAnchor: occupied },
  instantiate: (authorityState, authorityDomain, candidateParameters) => {
    const preview = adapter.preview(authorityState, {
      domain: authorityDomain, parameters: candidateParameters });
    return { canonicalParameters:
      preview.action.unitLifecyclePlan.canonicalParameters,
    action: preview.action };
  },
});
for (const option of search.placementOptions) {
  assert.ok(Math.hypot(option.coordinate.xMilliInches - occupied.xMilliInches,
    option.coordinate.yMilliInches - occupied.yMilliInches) > 1000,
  "Host must not offer a point overlapping the 28mm token");
}
assert.deepEqual(state, original, "real checkpoint never mutates");
console.log(JSON.stringify({ ok: true, stateRevision: 56,
  existingTumorsAtPoint: stacked.length,
  offeredNonOverlappingOptions: search.optionCount,
  providerCalls: 0, roomMutations: 0 }));
