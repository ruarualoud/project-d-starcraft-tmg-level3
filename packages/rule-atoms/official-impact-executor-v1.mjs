import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialImpactStateBindingV1 } from
  "../source-data/official-impact-profile-bundle-v1.mjs";

export const OFFICIAL_IMPACT_EXECUTOR_ID = "authority.impact-v1";
export const OFFICIAL_IMPACT_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_IMPACT_TRANSITION_SCHEMA = "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_IMPACT_ACTION_TYPE = "resolve_impact";
export const OFFICIAL_IMPACT_PARAMETER_KIND = "official_impact_allocation_v1";
export const OFFICIAL_IMPACT_PENDING_SCHEMA =
  "starcraft_tmg_official_impact_pending_v1";

export const OFFICIAL_IMPACT_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:impact-no-surge-damage-one",
  "rule-atom:singleton:core-11-impact-charge-trigger-eligibility:1d52d4263e11",
  "rule-atom:singleton:core-11-impact-hit-roll-per-target:281b29f77e94",
  "rule-atom:singleton:core-11-impact-hit-threshold-armour:26eb888d6376",
  "rule-atom:singleton:core-11-impact-multiple-enemy-allocation:be4dbf750158",
  "rule-atom:singleton:core-11-impact-single-enemy-allocation:fc5a76f34fee",
].sort());

const SHARED_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-5-1-armour:246d3a616a04",
  "rule-atom:singleton:core-8-7-4-armour-pool-roll:f0d49afb850a",
  "rule-atom:singleton:core-8-7-4-armour-result-transfer:2bb56af0195e",
].sort());

export const OFFICIAL_IMPACT_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([...OFFICIAL_IMPACT_NEW_ATOM_IDS, ...SHARED_ATOM_IDS]),
].sort());
export const OFFICIAL_IMPACT_EXECUTOR_ATOM_IDS = OFFICIAL_IMPACT_ACTION_ATOM_IDS;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) {
  return hashStarcraftTmgContract(without(value, [field]));
}
function active(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece.currentModels || 0) === 1;
}
function currentModel(piece) {
  const rows = (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
  if (rows.length !== 1) fail("IMPACT_UNIT_DENOMINATOR_UNSUPPORTED", piece?.id);
  return rows[0];
}
function point(model) {
  const xMilliInches = Math.round(Number(model?.xInches) * 1000);
  const yMilliInches = Math.round(Number(model?.yInches) * 1000);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail("IMPACT_MODEL_GEOMETRY_INVALID", model?.id);
  }
  return { xMilliInches, yMilliInches };
}
function verifyPiece(piece, profile, { target = false } = {}) {
  const model = currentModel(piece);
  if (!active(piece)
    || piece.officialUnitRecordKey !== profile.commandCenterRecordKey
    || piece.sourceRecordHash !== profile.sourceRecordHash
    || piece.officialPayloadHash !== profile.payloadHash
    || piece.combatTag !== "ground"
    || !piece.combatTags?.includes("ground")
    || piece.combatTags?.includes("flying")
    || piece.selectedUpgradeNames?.length !== 0
    || piece.statuses?.length !== 0
    || model.baseShape !== "round"
    || Math.round(Number(model.baseWidthInches) * 1000) !== profile.baseDiameterMilliInches
    || Math.round(Number(model.baseDepthInches) * 1000) !== profile.baseDiameterMilliInches
    || model.elevation !== "ground"
    || (target && Number(piece.damageMarker || 0) !== 0)) {
    fail("IMPACT_UNIT_DENOMINATOR_UNSUPPORTED", String(piece?.id || ""));
  }
  return model;
}

function stateProjection(state, pending) {
  const profile = verifyOfficialImpactStateBindingV1(state);
  const actor = state.pieces?.find((piece) => piece.id === pending.pieceId);
  verifyPiece(actor, profile);
  const targets = pending.targetUnitIds.map((unitId) => {
    const piece = state.pieces.find((entry) => entry.id === unitId);
    const model = verifyPiece(piece, profile, { target: true });
    return {
      unitId,
      modelId: model.id,
      sideKey: piece.sideKey,
      point: point(model),
      damageMarker: Number(piece.damageMarker || 0),
      sourceRecordHash: piece.sourceRecordHash,
    };
  });
  return hashStarcraftTmgContract({
    round: Number(state.round),
    phase: state.phase,
    activeSideKey: state.activeSideKey,
    pieceId: actor.id,
    actorModel: { modelId: currentModel(actor).id, point: point(currentModel(actor)) },
    targets,
    profileHash: profile.profileHash,
    trainingTruth: false,
  });
}

