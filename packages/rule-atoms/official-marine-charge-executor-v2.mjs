import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import {
  applyOfficialMarineChargeV1,
  enumerateOfficialMarineChargeV1,
  instantiateOfficialMarineChargeV1,
  OFFICIAL_MARINE_CHARGE_ACTION_ATOM_IDS as V1_ACTION_ATOM_IDS,
  OFFICIAL_MARINE_CHARGE_DECLARATION_PARAMETER_KIND as V1_DECLARATION_PARAMETER_KIND,
  OFFICIAL_MARINE_CHARGE_EXECUTOR_ID as V1_EXECUTOR_ID,
  OFFICIAL_MARINE_CHARGE_EXECUTOR_VERSION as V1_EXECUTOR_VERSION,
  OFFICIAL_MARINE_CHARGE_PENDING_SCHEMA as V1_PENDING_SCHEMA,
  OFFICIAL_MARINE_CHARGE_RESOLUTION_PARAMETER_KIND as V1_RESOLUTION_PARAMETER_KIND,
} from "./official-marine-charge-executor-v1.mjs";

export const OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID = "authority.marine-charge-v2";
export const OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_MARINE_CHARGE_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND =
  "official_marine_charge_declaration_v2";
export const OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND =
  "official_marine_charge_resolution_v2";
export const OFFICIAL_MARINE_CHARGE_V2_ACTION_TYPE = "charge";
export const OFFICIAL_RESOLVE_MARINE_CHARGE_V2_ACTION_TYPE = "resolve_charge";
export const OFFICIAL_MARINE_CHARGE_V2_PENDING_SCHEMA =
  "starcraft_tmg_official_marine_charge_pending_v2";
export const OFFICIAL_MARINE_CHARGE_V1_EXECUTOR_ARTIFACT_HASH =
  "8bba198aa8381b1137e129065fdf6637db1a1d7fe336a32a8092528781d805f5";

const QUICK_REFERENCE_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-12-4-charge-action-summary:6bd28459707d",
  "rule-atom:singleton:core-12-4-charge-distance-step:1f3880d8e515",
  "rule-atom:singleton:core-12-4-charge-failure-step:d607d4beaffe",
  "rule-atom:singleton:core-12-4-charge-success-step:fe0e3e31c71e",
  "rule-atom:singleton:core-12-4-charge-target-step:6edb70798f12",
  "rule-atom:singleton:core-12-4-following-model-coherency:8a828b41cea2",
  "rule-atom:singleton:core-12-4-leading-model-movement:351d9e5540a0",
].sort());
export const OFFICIAL_MARINE_CHARGE_V2_NEW_ATOM_IDS = Object.freeze([
  ...new Set([
    ...V1_ACTION_ATOM_IDS.filter((atomId) => (
      atomId.startsWith("rule-atom:singleton:core-8-7-7-")
      || atomId === "rule-atom:charge-endpoint-overlap-prohibition"
      || atomId === "rule-atom:ground-only-charge-targets-and-flying-prohibition"
    )),
    ...QUICK_REFERENCE_ATOM_IDS,
  ]),
].sort());
export const OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([...V1_ACTION_ATOM_IDS, ...QUICK_REFERENCE_ATOM_IDS]),
].sort());
export const OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS;

const BASE_DIAMETER_MILLI_INCHES = Math.round((32 / 25.4) * 1000);
const MAX_ENGAGED_CENTER_DISTANCE_MILLI_INCHES = BASE_DIAMETER_MILLI_INCHES + 1000;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

function hashBody(value, hashField) {
  return hashStarcraftTmgContract(without(value, [hashField]));
}

