import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID } from
  "../rule-atoms/official-reserve-deploy-executor-v5.mjs";
import {
  listOfficialUnsupportedActionRoutesV1,
  verifyOfficialStandardActionRouteCatalogueV1,
} from "./official-standard-action-route-catalogue-v1.mjs";
import {
  applyOfficialStandardReserveDeployV1,
  enumerateOfficialStandardReserveDeployV1,
  instantiateOfficialStandardReserveDeployV1,
  OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_ID,
  OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_VERSION,
  OFFICIAL_STANDARD_RESERVE_DEPLOY_PARAMETER_KIND,
  OFFICIAL_STANDARD_RESERVE_DEPLOY_PLAN_SCHEMA,
} from "./official-standard-reserve-deploy-adapter-v1.mjs";

export const OFFICIAL_STANDARD_ACTION_RUNTIME_ID =
  "starcraft-tmg-official-standard-action-runtime-v1";
export const OFFICIAL_STANDARD_ACTION_RUNTIME_VERSION = "1.0.0";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function deployRoute(value) {
  return value?.executorId === OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID
    && value?.actionType === "deploy";
}
function baseFailureDiagnostic(sideKey, phase, error) {
  return {
    schema: "starcraft_tmg_official_unsupported_action_diagnostic_v1",
    action: { actionType: "catalogue_runtime_temporarily_unavailable",
      sideKey, phase },
    disabledReason: "EXISTING_CATALOGUE_RUNTIME_ENUMERATION_FAILED",
    details: { errorCode: String(error?.message || error).split(":")[0],
      fallback: "standard_deploy_adapter_remains_available",
      blockingSeverity: "medium", trainingTruth: false },
  };
}

export function createOfficialStandardActionRuntimeV1(input = {}) {
  const baseRuntime = input.baseRuntime;
  const routeCatalogue = input.actionRouteCatalogue;
  if (!object(baseRuntime) || !object(baseRuntime.descriptor)
    || typeof baseRuntime.enumerate !== "function"
    || typeof baseRuntime.instantiate !== "function"
    || typeof baseRuntime.apply !== "function") {
    fail("STANDARD_ACTION_RUNTIME_BASE_INVALID");
  }
  verifyOfficialStandardActionRouteCatalogueV1(routeCatalogue);
  const unsupportedRouteCount = routeCatalogue.routeStatusCounts.unsupported_explicit;
  const descriptorBody = {
    ...clone(without(baseRuntime.descriptor, ["runtimeHash"])),
    runtimeId: OFFICIAL_STANDARD_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_STANDARD_ACTION_RUNTIME_VERSION,
    baseRuntimeHash: baseRuntime.descriptor.runtimeHash,
    actionRouteCatalogueHash: routeCatalogue.catalogueHash,
    productActionRouteDenominatorComplete: true,
    productUnsupportedFeatureRouteCount: unsupportedRouteCount,
    nonExecutableRuleAtomCount:
      Number(baseRuntime.descriptor.nonExecutableRuleAtomCount || 0)
        + unsupportedRouteCount,
    legalSpaceComplete: unsupportedRouteCount === 0
      && baseRuntime.descriptor.legalSpaceComplete === true,
    productionRoomEligible: false,
    runtimeAdapters: [{ adapterId: OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_ID,
      adapterVersion: OFFICIAL_STANDARD_RESERVE_DEPLOY_ADAPTER_VERSION,
      replacesBoundedExecutorEnumeration: OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID,
      parameterKind: OFFICIAL_STANDARD_RESERVE_DEPLOY_PARAMETER_KIND,
      scope: "standard_current_official_roster_straight_entry_deploy" }],
    rulesTruth: "catalogue_runtime_plus_explicit_standard_roster_action_routes",
    trainingTruth: false,
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    runtimeHash: hashStarcraftTmgContract(descriptorBody) });

  function enumerate(state, options = {}) {
    const sideKey = String(options.sideKey || state?.activeSideKey || "");
    const unsupportedDiagnostics = listOfficialUnsupportedActionRoutesV1(
      routeCatalogue, { sideKey, phase: state?.phase },
    );
    let base;
    try {
      base = baseRuntime.enumerate(state, options);
    } catch (error) {
      base = { schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
        stateSummary: { round: Number(state?.round || 0),
          phase: String(state?.phase || ""), activeSideKey: state?.activeSideKey || null },
        terminal: state?.terminal || state?.gameOver
          ? { gameOver: true, winner: String(state?.winner || ""),
            reason: String(state?.terminalReason || "") } : null,
        candidates: [], parameterDomains: [] };
      unsupportedDiagnostics.push(baseFailureDiagnostic(
        sideKey, String(state?.phase || ""), error,
      ));
    }
    const terminal = base.terminal || null;
    const candidates = (base.candidates || []).filter((entry) => !deployRoute(entry));
    const parameterDomains = (base.parameterDomains || [])
      .filter((entry) => !deployRoute(entry));
    if (!terminal && state?.phase === "movement") {
      const deploy = enumerateOfficialStandardReserveDeployV1(state, options);
      candidates.push(...deploy.candidates);
      parameterDomains.push(...deploy.parameterDomains);
    }
    return freezeDeep({ ...clone(base), rulesRuntimeHash: descriptor.runtimeHash,
      candidates: candidates.sort((left, right) => (
        String(left.actionType || "").localeCompare(String(right.actionType || ""))
          || String(left.pieceId || "").localeCompare(String(right.pieceId || ""))
      )),
      parameterDomains: parameterDomains.sort((left, right) => (
        left.domainId.localeCompare(right.domainId)
      )),
      unsupportedDiagnostics,
      legalSpaceComplete: false, developmentSubset: true,
      actionRouteCatalogueHash: routeCatalogue.catalogueHash,
      trainingTruth: false });
  }

  function instantiate(state, domain, parameters, options = {}) {
    if (domain?.parameterKind === OFFICIAL_STANDARD_RESERVE_DEPLOY_PARAMETER_KIND) {
      return instantiateOfficialStandardReserveDeployV1(
        state, domain, parameters, options,
      );
    }
    return baseRuntime.instantiate(state, domain, parameters, options);
  }

  function apply(state, action, options = {}) {
    if (action?.executorId === OFFICIAL_RESERVE_DEPLOY_V5_EXECUTOR_ID
      && action?.deployPlan?.schemaVersion === OFFICIAL_STANDARD_RESERVE_DEPLOY_PLAN_SCHEMA) {
      return applyOfficialStandardReserveDeployV1(state, action, options);
    }
    return baseRuntime.apply(state, action, options);
  }
  return freezeDeep({ descriptor, enumerate, instantiate, apply });
}
