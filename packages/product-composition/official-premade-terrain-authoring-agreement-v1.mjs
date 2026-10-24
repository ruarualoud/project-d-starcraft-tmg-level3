// Offline authoring contract for official TMG premade layout attributes.
// Unknown values survive as null; a draft is never a setup agreement. This
// module does not supply class defaults or change frozen Rules atoms/Rooms.
import { createOfficialTerrainPieceV1 } from "../rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { createOfficialSpecialTerrainAgreementV1 } from "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";
import { expandOfficialPremadeSourcePartsV1 } from "./official-premade-source-parts-v1.mjs";

export const OFFICIAL_PREMADE_TERRAIN_AGREEMENT_VERSION = "1.2.0";
const READABLE_VERSIONS = ["1.0.0", "1.1.0", OFFICIAL_PREMADE_TERRAIN_AGREEMENT_VERSION];
const FIELDS = ["size", "terrainKind", "heightTier", "standableHorizontalSurface", "blocksPlacement", "openingsPolicy"];
const KIND = ["ordinary", "grass", "impassable", "ramp"];
const HEIGHT = ["ground_level", "mid_ground", "high_ground"];
const OPENINGS = ["no_openings_agreed", "explicit_openings_agreed"];
const clone = value => structuredClone(value);
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };
const explicitSize = value => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 9;

// Do not call Number() here: Number(null), Number("") and Number(false) are0.
export function validateOfficialPremadeTerrainAttributesV1(attributes, id = "") {
  if (!attributes || typeof attributes !== "object") fail("PREMADE_TERRAIN_ATTRIBUTES_REQUIRED", id);
  if (!explicitSize(attributes.size)) fail("PREMADE_TERRAIN_SIZE_EXPLICIT_NUMBER_REQUIRED", id);
  if (!KIND.includes(attributes.terrainKind)) fail("PREMADE_TERRAIN_KIND_REQUIRED", id);
  // Core p57/p78 fixes Grass at Size2; setup agreement cannot redefine it.
  if (attributes.terrainKind === "grass" && attributes.size !== 2) {
    fail("PREMADE_TERRAIN_GRASS_SIZE_MUST_BE_TWO", id);
  }
  if (!HEIGHT.includes(attributes.heightTier)) fail("PREMADE_TERRAIN_HEIGHT_REQUIRED", id);
  if (typeof attributes.standableHorizontalSurface !== "boolean"
    || typeof attributes.blocksPlacement !== "boolean") fail("PREMADE_TERRAIN_SURFACE_PLACEMENT_REQUIRED", id);
  if (attributes.terrainKind === "ramp" && (attributes.size !== 1
    || attributes.heightTier !== "mid_ground" || !attributes.standableHorizontalSurface)) {
    fail("PREMADE_TERRAIN_RAMP_FIXED_PROFILE_REQUIRED", id);
  }
  if (!OPENINGS.includes(attributes.openingsPolicy)) fail("PREMADE_TERRAIN_OPENINGS_POLICY_REQUIRED", id);
  return Object.fromEntries(FIELDS.map(field => [field, attributes[field]]));
}

// Keep access points at physical-piece level. The original SpecialTerrain
// normalizer owns their canonical shape; this input seam rejects coercible
// coordinates before it reaches that normalizer. It does not prove that an
// authored port is traversable or admit the physical piece into a Room.
export function normalizeOfficialPremadeTerrainAccessPointsV1(attributes, accessPoints, id) {
  if (accessPoints === undefined && attributes.terrainKind !== "ramp") return undefined;
  if (!Array.isArray(accessPoints)) fail("PREMADE_TERRAIN_ACCESS_POINTS_REQUIRED", id);
  for (const port of accessPoints) {
    if (typeof port?.accessPointId !== "string" || !port.accessPointId.trim()
      || !["generic", "base", "top"].includes(port.role)
      || port.footprint?.shape !== "axis_aligned_rectangle"
      || !["minXMilliInches", "maxXMilliInches", "minYMilliInches", "maxYMilliInches"]
        .every(key => typeof port.footprint[key] === "number" && Number.isSafeInteger(port.footprint[key]))
      || !Array.isArray(port.connects) || port.connects.length !== 2
      || port.connects.some(value => !["ground", "mid", "high"].includes(value))) {
      fail("PREMADE_TERRAIN_ACCESS_POINT_INVALID", id);
    }
  }
  const ports = createOfficialSpecialTerrainAgreementV1({ terrainEntries: [{
    terrainId: id, terrainKind: attributes.terrainKind, adjacentElevationPairs: [], accessPoints,
  }] }).terrainEntries[0].accessPoints;
  if (ports.length && (!attributes.standableHorizontalSurface
    || !["ordinary", "ramp"].includes(attributes.terrainKind))) {
    fail("PREMADE_TERRAIN_ACCESS_SURFACE_REQUIRED", id);
  }
  if (attributes.terrainKind === "ramp" && (ports.length !== 2
    || ports.find(port => port.role === "base")?.connects.join(":") !== "ground:mid"
    || ports.find(port => port.role === "top")?.connects.join(":") !== "mid:high")) {
    fail("PREMADE_TERRAIN_RAMP_TWO_PORTS_REQUIRED", id);
  }
  return clone(ports);
}

