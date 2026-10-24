#!/usr/bin/env node

// Read-only replay of the saved B r8 Charge decision. A finite search miss is
// not a Rules proof that the declared Charge failed.
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
import { createOfficialCurrentProductMatchRuntimeV5 } from
  "../packages/product-composition/official-current-product-match-runtime-v5.mjs";
import { evaluateOfficialChargeRoundLeadingPathCoverV1 } from
  "../packages/rule-atoms/official-charge-round-path-infeasibility-proof-v1.mjs";
import { evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1 } from
  "../packages/rule-atoms/official-charge-occupied-cross-section-proof-v1.mjs";
import {
  loadOfficialDevelopmentTrancheSourceLockFixtureV1,
  resolveOfficialDevelopmentTrancheFixtureRootV1,
} from "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const runArgument = process.argv.find((entry) =>
  entry.startsWith("--run-directory="));
assert(runArgument, "--run-directory is required");
const runDirectory = path.resolve(runArgument.slice(
  "--run-directory=".length));
const fork = JSON.parse(await readFile(path.join(runDirectory,
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
const roomDb = new DatabaseSync(path.join(runDirectory, "room.sqlite"),
  { readOnly: true });
const roomRow = roomDb.prepare(`
  SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?
`).get(fork.targetRoomId);
assert(roomRow, "saved B Room is required");
const envelope = codec.decode(roomRow.aggregate_cipher,
  `room:${fork.targetRoomId}:aggregate`).envelope;
roomDb.close();
assert.equal(envelope.stateRevision, 8, "frozen r8 Room is required");
assert.equal(envelope.state.pendingAction?.stage,
  "resolve_charge_after_roll");

const decisionDb = new DatabaseSync(path.join(runDirectory,
  "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
const decisionRow = decisionDb.prepare(`
  SELECT record_json FROM sc_live_decision_records
   ORDER BY revision DESC LIMIT 1
`).get();
assert(decisionRow, "saved paid decision is required");
const decisionRecord = decodeStarcraftTmgLiveDecisionRecordV1(
  decisionRow.record_json);
decisionDb.close();
const decision = Object.values(decisionRecord.decisions).at(-1);
const submission = Object.values(decision.attempts).at(-1)
  ?.safeOutput?.providerTurn?.toolCalls?.find((entry) =>
    entry.name === "submit_planning")?.arguments;
assert(submission?.formationSearchRequested === true,
  "saved formation request is required");
const paidRequest = {
  preferredAnchor: {
    xMilliInches: submission.formationPreferredX,
    yMilliInches: submission.formationPreferredY,
  },
  maximumOptions: submission.formationMaximumOptions,
  tacticalPurpose: submission.formationTacticalPurpose,
  formationObjectives: submission.formationObjectives,
};

const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root: path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
});
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: fixtureRoot,
});
const state = envelope.state;
const auditedIds = ["player1", "player2"].flatMap((seatKey) =>
  state.armyCompositionUpgradeAuditsBySide[seatKey].units.map((entry) =>
    entry.unitInstanceId));
// Current r8 has a summoned Unit and battlefield asset. Runtime composition
// requires the original roster denominator; enumeration uses unmodified r8.
const runtimeSeed = { ...state, pieces: state.pieces.filter((entry) =>
  auditedIds.includes(entry.id)) };
const v1 = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset, state: runtimeSeed,
});
const v2 = createOfficialCurrentProductMatchRuntimeV2({ legacyRuntime: v1 });
const runtime = createOfficialCurrentProductMatchRuntimeV5({ legacyRuntime: v2 });
const forkReceipt = JSON.parse(await readFile(path.join(runDirectory,
  "fork-receipt.json"), "utf8"));
assert.equal(runtime.descriptor.runtimeHash,
  forkReceipt.targetRulesRuntimeHash);
const domain = runtime.enumerate(state, { sideKey: "player2" })
  .parameterDomains.find((entry) => entry.actionType === "resolve_charge");
assert.equal(domain?.domainId, decision.actionIndex[0]?.id);

