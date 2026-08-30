import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { verifyOfficialImpactStateBindingV1 } from
  "../source-data/official-impact-profile-bundle-v1.mjs";
import { verifyOfficialMissionSetupBindingV1 } from
  "../source-data/official-mission-setup-binding-v1.mjs";
import { verifyOfficialRoundSupplyStateV1 } from "./official-round-supply-state-v1.mjs";
import {
  openOfficialImpactPendingV1,
} from "./official-impact-executor-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS,
} from "./official-marine-charge-executor-v2.mjs";

export const OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID = "authority.goliath-charge-v1";
export const OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_GOLIATH_CHARGE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND =
  "official_goliath_charge_declaration_v1";
export const OFFICIAL_GOLIATH_CHARGE_RESOLUTION_PARAMETER_KIND =
  "official_goliath_charge_resolution_v1";
export const OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE = "charge";
export const OFFICIAL_RESOLVE_GOLIATH_CHARGE_ACTION_TYPE = "resolve_charge";
export const OFFICIAL_GOLIATH_CHARGE_PENDING_SCHEMA =
  "starcraft_tmg_official_goliath_charge_pending_v1";
export const OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS =
  OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS;
export const OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ATOM_IDS =
  OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS;

const BASE_DIAMETER = 3150;
const BASE_RADIUS = 1575;
const ENGAGEMENT_CENTER_DISTANCE = 4150;
const HASH = /^[a-f0-9]{64}$/u;

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
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
function active(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece.currentModels || 0) === 1;
}
function model(piece) {
  const rows = (piece?.models || []).filter((entry) => (
    entry?.isOnField !== false && entry?.isDestroyed !== true
  ));
  if (rows.length !== 1) fail("GOLIATH_CHARGE_UNIT_DENOMINATOR_UNSUPPORTED", piece?.id);
  return rows[0];
}
function point(value) {
  const xMilliInches = Math.round(Number(value?.xInches) * 1000);
  const yMilliInches = Math.round(Number(value?.yInches) * 1000);
  if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)) {
    fail("GOLIATH_CHARGE_MODEL_GEOMETRY_INVALID", value?.id);
  }
  return { xMilliInches, yMilliInches };
}
function safePoint(value) {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail("GOLIATH_CHARGE_PATH_POINT_INVALID");
  }
  return {
    xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches),
  };
}
function distance(left, right) {
  return Math.hypot(
    Number(right.xMilliInches) - Number(left.xMilliInches),
    Number(right.yMilliInches) - Number(left.yMilliInches),
  );
}
function segmentDistance(target, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(target, start);
  const ratio = Math.max(0, Math.min(1, (
    (target.xMilliInches - start.xMilliInches) * dx
      + (target.yMilliInches - start.yMilliInches) * dy
  ) / lengthSquared));
  return Math.hypot(
    target.xMilliInches - (start.xMilliInches + ratio * dx),
    target.yMilliInches - (start.yMilliInches + ratio * dy),
  );
}
function verifyPiece(piece, profile, { target = false } = {}) {
  const current = model(piece);
  if (!active(piece)
    || piece.officialUnitRecordKey !== profile.commandCenterRecordKey
    || piece.sourceRecordHash !== profile.sourceRecordHash
    || piece.officialPayloadHash !== profile.payloadHash
    || piece.currentSupply !== 2
    || piece.combatTag !== "ground"
    || !piece.combatTags?.includes("ground")
    || piece.combatTags?.includes("flying")
    || piece.selectedUpgradeNames?.length !== 0
    || piece.statuses?.length !== 0
    || Number(piece.damageMarker || 0) !== 0
    || current.baseShape !== "round"
    || Math.round(Number(current.baseWidthInches) * 1000) !== BASE_DIAMETER
    || Math.round(Number(current.baseDepthInches) * 1000) !== BASE_DIAMETER
    || current.elevation !== "ground"
    || (target && piece.activatedPhases?.assault === true)) {
    fail("GOLIATH_CHARGE_UNIT_DENOMINATOR_UNSUPPORTED", String(piece?.id || ""));
  }
  return current;
}
function verifyBoard(state) {
  if (state.board?.widthInches !== 54
    || state.board?.heightInches !== 36
    || !Array.isArray(state.board?.terrain)
    || state.board.terrain.some((entry) => !entry?.isRemoved && !entry?.isDestroyed)
    || state.board?.accessPoints?.length !== 0
    || state.board?.tokens?.length !== 0
    || state.board?.effectMarkers?.length !== 0) {
    fail("GOLIATH_CHARGE_GEOMETRY_SCOPE_UNSUPPORTED");
  }
}
function binding(state, options) {
  const profile = verifyOfficialImpactStateBindingV1(state);
  const bundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(bundle);
  verifyOfficialMissionSetupBindingV1(state.officialMissionSetupBinding, bundle);
  const runtimeHash = String(options.matchBinding?.rulesRuntimeBinding?.runtimeHash || "");
  if (!object(options.matchBinding)
    || options.matchBinding.dataSnapshotHash !== hashStarcraftTmgContract(bundle)
    || !HASH.test(runtimeHash)) {
    fail("GOLIATH_CHARGE_MATCH_BINDING_INVALID");
  }
  verifyOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle: bundle,
    rulesRuntimeHash: runtimeHash,
    roundSupplyState: state.officialRoundSupplyState,
  });
  return { profile, bundle, runtimeHash };
}
function phaseReady(state, sideKey) {
  const first = state.phaseFirstActorByRound?.[`${state.round}:assault`];
  if (state.phase !== "assault"
    || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.assault === true
    || first?.round !== Number(state.round)
    || first?.phase !== "assault"
    || !["player1", "player2"].includes(first?.chosenFirstActorSideKey)) {
    fail("GOLIATH_CHARGE_PHASE_NOT_READY");
  }
}
function engaged(state, piece) {
  const own = point(model(piece));
  return state.pieces.some((enemy) => (
    enemy.sideKey !== piece.sideKey
      && active(enemy)
      && distance(own, point(model(enemy))) <= ENGAGEMENT_CENTER_DISTANCE + 1
  ));
}
function context(state, sideKey, pieceId, options = {}) {
  if (!object(state) || !Array.isArray(state.pieces) || !object(state.players)) {
    fail("GOLIATH_CHARGE_STATE_INVALID");
  }
  phaseReady(state, sideKey);
  const source = binding(state, options);
  verifyBoard(state);
  for (const entry of state.pieces.filter(active)) verifyPiece(entry, source.profile, {
    target: entry.sideKey !== sideKey,
  });
  const piece = state.pieces.find((entry) => entry.id === pieceId && entry.sideKey === sideKey);
  if (!piece) fail("GOLIATH_CHARGE_UNIT_NOT_FOUND", pieceId);
  verifyPiece(piece, source.profile);
  if (piece.activatedPhases?.assault === true) fail("GOLIATH_CHARGE_ALREADY_ACTIVATED");
  if (engaged(state, piece)) fail("GOLIATH_CHARGE_UNIT_ENGAGED");
  const targets = state.pieces.filter((entry) => entry.sideKey !== sideKey && active(entry));
  if (targets.length === 0) fail("GOLIATH_CHARGE_NO_TARGETS");
  return { ...source, piece, targets };
}

