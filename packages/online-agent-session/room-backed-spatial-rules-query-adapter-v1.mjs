import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "./legal-formation-search-v1.mjs";
import { searchStarcraftTmgLegalAssetPlacementOptionsV1 } from
  "./legal-asset-placement-search-v1.mjs";
import {
  buildStarcraftTmgTacticalRelationshipGraphV1,
  STARCRAFT_TMG_RELATIONSHIP_QUERY_KIND,
} from "./tactical-relationship-graph-v1.mjs";
import {
  estimateStarcraftTmgAttackProbabilityV1,
  estimateStarcraftTmgFireZoneExchangeV1,
} from "./combat-estimation-runtime-v1.mjs";

export const STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION =
  "starcraft_tmg_room_backed_spatial_rules_query_adapter_v1";

const HASH = /^[a-f0-9]{64}$/u;
const INSTANTIATION_QUERY_KINDS = new Set([
  STARCRAFT_TMG_RELATIONSHIP_QUERY_KIND,
  "space.solve_formation",
  "legal_formation_options",
  "legal_asset_placement_options",
  "instantiate_parameterized_action",
  "legal_full_path_movement",
  "coherency_after_candidate_placement",
  "intervening_model_or_terrain_blocking",
  "line_of_sight_cover_and_elevation",
  "action_specific_threat",
  "attack_probability",
  "fire_zone_exchange",
]);
const MAX_PARAMETER_CANDIDATES_PER_BATCH = 128;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function safeCode(error) {
  const code = String(error?.code || error?.message || "").split(":")[0];
  if (/^[A-Z0-9_]{1,160}$/u.test(code)) return code;
  if (error?.name === "TypeError") {
    return "RULES_QUERY_IMPLEMENTATION_TYPE_ERROR";
  }
  if (error?.name === "RangeError") {
    return "RULES_QUERY_IMPLEMENTATION_RANGE_ERROR";
  }
  if (error?.name === "SyntaxError") {
    return "RULES_QUERY_IMPLEMENTATION_SYNTAX_ERROR";
  }
  return "RULES_QUERY_IMPLEMENTATION_ERROR";
}

function safeFailureClass(error) {
  if (error?.name === "TypeError") return "type_error";
  if (error?.name === "RangeError") return "range_error";
  if (error?.name === "SyntaxError") return "syntax_error";
  return error?.code ? "typed_rules_error" : "implementation_error";
}

function safeFailureDetail(error) {
  const message = String(error?.message || "");
  const separator = message.indexOf(":");
  if (separator < 0) return null;
  const detail = message.slice(separator + 1).trim().slice(0, 240);
  return detail && /^[A-Za-z0-9_./-]+$/u.test(detail) ? detail : null;
}

function actionPlan(action) {
  const source = object(action?.sourceAction) ? action.sourceAction : action;
  return {
    actionType: action?.actionType || source?.actionType || null,
    sideKey: action?.sideKey || source?.sideKey || null,
    pieceId: action?.pieceId || source?.pieceId || null,
    sourceRuntimeKind: action?.sourceRuntimeKind || null,
    abilityName: action?.abilityName || source?.abilityName || null,
    chance: clone(action?.chance || source?.chance || null),
    spatialPlan: clone(source?.spatialPlan || null),
    rangedPlan: clone(source?.rangedPlan || null),
    meleePlan: clone(source?.meleePlan || null),
    relocationPlan: clone(source?.relocationPlan || null),
  };
}

