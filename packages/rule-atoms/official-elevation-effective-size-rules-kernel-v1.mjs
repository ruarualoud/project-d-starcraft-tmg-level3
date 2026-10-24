import { hashStarcraftTmgContract, canonicalStarcraftTmgJson,
  STARCRAFT_TMG_HASH_ALGORITHM } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createHash } from "node:crypto";
import { constants as bufferConstants } from "node:buffer";
import { createNativeAssessmentPrefixDigestV1 } from
  "./native-assessment-prefix-digest-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import { evaluateOfficialFlyingCoverV1 } from
  "./official-flying-rules-kernel-v1.mjs";
import {
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from "./official-model-base-geometry-rules-kernel-v1.mjs";
import {
  evaluateOfficialTerrainLineOfSightV1,
  evaluateOfficialTerrainLineOfSightBatchV1,
  verifyOfficialTerrainLineOfSightBatchInputsV1,
  createOfficialTerrainLineOfSightBatchV1,
} from
  "./official-terrain-los-rules-kernel-v1.mjs";

export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_KERNEL_SCHEMA =
  "starcraft_tmg_official_elevation_effective_size_rules_kernel_v1";
export const OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_TERRAIN_ELEVATION_AGREEMENT_SCHEMA =
  "starcraft_tmg_official_terrain_elevation_agreement_v1";

const TOLERANCE = 1;
const INCH = 1000;
const CLOSE_QUARTERS_RANGE = 3000;
// Exact text of this module's own fully sealed/frozen results only. No caller
// can enroll a prepared result, digest, length, similar ID or mutable value.
const NATIVE_ELEVATED_LOS_TEXT = new WeakMap();

export function canonicalNativeOfficialElevatedLosResultV1(result) {
  return NATIVE_ELEVATED_LOS_TEXT.get(result) || null;
}

// Only our newly assembled assessment records enter this private seam. Their
// values are scalars or string-ID arrays: canonical key order plus native JSON
// retains the exact old bytes without copying/normalizing those arrays again.
// Any future non-flat value retains the original full canonical diagnostics.
function canonicalNativeElevatedAssessment(assessment) {
  const ordered = {};
  for (const key of Object.keys(assessment).sort()) {
    const value = assessment[key];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry !== "string") return canonicalStarcraftTmgJson(assessment);
      }
    } else if (value !== null && typeof value !== "string"
      && typeof value !== "boolean"
      && !(typeof value === "number" && Number.isFinite(value))) {
      return canonicalStarcraftTmgJson(assessment);
    }
    ordered[key] = value;
  }
  return JSON.stringify(ordered);
}