function registerGroupAccessPoints(definition, groupPorts, portOwners) {
  const ports = normalizeOfficialPremadeTerrainAccessPointsV1(definition.attributes,
    definition.accessPoints, definition.instanceId);
  if (ports === undefined) return;
  const body = JSON.stringify(ports);
  if (groupPorts.has(definition.terrainGroupId) && groupPorts.get(definition.terrainGroupId) !== body) {
    fail("PREMADE_TERRAIN_GROUP_ACCESS_CONFLICT", definition.terrainGroupId);
  }
  groupPorts.set(definition.terrainGroupId, body);
  for (const port of ports) {
    if (portOwners.has(port.accessPointId) && portOwners.get(port.accessPointId) !== definition.terrainGroupId) {
      fail("PREMADE_TERRAIN_ACCESS_ID_REUSED_BY_GROUP", port.accessPointId);
    }
    portOwners.set(port.accessPointId, definition.terrainGroupId);
  }
}

function pendingFields(entry) {
  const valid = { size: explicitSize(entry.attributes.size), terrainKind: KIND.includes(entry.attributes.terrainKind),
    heightTier: HEIGHT.includes(entry.attributes.heightTier),
    standableHorizontalSurface: typeof entry.attributes.standableHorizontalSurface === "boolean",
    blocksPlacement: typeof entry.attributes.blocksPlacement === "boolean", openingsPolicy: OPENINGS.includes(entry.attributes.openingsPolicy) };
  const pending = FIELDS.filter(field => !valid[field]);
  if (typeof entry.terrainGroupId !== "string" || !entry.terrainGroupId.trim()) pending.push("terrainGroupId");
  if (entry.attributes.terrainKind === "ramp"
    && (!Array.isArray(entry.accessPoints) || entry.accessPoints.length !== 2)) pending.push("accessPoints");
  return pending;
}
export function createOfficialPremadeTerrainAgreementDraftV1({ geometry, sizeEvidence }) {
  if (geometry?.measurementMethod !== "shared_native_source_pixel_edges_v1"
    || !geometry.mapId || !Array.isArray(geometry.proposals) || !geometry.proposals.length) {
    fail("PREMADE_TERRAIN_NATIVE_GEOMETRY_REQUIRED");
  }
  const proposals = expandOfficialPremadeSourcePartsV1(geometry);
  const ids = proposals.map(p => p.instanceId);
  if (new Set(ids).size !== ids.length) fail("PREMADE_TERRAIN_INSTANCE_DUPLICATE");
  const evidence = sizeEvidence?.entries || [];
  const entries = proposals.map(proposal => {
    const candidates = proposal.pieceCandidates || [];
    const fact = candidates.length === 1 ? evidence.find(row => row.piece === candidates[0]) : null;
    if (fact && (typeof fact.size !== "number" || !Number.isSafeInteger(fact.size)
      || fact.size < 0 || fact.size > 9 || !fact.source)) fail("PREMADE_TERRAIN_SIZE_EVIDENCE_INVALID");
    const entry = { instanceId: proposal.instanceId, pieceCandidates: clone(candidates),
      ...(proposal.sourceInstanceId ? { sourceInstanceId: proposal.sourceInstanceId,
        sourcePartId: proposal.sourcePartId, sourcePartRole: proposal.sourcePartRole } : {}),
      ...(proposal.sourceAccessPoints ? { sourceAccessPoints: clone(proposal.sourceAccessPoints) } : {}),
      terrainGroupId: null, proposedSeparateGroupId: proposal.instanceId,
      geometryComponentCount: proposal.sourcePixelGeometry.length,
      rawImageHoleCount: proposal.sourcePixelGeometry.reduce((n, c) => n + c.rings.length - 1, 0),
      attributes: { size: fact ? fact.size : null, terrainKind: null, heightTier: null,
        standableHorizontalSurface: null, blocksPlacement: null, openingsPolicy: null },
      attributeEvidence: fact ? { size: clone(fact) } : {},
      rawImageHoleIsRuleOpening: false, componentVariantQuotaUsed: false };
    return { ...entry, pendingFields: pendingFields(entry) };
  });
  return { schema: "starcraft_tmg_official_premade_terrain_agreement_draft_v1",
    version: OFFICIAL_PREMADE_TERRAIN_AGREEMENT_VERSION, mapId: geometry.mapId,
    sourceArtSha256: geometry.sourceArt.sha256, geometryMeasurementMethod: geometry.measurementMethod,
    entries, counts: { instances: entries.length, knownSizes: entries.filter(e => e.attributes.size !== null).length,
      unknownSizes: entries.filter(e => e.attributes.size === null).length,
      completeDefinitions: entries.filter(e => !e.pendingFields.length).length },
    status: "draft_pending_explicit_terrain_agreement", sourceValuesRefreshed: false,
    rulesAuthorityGranted: false, roomAdmitted: false, trainingTruth: false };
}