const variants = [
  ["paid_objectives", paidRequest],
  ["mandatory_engagement_only", { ...paidRequest,
    formationObjectives: [{ kind: "maximize_engagement", weight: 5,
      targetIds: ["goliath-1"] }] }],
  ["neutral_dense_search", { ...paidRequest, maximumOptions: 8,
    maximumCandidateAttempts: 20_000, formationObjectives: [] }],
];
const rows = [];
for (const [name, request] of variants) {
  let generationDiagnostic = null;
  const instantiationFailures = [];
  const result = searchStarcraftTmgLegalFormationOptionsV1({
    state, domain, request,
    instantiate: (...args) => {
      try {
        return runtime.instantiate(...args);
      } catch (error) {
        if (instantiationFailures.length < 6) {
          instantiationFailures.push({
            message: String(error?.message || error),
            path: args[2]?.path || null,
            placedModelCount: args[2]?.placements?.length || 0,
          });
        }
        throw error;
      }
    },
    instantiateOptions: { matchBinding: envelope.matchBinding },
    observeProgress: (progress) => {
      if (progress.stage === "charge_candidate_generation_diagnostic") {
        generationDiagnostic = progress;
      }
    },
  });
  rows.push({ name, optionCount: result.optionCount,
    generatedCandidateCount: result.searchCoverage.generatedCandidateCount,
    attemptedCandidateCount: result.attemptedCandidateCount,
    instantiatedCandidateCount: result.instantiatedCandidateCount,
    failureCounts: result.failureCounts,
    instantiationFailures,
    generationDiagnostic: generationDiagnostic && {
      uniqueAnchors: generationDiagnostic.uniqueAnchors,
      leaderFootprintRejected:
        generationDiagnostic.leaderFootprintRejected,
      leaderNoSurface: generationDiagnostic.leaderNoSurface,
      leaderBlockedByModelOrTerrain:
        generationDiagnostic.leaderBlockedByModelOrTerrain,
      followerUnplaceable: generationDiagnostic.followerUnplaceable,
      maxFollowersPlaced: generationDiagnostic.maxFollowersPlaced,
    } });
}
const certifiedFailure = domain.parameterSchema?.outcome
  ?.length === 1 && domain.parameterSchema.outcome[0] === "failure";
const firstCollisionModelId = rows.flatMap((entry) =>
  entry.instantiationFailures).map((entry) =>
  /SELECTED_SPATIAL_PATH_MODEL_COLLISION:([^\s]+)/u.exec(entry.message)?.[1])
  .find(Boolean) || null;
const previousExperimentalCollisionModelId =
  "player2-kerrigan-raptor-model-5";
const firstCollisionOwner = previousExperimentalCollisionModelId
  ? state.pieces.find((piece) => (piece.models || []).some((model) =>
    model.id === previousExperimentalCollisionModelId)) : null;
const firstCollisionModel = firstCollisionOwner?.models?.find((model) =>
  model.id === previousExperimentalCollisionModelId);
console.log(JSON.stringify({ schemaVersion:
  "ticket23_slice248_b_r8_formation_diagnosis_v1",
  roomRevision: envelope.stateRevision,
  rulesRuntimeHash: runtime.descriptor.runtimeHash,
  domainId: domain.domainId,
  chargeActorPieceId: domain.pieceId,
  currentSearchFirstCollisionModelId: firstCollisionModelId,
  previousExperimentalCollisionBlocker: {
    modelId: previousExperimentalCollisionModelId,
    pieceId: firstCollisionOwner?.id || null,
    sideKey: firstCollisionOwner?.sideKey || null,
    centerInches: firstCollisionModel && {
      x: firstCollisionModel.xInches,
      y: firstCollisionModel.yInches,
    },
  },
  pathProofs: {
    roundEndpointCover: evaluateOfficialChargeRoundLeadingPathCoverV1(
      state, state.pendingAction),
    occupiedCrossSection:
      evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1(
        state, state.pendingAction),
  },
  certifiedFailure,
  variants: rows,
  providerCalls: 0,
  roomMutations: 0,
  trainingTruth: false }, null, 2));
assert(rows[0].optionCount > 0 || certifiedFailure,
  "B_R8_ONLY_CHARGE_CANDIDATE_UNAVAILABLE_WITHOUT_RULES_PROOF");