function sourceBinding(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  if (!object(audit)
    || audit.schema !== "starcraft_tmg_official_development_tranche_source_lock_audit_v1"
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.auditHash !== hashBody(audit, "auditHash")
    || audit.sameVersionDrift?.classification !== "display_only_additions"
    || audit.sameVersionDrift?.canAffectRules !== false
    || audit.repositoryFallbackAllowed !== false
    || audit.rulesEligible !== false
    || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== audit.snapshotHash
    || bundle?.normalizedDatasetHash !== audit.normalizedDatasetHash
    || bundle?.repositoryFallbackAllowed !== false
    || bundle?.trainingTruth !== false) {
    fail("CHARGE_V2_SOURCE_LOCK_BINDING_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_marine_charge_v2_data_adapter_receipt_v1",
    sourceLockHash: audit.lockHash,
    sourceLockAuditHash: audit.auditHash,
    sourceSnapshotHash: audit.snapshotHash,
    normalizedDatasetHash: audit.normalizedDatasetHash,
    gameplayDataBundleHash: bundle.gameplayDataBundleHash,
    legacyExecutorId: V1_EXECUTOR_ID,
    legacyExecutorVersion: V1_EXECUTOR_VERSION,
    legacyExecutorArtifactHash: OFFICIAL_MARINE_CHARGE_V1_EXECUTOR_ARTIFACT_HASH,
    compatibilityMode: "explicit_current_source_adapter",
    silentCompatibilityUsed: false,
    repositoryFallbackAllowed: false,
    trainingTruth: false,
  };
  return { ...body, adapterReceiptHash: hashStarcraftTmgContract(body) };
}

function mappedParameterKind(kind) {
  if (kind === V1_DECLARATION_PARAMETER_KIND) {
    return OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND;
  }
  if (kind === V1_RESOLUTION_PARAMETER_KIND) {
    return OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND;
  }
  fail("CHARGE_V2_LEGACY_PARAMETER_KIND_INVALID", kind);
}

function mapDomain(v1Domain, binding) {
  const body = {
    ...without(v1Domain, ["domainId"]),
    parameterKind: mappedParameterKind(v1Domain.parameterKind),
    executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS],
    parameterSchema: v1Domain.parameterKind === V1_RESOLUTION_PARAMETER_KIND
      ? {
          ...clone(v1Domain.parameterSchema),
          required: ["outcome"],
          outcome: ["success", "failure"],
          successRequires: ["path", "placements"],
          failureRequires: ["failureProof"],
        }
      : clone(v1Domain.parameterSchema),
    constraints: {
      ...clone(v1Domain.constraints),
      geometryScope: "gauntlet_round_base_ground_no_terrain_charge_v2",
      sourceLockHash: binding.sourceLockHash,
      sourceLockAuditHash: binding.sourceLockAuditHash,
      sourceSnapshotHash: binding.sourceSnapshotHash,
      normalizedDatasetHash: binding.normalizedDatasetHash,
      dataAdapterReceiptHash: binding.adapterReceiptHash,
      ...(v1Domain.parameterKind === V1_RESOLUTION_PARAMETER_KIND ? {
        resolutionOutcomes: ["success", "failure"],
        acceptedFailureProofs: ["distance_shortfall", "declared_target_spread"],
      } : {}),
    },
    rulesTruth: v1Domain.parameterKind === V1_RESOLUTION_PARAMETER_KIND
      ? "official_current_marine_charge_v2_post_roll_resolution_domain"
      : "official_current_marine_charge_v2_declaration_domain",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function mapPlan(v1Plan, binding, outcome) {
  const planBody = {
    ...without(v1Plan, ["chargePlanHash", "schemaVersion"]),
    schemaVersion: outcome === "declaration"
      ? "starcraft_tmg_official_marine_charge_declaration_plan_v2"
      : "starcraft_tmg_official_marine_charge_resolution_plan_v2",
    resolutionOutcome: outcome,
    legacyChargePlanHash: v1Plan.chargePlanHash,
    sourceLockHash: binding.sourceLockHash,
    sourceLockAuditHash: binding.sourceLockAuditHash,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    normalizedDatasetHash: binding.normalizedDatasetHash,
    dataAdapterReceiptHash: binding.adapterReceiptHash,
    trainingTruth: false,
  };
  return { ...planBody, chargePlanHash: hashStarcraftTmgContract(planBody) };
}

function mapAction(v1Action, v2Domain, binding, outcome) {
  const chargePlan = mapPlan(v1Action.chargePlan, binding, outcome);
  return {
    ...clone(v1Action),
    ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
    chargePlan,
    chargePlanHash: chargePlan.chargePlanHash,
    domainId: v2Domain.domainId,
    details: {
      rulesTruth: outcome === "declaration"
        ? "official_marine_charge_v2_declaration"
        : "official_marine_charge_v2_success_resolution",
      dataAdapterReceiptHash: binding.adapterReceiptHash,
      trainingTruth: false,
    },
  };
}

function mapDiagnostic(candidate) {
  return {
    ...clone(candidate),
    ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
    details: { rulesTruth: "official_marine_charge_v2_fail_closed", trainingTruth: false },
  };
}

function validatePending(state) {
  const pending = state?.pendingAction;
  const binding = sourceBinding(state);
  if (!object(pending)
    || pending.schema !== OFFICIAL_MARINE_CHARGE_V2_PENDING_SCHEMA
    || pending.stage !== "select_charge_move_after_roll"
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.sourceLockHash !== binding.sourceLockHash
    || pending.sourceLockAuditHash !== binding.sourceLockAuditHash
    || pending.sourceSnapshotHash !== binding.sourceSnapshotHash
    || pending.normalizedDatasetHash !== binding.normalizedDatasetHash
    || pending.dataAdapterReceiptHash !== binding.adapterReceiptHash
    || !object(pending.legacyPending)
    || pending.legacyPending.schema !== V1_PENDING_SCHEMA
    || pending.legacyPending.pendingHash !== pending.legacyPendingHash
    || pending.legacyPending.pendingHash !== hashBody(pending.legacyPending, "pendingHash")
    || pending.round !== Number(state.round)
    || pending.phase !== "assault"
    || pending.sideKey !== state.activeSideKey
    || pending.trainingTruth !== false) {
    fail("CHARGE_V2_PENDING_INVALID");
  }
  return { pending, binding };
}

function legacyPendingState(state) {
  const { pending } = validatePending(state);
  const legacy = clone(state);
  legacy.pendingAction = clone(pending.legacyPending);
  return legacy;
}

function legacyDomains(state, options) {
  const legacyState = isOfficialMarineChargePendingV2(state)
    ? legacyPendingState(state)
    : state;
  const enumeration = enumerateOfficialMarineChargeV1(legacyState, options);
  return { legacyState, enumeration };
}

function expectedDomain(state, domain, options) {
  const binding = sourceBinding(state);
  const { legacyState, enumeration } = legacyDomains(state, options);
  const legacyDomain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === domain?.pieceId
    && mappedParameterKind(entry.parameterKind) === domain?.parameterKind
  ));
  if (!legacyDomain) fail("CHARGE_V2_PARAMETER_DOMAIN_STALE");
  const mapped = mapDomain(legacyDomain, binding);
  if (!isDeepStrictEqual(mapped, domain)) fail("CHARGE_V2_PARAMETER_DOMAIN_STALE");
  return { binding, legacyState, legacyDomain, domain: mapped };
}

