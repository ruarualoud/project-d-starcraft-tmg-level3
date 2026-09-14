import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { projectStarcraftTmgViewerStateShapeV3 } from
  "../client-domain/viewer-projection-v3.mjs";
import {
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialWithinWhollyWithinV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";

export const STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION =
  "starcraft_tmg_spatial_action_query_runtime_v1";

const DIRECT_QUERY_KINDS = new Set([
  "base_edge_distance",
  "within_and_wholly_within",
]);
const DELEGATED_QUERY_KINDS = new Set([
  "instantiate_parameterized_action",
  "legal_full_path_movement",
  "coherency_after_candidate_placement",
  "intervening_model_or_terrain_blocking",
  "line_of_sight_cover_and_elevation",
  "action_specific_threat",
  "attack_probability",
  "fire_zone_exchange",
  "objective_score_after_candidate_action",
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function authority(input) {
  const projection = input.roomProjection;
  const legalSpace = input.legalSpace;
  if (!object(projection?.room) || !object(projection?.matchBinding)
    || !object(projection?.viewer) || !object(legalSpace)
    || legalSpace.roomId !== projection.room.roomId
    || legalSpace.matchBindingHash !== projection.matchBinding.bindingHash
    || legalSpace.stateRevision !== projection.room.stateRevision
    || legalSpace.stateHash !== projection.room.stateHash
    || typeof legalSpace.legalSpaceHash !== "string") {
    throw new TypeError("spatial query requires one current viewer/LegalSpace authority");
  }
  if (input.spatialObservation
    && (input.spatialObservation.roomId !== projection.room.roomId
      || input.spatialObservation.matchBindingHash
        !== projection.matchBinding.bindingHash
      || input.spatialObservation.stateRevision !== projection.room.stateRevision
      || input.spatialObservation.stateHash !== projection.room.stateHash)) {
    throw new TypeError("spatial observation is stale for query authority");
  }
  return deepFreeze({
    gameId: "starcraft-tmg",
    roomId: projection.room.roomId,
    matchBindingHash: projection.matchBinding.bindingHash,
    stateRevision: projection.room.stateRevision,
    stateHash: projection.room.stateHash,
    legalSpaceHash: legalSpace.legalSpaceHash,
    seatKey: projection.viewer.seatKey,
    visibilityScope: projection.viewer.visibilityScope,
    spatialObservationHash: input.spatialObservation?.observationHash || null,
  });
}

function exactResult(binding, queryKind, result, source) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.result`,
    ok: true,
    status: "exact",
    queryKind,
    authority: clone(binding),
    result: clone(result),
    source,
    maySelectAction: false,
    mayPreview: false,
    mayConfirm: false,
    mayApply: false,
    eligibleForTraining: false,
    trainingTruth: false,
  }, "queryReceiptHash");
}

function unknownResult(binding, queryKind, reason, details = {}) {
  return seal({
    schemaVersion: `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.result`,
    ok: true,
    status: "unknown",
    queryKind,
    authority: clone(binding),
    result: null,
    reason,
    ...clone(details),
    unsupportedWasApproximated: false,
    maySelectAction: false,
    mayPreview: false,
    mayConfirm: false,
    mayApply: false,
    eligibleForTraining: false,
    trainingTruth: false,
  }, "queryReceiptHash");
}

function delegatedResult(binding, queryKind, response) {
  const responseBinding = response?.authority || response?.binding || {};
  if (response?.ok !== true
    || responseBinding.roomId !== binding.roomId
    || responseBinding.matchBindingHash !== binding.matchBindingHash
    || responseBinding.stateRevision !== binding.stateRevision
    || responseBinding.stateHash !== binding.stateHash
    || responseBinding.legalSpaceHash !== binding.legalSpaceHash) {
    return unknownResult(binding, queryKind, "rules_query_binding_mismatch", {
      findingSeverity: "High",
      adapterResponseRetained: false,
    });
  }
  const precision = String(response.precision || response.status || "unknown");
  if (precision === "unknown") {
    return unknownResult(binding, queryKind,
      String(response.reason || "rules_query_returned_unknown"), {
        findingSeverity: response.findingSeverity || "Medium",
      });
  }
  if (!new Set(["exact", "advisory_estimate"]).has(precision)) {
    return unknownResult(binding, queryKind, "rules_query_precision_invalid", {
      findingSeverity: "High",
    });
  }
  if (precision === "exact" && response.rulesAuthority !== true) {
    return unknownResult(binding, queryKind, "exact_result_lacks_rules_authority", {
      findingSeverity: "High",
    });
  }
  return seal({
    schemaVersion: `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.result`,
    ok: true,
    status: precision,
    queryKind,
    authority: clone(binding),
    result: clone(response.result),
    source: response.source || (precision === "exact"
      ? "external_rules_service" : "bounded_math_or_search_adapter"),
    rulesAuthority: precision === "exact",
    estimateMayOverrideRules: false,
    mustPreviewCandidateBeforeUse: true,
    maySelectAction: false,
    mayPreview: false,
    mayConfirm: false,
    mayApply: false,
    eligibleForTraining: false,
    trainingTruth: false,
  }, "queryReceiptHash");
}

function finiteActions(legalSpace) {
  return (legalSpace.finiteActions || []).map((entry) => ({
    candidateId: entry.actionKey,
    proposal: { kind: "finite", actionKey: entry.actionKey },
    action: clone(entry.action),
    confirmationClass: entry.confirmationClass,
    authoritativeIdentity: true,
  }));
}

function parameterDomains(legalSpace) {
  return (legalSpace.parameterDomains || []).map((domain) => ({
    domainId: domain.domainId,
    parameterKind: domain.parameterKind || null,
    actionType: domain.actionType,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId || null,
    executorId: domain.executorId || null,
    executorVersion: domain.executorVersion || null,
    parameterSchema: clone(domain.parameterSchema),
    constraints: clone(domain.constraints),
    confirmationClass: domain.confirmationClass,
    proposalTemplate: {
      kind: "parameterized",
      domainId: domain.domainId,
      parameters: "must_be_instantiated_by_current_rules_domain",
    },
    authoritativeIdentity: true,
    notMaterializedAsFiniteEnumeration: true,
  }));
}

export function createStarcraftTmgSpatialActionQueryRuntimeV1(options = {}) {
  const rulesQuery = typeof options.rulesQuery === "function"
    ? options.rulesQuery : null;
  const inFlight = new Map();
  const completed = new Map();

  function actionSpace(input = {}) {
    const binding = authority(input);
    const legalSpace = input.legalSpace;
    const finite = finiteActions(legalSpace);
    const domains = parameterDomains(legalSpace);
    const suggestions = (legalSpace.searchSuggestions || []).map((entry) => ({
      suggestionId: entry.suggestionId,
      proposal: clone(entry.proposal),
      score: entry.score ?? null,
      details: clone(entry.details || {}),
      authoritativeIdentity: false,
      requiresCurrentDomainInstantiation: true,
      requiresPreview: true,
    }));
    return seal({
      schemaVersion:
        `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.action-space`,
      authority: binding,
      finiteActions: finite,
      parameterDomains: domains,
      searchSuggestions: suggestions,
      counts: {
        finite: finite.length,
        parameterDomains: domains.length,
        advisorySuggestions: suggestions.length,
      },
      parameterDomainsPreservedWithoutArbitraryMaterializationLimit: true,
      finiteAndParameterizedActionsMayBeAddedByRules: true,
      currentRulesInstantiationRequired: true,
      currentPreviewRequired: true,
      searchAndStrategyExcludedFromAuthority:
        legalSpace.searchAndStrategyExcludedFromAuthority === true,
      mayConfirm: false,
      mayApply: false,
      trainingTruth: false,
    }, "actionSpaceHash");
  }

  async function query(input = {}) {
    const binding = authority(input);
    const request = object(input.request) ? input.request : {};
    const queryKind = String(request.queryKind || request.kind || "unknown");
    const args = object(request.arguments) ? request.arguments : {};
    const state = projectStarcraftTmgViewerStateShapeV3(
      input.roomProjection.state || {});
    const cacheKey = hashStarcraftTmgContract({ binding, queryKind, args });
    if (completed.has(cacheKey)) return completed.get(cacheKey);

    if (DIRECT_QUERY_KINDS.has(queryKind)) {
      try {
        const dataBundle = state.officialModelBaseGeometryDataBundle;
        const result = queryKind === "base_edge_distance"
          ? evaluateOfficialBaseMeasurementV1({
            state,
            dataBundle,
            source: args.source,
            target: args.target,
          })
          : evaluateOfficialWithinWhollyWithinV1({
            state,
            dataBundle,
            source: args.source,
            targetUnitId: args.targetUnitId,
            rangeMilliInches: args.rangeMilliInches,
          });
        const receipt = exactResult(binding, queryKind, result,
          "official_model_base_geometry_rules_kernel_v1");
        completed.set(cacheKey, receipt);
        return receipt;
      } catch (error) {
        const receipt = unknownResult(binding, queryKind,
          String(error?.message || error).split(":")[0], {
            findingSeverity: "Medium",
            exactGeometryUnavailable: true,
          });
        completed.set(cacheKey, receipt);
        return receipt;
      }
    }

    if (!DELEGATED_QUERY_KINDS.has(queryKind)) {
      return unknownResult(binding, queryKind, "unsupported_query_kind", {
        findingSeverity: "Medium",
      });
    }
    if (!rulesQuery) {
      return unknownResult(binding, queryKind,
        "rules_query_adapter_unavailable", {
          findingSeverity: "Medium",
        });
    }
    if (!inFlight.has(cacheKey)) {
      inFlight.set(cacheKey, (async () => {
        try {
          const response = await rulesQuery(deepFreeze({
            schemaVersion:
              `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.request`,
            authority: clone(binding),
            queryKind,
            arguments: clone(args),
            roomMutationAuthority: false,
            confirmationAuthority: false,
            trainingTruth: false,
          }));
          const receipt = delegatedResult(binding, queryKind, response);
          completed.set(cacheKey, receipt);
          return receipt;
        } catch (error) {
          const receipt = unknownResult(binding, queryKind,
            "rules_query_adapter_failed", {
              findingSeverity: "Medium",
              message: String(error?.message || error),
            });
          completed.set(cacheKey, receipt);
          return receipt;
        } finally {
          inFlight.delete(cacheKey);
        }
      })());
    }
    return inFlight.get(cacheKey);
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.metadata`,
      interface: ["actionSpace", "query"],
      directExactQueries: [...DIRECT_QUERY_KINDS],
      delegatedQueries: [...DELEGATED_QUERY_KINDS],
      unsupportedPolicy: "return_unknown_never_approximate_as_exact",
      parameterizedActionPolicy:
        "preserve_domain_then_rules_instantiate_then_preview",
      mutationAuthority: false,
      trainingTruth: false,
    }),
    actionSpace,
    query,
  });
}
