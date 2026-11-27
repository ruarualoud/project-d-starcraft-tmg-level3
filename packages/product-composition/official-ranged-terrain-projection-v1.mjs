import { projectOfficialTerrainForSightV1 } from '../rule-atoms/official-terrain-sight-projection-v1.mjs';
import { createOfficialTerrainElevationAgreementV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';

export function projectOfficialRangedTerrainForLosV1(state) {
  const { terrain, grassTerrainIds } = projectOfficialTerrainForSightV1(state, 'SELECTED_RANGED_SPECIAL_TERRAIN_SCOPE_UNSUPPORTED');
  const projected = {
    board: {
      terrain,
      terrainElevationAgreement: state.board.terrainElevationAgreement
        || createOfficialTerrainElevationAgreementV1({ supportRelations: [] }),
    },
    pieces: state.pieces,
    ...(state.officialModelBaseGeometryDataBundle?.version === "2.2.0" ? {
      officialModelBaseGeometryDataBundle: state.officialModelBaseGeometryDataBundle,
    } : {}),
  };
  return { projected, grassTerrainIds };
}
