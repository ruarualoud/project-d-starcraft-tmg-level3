#!/usr/bin/env node

// Reproduce the fresh 2000-point session's repeated Core-slot rejection at
// the actual model prompt boundary, without a Provider or Builder call.
import assert from "node:assert/strict";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createIterativeRosterFlashModelPortV1 } from
  "../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs";

const candidateInput = {
  candidateId: "fresh-core-overflow",
  sideKey: "player1", scaleId: "Standard", mineralBudget: 2000,
  factionRecordKey: "faction_cards:raynor_faction",
  tacticalCardRecordKeys: ["tactical_cards:barracks__tech_lab_",
    "tactical_cards:engineering_bay"],
  units: [
    { unitInstanceId: "marine-a", recordKey: "army_units:marine",
      compositionKind: "large", upgrades: [] },
    { unitInstanceId: "marine-b", recordKey: "army_units:marine",
      compositionKind: "large", upgrades: [] },
    { unitInstanceId: "marauder-a", recordKey: "army_units:marauder",
      compositionKind: "large", upgrades: [] },
  ],
};
const rejectedRequestKey = "rejected-request-key";
const menu = {
  faction: { startingArmySlots: { Core: 3 } },
  tacticalCandidates: [
    { recordKey: "tactical_cards:barracks__tech_lab_",
      armySlotsAdded: { Core: 1 } },
    { recordKey: "tactical_cards:engineering_bay",
      armySlotsAdded: { Core: 1 } },
  ],
  unitCandidates: ["marine", "marauder"].map((name) => ({
    recordKey: `army_units:${name}`, armySlotType: "Core",
    compositionOptions: [
      { compositionKind: "small", occupiedArmySlots: 1 },
      { compositionKind: "large", occupiedArmySlots: 2 },
    ],
  })),
};
const state = {
  sessionId: "iterative-slot-repair-fixture", revision: 2,
  mineralBudget: 2000, modelContextVersion: 3,
  frozenContext: { sideKey: "player1", scaleId: "Standard",
    factionRecordKey: candidateInput.factionRecordKey },
  currentCandidate: null, plan: null,
  observations: [
    { query: { kind: "candidate_menu" }, receipt: menu,
      requestKey: "menu-request" },
    { query: { kind: "builder_verdict",
      candidateHash: hashStarcraftTmgContract(candidateInput) },
    receipt: { status: "illegal", rejectionKind: "army_slot_capacity",
      rulesErrorCode: "ARMY_SLOT_CAPACITY_EXCEEDED",
      rulesErrorDetail: "Core" }, requestKey: rejectedRequestKey },
  ],
  iterations: [{ requestKey: rejectedRequestKey,
    decisionKind: "propose", rulesVerdictStatus: "illegal" }],
};
let captured = null;
const port = createIterativeRosterFlashModelPortV1({
  deliberationFactory: { createForRun: async () => ({
    deliberate: async (request) => {
      captured = request;
      throw new Error("CAPTURED_NO_PROVIDER_CALL");
    },
  }) },
  replyStore: {
    loadRetainedReply: async (key) => key === rejectedRequestKey
      ? { outcome: "completed", output: { kind: "propose",
        candidateInput } } : null,
    retainReply: async () => { throw new Error("UNEXPECTED_RETAIN"); },
  },
  skillGuidance: { selection: {}, projections: [] },
  missionEvidence: { scoring: {}, map: {} },
});
await assert.rejects(port.decide({ requestKey: "next-request-key", state }),
  /CAPTURED_NO_PROVIDER_CALL/u);
assert.equal(captured.promptNodes[0].content.requiredDecisionKind, "propose");
assert.equal(captured.promptNodes[0].content.localSearchSaturation.reason,
  "latest_builder_rejected_candidate_requires_revision");
assert.equal(captured.promptNodes[0].content.lastRejectedProposal
  .slotProjection.overflow.Core, 1);
assert.ok(captured.promptNodes[0].content.lastRejectedProposal
  .slotProjection.slotReliefOptions.some((option) =>
    option.unitInstanceId === "marine-a"
      && option.toCompositionKind === "small"
      && option.releasedSlots === 1));
assert.match(captured.userMessage, /Builder rejection/u);

// A pending paid v2 reply retains its old context projection. The v3 repair
// instruction appears only after the session explicitly changes version.
captured = null;
await assert.rejects(port.decide({ requestKey: "historical-v2-request",
  state: { ...state, modelContextVersion: 2 } }),
/CAPTURED_NO_PROVIDER_CALL/u);
assert.equal(captured.promptNodes[0].content.requiredDecisionKind, undefined);
assert.equal(captured.promptNodes[0].content.lastRejectedProposal
  .slotProjection.slotReliefOptions, undefined);
console.log(JSON.stringify({ passed: true, providerCalls: 0,
  builderCalls: 0, repairKind: "Core_slot_overflow",
  historicalV2ContextPreserved: true }));
