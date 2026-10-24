import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { evaluateOfficialChargeElevationAccessShortfallProofV1 } from
  "../rule-atoms/official-charge-elevation-access-shortfall-proof-v1.mjs";
import { applyOfficialSelectedRosterChargeResolutionTransitionV1 } from
  "./official-selected-roster-melee-action-runtime-v1.mjs";
import { OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID,
  OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_VERSION } from
  "./official-current-product-match-runtime-v2.mjs";

export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID =
  "starcraft-tmg-official-current-product-match-runtime-v3";
export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_VERSION = "1.0.0";
export const OFFICIAL_CHARGE_ACCESS_FAILURE_PARAMETER_KIND =
  "official_selected_roster_charge_elevation_access_failure_v1";
export const OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND =
  "mandatory_elevation_access_shortfall";

const ACCESS_FAILURE_ATOM_ID =
  "rule-atom:selected-roster-charge-mandatory-access-shortfall-v1";

function fail(code) { throw new Error(code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, fields) {
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    !fields.includes(key)));
}
function seal(body, field) {
  return Object.freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function accessCertificate(state) {
  const proof = evaluateOfficialChargeElevationAccessShortfallProofV1(state);
  return proof.allLegalChargePathsExcluded === true
    && proof.certificateKind === OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND
    && proof.allGroundExitsEnumeratedFromOfficialAgreement === true
    && proof.omittedConstraintsCanOnlyEnlargeDomain === true
    ? proof : null;
}

function failureDomain(state, certificate, ruleAtomIds) {
  const pending = state.pendingAction;
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_CHARGE_ACCESS_FAILURE_PARAMETER_KIND,
    actionType: "resolve_charge",
    sideKey: pending.sideKey,
    phase: "assault",
    pieceId: pending.pieceId,
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_VERSION,
    ruleAtomIds,
    parameterSchema: {
      type: "object",
      required: ["outcome", "failureProof"],
      outcome: ["failure"],
      failureProofKind: OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND,
    },
    constraints: {
      pendingHash: pending.pendingHash,
      declarationChargePlanHash: pending.chargePlan.chargePlanHash,
      certificateSchemaVersion: certificate.schemaVersion,
      certificateHash: hashStarcraftTmgContract(certificate),
      maxDistanceMilliInches: pending.maxDistanceMilliInches,
      exactMandatoryAccessShortfall: true,
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_charge_mandatory_elevation_access_shortfall_v1",
    trainingTruth: false,
  };
  return Object.freeze({ ...body,
    domainId: `sc-domain-${hashStarcraftTmgContract(body)}` });
}

function instantiateFailure(state, domain, parameters, currentDomain,
  certificate, ruleAtomIds) {
  if (!isDeepStrictEqual(domain, currentDomain)
    || !object(parameters)
    || Object.keys(parameters).sort().join(",") !== "failureProof,outcome"
    || parameters.outcome !== "failure"
    || !object(parameters.failureProof)
    || Object.keys(parameters.failureProof).join(",") !== "kind"
    || parameters.failureProof.kind
      !== OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND) {
    fail("CHARGE_ACCESS_FAILURE_DOMAIN_OR_PARAMETERS_INVALID");
  }
  const pending = state.pendingAction;
  const canonicalParameters = {
    outcome: "failure",
    failureProof: { kind: OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND },
  };
  const proof = {
    kind: OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND,
    certificateSchemaVersion: certificate.schemaVersion,
    certificateHash: hashStarcraftTmgContract(certificate),
    certificateKind: certificate.certificateKind,
    leadingModelId: certificate.leadingModelId,
    highTargetModelIds: clone(certificate.highTargetModelIds),
    maximumChargeDistanceMilliInches:
      certificate.maximumChargeDistanceMilliInches,
    groundExitDistances: clone(certificate.groundExitDistances),
    recomputedByRules: true,
    trainingTruth: false,
  };
  const plan = seal({
    schemaVersion: "starcraft_tmg_selected_roster_charge_resolution_plan_v3",
    semanticVersion: "1.0.0",
    sideKey: pending.sideKey,
    pieceId: pending.pieceId,
    outcome: "failure",
    pendingHash: pending.pendingHash,
    declarationChargePlanHash: pending.chargePlan.chargePlanHash,
    chargeRoll: pending.chargeRoll,
    maxDistanceMilliInches: pending.maxDistanceMilliInches,
    domainId: domain.domainId,
    canonicalParameters,
    geometry: null,
    postEngagementGraphHash: null,
    declaredTargetUnitIds: pending.chargePlan.targets.map((target) =>
      target.unitId).sort(),
    allLeadingBaseToBase: false,
    remainingPlacementPriorities: [],
    failureProof: proof,
    sourceRefreshPerformed: false,
    rulesTruth: "official_charge_mandatory_elevation_access_shortfall_v1",
    trainingTruth: false,
  }, "chargeResolutionPlanHash");
  const action = Object.freeze({
    actionType: "resolve_charge",
    sideKey: pending.sideKey,
    phase: "assault",
    pieceId: pending.pieceId,
    chargeResolutionPlan: plan,
    chance: null,
    ruleAtomIds,
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_VERSION,
  });
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters,
    action,
    rulesTruth: "official_charge_mandatory_elevation_access_shortfall_v1",
    trainingTruth: false,
  };
}

