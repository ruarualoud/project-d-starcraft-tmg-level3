// Public setup previews consume portable, pinned source candidates. Clients
// edit attributes/grouping only; geometry never comes back in a request.
// Preview compilation does not approve the art, tasks or a live Room.
import { OFFICIAL_PREMADE_NATIVE_SOURCE_CANDIDATES_V1 } from
  "../../content/official-premade-native-source-candidates-v1.mjs";
import { OFFICIAL_PREMADE_TEMPLE_SOURCE_PARTS_V1 } from
  "../../content/official-premade-temple-source-parts-v1.mjs";
import { createOfficialPremadeMapRoomSourceCatalogueV1 } from "./official-premade-map-room-source-v1.mjs";
import { createOfficialPremadeTerrainAgreementDraftV1, editOfficialPremadeTerrainAgreementDraftV1,
  acceptOfficialPremadeTerrainAgreementV1, createOfficialPremadeRecommendedTerrainSetupV1 } from
  "./official-premade-terrain-authoring-agreement-v1.mjs";
import { createOfficialPremadeMapAuthoringV1 } from "./official-premade-map-authoring-v1.mjs";
import { compileOfficialCompetitiveMapSemanticRulesGeometryV1 } from
  "./official-competitive-map-semantic-rules-adapter-v1.mjs";

const clone = value => structuredClone(value);
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };

function sourceProjection(seed) {
  return { seedId: seed.seedId, displayName: seed.displayName, gameEra: seed.gameEra,
    mapSourceFamily: seed.mapSourceFamily, engagementScale: seed.engagementScale,
    battlefield: clone(seed.battlefield), sourceVariant: "frozen_official_premade_native_candidate_v1",
    source: clone(seed.source), pdfPage: seed.pdfPage, printedPage: seed.printedPage,
    artAsset: { path: `/assets/client/battlefield/maps/${seed.seedId}.png`,
      sha256: seed.artSha256, mimeType: "image/png", pixelSize: clone(seed.pixelSize) },
    classicArtVariant: null, elements: [], passages: [], zones: [], baseProfilesAudited: [],
    terrainInstanceCount: seed.terrainInstanceCount, nativeSourceCandidateAvailable: true,
    formalTaskRoomEligible: false, taskGeometryStatus: "native_source_pending_setup_and_room_admission",
    defaultRecipe: { roomCertificationEligible: false }, backgroundRulesAuthority: false,
    runtimePixelInferenceAllowed: false, sourceRegistrationIsNotRoomAdmission: true, trainingTruth: false };
}

