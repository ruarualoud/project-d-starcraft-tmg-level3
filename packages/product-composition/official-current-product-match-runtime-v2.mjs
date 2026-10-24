import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { evaluateOfficialChargeLeadingEndpointCoverV1 } from
  "../rule-atoms/official-charge-endpoint-infeasibility-proof-v1.mjs";
import { evaluateOfficialChargeRoundLeadingEndpointCoverV2 } from
  "../rule-atoms/official-charge-endpoint-infeasibility-proof-v2.mjs";
import { OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS } from
  "../rule-atoms/official-marine-charge-executor-v2.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "./official-current-product-match-runtime-v1.mjs";
import {
  OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID,
  OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION,
} from "./official-current-product-match-runtime-v1.mjs";
import { applyOfficialSelectedRosterChargeResolutionTransitionV1 } from
  "./official-selected-roster-melee-action-runtime-v1.mjs";

export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID =
  "starcraft-tmg-official-current-product-match-runtime-v2";
export const OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_VERSION = "1.0.0";
export const OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND =
  "official_selected_roster_charge_endpoint_failure_v1";
export const OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND =
  "continuous_leading_endpoint_excluded";

const ENDPOINT_FAILURE_ATOM_ID =
  "rule-atom:selected-roster-charge-continuous-endpoint-failure-v1";
const CHARGE_ATOMS = Object.freeze([...new Set([
  ...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS,
  ENDPOINT_FAILURE_ATOM_ID,
])].sort());

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

function endpointCertificate(state) {
  const pending = state?.pendingAction;
  const actor = state?.pieces?.find((piece) => piece.id === pending?.pieceId);
  const leader = actor?.models?.find((model) =>
    model.id === pending?.chargePlan?.leadingModelId);
  const result = leader?.baseShape === "rectangle"
    ? evaluateOfficialChargeLeadingEndpointCoverV1(state, pending)
    : leader?.baseShape === "round"
      ? evaluateOfficialChargeRoundLeadingEndpointCoverV2(state, pending)
      : null;
  return result?.allPosesExcluded === true
    && result.omittedConstraintsCanOnlyEnlargeDomain === true
    && result.certificateKind === "leader_endpoint_terrain_or_occupancy_blocked"
    ? result : null;
}

function failureDomain(state, certificate) {
  const pending = state.pendingAction;
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND,
    actionType: "resolve_charge",
    sideKey: pending.sideKey,
    phase: "assault",
    pieceId: pending.pieceId,
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_VERSION,
    ruleAtomIds: [...CHARGE_ATOMS],
    parameterSchema: {
      type: "object",
      required: ["outcome", "failureProof"],
      outcome: ["failure"],
      failureProofKind: OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND,
    },
    constraints: {
      pendingHash: pending.pendingHash,
      declarationChargePlanHash: pending.chargePlan.chargePlanHash,
      certificateSchemaVersion: certificate.schemaVersion,
      certificateHash: hashStarcraftTmgContract(certificate),
      maxDistanceMilliInches: pending.maxDistanceMilliInches,
      exactContinuousLeadingEndpointExclusion: true,
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_charge_continuous_endpoint_failure_v1",
    trainingTruth: false,
  };
  return Object.freeze({ ...core,
    domainId: `sc-domain-${hashStarcraftTmgContract(core)}` });
}

function endpointFailureInstantiation(state, domain, parameters,
  currentDomain, certificate) {
  if (!isDeepStrictEqual(domain, currentDomain)
    || !object(parameters)
    || Object.keys(parameters).sort().join(",") !== "failureProof,outcome"
    || parameters.outcome !== "failure"
    || !object(parameters.failureProof)
    || Object.keys(parameters.failureProof).join(",") !== "kind"
    || parameters.failureProof.kind
      !== OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND) {
    fail("CHARGE_ENDPOINT_FAILURE_DOMAIN_OR_PARAMETERS_INVALID");
  }
  const pending = state.pendingAction;
  const canonicalParameters = {
    outcome: "failure",
    failureProof: { kind: OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND },
  };
  const proof = {
    kind: OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND,
    certificateSchemaVersion: certificate.schemaVersion,
    certificateHash: hashStarcraftTmgContract(certificate),
    certificateKind: certificate.certificateKind,
    examinedCells: certificate.examinedCells,
    excludedByReason: clone(certificate.excludedByReason),
    recomputedByRules: true,
    trainingTruth: false,
  };
  const plan = seal({
    schemaVersion: "starcraft_tmg_selected_roster_charge_resolution_plan_v2",
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
    rulesTruth: "official_charge_continuous_endpoint_failure_v1",
    trainingTruth: false,
  }, "chargeResolutionPlanHash");
  const action = Object.freeze({
    actionType: "resolve_charge",
    sideKey: pending.sideKey,
    phase: "assault",
    pieceId: pending.pieceId,
    chargeResolutionPlan: plan,
    chance: null,
    ruleAtomIds: [...CHARGE_ATOMS],
    executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID,
    executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_VERSION,
  });
  return {
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters,
    action,
    rulesTruth: "official_charge_continuous_endpoint_failure_v1",
    trainingTruth: false,
  };
}

