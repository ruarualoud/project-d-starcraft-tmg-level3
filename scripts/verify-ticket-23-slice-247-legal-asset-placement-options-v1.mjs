#!/usr/bin/env node

import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function main() {
  const state = {
    board: { widthInches: 54, heightInches: 36, tokens: [], markers: [],
      effectMarkers: [], terrain: [] },
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
    process.stdout.write(`${JSON.stringify({
      schema: "ticket23_slice247_legal_asset_placement_options_focused_v1",
      ok: true,
      optionCount: receipt.result.optionCount,
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
