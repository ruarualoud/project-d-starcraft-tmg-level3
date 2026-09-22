#!/usr/bin/env node

import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { searchStarcraftTmgLegalAssetPlacementOptionsV1,
  selectStarcraftTmgStrategicAssetPlacementOptionsV1 } from
  "../packages/online-agent-session/legal-asset-placement-search-v1.mjs";
import {
  inspectStarcraftTmgFormationThreatClaimsV1,
  inspectStarcraftTmgOpponentPredictionFeasibilityV1,
  recoverStarcraftTmgCorrectionSubmissionV1,
  materializeStarcraftTmgCorrectionIntentArraysV1,
  resolveStarcraftTmgDeterministicSingletonActionV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(
    `${code}:${JSON.stringify(details)}`), { code, ...details });
}

async function nonUnitPlacementProjectionOnly() {
  const { DatabaseSync } = await import("node:sqlite");
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { createStarcraftTmgPrivatePayloadCodec } = await import(
    "../packages/room-store/room-store-v1.mjs");
  const { createSqliteStarcraftTmgRoomStore } = await import(
    "../packages/room-store/sqlite-room-store-v1.mjs");
  const root = path.resolve(new URL("..", import.meta.url).pathname);
  const run = path.join(root,
    "build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922133120597");
  const privateState = JSON.parse(await readFile(path.join(run,
    "runner-private.json"), "utf8"));
  const db = new DatabaseSync(path.join(run,
    "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
  let decision;
  try {
    const saved = JSON.parse(db.prepare(
      "SELECT record_json FROM sc_live_decision_records LIMIT 1").get().record_json);
    decision = Object.values(saved.decisions).find((row) =>
      row.authority?.stateRevision === 7);
  } finally { db.close(); }
  ensure(decision, "REAL_R7_DECISION_MISSING");
  const old = decision.queryReceipts.find((row) =>
    row.queryKind === "legal_asset_placement_options").result;
  ensure(old.effectKind === "reserve_deploy_indicator"
    && old.placementOptions.every((row) => row.tacticalMetrics === null),
  "CAPTURED_NULL_METRICS_REPRODUCTION_MISSING");
  const reselected = selectStarcraftTmgStrategicAssetPlacementOptionsV1(
    old.placementOptions, 6, old.preferredAnchor);
  ensure(reselected.every((row) => !/fire|risk|objective/u.test(row.selectionFacet)),
    "UNKNOWN_ASSET_METRICS_MISLABELLED_AS_SAFE", {
      facets: reselected.map((row) => row.selectionFacet),
    });
  const module = await import(
    "../packages/online-agent-session/legal-asset-placement-search-v1.mjs");
  const store = createSqliteStarcraftTmgRoomStore({
    filename: path.join(run, "room.sqlite"),
    privatePayloadCodec: createStarcraftTmgPrivatePayloadCodec({
      key: privateState.storeEncryptionKeyBase64,
      keyId: `ticket23-slice248-room-store-${path.basename(run)}`,
      trustLevel: "development_persistent",
    }),
  });
  try {
    const record = await store.loadRoom(privateState.roomId);
    const state = record.envelope.state;
    const domain = decision.actionIndex.find((row) =>
      row.action?.effectKind === "reserve_deploy_indicator").action;
    const options = old.placementOptions.map((row) => ({ ...row,
      ...module.projectStarcraftTmgAssetPlacementMetricsV1({
        state, domain, coordinate: row.coordinate,
      }) }));
    const selected = options.find((row) => row.coordinate.xMilliInches === 15000
      && row.coordinate.yMilliInches === 9000);
    ensure(selected?.tacticalMetrics, "NON_UNIT_ASSET_GEOMETRY_MISSING");
    const marker4 = selected.tacticalMetrics.objectiveDistances.find((row) =>
      row.markerId === "mission-marker-4");
    ensure(marker4?.centerDistanceMilliInches === 4243,
      "PLACEMENT_MUST_NOT_REUSE_RAPTOR_DISTANCE", { marker4 });
    ensure(marker4.baseEdgeToObjectiveCenterDistanceMilliInches === null,
      "UNSIZED_INDICATOR_MUST_NOT_INVENT_BASE_GEOMETRY");
    ensure(selected.tacticalMetrics.incomingStationaryProfileCount === null
      && selected.tacticalMetrics.currentStationaryExposureKnown === false,
    "NON_UNIT_UNKNOWN_THREAT_BECAME_ZERO");
    ensure(selected.relationshipComparison.subject.kind === "hypothetical_placed_asset"
      && selected.relationshipComparison.subject.effectKind === domain.effectKind
      && selected.relationshipComparison.relationships.every((row) =>
        !row.targetId.endsWith("omega-worm")), "ASSET_SUBJECT_IDENTITY_DRIFT");
    const ordered = selectStarcraftTmgStrategicAssetPlacementOptionsV1(options,
      6, old.preferredAnchor);
    ensure(ordered.some((row) => row.selectionFacet === "closest_to_objective")
      && ordered.every((row) => !/fire|risk/u.test(row.selectionFacet)),
    "GEOMETRY_ONLY_ASSET_FACETS_INCORRECT");
    const tokenDomain = structuredClone(domain);
    tokenDomain.effectKind = "creep_token_place";
    tokenDomain.constraints.physicalTokenProfile = {
      shape: "round", widthMillimeters: 28, depthMillimeters: 28,
    };
    const token = module.projectStarcraftTmgAssetPlacementMetricsV1({
      state, domain: tokenDomain, coordinate: selected.coordinate,
    });
    const tokenMarker4 = token.tacticalMetrics.objectiveDistances.find((row) =>
      row.markerId === "mission-marker-4");
    ensure(tokenMarker4.baseEdgeToObjectiveCenterDistanceMilliInches === 3692,
      "PHYSICAL_TOKEN_BASE_EDGE_DISTANCE_WRONG", { tokenMarker4 });
    ensure(token.tacticalMetrics.incomingStationaryProfileCount === null,
      "TOKEN_MUST_NOT_BORROW_OMEGA_WEAPON_TARGET_TAGS");
    const known = { ...options[0], placementOptionId: "known",
      tacticalMetrics: { ...options[0].tacticalMetrics,
        incomingStationaryProfileCount: 0, incomingMoveThenFireProfileCount: 1 } };
    ensure(selectStarcraftTmgStrategicAssetPlacementOptionsV1([
      ...options, known], 6, old.preferredAnchor)[0].placementOptionId === "known",
    "KNOWN_UNIT_ATTACK_BAND_SELECTION_REGRESSED");
    console.log(JSON.stringify({ ok: true, realHistoricalOptions: options.length,
      marker4CenterDistanceMilliInches: marker4.centerDistanceMilliInches,
      physical28mmTokenBaseEdgeToMarker4CenterMilliInches:
        tokenMarker4.baseEdgeToObjectiveCenterDistanceMilliInches,
      unknownThreatPreserved: true, actorAndPlacementSeparated: true,
      providerCalls: 0, roomMutations: 0, unrelatedChecksRun: 0 }));
  } finally { await store.close(); }
}

function main() {
  const state = {
    board: { widthInches: 54, heightInches: 36, tokens: [], markers: [],
      effectMarkers: [], terrain: [] },
    officialDeploymentGeometryBinding: { entryEdgesByPlayer: { player2: {
      segments: [{ startCoordinate: { x: 0, y: 9 },
        endCoordinate: { x: 54, y: 9 } }],
    } } },
    pieces: [{ id: "player2-raptor", sideKey: "player2", models: [{
      id: "player2-raptor-model-1", xInches: 36, yInches: 9,
      baseShape: "round", baseWidthInches: 1.26, baseDepthInches: 1.26,
      isOnField: true, isDestroyed: false,
    }] }],
  };
  const domain = {
    domainId: "creep-domain",
    actionType: "resolve_battlefield_asset_ability",
    sideKey: "player2",
    pieceId: "player2-raptor",
    effectKind: "creep_token_place",
    parameterSchema: {
      required: ["activeUnitId", "paymentCardInstanceIds", "coordinate"],
      activeUnitId: { const: "player2-raptor" },
      coordinate: { type: "world_point_milli_inches" },
      paymentCardInstanceIdsByChoice: { default: [[]] },
    },
    constraints: {
      physicalTokenProfile: { tokenKind: "creep_tumor", shape: "round",
        widthMillimeters: 28, depthMillimeters: 28 },
      geometry: { rangeInches: 6, entireTokenBaseInsideBattlefield: true,
        noEndOverlapWithTangibleAsset: true },
    },
  };
  const rulesRuntime = {
    instantiate(_state, _domain, parameters) {
      const coordinate = parameters.coordinate;
      const x = Number(coordinate?.xMilliInches);
      const y = Number(coordinate?.yMilliInches);
      const radius = 552;
      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)
        || x < radius || x > 54_000 - radius
        || y < radius || y > 36_000 - radius) {
        throw new Error("BATTLEFIELD_ASSET_TOKEN_OUTSIDE_BATTLEFIELD");
      }
      if (Math.hypot(x - 36_000, y - 9_000) < radius + 630) {
        throw new Error("BATTLEFIELD_ASSET_TOKEN_OVERLAPS_MODEL");
      }
      return {
        canonicalParameters: structuredClone(parameters),
        action: { actionType: domain.actionType, sideKey: domain.sideKey,
          pieceId: domain.pieceId, coordinate: structuredClone(coordinate) },
      };
    },
  };
  const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
    roomStore: { async loadRoom() {
      return { stateRevision: 84, envelope: { matchBindingHash: HASH_A,
        stateHash: HASH_B, state, matchBinding: { bindingHash: HASH_A } } };
    } },
    rulesRuntime,
    seatKey: "player2",
  });
  return adapter.query({
    authority: { roomId: "slice247", matchBindingHash: HASH_A,
      stateRevision: 84, stateHash: HASH_B, legalSpaceHash: HASH_C,
      seatKey: "player2" },
    queryKind: "legal_asset_placement_options",
    arguments: { domainId: domain.domainId,
      currentLegalSpaceDomain: domain,
      preferredAnchor: { xMilliInches: 36_000, yMilliInches: 9_000 },
      maximumOptions: 4 },
  }).then((receipt) => {
    ensure(receipt.status === undefined && receipt.precision === "exact",
      "LEGAL_ASSET_PLACEMENT_QUERY_NOT_EXACT", { receipt });
    ensure(receipt.result?.optionCount >= 1,
      "LEGAL_ASSET_PLACEMENT_OPTIONS_EMPTY");
    ensure(receipt.result.placementOptions.every((option) => {
      try {
        rulesRuntime.instantiate(state, domain, option.canonicalParameters);
        return option.coordinate.xMilliInches !== 36_000
          || option.coordinate.yMilliInches !== 9_000;
      } catch {
        return false;
      }
    }), "LEGAL_ASSET_PLACEMENT_OPTION_NOT_RULES_EXACT");

    const omegaState = {
      board: { widthInches: 54, heightInches: 36, tokens: [], markers: [],
        effectMarkers: [], terrain: [], missionMarkers: [{ id: "marker-4",
          xInches: 18, yInches: 12, diameterMillimeters: 32 }] },
      officialSelectedRosterAbilitySourceBundle: { omegaWormTemplate: {
        unitName: "Omega Worm", unitId: "omega-worm", recordKey: "omega",
        sourceRecordHash: HASH_A, payloadHash: HASH_B, baseShape: "round",
        baseWidthInches: 3.15, baseDepthInches: 3.15, hitPoints: 8,
        combatTags: ["ground"],
      } },
      officialAttackProfileCatalogueV2: { profiles: [{
        recordKey: "goliath", profileKey: "goliath-autocannon",
        weaponName: "Autocannon", phase: "assault",
        range: { kind: "normal", normalRangeInches: 18 },
        effects: [], targetTags: ["ground"], rateOfAttack: 2, damage: 2,
        profileHash: HASH_C,
      }, {
        recordKey: "goliath", profileKey: "goliath-scatter",
        weaponName: "Scatter Missiles", phase: "assault",
        range: { kind: "normal", normalRangeInches: 18 },
        effects: [], targetTags: ["ground"], rateOfAttack: 2, damage: 2,
        profileHash: HASH_B,
      }] },
      officialActionRouteCatalogue: { units: [{ pieceId: "player1-goliath-1",
        movementProfile: { multiModelSpeedInches: 6,
          singleModelSpeedInches: 6 } }] },
      pieces: [{ id: "player2-swarmling", sideKey: "player2",
        isOnField: true, isDestroyed: false, currentModels: 1,
        models: [{ id: "player2-swarmling-model-1", xInches: 10, yInches: 6,
          baseShape: "round", baseWidthInches: 1.26,
          baseDepthInches: 1.26, isOnField: true, isDestroyed: false }] },
      { id: "player1-goliath-1", sideKey: "player1",
        officialUnitRecordKey: "goliath", isOnField: true,
        isDestroyed: false, currentModels: 1, combatTags: ["ground"],
        equipment: [{ equipmentName: "Autocannon" },
          { equipmentName: "Scatter Missiles" }],
        models: [{ id: "player1-goliath-1-model-1", xInches: 24,
          yInches: 29.5, baseShape: "round", baseWidthInches: 1.57,
          baseDepthInches: 1.57, isOnField: true, isDestroyed: false }] }],
    };
    const omegaDomain = {
      domainId: "omega-domain", actionType: "use_active_ability",
      sideKey: "player2", pieceId: "player2-swarmling",
      effectKind: "omega_network",
      parameterSchema: { required: ["activeUnitId", "xMilliInches",
        "yMilliInches"], activeUnitId: { const: "player2-swarmling" },
        groundPoint: { baseShape: "round", baseWidthInches: 3.15,
          baseDepthInches: 3.15 } },
    };
    const omegaResult = searchStarcraftTmgLegalAssetPlacementOptionsV1({
      state: omegaState, domain: omegaDomain,
      request: { preferredAnchor: { xMilliInches: 14_000,
        yMilliInches: 12_000 }, maximumOptions: 6 },
      instantiate(_state, _domain, parameters) {
        return { canonicalParameters: { activeUnitId: parameters.activeUnitId,
          placement: { xMilliInches: parameters.xMilliInches,
            yMilliInches: parameters.yMilliInches } },
        action: { actionType: "use_active_ability" } };
      },
    });
    const threatened = omegaResult.placementOptions.find((option) =>
      option.coordinate.xMilliInches === 14_000
        && option.coordinate.yMilliInches === 12_000);
    ensure(threatened?.tacticalMetrics?.incomingStationaryProfileCount === 2,
      "OMEGA_ANCHOR_STATIONARY_THREAT_NOT_PROJECTED", { threatened });
    ensure(omegaResult.placementOptions.some((option) =>
      option.tacticalMetrics?.incomingStationaryProfileCount === 0),
    "OMEGA_SAFE_STRATEGIC_ALTERNATIVE_NOT_RETURNED", { omegaResult });
    const contradicted = inspectStarcraftTmgFormationThreatClaimsV1({
      raw: { selectedReason: "Place the Omega Worm far outside the Goliath's fire range." },
      selection: { publicReason: "The Worm is safe outside enemy fire." },
      option: threatened,
    });
    ensure(contradicted.contradicted === true,
      "OMEGA_FALSE_SAFE_REASON_NOT_REJECTED", { contradicted });

    const singleton = resolveStarcraftTmgDeterministicSingletonActionV1([{
      kind: "parameterized", id: "finish-domain", proposal: null,
      action: { actionType: "finish_activation",
        parameterSchema: { type: "object", required: [] } },
    }]);
    ensure(singleton?.proposal?.kind === "parameterized"
      && singleton.proposal.domainId === "finish-domain"
      && Object.keys(singleton.proposal.parameters).length === 0,
    "EMPTY_PARAMETER_FINISH_NOT_DETERMINISTIC", { singleton });
    const crossPhaseLockout =
      inspectStarcraftTmgOpponentPredictionFeasibilityV1({
        currentPhase: "movement",
        spatialObservation: { units: [{ unitId: "player1-goliath-1",
          sideRelation: "opponent", activationStatus: { activatedPhases: {
            movement: true, assault: false, combat: false,
          } } }], offTableUnits: [] },
        responses: [{ responseId: "resp-goliath-hold", actionClass: "hold",
          likelyActorUnitId: "player1-goliath-1",
          horizon: { kind: "current_round", count: 1 },
          opponentAction: "The Goliath remains in place; it has already activated for movement, so it cannot take another Move, Run, Charge, Ranged Attack or Fight action in this phase or round.",
          basis: [] }],
      });
    ensure(crossPhaseLockout.status === "contradicted"
      && crossPhaseLockout.contradictions.some((entry) =>
        entry.reason === "movement_activation_does_not_lock_other_phases"),
    "CROSS_PHASE_ACTIVATION_LOCKOUT_NOT_REJECTED", { crossPhaseLockout });
    const correctionSubmission =
      recoverStarcraftTmgCorrectionSubmissionV1({
        candidateId: omegaDomain.domainId,
        intent: { predictedOpponentResponses: [{
          actionClass: "ranged_attack",
          likelyActorUnitId: "player1-goliath-1",
        }], lifecycleAssessment: { currentPhase: "movement" },
        publicDecisionSummary: { plan: "Keep the corrected fire response." },
        selection: { kind: "asset", optionId: "corrected-safe-option",
          slotAssignments: [], parametersJson: "{}",
          publicReason: "Accept the exact projected exposure." },
        speech: "Omega correction." },
      }, {
        semanticCorrectionRounds: 1,
        attemptKeys: ["prior-action-attempt", "partial-action-attempt",
          "current-action-attempt"],
        attempts: {
          "prior-action-attempt": { stage: "action", status: "completed",
            safeOutput: { providerTurn: { kind: "tool_calls", toolCalls: [{
              name: "submit_decision", arguments: {
                candidateId: omegaDomain.domainId,
                intent: { tradeoffs: ["prior tradeoff"],
                  risks: ["prior risk"], fallbacks: ["prior fallback"],
                  stopOrReplanTriggers: ["prior trigger"],
                  unitIds: ["player2-swarmling"],
                  skillsUsed: ["zerg-skill"],
                  abilitiesIntended: ["Omega Network"],
                  resourcesIntended: [] },
                selection: { kind: "asset",
                  optionId: threatened.placementOptionId,
                  slotAssignments: [], parametersJson: "{}",
                  publicReason: "Accept the exact projected exposure." },
              } }] } } },
          "partial-action-attempt": { stage: "action", status: "completed",
            safeOutput: { providerTurn: { kind: "tool_calls", toolCalls: [{
              name: "submit_decision", arguments: {
                candidateId: omegaDomain.domainId,
                intent: { predictedOpponentResponses: [{
                  actionClass: "ranged_attack",
                  likelyActorUnitId: "player1-goliath-1",
                }] },
                selection: { kind: "asset",
                  optionId: threatened.placementOptionId,
                  slotAssignments: [], parametersJson: "{}",
                  publicReason: "Partial correction without stable refs." },
              } }] } } },
          "current-action-attempt": { stage: "action", status: "completed",
            safeOutput: { providerTurn: { kind: "tool_calls", toolCalls: [{
              name: "submit_decision", arguments: {
                candidateId: omegaDomain.domainId,
                intent: { predictedOpponentResponses: [{
                  actionClass: "ranged_attack",
                  likelyActorUnitId: "player1-goliath-1",
                }] },
              } }] } } },
        },
      }, { currentAttemptKey: "current-action-attempt" });
    ensure(correctionSubmission.recovered === true
      && correctionSubmission.sourceAttemptKey === "partial-action-attempt"
      && correctionSubmission.liftedFields.includes("selection")
      && correctionSubmission.submission.selection?.kind === "asset"
      && correctionSubmission.submission.selection?.optionId
        === "corrected-safe-option",
    "CORRECTION_ASSET_SELECTION_NOT_RECOVERED", { correctionSubmission });
    ensure(correctionSubmission.submission.lifecycleAssessment?.currentPhase
      === "movement"
      && correctionSubmission.submission.publicDecisionSummary?.plan
        === "Keep the corrected fire response."
      && correctionSubmission.submission.speech === "Omega correction."
      && correctionSubmission.submission.intent.predictedOpponentResponses[0]
        .actionClass === "ranged_attack"
      && correctionSubmission.submission.intent.unitIds[0]
        === "player2-swarmling"
      && correctionSubmission.submission.intent.skillsUsed[0]
        === "zerg-skill"
      && correctionSubmission.submission.intent.abilitiesIntended[0]
        === "Omega Network"
      && correctionSubmission.submission.intent.resourcesIntended.length === 0,
    "CORRECTION_DELTA_NOT_MERGED", { correctionSubmission });
    ensure(correctionSubmission.selectionChanged === true
      && correctionSubmission.submission.intent.tradeoffs === undefined
      && correctionSubmission.submission.intent.risks === undefined
      && correctionSubmission.submission.intent.nextDecisionFocus === undefined,
    "CHANGED_SELECTION_INHERITED_STALE_STRATEGY",
    { correctionSubmission });
    const materializedCorrection =
      materializeStarcraftTmgCorrectionIntentArraysV1(
        correctionSubmission.submission, correctionSubmission);
    ensure(["tradeoffs", "risks", "fallbacks", "stopOrReplanTriggers"]
      .every((field) => Array.isArray(materializedCorrection.intent[field])
        && materializedCorrection.intent[field].length === 0),
    "CHANGED_SELECTION_MISSING_ARRAYS_NOT_STRUCTURALLY_MATERIALIZED",
    { materializedCorrection });
    const nestedHistoricalSelectionRecovery =
      recoverStarcraftTmgCorrectionSubmissionV1({
        candidateId: omegaDomain.domainId,
        intent: {
          tradeoffs: ["corrected tradeoff"],
          risks: ["corrected risk"],
          fallbacks: ["corrected fallback"],
          stopOrReplanTriggers: ["corrected trigger"],
          unitIds: ["player2-swarmling"],
          skillsUsed: ["zerg-skill"],
          abilitiesIntended: ["Omega Network"],
          resourcesIntended: [],
        },
      }, {
        semanticCorrectionRounds: 2,
        attemptKeys: ["nested-selection-attempt"],
        attempts: {
          "nested-selection-attempt": {
            stage: "action",
            status: "completed",
            safeOutput: { providerTurn: { kind: "tool_calls", toolCalls: [{
              name: "submit_decision",
              arguments: {
                candidateId: omegaDomain.domainId,
                intent: {
                  selection: { kind: "asset",
                    optionId: "paid-valid-option",
                    slotAssignments: [], parametersJson: "{}",
                    publicReason: "Preserve the already-paid legal option." },
                  lifecycleAssessment: { currentPhase: "movement" },
                  publicDecisionSummary: { plan: "Preserve paid choice." },
                  tradeoffs: ["original tradeoff"],
                },
              },
            }] } },
          },
        },
      });
    ensure(nestedHistoricalSelectionRecovery.recovered === true
      && nestedHistoricalSelectionRecovery.sourceAttemptKey
        === "nested-selection-attempt"
      && nestedHistoricalSelectionRecovery.submission.selection?.optionId
        === "paid-valid-option"
      && nestedHistoricalSelectionRecovery.submission.lifecycleAssessment
        ?.currentPhase === "movement"
      && nestedHistoricalSelectionRecovery.submission.publicDecisionSummary
        ?.plan === "Preserve paid choice."
      && nestedHistoricalSelectionRecovery.submission.intent.tradeoffs[0]
        === "corrected tradeoff",
    "NESTED_HISTORICAL_SELECTION_NOT_NORMALIZED_BEFORE_RECOVERY",
    { nestedHistoricalSelectionRecovery });
    process.stdout.write(`${JSON.stringify({
      schema: "ticket23_slice247_legal_asset_placement_options_focused_v1",
      ok: true,
      optionCount: receipt.result.optionCount,
      omegaOptionCount: omegaResult.optionCount,
      omegaSafeOptionCount: omegaResult.placementOptions.filter((option) =>
        option.tacticalMetrics?.incomingStationaryProfileCount === 0).length,
      deterministicFinish: true,
      crossPhasePredictionRejected: true,
      correctionAssetSelectionRecovered: true,
      correctionDeltaMerged: true,
      nestedHistoricalSelectionRecovered: true,
      changedSelectionStaleStrategyRejected: true,
      attemptedCandidateCount: receipt.result.attemptedCandidateCount,
      providerCalls: 0,
      trainingTruth: false,
    }, null, 2)}\n`);
  });
}

(process.argv.includes("--non-unit-placement-projection-only")
  ? nonUnitPlacementProjectionOnly() : main()).catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 1;
});
