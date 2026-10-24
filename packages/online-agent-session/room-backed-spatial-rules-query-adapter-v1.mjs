import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsAsyncV1 } from
  "./legal-formation-search-v1.mjs";
import { compareStarcraftTmgFormationBatchInWorkersV1 } from
  "./formation-comparison-worker-batch-v1.mjs";
import { searchStarcraftTmgLegalAssetPlacementOptionsV1 } from
  "./legal-asset-placement-search-v1.mjs";
import {
  buildStarcraftTmgTacticalRelationshipGraphAsyncV1,
  STARCRAFT_TMG_RELATIONSHIP_QUERY_KIND,
} from "./tactical-relationship-graph-v1.mjs";
import {
  createStarcraftTmgAttackProbabilityBatchV1,
  estimateStarcraftTmgAttackProbabilityV1,
  estimateStarcraftTmgFireZoneExchangeV1,
  createStarcraftTmgFireExchangeWorkV1,
  createStarcraftTmgFireExchangeWorkPlannerV1,
  createStarcraftTmgFireExchangeWorkEvaluatorV1,
  finishStarcraftTmgFireExchangeWorkV1,
} from "./combat-estimation-runtime-v1.mjs";
import { inspectStarcraftTmgActionParametersV1 } from
  "./action-parameter-contract-v1.mjs";
import { describeOfficialSelectedRosterChargeParameterRepairV1 } from
  "../product-composition/official-selected-roster-charge-parameter-contract-v1.mjs";
import { inspectOfficialSelectedRosterChargePathEvidenceV1,
  OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND } from
  "../product-composition/official-selected-roster-melee-action-runtime-v1.mjs";
import { STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1 } from
  "./readonly-query-kinds-v1.mjs";
import { evaluateStarcraftTmgReadonlyQueriesInWorkersV1 } from
  "./readonly-query-worker-batch-v1.mjs";
import { STARCRAFT_TMG_DELEGATED_SPATIAL_QUERY_KINDS_V1,
  STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1,
  inspectStarcraftTmgMarkerControlArgumentsV1 } from
  "./spatial-query-contracts-v1.mjs";
import { inspectOfficialMissionMarkerControlV2 } from
  "../rule-atoms/official-mission-marker-control-kernel-v1.mjs";
import {inspectOfficialContextualSupplyV1} from '../rule-atoms/official-contextual-supply-projection-v1.mjs';
import { applyOfficialSelectedRosterSpatialActionV1 } from
  "../product-composition/official-selected-roster-spatial-action-runtime-v1.mjs";
import { createPregameMapEvidencePortV1 } from "../roster-strategist/pregame-map-evidence-port-v1.mjs";
import { queryStarcraftTmgStaticFormationV1 } from './static-formation-query-v1.mjs';
import {describeOfficialRelocationParameterFieldsV1,inspectOfficialRelocationPlacementIdsV1} from
  '../product-composition/official-relocation-parameter-contract-v1.mjs';

export const STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION =
  "starcraft_tmg_room_backed_spatial_rules_query_adapter_v1";

const HASH = /^[a-f0-9]{64}$/u;
const INSTANTIATION_QUERY_KINDS = new Set(STARCRAFT_TMG_DELEGATED_SPATIAL_QUERY_KINDS_V1);
const MAX_PARAMETER_CANDIDATES_PER_BATCH = 128;
const INDEPENDENT_READONLY_QUERY_KINDS = new Set(
  STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1,
);

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
    chargePlan: clone(source?.chargePlan || null),
    relocationPlan: clone(source?.relocationPlan || null),
  };
}

