// Frozen official TMG premade layouts, not the twenty classic RTS seeds.
// These rows register source identity/scale only. Geometry, setup attributes
// and task reachability still come from the shared author/freeze/Room path.
import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCompetitiveMapSemanticGeometryBindingV1 } from
  "./official-competitive-map-semantic-geometry-v1.mjs";
import { verifyOfficialPremadeTerrainAuthoringAgreementV1 } from
  "./official-premade-terrain-authoring-agreement-v1.mjs";
import { createOfficialCompetitiveMapBaseProfilesV1 } from
  "./official-competitive-map-tabletop-adapter-v1.mjs";

export const OFFICIAL_PREMADE_MAP_SOURCE_FAMILY_V1 = "official_tmg_premade";
export const OFFICIAL_PREMADE_MAP_VISUAL_PRESET_V1 = "official_tmg_premade_source_art_v1";
const SOURCE = Object.freeze({
  url: "https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf",
  sha256: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  sourceRefreshPerformed: false,
});
const ROWS = [
  ["standard-d6-1", 118, 116, "Standard", 54, 36, 1261, 842, 30, "2819cbf3a2bee2b8ca440fcfe615e942236fa5e0a1440add604b080eaf19a1d6"],
  ["standard-d6-2", 119, 117, "Standard", 54, 36, 1261, 842, 30, "c62d3c1133be5e729899a4fe2aca9fd3db9af71893e7b9e506b1a7b665a0c722"],
  ["standard-d6-3", 120, 118, "Standard", 54, 36, 1261, 842, 30, "bd5cfe450b7bef448b1da558ebac5817ab50095d1a81a2c64a0644ff08cae2b0"],
  ["standard-d6-4", 121, 119, "Standard", 54, 36, 1261, 842, 30, "2da1d9254f3f0253c7ee9efc15d42d7aa5bdb5a534470362d09c9594a3905526"],
  ["standard-d6-5", 122, 120, "Standard", 54, 36, 1261, 842, 32, "0360aa5641bce753afc6807725042ec043787fd6d24a801790531b2d258c02a7"],
  ["standard-d6-6", 123, 121, "Standard", 54, 36, 1261, 842, 32, "ba362dabd3d01ce02c7bcf71f06f532525ec9e988b2fc5bfac39f2aa60821958"],
  ["skirmish-d3-1", 124, 122, "Skirmish", 36, 36, 836, 836, 15, "96116ac46786cfbbd259055e811687d51f3df30a6095876b7f67c2505318cc80"],
  ["skirmish-d3-2", 125, 123, "Skirmish", 36, 36, 835, 836, 15, "2565af4d8b2b1ee2af32d37f7457c884a7c88c0eec3a29eb739584bc1cd0552a"],
  ["skirmish-d3-3", 126, 124, "Skirmish", 36, 36, 835, 836, 16, "ed9cfa33385f545bbb85a7ab2efe669163abfc9c084c18d9e75f48203b28dbd7"],
];
const SEEDS = Object.freeze(ROWS.map(([seedId, pdfPage, printedPage, engagementScale,
  widthInches, heightInches, width, height, terrainInstanceCount, artSha256]) => Object.freeze({
  seedId, displayName: `Official TMG ${engagementScale} ${seedId.slice(-1)}`,
  gameEra: "official_tmg", mapSourceFamily: OFFICIAL_PREMADE_MAP_SOURCE_FAMILY_V1,
  engagementScale, battlefield: Object.freeze({ widthInches, heightInches }),
  pixelSize: Object.freeze({ width, height }), terrainInstanceCount,
  artSha256, source: SOURCE, pdfPage, printedPage,
  sourceRegistrationIsNotRoomAdmission: true, trainingTruth: false,
})));
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };

export function getOfficialPremadeMapRoomSeedV1(seedId) {
  return SEEDS.find(row => row.seedId === seedId) || null;
}

export function createOfficialPremadeMapRoomSourceCatalogueV1() {
  return structuredClone({ schema: "starcraft_tmg_official_premade_map_room_source_catalogue_v1",
    version: "1.0.0", seeds: SEEDS, source: SOURCE, registeredSources: SEEDS.length,
    sourceRegistrationIsNotRoomAdmission: true, trainingTruth: false });
}

