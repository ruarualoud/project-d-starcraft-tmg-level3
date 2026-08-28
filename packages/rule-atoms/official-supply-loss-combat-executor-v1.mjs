import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from "../source-data/official-gameplay-data-bundle-v1.mjs";
import {
  applyOfficialOutOfCoherencyCloseRanksV1,
  enumerateOfficialOutOfCoherencyCloseRanksV1,
  instantiateOfficialOutOfCoherencyCloseRanksV1,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ATOM_IDS,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND,
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS,
} from "./official-out-of-coherency-close-ranks-combat-executor-v1.mjs";
import {
  recordOfficialSupplyLossesV1,
  verifyOfficialSupplyLossLedgerV1,
} from "./official-supply-loss-ledger-v1.mjs";

export const OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID =
  "authority.close-combat-attack-v5";
export const OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION = "5.0.0";
export const OFFICIAL_SUPPLY_LOSS_COMBAT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SUPPLY_LOSS_COMBAT_PARAMETER_KIND =
  OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_PARAMETER_KIND;
export const OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ATOM_IDS = Object.freeze([
  ...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ATOM_IDS,
]);
export const OFFICIAL_SUPPLY_LOSS_COMBAT_DECLINE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_DECLINE_ACTION_ATOM_IDS,
]);
export const OFFICIAL_SUPPLY_LOSS_COMBAT_SINGLE_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_SINGLE_MOVE_ACTION_ATOM_IDS,
]);
export const OFFICIAL_SUPPLY_LOSS_COMBAT_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_LEGACY_MULTI_MOVE_ACTION_ATOM_IDS,
]);
export const OFFICIAL_SUPPLY_LOSS_COMBAT_MOVE_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_MOVE_ACTION_ATOM_IDS,
]);

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

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!/^[a-f0-9]{64}$/u.test(value)) fail("SUPPLY_LOSS_RUNTIME_BINDING_REQUIRED");
  return value;
}

function validateCurrentBinding(state, matchBinding) {
  const gameplayDataBundle = state?.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== matchBinding.dataSnapshotHash) {
    fail("SUPPLY_LOSS_COMBAT_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(matchBinding);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round || 1),
    rulesRuntimeHash: boundRuntimeHash,
  });
  return { gameplayDataBundle, boundRuntimeHash };
}

function compatibilityContext(state, matchBinding) {
  const validated = validateCurrentBinding(state, matchBinding);
  const compatibilityState = clone(state);
  compatibilityState.officialCombatProfileBundle =
    clone(validated.gameplayDataBundle.combatProfileBundle);
  const compatibilityMatchBinding = {
    ...clone(matchBinding),
    dataSnapshotHash: hashStarcraftTmgContract(
      validated.gameplayDataBundle.combatProfileBundle,
    ),
  };
  return {
    ...validated,
    compatibilityState,
    compatibilityMatchBinding,
  };
}

function rewriteAction(action, executorId, executorVersion) {
  return {
    ...clone(action),
    executorId,
    executorVersion,
  };
}

function rewriteDomain(domain, executorId, executorVersion) {
  const body = {
    ...without(clone(domain), ["domainId"]),
    executorId,
    executorVersion,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function currentAction(action) {
  return rewriteAction(
    action,
    OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
    OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
  );
}

function legacyAction(action) {
  return rewriteAction(
    action,
    OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID,
    OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION,
  );
}

function currentDomain(domain) {
  return rewriteDomain(
    domain,
    OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
    OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
  );
}

function legacyDomain(domain) {
  return rewriteDomain(
    domain,
    OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_ID,
    OFFICIAL_OUT_OF_COHERENCY_CLOSE_RANKS_EXECUTOR_VERSION,
  );
}

function disabledResult(state, sideKey, error) {
  return {
    candidates: [{
      actionType: "fight",
      sideKey,
      phase: String(state?.phase || "combat"),
      pieceId: "",
      targetId: "",
      weaponName: "",
      closeRanksMode: "decline",
      ruleAtomIds: [...OFFICIAL_SUPPLY_LOSS_COMBAT_DECLINE_ACTION_ATOM_IDS],
      executorId: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID,
      executorVersion: OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION,
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: {
        rulesTruth: "official_supply_loss_combat_fail_closed",
        trainingTruth: false,
      },
    }],
    parameterDomains: [],
  };
}

export function enumerateOfficialSupplyLossCombatV1(state, options = {}) {
  let context;
  try {
    context = compatibilityContext(state, options.matchBinding);
  } catch (error) {
    if (options.includeDisabled !== true) return { candidates: [], parameterDomains: [] };
    return disabledResult(state, String(options.sideKey || state?.activeSideKey || ""), error);
  }
  const previous = enumerateOfficialOutOfCoherencyCloseRanksV1(
    context.compatibilityState,
    {
      ...options,
      matchBinding: context.compatibilityMatchBinding,
    },
  );
  return {
    candidates: previous.candidates.map(currentAction),
    parameterDomains: previous.parameterDomains.map(currentDomain),
  };
}

export function instantiateOfficialSupplyLossCombatV1(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.executorId !== OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION) {
    fail("SUPPLY_LOSS_COMBAT_PARAMETER_DOMAIN_INVALID");
  }
  const context = compatibilityContext(state, options.matchBinding);
  const previous = instantiateOfficialOutOfCoherencyCloseRanksV1(
    context.compatibilityState,
    legacyDomain(domain),
    parameters,
    {
      ...options,
      matchBinding: context.compatibilityMatchBinding,
    },
  );
  const result = clone(previous);
  result.action = currentAction(previous.action);
  if (result.postMoveState) delete result.postMoveState.officialCombatProfileBundle;
  result.rulesTruth = "official_combat_with_round_scoped_supply_loss_witness";
  result.trainingTruth = false;
  return result;
}

export function applyOfficialSupplyLossCombatV1(state, action, options = {}) {
  if (!object(action)
    || action.actionType !== "fight"
    || action.executorId !== OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID
    || action.executorVersion !== OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION) {
    fail("SUPPLY_LOSS_COMBAT_ACTION_INVALID");
  }
  const context = compatibilityContext(state, options.matchBinding);
  const previous = applyOfficialOutOfCoherencyCloseRanksV1(
    context.compatibilityState,
    legacyAction(action),
    {
      ...options,
      matchBinding: context.compatibilityMatchBinding,
    },
  );
  const result = clone(previous);
  delete result.state.officialCombatProfileBundle;
  const recorded = recordOfficialSupplyLossesV1({
    stateBefore: state,
    stateAfter: result.state,
    action,
    events: result.events,
    rulesRuntimeHash: context.boundRuntimeHash,
  });
  result.state.supplyLossLedger = clone(recorded.ledger);
  result.events = [...clone(result.events), ...clone(recorded.supplyLossEvents)];
  result.action = clone(action);
  result.executorId = OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_ID;
  result.executorVersion = OFFICIAL_SUPPLY_LOSS_COMBAT_EXECUTOR_VERSION;
  result.schemaVersion = "starcraft_tmg_official_supply_loss_combat_transition_v1";
  const lastLog = result.state.log?.at(-1);
  if (lastLog) {
    lastLog.action = clone(action);
    lastLog.events = clone(result.events);
  }
  result.rulesTruth = "official_combat_with_round_scoped_supply_loss_witness";
  result.trainingTruth = false;
  return result;
}

