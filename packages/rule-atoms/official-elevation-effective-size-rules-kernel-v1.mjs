import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import { evaluateOfficialFlyingCoverV1 } from
  "./official-flying-rules-kernel-v1.mjs";
import { evaluateOfficialTerrainLineOfSightV1 } from
  "./official-terrain-los-rules-kernel-v1.mjs";

export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_elevation_effective_size_rules_kernel_v1";
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_TERRAIN_ELEVATION_AGREEMENT_SCHEMA =
  "starcraft_tmg_official_terrain_elevation_agreement_v1";

const TOLERANCE = 1;
const INCH = 1000;
const CLOSE_QUARTERS_RANGE = 3000;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function milli(value, code, detail = "") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code, detail);
  return result;
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModel(model) {
  return model?.isOnField !== false && model?.isDestroyed !== true;
}
function isFlyingProfile(profile) {
  return profile.combatTags.includes("flying");
}
function terrainBody(terrain) {
  return { schema: terrain.schema, id: terrain.id,
    terrainKind: terrain.terrainKind, size: terrain.size,
    footprint: terrain.footprint,
    standableHorizontalSurface: terrain.standableHorizontalSurface,
    setupAgreement: terrain.setupAgreement,
    rulesTruth: terrain.rulesTruth, trainingTruth: terrain.trainingTruth };
}
function agreementBody(agreement) {
  return { schema: agreement.schema,
    footprintAgreed: agreement.footprintAgreed,
    footprintHash: agreement.footprintHash,
    openingDenominatorComplete: agreement.openingDenominatorComplete,
    openings: agreement.openings,
    agreedDuringBattlefieldSetup: agreement.agreedDuringBattlefieldSetup,
    trainingTruth: agreement.trainingTruth };
}
function rectangle(value, code, detail) {
  const minX = Number(value?.minXMilliInches);
  const maxX = Number(value?.maxXMilliInches);
  const minY = Number(value?.minYMilliInches);
  const maxY = Number(value?.maxYMilliInches);
  if (value?.shape !== "axis_aligned_rectangle"
    || ![minX, maxX, minY, maxY].every(Number.isSafeInteger)
    || minX >= maxX || minY >= maxY) fail(code, detail);
  return { shape: "axis_aligned_rectangle", minXMilliInches: minX,
    maxXMilliInches: maxX, minYMilliInches: minY, maxYMilliInches: maxY };
}
function verifyTerrain(raw) {
  const terrainId = String(raw?.id || "").trim();
  const size = Number(raw?.size);
  const footprint = rectangle(raw?.footprint,
    "ELEVATION_TERRAIN_FOOTPRINT_INVALID", terrainId);
  if (!terrainId || raw?.schema !== "starcraft_tmg_official_terrain_piece_v1"
    || String(raw.terrainKind || "ordinary").toLowerCase() !== "ordinary"
    || !Number.isSafeInteger(size) || size < 0 || size > 9
    || !object(raw.setupAgreement)
    || raw.setupAgreement.schema !== "starcraft_tmg_terrain_setup_agreement_v1"
    || raw.setupAgreement.footprintAgreed !== true
    || raw.setupAgreement.footprintHash !== hashStarcraftTmgContract(footprint)
    || raw.setupAgreement.openingDenominatorComplete !== true
    || raw.setupAgreement.agreedDuringBattlefieldSetup !== true
    || raw.setupAgreement.trainingTruth !== false
    || raw.setupAgreement.agreementHash
      !== hashStarcraftTmgContract(agreementBody(raw.setupAgreement))
    || raw.rulesTruth !== "official_core_terrain_setup_agreement"
    || raw.trainingTruth !== false
    || raw.terrainHash !== hashStarcraftTmgContract(terrainBody(raw))) {
    fail(String(raw?.terrainKind || "ordinary").toLowerCase() === "ordinary"
      ? "ELEVATION_TERRAIN_INVALID" : "ELEVATION_SPECIAL_TERRAIN_DEFERRED_TO_SLICE86",
    terrainId);
  }
  return { terrainId, size, footprint,
    standableHorizontalSurface: raw.standableHorizontalSurface === true,
    terrainHash: raw.terrainHash };
}
function rectanglesOverlap(left, right) {
  return left.minXMilliInches <= right.maxXMilliInches + TOLERANCE
    && left.maxXMilliInches >= right.minXMilliInches - TOLERANCE
    && left.minYMilliInches <= right.maxYMilliInches + TOLERANCE
    && left.maxYMilliInches >= right.minYMilliInches - TOLERANCE;
}
function pointRectangleDistance(point, footprint) {
  const x = Math.max(footprint.minXMilliInches,
    Math.min(point.xMilliInches, footprint.maxXMilliInches));
  const y = Math.max(footprint.minYMilliInches,
    Math.min(point.yMilliInches, footprint.maxYMilliInches));
  return Math.hypot(point.xMilliInches - x, point.yMilliInches - y);
}
function modelEdgeToTerrain(model, terrain) {
  return Math.max(0, pointRectangleDistance(model.center, terrain.footprint)
    - model.radiusMilliInches);
}
function modelEdgeDistance(left, right) {
  return Math.max(0, Math.hypot(
    right.center.xMilliInches - left.center.xMilliInches,
    right.center.yMilliInches - left.center.yMilliInches,
  ) - left.radiusMilliInches - right.radiusMilliInches);
}

