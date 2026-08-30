import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID = "authority.template-weapon-v1";
export const OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_TEMPLATE_WEAPON_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE = "resolve_template_weapon_procedure";
export const OFFICIAL_TEMPLATE_WEAPON_PARAMETER_KIND =
  "official_template_weapon_resolution_v1";
export const OFFICIAL_TEMPLATE_WEAPON_PENDING_SCHEMA =
  "starcraft_tmg_official_template_weapon_pending_v1";

export const OFFICIAL_TEMPLATE_WEAPON_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-spillover-definition:7272a323eab6",
  "rule-atom:singleton:core-11-spillover-friendly-enemy-scope:40e9545043ea",
  "rule-atom:singleton:core-11-spillover-separate-batch:2cc9afea656e",
  "rule-atom:singleton:core-11-spillover-template-coverage:6f2635b64b2e",
  "rule-atom:singleton:core-11-spillover-template-procedure-cross-reference:ee670aab6db6",
  "rule-atom:singleton:core-12-7-template-weapon-summary-table:8af4246ec0a7",
  "rule-atom:singleton:core-8-7-6-blast-template-alignment:480abe551c04",
  "rule-atom:singleton:core-8-7-6-flamer-template-alignment:7d8f2d4be22f",
  "rule-atom:singleton:core-8-7-6-flying-template-elevation:40330cc7e08d",
  "rule-atom:singleton:core-8-7-6-main-target-attack-pool:a62824e31071",
  "rule-atom:singleton:core-8-7-6-main-target-surge-result:75f0aec31a70",
  "rule-atom:singleton:core-8-7-6-primary-template-target:53ca897d8dbd",
  "rule-atom:singleton:core-8-7-6-spillover-no-surge:520fcd72f32f",
  "rule-atom:singleton:core-8-7-6-template-base-coverage:6cc6ec08de5f",
  "rule-atom:singleton:core-8-7-6-template-hit-roll:bbfad6becfb0",
  "rule-atom:singleton:core-8-7-6-template-model-elevation:b52404f2380f",
  "rule-atom:singleton:core-8-7-6-template-spillover:7686b7910494",
  "rule-atom:singleton:core-8-7-6-template-surge-application:bec5add22266",
  "rule-atom:singleton:core-8-7-6-template-target-elevation:e7dcf6bf993d",
  "rule-atom:singleton:core-8-7-6-template-target-type:ff5eb006ea8a",
  "rule-atom:singleton:core-8-7-6-template-terrain-trace:89d40e590840",
  "rule-atom:spillover-rate-and-surge-restrictions",
  "rule-atom:spillover-unit-attack-pool-composite",
].sort());

export const OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS = Object.freeze([
  ...OFFICIAL_TEMPLATE_WEAPON_NEW_ATOM_IDS,
].sort());
export const OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ATOM_IDS =
  OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