function sealNativeElevatedLosResult(body, nativeAssessmentTexts = null, context = null) {
  const keys = Object.keys(body).sort().filter(key => body[key] !== undefined);
  const sharedPrefix = context && nativeAssessmentTexts !== null
    && keys[0] === "assessments";
  const prefix = sharedPrefix ? (context.nativeAssessmentPrefixDigest ||=
    createNativeAssessmentPrefixDigestV1(STARCRAFT_TMG_HASH_ALGORITHM))
    .digest(nativeAssessmentTexts) : null;
  const nativeAssessmentText = nativeAssessmentTexts === null ? null
    : prefix?.text || `[${nativeAssessmentTexts.join(",")}]`;
  let fields;
  try {
    // Private result roots have fixed named (non-index) keys. Canonicalize
    // each value ONCE; retain those exact fragments for the enclosing result.
    fields = new Map(keys
      .map(key => [key, `${JSON.stringify(key)}:${key === "assessments" && nativeAssessmentText !== null
        ? nativeAssessmentText : canonicalStarcraftTmgJson(body[key])}`]));
  } catch {
    // Exceptional non-JSON values retain the old full diagnostic path.
    return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
  }
  const bodyCharacters = 2 + Math.max(0, fields.size - 1)
    + [...fields.values()].reduce((total, value) => total + value.length, 0);
  // Streaming is not permission to bypass the old actual JS string capacity.
  if (bodyCharacters > bufferConstants.MAX_STRING_LENGTH) throw new RangeError("Invalid string length");
  const digest = sharedPrefix
    ? prefix.digest
    : createHash(STARCRAFT_TMG_HASH_ALGORITHM).update("{");
  let separator = sharedPrefix ? "," : "";
  for (const [key, text] of fields) {
    if (sharedPrefix && key === "assessments") continue;
    digest.update(separator).update(text);
    separator = ",";
  }
  const resultHash = digest.update("}").digest("hex");
  const result = freezeDeep({ ...body, resultHash });
  const resultHashText = `${JSON.stringify("resultHash")}:${JSON.stringify(resultHash)}`;
  if (bodyCharacters + 1 + resultHashText.length <= bufferConstants.MAX_STRING_LENGTH) {
    fields.set("resultHash", resultHashText);
    NATIVE_ELEVATED_LOS_TEXT.set(result, "{" + [...fields.keys()].sort()
      .map(key => fields.get(key)).join(",") + "}");
  }
  // A too-large enclosing result cannot be cached; publishing this native
  // result still retains the original evaluator's body-only seal semantics.
  return result;
}

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
function terrainPhysicalFootprint(terrain) {
  const footprint = terrain.footprint;
  return createOfficialPhysicalFootprintV1({
    objectId: terrain.terrainId,
    kind: "terrain_piece",
    shape: "rectangle",
    center: {
      xMilliInches: Math.round((footprint.minXMilliInches
        + footprint.maxXMilliInches) / 2),
      yMilliInches: Math.round((footprint.minYMilliInches
        + footprint.maxYMilliInches) / 2),
    },
    widthMilliInches: footprint.maxXMilliInches - footprint.minXMilliInches,
    depthMilliInches: footprint.maxYMilliInches - footprint.minYMilliInches,
    rotationDegrees: 0,
  });
}
function modelEdgeToTerrain(model, terrain) {
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: model.footprint,
    right: terrainPhysicalFootprint(terrain),
  }).minimumSeparationMilliInches;
}
function modelEdgeDistance(left, right) {
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: left.footprint,
    right: right.footprint,
  }).minimumSeparationMilliInches;
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
  // Only a factory-owned context with deeply frozen, freshly copied queries can
  // reuse a model. Actual piece identity, not an ID/name or caller-prepared flag,
  // owns this cache; scalar and mutable counterfactual paths remain uncached.
  const ownedCache = Object.isFrozen(piece) ? context.ownedCanonicalModelsByPiece : null;
  const cachedModels = ownedCache?.get(piece);
  if (cachedModels?.has(modelId)) return cachedModels.get(modelId);
  if (!activePiece(piece)) fail("ELEVATION_UNIT_INVALID", String(piece?.id || ""));
  const model = (piece.models || []).find((entry) => entry.id === modelId && activeModel(entry));
  const profile = officialProfile(piece, dataBundle);
  const width = milli(model?.baseWidthInches, "ELEVATION_MODEL_BASE_INVALID", modelId);
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches,
    "ELEVATION_MODEL_BASE_INVALID", modelId);
  const shape = String(model?.baseShape || "round").toLowerCase();
  if (!model || !["round", "rectangle"].includes(shape)
    || width <= 0 || depth <= 0 || (shape === "round" && Math.abs(width - depth) > TOLERANCE)
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
  const footprint = createOfficialPhysicalFootprintV1({
    objectId: modelId,
    kind: "model_base",
    shape,
    center,
    widthMilliInches: width,
    depthMilliInches: depth,
    rotationDegrees: model.baseRotationDegrees || 0,
  });
  const supportTerrainId = supportTerrainIds[0] || null;
  const support = supportTerrainId ? context.terrainById.get(supportTerrainId) : null;
  if (supportTerrainId && (!support || support.standableHorizontalSurface !== true
    || evaluateOfficialPhysicalFootprintRelationV1({
      left: footprint,
      right: terrainPhysicalFootprint(support),
    }).minimumSeparationMilliInches > TOLERANCE)) {
    fail("ELEVATION_MODEL_SUPPORT_INVALID", `${modelId}/${supportTerrainId}`);
  }
  const supportingTerrainEffectiveSize = supportTerrainId
    ? context.effectiveSizeByTerrainId.get(supportTerrainId) : 0;
  const elevationBand = flying ? "ignored_for_flying"
    : elevationBandForSize(supportingTerrainEffectiveSize);
  if (!flying && normalizedElevation(model.elevation) !== elevationBand) {
    fail("ELEVATION_MODEL_BAND_MISMATCH", modelId);
  }
  const result = { unitId: piece.id, modelId, sideKey: piece.sideKey, center,
    footprint, baseShape: shape, officialRecordKey: profile.recordKey,
    printedSize: profile.printedSize, flying, supportTerrainId,
    supportTerrainIds, supportingTerrainEffectiveSize,
    supportTerrainChain: supportTerrainId
      ? [supportTerrainId, ...(context.supportChainByTerrainId.get(supportTerrainId) || [])]
      : [],
    elevationBand,
    effectiveSize: flying ? "higher_than_every_terrain"
      : profile.printedSize + supportingTerrainEffectiveSize };
  if (ownedCache) {
    const models = cachedModels || new Map();
    if (!cachedModels) ownedCache.set(piece, models);
    models.set(modelId, freezeDeep(result));
  }
  return result;
}
function activeCanonicalModels(piece, dataBundle, context) {
  return (piece.models || []).filter(activeModel).map((model) => (
    canonicalModel(piece, model.id, dataBundle, context)
  ));
}
function terrainEffectiveSizeEvidence(context) {
  // This context is created only by native full-map/source verification; it is
  // never caller-provided and its support graph is complete before publication.
  // Every ray retains the FULL rows, but immutable map evidence is built once.
  return context.terrainEffectiveSizeEvidence ||= freezeDeep(context.terrain.map((terrain) => ({
    terrainId: terrain.terrainId, printedSize: terrain.size,
    supportTerrainId: context.directSupport.get(terrain.terrainId) || null,
    supportTerrainChain: context.supportChainByTerrainId.get(terrain.terrainId),
    effectiveSize: context.effectiveSizeByTerrainId.get(terrain.terrainId),
  })));
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

// Model-only projections for one owned synchronous batch. Callers cannot supply
// a trusted context; terrain and source facts are verified once from the snapshot.
// This is not the scalar's complete terrain-proof result or an LOS verdict.
function projectEffectiveSizeSubjects(pieces, subjects, dataBundle, context) {
  return freezeDeep(subjects.map((subject) => {
    const piece = pieces?.find((entry) => entry.id === subject?.unitId);
    return canonicalModel(piece, subject?.modelId, dataBundle, context);
  }));
}

export function evaluateOfficialEffectiveSizeSubjectsBatchV1(input = {}) {
  if (!Array.isArray(input.subjects)) {
    fail("ELEVATION_EFFECTIVE_SIZE_SUBJECT_BATCH_INVALID");
  }
  const snapshot = structuredClone({
    state: {
      board: {
        terrain: input.state?.board?.terrain,
        terrainElevationAgreement: input.state?.board?.terrainElevationAgreement,
      },
      pieces: input.state?.pieces,
    },
    dataBundle: input.dataBundle,
    subjects: input.subjects,
  });
  const context = verifyElevationContext(snapshot.state, snapshot.dataBundle);
  return projectEffectiveSizeSubjects(snapshot.state.pieces, snapshot.subjects,
    snapshot.dataBundle, context);
}

// Fixed-map casualty branches vary only the complete piece collection. Own and
// verify map/source facts once; callers receive no prepared context or trusted
// model cache. Every invocation copies its actual pieces/subjects and repeats
// canonicalModel's source, live-model, footprint, support and elevation checks.
// The caller cannot replace or mutate this owner's board/data after creation.
export function createOfficialEffectiveSizeSubjectsUnitBatchV1(input = {}) {
  const snapshot = freezeDeep(structuredClone({
    state: {
      board: {
        terrain: input.state?.board?.terrain,
        terrainElevationAgreement: input.state?.board?.terrainElevationAgreement,
      },
    },
    dataBundle: input.dataBundle,
  }));
  const context = verifyElevationContext(snapshot.state, snapshot.dataBundle);
  return Object.freeze({
    evaluatePieces(pieces, subjects) {
      if (!Array.isArray(subjects)) {
        fail("ELEVATION_EFFECTIVE_SIZE_SUBJECT_BATCH_INVALID");
      }
      const current = structuredClone({ pieces, subjects });
      return projectEffectiveSizeSubjects(current.pieces, current.subjects,
        snapshot.dataBundle, context);
    },
  });
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

function geometryProjection(state, supportIds, dataBundle, participantIds,
  ownedTerrain = null) {
  // Geometry projection is deliberately minimal. The prior implementation
  // cloned and hashed the complete multi-megabyte room state for every
  // attacker/target model pair even though LoS reads only these participants
  // and terrain. Keeping the exact geometry inputs preserves the proof while
  // avoiding quadratic work as journals and catalogues grow.
  const projected = {
    board: {
      terrain: ownedTerrain || structuredClone(state.board?.terrain || []),
    },
    pieces: (state.pieces || []).filter((piece) => participantIds.has(piece.id))
      .map((piece) => structuredClone(piece)),
  };
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
  if (!ownedTerrain) {
    for (const terrain of projected.board?.terrain || []) {
      if (supportIds.has(terrain.id)) terrain.isRemoved = true;
    }
  }
  return { projected, substitutions };
}

// Only a factory-owned, already verified complete map can share this storage.
// Participant pairs affect pieces, not terrain: the exact excluded support set
// is the only varying terrain input within this one private immutable batch.
// Public one-shot operations keep their original copies and validation order.
function ownedGeometryTerrain(owned, supportIds) {
  const key = JSON.stringify([...supportIds].sort());
  if (!owned.terrainBySupportSet.has(key)) {
    const terrain = structuredClone(owned.snapshot.state.board?.terrain || []);
    for (const entry of terrain) {
      if (supportIds.has(entry.id)) entry.isRemoved = true;
    }
    owned.terrainBySupportSet.set(key, freezeDeep(terrain));
  }
  return owned.terrainBySupportSet.get(key);
}

function ownedGeometryProjectionHash(owned, geometry) {
  const projected = geometry.projected;
  // The complete canonical native body is {board:{terrain},pieces}. Future
  // shape extensions retain the generic path rather than losing a field.
  if (Object.keys(projected).length !== 2
    || Object.keys(projected.board).length !== 1) {
    return hashStarcraftTmgContract(projected);
  }
  const terrain = projected.board.terrain;
  // Validate/serialize every participant before constructing a possibly large
  // terrain string. The terrain is already our completely verified own copy.
  const piecesText = canonicalStarcraftTmgJson(projected.pieces);
  let prefix = owned.geometryHashPrefixByTerrain.get(terrain);
  if (!prefix) {
    const text = `{"board":{"terrain":${canonicalStarcraftTmgJson(terrain)}},"pieces":`;
    prefix = { characters: text.length,
      digest: createHash(STARCRAFT_TMG_HASH_ALGORITHM).update(text) };
    owned.geometryHashPrefixByTerrain.set(terrain, prefix);
  }
  if (prefix.characters + piecesText.length + 1 > bufferConstants.MAX_STRING_LENGTH) {
    throw new RangeError("Invalid string length");
  }
  // Copy SHA256's native state, not an accepted identity or a caller proof.
  // ALL original canonical bytes still enter the original full-body digest;
  // only the identical private terrain prefix is normalized/hashed once.
  return prefix.digest.copy().update(piecesText).update("}").digest("hex");
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

function prepareElevatedLineOfSight(input, context) {
  const attackerPiece = input.attacker;
  const targetPiece = input.target;
  const attacker = canonicalModel(attackerPiece, input.attackerModelId,
    input.dataBundle, context);
  const target = canonicalModel(targetPiece, input.targetModelId,
    input.dataBundle, context);
  const flyingOverlappedTerrainIds = context.terrain.filter((terrain) => (
    (attacker.flying
      && modelEdgeToTerrain(attacker, terrain) <= TOLERANCE)
    || (target.flying
      && modelEdgeToTerrain(target, terrain) <= TOLERANCE)
  )).map((terrain) => terrain.terrainId);
  const supportIds = new Set([...attacker.supportTerrainChain, ...target.supportTerrainChain,
    ...flyingOverlappedTerrainIds]);
  return { attackerPiece, targetPiece, attacker, target, supportIds,
    flyingOverlappedTerrainIds };
}

export function evaluateOfficialElevatedLineOfSightV1(input = {}) {
  const state = input.state;
  const context = verifyElevationContext(state, input.dataBundle);
  const prepared = prepareElevatedLineOfSight(input, context);
  const { attackerPiece, targetPiece, supportIds } = prepared;
  const geometry = geometryProjection(state, supportIds, input.dataBundle,
    new Set([attackerPiece.id, targetPiece.id]));
  const projectedState = geometry.projected;
  const projectedAttacker = projectedState.pieces.find((entry) => entry.id === attackerPiece.id);
  const projectedTarget = projectedState.pieces.find((entry) => entry.id === targetPiece.id);
  const base = evaluateOfficialTerrainLineOfSightV1({ state: projectedState,
    attacker: projectedAttacker, attackerModelId: input.attackerModelId,
    target: projectedTarget, targetModelId: input.targetModelId,
    dataBundle: input.dataBundle });
  return finishElevatedLineOfSight(input, context, prepared, geometry, base);
}

// Private snapshot and grouping live only for this synchronous invocation.
// No state/revision cache survives; distinct query objects are validated even
// if they repeat a unit id. Every model pair still receives its full result.
function prepareElevatedLineOfSightBatch(input, owned = null) {
  if (!Array.isArray(input.queries) || input.queries.length === 0) {
    fail("ELEVATION_LOS_BATCH_INVALID");
  }
  const snapshot = owned
    ? { ...owned.snapshot, queries: structuredClone(input.queries) }
    : structuredClone({ state: input.state,
      dataBundle: input.dataBundle, queries: input.queries });
  const context = owned?.context
    || verifyElevationContext(snapshot.state, snapshot.dataBundle);
  if (owned) {
    // Neither callers nor a projection callback can mutate the private query
    // participants. A later evaluate/verify call clones NEW actual objects,
    // so even same-ID pieces with changed source/position/support never alias.
    freezeDeep(snapshot.queries);
    context.ownedCanonicalModelsByPiece ||= new WeakMap();
  }
  const groups = new Map();
  const preparedQueries = snapshot.queries.map((query) => {
    const request = { ...query, state: snapshot.state, dataBundle: snapshot.dataBundle };
    const prepared = prepareElevatedLineOfSight(request, context);
    const participantIds = new Set([prepared.attackerPiece.id, prepared.targetPiece.id]);
    const key = JSON.stringify([[...participantIds].sort(), [...prepared.supportIds].sort()]);
    let group = groups.get(key);
    if (!group) {
      let geometry = owned?.geometryByKey.get(key);
      if (!geometry) {
        geometry = geometryProjection(snapshot.state, prepared.supportIds,
          snapshot.dataBundle, participantIds,
          owned ? ownedGeometryTerrain(owned, prepared.supportIds) : null);
        geometry.projectionHash = owned
          ? ownedGeometryProjectionHash(owned, geometry)
          : hashStarcraftTmgContract(geometry.projected);
        if (owned) owned.geometryByKey.set(key, freezeDeep(geometry));
      }
      group = { geometry, queries: [], results: null };
      groups.set(key, group);
    }
    const index = group.queries.length;
    group.queries.push({ attacker: group.geometry.projected.pieces.find((piece) => (
      piece.id === prepared.attackerPiece.id
    )), attackerModelId: request.attackerModelId,
    target: group.geometry.projected.pieces.find((piece) => (
      piece.id === prepared.targetPiece.id
    )), targetModelId: request.targetModelId });
    return { request, prepared, group, index };
  });
  return { snapshot, context, groups, preparedQueries, owned };
}

// This seam is available only to our privately owned geometry, after the whole
// elevated query preparation has succeeded. Public one-shot paths retain their
// original preparation/error order, and callers never supply a prepared context.
function ownedOrdinaryLineOfSightBatch(owned, geometry, dataBundle) {
  if (!owned) return null;
  // Ordinary LOS reads its owned terrain context and each freshly copied query's
  // physical participants, not the projected state's participant list. Different
  // participant projections therefore share preparation ONLY when their actual
  // factory-owned terrain array is the same; excluded support sets remain apart.
  const terrain = geometry.projected.board.terrain;
  let batch = owned.ordinaryByTerrain.get(terrain);
  if (!batch) {
    batch = createOfficialTerrainLineOfSightBatchV1({ state: geometry.projected,
      dataBundle });
    owned.ordinaryByTerrain.set(terrain, batch);
  }
  return batch;
}

// Shares all source, terrain, support and physical-model preparation with the
// full evaluator. NO LOS/cover outcome is asserted by this input-only seam.
function verifyElevatedLineOfSightPreparedInputs({ snapshot, context, groups, preparedQueries,
  owned }) {
  for (const group of groups.values()) {
    const native = ownedOrdinaryLineOfSightBatch(owned, group.geometry, snapshot.dataBundle);
    if (native) native.verifyInputs(group.queries);
    else verifyOfficialTerrainLineOfSightBatchInputsV1({ state: group.geometry.projected,
      dataBundle: snapshot.dataBundle, queries: group.queries });
  }
  const checkedPieces = new Set();
  for (const { prepared } of preparedQueries) {
    for (const piece of [prepared.attackerPiece, prepared.targetPiece]) {
      if (checkedPieces.has(piece)) continue;
      activeCanonicalModels(piece, snapshot.dataBundle, context);
      checkedPieces.add(piece);
    }
  }
  return Object.freeze({ inputsValidated: true, queryCount: preparedQueries.length });
}

function evaluateElevatedLineOfSightPrepared({ snapshot, context, groups, preparedQueries,
  owned }) {
  for (const group of groups.values()) {
    const native = ownedOrdinaryLineOfSightBatch(owned, group.geometry, snapshot.dataBundle);
    group.results = native ? native.evaluate(group.queries)
      : evaluateOfficialTerrainLineOfSightBatchV1({
        state: group.geometry.projected, dataBundle: snapshot.dataBundle,
        queries: group.queries });
  }
  return Object.freeze(preparedQueries.map(({ request, prepared, group, index }) => (
    finishElevatedLineOfSight(request, context, prepared, group.geometry,
      group.results[index])
  )));
}

// Only an owned batch reaches this projection seam. Every query is prepared
// against the complete immutable source before any result is projected. Native
// full results and seals are unchanged; only their retention lifetime differs.
function projectOwnedElevatedLineOfSightPrepared({ snapshot, context, groups,
  preparedQueries, owned }, project) {
  for (const group of groups.values()) {
    group.operation = ownedOrdinaryLineOfSightBatch(owned, group.geometry,
      snapshot.dataBundle).prepareEvaluation(group.queries);
  }
  return Object.freeze(preparedQueries.map(({ request, prepared, group, index }, queryIndex) => {
    const base = group.operation.evaluateAt(index);
    const result = finishElevatedLineOfSight(request, context, prepared, group.geometry, base);
    return project(result, queryIndex);
  }));
}

export function verifyOfficialElevatedLineOfSightBatchInputsV1(input = {}) {
  return verifyElevatedLineOfSightPreparedInputs(prepareElevatedLineOfSightBatch(input));
}

export function evaluateOfficialElevatedLineOfSightBatchV1(input = {}) {
  return evaluateElevatedLineOfSightPrepared(prepareElevatedLineOfSightBatch(input));
}

// A caller receives operations, never a trusted/prepared context. Own and verify
// the complete map/source snapshot once. Each call still clones its query objects
// and runs all native model, support and ordinary-geometry validation. Geometry
// reuse is bound to this one immutable snapshot, participant IDs and support set;
// mutable caller objects, results and authority never enter the private cache.
export function createOfficialElevatedLineOfSightBatchV1(input = {}) {
  const snapshot = freezeDeep(structuredClone({ state: input.state,
    dataBundle: input.dataBundle }));
  const owned = { snapshot,
    context: verifyElevationContext(snapshot.state, snapshot.dataBundle),
    geometryByKey: new Map(), ordinaryByTerrain: new WeakMap(),
    terrainBySupportSet: new Map(), geometryHashPrefixByTerrain: new WeakMap() };
  return Object.freeze({
    verifyInputs(queries) {
      return verifyElevatedLineOfSightPreparedInputs(
        prepareElevatedLineOfSightBatch({ queries }, owned));
    },
    evaluate(queries) {
      return evaluateElevatedLineOfSightPrepared(
        prepareElevatedLineOfSightBatch({ queries }, owned));
    },
    project(queries, project) {
      if (typeof project !== "function") fail("ELEVATION_LOS_PROJECTOR_INVALID");
      return projectOwnedElevatedLineOfSightPrepared(
        prepareElevatedLineOfSightBatch({ queries }, owned), project);
    },
  });
}

function nativeElevatedAssessmentLookupKey(overrides) {
  // A PRIVATE lookup, not an authority hash/canonical assessment fragment. The
  // one native producer creates plain scalar/string-array fields in fixed order.
  // JSON preserves every key and value; differing order can only miss reuse,
  // never alias different fields. Keep the old canonical path for non-flat data.
  for (const value of Object.values(overrides)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry !== "string") return canonicalNativeElevatedAssessment(overrides);
      }
    } else if (value !== null && typeof value !== "string"
      && typeof value !== "boolean"
      && !(typeof value === "number" && Number.isFinite(value))) {
      return canonicalNativeElevatedAssessment(overrides);
    }
  }
  return JSON.stringify(overrides);
}