function pointDistance(left, right) {
  return Math.hypot(
    Number(right.xMilliInches) - Number(left.xMilliInches),
    Number(right.yMilliInches) - Number(left.yMilliInches),
  );
}

function failureProof(domain, input) {
  if (!object(input)
    || Object.keys(input).some((key) => key !== "kind")
    || !["distance_shortfall", "declared_target_spread"].includes(input.kind)) {
    fail("CHARGE_V2_FAILURE_PROOF_INVALID");
  }
  const leadingStart = domain.constraints.modelStartPoints[domain.constraints.leadingModelId];
  const targets = domain.constraints.targets;
  if (input.kind === "distance_shortfall") {
    const required = Math.ceil(Math.max(...targets.map((target) => Math.max(
      0,
      pointDistance(leadingStart, target.startPoint)
        - MAX_ENGAGED_CENTER_DISTANCE_MILLI_INCHES,
    ))));
    if (required <= domain.constraints.maxDistanceMilliInches) {
      fail("CHARGE_V2_FAILURE_NOT_PROVEN");
    }
    return {
      kind: input.kind,
      minimumRequiredDistanceMilliInches: required,
      availableDistanceMilliInches: domain.constraints.maxDistanceMilliInches,
    };
  }
  let widest = null;
  for (let left = 0; left < targets.length; left += 1) {
    for (let right = left + 1; right < targets.length; right += 1) {
      const separation = Math.ceil(pointDistance(
        targets[left].startPoint,
        targets[right].startPoint,
      ));
      if (!widest || separation > widest.separationMilliInches) {
        widest = {
          leftModelId: targets[left].modelId,
          rightModelId: targets[right].modelId,
          separationMilliInches: separation,
        };
      }
    }
  }
  if (!widest
    || widest.separationMilliInches <= 2 * MAX_ENGAGED_CENTER_DISTANCE_MILLI_INCHES) {
    fail("CHARGE_V2_FAILURE_NOT_PROVEN");
  }
  return {
    kind: input.kind,
    ...widest,
    maximumJointEngagementSeparationMilliInches:
      2 * MAX_ENGAGED_CENTER_DISTANCE_MILLI_INCHES,
  };
}