function parameterRepairContext(domain, proposal, failureCode, failureDetail) {
  const constraints = object(domain?.constraints) ? domain.constraints : {};
  const parameters = object(proposal?.parameters) ? proposal.parameters : {};
  const leadingModelId = String(parameters.leadingModelId || "");
  const leadingProfile = (constraints.modelProfiles || []).find((entry) =>
    entry.modelId === leadingModelId) || null;
  const segment = (constraints.entrySegments || []).find((entry) =>
    entry.segmentId === parameters.entrySegmentId) || null;
  const along = Number(parameters.entryAlongEdgeMilliInches);
  let hostPrependedPathStart = leadingProfile?.startPoint || null;
  if (domain?.actionType === "deploy" && segment && Number.isSafeInteger(along)
    && leadingProfile) {
    const halfWidth = Math.round(Number(leadingProfile.baseWidthMilliInches) / 2);
    const halfDepth = Math.round(Number(leadingProfile.baseDepthMilliInches) / 2);
    hostPrependedPathStart = segment.side === "top"
      ? { xMilliInches: along,
        yMilliInches: Number(constraints.battlefieldHeightMilliInches)
          + halfDepth }
      : segment.side === "bottom"
        ? { xMilliInches: along, yMilliInches: -halfDepth }
        : segment.side === "left"
          ? { xMilliInches: -halfWidth, yMilliInches: along }
          : segment.side === "right"
            ? { xMilliInches: Number(constraints.battlefieldWidthMilliInches)
              + halfWidth, yMilliInches: along }
            : null;
  }
  const submittedPath = Array.isArray(parameters.path)
    ? parameters.path.map((entry) => ({
      xMilliInches: Number(entry?.xMilliInches),
      yMilliInches: Number(entry?.yMilliInches),
    })) : [];
  const completePath = [hostPrependedPathStart, ...submittedPath]
    .filter((entry) => entry
      && Number.isFinite(entry.xMilliInches)
      && Number.isFinite(entry.yMilliInches));
  const submittedDistanceIncludingHostStartMilliInches = Math.round(
    completePath.slice(1).reduce((sum, entry, index) => sum + Math.hypot(
      entry.xMilliInches - completePath[index].xMilliInches,
      entry.yMilliInches - completePath[index].yMilliInches,
    ), 0),
  );
  return {
    schemaVersion: "starcraft_tmg_parameter_repair_context_v1",
    failureCode,
    failureDetail,
    actionType: domain?.actionType || null,
    leadingModelId: leadingModelId || null,
    hostPrependedPathStart,
    submittedPath,
    submittedDistanceIncludingHostStartMilliInches,
    maxDistanceMilliInches:
      Number(constraints.maxDistanceMilliInches) || null,
    coherencyRangeMilliInches:
      Number(constraints.coherencyRangeMilliInches) || null,
    submittedRemainingPlacementCount:
      Array.isArray(parameters.placements) ? parameters.placements.length : 0,
    requiredRemainingPlacementCount:
      Math.max(0, Number(constraints.modelProfiles?.length || 0) - 1),
    leadingModelBase: leadingProfile ? {
      widthMilliInches: Number(leadingProfile.baseWidthMilliInches) || null,
      depthMilliInches: Number(leadingProfile.baseDepthMilliInches) || null,
    } : null,
    useForSameChoiceRepairOnly: true,
    doesNotProveProposalLegal: true,
    trainingTruth: false,
  };
}

function unknown(authority, queryKind, reason, details = {}) {
  return freeze({
    ok: true,
    authority: clone(authority),
    precision: "unknown",
    queryKind,
    result: null,
    reason,
    findingSeverity: "Medium",
    rulesAuthority: false,
    unsupportedWasApproximated: false,
    mutationAuthority: false,
    confirmationAuthority: false,
    applyAuthority: false,
    ...clone(details),
    trainingTruth: false,
  });
}