function point(value, code) {
  const x = Number(value?.xMilliInches);
  const y = Number(value?.yMilliInches);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) fail(code);
  return { xMilliInches: x, yMilliInches: y };
}
function modelPoint(model) {
  return point({
    xMilliInches: Math.round(Number(model?.xInches) * 1000),
    yMilliInches: Math.round(Number(model?.yInches) * 1000),
  }, "TEMPLATE_MODEL_GEOMETRY_INVALID");
}
function radius(model) {
  const width = Math.round(Number(model?.baseWidthInches) * 1000);
  const depth = Math.round(Number(model?.baseDepthInches) * 1000);
  if (model?.baseShape !== "round" || width <= 0 || width !== depth) {
    fail("TEMPLATE_BASE_GEOMETRY_UNSUPPORTED", String(model?.id || ""));
  }
  return width / 2;
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true && liveModels(piece).length > 0;
}
function verifySourceLock(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false
    || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle?.repositoryFallbackAllowed !== false
    || bundle?.trainingTruth !== false) {
    fail("TEMPLATE_SOURCE_LOCK_BINDING_INVALID");
  }
}
function targetElevation(model, combatTag, targetTags) {
  if (combatTag === "flying") {
    if (!targetTags.includes("all") && !targetTags.includes("flying")) {
      fail("TEMPLATE_FLYING_TARGET_INVALID");
    }
    return "flying";
  }
  if (typeof model.elevation !== "string" || !model.elevation) {
    fail("TEMPLATE_TARGET_ELEVATION_INVALID");
  }
  return model.elevation;
}
function normalizeAsset(asset, templateType) {
  if (!object(asset)
    || asset.schema !== "starcraft_tmg_template_geometry_asset_v1"
    || asset.templateType !== templateType
    || asset.assetHash !== hashBody(asset, "assetHash")
    || !Array.isArray(asset.localPolygon)
    || asset.localPolygon.length < 3) {
    fail("TEMPLATE_GEOMETRY_ASSET_INVALID");
  }
  const localPolygon = asset.localPolygon.map((entry) => point(entry,
    "TEMPLATE_GEOMETRY_ASSET_INVALID"));
  return { ...clone(asset), localPolygon };
}
function rotateTranslate(local, origin, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return local.map((entry) => ({
    xMilliInches: Math.round(origin.xMilliInches
      + (entry.xMilliInches * c) - (entry.yMilliInches * s)),
    yMilliInches: Math.round(origin.yMilliInches
      + (entry.xMilliInches * s) + (entry.yMilliInches * c)),
  }));
}
function placement(asset, type, attackerModel, primaryModel) {
  const attacker = modelPoint(attackerModel);
  const target = modelPoint(primaryModel);
  if (type === "blast") {
    return {
      type,
      targetPoint: target,
      traceOrigin: target,
      worldPolygon: rotateTranslate(asset.localPolygon, target, 0),
      alignment: "template_centre_fixed_to_primary_target_centre",
    };
  }
  const dx = target.xMilliInches - attacker.xMilliInches;
  const dy = target.yMilliInches - attacker.yMilliInches;
  const length = Math.hypot(dx, dy);
  if (length === 0) fail("TEMPLATE_FLAMER_ALIGNMENT_INVALID");
  const r = radius(attackerModel);
  const origin = {
    xMilliInches: Math.round(attacker.xMilliInches + (dx / length) * r),
    yMilliInches: Math.round(attacker.yMilliInches + (dy / length) * r),
  };
  return {
    type,
    targetPoint: target,
    traceOrigin: attacker,
    worldPolygon: rotateTranslate(asset.localPolygon, origin, Math.atan2(dy, dx)),
    narrowEnd: origin,
    alignment: "narrow_end_flush_to_attacker_base_and_aimed_at_primary_target",
  };
}
function pointInPolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]; const b = polygon[j];
    const crosses = ((a.yMilliInches > p.yMilliInches) !== (b.yMilliInches > p.yMilliInches))
      && (p.xMilliInches < (b.xMilliInches - a.xMilliInches)
        * (p.yMilliInches - a.yMilliInches)
        / (b.yMilliInches - a.yMilliInches) + a.xMilliInches);
    if (crosses) inside = !inside;
  }
  return inside;
}
function distanceToSegment(p, a, b) {
  const dx = b.xMilliInches - a.xMilliInches;
  const dy = b.yMilliInches - a.yMilliInches;
  if (dx === 0 && dy === 0) return Math.hypot(
    p.xMilliInches - a.xMilliInches, p.yMilliInches - a.yMilliInches,
  );
  const t = Math.max(0, Math.min(1, (
    ((p.xMilliInches - a.xMilliInches) * dx)
      + ((p.yMilliInches - a.yMilliInches) * dy)
  ) / ((dx * dx) + (dy * dy))));
  return Math.hypot(
    p.xMilliInches - (a.xMilliInches + t * dx),
    p.yMilliInches - (a.yMilliInches + t * dy),
  );
}
function covered(model, polygon) {
  const p = modelPoint(model); const r = radius(model);
  if (pointInPolygon(p, polygon)) return true;
  return polygon.some((a, index) => distanceToSegment(
    p, a, polygon[(index + 1) % polygon.length],
  ) <= r);
}
function orientation(a, b, c) {
  return Math.sign((b.yMilliInches - a.yMilliInches) * (c.xMilliInches - b.xMilliInches)
    - (b.xMilliInches - a.xMilliInches) * (c.yMilliInches - b.yMilliInches));
}
function segmentIntersects(a, b, c, d) {
  return orientation(a, b, c) !== orientation(a, b, d)
    && orientation(c, d, a) !== orientation(c, d, b);
}
function terrainBlocks(state, start, end) {
  return (state.board?.terrain || []).some((terrain) => {
    if (Number(terrain.size || 0) < 2 || terrain.blocksLineOfSight === false) return false;
    const x = Math.round(Number(terrain.xInches) * 1000);
    const y = Math.round(Number(terrain.yInches) * 1000);
    const hw = Math.round(Number(terrain.widthInches) * 500);
    const hd = Math.round(Number(terrain.depthInches) * 500);
    if (![x, y, hw, hd].every(Number.isSafeInteger) || hw <= 0 || hd <= 0) {
      fail("TEMPLATE_TERRAIN_GEOMETRY_INVALID", String(terrain.id || ""));
    }
    const corners = [
      { xMilliInches: x - hw, yMilliInches: y - hd },
      { xMilliInches: x + hw, yMilliInches: y - hd },
      { xMilliInches: x + hw, yMilliInches: y + hd },
      { xMilliInches: x - hw, yMilliInches: y + hd },
    ];
    return pointInPolygon(start, corners) || pointInPolygon(end, corners)
      || corners.some((corner, index) => segmentIntersects(
        start, end, corner, corners[(index + 1) % corners.length],
      ));
  });
}
function tagEligible(profile, combatTag) {
  return profile.targetTags.includes("all") || profile.targetTags.includes(combatTag);
}
function projectedModels(state) {
  return state.pieces.filter(activePiece).flatMap((piece) => liveModels(piece).map((model) => ({
    unitId: piece.id,
    sideKey: piece.sideKey,
    combatTag: piece.combatTag,
    modelId: model.id,
    point: modelPoint(model),
    radiusMilliInches: radius(model),
    elevation: model.elevation,
  }))).sort((a, b) => a.modelId.localeCompare(b.modelId));
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    pieces: projectedModels(state), terrain: state.board?.terrain || [],
    pending: without(pending, ["pendingHash", "stateProjectionHash"]), trainingTruth: false,
  });
}

