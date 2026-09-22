#!/usr/bin/env node

import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { searchStarcraftTmgLegalAssetPlacementOptionsV1 } from
  "../packages/online-agent-session/legal-asset-placement-search-v1.mjs";
import {
  inspectStarcraftTmgFormationThreatClaimsV1,
  inspectStarcraftTmgOpponentPredictionFeasibilityV1,
  recoverStarcraftTmgCorrectionSubmissionV1,
  resolveStarcraftTmgDeterministicSingletonActionV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(
    `${code}:${JSON.stringify(details)}`), { code, ...details });
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
        attemptKeys: ["prior-action-attempt", "current-action-attempt"],
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
      });
    ensure(correctionSubmission.recovered === true
      && correctionSubmission.sourceAttemptKey === "prior-action-attempt"
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
        .actionClass === "ranged_attack",
    "CORRECTION_DELTA_NOT_MERGED", { correctionSubmission });
    ensure(correctionSubmission.selectionChanged === true
      && correctionSubmission.submission.intent.tradeoffs === undefined
      && correctionSubmission.submission.intent.risks === undefined
      && correctionSubmission.submission.intent.nextDecisionFocus === undefined,
    "CHANGED_SELECTION_INHERITED_STALE_STRATEGY",
    { correctionSubmission });
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
      changedSelectionStaleStrategyRejected: true,
      attemptedCandidateCount: receipt.result.attemptedCandidateCount,
      providerCalls: 0,
      trainingTruth: false,
    }, null, 2)}\n`);
  });
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 1;
});