export function createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1(
  options = {},
) {
  const roomStore = options.roomStore;
  const rulesRuntime = options.rulesRuntime;
  const seatKey = String(options.seatKey || "");
  if (typeof roomStore?.loadRoom !== "function"
    || typeof rulesRuntime?.instantiate !== "function"
    || !seatKey) {
    throw new TypeError("roomStore, Rules instantiate and seatKey are required");
  }

  async function query(request = {}) {
    const authority = request.authority;
    const queryKind = String(request.queryKind || "");
    if (!object(authority) || authority.seatKey !== seatKey
      || !HASH.test(String(authority.stateHash || ""))
      || !HASH.test(String(authority.legalSpaceHash || ""))) {
      return unknown(authority || {}, queryKind, "RULES_QUERY_AUTHORITY_INVALID", {
        findingSeverity: "High",
      });
    }
    if (!INSTANTIATION_QUERY_KINDS.has(queryKind)) {
      return unknown(authority, queryKind, "RULES_QUERY_KIND_NOT_IMPLEMENTED");
    }
    let aggregate;
    try {
      aggregate = await roomStore.loadRoom(authority.roomId);
    } catch (error) {
      return unknown(authority, queryKind, safeCode(error), {
        failureStage: "read_authoritative_room",
      });
    }
    if (!aggregate
      || aggregate.envelope?.matchBindingHash !== authority.matchBindingHash
      || aggregate.stateRevision !== authority.stateRevision
      || aggregate.envelope?.stateHash !== authority.stateHash) {
      return unknown(authority, queryKind, "RULES_QUERY_AUTHORITY_STALE", {
        findingSeverity: "High",
      });
    }
    const args = object(request.arguments) ? request.arguments : {};
    if (queryKind === STARCRAFT_TMG_RELATIONSHIP_QUERY_KIND) {
      try {
        const result = buildStarcraftTmgTacticalRelationshipGraphV1({
          state: aggregate.envelope.state,
          seatKey,
          authority,
          request: args,
        });
        return freeze({
          ok: true,
          authority: clone(authority),
          precision: "advisory_estimate",
          queryKind,
          result: clone(result),
          source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
          rulesAuthority: false,
          mutationAuthority: false,
          confirmationAuthority: false,
          applyAuthority: false,
          trainingTruth: false,
        });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), {
          failureStage: "build_tactical_relationship_graph",
          safeFailureClass: safeFailureClass(error),
          mayRepairSameChoice: false,
        });
      }
    }
    if (queryKind === "fire_zone_exchange") {
      try {
        const domains = Array.isArray(args.currentLegalSpaceDomains)
          ? args.currentLegalSpaceDomains.filter((entry) =>
            object(entry) && entry.sideKey === seatKey) : [];
        const result = estimateStarcraftTmgFireZoneExchangeV1({
          state: aggregate.envelope.state,
          seatKey,
          authority,
          request: args,
          currentLegalSpaceDomains: domains,
          formationQueryReceipt: object(args.currentFormationQueryReceipt)
            ? args.currentFormationQueryReceipt : null,
        });
        return freeze({
          ok: true,
          authority: clone(authority),
          precision: "advisory_estimate",
          queryKind,
          result: clone(result),
          source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
          rulesAuthority: false,
          mutationAuthority: false,
          confirmationAuthority: false,
          applyAuthority: false,
          trainingTruth: false,
        });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), {
          failureStage: "estimate_current_fire_zone_exchange",
          safeFailureClass: safeFailureClass(error),
          mayRepairSameChoice: false,
        });
      }
    }
    const domainId = String(args.domainId || args.proposal?.domainId || "");
    const domain = object(args.currentLegalSpaceDomain)
      ? args.currentLegalSpaceDomain : null;
    if (!domain || domain.domainId !== domainId
      || domain.sideKey !== seatKey) {
      return unknown(authority, queryKind, "RULES_QUERY_CURRENT_DOMAIN_MISSING", {
        findingSeverity: "High",
      });
    }
    if (queryKind === "attack_probability") {
      try {
        const result = estimateStarcraftTmgAttackProbabilityV1({
          state: aggregate.envelope.state,
          domain,
          parameters: args.parameters,
          sampleBudget: args.sampleBudget,
        });
        return freeze({
          ok: true,
          authority: clone(authority),
          precision: "advisory_estimate",
          queryKind,
          result: clone(result),
          source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
          rulesAuthority: false,
          mutationAuthority: false,
          confirmationAuthority: false,
          applyAuthority: false,
          trainingTruth: false,
        });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), {
          failureStage: "estimate_current_ranged_attack",
          safeFailureClass: safeFailureClass(error),
          mayRepairSameChoice: false,
        });
      }
    }
    if (new Set(["space.solve_formation", "legal_formation_options"])
      .has(queryKind)) {
      try {
        const result = searchStarcraftTmgLegalFormationOptionsV1({
          state: aggregate.envelope.state,
          domain,
          request: args,
          instantiate: (...instantiateArgs) =>
            rulesRuntime.instantiate(...instantiateArgs),
          instantiateOptions: {
            matchBinding: aggregate.envelope.matchBinding,
          },
        });
        if (result.optionCount < 1) {
          return unknown(authority, queryKind,
            "RULES_QUERY_NO_LEGAL_FORMATION_OPTION", {
              attemptedCandidateCount: result.attemptedCandidateCount,
              failureCounts: clone(result.failureCounts),
              mayRepairSameChoice: false,
            });
        }
        return freeze({
          ok: true,
          authority: clone(authority),
          precision: "exact",
          queryKind,
          result: clone(result),
          source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
          rulesAuthority: true,
          mutationAuthority: false,
          confirmationAuthority: false,
          applyAuthority: false,
          trainingTruth: false,
        });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), {
          failureStage: "search_current_rules_domain",
          safeFailureClass: safeFailureClass(error),
          mayRepairSameChoice: false,
        });
      }
    }
    if (queryKind === "legal_asset_placement_options") {
      try {
        const result = searchStarcraftTmgLegalAssetPlacementOptionsV1({
          state: aggregate.envelope.state,
          domain,
          request: args,
          instantiate: (...instantiateArgs) =>
            rulesRuntime.instantiate(...instantiateArgs),
          instantiateOptions: {
            matchBinding: aggregate.envelope.matchBinding,
          },
        });
        if (result.optionCount < 1) {
          return unknown(authority, queryKind,
            "RULES_QUERY_NO_LEGAL_ASSET_PLACEMENT_OPTION", {
              attemptedCandidateCount: result.attemptedCandidateCount,
              failureCounts: clone(result.failureCounts),
              mayRepairSameChoice: false,
            });
        }
        return freeze({
          ok: true,
          authority: clone(authority),
          precision: "exact",
          queryKind,
          result: clone(result),
          source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
          rulesAuthority: true,
          mutationAuthority: false,
          confirmationAuthority: false,
          applyAuthority: false,
          trainingTruth: false,
        });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), {
          failureStage: "search_current_rules_asset_placement_domain",
          safeFailureClass: safeFailureClass(error),
          mayRepairSameChoice: false,
        });
      }
    }
    const proposal = object(args.proposal) ? args.proposal : {
      kind: "parameterized",
      domainId: args.domainId,
      parameters: args.parameters,
    };
    if (proposal.kind !== "parameterized" || !object(proposal.parameters)) {
      return unknown(authority, queryKind,
        "RULES_QUERY_PARAMETERIZED_PROPOSAL_REQUIRED");
    }
    try {
      const instantiated = rulesRuntime.instantiate(
        aggregate.envelope.state,
        domain,
        proposal.parameters,
        { matchBinding: aggregate.envelope.matchBinding },
      );
      const result = {
        proposalAccepted: true,
        domainId: domain.domainId,
        canonicalParameters: clone(instantiated.canonicalParameters),
        action: actionPlan(instantiated.action),
        actionHash: hashStarcraftTmgContract(instantiated.action),
        completeFormationPlacementChecked: Boolean(
          instantiated.action?.sourceAction?.spatialPlan
            ?.completeFormationPlacementChecked,
        ),
        automaticFormationPlacementUsed: false,
      };
      return freeze({
        ok: true,
        authority: clone(authority),
        precision: "exact",
        queryKind,
        result,
        source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
        rulesAuthority: true,
        mutationAuthority: false,
        confirmationAuthority: false,
        applyAuthority: false,
        trainingTruth: false,
      });
    } catch (error) {
      const failureCode = safeCode(error);
      return unknown(authority, queryKind, failureCode, {
        failureStage: "instantiate_current_rules_domain",
        safeFailureClass: safeFailureClass(error),
        proposalHash: hashStarcraftTmgContract(proposal),
        mayRepairSameChoice: true,
        repairContext: parameterRepairContext(domain, proposal, failureCode,
          safeFailureDetail(error)),
      });
    }
  }

  async function queryFirstExact(request = {}) {
    const authority = request.authority;
    const queryKind = "find_first_legal_parameterized_action";
    if (!object(authority) || authority.seatKey !== seatKey
      || !HASH.test(String(authority.stateHash || ""))
      || !HASH.test(String(authority.legalSpaceHash || ""))) {
      return unknown(authority || {}, queryKind, "RULES_QUERY_AUTHORITY_INVALID", {
        findingSeverity: "High",
      });
    }
    const domain = request.currentLegalSpaceDomain;
    const candidates = request.parameterCandidates;
    if (!object(domain) || domain.sideKey !== seatKey
      || !String(domain.domainId || "")
      || !Array.isArray(candidates) || candidates.length === 0
      || candidates.length > MAX_PARAMETER_CANDIDATES_PER_BATCH
      || candidates.some((entry) => !object(entry))) {
      return unknown(authority, queryKind,
        "RULES_QUERY_PARAMETER_CANDIDATE_BATCH_INVALID");
    }
    let aggregate;
    try {
      aggregate = await roomStore.loadRoom(authority.roomId);
    } catch (error) {
      return unknown(authority, queryKind, safeCode(error), {
        failureStage: "read_authoritative_room",
      });
    }
    if (!aggregate
      || aggregate.envelope?.matchBindingHash !== authority.matchBindingHash
      || aggregate.stateRevision !== authority.stateRevision
      || aggregate.envelope?.stateHash !== authority.stateHash) {
      return unknown(authority, queryKind, "RULES_QUERY_AUTHORITY_STALE", {
        findingSeverity: "High",
      });
    }
    const failureCodes = new Set();
    for (const [index, parameters] of candidates.entries()) {
      try {
        const instantiated = rulesRuntime.instantiate(
          aggregate.envelope.state,
          domain,
          parameters,
          { matchBinding: aggregate.envelope.matchBinding },
        );
        return freeze({
          ok: true,
          authority: clone(authority),
          precision: "exact",
          queryKind,
          result: {
            proposalAccepted: true,
            domainId: domain.domainId,
            selectedIndex: index,
            selectedParameters: clone(parameters),
            canonicalParameters: clone(instantiated.canonicalParameters),
            action: actionPlan(instantiated.action),
            actionHash: hashStarcraftTmgContract(instantiated.action),
            completeFormationPlacementChecked: Boolean(
              instantiated.action?.sourceAction?.spatialPlan
                ?.completeFormationPlacementChecked,
            ),
            automaticFormationPlacementUsed: false,
          },
          source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
          rulesAuthority: true,
          mutationAuthority: false,
          confirmationAuthority: false,
          applyAuthority: false,
          trainingTruth: false,
        });
      } catch (error) {
        failureCodes.add(safeCode(error));
      }
    }
    return unknown(authority, queryKind,
      "RULES_QUERY_NO_LEGAL_PARAMETER_CANDIDATE", {
        attemptedCandidateCount: candidates.length,
        failureCodes: [...failureCodes].sort(),
        mayContinueWithNextBatch: true,
      });
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION}.metadata`,
      seatKey,
      queryKinds: [...INSTANTIATION_QUERY_KINDS,
        "find_first_legal_parameterized_action"],
      readsAuthoritativeRoomState: true,
      reusesHashBoundCurrentLegalSpaceDomain: true,
      repeatedFullLegalSpaceEnumeration: false,
      roomMutationAuthority: false,
      confirmationAuthority: false,
      applyAuthority: false,
      credentialsExposedToModel: false,
      trainingTruth: false,
    }),
    query,
    queryFirstExact,
  });
}