function instantiateFailure(domain, proofInput, binding) {
  const proof = failureProof(domain, proofInput);
  const planBody = {
    schemaVersion: "starcraft_tmg_official_marine_charge_resolution_plan_v2",
    pendingHash: domain.constraints.pendingHash,
    declarationChargePlanHash: domain.constraints.chargePlanHash,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    leadingModelId: domain.constraints.leadingModelId,
    declaredTargetUnitIds: [...domain.constraints.declaredTargetUnitIds],
    declaredTargetModelIds: [...domain.constraints.declaredTargetModelIds],
    speedInches: domain.constraints.speedInches,
    chargeRoll: domain.constraints.chargeRoll,
    chargeRollDistanceInches: domain.constraints.chargeRollDistanceInches,
    resolutionOutcome: "failure",
    failureProof: proof,
    movementApplied: false,
    activationEnds: true,
    sourceLockHash: binding.sourceLockHash,
    sourceLockAuditHash: binding.sourceLockAuditHash,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    normalizedDatasetHash: binding.normalizedDatasetHash,
    dataAdapterReceiptHash: binding.adapterReceiptHash,
    trainingTruth: false,
  };
  const chargePlan = { ...planBody, chargePlanHash: hashStarcraftTmgContract(planBody) };
  return {
    action: {
      actionType: OFFICIAL_RESOLVE_MARINE_CHARGE_V2_ACTION_TYPE,
      sideKey: domain.sideKey,
      phase: "assault",
      pieceId: domain.pieceId,
      ruleAtomIds: [...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS],
      executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
      chance: null,
      chargePlan,
      chargePlanHash: chargePlan.chargePlanHash,
      pendingHash: domain.constraints.pendingHash,
      domainId: domain.domainId,
      isEnabled: true,
      disabledReason: "",
      score: 1,
      details: {
        rulesTruth: "official_marine_charge_v2_failed_charge_resolution",
        dataAdapterReceiptHash: binding.adapterReceiptHash,
        trainingTruth: false,
      },
    },
    canonicalParameters: { outcome: "failure", failureProof: { kind: proof.kind } },
  };
}

export function enumerateOfficialMarineChargeV2(state, options = {}) {
  const binding = sourceBinding(state);
  const { enumeration } = legacyDomains(state, options);
  return {
    candidates: enumeration.candidates.map(mapDiagnostic),
    parameterDomains: enumeration.parameterDomains.map((domain) => mapDomain(domain, binding)),
  };
}