function verifyPending(state) {
  const pending = state?.pendingAction;
  const profile = verifyOfficialImpactStateBindingV1(state);
  if (!object(pending)
    || pending.schema !== OFFICIAL_IMPACT_PENDING_SCHEMA
    || pending.stage !== "allocate_and_resolve_impact_after_successful_charge"
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.round !== Number(state.round)
    || pending.phase !== "assault"
    || pending.sideKey !== state.activeSideKey
    || pending.sourceProfileHash !== profile.profileHash
    || pending.impactDice !== 4
    || pending.hitThreshold !== 3
    || pending.armourThreshold !== 4
    || pending.damage !== 1
    || pending.surge !== null
    || !Array.isArray(pending.targetUnitIds)
    || pending.targetUnitIds.length === 0
    || new Set(pending.targetUnitIds).size !== pending.targetUnitIds.length
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.trainingTruth !== false) {
    fail("IMPACT_PENDING_INVALID");
  }
  return { pending, profile };
}

export function openOfficialImpactPendingV1(stateInput, input = {}) {
  const state = clone(stateInput);
  const profile = verifyOfficialImpactStateBindingV1(state);
  const actor = state.pieces?.find((piece) => (
    piece.id === input.pieceId && piece.sideKey === input.sideKey
  ));
  verifyPiece(actor, profile);
  const targetUnitIds = [...new Set((input.targetUnitIds || []).map(String))].sort();
  if (state.phase !== "assault"
    || state.activeSideKey !== input.sideKey
    || targetUnitIds.length === 0
    || input.chargeSucceeded !== true
    || !String(input.chargeResolutionHash || "").match(/^[a-f0-9]{64}$/u)) {
    fail("IMPACT_TRIGGER_INVALID");
  }
  for (const unitId of targetUnitIds) {
    const target = state.pieces.find((piece) => piece.id === unitId);
    verifyPiece(target, profile, { target: true });
    if (target.sideKey === input.sideKey) fail("IMPACT_TARGET_INVALID", unitId);
  }
  const pendingBody = {
    schema: OFFICIAL_IMPACT_PENDING_SCHEMA,
    stage: "allocate_and_resolve_impact_after_successful_charge",
    round: Number(state.round),
    phase: "assault",
    sideKey: input.sideKey,
    pieceId: input.pieceId,
    targetUnitIds,
    impactDice: profile.impactDice,
    hitThreshold: profile.impactHitThreshold,
    armourThreshold: profile.armourThreshold,
    damage: profile.impactDamage,
    surge: profile.impactSurge,
    sourceProfileHash: profile.profileHash,
    chargeResolutionHash: input.chargeResolutionHash,
    openedAtRevision: Number(input.openedAtRevision || 0),
    stateProjectionHash: "",
    trainingTruth: false,
  };
  pendingBody.stateProjectionHash = stateProjection(state, pendingBody);
  const pending = { ...pendingBody, pendingHash: hashStarcraftTmgContract(pendingBody) };
  state.pendingAction = pending;
  const event = {
    type: "impact_triggered_after_successful_charge",
    sideKey: input.sideKey,
    pieceId: input.pieceId,
    targetUnitIds,
    impactDice: 4,
    pendingHash: pending.pendingHash,
    chargeResolutionHash: input.chargeResolutionHash,
    trainingTruth: false,
  };
  return { state, pending, event };
}