export function createOfficialCurrentProductMatchRuntimeV2(input = {}) {
  // A late Room can contain summoned pieces absent from the opening roster.
  // Reuse its original frozen runtime rather than rebuilding it from rN state.
  const legacy = input.legacyRuntime
    || createOfficialCurrentProductMatchRuntimeV1(input);
  const legacyDescriptor = legacy.descriptor;
  if (legacyDescriptor?.runtimeId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_ID
    || legacyDescriptor.runtimeVersion
      !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_VERSION
    || legacyDescriptor.runtimeHash !== hashStarcraftTmgContract(
      without(legacyDescriptor, ["runtimeHash"]))
    || typeof legacy.enumerate !== "function"
    || typeof legacy.instantiate !== "function"
    || typeof legacy.apply !== "function") {
    fail("CHARGE_ENDPOINT_FAILURE_LEGACY_RUNTIME_INVALID");
  }
  const executableRuleAtomIds = [...new Set([
    ...legacyDescriptor.executableRuleAtomIds,
    ENDPOINT_FAILURE_ATOM_ID,
  ])].sort();
  const descriptorBody = {
    ...without(legacyDescriptor, ["runtimeHash"]),
    runtimeId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID,
    runtimeVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_VERSION,
    rulesVersion: "official-current-product-standard-2000-match-v2",
    catalogueHash: hashStarcraftTmgContract({
      legacyCatalogueHash: legacyDescriptor.catalogueHash,
      endpointFailureAtomId: ENDPOINT_FAILURE_ATOM_ID,
      proofVersions: ["starcraft_tmg_charge_endpoint_conservative_cover_v1",
        "starcraft_tmg_charge_round_endpoint_conservative_cover_v2"],
    }),
    executorManifest: [...legacyDescriptor.executorManifest, {
      executorId: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID,
      executorVersion: OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_VERSION,
      actionTypes: ["resolve_charge"],
    }],
    executableRuleAtomIds,
    executableRuleAtomCount: executableRuleAtomIds.length,
    legacyRuntimeHash: legacyDescriptor.runtimeHash,
    chargeEndpointFailureProofKind: OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND,
    // The two concrete fork probes below are not a production Room admission.
    productionRoomEligible: false,
  };
  const descriptor = seal(descriptorBody, "runtimeHash");

  function enumerate(state, options = {}) {
    const original = legacy.enumerate(state, options);
    const legacyChargeDomain = original.parameterDomains.find((domain) =>
      domain.actionType === "resolve_charge");
    const certificate = legacyChargeDomain ? endpointCertificate(state) : null;
    const endpointDomain = certificate
      ? failureDomain(state, certificate) : null;
    return {
      ...original,
      rulesRuntimeHash: descriptor.runtimeHash,
      parameterDomains: endpointDomain
        ? [...original.parameterDomains.filter((domain) =>
          domain !== legacyChargeDomain), endpointDomain]
        : original.parameterDomains,
      chargeEndpointFailureDomainVersion: endpointDomain
        ? OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND : null,
      trainingTruth: false,
    };
  }

  function instantiate(state, domain, parameters, options = {}) {
    if (domain?.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID) {
      return legacy.instantiate(state, domain, parameters, options);
    }
    const current = enumerate(state, options).parameterDomains.find((item) =>
      item.domainId === domain.domainId);
    const certificate = current ? endpointCertificate(state) : null;
    if (!certificate || !current) fail("CHARGE_ENDPOINT_FAILURE_DOMAIN_STALE");
    return endpointFailureInstantiation(state, domain, parameters,
      current, certificate);
  }

  function apply(state, action, options = {}) {
    if (action?.executorId !== OFFICIAL_CURRENT_PRODUCT_MATCH_RUNTIME_V2_ID) {
      const result = legacy.apply(state, action, options);
      return { ...result, runtimeId: descriptor.runtimeId,
        runtimeVersion: descriptor.runtimeVersion };
    }
    const domain = enumerate(state, options).parameterDomains.find((item) =>
      item.domainId === action?.chargeResolutionPlan?.domainId);
    if (!domain) fail("CHARGE_ENDPOINT_FAILURE_DOMAIN_STALE");
    const expected = instantiate(state, domain,
      action.chargeResolutionPlan.canonicalParameters, options);
    if (!isDeepStrictEqual(expected.action, action)) {
      fail("CHARGE_ENDPOINT_FAILURE_ACTION_STALE");
    }
    const transition = applyOfficialSelectedRosterChargeResolutionTransitionV1(
      state, action);
    return {
      ok: true,
      schemaVersion: "starcraft_tmg_current_product_match_transition_v2",
      runtimeId: descriptor.runtimeId,
      runtimeVersion: descriptor.runtimeVersion,
      postRevision: Number(options.postRevision || 0),
      state: transition.state,
      action: clone(action),
      events: transition.events,
      rulesTruth: "official_charge_continuous_endpoint_failure_v1",
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