function nativePlacementEvidence(action) {
  const source=action?.sourceAction||action;
  const spatial=source?.spatialPlan;
  if(spatial?.completeFormationPlacementChecked===true)return {
    completeFormationPlacementChecked:true,completeNativePathChecked:true,
    nativePlanKind:'spatialPlan',nativePlanHash:spatial.spatialPlanHash,
    spatialPlanHash:spatial.spatialPlanHash};
  const relocation=source?.relocationPlan?.geometryPlan;
  if(relocation?.schema==='starcraft_tmg_official_relocation_geometry_plan_v1'
    &&relocation.fullBaseBoundaryChecked===true
    &&relocation.rectangularEndpointBasesChecked===true
    &&relocation.completeFormationCoherencyChecked===true)return {
      completeFormationPlacementChecked:true,
      completeNativePathChecked:relocation.effectKind==='extra_move'
        &&relocation.fullRoundBaseSweptPathChecked===true
        &&relocation.pathIgnoredForPlaceEffects===false,
      nativePlanKind:'relocationPlan',nativePlanHash:relocation.geometryPlanHash,
      spatialPlanHash:null};
  return {completeFormationPlacementChecked:false,completeNativePathChecked:false};
}

export function describeStarcraftTmgActionParameterRepairContextV1(domain, proposal, failureCode, failureDetail) {
  const declaration = describeOfficialSelectedRosterChargeParameterRepairV1(domain, failureCode, failureDetail);
  if (declaration) return declaration;
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
  const relocationFields=describeOfficialRelocationParameterFieldsV1(domain);
  const relocationIdentity=relocationFields?inspectOfficialRelocationPlacementIdsV1(
    relocationFields.placements.exactModelIds,parameters.placements):null;
  return {
    schemaVersion: "starcraft_tmg_parameter_repair_context_v1",
    failureCode,
    failureDetail,
    actionType: domain?.actionType || null,
    leadingModelId: leadingModelId || null,
    hostPrependedPathStart,
    submittedPath,
    submittedDistanceIncludingHostStartMilliInches:hostPrependedPathStart
      ?submittedDistanceIncludingHostStartMilliInches:null,
    maxDistanceMilliInches:
      Number(constraints.maxDistanceMilliInches) || null,
    coherencyRangeMilliInches:
      Number(constraints.coherencyRangeMilliInches) || null,
    submittedRemainingPlacementCount:
      relocationFields?null:Array.isArray(parameters.placements) ? parameters.placements.length : 0,
    requiredRemainingPlacementCount:
      relocationFields||!Array.isArray(constraints.modelProfiles)?null:
        Math.max(0, constraints.modelProfiles.length - 1),
    ...(relocationIdentity?{...relocationIdentity,placementsIncludeLeadingModel:true,
      exactPlacementModelIds:relocationFields.placements.exactModelIds}:{}),
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

// Queries and action previews share the Native submission contract. The melee
// probability endpoint adds targetUnitId for its one-target observation; that
// field is not a Native fight argument (the allocation selects Native targets).
function parameterContractFailure(authority, queryKind, domain, proposal) {
  const native = domain.sourceDomain || domain;
  let parameters = proposal.parameters;
  if (queryKind === 'attack_probability'
    && native.parameterKind === OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND
    && object(parameters)) {
    const { targetUnitId, ...nativeParameters } = parameters;
    parameters = nativeParameters;
  }
  const check = inspectStarcraftTmgActionParametersV1(native, parameters);
  if (check.valid) return null;
  return unknown(authority, queryKind, 'RULES_QUERY_PARAMETER_CONTRACT_INVALID', {
    failureStage: 'validate_current_domain_parameters',
    safeFailureClass: 'parameter_contract_invalid',
    proposalHash: hashStarcraftTmgContract(proposal),
    mayRepairSameChoice: !check.requiresReplan,
    repairContext: {
      ...describeStarcraftTmgActionParameterRepairContextV1(native, proposal,
        'RULES_QUERY_PARAMETER_CONTRACT_INVALID', null),
      fieldIssues: check.fieldIssues,
      parameterContract: check.parameterContract,
      requiresReplan: check.requiresReplan,
      useForSameChoiceRepairOnly: !check.requiresReplan,
    },
  });
}

export function createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1(
  options = {},
) {
  const roomStore = options.roomStore;
  // This still fetches the actual persisted row for EVERY authority check.
  // Only an Adapter's private immutable owner can reuse decoded object data.
  const loadAggregate = roomId => typeof roomStore?.loadOwnedRoom === "function"
    ? roomStore.loadOwnedRoom(roomId) : roomStore.loadRoom(roomId);
  const rulesRuntime = options.rulesRuntime;
  const seatKey = String(options.seatKey || "");
  const formationComparisonBatch = options.formationComparisonBatch
    || compareStarcraftTmgFormationBatchInWorkersV1;
  if (typeof roomStore?.loadRoom !== "function"
    || typeof rulesRuntime?.instantiate !== "function"
    || !seatKey) {
    throw new TypeError("roomStore, Rules instantiate and seatKey are required");
  }
  // One authoritative state can receive many differently scoped tactical
  // queries during a Planner/Action decision. Reuse exact physical evidence;
  // any state-hash change invalidates every cached value.
  let lineOfSightStateHash = null;
  const newLineOfSightCache = () => ({
    rows: new Map(),
    specialTerrainResults: new Map(),
    engagementGraph: null,
    engagementEdgeKeys: null,
    modelRows: null,
    rowsByUnit: null,
    pairSearches: new Map(),
    unitNodes: new Map(),
    objectiveRelations: new Map(),
    clearances: new Map(),
  });
  let lineOfSightCache = newLineOfSightCache();

  // Full current state bytes, not a public hash/frozen flag, decide reuse. The
  // native factory owns a separate immutable snapshot; mutable Store decorators
  // and room changes therefore cannot leave a stale probability context alive.
  let probabilitySourceText = null;
  let probabilityBatch = null;
  function preparedProbability(state) {
    const sourceText = JSON.stringify(state);
    if (!probabilityBatch || probabilitySourceText !== sourceText) {
      probabilityBatch = createStarcraftTmgAttackProbabilityBatchV1({ state,
        sideKey: seatKey, observePreparation: options.observeChanceContext });
      probabilitySourceText = sourceText;
    }
    return probabilityBatch;
  }

  function inspectMarkerControl(request, aggregate) {
    const args = object(request.arguments) ? request.arguments : {};
    const queryKind = request.queryKind;
    const authority = request.authority;
    if (queryKind === "mission_marker_control") {
      try {
        const argumentIssue = inspectStarcraftTmgMarkerControlArgumentsV1(args);
        if (argumentIssue) return unknown(authority, queryKind,
          'MARKER_CONTROL_QUERY_ARGUMENTS_INVALID', {
            mayRepairSameChoice: true, repairContext: argumentIssue,
          });
        let state = aggregate.envelope.state;
        const domainId = args.domainId || args.proposal?.domainId;
        let candidateProjection = null;
        if (domainId) {
          const domain = args.currentLegalSpaceDomain;
          if (!domain || domain.domainId !== domainId || domain.sideKey !== seatKey) {
            return unknown(authority, queryKind, "RULES_QUERY_CURRENT_DOMAIN_MISSING");
          }
          const parameters = args.parameters || args.proposal?.parameters;
          const parameterCheck = inspectStarcraftTmgActionParametersV1(domain, parameters);
          if (!parameterCheck.valid) return unknown(authority, queryKind,
            "RULES_QUERY_PARAMETER_CONTRACT_INVALID", { repairContext: parameterCheck });
          const instantiated = rulesRuntime.instantiate(state, domain, parameters,
            { matchBinding: aggregate.envelope.matchBinding });
          const action = instantiated.action?.sourceAction || instantiated.action;
          if (!action.spatialPlan || action.chance) return unknown(authority, queryKind,
            "MARKER_CONTROL_CANDIDATE_SUCCESSOR_NOT_SUPPORTED", {
              repairContext: { guidance: "Query current control with {}. Spatial candidates require their complete native plan; unresolved attack/charge outcomes are not a deterministic successor." },
            });
          state = applyOfficialSelectedRosterSpatialActionV1(state, action,
            { matchBinding: aggregate.envelope.matchBinding }).state;
          candidateProjection = { domainId, actionHash: hashStarcraftTmgContract(instantiated.action),
            scope: "native_spatial_successor_not_applied" };
        }
        const markers = state.board.missionMarkers || [];
        for (const [key, ids, available] of [["markerIds", args.markerIds, markers.map(x => x.id)],
          ["unitIds", args.unitIds, state.pieces.map(x => x.id)]]) {
          if (ids !== undefined && (!Array.isArray(ids) || !ids.length
            || ids.some(id => typeof id !== "string" || !available.includes(id)))) {
            return unknown(authority, queryKind, "MARKER_CONTROL_QUERY_REFERENCE_INVALID", {
              repairContext: { field: key, guidance: "Use current visible exact IDs; no unit or marker is guessed." },
            });
          }
        }
        const inspection = inspectOfficialMissionMarkerControlV2({ state,
          matchBinding: aggregate.envelope.matchBinding });
        const result = { ...inspection, candidateProjection,
          focusedUnitIds: clone(args.unitIds || []),
          allCompetingUnitsIncluded: true,
          markerResults: inspection.markerResults.filter(row =>
            !args.markerIds || args.markerIds.includes(row.markerId)) };
        return freeze({ ok: true, authority: clone(authority), precision: "exact", queryKind,
          result, source: STARCRAFT_TMG_ROOM_BACKED_SPATIAL_RULES_QUERY_ADAPTER_VERSION,
          rulesAuthority: true, mutationAuthority: false, confirmationAuthority: false,
          applyAuthority: false, trainingTruth: false });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), {
          failureStage: "inspect_native_marker_control", safeFailureClass: safeFailureClass(error),
        });
      }
    }
  }

  function fireExchangeInput(request, aggregate) {
    const args = object(request.arguments) ? request.arguments : {};
    return { state: aggregate.envelope.state, seatKey,
      authority: request.authority, request: args,
      currentLegalSpaceDomains: Array.isArray(args.currentLegalSpaceDomains)
        ? args.currentLegalSpaceDomains.filter(entry =>
          object(entry) && entry.sideKey === seatKey) : [],
      formationQueryReceipt: object(args.currentFormationQueryReceipt)
        ? args.currentFormationQueryReceipt : null };
  }

  // Only this closure can supply an already-loaded snapshot. The public query
  // never accepts caller-supplied prepared state or a trusted aggregate.
  async function queryFromOwnedSnapshot(request = {}, ownedAggregate = null,
    ownedFireResult = null) {
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
      aggregate = ownedAggregate || await loadAggregate(authority.roomId);
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
    if (queryKind === 'space.solve_static_formation') {
      try {
        const result = queryStarcraftTmgStaticFormationV1({ state: aggregate.envelope.state, arguments: args });
        return freeze({ ok: true, authority: clone(authority), queryKind, precision: 'advisory_estimate',
          result, rulesAuthority: false, mutationAuthority: false, confirmationAuthority: false,
          applyAuthority: false, trainingTruth: false });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), { mayRepairSameChoice: true,
          repairContext: { expectedArguments: clone(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1['space.solve_static_formation'].arguments), suggestionExecuted: false,
            validationMessage:error.code==='STATIC_FORMATION_ARGUMENTS_INVALID'?String(error.message):null,
            guidance: 'Supply explicit hypothetical anchors/objectives. For simultaneous overlapping units use jointUnits and select one whole group option. No action domain is needed. A bounded miss is not impossibility.' } });
      }
    }
    if(queryKind==='contextual_supply_projection'){
      try{return freeze({ok:true,authority:clone(authority),queryKind,precision:'exact',
        result:inspectOfficialContextualSupplyV1({state:aggregate.envelope.state,arguments:args}),
        rulesAuthority:true,mutationAuthority:false,confirmationAuthority:false,applyAuthority:false,trainingTruth:false});}
      catch(error){return unknown(authority,queryKind,safeCode(error),{mayRepairSameChoice:true,
        repairContext:{expectedArguments:clone(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[queryKind].arguments),
          suggestionExecuted:false}});}
    }
    if (queryKind === "map.inspect" || queryKind === "map.route_access") {
      try {
        const port = createPregameMapEvidencePortV1({ sourceState: aggregate.envelope.state });
        const result = queryKind === "map.inspect"
          ? port.summarizeMap({ queryId: "scene-map-inspect" })
          : port.routeToObjective({ ...args, queryId: "scene-map-route-access" });
        const expected = queryKind === "map.inspect" ? "certified_map_summary" : "certified_reachability_audit";
        if (result.resultStatus !== expected) return unknown(authority, queryKind,
          result.unknownReason || "MAP_QUERY_EVIDENCE_UNAVAILABLE", {
            failureStage: result.failureStage || "inspect_native_map",
            safeFailureClass: result.safeFailureClass || null,
            mayRepairSameChoice: result.mayRepairSameChoice === true,
            repairContext: clone(result.repairContext || null),
          });
        return freeze({ ok: true, authority: clone(authority), queryKind,
          precision: queryKind === "map.inspect" ? "exact" : "advisory_estimate",
          result, rulesAuthority: true, mutationAuthority: false,
          confirmationAuthority: false, applyAuthority: false, trainingTruth: false });
      } catch (error) {
        return unknown(authority, queryKind, safeCode(error), { failureStage: "inspect_native_map" });
      }
    }
    if (queryKind === "mission_marker_control") return inspectMarkerControl(request, aggregate);
    if (queryKind === STARCRAFT_TMG_RELATIONSHIP_QUERY_KIND) {
      try {
        if (lineOfSightStateHash !== authority.stateHash) {
          // A yielding old query can only populate its captured old cache;
          // never clear/reuse that object for a different authoritative state.
          lineOfSightCache = newLineOfSightCache();
          lineOfSightStateHash = authority.stateHash;
        }
        const queryCache = lineOfSightCache;
        let completedCache = null;
        const result = await buildStarcraftTmgTacticalRelationshipGraphAsyncV1({
          state: aggregate.envelope.state,
          seatKey,
          authority,
          request: args,
          lineOfSightCache: queryCache,
          observeLineOfSightDiagnostic: options.observeQueryBatchDiagnostic,
          observeOwnedCalculationCache: cache => { completedCache = cache; },
        });
        if (!ownedAggregate) {
          // Direct relationship queries now yield as well. Re-read authority
          // before publishing old geometry; outer batches retain their own
          // complete post-computation authority check.
          const latest = await loadAggregate(authority.roomId);
          if (!latest || latest.envelope?.matchBindingHash !== authority.matchBindingHash
            || latest.stateRevision !== authority.stateRevision
            || latest.envelope?.stateHash !== authority.stateHash) {
            return unknown(authority, queryKind,
              "RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION", { findingSeverity: "High" });
          }
        }
        if (completedCache && queryCache === lineOfSightCache) {
          Object.assign(queryCache, completedCache);
        }
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
        if (ownedFireResult?.error) throw ownedFireResult.error;
        const result = ownedFireResult ? ownedFireResult.result
          : estimateStarcraftTmgFireZoneExchangeV1(fireExchangeInput(request, aggregate));
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
      const invalid = parameterContractFailure(authority, queryKind, domain, {
        kind: 'parameterized', domainId, parameters: args.parameters,
      });
      if (invalid) return invalid;
      try {
        const probabilityInput = {
          domain,
          parameters: args.parameters,
          sampleBudget: args.sampleBudget,
          damageReactionChoices: args.damageReactionChoices,
          observeChanceContext: options.observeChanceContext,
        };
        const result = (domain.sourceDomain || domain).parameterKind
          === OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND
          ? estimateStarcraftTmgAttackProbabilityV1({
            ...probabilityInput, state: aggregate.envelope.state })
          : preparedProbability(aggregate.envelope.state).estimate(probabilityInput);
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
          failureStage: "estimate_current_attack",
          safeFailureClass: safeFailureClass(error),
          mayRepairSameChoice: false,
        });
      }
    }
    if (new Set(["space.solve_formation", "legal_formation_options"])
      .has(queryKind)) {
      try {
        const observeFormation = event => {
          try { options.observeQueryBatchDiagnostic?.(freeze({
            schemaVersion: "starcraft_tmg_formation_query_diagnostic_v1",
            operation: "formation_query", roomId: authority.roomId, seatKey,
            stateRevision: authority.stateRevision, ...event,
            observedAtMs: event.observedAtMs ?? Date.now(), receivedAtMs: Date.now(),
            rulesAuthority: false, trainingTruth: false,
          })); } catch { /* diagnostics never reject geometry */ }
        };
        // One privately owned immutable snapshot lets exact Rules preparation
        // be shared across candidates. Never freeze/mutate the Room's graph.
        const formationState = freeze(clone(aggregate.envelope.state));
        const result = await searchStarcraftTmgLegalFormationOptionsAsyncV1({
          state: formationState,
          domain,
          request: args,
          observeProgress: observeFormation,
          instantiate: (...instantiateArgs) =>
            rulesRuntime.instantiate(...instantiateArgs),
          instantiateOptions: {
            matchBinding: aggregate.envelope.matchBinding,
          },
        }, { compareBatch: async jobs => {
          const startedAtMs = Date.now();
          observeFormation({ stage: "formation_comparison_batch_started",
            startedAtMs, jobCount: jobs.length });
          const comparisons = await formationComparisonBatch(jobs, {
            observeProgress: observeFormation,
            profileCpu: options.profileFormationCpu === true,
          });
          observeFormation({ stage: "formation_comparison_batch_completed",
            startedAtMs, completedAtMs: Date.now(), jobCount: jobs.length });
          return comparisons;
        } });
        // Another seat/human may Apply while the read-only workers run.
        // Exact geometry for the old snapshot cannot authorize the new Room.
        const latest = await loadAggregate(authority.roomId);
        if (!latest
          || latest.envelope?.matchBindingHash !== authority.matchBindingHash
          || latest.stateRevision !== authority.stateRevision
          || latest.envelope?.stateHash !== authority.stateHash) {
          return unknown(authority, queryKind,
            "RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION", {
              findingSeverity: "High",
            });
        }
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
    const invalid = parameterContractFailure(authority, queryKind, domain, proposal);
    if (invalid) return invalid;
    try {
      const instantiated = rulesRuntime.instantiate(
        aggregate.envelope.state,
        domain,
        proposal.parameters,
        { matchBinding: aggregate.envelope.matchBinding },
      );
      const sourceAction = instantiated.action?.sourceAction || instantiated.action;
      const placementEvidence=nativePlacementEvidence(instantiated.action);
      if ((queryKind==='legal_full_path_movement'&&!placementEvidence.completeNativePathChecked)
        ||(queryKind==='coherency_after_candidate_placement'&&!placementEvidence.completeFormationPlacementChecked)) {
        return unknown(authority, queryKind, "SPATIAL_QUERY_ACTION_KIND_UNSUPPORTED", {
          repairContext: { guidance: "This query requires a complete native spatial path/placement, not an attack or bookkeeping action." },
        });
      }
      const nativePlanKind = sourceAction?.chargePlan ? "chargePlan"
        : sourceAction?.rangedPlan ? "rangedPlan" : sourceAction?.meleePlan ? "meleePlan" : null;
      if (queryKind === "action_specific_threat" && !nativePlanKind) {
        return unknown(authority, queryKind, "THREAT_QUERY_ACTION_KIND_UNSUPPORTED", {
          repairContext: { guidance: "Use a selected ranged, melee or charge action. Phase completion and bookkeeping actions do not have attack threats." },
        });
      }
      const result = {
        proposalAccepted: true,
        domainId: domain.domainId,
        canonicalParameters: clone(instantiated.canonicalParameters),
        action: actionPlan(instantiated.action),
        actionHash: hashStarcraftTmgContract(instantiated.action),
        completeFormationPlacementChecked:placementEvidence.completeFormationPlacementChecked,
        automaticFormationPlacementUsed: false,
        ...(queryKind === "legal_full_path_movement" ? { pathQualification: {
          completeNativePathChecked: true, scope: "supplied_candidate_only",
          spatialPlanHash:placementEvidence.spatialPlanHash,
          nativePlanKind:placementEvidence.nativePlanKind,nativePlanHash:placementEvidence.nativePlanHash,
        } } : {}),
        ...(queryKind === "coherency_after_candidate_placement" ? { coherencyQualification: {
          completeNativePlacementChecked: true, scope: "supplied_candidate_only",
          inCoherency:true,spatialPlanHash:placementEvidence.spatialPlanHash,
          nativePlanKind:placementEvidence.nativePlanKind,nativePlanHash:placementEvidence.nativePlanHash,
        } } : {}),
        ...(queryKind === "action_specific_threat" ? { actionThreatScope: {
          nativePlanKind, scope: "supplied_candidate_only",
          guaranteedDamage: false, chargeSuccessGuaranteed: false,
        } } : {}),
        ...(sourceAction?.actionType === "charge" && sourceAction.chargePlan ? {
          chargePathEvidence: inspectOfficialSelectedRosterChargePathEvidenceV1(
            aggregate.envelope.state, sourceAction.chargePlan),
        } : {}),
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
        repairContext: describeStarcraftTmgActionParameterRepairContextV1(domain, proposal, failureCode,
          safeFailureDetail(error)),
      });
    }
  }

  async function query(request = {}) {
    if (request?.queryKind === "fire_zone_exchange") {
      const [result] = await queryBatch([request]);
      return result;
    }
    return queryFromOwnedSnapshot(request);
  }

  async function queryBatch(requests = []) {
    if (!Array.isArray(requests)) throw new TypeError("RULES_QUERY_BATCH_REQUESTS_REQUIRED");
    const results = new Array(requests.length);
    const groups = new Map();
    for (const [index, request] of requests.entries()) {
      // Non-pure queries keep their ordinary source/instantiation path. No
      // formation, branch, final action or mutation is admitted to the pool.
      if (!INDEPENDENT_READONLY_QUERY_KINDS.has(request?.queryKind)
        || !object(request.authority) || request.authority.seatKey !== seatKey
        || !HASH.test(String(request.authority.stateHash || ""))
        || !HASH.test(String(request.authority.legalSpaceHash || ""))) {
        results[index] = await queryFromOwnedSnapshot(request);
        continue;
      }
      const key = hashStarcraftTmgContract(request.authority);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ index, request: clone(request) });
    }
    for (const entries of groups.values()) {
      const authority = entries[0].request.authority;
      let snapshot;
      try {
        const aggregate = await loadAggregate(authority.roomId);
        if (!aggregate || aggregate.envelope?.matchBindingHash !== authority.matchBindingHash
          || aggregate.stateRevision !== authority.stateRevision
          || aggregate.envelope?.stateHash !== authority.stateHash) {
          for (const entry of entries) results[entry.index] = unknown(authority,
            entry.request.queryKind, "RULES_QUERY_AUTHORITY_STALE", { findingSeverity: "High" });
          continue;
        }
        snapshot = freeze(clone({ stateRevision: aggregate.stateRevision,
          envelope: { state: aggregate.envelope.state,
            stateHash: aggregate.envelope.stateHash,
            matchBindingHash: aggregate.envelope.matchBindingHash } }));
      } catch (error) {
        for (const entry of entries) results[entry.index] = unknown(authority,
          entry.request.queryKind, safeCode(error), { failureStage: "read_authoritative_room" });
        continue;
      }
      const evaluateFirePart = createStarcraftTmgFireExchangeWorkEvaluatorV1({
        state: snapshot.envelope.state,
      });
      const planFireExchange = createStarcraftTmgFireExchangeWorkPlannerV1({
        state: snapshot.envelope.state,
      });
      const responses = await evaluateStarcraftTmgReadonlyQueriesInWorkersV1({
        requests: entries.map(entry => entry.request), aggregate: snapshot, seatKey,
        evaluateLocally: request => queryFromOwnedSnapshot(request, snapshot),
        planFireExchange: (request, { onIndependentWork } = {}) =>
          planFireExchange({ ...fireExchangeInput(request, snapshot),
            onIndependentWork,
            observePreparation: event => options.observeQueryBatchDiagnostic?.(freeze({
              schemaVersion: "starcraft_tmg_readonly_query_batch_diagnostic_v1",
              operation: "fire_exchange_preparation", roomId: authority.roomId,
              seatKey, stateRevision: authority.stateRevision, ...event,
              rulesAuthority: false, trainingTruth: false,
            })),
          }),
        evaluateFirePart,
        completeFireExchange: (request, completion) => {
          let ownedFireResult;
          try {
            if (completion.error) throw completion.error;
            ownedFireResult = { result: finishStarcraftTmgFireExchangeWorkV1(
              fireExchangeInput(request, snapshot), completion.parts) };
          } catch (error) { ownedFireResult = { error }; }
          // This private completion can reuse only work from our owned
          // snapshot/pool; caller arguments never provide a prepared result.
          return queryFromOwnedSnapshot(request, snapshot, ownedFireResult);
        },
        observeProgress: event => options.observeQueryBatchDiagnostic?.(freeze({
          schemaVersion: "starcraft_tmg_readonly_query_batch_diagnostic_v1",
          operation: "spatial_query_worker_batch", roomId: authority.roomId,
          seatKey, stateRevision: authority.stateRevision, ...event,
          rulesAuthority: false, trainingTruth: false,
        })),
      });
      // CPU workers yield to live Human/Agent Apply. Revalidate after ALL
      // results and transport recoveries, never stamp old geometry as current.
      let authorityChanged = false;
      try {
        const latest = await loadAggregate(authority.roomId);
        authorityChanged = !latest
          || latest.envelope?.matchBindingHash !== authority.matchBindingHash
          || latest.stateRevision !== authority.stateRevision
          || latest.envelope?.stateHash !== authority.stateHash;
      } catch { authorityChanged = true; }
      for (const [index, entry] of entries.entries()) {
        results[entry.index] = authorityChanged
          ? unknown(authority, entry.request.queryKind,
            "RULES_QUERY_AUTHORITY_CHANGED_DURING_COMPUTATION", { findingSeverity: "High" })
          : freeze(responses[index]);
      }
    }
    return results;
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
      aggregate = await loadAggregate(authority.roomId);
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
            completeFormationPlacementChecked:nativePlacementEvidence(instantiated.action).completeFormationPlacementChecked,
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
      independentReadonlyQueryKinds: [...INDEPENDENT_READONLY_QUERY_KINDS],
      batchSnapshotPolicy: "owned_immutable_snapshot_then_final_authority_revalidation",
      roomMutationAuthority: false,
      confirmationAuthority: false,
      applyAuthority: false,
      credentialsExposedToModel: false,
      trainingTruth: false,
    }),
    query,
    queryBatch,
    queryFirstExact,
  });
}
