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
  OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_V2_CONTRACT,
  verifyOfficialCurrentMovementAuthorityLineageV2,
} from "./official-current-movement-authority-lineage-v2.mjs";
import {
  createOfficialFrozenNoUpgradeMovementViewV1,
  restoreOfficialMovementLoadoutsV1,
} from "./official-current-movement-frozen-loadout-adapter-v1.mjs";
import { recordOfficialSupplyLossesV1 } from
  "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_DISENGAGE_V4_EXECUTOR_ID = "authority.disengage-v4";
export const OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION = "4.0.0";
export const OFFICIAL_DISENGAGE_V4_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DISENGAGE_V4_PARAMETER_KIND = "official_disengage_path_v4";
export const OFFICIAL_DISENGAGE_V4_EXECUTOR_ATOM_IDS = Object.freeze([
  ...OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ATOM_IDS,
]);
export const OFFICIAL_DISENGAGE_V4_ACTION_ATOM_IDS = Object.freeze([
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
  if (!/^[a-f0-9]{64}$/u.test(value)) fail("DISENGAGE_V4_RUNTIME_BINDING_REQUIRED");
  return value;
}

function diagnosticAction(sideKey, pieceId, error) {
  return {
    actionType: "disengage",
    sideKey,
    phase: "movement",
    pieceId,
    ruleAtomIds: [...OFFICIAL_DISENGAGE_V4_ACTION_ATOM_IDS],
    executorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_disengage_v4_fail_closed",
      silentCompatibilityUsed: false,
      trainingTruth: false,
    },
  };
}

function frozenView(state, lineage) {
  return createOfficialFrozenNoUpgradeMovementViewV1(state, {
    selectedUpgradeLoadoutHash: lineage.selectedUpgradeLoadoutHash,
  });
}

function currentDomain(frozenDomain, lineage) {
  const core = {
    ...clone(frozenDomain),
    parameterKind: OFFICIAL_DISENGAGE_V4_PARAMETER_KIND,
    executorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
    constraints: {
      ...clone(frozenDomain.constraints),
      currentHandoffContract: OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_V2_CONTRACT,
      currentAuthorityLineageHash: lineage.lineageHash,
      selectedUpgradeLoadoutHash: lineage.selectedUpgradeLoadoutHash,
    },
    rulesTruth: "official_current_disengage_parameter_domain_v4",
    trainingTruth: false,
  };
  delete core.domainId;
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function currentAction(frozenAction) {
  return {
    ...clone(frozenAction),
    executorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
  };
}

function frozenAction(current) {
  return {
    ...clone(current),
    executorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialDisengageV4(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  let lineage;
  let adapted;
  try {
    lineage = verifyOfficialCurrentMovementAuthorityLineageV2(state, {
      errorPrefix: "DISENGAGE_V4",
    });
    adapted = frozenView(state, lineage);
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
        ? pieces.map((piece) => diagnosticAction(sideKey, String(piece.id || ""), error))
        : [],
      parameterDomains: [],
    };
  }
  const frozen = enumerateOfficialDisengageCasualtyV1(adapted.frozenState, options);
  return {
    candidates: frozen.candidates.map((candidate) => ({
      ...clone(candidate),
      executorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
      executorVersion: OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
      details: {
        ...clone(candidate.details || {}),
        currentAuthorityLineageHash: lineage.lineageHash,
        selectedUpgradeLoadoutHash: lineage.selectedUpgradeLoadoutHash,
        silentCompatibilityUsed: false,
      },
    })),
    parameterDomains: frozen.parameterDomains.map((domain) => currentDomain(domain, lineage)),
  };
}

export function instantiateOfficialDisengageV4(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_DISENGAGE_V4_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_DISENGAGE_V4_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION) {
    fail("DISENGAGE_V4_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialDisengageV4(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) {
    fail("DISENGAGE_V4_PARAMETER_DOMAIN_STALE");
  }
  const lineage = verifyOfficialCurrentMovementAuthorityLineageV2(state, {
    errorPrefix: "DISENGAGE_V4",
  });
  const adapted = frozenView(state, lineage);
  const frozen = enumerateOfficialDisengageCasualtyV1(adapted.frozenState, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const frozenDomain = frozen.parameterDomains.find((entry) => entry.pieceId === domain.pieceId);
  if (!frozenDomain) fail("DISENGAGE_V4_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialDisengageCasualtyV1(
    adapted.frozenState,
    frozenDomain,
    parameters,
    options,
  );
  return {
    ...clone(instantiated),
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v4",
    action: currentAction(instantiated.action),
    rulesTruth: "official_current_disengage_instantiation_v4",
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

export function applyOfficialDisengageV4(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "disengage"
    || actionInput.executorId !== OFFICIAL_DISENGAGE_V4_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION
    || !object(actionInput.disengagePlan)) {
    fail("DISENGAGE_V4_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialDisengageV4(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === actionInput.pieceId
  ));
  if (!domain) fail("DISENGAGE_V4_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialDisengageV4(
    stateInput,
    domain,
    parametersFromPlan(actionInput.disengagePlan),
    options,
  );
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("DISENGAGE_V4_ACTION_MISMATCH");
  }
  const lineage = verifyOfficialCurrentMovementAuthorityLineageV2(stateInput, {
    errorPrefix: "DISENGAGE_V4",
  });
  const adapted = frozenView(stateInput, lineage);
  const frozen = applyOfficialDisengageCasualtyV1(
    adapted.frozenState,
    frozenAction(actionInput),
    options,
  );
  const state = restoreOfficialMovementLoadoutsV1(stateInput, frozen.state, {
    selectedUpgradeLoadoutHash: lineage.selectedUpgradeLoadoutHash,
  });
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
    schemaVersion: "starcraft_tmg_official_disengage_transition_v4",
    executorId: OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V4_EXECUTOR_VERSION,
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_current_disengage_exact_subset_v4",
    frozenSemanticKernel:
      `${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID}@${OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