export function openOfficialTemplateWeaponPendingV1(stateInput, declaration = {}) {
  const state = clone(stateInput); verifySourceLock(state);
  if (state.rulesProcedureMode !== true || state.pendingAction) {
    fail("TEMPLATE_PROCEDURE_MODE_REQUIRED");
  }
  const type = String(declaration.templateType || "").toLowerCase();
  if (!['blast', 'flamer'].includes(type)) fail("TEMPLATE_TYPE_INVALID");
  const attacker = state.pieces.find((piece) => piece.id === declaration.attackerUnitId);
  const primary = state.pieces.find((piece) => piece.id === declaration.primaryTargetUnitId);
  if (!activePiece(attacker) || !activePiece(primary) || attacker.sideKey === primary.sideKey) {
    fail("TEMPLATE_PRIMARY_TARGET_INVALID");
  }
  const attackerModel = liveModels(attacker).find((m) => m.id === declaration.attackerModelId);
  const primaryModel = liveModels(primary).find((m) => m.id === declaration.primaryTargetModelId);
  if (!attackerModel || !primaryModel) fail("TEMPLATE_PRIMARY_TARGET_INVALID");
  const targetTags = [...new Set((declaration.attackProfile?.targetTags || [])
    .map((entry) => String(entry).toLowerCase()))].sort();
  const surgeTargetTags = [...new Set((declaration.attackProfile?.surgeTargetTags || [])
    .map((entry) => String(entry).toLowerCase()))].sort();
  const profile = {
    targetTags,
    hitThreshold: Number(declaration.attackProfile?.hitThreshold),
    rateOfAttackModifier: Number(declaration.attackProfile?.rateOfAttackModifier || 0),
    surgeTargetTags,
  };
  if (targetTags.length === 0 || !tagEligible(profile, primary.combatTag)
    || !Number.isSafeInteger(profile.hitThreshold) || profile.hitThreshold < 2
    || profile.hitThreshold > 6 || !Number.isSafeInteger(profile.rateOfAttackModifier)
    || profile.rateOfAttackModifier < 0) fail("TEMPLATE_ATTACK_PROFILE_INVALID");
  const elevation = targetElevation(primaryModel, primary.combatTag, targetTags);
  const asset = normalizeAsset(declaration.geometryAsset, type);
  const placed = placement(asset, type, attackerModel, primaryModel);
  const affected = [];
  for (const piece of state.pieces.filter(activePiece)) {
    for (const model of liveModels(piece)) {
      const modelElevation = piece.combatTag === "flying" ? "flying" : model.elevation;
      if (!covered(model, placed.worldPolygon)
        || modelElevation !== elevation
        || piece.combatTag !== primary.combatTag
        || !tagEligible(profile, piece.combatTag)
        || terrainBlocks(state, placed.traceOrigin, modelPoint(model))) continue;
      affected.push({
        unitId: piece.id, modelId: model.id, sideKey: piece.sideKey,
        combatTag: piece.combatTag, mainTarget: piece.id === primary.id,
      });
    }
  }
  if (!affected.some((entry) => entry.unitId === primary.id
    && entry.modelId === primaryModel.id)) fail("TEMPLATE_PRIMARY_MODEL_NOT_COVERED");
  const unitIds = [...new Set(affected.map((entry) => entry.unitId))].sort();
  const batches = unitIds.map((unitId) => {
    const models = affected.filter((entry) => entry.unitId === unitId);
    const mainTarget = unitId === primary.id;
    return {
      unitId, sideKey: models[0].sideKey, mainTarget,
      affectedModelIds: models.map((entry) => entry.modelId).sort(),
      attackDice: models.length + (mainTarget ? profile.rateOfAttackModifier : 0),
      rateOfAttackModifierApplied: mainTarget ? profile.rateOfAttackModifier : 0,
      surgeResult: mainTarget ? models.length : 0,
      surgeEligible: mainTarget && profile.surgeTargetTags.includes(primary.combatTag),
    };
  });
  const body = {
    schema: OFFICIAL_TEMPLATE_WEAPON_PENDING_SCHEMA,
    stage: "template_coverage_fixed_resolve_hit_pools",
    round: Number(state.round), phase: state.phase, sideKey: attacker.sideKey,
    attackerUnitId: attacker.id, attackerModelId: attackerModel.id,
    primaryTargetUnitId: primary.id, primaryTargetModelId: primaryModel.id,
    templateType: type, targetElevation: elevation, attackProfile: profile,
    geometryAssetHash: asset.assetHash, placement: placed, batches,
    totalAttackDice: batches.reduce((sum, row) => sum + row.attackDice, 0),
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    currentOfficialCarrierAvailable: false,
    productionQuarantined: true,
    stateProjectionHash: "", trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state) {
  verifySourceLock(state);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_TEMPLATE_WEAPON_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.currentOfficialCarrierAvailable !== false
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("TEMPLATE_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_TEMPLATE_WEAPON_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE,
    pieceId: pending.attackerUnitId,
    executorId: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
    executorVersion: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: [], additionalProperties: false },
    constraints: {
      pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      geometryAssetHash: pending.geometryAssetHash,
      batchCount: pending.batches.length,
      totalAttackDice: pending.totalAttackDice,
      noSurgeDie: true,
      spilloverSeparateBatches: true,
      currentOfficialCarrierAvailable: false,
      productionQuarantined: true,
    },
    confirmationClass: "direct_gesture",
    rulesTruth: "official_template_weapon_procedure_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
export function enumerateOfficialTemplateWeaponV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_TEMPLATE_WEAPON_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE,
      executorId: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
      executorVersion: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(':')[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}
export function instantiateOfficialTemplateWeaponV1(state, domain, parameters, options = {}) {
  if (!object(parameters) || Object.keys(parameters).length !== 0) {
    fail("TEMPLATE_PARAMETERS_INVALID");
  }
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("TEMPLATE_PARAMETER_DOMAIN_STALE");
  const pending = state.pendingAction;
  return { action: {
    actionType: OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE,
    sideKey: pending.sideKey, phase: pending.phase, pieceId: pending.attackerUnitId,
    ruleAtomIds: [...OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS],
    executorId: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
    executorVersion: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION,
    pendingHash: pending.pendingHash, domainId: domain.domainId,
    chance: { kind: "fixed_roll_sequence", faces: 6, count: pending.totalAttackDice,
      layout: { hit: pending.totalAttackDice, armour: 0, evade: 0, surge: 0 } },
    isEnabled: true, disabledReason: "", score: 1,
    details: { productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: {} };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
export function applyOfficialTemplateWeaponV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput) || actionInput.actionType !== OFFICIAL_TEMPLATE_WEAPON_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_TEMPLATE_WEAPON_ACTION_ATOM_IDS])) fail("TEMPLATE_ACTION_INVALID");
  const domain = domainFor(stateInput, options);
  const expected = instantiateOfficialTemplateWeaponV1(stateInput, domain, {}, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("TEMPLATE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput);
  if (!Array.isArray(options.chanceReveals)
    || options.chanceReveals.length !== pending.totalAttackDice) {
    fail("TEMPLATE_REVEALS_REQUIRED");
  }
  const rolls = options.chanceReveals.map((entry, index) => {
    const outcome = object(entry) ? Number(entry.outcome) : Number(entry);
    const faces = object(entry) ? Number(entry.faces) : 6;
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("TEMPLATE_REVEAL_INVALID", String(index));
    }
    return outcome;
  });
  let offset = 0;
  const batchResults = pending.batches.map((batch) => {
    const hitRolls = rolls.slice(offset, offset + batch.attackDice); offset += batch.attackDice;
    const hitSuccesses = hitRolls.filter((roll) => roll >= pending.attackProfile.hitThreshold).length;
    return { ...clone(batch), hitRolls, hitSuccesses, armourPoolDice: hitSuccesses,
      surgeDieRolled: false, surgeApplied: batch.surgeEligible,
      spillover: batch.mainTarget !== true };
  });
  const state = clone(stateInput);
  state.pendingAction = null;
  state.lastTemplateResolution = {
    schema: "starcraft_tmg_official_template_weapon_resolution_v1",
    templateType: pending.templateType, primaryTargetUnitId: pending.primaryTargetUnitId,
    geometryAssetHash: pending.geometryAssetHash, batches: batchResults,
    productionQuarantined: true, trainingTruth: false,
  };
  const event = { type: "template_weapon_hit_pools_resolved",
    sideKey: pending.sideKey, pieceId: pending.attackerUnitId,
    primaryTargetUnitId: pending.primaryTargetUnitId, batchResults,
    noSurgeDie: true, productionQuarantined: true, trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "template_weapon_resolution", round: Number(state.round),
    phase: state.phase, sideKey: pending.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true, schemaVersion: "starcraft_tmg_official_template_weapon_transition_v1",
    executorId: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
    executorVersion: OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_template_hit_pool_and_spillover_batches_resolved",
    trainingTruth: false };
}
