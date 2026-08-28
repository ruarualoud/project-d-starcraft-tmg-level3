import { STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 } from "../../content/source-registry-v1.mjs";
import { adaptStarcraftTmgLegacyDataPack } from "../source-data/legacy-pack-adapter-v1.mjs";
import { createStarcraftTmgSourceRegistry } from "../source-data/source-registry-v1.mjs";
import {
  createStarcraftTmgDisplayFieldCatalogue,
  createStarcraftTmgSourceLocalizationRuntime,
} from "../localization/source-localization-runtime-v1.mjs";
import { isStarcraftTmgDisplayTranslationField } from "../localization/translation-sidecar-v1.mjs";

export const STARCRAFT_TMG_SOURCE_LOCALIZATION_FACTORY_VERSION = "starcraft_tmg_source_localization_factory_v1";

const LEGACY_COLLECTIONS = Object.freeze([
  { recordType: "faction", packKey: "factions", pathPrefix: "factions" },
  { recordType: "unit", packKey: "units", pathPrefix: "units" },
  { recordType: "card", packKey: "cards", pathPrefix: "cards" },
  { recordType: "game_card", packKey: "gameCards", pathPrefix: "gameCards" },
  { recordType: "official_mission_candidate", packKey: "officialMissions", pathPrefix: "officialMissions" },
  { recordType: "official_deployment_candidate", packKey: "officialDeployments", pathPrefix: "officialDeployments" },
  { recordType: "scenario_preset", packKey: "scenarioMaps", pathPrefix: "scenarioMaps" },
  { recordType: "terrain_preset", packKey: "terrainCatalog", pathPrefix: "terrainCatalog" },
  { recordType: "sample_roster", packKey: "sampleRosters", pathPrefix: "sampleRosters" },
]);

function canonicalId(record, recordType, index) {
  return String(record?.id || record?.name || `${recordType}-${index + 1}`);
}

function buildLegacyDisplayFields(pack, manifest) {
  const recordIndex = new Map(manifest.recordIndex.map((record) => [
    `${record.recordType}\u001f${record.canonicalId}`,
    record,
  ]));
  const fields = [];
  for (const collection of LEGACY_COLLECTIONS) {
    const records = Array.isArray(pack[collection.packKey]) ? pack[collection.packKey] : [];
    records.forEach((record, index) => {
      const id = canonicalId(record, collection.recordType, index);
      const recordRef = recordIndex.get(`${collection.recordType}\u001f${id}`);
      if (!recordRef) throw new Error(`legacy display record missing from normalized manifest: ${collection.recordType}/${id}`);
      for (const [name, value] of Object.entries(record || {})) {
        const fieldPath = `${collection.pathPrefix}[].${name}`;
        if (typeof value !== "string" || !value.trim() || !isStarcraftTmgDisplayTranslationField(fieldPath)) continue;
        fields.push({
          recordType: collection.recordType,
          canonicalId: id,
          recordHash: recordRef.recordHash,
          fieldPath,
          canonicalText: value,
          sourceLocale: "en",
        });
      }
    });
  }
  return fields;
}

export function createConfiguredStarcraftTmgSourceLocalizationRuntime(options = {}) {
  if (!options.legacyPack || !options.legacyPackSnapshot) throw new Error("legacy pack and sealed snapshot are required");
  const sourceRegistry = options.sourceRegistry || createStarcraftTmgSourceRegistry({
    sources: STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1,
  });
  const adapted = adaptStarcraftTmgLegacyDataPack({
    pack: options.legacyPack,
    packSnapshot: options.legacyPackSnapshot,
    generatedAt: options.generatedAt,
    transformerCodeHash: options.transformerCodeHash,
  });
  const fieldCatalogue = createStarcraftTmgDisplayFieldCatalogue({
    datasetRef: {
      datasetId: adapted.manifest.datasetId,
      datasetVersion: adapted.manifest.datasetVersion,
      datasetHash: adapted.manifest.datasetHash,
    },
    fields: buildLegacyDisplayFields(options.legacyPack, adapted.manifest),
  });
  const runtime = createStarcraftTmgSourceLocalizationRuntime({
    sourceRegistry,
    datasetManifest: adapted.manifest,
    fieldCatalogue,
    glossaries: options.glossaries || [],
    sidecarManifests: options.sidecarManifests || [],
    translationAdapter: options.translationAdapter,
    resolveProviderProfile: options.resolveProviderProfile,
    now: options.now,
  });
  return Object.freeze({
    schemaVersion: STARCRAFT_TMG_SOURCE_LOCALIZATION_FACTORY_VERSION,
    sourceRegistry,
    adapted,
    fieldCatalogue,
    runtime,
  });
}
