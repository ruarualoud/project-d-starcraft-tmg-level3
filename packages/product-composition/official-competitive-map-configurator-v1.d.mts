import type { OfficialCompetitiveMapTabletopAdapterCatalogueV1 } from
  "./official-competitive-map-tabletop-adapter-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_CONFIGURATOR_V1_SCHEMA:
  "starcraft_tmg_official_competitive_map_configurator_v1";

export interface OfficialCompetitiveMapConfiguratorV1 {
  readCatalogue(): Readonly<Record<string, unknown> & {
    maps: readonly Readonly<Record<string, unknown>>[];
    catalogueHash: string;
  }>;
  preview(input: {
    seedId: string;
    elementSelections?: readonly Readonly<Record<string, unknown>>[];
    passageSelections?: readonly Readonly<Record<string, unknown>>[];
  }): Readonly<Record<string, unknown>>;
}

export function createOfficialCompetitiveMapConfiguratorV1(input?: {
  adapterCatalogue?: OfficialCompetitiveMapTabletopAdapterCatalogueV1;
  broodWarGallery?: unknown;
  starcraft2Gallery?: unknown;
}): Readonly<OfficialCompetitiveMapConfiguratorV1>;