// Electronic setup choices, not recovered official per-piece attributes.
// A consumer applies these values explicitly through the ordinary edit seam;
// existing Rooms and source candidates remain unchanged. Complete temple
// assemblies need separate platform/ramp/access authoring, so are left pending.
export function createOfficialPremadeRecommendedTerrainSetupV1({ geometry, sizeEvidence }) {
  const draft = createOfficialPremadeTerrainAgreementDraftV1({ geometry, sizeEvidence });
  const ordinarySizes = { "Head Statue": 1, "Statue Shard": 1, "Vespene Geyser": 2,
    "Protoss Banner": 2, "Temple Obelisk": 3,
    "Wall Set 1": 2, "Wall Set 2": 2, "Wall Set 3": 2,
    "Wall Set 4": 2, "Wall Set 5": 2, "Wall Set 6": 2 };
  const valuesByInstance = {}; const recommendations = []; const pendingSurfaceInstanceIds = [];
  for (const entry of draft.entries) {
    if (["horizontal_platform", "physical_incline"].includes(entry.sourcePartRole)) {
      const incline = entry.sourcePartRole === "physical_incline";
      const attributes = { size: incline ? 1 : 3, terrainKind: incline ? "ramp" : "ordinary",
        heightTier: incline ? "mid_ground" : "high_ground", standableHorizontalSurface: true,
        blocksPlacement: false, openingsPolicy: "no_openings_agreed" };
      const accessPoints = incline ? clone(entry.sourceAccessPoints || []) : [];
      if (incline && accessPoints.length !== 2) { pendingSurfaceInstanceIds.push(entry.instanceId); continue; }
      // Mutation requests select pinned source ports, never send a nested
      // authority-like `role` key or substitute client-owned geometry.
      valuesByInstance[entry.instanceId] = { terrainGroupId: entry.proposedSeparateGroupId, attributes,
        ...(incline ? { useSourceAccessPoints: true } : {}) };
      recommendations.push({ instanceId: entry.instanceId, sourceInstanceId: entry.sourceInstanceId,
        sourcePartRole: entry.sourcePartRole, pieceCandidates: clone(entry.pieceCandidates),
        attributes: clone(attributes), accessPoints: clone(accessPoints),
        sizeOrigin: incline ? "fixed_ramp_rule_after_electronic_kind_choice" : "electronic_recommendation_not_official",
        kindOrigin: "reviewed_source_surface_plus_explicit_electronic_recommendation",
        surfaceOrigin: "reviewed_native_source_partition_operator_may_edit_attributes",
        groupingOrigin: "source_part_default_operator_may_edit",
        reason: incline ? "Actual authored incline; choosing Ramp fixes Size1/MID and its base/top connections by core rules."
          : "Actual authored horizontal platform; Size3/HIGH is an editable electronic suggestion, not recovered official piece stats." });
      continue;
    }
    const kinds = entry.pieceCandidates;
    const grass = kinds.length > 0 && kinds.every(kind => ["Shrubs A", "Shrubs B"].includes(kind));
    const sizes = kinds.map(kind => ordinarySizes[kind]);
    const ordinary = kinds.length > 0 && sizes.every(size => size !== undefined && size === sizes[0]);
    if (!grass && !ordinary) { pendingSurfaceInstanceIds.push(entry.instanceId); continue; }
    const size = grass ? 2 : entry.attributes.size ?? sizes[0];
    const attributes = { size, terrainKind: grass ? "grass" : "ordinary", heightTier: "ground_level",
      standableHorizontalSurface: false, blocksPlacement: !grass, openingsPolicy: "no_openings_agreed" };
    valuesByInstance[entry.instanceId] = { terrainGroupId: entry.proposedSeparateGroupId, attributes };
    recommendations.push({ instanceId: entry.instanceId, pieceCandidates: clone(kinds), attributes: clone(attributes),
      sizeOrigin: entry.attributeEvidence.size ? "recorded_official_example"
        : grass ? "fixed_grass_rule_after_electronic_kind_choice" : "electronic_recommendation_not_official",
      ...(entry.attributeEvidence.size ? { sizeEvidence: clone(entry.attributeEvidence.size) } : {}),
      kindOrigin: "electronic_recommendation_not_official",
      surfaceOrigin: "electronic_nonstandable_default_operator_may_edit",
      groupingOrigin: "source_instance_default_operator_may_edit",
      reason: grass ? "Shrub candidates share the recommended Grass treatment; once chosen, core Grass Size2 is fixed."
        : "Recommended upright obstacle; its outline remains unchanged, with no inferred walkable top or opening." });
  }
  return { schema: "starcraft_tmg_official_premade_recommended_electronic_setup_v1", version: "1.1.0",
    presetId: "recommended-electronic-upright-and-grass-v1", mapId: geometry.mapId,
    label: "Recommended electronic setup — not official per-piece attributes",
    labelZh: "推荐电子约定：非官方逐件属性，可修改",
    valuesByInstance, recommendations, pendingSurfaceInstanceIds,
    counts: { instances: draft.entries.length, recommendedDefinitions: recommendations.length,
      pendingSurfaceDefinitions: pendingSurfaceInstanceIds.length },
    applicationRequiresExplicitSetup: true, operatorEditable: true,
    sourceGeometryChanged: false, officialPerPieceAttributesInferred: false,
    roomAdmitted: false, rulesAuthorityGranted: false, trainingTruth: false };
}

