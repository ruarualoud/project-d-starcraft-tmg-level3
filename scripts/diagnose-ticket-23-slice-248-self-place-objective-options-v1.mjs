#!/usr/bin/env node

// Read-only B r1 probe: can explicit marker control intent reach the first
// Rules-instantiated self-place options without a hand-picked anchor?
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
import { bindStarcraftTmgFormationSelectionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const directory = path.resolve(process.argv[2] || "");
assert(directory !== path.parse(directory).root,
  "pass the exact fresh B v5 Room directory");
const privateInfo = JSON.parse(readFileSync(path.join(directory,
  "fork-private.json"), "utf8"));
const database = new DatabaseSync(path.join(directory, "room.sqlite"),
  { readOnly: true });
const row = database.prepare("SELECT state_revision,aggregate_cipher FROM sc_rooms WHERE room_id=?")
  .get(privateInfo.targetRoomId);
assert(row, "fresh B Room exists");
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateInfo.storeEncryptionKeyBase64,
  keyId: JSON.parse(row.aggregate_cipher).keyId,
});
const state = codec.decode(row.aggregate_cipher,
  `room:${privateInfo.targetRoomId}:aggregate`).envelope.state;
database.close();
assert.equal(row.state_revision, 1, "probe before any Agent action");
const domain = enumerateOfficialSelectedRosterAbilityActionsV1(state,
  { sideKey: "player2", includeDisabled: true }).parameterDomains.find(
  (entry) => entry.effectKind === "leaping_strike"
    && entry.pieceId === "player2-kerrigan");
assert(domain, "current Leaping Strike domain");
const marker = state.board.missionMarkers.find((entry) =>
  entry.id === "mission-marker-2");
const model = state.pieces.find((entry) =>
  entry.id === "player2-kerrigan").models[0];
const result = searchStarcraftTmgLegalFormationOptionsV1({
  state, domain,
  request: { maximumOptions: 4,
    tacticalPurpose: "Contest mission-marker-2 after failed Charge",
    formationObjectives: [{ kind: "control_objective", weight: 5,
      targetIds: ["mission-marker-2"] }] },
  instantiate: instantiateOfficialSelectedRosterAbilityActionV1,
});
const rows = result.formationOptions.map((option) => {
  const p = option.canonicalParameters.placement[0];
  const centerDistance = Math.hypot(p.xMilliInches / 1000 - marker.xInches,
    p.yMilliInches / 1000 - marker.yInches);
  const edgeDistance = Math.max(0, centerDistance
    - Number(model.baseWidthInches) / 2
    - Number(marker.diameterInches) / 2);
  return { formationOptionId: option.formationOptionId,
    anchor: option.anchor,
    markerBaseEdgeDistanceMilliInches: Math.round(edgeDistance * 1000),
    insideThreeInches: edgeDistance <= 3,
    objectiveMetrics: option.tacticalMetrics?.objectiveMetrics || [] };
});
assert(rows.some((entry) => entry.insideThreeInches),
  "control-objective search must expose a Rules-legal contesting option");
assert(new Set(rows.map((entry) => JSON.stringify(entry.anchor))).size >= 2,
  "single-model options must not repeat one spatial anchor");
assert(result.legalPaymentChoices.length > 1,
  "Rules must expose independent legal card payments");
const alternatePayment = result.paymentChoicesForDecision.find((choice) =>
  JSON.stringify(choice)
    !== JSON.stringify(result.formationOptions[0].paymentCardInstanceIds));
assert(alternatePayment, "Agent must retain a distinct minimal payment choice");
const receipt = { queryKind: "space.solve_formation", status: "exact",
  queryReceiptHash: "focused-read-only-receipt", result };
const selected = { proposal: { kind: "parameterized",
  domainId: domain.domainId, parameters: {} },
formationSelection: { formationOptionId: result.formationOptions[0].formationOptionId,
  paymentCardInstanceIds: alternatePayment, slotAssignments: [],
  publicReason: "Contest marker 2 while preserving other card resources." } };
const bound = bindStarcraftTmgFormationSelectionV1(selected, [receipt], null);
assert.deepEqual(bound.proposal.parameters.paymentCardInstanceIds,
  alternatePayment);
const exactAction = instantiateOfficialSelectedRosterAbilityActionV1(
  state, domain, bound.proposal.parameters);
assert(exactAction.action, "Rules must instantiate Agent payment plus Host position");
assert.throws(() => bindStarcraftTmgFormationSelectionV1({
  ...selected,
  formationSelection: { ...selected.formationSelection,
    paymentCardInstanceIds: ["not-a-current-card"] },
}, [receipt], null), { code: "ACTION_FORMATION_PAYMENT_SELECTION_INVALID" });
console.log(JSON.stringify({ revision: row.state_revision,
  target: marker.id, requestedObjective: "control_objective",
  optionCount: result.optionCount, options: rows,
  anyInsideControlRing: rows.some((entry) => entry.insideThreeInches),
  legalPaymentChoiceCount: result.legalPaymentChoices.length,
  displayedMinimalPaymentChoiceCount: result.paymentChoicesForDecision.length,
  alternatePaymentRulesInstantiated: true,
  providerCalls: 0, roomMutations: 0 }, null, 2));