export function createOfficialPremadeMapConfiguratorV1() {
  const registered = createOfficialPremadeMapRoomSourceCatalogueV1();
  const candidates = clone(OFFICIAL_PREMADE_NATIVE_SOURCE_CANDIDATES_V1);
  for (const authored of OFFICIAL_PREMADE_TEMPLE_SOURCE_PARTS_V1.maps) {
    const source = candidates.maps.find(row => row.sourceGeometry.mapId === authored.mapId)?.sourceGeometry;
    if (!source || source.sourceArt.sha256 !== authored.sourceArtSha256) fail("PREMADE_CONFIGURATOR_PART_SOURCE_MISMATCH", authored.mapId);
    for (const partition of authored.parts) {
      const proposal = source.proposals.find(row => row.instanceId === partition.instanceId);
      if (!proposal || proposal.sourceParts !== undefined) fail("PREMADE_CONFIGURATOR_PART_INSTANCE_MISMATCH", partition.instanceId);
      proposal.sourceParts = clone(partition.sourceParts);
    }
  }
  const sources = new Map(candidates.maps.map(row => [row.sourceGeometry.mapId, row]));
  const maps = registered.seeds.map(seed => {
    const source = sources.get(seed.seedId)?.sourceGeometry;
    if (!source || source.sourceArt.sha256 !== seed.artSha256
      || source.sourceArt.width !== seed.pixelSize.width || source.sourceArt.height !== seed.pixelSize.height
      || source.battlefield.widthInches !== seed.battlefield.widthInches
      || source.battlefield.heightInches !== seed.battlefield.heightInches
      || source.proposals.length !== seed.terrainInstanceCount) {
      fail("PREMADE_CONFIGURATOR_PINNED_SOURCE_MISMATCH", seed.seedId);
    }
    return sourceProjection(seed);
  });
  const byId = new Map(maps.map(row => [row.seedId, row]));
  const drafts = new Map(candidates.maps.map(row => [row.sourceGeometry.mapId,
    createOfficialPremadeTerrainAgreementDraftV1({ geometry: row.sourceGeometry,
      sizeEvidence: candidates.sizeEvidence })]));
  function editedSetup(raw) {
    const map = byId.get(raw.seedId);
    if (!map) fail("PREMADE_CONFIGURATOR_SEED_UNKNOWN", raw.seedId);
    if ((raw.elementSelections || []).length || (raw.passageSelections || []).length) {
      fail("PREMADE_CONFIGURATOR_RTS_SELECTIONS_NOT_APPLICABLE", raw.seedId);
    }
    const setup = raw.terrainSetup;
    if (setup !== undefined && (!setup || typeof setup !== "object" || Array.isArray(setup)
      || Object.keys(setup).some(key => key !== "valuesByInstance"))) {
      fail("PREMADE_CONFIGURATOR_SETUP_EDITS_REQUIRED");
    }
    const values = setup?.valuesByInstance;
    if (values !== undefined && (!values || typeof values !== "object" || Array.isArray(values))) {
      fail("PREMADE_CONFIGURATOR_SETUP_EDITS_REQUIRED");
    }
    const draft = values ? editOfficialPremadeTerrainAgreementDraftV1(drafts.get(map.seedId), values)
      : clone(drafts.get(map.seedId));
    return { map, draft, candidate: sources.get(map.seedId) };
  }
  function authoredSetup({ map, draft, candidate }, reference, review) {
    const agreement = acceptOfficialPremadeTerrainAgreementV1(draft, { accepted: true, reference });
    return createOfficialPremadeMapAuthoringV1({ sourceGeometry: candidate.sourceGeometry,
      terrainAgreement: agreement, artAssetPath: map.artAsset.path, review });
  }
  return Object.freeze({
    readMaps() { return clone(maps); },
    hasMap(seedId) { return byId.has(seedId); },
    prepareRoomConfiguration(raw, context = {}) {
      if (Object.keys(raw).some(key => !["seedId", "terrainSetup", "elementSelections", "passageSelections"].includes(key))) {
        fail("PREMADE_CONFIGURATOR_CLIENT_SOURCE_REPLACEMENT_REJECTED", raw.seedId);
      }
      const setup = editedSetup(raw);
      if (setup.draft.counts.completeDefinitions !== setup.draft.counts.instances) {
        fail("PREMADE_CONFIGURATOR_COMPLETE_SETUP_REQUIRED", raw.seedId);
      }
      if (!String(context.roomId || "").trim()) fail("PREMADE_CONFIGURATOR_SERVER_ROOM_CONTEXT_REQUIRED");
      // POST rooms is the explicit setup command. Only its server-owned room
      // context stamps this agreement; caller acceptance/proof/geometry is not
      // imported. Task/scale/full-base admission remains the existing factory.
      const authored = authoredSetup(setup, `new_room_setup_request:${context.roomId}`, {
        author: "server_new_room_explicit_setup_request",
        authoredAt: context.setupRequestedAt || "2026-10-06",
      });
      return { seedId: setup.map.seedId, semanticTerrain: authored.semanticTerrain };
    },
    preview(raw = {}) {
      const setup = editedSetup(raw);
      const { map, draft, candidate } = setup;
      const source = candidate.sourceGeometry;
      const preview = {
        schema: "starcraft_tmg_official_competitive_map_preview_v1", version: "1.1.0",
        seedId: map.seedId, displayName: map.displayName, gameEra: map.gameEra,
        mapSourceFamily: map.mapSourceFamily, engagementScale: map.engagementScale,
        battlefield: clone(map.battlefield), artAsset: clone(map.artAsset),
        artLayer: { visualPresetId: "official_tmg_premade_source_art_v1" },
        terrainAgreementDraft: draft,
        recommendedTerrainSetup: createOfficialPremadeRecommendedTerrainSetupV1({ geometry: source,
          sizeEvidence: candidates.sizeEvidence }),
        sourceOutlines: source.proposals.map(row => ({ instanceId: row.instanceId,
          pieceCandidates: clone(row.pieceCandidates), sourcePixelGeometry: clone(row.sourcePixelGeometry),
          ...(row.sourceParts ? { sourceParts: clone(row.sourceParts) } : {}) })),
        sourceLayerRelationships: clone(source.sourceLayerRelationships || []),
        sourceCandidateEvidence: candidate.sourceCandidateEvidence,
        sourceArtOwnershipReviewedForRoom: candidate.sourceArtOwnershipReviewedForRoom,
        sourceOutlinesAreRulesBeforeAgreement: false,
        rulesTerrain: [], selectionReceipt: [], passageSelectionReceipt: [],
        terrainAccessPoints: [],
        targetCounts: null, actualCounts: { total: 0, terrainGroups: 0 }, compensatingTerrainPieceIds: [],
        warnings: [], diagnostics: { runtimeImagePixelsRead: false, completeDefinitions: draft.counts.completeDefinitions },
        status: "source_preview_pending_explicit_terrain_agreement", compilationHash: null,
        officialRecipeEligible: false, roomCertificationEligible: false,
        taskGeometryStatus: map.taskGeometryStatus, backgroundRulesAuthority: false,
        previewMayMutateRoom: false, rulesAuthorityGranted: false, trainingTruth: false,
      };
      if (draft.counts.completeDefinitions !== draft.counts.instances) {
        preview.warnings.push("Terrain attributes/grouping are incomplete; source contours are not active Rules terrain.");
        return preview;
      }
      // Temporary preview agreement only. No client-supplied acceptance flag,
      // signature, binding or Room-certification claim is consumed here.
      const authored = authoredSetup(setup, `map_configurator_preview_only:${map.seedId}`, {
        author: "server_native_candidate_preview_not_room_admission", authoredAt: "2026-10-06" });
      const agreement = authored.semanticTerrain.terrainAgreement;
      const compiled = compileOfficialCompetitiveMapSemanticRulesGeometryV1(authored.semanticTerrain);
      preview.rulesTerrain = compiled.regions.flatMap(region => region.footprintCells.map((cell, index) => ({
        terrainPieceId: `${region.regionId}:preview-cell:${index + 1}`,
        terrainGroupId: region.terrainGroupId, instanceId: region.terrainInstanceIds.length === 1
          ? region.terrainInstanceIds[0] : null, instanceIds: clone(region.terrainInstanceIds),
        ...clone(region.rulesClassification), footprintMilliInches: clone(cell),
        footprint: { xMin: cell.minXMilliInches / 1000, xMax: cell.maxXMilliInches / 1000,
          yMin: cell.minYMilliInches / 1000, yMax: cell.maxYMilliInches / 1000 },
      })));
      preview.actualCounts = { total: preview.rulesTerrain.length, terrainGroups: compiled.regions.length };
      // Ports belong to the physical group, not every collision rectangle.
      preview.terrainAccessPoints = compiled.regions.flatMap(region => (region.accessPoints || []).map(accessPoint => ({
        terrainGroupId: region.terrainGroupId, accessPoint: clone(accessPoint),
      })));
      preview.selectionReceipt = clone(agreement.definitions);
      preview.status = "explicit_setup_rules_preview_not_room_admission";
      preview.compilationHash = compiled.semanticRulesGeometryHash;
      preview.diagnostics.cellResolutionMilliInches = compiled.cellResolutionMilliInches;
      return preview;
    },
  });
}
