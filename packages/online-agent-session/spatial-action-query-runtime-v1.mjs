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
  "space.inspect_relationships",
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
  "objective_score_after_candidate_action",
]);
const RANGED_CASUALTY_SELECTION_PARAMETER_KIND =
  "official_selected_roster_ranged_casualty_selection_v1";

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

const PHYSICAL_OBJECT_KINDS = ["mission_marker", "token", "marker"];
const REFERENCE_SCHEMA = deepFreeze({ anyOf: [{ type: "object", properties: {
  kind: { enum: ["model"] }, unitId: { type: "string", minLength: 1 },
  modelId: { type: "string", minLength: 1 },
}, required: ["unitId", "modelId"] }, { type: "object", properties: {
  kind: { enum: PHYSICAL_OBJECT_KINDS }, id: { type: "string", minLength: 1 },
}, required: ["kind", "id"] }] });
const DIRECT_ARGUMENT_CONTRACTS = deepFreeze({
  base_edge_distance: { type: "object", properties: {
    source: REFERENCE_SCHEMA, target: REFERENCE_SCHEMA,
  }, required: ["source", "target"] },
  within_and_wholly_within: { type: "object", properties: {
    source: REFERENCE_SCHEMA, targetUnitId: { type: "string", minLength: 1 },
    rangeMilliInches: { type: "integer", minimum: 0 },
  }, required: ["source", "targetUnitId", "rangeMilliInches"] },
});

// The model-facing descriptor and recovery receipt share the direct-query
// contract. Unit matrices belong to the existing relationship tool, not a
// silent reinterpretation of a missing physical source/target reference.
export function createStarcraftTmgNativeSpatialQueryToolV1({ name, queryKinds }) {
  return {
    type: "function",
    function: {
      name,
      description: "Ask the Host for one read-only Rules, geometry, probability, fire-zone, path, coherency, line-of-sight, threat or score query. Encode query-specific arguments as one JSON object string. Intent-driven formation solving, asset placement and final instantiation are deferred to the Host after candidate selection.",
      parameters: { type: "object", properties: {
        requestId: { type: "string" },
        queryKind: { type: "string", enum: [...queryKinds] },
        argumentsJson: { type: "string", description:
          "Direct geometry query contracts: " + JSON.stringify(DIRECT_ARGUMENT_CONTRACTS)
          + ". Use IDs from the current visible spatial observation. base_edge_distance measures one physical source/target pair, not an entire unit matrix. For multiple units or unit-to-objective distances use space.inspect_relationships with {subjectUnitIds:[unitId],targetIds:[unitOrObjectiveId],intent:string}. Measurement does not prove attack or charge legality." },
      }, required: ["requestId", "queryKind", "argumentsJson"],
      additionalProperties: false },
    },
  };
}

function validReference(value) {
  if (!object(value)) return false;
  const kind = value.kind || "model";
  const id = key => typeof value[key] === "string" && value[key].trim().length > 0;
  return kind === "model" ? id("unitId") && id("modelId")
    : PHYSICAL_OBJECT_KINDS.includes(kind) && id("id");
}

