// Offline/server composition: one reviewed native source and one explicit
// terrain agreement become the exact semanticTerrain input consumed by Room
// freeze. No filesystem, pixel inference, default attributes, Room mutation or
// registration lives here. The portable browser geometry module stays pure.
import { createOfficialCompetitiveMapSemanticGeometryBindingV1,
  SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY } from
  "./official-competitive-map-semantic-geometry-v1.mjs";
import { verifyOfficialPremadeTerrainAuthoringAgreementV1 } from
  "./official-premade-terrain-authoring-agreement-v1.mjs";
import { semanticClassForOfficialPremadeTerrainDefinitionV1 } from
  "./official-competitive-map-semantic-rules-adapter-v1.mjs";
import { expandOfficialPremadeSourcePartsV1 } from "./official-premade-source-parts-v1.mjs";

export const OFFICIAL_PREMADE_MAP_AUTHORING_VERSION = "1.0.0";
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };

export function createOfficialPremadeMapAuthoringV1(input = {}) {
  const source = input.sourceGeometry;
  if (source?.measurementMethod !== "shared_native_source_pixel_edges_v1"
    // partialSelection describes the incremental author edit, not its final
    // merged denominator. Both saved frames reuse unchanged source pieces.
    || source.completeInstanceSelection !== true
    || !Array.isArray(source.proposals) || !source.proposals.length
    || source.rulesAuthorityGranted !== false || source.roomAdmitted !== false
    || source.trainingTruth !== false) fail("PREMADE_MAP_COMPLETE_NATIVE_SOURCE_REQUIRED");
  const ids = source.proposals.map(proposal => proposal.instanceId);
  if (new Set(ids).size !== ids.length || ids.some(id => typeof id !== "string" || !id.trim())) {
    fail("PREMADE_MAP_SOURCE_INSTANCE_DENOMINATOR_INVALID");
  }
  const proposals = expandOfficialPremadeSourcePartsV1(source);
  verifyOfficialPremadeTerrainAuthoringAgreementV1(input.terrainAgreement, {
    mapId: source.mapId, sourceArtSha256: source.sourceArt?.sha256, instanceIds: proposals.map(p => p.instanceId),
  });
  if (!String(input.review?.author || "").trim() || !String(input.review?.authoredAt || "").trim()) {
    fail("PREMADE_MAP_AUTHOR_REVIEW_REQUIRED");
  }
  const definitions = new Map(input.terrainAgreement.definitions.map(entry => [entry.instanceId, entry]));
  const terrainRegionInstances = {};
  const regions = proposals.flatMap(proposal => {
    if (!Array.isArray(proposal.sourcePixelGeometry) || !proposal.sourcePixelGeometry.length) {
      fail("PREMADE_MAP_NATIVE_COMPONENTS_REQUIRED", proposal.instanceId);
    }
    const definition = definitions.get(proposal.instanceId);
    if (definition.sourceInstanceId !== proposal.sourceInstanceId || definition.sourcePartId !== proposal.sourcePartId
      || definition.sourcePartRole !== proposal.sourcePartRole) fail("PREMADE_MAP_SOURCE_PART_IDENTITY_MISMATCH", proposal.instanceId);
    const semanticClass = semanticClassForOfficialPremadeTerrainDefinitionV1(definition);
    return proposal.sourcePixelGeometry.map((component, index) => {
      const regionId = `${proposal.instanceId}-source-component-${index + 1}`;
      terrainRegionInstances[regionId] = proposal.instanceId;
      return { regionId, label: proposal.instanceId, semanticClass,
        artEvidence: source.sourceArt.path,
        reviewNote: "Native source contour; attributes belong to the separate explicit terrain agreement.",
        geometry: { kind: "polygon", sourcePixelRings: structuredClone(component.rings) } };
    });
  });
  const binding = createOfficialCompetitiveMapSemanticGeometryBindingV1({
    schema: "starcraft_tmg_competitive_map_semantic_geometry_binding_v1",
    seedId: source.mapId, displayName: input.displayName || `Official TMG ${source.mapId}`,
    gameEra: "official_tmg", art: { assetPath: input.artAssetPath,
      sha256: source.sourceArt.sha256, origin: "top_left",
      pixelSize: { width: source.sourceArt.width, height: source.sourceArt.height } },
    normalizedSpace: { width: 1000, height: 1000, origin: "bottom_left" }, battlefield: source.battlefield,
    regions, review: { author: input.review.author, authoredAt: input.review.authoredAt,
      method: "native_source_edges_plus_explicit_terrain_agreement_v1",
      sourcePixelBoundaryPolicy: SEMANTIC_GEOMETRY_NATIVE_SOURCE_PIXEL_BOUNDARY_POLICY,
      runtimePixelInference: false, contourToleranceNormalized: 0.001,
      ambiguities: [...(input.review.ambiguities || [])] },
    runtimePixelInferenceAllowed: false, rulesAuthorityBeforeIntegration: false, trainingTruth: false,
  });
  return {
    schema: "starcraft_tmg_official_premade_map_authoring_v1", version: OFFICIAL_PREMADE_MAP_AUTHORING_VERSION,
    mapId: source.mapId,
    semanticTerrain: { binding, bindingHash: binding.bindingHash,
      terrainAgreement: structuredClone(input.terrainAgreement), terrainRegionInstances },
    receipt: { sourceArtSha256: source.sourceArt.sha256,
      sourceInstances: ids.length, sourceComponents: regions.length,
      ...(proposals.length !== ids.length ? { sourceRuleParts: proposals.length,
        physicalSourceInstancesNotMultipliedByParts: true } : {}),
      terrainGroups: input.terrainAgreement.counts.groups,
      approvalReference: input.terrainAgreement.approvalReference,
      attributeOrigin: "explicit_agreement_not_image_inference", imageHolesAreAgreedOpenings: false,
      assetPublicationVerified: false, rulesAuthorityGranted: false, roomAdmitted: false, trainingTruth: false },
  };
}