export function compileOfficialPremadeMapRoomSourceV1({ seedId, semanticTerrain }) {
  const seed = getOfficialPremadeMapRoomSeedV1(seedId);
  if (!seed) fail("PREMADE_ROOM_SOURCE_UNKNOWN", seedId);
  if (!semanticTerrain?.terrainAgreement || !semanticTerrain?.terrainRegionInstances) {
    fail("PREMADE_ROOM_EXPLICIT_SEMANTIC_TERRAIN_REQUIRED", seedId);
  }
  const binding = semanticTerrain.binding;
  verifyOfficialCompetitiveMapSemanticGeometryBindingV1(binding);
  if (binding.seedId !== seedId || binding.gameEra !== seed.gameEra
    || binding.art.sha256 !== seed.artSha256
    || binding.art.pixelSize.width !== seed.pixelSize.width
    || binding.art.pixelSize.height !== seed.pixelSize.height
    || binding.battlefield.widthInches !== seed.battlefield.widthInches
    || binding.battlefield.heightInches !== seed.battlefield.heightInches) {
    fail("PREMADE_ROOM_SOURCE_IDENTITY_OR_SCALE_MISMATCH", seedId);
  }
  const mapping = semanticTerrain.terrainRegionInstances;
  if (Object.keys(mapping).length !== binding.regions.length
    || binding.regions.some(region => typeof mapping[region.regionId] !== "string")) {
    fail("PREMADE_ROOM_SOURCE_INSTANCE_MAPPING_INCOMPLETE", seedId);
  }
  const instanceIds = [...new Set(Object.values(mapping))];
  verifyOfficialPremadeTerrainAuthoringAgreementV1(semanticTerrain.terrainAgreement, {
    mapId: seedId, sourceArtSha256: seed.artSha256, instanceIds,
  });
  const sourceInstances = new Set(semanticTerrain.terrainAgreement.definitions.map(row => row.sourceInstanceId || row.instanceId));
  if (sourceInstances.size !== seed.terrainInstanceCount) {
    fail("PREMADE_ROOM_SOURCE_INSTANCE_DENOMINATOR_MISMATCH", seedId);
  }
  // This scale adapter contains only the existing chassis profiles. Native
  // source regions are the terrain; no made-up RTS passages/lanes/topology.
  const adapterBody = { schema: "starcraft_tmg_official_premade_map_scale_adapter_v1",
    version: "1.0.0", seedId, engagementScale: seed.engagementScale,
    battlefield: structuredClone(seed.battlefield),
    baseProfiles: createOfficialCompetitiveMapBaseProfilesV1(),
    source: structuredClone(SOURCE), trainingTruth: false };
  const adapter = { ...adapterBody, adapterHash: hashStarcraftTmgContract(adapterBody) };
  const body = { schema: "starcraft_tmg_official_premade_map_source_compilation_v1",
    version: "1.0.0", seedId, engagementScale: seed.engagementScale,
    mapSourceFamily: seed.mapSourceFamily, adapterHash: adapter.adapterHash,
    semanticBindingHash: binding.bindingHash,
    terrainAuthoringApprovalReference: semanticTerrain.terrainAgreement.approvalReference,
    source: structuredClone(SOURCE), pdfPage: seed.pdfPage, printedPage: seed.printedPage,
    selectionReceipt: semanticTerrain.terrainAgreement.definitions.map(row => ({
      instanceId: row.instanceId, terrainGroupId: row.terrainGroupId,
      ...(row.sourceInstanceId ? { sourceInstanceId: row.sourceInstanceId,
        sourcePartId: row.sourcePartId, sourcePartRole: row.sourcePartRole } : {}),
      attributes: structuredClone(row.attributes), attributeOrigin: "explicit_setup_agreement" })),
    passageSelectionReceipt: [],
    artLayer: { visualPresetId: OFFICIAL_PREMADE_MAP_VISUAL_PRESET_V1 },
    roomCertificationEligible: true, roomCertified: false, trainingTruth: false };
  return { adapterCatalogue: {
    schema: "starcraft_tmg_official_premade_map_scale_adapter_catalogue_v1", adapters: [adapter] },
    compilation: { ...body, compilationHash: hashStarcraftTmgContract(body) },
    metadata: { displayName: seed.displayName, gameEra: seed.gameEra,
      mapSourceFamily: seed.mapSourceFamily, artAssetPath: binding.art.assetPath } };
}
