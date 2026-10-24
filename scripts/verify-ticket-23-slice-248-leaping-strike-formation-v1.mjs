#!/usr/bin/env node

// Reproduces the retained B r1 Leaping Strike parameter failure without
// mutating the Room or invoking a Provider.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import {
  enumerateOfficialSelectedRosterAbilityActionsV1,
  instantiateOfficialSelectedRosterAbilityActionV1,
} from "../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";

const directory = path.resolve(process.argv[2] || "");
assert(directory !== path.parse(directory).root,
  "pass the exact retained V5 Room directory");
const privateInfo = JSON.parse(readFileSync(path.join(directory,
  "fork-private.json"), "utf8"));
const database = new DatabaseSync(path.join(directory, "room.sqlite"),
  { readOnly: true });
const row = database.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?")
  .get(privateInfo.targetRoomId);
assert(row, "retained Room exists");
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateInfo.storeEncryptionKeyBase64,
  keyId: JSON.parse(row.aggregate_cipher).keyId,
});
const envelope = codec.decode(row.aggregate_cipher,
  `room:${privateInfo.targetRoomId}:aggregate`).envelope;
database.close();
assert.equal(envelope.stateRevision, 1);
const state = envelope.state;
const domain = enumerateOfficialSelectedRosterAbilityActionsV1(state,
  { sideKey: "player2", includeDisabled: true }).parameterDomains.find(
  (entry) => entry.effectKind === "leaping_strike"
    && entry.pieceId === "player2-kerrigan");
assert(domain, "Kerrigan Leaping Strike is available at r1");
assert.throws(() => instantiateOfficialSelectedRosterAbilityActionV1(
  state, domain, {
    activeUnitId: domain.pieceId,
    paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0],
    placements: domain.parameterSchema.placements,
  }), /SELECTED_ABILITY_PLACE_MODEL_DENOMINATOR_INVALID/,
"schema descriptor is not a complete model placement");
const result = searchStarcraftTmgLegalFormationOptionsV1({
  state, domain,
  request: { maximumOptions: 4,
    tacticalPurpose: "Leaping Strike toward the scoring marker",
    formationObjectives: [{ kind: "control_objective", weight: 1,
      targetIds: [] }] },
  instantiate: instantiateOfficialSelectedRosterAbilityActionV1,
});
assert(result.optionCount > 0,
  `exact Rules-backed self-place choices required: ${JSON.stringify(result.failureCounts)}`);
for (const option of result.formationOptions) {
  assert.equal(option.canonicalParameters.placement.length,
    domain.parameterSchema.placements.modelIds.length);
  assert.equal(option.slots.length,
    domain.parameterSchema.placements.modelIds.length);
  assert.equal(option.actionType, "use_active_ability");
}
console.log(JSON.stringify({ ok: true, revision: envelope.stateRevision,
  optionCount: result.optionCount,
  exactInstantiationCount: result.instantiatedCandidateCount,
  providerCalls: 0, roomMutations: 0 }));