export function createOfficialTerrainElevationAgreementV1(input = {}) {
  const supportRelations = (input.supportRelations || []).map((entry) => ({
    terrainId: String(entry?.terrainId || "").trim(),
    supportTerrainId: String(entry?.supportTerrainId || "").trim(),
  })).sort((left, right) => left.terrainId.localeCompare(right.terrainId));
  if (supportRelations.some((entry) => !entry.terrainId || !entry.supportTerrainId)
    || new Set(supportRelations.map((entry) => entry.terrainId)).size
      !== supportRelations.length) {
    fail("ELEVATION_SUPPORT_RELATION_DENOMINATOR_INVALID");
  }
  const body = { schema: OFFICIAL_TERRAIN_ELEVATION_AGREEMENT_SCHEMA,
    relationDenominatorComplete: true, supportRelations,
    agreedDuringBattlefieldSetup: true, rulesTruth: "official_core_terrain_elevation",
    trainingTruth: false };
  return freezeDeep({ ...body, agreementHash: hashStarcraftTmgContract(body) });
}

function verifyElevationContext(state, dataBundle) {
  verifyOfficialTerrainLosDataBundleV1(dataBundle);
  const terrain = (state?.board?.terrain || []).filter((entry) => entry?.isRemoved !== true)
    .map(verifyTerrain);
  const terrainById = new Map(terrain.map((entry) => [entry.terrainId, entry]));
  if (terrainById.size !== terrain.length) fail("ELEVATION_TERRAIN_ID_DUPLICATE");
  const agreement = state?.board?.terrainElevationAgreement;
  if (!object(agreement)
    || agreement.schema !== OFFICIAL_TERRAIN_ELEVATION_AGREEMENT_SCHEMA
    || agreement.relationDenominatorComplete !== true
    || agreement.agreedDuringBattlefieldSetup !== true
    || agreement.rulesTruth !== "official_core_terrain_elevation"
    || agreement.trainingTruth !== false
    || agreement.agreementHash
      !== hashStarcraftTmgContract(without(agreement, ["agreementHash"]))) {
    fail("ELEVATION_SETUP_AGREEMENT_INVALID");
  }
  const directSupport = new Map();
  for (const relation of agreement.supportRelations || []) {
    const terrainId = String(relation?.terrainId || "");
    const supportTerrainId = String(relation?.supportTerrainId || "");
    const subject = terrainById.get(terrainId);
    const support = terrainById.get(supportTerrainId);
    if (!subject || !support || subject === support || directSupport.has(terrainId)
      || support.standableHorizontalSurface !== true
      || !rectanglesOverlap(subject.footprint, support.footprint)) {
      fail("ELEVATION_SUPPORT_RELATION_INVALID", `${terrainId}/${supportTerrainId}`);
    }
    directSupport.set(terrainId, supportTerrainId);
  }
  if (directSupport.size !== (agreement.supportRelations || []).length) {
    fail("ELEVATION_SUPPORT_RELATION_DENOMINATOR_INVALID");
  }
  const effectiveSizeByTerrainId = new Map();
  const supportChainByTerrainId = new Map();
  function resolve(terrainId, visiting = new Set()) {
    if (effectiveSizeByTerrainId.has(terrainId)) {
      return { effectiveSize: effectiveSizeByTerrainId.get(terrainId),
        supportChain: supportChainByTerrainId.get(terrainId) };
    }
    if (visiting.has(terrainId)) fail("ELEVATION_SUPPORT_CYCLE", terrainId);
    visiting.add(terrainId);
    const terrainPiece = terrainById.get(terrainId);
    if (!terrainPiece) fail("ELEVATION_TERRAIN_NOT_FOUND", terrainId);
    const supportTerrainId = directSupport.get(terrainId);
    const support = supportTerrainId ? resolve(supportTerrainId, visiting) : null;
    const effectiveSize = terrainPiece.size + Number(support?.effectiveSize || 0);
    const supportChain = supportTerrainId
      ? [supportTerrainId, ...(support.supportChain || [])] : [];
    visiting.delete(terrainId);
    effectiveSizeByTerrainId.set(terrainId, effectiveSize);
    supportChainByTerrainId.set(terrainId, supportChain);
    return { effectiveSize, supportChain };
  }
  for (const terrainId of terrainById.keys()) resolve(terrainId);
  return { terrain, terrainById, directSupport,
    effectiveSizeByTerrainId, supportChainByTerrainId, agreement };
}

