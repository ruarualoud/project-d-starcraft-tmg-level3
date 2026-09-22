#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs";
import * as assetSearch from
  "../packages/online-agent-session/legal-asset-placement-search-v1.mjs";
import { getOfficialBattlefieldAssetComponentFootprintV1 } from
  "../packages/source-data/official-battlefield-asset-component-profile-v1.mjs";

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
const db = new DatabaseSync(path.join(directory, "room.sqlite"), { readOnly: true });
let envelope;
try {
  const row = db.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?")
    .get(privateState.roomId);
  envelope = codec.decode(row.aggregate_cipher,
    `room:${privateState.roomId}:aggregate`).envelope;
} finally { db.close(); }
assert.equal(envelope.stateRevision, 54, "exact frozen failed boundary required");
const state = envelope.state;
const original = structuredClone(state);
const adapter = createOfficialUnitLifecycleFamilyAdapterV1(
  state.officialUnitLifecycleFamilySourceBundle);
const domain = adapter.legalSpace(state, { sideKey: "player2" })
  .parameterDomains.find((entry) => entry.effectKind === "spawn_creep_tumor"
    && entry.pieceId === "player2-queen");
assert(domain, "the actual Queen ability is available");
assert.throws(() => adapter.preview(state, { domain, parameters: {
  activeUnitId: "player2-queen", paymentCardInstanceIds: ["faction:player2"],
  coordinate: { xMilliInches: 14000, yMilliInches: 13000 },
} }), /UNIT_LIFECYCLE_PARENT_BASE_CONTACT_REQUIRED/u,
"the recorded invalid coordinate must remain illegal");
const started = performance.now();
const actions = new Map();
const result = assetSearch.searchStarcraftTmgLegalAssetPlacementOptionsV1({
  state, domain, request: { maximumOptions: 4,
    preferredAnchor: { xMilliInches: 14000, yMilliInches: 13000 } },
  instantiate: (authorityState, authorityDomain, parameters) => {
    const preview = adapter.preview(authorityState, {
      domain: authorityDomain, parameters,
    });
    const canonicalParameters = preview.action.unitLifecyclePlan.canonicalParameters;
    actions.set(JSON.stringify(canonicalParameters), preview.action);
    return { canonicalParameters, action: preview.action };
  },
});
assert.equal(result.optionCount, 4, "the Host must offer Rules-valid alternatives");
assert.equal(assetSearch.isStarcraftTmgAssetPlacementDomainV1(domain), true,
  "the shared Host/solver classifier includes this coordinate family");
const profile = getOfficialBattlefieldAssetComponentFootprintV1(
  state.officialBattlefieldAssetComponentProfile, "creep_tumor");
const queen = state.pieces.find((piece) => piece.id === domain.pieceId);
const radius = profile.baseDiameterMm / 25.4 / 2;
for (const option of result.placementOptions) {
  const point = option.coordinate;
  const contact = queen.models.some((model) => Math.abs(Math.hypot(
    point.xMilliInches / 1000 - model.xInches,
    point.yMilliInches / 1000 - model.yInches)
    - Math.max(model.baseWidthInches, model.baseDepthInches) / 2 - radius) <= 0.002);
  assert.equal(contact, true, "each returned token touches the actual parent base");
  assert.equal(option.exactRulesInstantiationPassed, true);
  assert.deepEqual(option.canonicalParameters.paymentCardInstanceIds, ["faction:player2"]);
  assert.equal(option.relationshipComparison.subject.effectKind, "spawn_creep_tumor");
  assert.equal(option.relationshipComparison.subject.physicalProfileAvailable, true);
  const applied = adapter.apply(state, {
    action: actions.get(JSON.stringify(option.canonicalParameters)),
  });
  assert.equal(applied.state.board.tokens.length, state.board.tokens.length + 1);
  assert.deepEqual(applied.state.pieces.find((piece) => piece.id === queen.id).models,
    queen.models, "placing a token must not move the Queen");
}
assert.deepEqual(state, original, "only private hypothetical states were evaluated");
const report = { passed: true, stateRevision: 54, optionCount: result.optionCount,
  physicalTokenProfileAvailable: result.physicalTokenProfileAvailable,
  attemptedCandidateCount: result.attemptedCandidateCount,
  instantiatedCandidateCount: result.instantiatedCandidateCount,
  failureCounts: result.failureCounts, elapsedMs: Math.round(performance.now() - started),
  providerCalls: 0, roomMutations: 0, costCny: 0, trainingTruth: false };
await writeFile(path.join(directory, "parent-contact-token-search-report.json"),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