// Editing is separate from agreement. Partial values remain inspectable, and
// official example evidence stays distinct from an operator-selected override.
export function editOfficialPremadeTerrainAgreementDraftV1(draft, valuesByInstance) {
  if (draft?.status !== "draft_pending_explicit_terrain_agreement") fail("PREMADE_TERRAIN_DRAFT_REQUIRED");
  const known = new Set(draft.entries.map(entry => entry.instanceId));
  for (const id of Object.keys(valuesByInstance)) if (!known.has(id)) fail("PREMADE_TERRAIN_UNKNOWN_INSTANCE", id);
  const result = clone(draft);
  result.entries = draft.entries.map(original => {
    const patch = valuesByInstance[original.instanceId];
    if (!patch) return clone(original);
    const entry = { ...clone(original), ...(patch.terrainGroupId !== undefined ? { terrainGroupId: patch.terrainGroupId } : {}),
      ...(Object.hasOwn(patch, "accessPoints") ? { accessPoints: clone(patch.accessPoints) } : {}),
      attributes: { ...original.attributes, ...Object.fromEntries(FIELDS.filter(field =>
        Object.hasOwn(patch.attributes || {}, field)).map(field => [field, patch.attributes[field]])) } };
    if (Object.hasOwn(patch, "useSourceAccessPoints")) {
      if (typeof patch.useSourceAccessPoints !== "boolean"
        || Object.hasOwn(patch, "accessPoints")) fail("PREMADE_TERRAIN_SOURCE_PORT_SELECTION_REQUIRED", original.instanceId);
      if (patch.useSourceAccessPoints) {
        if (original.sourcePartRole !== "physical_incline" || original.sourceAccessPoints?.length !== 2) {
          fail("PREMADE_TERRAIN_SOURCE_PORTS_UNAVAILABLE", original.instanceId);
        }
        entry.accessPoints = entry.attributes.terrainKind === "ramp" ? clone(original.sourceAccessPoints) : [];
      } else entry.accessPoints = [];
    }
    entry.pendingFields = pendingFields(entry);
    if (Object.hasOwn(patch.attributes || {}, "size")) entry.selectedSizeOrigin = "operator_edit_not_official_example";
    return entry;
  });
  result.counts = { instances: result.entries.length,
    knownSizes: result.entries.filter(e => explicitSize(e.attributes.size)).length,
    unknownSizes: result.entries.filter(e => !explicitSize(e.attributes.size)).length,
    completeDefinitions: result.entries.filter(e => !e.pendingFields.length).length };
  return result;
}

