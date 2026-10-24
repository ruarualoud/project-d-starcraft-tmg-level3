import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { projectStarcraftTmgViewerStateShapeV3 } from
  "../client-domain/viewer-projection-v3.mjs";
import {projectNativeActionCapabilityReferenceV1} from "./native-action-capability-reference-v1.mjs";
import {
  evaluateOfficialBaseMeasurementV1,
  evaluateOfficialWithinWhollyWithinV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1 } from
  "./readonly-query-kinds-v1.mjs";
import { STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1,
  STARCRAFT_TMG_DELEGATED_SPATIAL_QUERY_KINDS_V1,
  STARCRAFT_TMG_RETIRED_SPATIAL_QUERY_KINDS_V1,
  STARCRAFT_TMG_CURRENT_ACTION_REFERENCE_CONTRACT_V1,
  inspectStarcraftTmgCurrentActionReferenceV1,
  starcraftTmgSpatialQueryRequiresDomainV1,
  inspectStarcraftTmgSpatialQueryResultV1 } from "./spatial-query-contracts-v1.mjs";

export const STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION =
  "starcraft_tmg_spatial_action_query_runtime_v1";

const DIRECT_QUERY_KINDS = new Set([
  "base_edge_distance",
  "within_and_wholly_within",
]);
const INDEPENDENT_READONLY_QUERY_KINDS = new Set(
  STARCRAFT_TMG_INDEPENDENT_READONLY_QUERY_KINDS_V1,
);
const DELEGATED_QUERY_KINDS = new Set(STARCRAFT_TMG_DELEGATED_SPATIAL_QUERY_KINDS_V1);
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