export function createOfficialCurrentProductMatchRuntimeV3(input = {}) {
  const legacy = input.legacyRuntime;
  const legacyDescriptor = legacy?.descriptor;
  if (legacyDescriptor?.runtimeId
      !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID
    || legacyDescriptor.runtimeVersion
      !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_VERSION
    || legacyDescriptor.runtimeHash !== hashStarcraftTmgContract(
      without(legacyDescriptor, ["runtimeHash"]))
    || typeof legacy.enumerate !== "function"
    || typeof legacy.instantiate !== "function"
    || typeof legacy.apply !== "function") {
    fail("CHARGE_ACCESS_FAILURE_LEGACY_RUNTIME_INVALID");
  }
  const executableRuleAtomIds = [...new Set([
    ...legacyDescriptor.executableRuleAtomIds,
    ACCESS_FAILURE_ATOM_ID,
  ])].sort();
  const descriptor = seal({
    ...without(legacyDescriptor, ["runtimeHash"]),
    runtimeId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID,
    runtimeVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_VERSION,
    rulesVersion: "official-current-product-standard-2000-match-v3",
    catalogueHash: hashStarcraftTmgContract({
      legacyCatalogueHash: legacyDescriptor.catalogueHash,
      accessFailureAtomId: ACCESS_FAILURE_ATOM_ID,
      proofVersion: "starcraft_tmg_charge_elevation_access_shortfall_proof_v1",
    }),
    executorManifest: [...legacyDescriptor.executorManifest, {
      executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID,
      executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_VERSION,
      actionTypes: ["resolve_charge"],
    }],
    executableRuleAtomIds,
    executableRuleAtomCount: executableRuleAtomIds.length,
    legacyRuntimeHash: legacyDescriptor.runtimeHash,
    chargeAccessFailureProofKind:
      OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND,
    productionRoomEligible: false,
  }, "runtimeHash");

  function enumerate(state, options = {}) {
    const original = legacy.enumerate(state, options);
    const previous = original.parameterDomains.find((domain) =>
      domain.actionType === "resolve_charge");
    // A pre-existing exact v2 endpoint certificate remains authoritative.
    const certificate = previous?.executorId
      === OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID
      ? null : previous ? accessCertificate(state) : null;
    const chargeRuleAtomIds = previous ? [...new Set([
      ...(previous.ruleAtomIds || []), ACCESS_FAILURE_ATOM_ID,
    ])].sort() : [];
    const replacement = certificate
      ? failureDomain(state, certificate, chargeRuleAtomIds) : null;
    return {
      ...original,
      rulesRuntimeHash: descriptor.runtimeHash,
      parameterDomains: replacement
        ? [...original.parameterDomains.filter((domain) =>
          domain !== previous), replacement]
        : original.parameterDomains,
      chargeAccessFailureDomainVersion: replacement
        ? OFFICIAL_CHARGE_ACCESS_FAILURE_PARAMETER_KIND : null,
      trainingTruth: false,
    };
  }

  function instantiate(state, domain, parameters, options = {}) {
    if (domain?.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID) {
      return legacy.instantiate(state, domain, parameters, options);
    }
    const current = enumerate(state, options).parameterDomains.find((item) =>
      item.domainId === domain.domainId);
    const certificate = current ? accessCertificate(state) : null;
    if (!certificate || !current) fail("CHARGE_ACCESS_FAILURE_DOMAIN_STALE");
    return instantiateFailure(state, domain, parameters,
      current, certificate, current.ruleAtomIds);
  }

  function apply(state, action, options = {}) {
    if (action?.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V3_ID) {
      const result = legacy.apply(state, action, options);
      return { ...result, runtimeId: descriptor.runtimeId,
        runtimeVersion: descriptor.runtimeVersion };
    }
    const domain = enumerate(state, options).parameterDomains.find((item) =>
      item.domainId === action?.chargeResolutionPlan?.domainId);
    if (!domain) fail("CHARGE_ACCESS_FAILURE_DOMAIN_STALE");
    const expected = instantiate(state, domain,
      action.chargeResolutionPlan.canonicalParameters, options);
    if (!isDeepStrictEqual(expected.action, action)) {
      fail("CHARGE_ACCESS_FAILURE_ACTION_STALE");
    }
    const transition = applyOfficialSelectedRosterChargeResolutionTransitionV1(
      state, action);
    return {
      ok: true,
      schemaVersion: "starcraft_tmg_current_product_match_transition_v3",
      runtimeId: descriptor.runtimeId,
      runtimeVersion: descriptor.runtimeVersion,
      postRevision: Number(options.postRevision || 0),
      state: transition.state,
      action: clone(action),
      events: transition.events,
      rulesTruth: "official_charge_mandatory_elevation_access_shortfall_v1",
      trainingTruth: false,
    };
  }

  return Object.freeze({
    descriptor,
    legacyRuntimeDescriptor: legacyDescriptor,
    compositionEvidence: legacy.compositionEvidence,
    missionRuntimeDescriptor: legacy.missionRuntimeDescriptor,
    enumerate,
    instantiate,
    apply,
  });
}
