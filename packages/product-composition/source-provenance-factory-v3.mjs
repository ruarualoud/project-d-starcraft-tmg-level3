import { createStarcraftTmgOfficialSourceProvenanceRuntimeV3 } from
  "../localization/official-source-provenance-runtime-v3.mjs";
import { createStarcraftTmgOfficialSourceEvidenceRegistryV3 } from
  "../source-data/official-source-evidence-registry-v3.mjs";
import { createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2 } from
  "./source-localization-factory-v2.mjs";

export const STARCRAFT_TMG_SOURCE_PROVENANCE_FACTORY_V3_VERSION =
  "starcraft_tmg_source_provenance_factory_v3";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function createConfiguredStarcraftTmgSourceProvenanceRuntimeV3(options = {}) {
  const localizationV2 = createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2(options);
  const evidenceRegistry = createStarcraftTmgOfficialSourceEvidenceRegistryV3({
    ...options,
    sourceBinding: localizationV2.sourceBinding,
    fieldProvenanceCatalogue: localizationV2.fieldProvenanceCatalogue,
  });
  const runtime = createStarcraftTmgOfficialSourceProvenanceRuntimeV3({
    baseRuntime: localizationV2.runtime,
    evidenceRegistry,
  });
  return deepFreeze({
    schemaVersion: STARCRAFT_TMG_SOURCE_PROVENANCE_FACTORY_V3_VERSION,
    sourceRegistry: localizationV2.sourceRegistry,
    sourceBinding: localizationV2.sourceBinding,
    datasetManifest: localizationV2.datasetManifest,
    fieldCatalogue: localizationV2.fieldCatalogue,
    fieldProvenanceCatalogue: localizationV2.fieldProvenanceCatalogue,
    evidenceRegistry,
    runtime,
  });
}