function declarationDomain(state, sideKey, current, options) {
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "assault",
    sideKey,
    actionType: OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE,
    pieceId: current.piece.id,
    executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["leadingModelId", "targets"],
      targetUnitCount: { minimum: 1, maximum: null },
      exactlyOneTargetModelPerUnit: true,
    },
    constraints: {
      modelIds: [model(current.piece).id],
      speedInches: 7,
      eligibleTargetUnitIds: current.targets.map((entry) => entry.id).sort(),
      targetModelIdsByUnitId: Object.fromEntries(current.targets.map((entry) => [
        entry.id, [model(entry).id],
      ])),
      chargeDie: { count: 1, faces: 6 },
      lineOfSightRequired: false,
      groundOnly: true,
      targetCountMaximum: null,
      baseDiameterMilliInches: BASE_DIAMETER,
      sourceProfileHash: current.profile.profileHash,
      gameplayDataBundleHash: current.bundle.gameplayDataBundleHash,
      roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
      geometryScope: "gauntlet_single_goliath_80mm_ground_no_terrain_charge_v1",
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_goliath_charge_declaration_domain",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
function canonicalTargets(input, domain) {
  if (!Array.isArray(input) || input.length === 0) fail("GOLIATH_CHARGE_TARGETS_REQUIRED");
  const seen = new Set();
  return input.map((entry) => {
    const unitId = String(entry?.unitId || "");
    const modelId = String(entry?.modelId || "");
    if (Object.keys(entry || {}).some((key) => !["unitId", "modelId"].includes(key))
      || !domain.constraints.eligibleTargetUnitIds.includes(unitId)
      || seen.has(unitId)
      || !domain.constraints.targetModelIdsByUnitId[unitId]?.includes(modelId)) {
      fail("GOLIATH_CHARGE_TARGET_INVALID", unitId);
    }
    seen.add(unitId);
    return { unitId, modelId };
  }).sort((left, right) => left.unitId.localeCompare(right.unitId));
}
function declarationPlan(state, domain, targets) {
  const byId = new Map(state.pieces.map((entry) => [entry.id, entry]));
  const body = {
    schema: "starcraft_tmg_official_goliath_charge_declaration_plan_v1",
    round: Number(state.round),
    phase: "assault",
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    leadingModelId: domain.constraints.modelIds[0],
    attackerStartPoint: point(model(byId.get(domain.pieceId))),
    targets: targets.map((entry) => ({
      ...entry,
      startPoint: point(model(byId.get(entry.unitId))),
    })),
    speedInches: 7,
    declaredBeforeChance: true,
    sourceProfileHash: domain.constraints.sourceProfileHash,
    gameplayDataBundleHash: domain.constraints.gameplayDataBundleHash,
    roundSupplyStateHash: domain.constraints.roundSupplyStateHash,
    geometryScope: domain.constraints.geometryScope,
    trainingTruth: false,
  };
  return { ...body, chargePlanHash: hashStarcraftTmgContract(body) };
}
function verifyPending(state, options) {
  const pending = state?.pendingAction;
  if (!object(pending)
    || pending.schema !== OFFICIAL_GOLIATH_CHARGE_PENDING_SCHEMA
    || pending.stage !== "select_charge_move_after_roll"
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.round !== Number(state.round)
    || pending.phase !== "assault"
    || pending.sideKey !== state.activeSideKey
    || pending.roll < 1
    || pending.roll > 6
    || pending.speedInches !== 7
    || pending.chargeRollDistanceInches !== 7 + pending.roll
    || pending.trainingTruth !== false) {
    fail("GOLIATH_CHARGE_PENDING_INVALID");
  }
  const current = context(state, pending.sideKey, pending.pieceId, options);
  const domain = declarationDomain(state, pending.sideKey, current, options);
  const targets = canonicalTargets(pending.chargePlan.targets.map((entry) => ({
    unitId: entry.unitId,
    modelId: entry.modelId,
  })), domain);
  const plan = declarationPlan(state, domain, targets);
  if (domain.domainId !== pending.declarationDomainId
    || !isDeepStrictEqual(plan, pending.chargePlan)
    || pending.chargePlanHash !== plan.chargePlanHash) {
    fail("GOLIATH_CHARGE_PENDING_STALE");
  }
  return { pending, current, declarationDomain: domain, targets, plan };
}
function resolutionDomain(state, current, options) {
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_GOLIATH_CHARGE_RESOLUTION_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: Number(state.round),
    phase: "assault",
    sideKey: current.pending.sideKey,
    actionType: OFFICIAL_RESOLVE_GOLIATH_CHARGE_ACTION_TYPE,
    pieceId: current.pending.pieceId,
    executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["outcome"],
      outcome: ["success", "failure"],
      successRequires: ["path"],
      failureRequires: ["failureProof"],
    },
    constraints: {
      pendingHash: current.pending.pendingHash,
      chargePlanHash: current.plan.chargePlanHash,
      leadingModelId: current.plan.leadingModelId,
      modelStartPoint: clone(current.plan.attackerStartPoint),
      targets: clone(current.plan.targets),
      declaredTargetUnitIds: current.targets.map((entry) => entry.unitId),
      declaredTargetModelIds: current.targets.map((entry) => entry.modelId),
      speedInches: 7,
      chargeRoll: current.pending.roll,
      chargeRollDistanceInches: current.pending.chargeRollDistanceInches,
      maxDistanceMilliInches: current.pending.chargeRollDistanceInches * 1000,
      baseDiameterMilliInches: BASE_DIAMETER,
      battlefieldWidthMilliInches: 54000,
      battlefieldHeightMilliInches: 36000,
      acceptedFailureProofs: ["distance_shortfall", "declared_target_spread"],
      allDeclaredTargetsMustBeEngaged: true,
      undeclaredEnemyEngagementProhibited: true,
      sourceProfileHash: current.current.profile.profileHash,
      geometryScope: current.declarationDomain.constraints.geometryScope,
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_goliath_charge_post_roll_resolution_domain",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
function failureProof(domain, input) {
  if (!object(input)
    || Object.keys(input).some((key) => key !== "kind")
    || !domain.constraints.acceptedFailureProofs.includes(input.kind)) {
    fail("GOLIATH_CHARGE_FAILURE_PROOF_INVALID");
  }
  if (input.kind === "distance_shortfall") {
    const required = Math.ceil(Math.max(...domain.constraints.targets.map((target) => (
      Math.max(0, distance(domain.constraints.modelStartPoint, target.startPoint)
        - ENGAGEMENT_CENTER_DISTANCE)
    ))));
    if (required <= domain.constraints.maxDistanceMilliInches) {
      fail("GOLIATH_CHARGE_FAILURE_NOT_PROVEN");
    }
    return {
      kind: input.kind,
      minimumRequiredDistanceMilliInches: required,
      availableDistanceMilliInches: domain.constraints.maxDistanceMilliInches,
    };
  }
  let widest = null;
  for (let left = 0; left < domain.constraints.targets.length; left += 1) {
    for (let right = left + 1; right < domain.constraints.targets.length; right += 1) {
      const separation = Math.ceil(distance(
        domain.constraints.targets[left].startPoint,
        domain.constraints.targets[right].startPoint,
      ));
      if (!widest || separation > widest.separationMilliInches) {
        widest = {
          leftModelId: domain.constraints.targets[left].modelId,
          rightModelId: domain.constraints.targets[right].modelId,
          separationMilliInches: separation,
        };
      }
    }
  }
  if (!widest || widest.separationMilliInches <= 2 * ENGAGEMENT_CENTER_DISTANCE) {
    fail("GOLIATH_CHARGE_FAILURE_NOT_PROVEN");
  }
  return {
    kind: input.kind,
    ...widest,
    maximumJointEngagementSeparationMilliInches: 2 * ENGAGEMENT_CENTER_DISTANCE,
  };
}
function canonicalPath(domain, input, state) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 32) {
    fail("GOLIATH_CHARGE_PATH_REQUIRED");
  }
  const points = [clone(domain.constraints.modelStartPoint), ...input.map(safePoint)];
  let pathDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    pathDistance += Math.round(distance(points[index - 1], points[index]));
  }
  if (pathDistance > domain.constraints.maxDistanceMilliInches) {
    fail("GOLIATH_CHARGE_PATH_EXCEEDS_ROLL_DISTANCE");
  }
  for (const entry of points.slice(1)) {
    if (entry.xMilliInches < BASE_RADIUS || entry.xMilliInches > 54000 - BASE_RADIUS
      || entry.yMilliInches < BASE_RADIUS || entry.yMilliInches > 36000 - BASE_RADIUS) {
      fail("GOLIATH_CHARGE_PATH_OUTSIDE_BATTLEFIELD");
    }
  }
  const blockers = state.pieces.filter(active).filter((piece) => piece.id !== domain.pieceId)
    .map((piece) => ({ piece, point: point(model(piece)) }));
  for (let index = 1; index < points.length; index += 1) {
    for (const blocker of blockers) {
      if (segmentDistance(blocker.point, points[index - 1], points[index]) < BASE_DIAMETER - 1) {
        fail("GOLIATH_CHARGE_PATH_COLLISION", blocker.piece.id);
      }
    }
  }
  const endpoint = points.at(-1);
  const declared = new Set(domain.constraints.declaredTargetUnitIds);
  for (const target of domain.constraints.targets) {
    const separation = distance(endpoint, target.startPoint);
    if (separation < BASE_DIAMETER - 1 || separation > ENGAGEMENT_CENTER_DISTANCE + 1) {
      fail("GOLIATH_CHARGE_ALL_TARGETS_NOT_ENGAGED", target.unitId);
    }
  }
  for (const blocker of blockers.filter((entry) => !declared.has(entry.piece.id))) {
    if (distance(endpoint, blocker.point) <= ENGAGEMENT_CENTER_DISTANCE + 1) {
      fail("GOLIATH_CHARGE_UNDECLARED_ENEMY_ENGAGEMENT", blocker.piece.id);
    }
  }
  return {
    schema: "starcraft_tmg_official_goliath_charge_path_v1",
    unit: "milli-inch",
    points,
    distanceMilliInches: pathDistance,
  };
}
function planForResolution(state, domain, parameters) {
  if (parameters.outcome === "failure") {
    const proof = failureProof(domain, parameters.failureProof);
    const body = {
      schema: "starcraft_tmg_official_goliath_charge_resolution_plan_v1",
      resolutionOutcome: "failure",
      pendingHash: domain.constraints.pendingHash,
      declarationChargePlanHash: domain.constraints.chargePlanHash,
      sideKey: domain.sideKey,
      pieceId: domain.pieceId,
      declaredTargetUnitIds: [...domain.constraints.declaredTargetUnitIds],
      declaredTargetModelIds: [...domain.constraints.declaredTargetModelIds],
      speedInches: 7,
      chargeRoll: domain.constraints.chargeRoll,
      chargeRollDistanceInches: domain.constraints.chargeRollDistanceInches,
      failureProof: proof,
      movementApplied: false,
      impactTriggered: false,
      sourceProfileHash: domain.constraints.sourceProfileHash,
      trainingTruth: false,
    };
    return { ...body, chargeResolutionHash: hashStarcraftTmgContract(body) };
  }
  const path = canonicalPath(domain, parameters.path, state);
  const body = {
    schema: "starcraft_tmg_official_goliath_charge_resolution_plan_v1",
    resolutionOutcome: "success",
    pendingHash: domain.constraints.pendingHash,
    declarationChargePlanHash: domain.constraints.chargePlanHash,
    sideKey: domain.sideKey,
    pieceId: domain.pieceId,
    declaredTargetUnitIds: [...domain.constraints.declaredTargetUnitIds],
    declaredTargetModelIds: [...domain.constraints.declaredTargetModelIds],
    speedInches: 7,
    chargeRoll: domain.constraints.chargeRoll,
    chargeRollDistanceInches: domain.constraints.chargeRollDistanceInches,
    canonicalPath: path,
    finalModelPosition: { modelId: domain.constraints.leadingModelId, ...path.points.at(-1) },
    allDeclaredTargetsEngaged: true,
    undeclaredEnemyUnitsEngaged: 0,
    movementApplied: true,
    impactTriggered: true,
    sourceProfileHash: domain.constraints.sourceProfileHash,
    trainingTruth: false,
  };
  return { ...body, chargeResolutionHash: hashStarcraftTmgContract(body) };
}
function diagnostic(sideKey, pieceId, error) {
  return {
    actionType: OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId,
    ruleAtomIds: [...OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: { rulesTruth: "official_goliath_charge_fail_closed", trainingTruth: false },
  };
}

export function enumerateOfficialGoliathChargeV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "");
  const candidates = [];
  const parameterDomains = [];
  if (isOfficialGoliathChargePendingV1(state)) {
    if (state.pendingAction.sideKey !== sideKey) return { candidates, parameterDomains };
    try {
      parameterDomains.push(resolutionDomain(state, verifyPending(state, options), options));
    } catch (error) {
      if (options.includeDisabled === true) {
        candidates.push(diagnostic(sideKey, state.pendingAction.pieceId, error));
      }
    }
    return { candidates, parameterDomains };
  }
  for (const piece of (state?.pieces || []).filter((entry) => entry.sideKey === sideKey && active(entry))) {
    try {
      const current = context(state, sideKey, piece.id, options);
      parameterDomains.push(declarationDomain(state, sideKey, current, options));
    } catch (error) {
      if (options.includeDisabled === true) candidates.push(diagnostic(sideKey, piece.id, error));
    }
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialGoliathChargeV1(state, domain, parameters, options = {}) {
  if (!object(domain) || !object(parameters)) fail("GOLIATH_CHARGE_PARAMETERS_INVALID");
  if (domain.parameterKind === OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND) {
    if (Object.keys(parameters).some((key) => !["leadingModelId", "targets"].includes(key))) {
      fail("GOLIATH_CHARGE_DECLARATION_PARAMETERS_INVALID");
    }
    const current = context(state, domain.sideKey, domain.pieceId, options);
    const expected = declarationDomain(state, domain.sideKey, current, options);
    if (!isDeepStrictEqual(domain, expected)
      || parameters.leadingModelId !== domain.constraints.modelIds[0]) {
      fail("GOLIATH_CHARGE_PARAMETER_DOMAIN_STALE");
    }
    const targets = canonicalTargets(parameters.targets, domain);
    const chargePlan = declarationPlan(state, domain, targets);
    return {
      action: {
        actionType: OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE,
        sideKey: domain.sideKey,
        phase: "assault",
        pieceId: domain.pieceId,
        ruleAtomIds: [...OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS],
        executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
        executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
        chance: { kind: "fixed_roll_sequence", faces: 6, count: 1, layout: { charge: 1 } },
        chargePlan,
        chargePlanHash: chargePlan.chargePlanHash,
        domainId: domain.domainId,
        isEnabled: true,
        disabledReason: "",
        score: 1,
        details: { rulesTruth: "official_goliath_charge_declaration", trainingTruth: false },
      },
      canonicalParameters: { leadingModelId: parameters.leadingModelId, targets },
    };
  }
  if (domain.parameterKind !== OFFICIAL_GOLIATH_CHARGE_RESOLUTION_PARAMETER_KIND
    || !["success", "failure"].includes(parameters.outcome)
    || Object.keys(parameters).some((key) => !["outcome", "path", "failureProof"].includes(key))
    || (parameters.outcome === "success" && parameters.failureProof !== undefined)
    || (parameters.outcome === "failure" && parameters.path !== undefined)) {
    fail("GOLIATH_CHARGE_RESOLUTION_PARAMETERS_INVALID");
  }
  const expected = resolutionDomain(state, verifyPending(state, options), options);
  if (!isDeepStrictEqual(domain, expected)) fail("GOLIATH_CHARGE_RESOLUTION_DOMAIN_STALE");
  const chargePlan = planForResolution(state, domain, parameters);
  return {
    action: {
      actionType: OFFICIAL_RESOLVE_GOLIATH_CHARGE_ACTION_TYPE,
      sideKey: domain.sideKey,
      phase: "assault",
      pieceId: domain.pieceId,
      ruleAtomIds: [...OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS],
      executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
      executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
      chance: null,
      chargePlan,
      chargePlanHash: chargePlan.chargeResolutionHash,
      pendingHash: domain.constraints.pendingHash,
      domainId: domain.domainId,
      isEnabled: true,
      disabledReason: "",
      score: 1,
      details: {
        rulesTruth: parameters.outcome === "success"
          ? "official_goliath_charge_success_opens_impact"
          : "official_goliath_charge_failure_ends_activation",
        trainingTruth: false,
      },
    },
    canonicalParameters: parameters.outcome === "success"
      ? { outcome: "success", path: clone(chargePlan.canonicalPath.points.slice(1)) }
      : { outcome: "failure", failureProof: { kind: chargePlan.failureProof.kind } },
  };
}

function reveal(input) {
  if (!Array.isArray(input) || input.length !== 1) fail("GOLIATH_CHARGE_REVEAL_REQUIRED");
  const faces = object(input[0]) ? Number(input[0].faces) : 6;
  const outcome = object(input[0]) ? Number(input[0].outcome) : Number(input[0]);
  if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
    fail("GOLIATH_CHARGE_REVEAL_INVALID");
  }
  return outcome;
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function expectedAction(state, action, options) {
  const enumeration = enumerateOfficialGoliathChargeV1(state, {
    ...options,
    sideKey: action.sideKey,
  });
  const domain = enumeration.parameterDomains.find((entry) => entry.domainId === action.domainId);
  if (!domain) fail("GOLIATH_CHARGE_ACTION_STALE");
  return instantiateOfficialGoliathChargeV1(
    state,
    domain,
    action.actionType === OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE
      ? {
          leadingModelId: action.chargePlan?.leadingModelId,
          targets: (action.chargePlan?.targets || []).map((entry) => ({
            unitId: entry.unitId,
            modelId: entry.modelId,
          })),
        }
      : action.chargePlan?.resolutionOutcome === "success"
        ? { outcome: "success", path: action.chargePlan?.canonicalPath?.points?.slice(1) }
        : { outcome: "failure", failureProof: { kind: action.chargePlan?.failureProof?.kind } },
    options,
  );
}

export function applyOfficialGoliathChargeV1(stateInput, actionInput, options = {}) {
  if (!object(stateInput)
    || !object(actionInput)
    || ![OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE, OFFICIAL_RESOLVE_GOLIATH_CHARGE_ACTION_TYPE]
      .includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION
    || !isDeepStrictEqual(
      [...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_GOLIATH_CHARGE_ACTION_ATOM_IDS],
    )) {
    fail("GOLIATH_CHARGE_ACTION_INVALID");
  }
  const expected = expectedAction(stateInput, actionInput, options);
  if (!isDeepStrictEqual(contractAction(expected.action), contractAction(actionInput))) {
    fail("GOLIATH_CHARGE_ACTION_STALE");
  }
  if (actionInput.actionType === OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE) {
    if (stateInput.pendingAction !== undefined && stateInput.pendingAction !== null) {
      fail("GOLIATH_CHARGE_PENDING_CONFLICT");
    }
    const roll = reveal(options.chanceReveals);
    const state = clone(stateInput);
    const pendingBody = {
      schema: OFFICIAL_GOLIATH_CHARGE_PENDING_SCHEMA,
      stage: "select_charge_move_after_roll",
      round: Number(state.round),
      phase: "assault",
      sideKey: actionInput.sideKey,
      pieceId: actionInput.pieceId,
      chargePlan: clone(actionInput.chargePlan),
      chargePlanHash: actionInput.chargePlanHash,
      roll,
      speedInches: 7,
      chargeRollDistanceInches: 7 + roll,
      declarationDomainId: actionInput.domainId,
      sourceProfileHash: actionInput.chargePlan.sourceProfileHash,
      openedAtRevision: Number(options.postRevision || 0),
      trainingTruth: false,
    };
    const pending = { ...pendingBody, pendingHash: hashStarcraftTmgContract(pendingBody) };
    state.pendingAction = pending;
    const event = {
      type: "goliath_charge_declared_and_rolled",
      sideKey: actionInput.sideKey,
      pieceId: actionInput.pieceId,
      targetUnitIds: actionInput.chargePlan.targets.map((entry) => entry.unitId),
      chargeRoll: roll,
      speedInches: 7,
      chargeRollDistanceInches: 7 + roll,
      pendingHash: pending.pendingHash,
      trainingTruth: false,
    };
    state.log = Array.isArray(state.log) ? state.log : [];
    state.log.push({
      type: "goliath_charge_declaration",
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
      schemaVersion: "starcraft_tmg_official_goliath_charge_transition_v1",
      executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
      executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
      state,
      events: [event],
      action: clone(actionInput),
      settlementRequired: false,
      rulesTruth: "official_goliath_charge_declared_before_hidden_d6",
      trainingTruth: false,
    };
  }
  const state = clone(stateInput);
  const success = actionInput.chargePlan.resolutionOutcome === "success";
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  if (!piece) fail("GOLIATH_CHARGE_UNIT_NOT_FOUND");
  if (success) {
    const destination = actionInput.chargePlan.finalModelPosition;
    const current = model(piece);
    current.xInches = destination.xMilliInches / 1000;
    current.yInches = destination.yMilliInches / 1000;
  }
  piece.activatedPhases = object(piece.activatedPhases) ? piece.activatedPhases : {};
  piece.activatedPhases.assault = true;
  state.pendingAction = null;
  const resolutionEvent = {
    type: success ? "goliath_charge_succeeded" : "goliath_charge_failed",
    sideKey: actionInput.sideKey,
    pieceId: actionInput.pieceId,
    declaredTargetUnitIds: [...actionInput.chargePlan.declaredTargetUnitIds],
    movementApplied: success,
    impactTriggered: success,
    activationEnded: !success,
    chargeResolutionHash: actionInput.chargePlan.chargeResolutionHash,
    trainingTruth: false,
  };
  let finalState = state;
  let events = [resolutionEvent];
  if (success) {
    const opened = openOfficialImpactPendingV1(state, {
      sideKey: actionInput.sideKey,
      pieceId: actionInput.pieceId,
      targetUnitIds: actionInput.chargePlan.declaredTargetUnitIds,
      chargeSucceeded: true,
      chargeResolutionHash: actionInput.chargePlan.chargeResolutionHash,
      openedAtRevision: Number(options.postRevision || 0),
    });
    finalState = opened.state;
    events.push(opened.event);
  }
  finalState.log = Array.isArray(finalState.log) ? finalState.log : [];
  finalState.log.push({
    type: "goliath_charge_resolution",
    round: Number(finalState.round),
    phase: "assault",
    sideKey: actionInput.sideKey,
    pieceId: actionInput.pieceId,
    action: clone(actionInput),
    events: clone(events),
    trainingTruth: false,
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_goliath_charge_transition_v1",
    executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
    state: finalState,
    events,
    action: clone(actionInput),
    settlementRequired: !success,
    rulesTruth: success
      ? "official_goliath_successful_charge_opens_mandatory_impact"
      : "official_goliath_failed_charge_ends_assault_activation",
    trainingTruth: false,
  };
}

export function isOfficialGoliathChargePendingV1(state) {
  return state?.pendingAction?.schema === OFFICIAL_GOLIATH_CHARGE_PENDING_SCHEMA;
}