export function instantiateOfficialMarineChargeV2(state, domain, parameters, options = {}) {
  if (!object(parameters)) fail("CHARGE_V2_PARAMETERS_INVALID");
  const current = expectedDomain(state, domain, options);
  if (domain.parameterKind === OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND) {
    const instantiated = instantiateOfficialMarineChargeV1(
      current.legacyState,
      current.legacyDomain,
      parameters,
      options,
    );
    return {
      action: mapAction(instantiated.action, current.domain, current.binding, "declaration"),
      canonicalParameters: clone(instantiated.canonicalParameters),
    };
  }
  if (domain.parameterKind !== OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND
    || !["success", "failure"].includes(parameters.outcome)
    || Object.keys(parameters).some((key) => ![
      "outcome",
      "path",
      "placements",
      "failureProof",
    ].includes(key))) {
    fail("CHARGE_V2_RESOLUTION_PARAMETERS_INVALID");
  }
  if (parameters.outcome === "failure") {
    if (parameters.path !== undefined || parameters.placements !== undefined) {
      fail("CHARGE_V2_FAILURE_PARAMETERS_INVALID");
    }
    return instantiateFailure(current.domain, parameters.failureProof, current.binding);
  }
  if (parameters.failureProof !== undefined) fail("CHARGE_V2_SUCCESS_PARAMETERS_INVALID");
  const instantiated = instantiateOfficialMarineChargeV1(
    current.legacyState,
    current.legacyDomain,
    { path: parameters.path, placements: parameters.placements },
    options,
  );
  return {
    action: mapAction(instantiated.action, current.domain, current.binding, "success"),
    canonicalParameters: {
      outcome: "success",
      ...clone(instantiated.canonicalParameters),
    },
  };
}

function pendingV2(legacyPending, action, binding) {
  const body = {
    schema: OFFICIAL_MARINE_CHARGE_V2_PENDING_SCHEMA,
    stage: legacyPending.stage,
    round: legacyPending.round,
    phase: legacyPending.phase,
    sideKey: legacyPending.sideKey,
    pieceId: legacyPending.pieceId,
    chargePlan: clone(action.chargePlan),
    chargePlanHash: action.chargePlanHash,
    roll: legacyPending.roll,
    speedInches: legacyPending.speedInches,
    chargeRollDistanceInches: legacyPending.chargeRollDistanceInches,
    declarationDomainId: action.domainId,
    openedAtRevision: legacyPending.openedAtRevision,
    sourceLockHash: binding.sourceLockHash,
    sourceLockAuditHash: binding.sourceLockAuditHash,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    normalizedDatasetHash: binding.normalizedDatasetHash,
    dataAdapterReceiptHash: binding.adapterReceiptHash,
    legacyPending: clone(legacyPending),
    legacyPendingHash: legacyPending.pendingHash,
    trainingTruth: false,
  };
  return { ...body, pendingHash: hashStarcraftTmgContract(body) };
}

function expectedActionFromInput(state, action, options) {
  const enumeration = enumerateOfficialMarineChargeV2(state, {
    ...options,
    sideKey: action.sideKey,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.domainId === action.domainId && entry.pieceId === action.pieceId
  ));
  if (!domain) fail("CHARGE_V2_ACTION_STALE");
  if (action.actionType === OFFICIAL_MARINE_CHARGE_V2_ACTION_TYPE) {
    return instantiateOfficialMarineChargeV2(state, domain, {
      leadingModelId: action.chargePlan?.leadingModelId,
      targets: (action.chargePlan?.targets || []).map((entry) => ({
        unitId: entry.unitId,
        modelId: entry.modelId,
      })),
    }, options);
  }
  if (action.chargePlan?.resolutionOutcome === "failure") {
    return instantiateOfficialMarineChargeV2(state, domain, {
      outcome: "failure",
      failureProof: { kind: action.chargePlan?.failureProof?.kind },
    }, options);
  }
  return instantiateOfficialMarineChargeV2(state, domain, {
    outcome: "success",
    path: action.chargePlan?.canonicalPath?.points?.slice(1),
    placements: action.chargePlan?.placementSequence,
  }, options);
}

