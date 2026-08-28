import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_BOUNDED_FULL_COVER_LOS_KERNEL_ID =
  "authority.bounded-full-cover-los-kernel-v1";
export const OFFICIAL_BOUNDED_FULL_COVER_LOS_KERNEL_VERSION = "1.0.0";

export const OFFICIAL_BOUNDED_FULL_COVER_LOS_ATOM_IDS = Object.freeze([
  "rule-atom:blocking-terrain-effective-size-definition",
  "rule-atom:ground-level-effective-size",
  "rule-atom:line-of-sight-terrain-footprint",
  "rule-atom:singleton:core-11-blocking-terrain-los:3ef61a869b06",
  "rule-atom:singleton:core-11-effective-size-cover-use:948da3cf0267",
  "rule-atom:singleton:core-11-line-of-sight-blocking-terrain-assessment:b463c5133c26",
  "rule-atom:singleton:core-11-line-of-sight-full-cover:d5f5cc2c3ae1",
  "rule-atom:singleton:core-5-1-size:181a08680a53",
]);

const TERRAIN_SCHEMA = "starcraft_tmg_official_axis_aligned_full_cover_v1";

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

function terrainContractBody(terrain) {
  return {
    schema: terrain.schema,
    id: terrain.id,
    shape: terrain.shape,
    xInches: terrain.xInches,
    yInches: terrain.yInches,
    widthInches: terrain.widthInches,
    heightInches: terrain.heightInches,
    elevation: terrain.elevation,
    coverType: terrain.coverType,
    effectiveSize: terrain.effectiveSize,
    footprintAuthority: terrain.footprintAuthority,
    rulesTruth: terrain.rulesTruth,
    trainingTruth: terrain.trainingTruth,
  };
}

function milli(value, code) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(code);
  const result = Math.round(number * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function verifyRoundModel(model) {
  if (!object(model)
    || String(model.id || "").trim() === ""
    || model.baseShape !== "round"
    || model.elevation !== "ground"
    || milli(model.baseWidthInches, "BOUNDED_LOS_MODEL_INVALID") <= 0
    || milli(model.baseDepthInches, "BOUNDED_LOS_MODEL_INVALID")
      !== milli(model.baseWidthInches, "BOUNDED_LOS_MODEL_INVALID")) {
    fail("BOUNDED_LOS_MODEL_INVALID", String(model?.id || ""));
  }
  return {
    id: model.id,
    x: milli(model.xInches, "BOUNDED_LOS_MODEL_INVALID"),
    y: milli(model.yInches, "BOUNDED_LOS_MODEL_INVALID"),
    radius: milli(model.baseWidthInches, "BOUNDED_LOS_MODEL_INVALID") / 2,
  };
}

function verifySize(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 6) fail(code);
  return number;
}

function verifyTerrain(terrain) {
  if (!object(terrain)
    || terrain.schema !== TERRAIN_SCHEMA
    || String(terrain.id || "").trim() === ""
    || terrain.shape !== "rectangle"
    || terrain.coverType !== "full"
    || terrain.elevation !== "ground"
    || terrain.terrainHash !== hashStarcraftTmgContract(terrainContractBody(terrain))) {
    fail("BOUNDED_LOS_TERRAIN_INVALID", String(terrain?.id || ""));
  }
  const width = milli(terrain.widthInches, "BOUNDED_LOS_TERRAIN_INVALID");
  const height = milli(terrain.heightInches, "BOUNDED_LOS_TERRAIN_INVALID");
  if (width <= 0 || height <= 0) fail("BOUNDED_LOS_TERRAIN_INVALID", terrain.id);
  const x = milli(terrain.xInches, "BOUNDED_LOS_TERRAIN_INVALID");
  const y = milli(terrain.yInches, "BOUNDED_LOS_TERRAIN_INVALID");
  return {
    id: terrain.id,
    effectiveSize: verifySize(
      terrain.effectiveSize,
      "BOUNDED_LOS_TERRAIN_EFFECTIVE_SIZE_INVALID",
    ),
    minX: x - (width / 2),
    maxX: x + (width / 2),
    minY: y - (height / 2),
    maxY: y + (height / 2),
    terrainHash: terrain.terrainHash,
  };
}

export function createOfficialAxisAlignedFullCoverTerrainV1(input = {}) {
  const body = {
    schema: TERRAIN_SCHEMA,
    id: String(input.id || "").trim(),
    shape: "rectangle",
    xInches: Number(input.xInches),
    yInches: Number(input.yInches),
    widthInches: Number(input.widthInches),
    heightInches: Number(input.heightInches),
    elevation: "ground",
    coverType: "full",
    effectiveSize: Number(input.effectiveSize),
    footprintAuthority: "physical_outermost_edges_top_down",
    rulesTruth: "official_bounded_full_cover_rectangle",
    trainingTruth: false,
  };
  const terrain = freezeDeep({
    ...body,
    terrainHash: hashStarcraftTmgContract(body),
  });
  verifyTerrain(terrain);
  return terrain;
}