function directArgumentIssue(queryKind, args) {
  const invalidFields = [];
  if (!validReference(args.source)) invalidFields.push("source");
  if (queryKind === "base_edge_distance") {
    if (!validReference(args.target)) invalidFields.push("target");
  } else {
    if (typeof args.targetUnitId !== "string" || !args.targetUnitId.trim()) {
      invalidFields.push("targetUnitId");
    }
    // Preserve the existing kernel's numeric-string compatibility, but do not
    // interpret a missing/null/empty value as an explicitly requested range0.
    const range = args.rangeMilliInches;
    if (!["number", "string"].includes(typeof range) || String(range).trim() === ""
      || !Number.isSafeInteger(Number(range)) || Number(range) < 0) {
      invalidFields.push("rangeMilliInches");
    }
  }
  if (!invalidFields.length) return null;
  const idList = value => Array.isArray(value) && value.length > 0
    && value.every(id => typeof id === "string" && id.trim().length > 0);
  const suggestedQuery = idList(args.subjectUnitIds) && idList(args.targetIds)
    ? { queryKind: "space.inspect_relationships", arguments: {
      ...(typeof args.intent === "string" ? { intent: args.intent } : {}),
      subjectUnitIds: clone(args.subjectUnitIds), targetIds: clone(args.targetIds),
    } } : null;
  return { invalidFields, expectedArguments: DIRECT_ARGUMENT_CONTRACTS[queryKind],
    suggestedQuery, suggestionExecuted: false,
    guidance: "Use physical model/token/marker references for direct measurement. Use the explicit relationship query for unit matrices; it remains read-only and does not establish action legality." };
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
        failureStage: response.failureStage || null,
        safeFailureClass: response.safeFailureClass || null,
        mayRepairSameChoice: response.mayRepairSameChoice === true,
        repairContext: clone(response.repairContext || null),
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

export function projectStarcraftTmgSpatialParameterDomainsV1(legalSpace) {
  return (legalSpace.parameterDomains || []).map((domain) => ({
    domainId: domain.domainId,
    parameterKind: domain.parameterKind || null,
    actionType: domain.parameterKind
        === RANGED_CASUALTY_SELECTION_PARAMETER_KIND
      ? "resolve_ranged_casualties" : domain.actionType,
    authorityActionType: domain.actionType,
    abilityName: domain.abilityName || null,
    effectKind: domain.effectKind || null,
    effectContract: clone(domain.effectContract || null),
    definitionId: domain.definitionId || null,
    sourceKind: domain.sourceKind
      || (domain.constraints?.sourceCardInstanceId ? "card_feature" : null),
    sourceInstanceId: domain.sourceInstanceId
      || domain.constraints?.sourceCardInstanceId || null,
    createdUnitRecordKey: domain.constraints?.createdUnitRecordKey || null,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId || null,
    profileKey: domain.profileKey || null,
    weaponName: domain.weaponName || null,
    executorId: domain.executorId || null,
    executorVersion: domain.executorVersion || null,
    parameterSchema: clone(domain.parameterSchema),
    unitRepositionProcedure: clone(domain.unitRepositionProcedure || null),
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
  const configuredMaximumScopes = Number(options.maximumCachedScopes || 64);
  const maximumCachedScopes = Number.isSafeInteger(configuredMaximumScopes)
    ? Math.max(1, Math.min(1_024, configuredMaximumScopes)) : 64;
  const configuredMaximumReceipts = Number(
    options.maximumCachedReceiptsPerSnapshot || 128);
  const maximumCachedReceiptsPerSnapshot = Number.isSafeInteger(
    configuredMaximumReceipts)
    ? Math.max(1, Math.min(2_048, configuredMaximumReceipts)) : 128;
  const inFlight = new Map();
  const completed = new Map();
  const snapshotByScope = new Map();
  const cacheKeysByScope = new Map();

  function evictScope(scopeKey) {
    for (const cacheKey of cacheKeysByScope.get(scopeKey) || []) {
      completed.delete(cacheKey);
    }
    cacheKeysByScope.delete(scopeKey);
    snapshotByScope.delete(scopeKey);
  }

  function enforceScopeLimit() {
    while (snapshotByScope.size > maximumCachedScopes) {
      const oldestScopeKey = snapshotByScope.keys().next().value;
      if (!oldestScopeKey) break;
      evictScope(oldestScopeKey);
    }
  }

  function rememberCompleted(snapshot, cacheKey, receipt) {
    if (!snapshotIsCurrent(snapshot)) return;
    const keys = cacheKeysByScope.get(snapshot.scopeKey);
    if (!keys) return;
    keys.delete(cacheKey);
    keys.add(cacheKey);
    completed.set(cacheKey, receipt);
    while ([...keys].filter((key) => completed.has(key)).length
      > maximumCachedReceiptsPerSnapshot) {
      const oldestCompletedKey = [...keys].find((key) =>
        key !== cacheKey && completed.has(key));
      if (!oldestCompletedKey) break;
      completed.delete(oldestCompletedKey);
      keys.delete(oldestCompletedKey);
    }
  }

  function rotateSnapshot(binding) {
    const scopeKey = hashStarcraftTmgContract({
      gameId: binding.gameId,
      roomId: binding.roomId,
      matchBindingHash: binding.matchBindingHash,
      seatKey: binding.seatKey,
      visibilityScope: binding.visibilityScope,
    });
    const nextSnapshotKey = hashStarcraftTmgContract({
      stateRevision: binding.stateRevision,
      stateHash: binding.stateHash,
      legalSpaceHash: binding.legalSpaceHash,
      spatialObservationHash: binding.spatialObservationHash,
    });
    if (snapshotByScope.get(scopeKey) !== nextSnapshotKey) {
      for (const cacheKey of cacheKeysByScope.get(scopeKey) || []) {
        completed.delete(cacheKey);
        inFlight.delete(cacheKey);
      }
      snapshotByScope.delete(scopeKey);
      snapshotByScope.set(scopeKey, nextSnapshotKey);
      cacheKeysByScope.set(scopeKey, new Set());
      enforceScopeLimit();
    }
    return { scopeKey, snapshotKey: nextSnapshotKey };
  }

  function snapshotIsCurrent(snapshot) {
    return snapshotByScope.get(snapshot.scopeKey) === snapshot.snapshotKey;
  }

  function actionSpace(input = {}) {
    const binding = authority(input);
    const legalSpace = input.legalSpace;
    const finite = finiteActions(legalSpace);
    const domains = projectStarcraftTmgSpatialParameterDomainsV1(legalSpace);
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
    const snapshot = rotateSnapshot(binding);
    const legalSpace = input.legalSpace;
    const request = object(input.request) ? input.request : {};
    const queryKind = String(request.queryKind || request.kind || "unknown");
    const args = object(request.arguments) ? request.arguments : {};
    const state = projectStarcraftTmgViewerStateShapeV3(
      input.roomProjection.state || {});
    const cacheKey = hashStarcraftTmgContract({ binding, queryKind, args });
    const cacheable = DIRECT_QUERY_KINDS.has(queryKind)
      || (DELEGATED_QUERY_KINDS.has(queryKind) && Boolean(rulesQuery));
    if (cacheable) {
      cacheKeysByScope.get(snapshot.scopeKey).add(cacheKey);
      if (completed.has(cacheKey)) return completed.get(cacheKey);
    }

    if (DIRECT_QUERY_KINDS.has(queryKind)) {
      const repairContext = directArgumentIssue(queryKind, args);
      if (repairContext) {
        const receipt = unknownResult(binding, queryKind,
          "DIRECT_SPATIAL_QUERY_ARGUMENTS_INVALID", {
            findingSeverity: "Medium", failureStage: "validate_query_arguments",
            geometryEvaluationAttempted: false, repairContext,
          });
        rememberCompleted(snapshot, cacheKey, receipt);
        return receipt;
      }
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
        rememberCompleted(snapshot, cacheKey, receipt);
        return receipt;
      } catch (error) {
        const receipt = unknownResult(binding, queryKind,
          String(error?.message || error).split(":")[0], {
            findingSeverity: "Medium",
            exactGeometryUnavailable: true,
          });
        rememberCompleted(snapshot, cacheKey, receipt);
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
          const delegatedArguments = clone(args);
          const domainId = String(args.domainId || args.proposal?.domainId || "");
          const currentDomain = domainId
            ? (legalSpace.parameterDomains || []).find((entry) => (
                entry.domainId === domainId
              )) : null;
          if (currentDomain) {
            delegatedArguments.currentLegalSpaceDomain = clone(currentDomain);
          }
          if (queryKind === "fire_zone_exchange") {
            delegatedArguments.currentLegalSpaceDomains = clone(
              legalSpace.parameterDomains || [],
            );
            const formationReceiptHash = String(
              args.formationQueryReceiptHash || "",
            );
            if (formationReceiptHash) {
              const formationReceipt = [...completed.values()].find((entry) =>
                entry?.queryReceiptHash === formationReceiptHash
                  && entry?.authority?.stateHash === binding.stateHash
                  && entry?.authority?.legalSpaceHash === binding.legalSpaceHash
                  && entry?.status === "exact"
                  && new Set(["space.solve_formation",
                    "legal_formation_options"]).has(entry?.queryKind));
              if (formationReceipt) {
                delegatedArguments.currentFormationQueryReceipt = clone(
                  formationReceipt,
                );
              }
            }
          }
          const response = await rulesQuery(deepFreeze({
            schemaVersion:
              `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.request`,
            authority: clone(binding),
            queryKind,
            arguments: delegatedArguments,
            roomMutationAuthority: false,
            confirmationAuthority: false,
            trainingTruth: false,
          }));
          const receipt = delegatedResult(binding, queryKind, response);
          rememberCompleted(snapshot, cacheKey, receipt);
          return receipt;
        } catch (error) {
          const receipt = unknownResult(binding, queryKind,
            "rules_query_adapter_failed", {
              findingSeverity: "Medium",
              message: String(error?.message || error),
            });
          rememberCompleted(snapshot, cacheKey, receipt);
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
      unitMovementPolicy:
        "leading_model_physical_path_then_agent_selected_complete_formation_placement",
      queryCachePolicy:
        "deduplicate_within_exact_authority_snapshot_and_evict_on_revision_change",
      maximumCachedScopes,
      maximumCachedReceiptsPerSnapshot,
      staleInFlightResultMayPopulateCurrentSnapshot: false,
      mutationAuthority: false,
      trainingTruth: false,
    }),
    actionSpace,
    query,
  });
}