function domainFor(state, options = {}) {
  const { pending, profile } = verifyPending(state);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_IMPACT_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "assault",
    sideKey: pending.sideKey,
    actionType: OFFICIAL_IMPACT_ACTION_TYPE,
    pieceId: pending.pieceId,
    executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
    executorVersion: OFFICIAL_IMPACT_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_IMPACT_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["allocations"],
      allocationUnit: "impact_die",
      targetUnitIds: [...pending.targetUnitIds],
      exactTotal: pending.impactDice,
      singleTargetForcedAllocation: pending.targetUnitIds.length === 1,
    },
    constraints: {
      pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      sourceProfileHash: profile.profileHash,
      targetUnitIds: [...pending.targetUnitIds],
      impactDice: 4,
      hitThreshold: 3,
      armourThreshold: 4,
      surge: null,
      damage: 1,
      rollTargetsSeparately: true,
      armourImmediatelyAfterEachTargetHitRoll: true,
      casualtyScope: "unhurt_single_model_goliath_hp10_nonlethal",
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_current_impact_allocation_and_resolution_domain",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

function allocationsFor(domain, input) {
  if (!Array.isArray(input)) fail("IMPACT_ALLOCATIONS_REQUIRED");
  const targetIds = domain.constraints.targetUnitIds;
  const seen = new Set();
  const rows = input.map((entry) => {
    const targetUnitId = String(entry?.targetUnitId || "");
    const dice = Number(entry?.dice);
    if (!targetIds.includes(targetUnitId)
      || seen.has(targetUnitId)
      || !Number.isSafeInteger(dice)
      || dice < 0
      || dice > 4
      || Object.keys(entry || {}).some((key) => !["targetUnitId", "dice"].includes(key))) {
      fail("IMPACT_ALLOCATION_INVALID", targetUnitId);
    }
    seen.add(targetUnitId);
    return { targetUnitId, dice };
  }).sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId));
  if (rows.length !== targetIds.length
    || rows.reduce((total, row) => total + row.dice, 0) !== 4
    || (targetIds.length === 1 && rows[0]?.dice !== 4)) {
    fail("IMPACT_ALLOCATION_DENOMINATOR_INVALID");
  }
  return rows;
}

