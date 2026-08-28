import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_V2_CONTRACT,
  verifyOfficialCurrentMovementAuthorityLineageV2,
} from "./official-current-movement-authority-lineage-v2.mjs";
import {
  createOfficialFrozenNoUpgradeMovementViewV1,
  restoreOfficialMovementLoadoutsV1,
} from "./official-current-movement-frozen-loadout-adapter-v1.mjs";
import {
  applyOfficialStandardMoveV1,
  enumerateOfficialStandardMoveV1,
  instantiateOfficialStandardMoveV1,
  OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS,
} from "./official-standard-move-executor-v1.mjs";

export const OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID = "authority.standard-move-v4";
export const OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION = "4.0.0";
export const OFFICIAL_STANDARD_MOVE_V4_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STANDARD_MOVE_V4_PARAMETER_KIND =
  "official_standard_move_path_v4";
export const OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ATOM_IDS = Object.freeze([
  ...OFFICIAL_STANDARD_MOVE_NEW_ATOM_IDS,
]);
export const OFFICIAL_STANDARD_MOVE_V4_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_STANDARD_MOVE_ACTION_ATOM_IDS,
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

function diagnosticAction(sideKey, pieceId, error) {
  return {
    actionType: "move",
    sideKey,
    phase: "movement",
    pieceId,
    ruleAtomIds: [...OFFICIAL_STANDARD_MOVE_V4_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_standard_move_v4_fail_closed",
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
    parameterKind: OFFICIAL_STANDARD_MOVE_V4_PARAMETER_KIND,
    executorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
    constraints: {
      ...clone(frozenDomain.constraints),
      currentHandoffContract: OFFICIAL_CURRENT_MOVEMENT_AUTHORITY_LINEAGE_V2_CONTRACT,
      currentAuthorityLineageHash: lineage.lineageHash,
      selectedUpgradeLoadoutHash: lineage.selectedUpgradeLoadoutHash,
    },
    rulesTruth: "official_current_standard_move_parameter_domain_v4",
    trainingTruth: false,
  };
  delete core.domainId;
  return { ...core, domainId: `sc-domain-${hashStarcraftTmgContract(core)}` };
}

function currentAction(frozenAction) {
  return {
    ...clone(frozenAction),
    executorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
  };
}

function frozenAction(current) {
  return {
    ...clone(current),
    executorId: OFFICIAL_STANDARD_MOVE_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialStandardMoveV4(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  let lineage;
  let adapted;
  try {
    lineage = verifyOfficialCurrentMovementAuthorityLineageV2(state, {
      errorPrefix: "STANDARD_MOVE_V4",
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
  const frozen = enumerateOfficialStandardMoveV1(adapted.frozenState, options);
  return {
    candidates: frozen.candidates.map((candidate) => ({
      ...clone(candidate),
      executorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
      executorVersion: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
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

export function instantiateOfficialStandardMoveV4(state, domain, parameters, options = {}) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_STANDARD_MOVE_V4_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION) {
    fail("STANDARD_MOVE_V4_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialStandardMoveV4(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const expected = current.parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!expected || !isDeepStrictEqual(domain, expected)) {
    fail("STANDARD_MOVE_V4_PARAMETER_DOMAIN_STALE");
  }
  const lineage = verifyOfficialCurrentMovementAuthorityLineageV2(state, {
    errorPrefix: "STANDARD_MOVE_V4",
  });
  const adapted = frozenView(state, lineage);
  const frozen = enumerateOfficialStandardMoveV1(adapted.frozenState, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const frozenDomain = frozen.parameterDomains.find((entry) => entry.pieceId === domain.pieceId);
  if (!frozenDomain) fail("STANDARD_MOVE_V4_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStandardMoveV1(
    adapted.frozenState,
    frozenDomain,
    parameters,
    options,
  );
  return {
    ...clone(instantiated),
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v4",
    action: currentAction(instantiated.action),
    rulesTruth: "official_current_standard_move_instantiation_v4",
    frozenSemanticKernel:
      `${OFFICIAL_STANDARD_MOVE_EXECUTOR_ID}@${OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}

export function applyOfficialStandardMoveV4(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== "move"
    || actionInput.executorId !== OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION
    || !object(actionInput.movePlan)) {
    fail("STANDARD_MOVE_V4_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialStandardMoveV4(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.pieceId === actionInput.pieceId
  ));
  if (!domain) fail("STANDARD_MOVE_V4_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialStandardMoveV4(stateInput, domain, {
    leadingModelId: actionInput.movePlan.leadingModelId,
    path: actionInput.movePlan.canonicalPath?.points?.slice(1),
    placements: actionInput.movePlan.placementSequence,
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("STANDARD_MOVE_V4_ACTION_MISMATCH");
  }
  const lineage = verifyOfficialCurrentMovementAuthorityLineageV2(stateInput, {
    errorPrefix: "STANDARD_MOVE_V4",
  });
  const adapted = frozenView(stateInput, lineage);
  const frozen = applyOfficialStandardMoveV1(
    adapted.frozenState,
    frozenAction(actionInput),
    options,
  );
  const state = restoreOfficialMovementLoadoutsV1(stateInput, frozen.state, {
    selectedUpgradeLoadoutHash: lineage.selectedUpgradeLoadoutHash,
  });
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(actionInput);
  return {
    ...frozen,
    schemaVersion: "starcraft_tmg_official_standard_move_transition_v4",
    executorId: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_VERSION,
    state,
    action: clone(actionInput),
    rulesTruth: "official_current_standard_move_exact_subset_v4",
    frozenSemanticKernel:
      `${OFFICIAL_STANDARD_MOVE_EXECUTOR_ID}@${OFFICIAL_STANDARD_MOVE_EXECUTOR_VERSION}`,
    silentCompatibilityUsed: false,
    trainingTruth: false,
  };
}