function officialProfile(piece, dataBundle) {
  const profile = dataBundle.profiles.find((entry) => (
    entry.recordKey === piece?.officialUnitRecordKey
  ));
  if (!profile || piece.sourceRecordHash !== profile.sourceRecordHash
    || piece.officialPayloadHash !== profile.payloadHash
    || (profile.printedSize === null && !isFlyingProfile(profile))) {
    fail("ELEVATION_OFFICIAL_UNIT_PROFILE_INVALID", String(piece?.id || ""));
  }
  return profile;
}
function normalizedElevation(value) {
  const elevation = String(value || "ground").toLowerCase();
  if (elevation === "middle") return "mid";
  return elevation;
}
function elevationBandForSize(size) {
  return size >= 3 ? "high" : size >= 1 ? "mid" : "ground";
}
function canonicalModel(piece, modelId, dataBundle, context) {
  if (!activePiece(piece)) fail("ELEVATION_UNIT_INVALID", String(piece?.id || ""));
  const model = (piece.models || []).find((entry) => entry.id === modelId && activeModel(entry));
  const profile = officialProfile(piece, dataBundle);
  const width = milli(model?.baseWidthInches, "ELEVATION_MODEL_BASE_INVALID", modelId);
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    "ELEVATION_MODEL_BASE_INVALID", modelId);
  if (!model || String(model.baseShape || "round").toLowerCase() !== "round"
    || width <= 0 || Math.abs(width - depth) > TOLERANCE
    || !Array.isArray(model.supportTerrainIds)) {
    fail("ELEVATION_MODEL_BASE_INVALID", modelId);
  }
  const flying = isFlyingProfile(profile);
  const supportTerrainIds = [...new Set(model.supportTerrainIds.map(String))].sort();
  if (supportTerrainIds.length !== model.supportTerrainIds.length
    || supportTerrainIds.length > 1 || (flying && supportTerrainIds.length > 0)) {
    fail("ELEVATION_MODEL_SUPPORT_DENOMINATOR_INVALID", modelId);
  }
  const center = { xMilliInches: milli(model.xInches,
    "ELEVATION_MODEL_POSITION_INVALID", modelId),
  yMilliInches: milli(model.yInches, "ELEVATION_MODEL_POSITION_INVALID", modelId) };
  const radiusMilliInches = Math.round(width / 2);
  const supportTerrainId = supportTerrainIds[0] || null;
  const support = supportTerrainId ? context.terrainById.get(supportTerrainId) : null;
  if (supportTerrainId && (!support || support.standableHorizontalSurface !== true
    || pointRectangleDistance(center, support.footprint) > radiusMilliInches + TOLERANCE)) {
    fail("ELEVATION_MODEL_SUPPORT_INVALID", `${modelId}/${supportTerrainId}`);
  }
  const supportingTerrainEffectiveSize = supportTerrainId
    ? context.effectiveSizeByTerrainId.get(supportTerrainId) : 0;
  const elevationBand = flying ? "ignored_for_flying"
    : elevationBandForSize(supportingTerrainEffectiveSize);
  if (!flying && normalizedElevation(model.elevation) !== elevationBand) {
    fail("ELEVATION_MODEL_BAND_MISMATCH", modelId);
  }
  return { unitId: piece.id, modelId, sideKey: piece.sideKey, center,
    radiusMilliInches, officialRecordKey: profile.recordKey,
    printedSize: profile.printedSize, flying, supportTerrainId,
    supportTerrainIds, supportingTerrainEffectiveSize,
    supportTerrainChain: supportTerrainId
      ? [supportTerrainId, ...(context.supportChainByTerrainId.get(supportTerrainId) || [])]
      : [],
    elevationBand,
    effectiveSize: flying ? "higher_than_every_terrain"
      : profile.printedSize + supportingTerrainEffectiveSize };
}
function activeCanonicalModels(piece, dataBundle, context) {
  return (piece.models || []).filter(activeModel).map((model) => (
    canonicalModel(piece, model.id, dataBundle, context)
  ));
}
function terrainEffectiveSizeEvidence(context) {
  return context.terrain.map((terrain) => ({
    terrainId: terrain.terrainId, printedSize: terrain.size,
    supportTerrainId: context.directSupport.get(terrain.terrainId) || null,
    supportTerrainChain: context.supportChainByTerrainId.get(terrain.terrainId),
    effectiveSize: context.effectiveSizeByTerrainId.get(terrain.terrainId),
  }));
}