// Authoring acceptance is not authentication: the future Room factory must
// obtain this decision from its authorized setup caller, not from an Agent.
export function acceptOfficialPremadeTerrainAgreementV1(draft, approval) {
  if (draft?.status !== "draft_pending_explicit_terrain_agreement"
    || approval?.accepted !== true || !String(approval.reference || "").trim()) {
    fail("PREMADE_TERRAIN_EXPLICIT_APPROVAL_REQUIRED");
  }
  const definitions = draft.entries.map(entry => {
    if (typeof entry.terrainGroupId !== "string" || !entry.terrainGroupId.trim()) {
      fail("PREMADE_TERRAIN_GROUP_REQUIRED", entry.instanceId);
    }
    const attributes = validateOfficialPremadeTerrainAttributesV1(entry.attributes, entry.instanceId);
    const accessPoints = normalizeOfficialPremadeTerrainAccessPointsV1(attributes, entry.accessPoints, entry.instanceId);
    return { instanceId: entry.instanceId, terrainGroupId: entry.terrainGroupId.trim(), attributes,
      ...(entry.sourceInstanceId ? { sourceInstanceId: entry.sourceInstanceId,
        sourcePartId: entry.sourcePartId, sourcePartRole: entry.sourcePartRole } : {}),
      ...(accessPoints !== undefined ? { accessPoints } : {}),
      attributeEvidence: clone(entry.attributeEvidence), selectedSizeOrigin: entry.selectedSizeOrigin || "recorded_official_example" };
  });
  const groups = new Map();
  const groupPorts = new Map(); const portOwners = new Map();
  for (const definition of definitions) {
    const attributes = JSON.stringify(definition.attributes);
    if (groups.has(definition.terrainGroupId) && groups.get(definition.terrainGroupId) !== attributes) {
      fail("PREMADE_TERRAIN_GROUP_ATTRIBUTE_CONFLICT", definition.terrainGroupId);
    }
    groups.set(definition.terrainGroupId, attributes);
    registerGroupAccessPoints(definition, groupPorts, portOwners);
  }
  return { schema: "starcraft_tmg_official_premade_terrain_authoring_agreement_v1",
    version: OFFICIAL_PREMADE_TERRAIN_AGREEMENT_VERSION, mapId: draft.mapId,
    sourceArtSha256: draft.sourceArtSha256, status: "accepted_authoring_not_room_admission",
    approvalReference: approval.reference, definitions, counts: { instances: definitions.length, groups: groups.size },
    setupValuesOrigin: "explicit_authoring_agreement_with_separate_official_example_evidence",
    semanticCompilerIntegrationComplete: false, rulesAuthorityGranted: false, roomAdmitted: false, trainingTruth: false };
}

