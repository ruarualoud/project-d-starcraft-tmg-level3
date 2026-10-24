#!/usr/bin/env node

// Read-only replay of A's saved r60 post-roll Hydralisk Charge. A search
// miss is not a Rules proof of failed Charge or permission to skip settlement.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV2 } from
  "../packages/product-composition/official-current-product-match-runtime-v2.mjs";
import { createOfficialCurrentProductMatchRuntimeV3 } from
  "../packages/product-composition/official-current-product-match-runtime-v3.mjs";
import { createOfficialCurrentProductMatchRuntimeV4 } from
  "../packages/product-composition/official-current-product-match-runtime-v4.mjs";
import { evaluateOfficialChargeRoundLeadingPathCoverV1 } from
  "../packages/rule-atoms/official-charge-round-path-infeasibility-proof-v1.mjs";
import { evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1 } from
  "../packages/rule-atoms/official-charge-occupied-cross-section-proof-v1.mjs";
import {
  loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1,
} from "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const argument = process.argv.find((entry) =>
  entry.startsWith("--run-directory="));
assert(argument, "--run-directory is required");
const directory = path.resolve(argument.slice("--run-directory=".length));
const fork = JSON.parse(await readFile(path.join(directory,
  "fork-private.json"), "utf8"));
let sourceDirectory = path.resolve(fork.sourceDirectory);
for (let depth = 0; depth < 3; depth += 1) {
  const ancestor = await readFile(path.join(sourceDirectory,
    "fork-private.json"), "utf8").then(JSON.parse, (error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!ancestor) break;
  sourceDirectory = path.resolve(ancestor.sourceDirectory);
}
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: fork.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${path.basename(sourceDirectory)}`,
  trustLevel: "development_persistent",
});
const roomDb = new DatabaseSync(path.join(directory, "room.sqlite"),
  { readOnly: true });
const row = roomDb.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?")
  .get(fork.targetRoomId);
assert(row);
const { envelope } = codec.decode(row.aggregate_cipher,
  `room:${fork.targetRoomId}:aggregate`);
roomDb.close();
assert.equal(envelope.stateRevision, 60);
const state = envelope.state;
assert.equal(state.pendingAction?.stage, "resolve_charge_after_roll");
assert.equal(state.pendingAction?.pieceId, "player2-hydralisk");

const decisionDb = new DatabaseSync(path.join(directory,
  "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
const decisionRow = decisionDb.prepare(`
  SELECT record_json FROM sc_live_decision_records
   ORDER BY revision DESC LIMIT 1
`).get();
decisionDb.close();
const record = decodeStarcraftTmgLiveDecisionRecordV1(decisionRow.record_json);
const decision = Object.values(record.decisions).find((entry) =>
  entry.authority.stateRevision === 60);
assert(decision);
const submission = decision.attempts[decision.attemptKeys.at(-1)]
  .safeOutput.providerTurn.toolCalls.find((entry) =>
    entry.name === "submit_planning").arguments;
const paidRequest = {
  preferredAnchor: { xMilliInches: submission.formationPreferredX,
    yMilliInches: submission.formationPreferredY },
  maximumOptions: submission.formationMaximumOptions,
  tacticalPurpose: submission.formationTacticalPurpose,
  formationObjectives: submission.formationObjectives,
};

const root = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root: path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
});
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const auditedIds = ["player1", "player2"].flatMap((seat) =>
  state.armyCompositionUpgradeAuditsBySide[seat].units.map((entry) =>
    entry.unitInstanceId));
const runtimeSeed = { ...state, pieces: state.pieces.filter((entry) =>
  auditedIds.includes(entry.id)) };
const v1 = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: runtimeSeed });
const v2 = createOfficialCurrentProductMatchRuntimeV2({ legacyRuntime: v1 });
const v3 = createOfficialCurrentProductMatchRuntimeV3({ legacyRuntime: v2 });
const runtime = createOfficialCurrentProductMatchRuntimeV4({ legacyRuntime: v3 });
const forkReceipt = JSON.parse(await readFile(path.join(directory,
  "fork-receipt.json"), "utf8"));
assert.equal(runtime.descriptor.runtimeHash,
  forkReceipt.targetRulesRuntimeHash);
const domain = runtime.enumerate(state, { sideKey: "player2" })
  .parameterDomains.find((entry) => entry.actionType === "resolve_charge");
assert.equal(domain?.domainId, decision.actionIndex[0]?.id);

const actor = state.pieces.find((entry) => entry.id === "player2-hydralisk");
const leading = actor.models.find((entry) =>
  entry.id === state.pendingAction.chargePlan.leadingModelId);
const targetId = state.pendingAction.chargePlan.targets[0];
const target = state.pieces.find((entry) => entry.id === targetId.unitId)
  .models.find((entry) => entry.id === targetId.modelId);
const variants = [
  ["paid", paidRequest],
  ["neutral", { ...paidRequest, maximumOptions: 8,
    maximumCandidateAttempts: 20_000, formationObjectives: [] }],
];
const results = [];
for (const [name, request] of variants) {
  let generationDiagnostic = null;
  const instantiationFailures = [];
  const result = searchStarcraftTmgLegalFormationOptionsV1({
    state, domain, request,
    instantiate: (...args) => {
      try { return runtime.instantiate(...args); }
      catch (error) {
        if (instantiationFailures.length < 8) {
          instantiationFailures.push(String(error?.message || error));
        }
        throw error;
      }
    },
    instantiateOptions: { matchBinding: envelope.matchBinding },
    observeProgress: (entry) => {
      if (entry.stage === "charge_candidate_generation_diagnostic") {
        generationDiagnostic = entry;
      }
    },
  });
  results.push({ name, optionCount: result.optionCount,
    generatedCandidateCount: result.searchCoverage.generatedCandidateCount,
    attemptedCandidateCount: result.attemptedCandidateCount,
    instantiatedCandidateCount: result.instantiatedCandidateCount,
    failureCounts: result.failureCounts, instantiationFailures,
    generationDiagnostic });
}
const pathProof = evaluateOfficialChargeRoundLeadingPathCoverV1(
  state, state.pendingAction);
const occupiedProof = evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1(
  state, state.pendingAction);
const certifiedFailure = domain.parameterSchema?.outcome?.length === 1
  && domain.parameterSchema.outcome[0] === "failure";
console.log(JSON.stringify({ schemaVersion: "ticket23_slice248_a_r60_charge_diagnosis_v1",
  roomRevision: envelope.stateRevision,
  domainId: domain.domainId,
  actor: { pieceId: actor.id, currentModels: actor.currentModels,
    leadingModelId: leading.id, xInches: leading.xInches,
    yInches: leading.yInches },
  target: { unitId: targetId.unitId, modelId: target.id,
    xInches: target.xInches, yInches: target.yInches },
  chargeRoll: state.pendingAction.chargeRoll,
  maxDistanceMilliInches: state.pendingAction.maxDistanceMilliInches,
  certifiedFailure, pathProof, occupiedProof, variants: results,
  providerCalls: 0, roomMutations: 0, trainingTruth: false }, null, 2));
assert(results[0].optionCount > 0 || certifiedFailure,
  "A_R60_ONLY_CHARGE_CANDIDATE_UNAVAILABLE_WITHOUT_RULES_PROOF");