export function evaluateOfficialEffectiveSizeV1(input = {}) {
  const context = verifyElevationContext(input.state, input.dataBundle);
  const subjectKind = String(input.subjectKind || "");
  let subject;
  if (subjectKind === "model") {
    const piece = input.state.pieces?.find((entry) => entry.id === input.unitId);
    subject = canonicalModel(piece, input.modelId, input.dataBundle, context);
  } else if (subjectKind === "terrain") {
    const terrain = context.terrainById.get(String(input.terrainId || ""));
    if (!terrain) fail("ELEVATION_TERRAIN_NOT_FOUND", String(input.terrainId || ""));
    subject = { terrainId: terrain.terrainId, printedSize: terrain.size,
      supportTerrainId: context.directSupport.get(terrain.terrainId) || null,
      supportTerrainChain: context.supportChainByTerrainId.get(terrain.terrainId),
      effectiveSize: context.effectiveSizeByTerrainId.get(terrain.terrainId) };
  } else fail("ELEVATION_EFFECTIVE_SIZE_SUBJECT_INVALID", subjectKind);
  const body = { schema: "starcraft_tmg_official_effective_size_result_v1",
    subjectKind, subject, terrainEffectiveSizes: terrainEffectiveSizeEvidence(context),
    terrainSizesStackRecursively: true, modelAddsDirectSupportingTerrainEffectiveSize: true,
    groundModelUsesPrintedSizeOnly: true, flyingTerrainContribution: 0,
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function evaluateOfficialHorizontalElevationDistanceV1(input = {}) {
  const context = verifyElevationContext(input.state, input.dataBundle);
  const leftPiece = input.state.pieces?.find((entry) => entry.id === input.leftUnitId);
  const rightPiece = input.state.pieces?.find((entry) => entry.id === input.rightUnitId);
  const left = canonicalModel(leftPiece, input.leftModelId, input.dataBundle, context);
  const right = canonicalModel(rightPiece, input.rightModelId, input.dataBundle, context);
  const distanceMilliInches = Math.round(modelEdgeDistance(left, right));
  const body = { schema: "starcraft_tmg_official_horizontal_elevation_distance_result_v1",
    left: { unitId: left.unitId, modelId: left.modelId,
      elevationBand: left.elevationBand },
    right: { unitId: right.unitId, modelId: right.modelId,
      elevationBand: right.elevationBand },
    distanceMilliInches, distanceInches: Number((distanceMilliInches / 1000).toFixed(3)),
    topDownHorizontalMeasurement: true, verticalHeightContribution: 0,
    appliesTo: ["range", "engagement_range", "ability_range"],
    movementDistanceDelegatedToActionProcedure: true,
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

function geometryProjection(state, supportIds, dataBundle, participantIds) {
  const projected = structuredClone(state);
  const substitutions = [];
  const geometryProfile = dataBundle.profiles.find((entry) => entry.printedSize !== null);
  for (const piece of projected.pieces || []) {
    for (const model of piece.models || []) {
      model.supportTerrainIds = [];
      model.elevation = "ground";
    }
    const profile = dataBundle.profiles.find((entry) => (
      entry.recordKey === piece.officialUnitRecordKey
    ));
    if (participantIds.has(piece.id) && profile?.printedSize === null) {
      if (!geometryProfile) fail("ELEVATION_GEOMETRY_PROFILE_UNAVAILABLE");
      substitutions.push({ unitId: piece.id, actualRecordKey: profile.recordKey,
        geometryOnlyRecordKey: geometryProfile.recordKey,
        reason: "frozen_slice84_rejects_null_flying_size_before_geometry" });
      piece.officialUnitRecordKey = geometryProfile.recordKey;
      piece.sourceRecordHash = geometryProfile.sourceRecordHash;
      piece.officialPayloadHash = geometryProfile.payloadHash;
    }
  }
  for (const terrain of projected.board?.terrain || []) {
    if (supportIds.has(terrain.id)) terrain.isRemoved = true;
  }
  projected.board.terrainElevationAgreement = undefined;
  return { projected, substitutions };
}
function supportAssessment(terrain, attacker, target) {
  const attackerNear = modelEdgeToTerrain(attacker, terrain) <= INCH + TOLERANCE;
  const targetNear = modelEdgeToTerrain(target, terrain) <= INCH + TOLERANCE;
  const closeQuarters = attackerNear && targetNear
    && modelEdgeDistance(attacker, target) <= CLOSE_QUARTERS_RANGE + TOLERANCE;
  return { terrainId: terrain.terrainId, terrainSize: terrain.size,
    blockingTerrain: terrain.size >= 1, rawBarrierProof: null,
    visibilityWitness: "supported_horizontal_surface_excluded",
    topDownSurfaceExcluded: true, openSightOpeningIds: [],
    defaultAperturesBlockLineOfSight: false,
    movementAndSightOpeningPermissionsIndependent: true,
    blockingTerrainTrace: false, attackerWithinOneInch: attackerNear,
    targetWithinOneInch: targetNear, closeQuarters };
}
function highGroundDeadZone(terrain, assessment, attacker, target) {
  if (assessment.closeQuarters) return false;
  const terrainEffectiveSize = terrain.effectiveSize;
  if (terrainEffectiveSize < 3) return false;
  const attackerOnTerrain = attacker.supportTerrainId === terrain.terrainId
    && attacker.elevationBand === "high";
  const targetOnTerrain = target.supportTerrainId === terrain.terrainId
    && target.elevationBand === "high";
  const regular = !attacker.flying && !target.flying && (
    (attackerOnTerrain && target.elevationBand === "ground"
      && assessment.targetWithinOneInch)
    || (targetOnTerrain && attacker.elevationBand === "ground"
      && assessment.attackerWithinOneInch)
  );
  const flyingRetained = assessment.blockingTerrainTrace && (
    (attacker.flying && !target.flying && target.elevationBand === "ground"
      && assessment.targetWithinOneInch)
    || (target.flying && !attacker.flying && attacker.elevationBand === "ground"
      && assessment.attackerWithinOneInch)
  );
  return regular || flyingRetained;
}

export function evaluateOfficialElevatedLineOfSightV1(input = {}) {
  const state = input.state;
  const context = verifyElevationContext(state, input.dataBundle);
  const attackerPiece = input.attacker;
  const targetPiece = input.target;
  const attacker = canonicalModel(attackerPiece, input.attackerModelId,
    input.dataBundle, context);
  const target = canonicalModel(targetPiece, input.targetModelId,
    input.dataBundle, context);
  const flyingOverlappedTerrainIds = context.terrain.filter((terrain) => (
    (attacker.flying
      && pointRectangleDistance(attacker.center, terrain.footprint)
        <= attacker.radiusMilliInches + TOLERANCE)
    || (target.flying
      && pointRectangleDistance(target.center, terrain.footprint)
        <= target.radiusMilliInches + TOLERANCE)
  )).map((terrain) => terrain.terrainId);
  const supportIds = new Set([...attacker.supportTerrainChain, ...target.supportTerrainChain,
    ...flyingOverlappedTerrainIds]);
  const geometry = geometryProjection(state, supportIds, input.dataBundle,
    new Set([attackerPiece.id, targetPiece.id]));
  const projectedState = geometry.projected;
  const projectedAttacker = projectedState.pieces.find((entry) => entry.id === attackerPiece.id);
  const projectedTarget = projectedState.pieces.find((entry) => entry.id === targetPiece.id);
  const base = evaluateOfficialTerrainLineOfSightV1({ state: projectedState,
    attacker: projectedAttacker, attackerModelId: input.attackerModelId,
    target: projectedTarget, targetModelId: input.targetModelId,
    dataBundle: input.dataBundle });
  const baseById = new Map(base.assessments.map((entry) => [entry.terrainId, entry]));
  const terrainRows = terrainEffectiveSizeEvidence(context);
  const assessments = terrainRows.map((terrainEvidence) => {
    const terrain = context.terrainById.get(terrainEvidence.terrainId);
    const geometry = supportIds.has(terrain.terrainId)
      ? supportAssessment(terrain, attacker, target) : baseById.get(terrain.terrainId);
    if (!geometry) fail("ELEVATION_GEOMETRY_PROJECTION_INCOMPLETE", terrain.terrainId);
    const trace = geometry.blockingTerrainTrace === true;
    const fullCoverBlocks = !attacker.flying && !target.flying && trace
      && terrainEvidence.effectiveSize >= attacker.effectiveSize
      && terrainEvidence.effectiveSize >= target.effectiveSize;
    const attackerDirectCover = !attacker.flying && trace
      && geometry.attackerWithinOneInch === true
      && terrainEvidence.effectiveSize >= attacker.effectiveSize;
    const targetDirectCover = !target.flying && trace
      && geometry.targetWithinOneInch === true
      && terrainEvidence.effectiveSize >= target.effectiveSize;
    const directCoverBlocks = !geometry.closeQuarters
      && (attackerDirectCover || targetDirectCover);
    const elevationDeadZoneBlocks = highGroundDeadZone(
      terrainEvidence, geometry, attacker, target,
    );
    return { ...geometry, terrainPrintedSize: terrainEvidence.printedSize,
      terrainEffectiveSize: terrainEvidence.effectiveSize,
      terrainSupportChain: terrainEvidence.supportTerrainChain,
      attackerEffectiveSize: attacker.effectiveSize,
      targetEffectiveSize: target.effectiveSize,
      fullCoverIgnoredToOrFromFlying: attacker.flying || target.flying,
      fullCoverBlocks, attackerDirectCover, targetDirectCover,
      directCoverBlocks, elevationDeadZoneBlocks,
      blocksLineOfSight: fullCoverBlocks || directCoverBlocks || elevationDeadZoneBlocks };
  });
  const attackerModels = activeCanonicalModels(attackerPiece, input.dataBundle, context);
  const targetModels = activeCanonicalModels(targetPiece, input.dataBundle, context);
  const targetAllHighGround = targetModels.length > 0
    && targetModels.every((entry) => entry.elevationBand === "high");
  const attackOriginatesFromLowerElevation = !attacker.flying
    && attackerModels.some((entry) => entry.elevationBand !== "high");
  const highGroundEvadeEligible = !target.flying && targetAllHighGround
    && attackOriginatesFromLowerElevation;
  const flyingCoverIntegration = attacker.flying || target.flying
    ? evaluateOfficialFlyingCoverV1({ attacker: attackerPiece, target: targetPiece,
      traceEvidenceComplete: true,
      terrainChecks: assessments.map((entry) => ({ terrainId: entry.terrainId,
        terrainEffectiveSize: entry.terrainEffectiveSize,
        attackerEffectiveSize: attacker.flying ? undefined : attacker.effectiveSize,
        targetEffectiveSize: target.flying ? undefined : target.effectiveSize,
        traceIntersects: entry.blockingTerrainTrace || entry.elevationDeadZoneBlocks,
        attackerWithinOneInch: entry.attackerWithinOneInch,
        targetWithinOneInch: entry.targetWithinOneInch,
        closeQuarters: entry.closeQuarters,
        elevationDeadZoneAppliesToNonFlyingModel: entry.elevationDeadZoneBlocks })) })
    : null;
  if (flyingCoverIntegration
    && flyingCoverIntegration.lineOfSightBlocked
      !== assessments.some((entry) => entry.blocksLineOfSight)) {
    fail("ELEVATION_FLYING_COVER_INTEGRATION_MISMATCH");
  }
  const blockingTerrainIds = assessments.filter((entry) => entry.blocksLineOfSight)
    .map((entry) => entry.terrainId);
  const body = { schema: "starcraft_tmg_official_elevated_line_of_sight_result_v1",
    attacker: { unitId: attacker.unitId, modelId: attacker.modelId,
      elevationBand: attacker.elevationBand, effectiveSize: attacker.effectiveSize,
      flying: attacker.flying },
    target: { unitId: target.unitId, modelId: target.modelId,
      elevationBand: target.elevationBand, effectiveSize: target.effectiveSize,
      flying: target.flying },
    assessments, terrainPiecesAssessedIndependently: true,
    terrainEffectiveSizesNeverCombineAcrossDistinctPieces: true,
    terrainStackingAddsOnlyDeclaredSupportChain: true,
    topDownHorizontalMeasurement: true,
    targetAllHighGround, attackOriginatesFromLowerElevation,
    highGroundEvadeEligible, flyingHighGroundEvadeEligible: false,
    flyingCoverIntegration,
    geometryAdapter: { sourceKernel: "official_terrain_los_rules_kernel_v1",
      projectionKind: "remove_verified_support_surfaces_for_geometry_only",
      projectionHash: hashStarcraftTmgContract(projectedState),
      inheritedResultHash: base.resultHash,
      flyingNullSizeGeometrySubstitutions: geometry.substitutions,
      flyingOverlappedSurfaceExclusions: flyingOverlappedTerrainIds.sort(),
      substitutedProfileAffectsGeometryOrCoverSize: false,
      priorExecutorSourceMutationAllowed: false },
    visible: blockingTerrainIds.length === 0, blockingTerrainIds,
    lineOfSightStatus: blockingTerrainIds.length === 0
      ? "visible" : "blocked_by_one_qualifying_terrain",
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialElevationEffectiveSizePlanV1(input = {}) {
  const plan = input.plan;
  const actor = input.actor;
  const procedureKind = String(input.procedureKind || "");
  const planId = String(plan?.planId || "").trim();
  if (!activePiece(actor) || !object(plan) || !planId) {
    fail("ELEVATION_PLAN_INVALID");
  }
  let result;
  if (procedureKind === "effective_size_check") {
    result = evaluateOfficialEffectiveSizeV1({ state: input.state,
      subjectKind: plan.subjectKind, unitId: plan.unitId,
      modelId: plan.modelId, terrainId: plan.terrainId,
      dataBundle: input.dataBundle });
  } else if (procedureKind === "horizontal_elevation_distance_check") {
    result = evaluateOfficialHorizontalElevationDistanceV1({ state: input.state,
      leftUnitId: plan.leftUnitId, leftModelId: plan.leftModelId,
      rightUnitId: plan.rightUnitId, rightModelId: plan.rightModelId,
      dataBundle: input.dataBundle });
  } else if (procedureKind === "elevated_line_of_sight_check") {
    const target = input.state.pieces?.find((piece) => piece.id === plan.targetUnitId);
    if (!activePiece(target)) fail("ELEVATION_TARGET_INVALID", String(plan.targetUnitId || ""));
    result = evaluateOfficialElevatedLineOfSightV1({ state: input.state,
      attacker: actor, attackerModelId: plan.attackerModelId,
      target, targetModelId: plan.targetModelId, dataBundle: input.dataBundle });
  } else fail("ELEVATION_PROCEDURE_KIND_INVALID", procedureKind);
  const body = { planId, procedureKind, actorUnitId: actor.id, result,
    productionQuarantined: true, trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}
