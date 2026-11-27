import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
const clone = value => structuredClone(value);

export function projectOfficialTerrainForSightV1(state, unsupportedKindCode) {
  const grassTerrainIds = [];
  // 2.47 first bound physical cell placement in Bombard rooms. Those saved
  // openings predate the release-wide projection flag introduced in 2.48.
  const compoundSight = state.officialReleaseRangedSightProjection === 'signed_compound_ramp_v1'
    || (typeof state.officialReleaseBombardPhysicalPlacement === 'string'
      && state.officialReleaseBombardPhysicalPlacement === state.officialBombardSourceBundle?.bundleHash);
  const terrain = (state.board?.terrain || []).map((terrain) => {
    if (terrain.isRemoved === true || terrain.terrainKind === "ordinary") {
      return clone(terrain);
    }
    if (compoundSight && terrain.terrainKind === "ramp" && terrain.footprintCells) {
      // The elevation and sight readers verify the original setup and terrain
      // hashes. Support relations keep referring to this single logical ramp.
      return { ...clone(terrain), rangedSightProjection: "signed_compound_ramp_v1" };
    }
    // Movement restrictions do not change the agreed size, height or sight openings.
    if (!["grass", "impassable", "ramp"].includes(terrain.terrainKind)) {
      throw Error(unsupportedKindCode + ":" + String(terrain.id ?? ""));
    }
    if (terrain.terrainKind === "grass") grassTerrainIds.push(terrain.id);
    const body = {
      schema: terrain.schema, id: terrain.id, terrainKind: "ordinary",
      size: terrain.size, footprint: clone(terrain.footprint),
      standableHorizontalSurface: terrain.standableHorizontalSurface === true,
      setupAgreement: clone(terrain.setupAgreement),
      rulesTruth: "official_core_terrain_setup_agreement", trainingTruth: false,
    };
    return { ...body, terrainHash: hashStarcraftTmgContract(body),
      terrainId: terrain.id, elevation: terrain.elevation,
      heightTier: terrain.heightTier, elevationSurface: terrain.elevationSurface,
      impassable: terrain.impassable === true, openings: clone(terrain.openings || []),
      accessPoints: clone(terrain.accessPoints || []), isRemoved: false };
  });
  return { terrain, grassTerrainIds:grassTerrainIds.sort() };
}