export const STARCRAFT_TMG_PHYSICAL_OBJECT_KINDS_V1 = Object.freeze([
  "mission_marker", "token", "marker",
]);
const PHYSICAL_OBJECT_KINDS = STARCRAFT_TMG_PHYSICAL_OBJECT_KINDS_V1;
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
      description: "Ask the Host for a read-only query. Each kind has a precise scope; geometry alone does not prove control or attack legality, estimates are not execution outcomes. Intent-driven formation solving, asset placement and final instantiation are deferred until selection.",
      parameters: { type: "object", properties: {
        requestId: { type: "string" },
        queryKind: { type: "string", enum: [...queryKinds] },
        argumentsJson: { type: "string", description:
          "Query meanings: " + JSON.stringify(Object.fromEntries(queryKinds.map(kind =>
            [kind, STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1[kind]])))
          + ". mission_marker_control accepts {} or {markerIds:[id],unitIds:[id]} for current qualification/control; add {domainId,parameters} only for a supplied native spatial candidate. It does not award or predict VP. Direct geometry query contracts: " + JSON.stringify(DIRECT_ARGUMENT_CONTRACTS)
          + ". Current-action queries bind {domainId:currentDomainId,parameters:{...actualDomainParameters}}. attack_probability uses a ranged domain OR an explicit single-target fight domain. Ranged parameters include targetUnitId; melee parameters must include all Native fight choices (closeRanksMode, allocations and required effect targets), plus targetUnitId as the measurement selector matching that one allocation. sampleBudget is optional. Baselines exclude optional reactions; melee does NOT accept damageReactionChoices. For ranged only, an explicit damage-reaction policy has exactly one choice per side: {sideKey,choiceKind:pass|reaction,definitionId,sourceInstanceId,paymentCardInstanceIds}. Pass uses null IDs and []; copy reaction definition/source/payment from reactionOpportunitySet damage_received choices. Native applies payment and damage effects, reporting resource/card costs; other reaction stages remain excluded. Keep scene/domain/parameters/sampleBudget identical when comparing policies and compare outcomeSampleHash. An enemy-response estimate requires explicitly chosen legal enemy scene/domain/parameters, never automatic future play. Use the selected domain's parameterSchema, not an attacker or weapon name; candidateId is an exact-ID compatibility alias. Never supply currentLegalSpaceDomain: the Host binds it. Formation and asset queries also bind domainId; intent/search arguments are query-specific. Use current visible IDs. base_edge_distance measures one physical pair; for unit matrices use space.inspect_relationships with {subjectUnitIds:[unitId],targetIds:[unitOrObjectiveId],intent:string}. Measurement does not prove charge/arrival legality." },
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

// The action menu calls the same exact Rules-domain ID a candidateId. Bind
// that transport alias once here, for every consumer of the shared query
// runtime. Do not guess a domain, choose a target, or reinterpret a weapon.
function currentDomainArguments(args, legalSpace, seatKey) {
  const issue = reason => ({ issue: { reason, repairContext: {
    expectedArguments: STARCRAFT_TMG_CURRENT_ACTION_REFERENCE_CONTRACT_V1.expectedArguments,
    suggestionExecuted: false,
    guidance: "Use one matching current-domain reference and its declared parameters. Conflicting references are not automatically resolved.",
  } } });
  const reference=inspectStarcraftTmgCurrentActionReferenceV1(args);
  if(reference.issue)return {issue:reference.issue};
  const domainId=reference.domainId;
  const domain = (legalSpace.parameterDomains || []).find(entry =>
    entry.domainId === domainId && entry.sideKey === seatKey);
  if (!domain) return issue("CURRENT_ACTION_QUERY_DOMAIN_UNKNOWN");
  const proposalParameters = args.proposal?.parameters;
  if ((args.parameters !== undefined && !object(args.parameters))
    || (proposalParameters !== undefined && !object(proposalParameters))) {
    return issue("CURRENT_ACTION_QUERY_PARAMETERS_OBJECT_REQUIRED");
  }
  if (args.parameters && proposalParameters
    && hashStarcraftTmgContract(args.parameters)
      !== hashStarcraftTmgContract(proposalParameters)) {
    return issue("CURRENT_ACTION_QUERY_PARAMETERS_CONFLICT");
  }
  const parameters = clone(args.parameters || proposalParameters || {});
  const identity = { attackerUnitId: domain.pieceId, pieceId: domain.pieceId,
    sideKey: domain.sideKey, actionType: domain.actionType,
    weaponName: domain.weaponName, profileKey: domain.profileKey };
  for (const [key, expected] of Object.entries(identity)) {
    if (Object.hasOwn(args, key) && args[key] !== expected) {
      return issue("CURRENT_ACTION_QUERY_IDENTITY_CONFLICT");
    }
  }
  const schema = domain.parameterSchema || {};
  const declarations = object(schema.properties) ? schema.properties : schema;
  for (const [key, declaration] of Object.entries(declarations)) {
    if (!object(declaration) || !Object.hasOwn(args, key)) continue;
    if (Object.hasOwn(parameters, key)
      && hashStarcraftTmgContract(parameters[key])
        !== hashStarcraftTmgContract(args[key])) {
      return issue("CURRENT_ACTION_QUERY_PARAMETERS_CONFLICT");
    }
    // Copy only explicitly provided, Rules-declared parameters. In particular
    // no default target, sample-budget reduction, or tactical choice is added.
    parameters[key] = clone(args[key]);
  }
  return { arguments: { ...clone(args), domainId, parameters,
    ...(object(args.proposal) ? { proposal: { ...clone(args.proposal),
      domainId, parameters: clone(parameters) } } : {}) } };
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
    sceneScope: clone(input.sceneScope || { kind: "live_room" }),
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

function delegatedResult(binding, queryKind, response, args) {
  const responseBinding = response?.authority || response?.binding || {};
  if (response?.ok !== true
    || responseBinding.roomId !== binding.roomId
    || responseBinding.matchBindingHash !== binding.matchBindingHash
    || responseBinding.stateRevision !== binding.stateRevision
    || responseBinding.stateHash !== binding.stateHash
    || responseBinding.legalSpaceHash !== binding.legalSpaceHash
    || hashStarcraftTmgContract(responseBinding.sceneScope || { kind: "live_room" })
      !== hashStarcraftTmgContract(binding.sceneScope)
    || responseBinding.seatKey !== binding.seatKey) {
    return unknownResult(binding, queryKind, "rules_query_binding_mismatch", {
      findingSeverity: "High",
      adapterResponseRetained: false,
    });
  }
  const contractIssue = inspectStarcraftTmgSpatialQueryResultV1(queryKind, response);
  if (contractIssue) return unknownResult(binding, queryKind, contractIssue, {
    findingSeverity: "High", adapterResponseRetained: false,
  });
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
  const domain = args?.currentLegalSpaceDomain;
  if (domain && queryKind !== "mission_marker_control"
    && response.result?.domainId !== domain.domainId) {
    return unknownResult(binding, queryKind, "rules_query_domain_mismatch", {
      findingSeverity: "High", adapterResponseRetained: false,
    });
  }
  if (queryKind === "attack_probability" && domain
    && (response.result?.attackerUnitId !== domain.pieceId
      || response.result?.targetUnitId !== args.parameters?.targetUnitId)) {
    return unknownResult(binding, queryKind, "rules_query_attack_identity_mismatch", {
      findingSeverity: "High", adapterResponseRetained: false,
    });
  }
  if (queryKind==='attack_probability'&&args.damageReactionChoices!==undefined
    &&(response.result?.damageReactionPolicy?.status!=='native_explicit_policy_applied'
      ||JSON.stringify(response.result.damageReactionPolicy.choices)!==JSON.stringify(args.damageReactionChoices))) {
    return unknownResult(binding,queryKind,'rules_query_damage_reaction_policy_mismatch',{
      findingSeverity:'High',adapterResponseRetained:false});
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
      ? "resolve_ranged_casualties"
      : domain.parameterKind === "official_selected_roster_melee_casualty_selection_v1"
        ? "resolve_melee_casualties" : domain.actionType,
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
  const rulesQueryBatch = typeof options.rulesQueryBatch === "function"
    ? options.rulesQueryBatch : null;
  const observeQueryDiagnostic = typeof options.observeQueryDiagnostic === "function"
    ? options.observeQueryDiagnostic : null;
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

  function observeDelegatedDiagnostic(binding, queryKind, response, receipt,
    startedAt) {
    if (!observeQueryDiagnostic) return;
    // Diagnostics are a separate backend lane, not receipt/model fields.
    // Whitelist counts/codes; never forward arbitrary Adapter payloads.
    try {
      const trusted = receipt.reason !== "rules_query_binding_mismatch";
      const count = value => Number.isSafeInteger(value) && value >= 0
        ? value : null;
      const failureCounts = trusted && object(response?.failureCounts)
        ? Object.fromEntries(Object.entries(response.failureCounts).filter(
          ([code, value]) => /^[A-Z][A-Z0-9_]{0,120}$/u.test(code)
            && count(value) !== null,
        )) : {};
      const event = deepFreeze({
        schemaVersion: "starcraft_tmg_spatial_query_backend_diagnostic_v1",
        operation: "spatial_query_backend",
        roomId: binding.roomId,
        seatKey: binding.seatKey,
        stateRevision: binding.stateRevision,
        queryKind,
        status: receipt.status,
        queryReceiptHash: receipt.queryReceiptHash,
        elapsedMs: Math.round(performance.now() - startedAt),
        attemptedCandidateCount: trusted
          ? count(response?.attemptedCandidateCount) : null,
        failureCounts,
        recordedAt: new Date().toISOString(),
        rulesAuthority: false,
        trainingTruth: false,
      });
      const observed = observeQueryDiagnostic(event);
      if (observed && typeof observed.then === "function") {
        Promise.resolve(observed).catch(() => undefined);
      }
    } catch { /* A diagnostic sink must never alter the query verdict. */ }
  }

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
    const actionCapabilityReference=projectNativeActionCapabilityReferenceV1(input.roomProjection?.state);
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
      ...(actionCapabilityReference?{actionCapabilityReference}:{}),
      // These are the same Native eligibility failures, not a second rules
      // implementation. Keep diagnostics separate from selectable actions.
      actionAvailability: {
        schema: 'starcraft_tmg_native_action_availability_v1',
        source: 'same_native_legal_enumeration',
        phase: input.roomProjection?.state?.phase ?? null,
        sideKey: binding.seatKey,
        disabledActions: clone((legalSpace.candidates || []).filter(entry => entry.isEnabled === false)),
        disabledActionsAreExecutable: false,
        reasonsCompleteForAllAbsentActions: false,
        instruction: 'A disabled action is unavailable on THIS state for its exact Native disabledReason; it is not a missing system capability. Read actionCapabilityReference for supported routes/phases and the original disabled entry for the reason. Missing diagnostics do not prove impossibility or a capability gap. This is not permission to change geometry, phase, activation, or execute an action; select any needed conditional scene explicitly and inspect its new Native domains.',
      },
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

  async function queryWithDelegate(input = {}, delegate = rulesQuery) {
    const binding = authority(input);
    const snapshot = rotateSnapshot(binding);
    const legalSpace = input.legalSpace;
    const request = object(input.request) ? input.request : {};
    const queryKind = String(request.queryKind || request.kind || "unknown");
    const args = object(request.arguments) ? request.arguments : {};
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
        // Only direct geometry consumes the viewer state. Delegated queries
        // use the authority-bound Rules adapter, and a completed cache hit
        // must not rebuild this whole projection before returning its receipt.
        const state = projectStarcraftTmgViewerStateShapeV3(
          input.roomProjection.state || {});
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
        repairContext: { guidance: STARCRAFT_TMG_RETIRED_SPATIAL_QUERY_KINDS_V1[queryKind]
          || "Use a currently advertised query kind", suggestionExecuted: false },
      });
    }
    if (!rulesQuery) {
      return unknownResult(binding, queryKind,
        "rules_query_adapter_unavailable", {
          findingSeverity: "Medium",
        });
    }
    const normalized = starcraftTmgSpatialQueryRequiresDomainV1(queryKind, args)
      ? currentDomainArguments(args, legalSpace, binding.seatKey)
      : { arguments: args };
    if (normalized.issue) {
      const receipt = unknownResult(binding, queryKind,
        normalized.issue.reason, { findingSeverity: "Medium",
          failureStage: "validate_query_arguments",
          safeFailureClass: "parameter_contract_invalid",
          mayRepairSameChoice: true,
          rulesEvaluationAttempted: false,
          repairContext: normalized.issue.repairContext });
      rememberCompleted(snapshot, cacheKey, receipt);
      return receipt;
    }
    if (!inFlight.has(cacheKey)) {
      inFlight.set(cacheKey, (async () => {
        try {
          const delegatedStartedAt = performance.now();
          const delegatedArguments = clone(normalized.arguments);
          // Only the current viewer's Host-owned LegalSpace is authoritative.
          delete delegatedArguments.currentLegalSpaceDomain;
          const domainId = String(delegatedArguments.domainId
            || delegatedArguments.proposal?.domainId || "");
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
          const response = await delegate(deepFreeze({
            schemaVersion:
              `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.request`,
            authority: clone(binding),
            queryKind,
            arguments: delegatedArguments,
            roomMutationAuthority: false,
            confirmationAuthority: false,
            trainingTruth: false,
          }));
          const receipt = delegatedResult(binding, queryKind, response, delegatedArguments);
          observeDelegatedDiagnostic(binding, queryKind, response, receipt,
            delegatedStartedAt);
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

  async function query(input = {}) {
    return queryWithDelegate(input);
  }

  async function queryBatch(input = {}) {
    const requests = input.requests;
    if (!Array.isArray(requests)) throw new TypeError("spatial query requests are required");
    const results = [];
    for (let index = 0; index < requests.length;) {
      if (!rulesQueryBatch || !INDEPENDENT_READONLY_QUERY_KINDS.has(
        String(requests[index]?.queryKind || requests[index]?.kind || ""))) {
        results.push(await query({ ...input, request: requests[index++] }));
        continue;
      }
      const group = [];
      while (index < requests.length && INDEPENDENT_READONLY_QUERY_KINDS.has(
        String(requests[index]?.queryKind || requests[index]?.kind || ""))) {
        group.push(requests[index++]);
      }
      const pending = [];
      const enqueue = request => new Promise((resolve, reject) => {
        pending.push({ request, resolve, reject });
      });
      // Normal validation, Host-domain binding and exact-authority cache all
      // run before queueing. Identical in-flight arguments enqueue only once.
      const tasks = group.map(request => queryWithDelegate({ ...input, request }, enqueue)
        .then(receipt => ({ receipt }), error => ({ error })));
      if (pending.length) {
        try {
          const replies = await rulesQueryBatch(pending.map(entry => entry.request));
          if (!Array.isArray(replies) || replies.length !== pending.length) {
            throw new TypeError("rules query batch reply count mismatch");
          }
          for (const [i, entry] of pending.entries()) entry.resolve(replies[i]);
        } catch (error) {
          // Never replay a completed batch blindly. The existing typed
          // adapter-failed receipt handles each rejected delegated promise.
          for (const entry of pending) entry.reject(error);
        }
      }
      for (const outcome of await Promise.all(tasks)) {
        if (outcome.error) throw outcome.error;
        results.push(outcome.receipt);
      }
    }
    return results;
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_SPATIAL_ACTION_QUERY_RUNTIME_VERSION}.metadata`,
      interface: ["actionSpace", "query", "queryBatch"],
      directExactQueries: [...DIRECT_QUERY_KINDS],
      delegatedQueries: [...DELEGATED_QUERY_KINDS],
      independentReadonlyQueryKinds: [...INDEPENDENT_READONLY_QUERY_KINDS],
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
    queryBatch,
  });
}