function applyResolution(stateInput, action, options) {
  const expected = expectedActionFromInput(stateInput, action, options);
  if (!isDeepStrictEqual(contractAction(expected.action), contractAction(action))) {
    fail("CHARGE_V2_ACTION_STALE");
  }
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => (
    entry.id === action.pieceId && entry.sideKey === action.sideKey
  ));
  if (!piece) fail("CHARGE_V2_UNIT_NOT_FOUND");
  const success = action.chargePlan.resolutionOutcome === "success";
  if (success) {
    const byModelId = new Map(piece.models.map((model) => [model.id, model]));
    for (const position of action.chargePlan.finalModelPositions || []) {
      const model = byModelId.get(position.modelId);
      if (!model) fail("CHARGE_V2_MODEL_NOT_FOUND", position.modelId);
      model.xInches = position.xMilliInches / 1000;
      model.yInches = position.yMilliInches / 1000;
    }
  }
  piece.activatedPhases = object(piece.activatedPhases) ? piece.activatedPhases : {};
  piece.activatedPhases.assault = true;
  state.pendingAction = null;
  const event = {
    type: success ? "marine_charge_succeeded" : "marine_charge_failed",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    chargeRoll: action.chargePlan.chargeRoll,
    chargeRollDistanceInches: action.chargePlan.chargeRollDistanceInches,
    declaredTargetUnitIds: [...action.chargePlan.declaredTargetUnitIds],
    declaredTargetModelIds: [...action.chargePlan.declaredTargetModelIds],
    movementApplied: success,
    activationEnded: true,
    chargePlanHash: action.chargePlanHash,
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    type: "charge_resolution",
    round: Number(state.round),
    phase: "assault",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    action: clone(action),
    events: [clone(event)],
    trainingTruth: false,
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_marine_charge_transition_v2",
    executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
    state,
    events: [event],
    action: clone(action),
    settlementRequired: true,
    rulesTruth: success
      ? "official_marine_charge_v2_success_applied"
      : "official_marine_charge_v2_failure_applied",
    trainingTruth: false,
  };
}

export function applyOfficialMarineChargeV2(stateInput, actionInput, options = {}) {
  if (!object(stateInput)
    || !object(actionInput)
    || ![
      OFFICIAL_MARINE_CHARGE_V2_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_CHARGE_V2_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION
    || !isDeepStrictEqual(
      [...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS],
    )) {
    fail("CHARGE_V2_ACTION_INVALID");
  }
  if (actionInput.actionType === OFFICIAL_RESOLVE_MARINE_CHARGE_V2_ACTION_TYPE) {
    if (!isOfficialMarineChargePendingV2(stateInput)) fail("CHARGE_V2_PENDING_REQUIRED");
    return applyResolution(stateInput, actionInput, options);
  }
  if (stateInput.pendingAction !== undefined && stateInput.pendingAction !== null) {
    fail("CHARGE_V2_PENDING_ACTION_CONFLICT");
  }
  const expected = expectedActionFromInput(stateInput, actionInput, options);
  if (!isDeepStrictEqual(contractAction(expected.action), contractAction(actionInput))) {
    fail("CHARGE_V2_ACTION_STALE");
  }
  const current = expectedDomain(stateInput, {
    pieceId: actionInput.pieceId,
    parameterKind: OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND,
    domainId: actionInput.domainId,
    ...enumerateOfficialMarineChargeV2(stateInput, {
      ...options,
      sideKey: actionInput.sideKey,
    }).parameterDomains.find((entry) => entry.domainId === actionInput.domainId),
  }, options);
  const legacyInstantiation = instantiateOfficialMarineChargeV1(
    current.legacyState,
    current.legacyDomain,
    expected.canonicalParameters,
    options,
  );
  const legacyApplied = applyOfficialMarineChargeV1(
    stateInput,
    legacyInstantiation.action,
    options,
  );
  const pending = pendingV2(legacyApplied.state.pendingAction, actionInput, current.binding);
  legacyApplied.state.pendingAction = pending;
  const event = {
    ...legacyApplied.events[0],
    type: "marine_charge_v2_declared_and_rolled",
    pendingHash: pending.pendingHash,
    sourceLockHash: current.binding.sourceLockHash,
    trainingTruth: false,
  };
  const lastLog = legacyApplied.state.log.at(-1);
  if (lastLog) {
    lastLog.type = "charge_v2_declaration";
    lastLog.action = clone(actionInput);
    lastLog.events = [clone(event)];
  }
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_marine_charge_transition_v2",
    executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
    state: legacyApplied.state,
    events: [event],
    action: clone(actionInput),
    settlementRequired: false,
    rulesTruth: "official_marine_charge_v2_declared_targets_then_hidden_roll",
    trainingTruth: false,
  };
}

export function isOfficialMarineChargePendingV2(state) {
  return state?.pendingAction?.schema === OFFICIAL_MARINE_CHARGE_V2_PENDING_SCHEMA;
}