function nativeElevatedAssessmentProjection(context, geometry, overrides) {
  const build = () => {
    const assessment = freezeDeep({ ...geometry, ...overrides });
    return Object.freeze({ assessment, text: canonicalNativeElevatedAssessment(assessment) });
  };
  // Capture ALL overrides, not a guessed subset of Size/cover flags. Undefined
  // overrides can erase inherited fields and must retain the old uncached path.
  if (Object.values(overrides).some(value => value === undefined)) return build();
  let key;
  // Reuse need not sort/re-encode authority fragments before a cache lookup.
  // Published assessment text still uses its unchanged canonical serializer.
  try { key = nativeElevatedAssessmentLookupKey(overrides); }
  catch { return build(); }
  const cache = context.nativeAssessmentProjectionByGeometry ||= new WeakMap();
  let variants = cache.get(geometry);
  if (!variants) cache.set(geometry, variants = new Map());
  if (!variants.has(key)) variants.set(key, build());
  // Actual native geometry identity + complete freshly computed overrides,
  // private to this source context. No caller-supplied result/ID/hash is trusted.
  return variants.get(key);
}

function finishElevatedLineOfSight(input, context, prepared, geometry, base) {
  const { attackerPiece, targetPiece, attacker, target, supportIds,
    flyingOverlappedTerrainIds } = prepared;
  const baseById = new Map(base.assessments.map((entry) => [entry.terrainId, entry]));
  const terrainRows = terrainEffectiveSizeEvidence(context);
  const assessmentTexts = [];
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
    const overrides = { terrainPrintedSize: terrainEvidence.printedSize,
      terrainEffectiveSize: terrainEvidence.effectiveSize,
      terrainSupportChain: terrainEvidence.supportTerrainChain,
      attackerEffectiveSize: attacker.effectiveSize,
      targetEffectiveSize: target.effectiveSize,
      fullCoverIgnoredToOrFromFlying: attacker.flying || target.flying,
      fullCoverBlocks, attackerDirectCover, targetDirectCover,
      directCoverBlocks, elevationDeadZoneBlocks,
      blocksLineOfSight: fullCoverBlocks || directCoverBlocks || elevationDeadZoneBlocks };
    const projection = nativeElevatedAssessmentProjection(context, geometry, overrides);
    const assessment = projection.assessment;
    assessmentTexts.push(projection.text);
    return assessment;
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
      projectionHash: geometry.projectionHash || hashStarcraftTmgContract(geometry.projected),
      inheritedResultHash: base.resultHash,
      flyingNullSizeGeometrySubstitutions: geometry.substitutions,
      flyingOverlappedSurfaceExclusions: flyingOverlappedTerrainIds.sort(),
      substitutedProfileAffectsGeometryOrCoverSize: false,
      priorExecutorSourceMutationAllowed: false },
    visible: blockingTerrainIds.length === 0, blockingTerrainIds,
    lineOfSightStatus: blockingTerrainIds.length === 0
      ? "visible" : "blocked_by_one_qualifying_terrain",
    productionQuarantined: true, trainingTruth: false };
  return sealNativeElevatedLosResult(body, assessmentTexts, context);
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