// A compiler may consume an explicit authoring decision, never a draft or
// inferred image property. This verifies the existing portable record; it
// does not authenticate the caller or admit a Room.
export function verifyOfficialPremadeTerrainAuthoringAgreementV1(agreement, expected = {}) {
  if (agreement?.schema !== "starcraft_tmg_official_premade_terrain_authoring_agreement_v1"
    || !READABLE_VERSIONS.includes(agreement.version)
    || agreement.status !== "accepted_authoring_not_room_admission"
    || !String(agreement.approvalReference || "").trim()
    || agreement.rulesAuthorityGranted !== false || agreement.roomAdmitted !== false
    || agreement.trainingTruth !== false || !Array.isArray(agreement.definitions)
    || !agreement.definitions.length) fail("PREMADE_TERRAIN_ACCEPTED_AGREEMENT_REQUIRED");
  if (!agreement.mapId || !/^[a-f0-9]{64}$/u.test(String(agreement.sourceArtSha256 || ""))
    || expected.mapId !== undefined && agreement.mapId !== expected.mapId
    || expected.sourceArtSha256 !== undefined && agreement.sourceArtSha256 !== expected.sourceArtSha256) {
    fail("PREMADE_TERRAIN_AGREEMENT_SOURCE_MISMATCH");
  }
  const instances = new Set();
  const groups = new Map();
  const groupPorts = new Map(); const portOwners = new Map();
  for (const definition of agreement.definitions) {
    if (typeof definition.instanceId !== "string" || !definition.instanceId.trim()
      || instances.has(definition.instanceId)) fail("PREMADE_TERRAIN_INSTANCE_DUPLICATE");
    if (typeof definition.terrainGroupId !== "string" || !definition.terrainGroupId.trim()
      || definition.terrainGroupId !== definition.terrainGroupId.trim()) {
      fail("PREMADE_TERRAIN_GROUP_REQUIRED", definition.instanceId);
    }
    instances.add(definition.instanceId);
    if (definition.sourceInstanceId !== undefined && (typeof definition.sourceInstanceId !== "string"
      || !definition.sourceInstanceId.trim() || typeof definition.sourcePartId !== "string"
      || !definition.sourcePartId.trim() || typeof definition.sourcePartRole !== "string"
      || !definition.sourcePartRole.trim()
      || definition.instanceId !== `${definition.sourceInstanceId}::${definition.sourcePartId}`)) {
      fail("PREMADE_TERRAIN_SOURCE_PART_IDENTITY_INVALID", definition.instanceId);
    }
    const attributes = JSON.stringify(validateOfficialPremadeTerrainAttributesV1(definition.attributes, definition.instanceId));
    if (groups.has(definition.terrainGroupId) && groups.get(definition.terrainGroupId) !== attributes) {
      fail("PREMADE_TERRAIN_GROUP_ATTRIBUTE_CONFLICT", definition.terrainGroupId);
    }
    groups.set(definition.terrainGroupId, attributes);
    registerGroupAccessPoints(definition, groupPorts, portOwners);
  }
  if (agreement.counts?.instances !== instances.size || agreement.counts?.groups !== groups.size
    || expected.instanceIds !== undefined && (expected.instanceIds.length !== instances.size
      || expected.instanceIds.some(id => !instances.has(id)))) fail("PREMADE_TERRAIN_AGREEMENT_DENOMINATOR_MISMATCH");
  return true;
}

// Narrow handoff into the existing kernel; exact cell geometry and formal Room
// binding remain the composition caller's responsibility. Never reconstruct a
// polygon as its bbox for gameplay: footprint here is the kernel's envelope.
export function createOfficialPremadeSizeGuardedTerrainPieceV1(input) {
  const attributes = validateOfficialPremadeTerrainAttributesV1(input.attributes, input.id);
  if (attributes.openingsPolicy === "no_openings_agreed" && (input.openings || []).length) {
    fail("PREMADE_TERRAIN_OPENING_POLICY_CONFLICT", input.id);
  }
  return createOfficialTerrainPieceV1({ id: input.id, terrainKind: attributes.terrainKind,
    size: attributes.size, standableHorizontalSurface: attributes.standableHorizontalSurface,
    footprint: input.footprint, openings: input.openings || [] });
}