function centerTraceIntersectsRectangle(attacker, target, terrain) {
  const dx = target.x - attacker.x;
  const dy = target.y - attacker.y;
  let minimum = 0;
  let maximum = 1;
  for (const [p, q] of [
    [-dx, attacker.x - terrain.minX],
    [dx, terrain.maxX - attacker.x],
    [-dy, attacker.y - terrain.minY],
    [dy, terrain.maxY - attacker.y],
  ]) {
    if (p === 0 && q < 0) return false;
    if (p === 0) continue;
    const ratio = q / p;
    if (p < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return maximum >= 0 && minimum <= 1;
}

function intervalContains(minimum, maximum, center, radius) {
  return minimum <= center - radius && maximum >= center + radius;
}

function completeBarrier(attacker, target, terrain) {
  const verticalSeparation = (
    attacker.x + attacker.radius <= terrain.minX
      && target.x - target.radius >= terrain.maxX
  ) || (
    target.x + target.radius <= terrain.minX
      && attacker.x - attacker.radius >= terrain.maxX
  );
  if (verticalSeparation
    && intervalContains(terrain.minY, terrain.maxY, attacker.y, attacker.radius)
    && intervalContains(terrain.minY, terrain.maxY, target.y, target.radius)) {
    return "vertical_rectangle_separates_complete_round_base_footprints";
  }
  const horizontalSeparation = (
    attacker.y + attacker.radius <= terrain.minY
      && target.y - target.radius >= terrain.maxY
  ) || (
    target.y + target.radius <= terrain.minY
      && attacker.y - attacker.radius >= terrain.maxY
  );
  if (horizontalSeparation
    && intervalContains(terrain.minX, terrain.maxX, attacker.x, attacker.radius)
    && intervalContains(terrain.minX, terrain.maxX, target.x, target.radius)) {
    return "horizontal_rectangle_separates_complete_round_base_footprints";
  }
  return null;
}

function evaluate(input = {}) {
  const attacker = verifyRoundModel(input.attackerModel);
  const target = verifyRoundModel(input.targetModel);
  const attackerSize = verifySize(
    input.attackerSizeCharacteristic,
    "BOUNDED_LOS_ATTACKER_SIZE_INVALID",
  );
  const targetSize = verifySize(
    input.targetSizeCharacteristic,
    "BOUNDED_LOS_TARGET_SIZE_INVALID",
  );
  if (!Array.isArray(input.terrain) || input.terrain.length !== 1) {
    fail("BOUNDED_LOS_EXACTLY_ONE_TERRAIN_REQUIRED");
  }
  const terrain = verifyTerrain(input.terrain[0]);
  const centerTraceIntersects = centerTraceIntersectsRectangle(
    attacker,
    target,
    terrain,
  );
  const barrierProof = completeBarrier(attacker, target, terrain);
  const sizeQualifies = terrain.effectiveSize >= attackerSize
    && terrain.effectiveSize >= targetSize;
  if (centerTraceIntersects && (!barrierProof || !sizeQualifies)) {
    fail("BOUNDED_LOS_AMBIGUOUS_COVER_FAIL_CLOSED");
  }
  const visible = !centerTraceIntersects;
  const body = {
    schema: "starcraft_tmg_official_bounded_full_cover_los_receipt_v1",
    kernelId: OFFICIAL_BOUNDED_FULL_COVER_LOS_KERNEL_ID,
    kernelVersion: OFFICIAL_BOUNDED_FULL_COVER_LOS_KERNEL_VERSION,
    attackerModelId: attacker.id,
    targetModelId: target.id,
    attackerSizeCharacteristic: attackerSize,
    targetSizeCharacteristic: targetSize,
    attackerEffectiveSize: attackerSize,
    targetEffectiveSize: targetSize,
    terrainId: terrain.id,
    terrainHash: terrain.terrainHash,
    terrainEffectiveSize: terrain.effectiveSize,
    centerTraceIntersectsTerrain: centerTraceIntersects,
    allBaseToBaseTracesBlocked: !visible,
    completeBarrierProof: barrierProof,
    fullCoverSizeQualifies: sizeQualifies,
    visible,
    lineOfSightStatus: visible ? "visible" : "blocked_by_full_cover",
    exactScope:
      "one_axis_aligned_full_cover_rectangle_ground_level_round_bases",
    unsupportedCases: [
      "multiple_terrain",
      "direct_cover",
      "elevation",
      "flying",
      "non_round_bases",
      "partial_or_ambiguous_barriers",
    ],
    ruleAtomIds: [...OFFICIAL_BOUNDED_FULL_COVER_LOS_ATOM_IDS],
    rulesTruth: "official_full_cover_line_of_sight_exact_bounded_subset",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, lineOfSightHash: hashStarcraftTmgContract(body) });
}

export function createOfficialBoundedFullCoverLosKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_bounded_full_cover_los_kernel_descriptor_v1",
    kernelId: OFFICIAL_BOUNDED_FULL_COVER_LOS_KERNEL_ID,
    kernelVersion: OFFICIAL_BOUNDED_FULL_COVER_LOS_KERNEL_VERSION,
    ruleAtomIds: [...OFFICIAL_BOUNDED_FULL_COVER_LOS_ATOM_IDS],
    supportedTerrainSchema: TERRAIN_SCHEMA,
    exactScope:
      "one_axis_aligned_full_cover_rectangle_ground_level_round_bases",
    proofPolicy: {
      visibleRequiresClearCenterTrace: true,
      blockedRequiresCompleteBaseFootprintBarrier: true,
      fullCoverRequiresTerrainSizeAtLeastBothModelSizes: true,
      ambiguousTracePolicy: "fail_closed",
    },
    dataChangeCannotGrantRuleAuthority: true,
    trainingTruth: false,
  };
  const descriptor = freezeDeep({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return freezeDeep({ descriptor, evaluate });
}