export function enumerateOfficialImpactV1(state, options = {}) {
  const candidates = [];
  const parameterDomains = [];
  if (!isOfficialImpactPendingV1(state)) return { candidates, parameterDomains };
  if (state.pendingAction.sideKey !== String(options.sideKey || state.activeSideKey || "")) {
    return { candidates, parameterDomains };
  }
  try {
    parameterDomains.push(domainFor(state, options));
  } catch (error) {
    if (options.includeDisabled === true) {
      candidates.push({
        actionType: OFFICIAL_IMPACT_ACTION_TYPE,
        sideKey: state.activeSideKey,
        phase: "assault",
        pieceId: state.pendingAction?.pieceId,
        ruleAtomIds: [...OFFICIAL_IMPACT_ACTION_ATOM_IDS],
        executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
        executorVersion: OFFICIAL_IMPACT_EXECUTOR_VERSION,
        isEnabled: false,
        disabledReason: String(error?.message || error).split(":")[0],
        score: 0,
        details: { rulesTruth: "official_impact_fail_closed", trainingTruth: false },
      });
    }
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialImpactV1(state, domain, parameters, options = {}) {
  if (!object(parameters)
    || Object.keys(parameters).some((key) => key !== "allocations")) {
    fail("IMPACT_PARAMETERS_INVALID");
  }
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("IMPACT_PARAMETER_DOMAIN_STALE");
  const allocations = allocationsFor(domain, parameters.allocations);
  let offset = 0;
  const rollLayout = allocations.map((row) => {
    const value = {
      targetUnitId: row.targetUnitId,
      allocatedDice: row.dice,
      hitRollOffset: offset,
      hitRollCount: row.dice,
      armourReserveOffset: offset + row.dice,
      armourReserveCount: row.dice,
    };
    offset += row.dice * 2;
    return value;
  });
  const planBody = {
    schema: "starcraft_tmg_official_impact_resolution_plan_v1",
    pendingHash: domain.constraints.pendingHash,
    stateProjectionHash: domain.constraints.stateProjectionHash,
    sourceProfileHash: domain.constraints.sourceProfileHash,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    allocations,
    rollLayout,
    totalImpactDice: 4,
    totalPreallocatedD6: 8,
    hitThreshold: 3,
    armourThreshold: 4,
    surge: null,
    damage: 1,
    trainingTruth: false,
  };
  const impactPlan = { ...planBody, impactPlanHash: hashStarcraftTmgContract(planBody) };
  return {
    action: {
      actionType: OFFICIAL_IMPACT_ACTION_TYPE,
      sideKey: domain.sideKey,
      phase: "assault",
      pieceId: domain.pieceId,
      ruleAtomIds: [...OFFICIAL_IMPACT_ACTION_ATOM_IDS],
      executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
      executorVersion: OFFICIAL_IMPACT_EXECUTOR_VERSION,
      chance: {
        kind: "fixed_roll_sequence",
        faces: 6,
        count: 8,
        layout: { hit: 4, armour: 4, evade: 0, surge: 0 },
      },
      impactPlan,
      impactPlanHash: impactPlan.impactPlanHash,
      pendingHash: domain.constraints.pendingHash,
      domainId: domain.domainId,
      isEnabled: true,
      disabledReason: "",
      score: 1,
      details: { rulesTruth: "official_impact_resolution", trainingTruth: false },
    },
    canonicalParameters: { allocations },
  };
}

function reveals(input) {
  if (!Array.isArray(input) || input.length !== 8) fail("IMPACT_REVEALS_REQUIRED");
  return input.map((entry, index) => {
    const faces = object(entry) ? Number(entry.faces) : 6;
    const outcome = object(entry) ? Number(entry.outcome) : Number(entry);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("IMPACT_REVEAL_INVALID", String(index));
    }
    return outcome;
  });
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

export function applyOfficialImpactV1(stateInput, actionInput, options = {}) {
  if (!object(stateInput)
    || !object(actionInput)
    || actionInput.actionType !== OFFICIAL_IMPACT_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_IMPACT_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_IMPACT_EXECUTOR_VERSION
    || !isDeepStrictEqual(
      [...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_IMPACT_ACTION_ATOM_IDS],
    )) {
    fail("IMPACT_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  if (domain.domainId !== actionInput.domainId) fail("IMPACT_ACTION_STALE");
  const expected = instantiateOfficialImpactV1(stateInput, domain, {
    allocations: actionInput.impactPlan?.allocations,
  }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("IMPACT_ACTION_STALE");
  }
  const dice = reveals(options.chanceReveals);
  const state = clone(stateInput);
  const targetResults = [];
  for (const row of actionInput.impactPlan.rollLayout) {
    const hitRolls = dice.slice(row.hitRollOffset, row.hitRollOffset + row.hitRollCount);
    const armourReserve = dice.slice(
      row.armourReserveOffset,
      row.armourReserveOffset + row.armourReserveCount,
    );
    const hits = hitRolls.filter((roll) => roll >= 3).length;
    const armourRolls = armourReserve.slice(0, hits);
    const saves = armourRolls.filter((roll) => roll >= 4).length;
    const damage = hits - saves;
    const target = state.pieces.find((piece) => piece.id === row.targetUnitId);
    if (!target || Number(target.damageMarker || 0) !== 0 || damage > 4) {
      fail("IMPACT_TARGET_STALE", row.targetUnitId);
    }
    target.damageMarker = damage;
    targetResults.push({
      targetUnitId: row.targetUnitId,
      allocatedDice: row.allocatedDice,
      hitRolls,
      hits,
      armourReserve,
      armourRolls,
      unusedArmourReserve: armourReserve.slice(hits),
      saves,
      unsavedDamageDice: damage,
      damageApplied: damage,
      surgeDice: 0,
    });
  }
  state.pendingAction = null;
  const event = {
    type: "impact_resolved",
    sideKey: actionInput.sideKey,
    pieceId: actionInput.pieceId,
    targetResults,
    totalAllocatedDice: 4,
    totalDamageApplied: targetResults.reduce((total, row) => total + row.damageApplied, 0),
    surgeResolved: false,
    damagePerUnsavedDie: 1,
    impactPlanHash: actionInput.impactPlanHash,
    trainingTruth: false,
  };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    type: "impact_resolution",
    round: Number(state.round),
    phase: "assault",
    sideKey: actionInput.sideKey,
    pieceId: actionInput.pieceId,
    action: clone(actionInput),
    events: [clone(event)],
    trainingTruth: false,
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_impact_transition_v1",
    executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
    executorVersion: OFFICIAL_IMPACT_EXECUTOR_VERSION,
    state,
    events: [event],
    action: clone(actionInput),
    settlementRequired: true,
    rulesTruth: "official_impact_resolved_per_target_then_armour_no_surge_damage_one",
    trainingTruth: false,
  };
}

export function isOfficialImpactPendingV1(state) {
  return state?.pendingAction?.schema === OFFICIAL_IMPACT_PENDING_SCHEMA;
}
