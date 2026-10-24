import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1,
  OFFICIAL_CHARGE_OCCUPIED_CROSS_SECTION_PROOF_VERSION } from
  "../rule-atoms/official-charge-occupied-cross-section-proof-v1.mjs";
import { applyOfficialSelectedRosterChargeResolutionTransitionV1 } from
  "./official-selected-roster-melee-action-runtime-v1.mjs";
import { OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID,
  OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_VERSION } from
  "./official-current-product-match-runtime-v3.mjs";

export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_ID =
  "starcraft-tmg-official-current-product-match-runtime-v4";
export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_VERSION = "1.0.0";
export const OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PARAMETER_KIND =
  "official_selected_roster_charge_occupied_cross_section_failure_v1";
export const OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND =
  "occupied_cross_section_distance_shortfall";

const ATOM_ID = "rule-atom:selected-roster-charge-occupied-cross-section-v1";

function fail(code) { throw new Error(code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function without(value, fields) {
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    !fields.includes(key)));
}
function seal(body, field) {
  return Object.freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function certificate(state) {
  const result = evaluateOfficialChargeOccupiedCrossSectionShortfallProofV1(
    state);
  return result.allLegalChargePathsExcluded === true
    && result.allActiveTargetModelsCovered === true
    && result.omittedConstraintsCanOnlyEnlargeDomain === true
    && result.certificateKind
      === OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND
    ? result : null;
}

function failureDomain(state, proof, ruleAtomIds) {
  const pending = state.pendingAction;
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PARAMETER_KIND,
    actionType: "resolve_charge", sideKey: pending.sideKey,
    phase: "assault", pieceId: pending.pieceId,
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_VERSION,
    ruleAtomIds,
    parameterSchema: { type: "object",
      required: ["outcome", "failureProof"], outcome: ["failure"],
      failureProofKind: OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND },
    constraints: { pendingHash: pending.pendingHash,
      declarationChargePlanHash: pending.chargePlan.chargePlanHash,
      certificateSchemaVersion: proof.schemaVersion,
      certificateHash: hashStarcraftTmgContract(proof),
      maxDistanceMilliInches: pending.maxDistanceMilliInches,
      allActiveTargetModelsCovered: true },
    confirmationClass:
      "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_charge_occupied_cross_section_shortfall_v1",
    trainingTruth: false,
  };
  return Object.freeze({ ...body,
    domainId: `sc-domain-${hashStarcraftTmgContract(body)}` });
}

function instantiateFailure(state, domain, parameters, current, proof) {
  if (!isDeepStrictEqual(domain, current)
    || !object(parameters)
    || Object.keys(parameters).sort().join(",") !== "failureProof,outcome"
    || parameters.outcome !== "failure"
    || !object(parameters.failureProof)
    || Object.keys(parameters.failureProof).join(",") !== "kind"
    || parameters.failureProof.kind
      !== OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND) {
    fail("CHARGE_CROSS_SECTION_DOMAIN_OR_PARAMETERS_INVALID");
  }
  const pending = state.pendingAction;
  const canonicalParameters = { outcome: "failure",
    failureProof: { kind:
      OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND } };
  const failureProof = { kind:
      OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND,
    certificateSchemaVersion: proof.schemaVersion,
    certificateHash: hashStarcraftTmgContract(proof),
    certificateKind: proof.certificateKind,
    leadingModelId: proof.leadingModelId,
    declaredTargetUnitId: proof.declaredTargetUnitId,
    targetCertificates: structuredClone(proof.targetCertificates),
    maximumChargeDistanceMilliInches: proof.maximumChargeDistanceMilliInches,
    recomputedByRules: true, trainingTruth: false };
  const plan = seal({
    schemaVersion: "starcraft_tmg_selected_roster_charge_resolution_plan_v4",
    semanticVersion: "1.0.0", sideKey: pending.sideKey,
    pieceId: pending.pieceId, outcome: "failure",
    pendingHash: pending.pendingHash,
    declarationChargePlanHash: pending.chargePlan.chargePlanHash,
    chargeRoll: pending.chargeRoll,
    maxDistanceMilliInches: pending.maxDistanceMilliInches,
    domainId: domain.domainId, canonicalParameters,
    geometry: null, postEngagementGraphHash: null,
    declaredTargetUnitIds: pending.chargePlan.targets.map((target) =>
      target.unitId).sort(),
    allLeadingBaseToBase: false, remainingPlacementPriorities: [],
    failureProof, sourceRefreshPerformed: false,
    rulesTruth: "official_charge_occupied_cross_section_shortfall_v1",
    trainingTruth: false,
  }, "chargeResolutionPlanHash");
  const action = Object.freeze({ actionType: "resolve_charge",
    sideKey: pending.sideKey, phase: "assault", pieceId: pending.pieceId,
    chargeResolutionPlan: plan, chance: null,
    ruleAtomIds: domain.ruleAtomIds,
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_VERSION });
  return { schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_charge_occupied_cross_section_shortfall_v1",
    trainingTruth: false };
}

