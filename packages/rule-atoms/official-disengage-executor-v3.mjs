import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  applyOfficialDisengageCasualtyV1,
  enumerateOfficialDisengageCasualtyV1,
  instantiateOfficialDisengageCasualtyV1,
  OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS,
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
} from "./official-disengage-casualty-executor-v1.mjs";
import {
  OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_CONTRACT,
  verifyOfficialCurrentMovementAuthorityLineageV1,
} from "./official-current-movement-authority-lineage-v1.mjs";
import { recordOfficialSupplyLossesV1 } from
  "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_DISENGAGE_V3_EXECUTOR_ID = "authority.disengage-v3";
export const OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION = "3.0.0";
export const OFFICIAL_DISENGAGE_V3_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DISENGAGE_V3_PARAMETER_KIND = "official_disengage_path_v3";
export const OFFICIAL_DISENGAGE_V3_EXECUTOR_ATOM_IDS = Object.freeze([
  ...OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ATOM_IDS,
]);
export const OFFICIAL_DISENGAGE_V3_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_DISENGAGE_CASUALTY_ACTION_ATOM_IDS,
]);

function clone(value) {
  return structuredClone(value);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(value)) fail("DISENGAGE_V3_RUNTIME_BINDING_REQUIRED");
  return value;
}

function diagnosticAction(state, sideKey, pieceId, error) {
  return {
    actionType: "disengage",
    sideKey,
    phase: "movement",
    pieceId,
    ruleAtomIds: [...OFFICIAL_DISENGAGE_V3_ACTION_ATOM_IDS],
    executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_disengage_v3_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function currentDomain(frozenDomain, lineage) {
  const core = {
    ...clone(frozenDomain),
    parameterKind: OFFICIAL_DISENGAGE_V3_PARAMETER_KIND,
    executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
    constraints: {
      ...clone(frozenDomain.constraints),
      currentHandoffContract: OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_CONTRACT,
      currentAuthorityLineageHash: lineage.lineageHash,
    },
    rulesTruth: "official_current_disengage_parameter_domain_v3",
    trainingTruth: false,
  };
  delete core.domainId;
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function currentAction(frozenAction) {
  return {
    ...clone(frozenAction),
    executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
  };
}

function frozenAction(current) {
  return {
    ...clone(current),
    executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialDisengageV3(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  let lineage;
  try {
    lineage = verifyOfficialCurrentMovementAuthorityLineageV1(state, {
      errorPrefix: "DISENGAGE_V3",
    });
  } catch (error) {
    const pieces = Array.isArray(state?.pieces)
      ? state.pieces.filter((piece) => (
        piece?.sideKey === sideKey
          && piece?.isOnField === true
          && piece?.isDestroyed !== true
          && Number(piece?.currentModels || 0) > 0
      ))
      : [];
    return {
      candidates: options.includeDisabled === true
        ? pieces.map((piece) => diagnosticAction(state, sideKey, String(piece.id || ""), error))
        : [],
      parameterDomains: [],
    };
  }
  const frozen = enumerateOfficialDisengageCasualtyV1(state, options);
  return {
    candidates: frozen.candidates.map((candidate) => ({
      ...clone(candidate),
      executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
      executorVersion: OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
      details: {
        ...clone(candidate.details || {}),
        currentAuthorityLineageHash: lineage.lineageHash,
        silentCompatibilityUsed: false,
      },
    })),
    parameterDomains: frozen.parameterDomains.map((domain) => currentDomain(domain, lineage)),
  };
}

export function instantiateOfficialDisengageV3(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_DISENGAGE_V3_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_DISENGAGE_V3_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION) {
    fail("DISENGAGE_V3_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialDisengageV3(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) {
    fail("DISENGAGE_V3_PARAMETER_DOMAIN_STALE");
  }
  const frozen = enumerateOfficialDisengageCasualtyV1(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const frozenDomain = frozen.parameterDomains.find((entry) => entry.pieceId === domain.pieceId);
  if (!frozenDomain) fail("DISENGAGE_V3_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialDisengageCasualtyV1(
    state,
    frozenDomain,
    parameters,
    options,
  );
  return {
    ...clone(instantiated),
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v3",
    action: currentAction(instantiated.action),
    rulesTruth: "official_current_disengage_instantiation_v3",
    frozenSemanticKernel:
      `${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID}@${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}

function parametersFromPlan(plan) {
  return {
    leadingModelId: plan.leadingModelId,
    leadingOutcome: plan.leadingOutcome,
    path: plan.leadingOutcome === "casualty"
      ? []
      : clone(plan.canonicalPath?.points?.slice(1) || []),
    placements: plan.leadingOutcome === "casualty"
      ? []
      : (plan.placementSequence || []).map((entry) => (
        entry.outcome === "casualty"
          ? { modelId: entry.modelId, outcome: "casualty" }
          : {
              modelId: entry.modelId,
              outcome: "placed",
              xMilliInches: entry.endpoint?.xMilliInches ?? entry.xMilliInches,
              yMilliInches: entry.endpoint?.yMilliInches ?? entry.yMilliInches,
            }
      )),
  };
}

export function applyOfficialDisengageV3(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "disengage"
    || actionInput.executorId !== OFFICIAL_DISENGAGE_V3_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION
    || !object(actionInput.disengagePlan)) {
    fail("DISENGAGE_V3_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialDisengageV3(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === actionInput.pieceId
  ));
  if (!domain) fail("DISENGAGE_V3_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialDisengageV3(
    stateInput,
    domain,
    parametersFromPlan(actionInput.disengagePlan),
    options,
  );
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("DISENGAGE_V3_ACTION_MISMATCH");
  }
  const frozen = applyOfficialDisengageCasualtyV1(
    stateInput,
    frozenAction(actionInput),
    options,
  );
  const state = clone(frozen.state);
  const baseEvents = clone(frozen.events || []).filter((event) => (
    event?.type !== "supply_loss_recorded"
  ));
  const recorded = recordOfficialSupplyLossesV1({
    stateBefore: stateInput,
    stateAfter: state,
    action: actionInput,
    events: baseEvents,
    rulesRuntimeHash: runtimeHash(options.matchBinding),
  });
  state.supplyLossLedger = clone(recorded.ledger);
  const events = [...baseEvents, ...clone(recorded.supplyLossEvents)];
  const lastLog = state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(actionInput);
    lastLog.events = clone(events);
  }
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_disengage_transition_v3",
    executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_current_disengage_exact_subset_v3",
    frozenSemanticKernel:
      `${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID}@${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