export function createOfficialCurrentProductMatchRuntimeV4(input = {}) {
  const legacy = input.legacyRuntime;
  const old = legacy?.descriptor;
  if (old?.runtimeId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID
    || old.runtimeVersion !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_VERSION
    || old.runtimeHash !== hashStarcraftTmgContract(
      without(old, ["runtimeHash"]))
    || typeof legacy.enumerate !== "function"
    || typeof legacy.instantiate !== "function"
    || typeof legacy.apply !== "function") {
    fail("CHARGE_CROSS_SECTION_LEGACY_RUNTIME_INVALID");
  }
  const executableRuleAtomIds = [...new Set([
    ...old.executableRuleAtomIds, ATOM_ID])].sort();
  const descriptor = seal({ ...without(old, ["runtimeHash"]),
    runtimeId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_ID,
    runtimeVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_VERSION,
    rulesVersion: "official-current-product-standard-2000-match-v4",
    catalogueHash: hashStarcraftTmgContract({
      legacyCatalogueHash: old.catalogueHash,
      atomId: ATOM_ID,
      proofVersion: OFFICIAL_CHARGE_OCCUPIED_CROSS_SECTION_PROOF_VERSION,
    }),
    executorManifest: [...old.executorManifest, {
      executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_ID,
      executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_VERSION,
      actionTypes: ["resolve_charge"] }],
    executableRuleAtomIds,
    executableRuleAtomCount: executableRuleAtomIds.length,
    legacyRuntimeHash: old.runtimeHash,
    chargeCrossSectionFailureProofKind:
      OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND,
    productionRoomEligible: false,
  }, "runtimeHash");
  function enumerate(state, options = {}) {
    const original = legacy.enumerate(state, options);
    const previous = original.parameterDomains.find((domain) =>
      domain.actionType === "resolve_charge");
    const proof = previous?.executorId
      === OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID
      ? null : previous ? certificate(state) : null;
    const ruleAtomIds = previous ? [...new Set([
      ...(previous.ruleAtomIds || []), ATOM_ID])].sort() : [];
    const replacement = proof
      ? failureDomain(state, proof, ruleAtomIds) : null;
    return { ...original, rulesRuntimeHash: descriptor.runtimeHash,
      parameterDomains: replacement
        ? [...original.parameterDomains.filter((domain) =>
          domain !== previous), replacement]
        : original.parameterDomains,
      chargeCrossSectionFailureDomainVersion: replacement
        ? OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PARAMETER_KIND : null,
      trainingTruth: false };
  }
  function instantiate(state, domain, parameters, options = {}) {
    if (domain?.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_ID) {
      return legacy.instantiate(state, domain, parameters, options);
    }
    const current = enumerate(state, options).parameterDomains.find((item) =>
      item.domainId === domain.domainId);
    const proof = current ? certificate(state) : null;
    if (!current || !proof) fail("CHARGE_CROSS_SECTION_DOMAIN_STALE");
    return instantiateFailure(state, domain, parameters, current, proof);
  }
  function apply(state, action, options = {}) {
    if (action?.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V4_ID) {
      const result = legacy.apply(state, action, options);
      return { ...result, runtimeId: descriptor.runtimeId,
        runtimeVersion: descriptor.runtimeVersion };
    }
    const domain = enumerate(state, options).parameterDomains.find((item) =>
      item.domainId === action?.chargeResolutionPlan?.domainId);
    if (!domain) fail("CHARGE_CROSS_SECTION_DOMAIN_STALE");
    const expected = instantiate(state, domain,
      action.chargeResolutionPlan.canonicalParameters, options);
    if (!isDeepStrictEqual(expected.action, action)) {
      fail("CHARGE_CROSS_SECTION_ACTION_STALE");
    }
    const transition = applyOfficialSelectedRosterChargeResolutionTransitionV1(
      state, action);
    return { ok: true,
      schemaVersion: "starcraft_tmg_current_product_match_transition_v4",
      runtimeId: descriptor.runtimeId,
      runtimeVersion: descriptor.runtimeVersion,
      postRevision: Number(options.postRevision || 0),
      state: transition.state, action: structuredClone(action),
      events: transition.events,
      rulesTruth: "official_charge_occupied_cross_section_shortfall_v1",
      trainingTruth: false };
  }
  return Object.freeze({ descriptor, legacyRuntimeDescriptor: old,
    compositionEvidence: legacy.compositionEvidence,
    missionRuntimeDescriptor: legacy.missionRuntimeDescriptor,
    enumerate, instantiate, apply });
}
