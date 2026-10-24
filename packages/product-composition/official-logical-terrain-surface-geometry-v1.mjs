// Physical-group support geometry, not another movement/height Rules kernel.
// Exact complete-base/sweep coverage is shared with the original ramp kernel.
import { officialRectangleUnionCoversBasesV1 } from "../rule-atoms/official-footprint-rectangle-union-geometry-v1.mjs";
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };
const same = (a,b) => Array.isArray(a) && Array.isArray(b)
  && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export function resolveOfficialLogicalTerrainSurfaceCoverageV1(state, bases) {
  const terrain = state.board?.terrain || [];
  const active = terrain.filter(r => r.isRemoved !== true && r.isDestroyed !== true);
  const surfaces = active.filter(r => r.overlayRole === "premade_profile_actual_cell" && r.standableHorizontalSurface === true);
  if (!surfaces.length) return null;
  if (!Array.isArray(bases) || !bases.length || bases.some(b => b?.schema !== "starcraft_tmg_physical_footprint_v1")) {
    fail("LOGICAL_SURFACE_PHYSICAL_BASES_REQUIRED");
  }
  const receipt = state.officialCompetitiveMapRoomFreeze?.overlayReceipt;
  if (receipt?.schema !== "starcraft_tmg_official_premade_profile_room_overlay_v1"
    || receipt.terrainProfilePolicy !== "accepted_premade_group_rectangle_overlay_v1"
    || !Array.isArray(receipt.logicalTerrainGroups) || receipt.logicalTerrainGroupCount !== receipt.logicalTerrainGroups.length
    || new Set(terrain.map(r => r.id)).size !== terrain.length) fail("LOGICAL_SURFACE_SETUP_GROUP_REQUIRED");
  const catalogue = new Map(receipt.logicalTerrainGroups.map(g => [g.terrainGroupId, g]));
  if (catalogue.size !== receipt.logicalTerrainGroups.length) fail("LOGICAL_SURFACE_GROUP_DUPLICATE");
  const groups = [...new Set(surfaces.map(r => r.terrainGroupId))].sort().map(id => {
    const definition = catalogue.get(id); const rows = terrain.filter(r => r.terrainGroupId === id); const first = rows[0];
    if (!definition || !definition.rectangularRulesPieceIds?.length
      || new Set(definition.rectangularRulesPieceIds).size !== definition.rectangularRulesPieceIds.length
      || !same(rows.map(r => r.id), definition.rectangularRulesPieceIds)) fail("LOGICAL_SURFACE_MEMBER_DENOMINATOR_MISMATCH", id);
    const expectedHeight = first.size >= 3 ? "high_ground" : first.size >= 1 ? "mid_ground" : "ground_level";
    if (rows.some(r => r.isRemoved === true || r.isDestroyed === true || !["ordinary", "ramp"].includes(r.terrainKind)
      || r.standableHorizontalSurface !== true || r.elevationSurface !== true || r.size !== first.size
      || r.heightTier !== expectedHeight || r.overlayRole !== "premade_profile_actual_cell"
      || !same(r.terrainInstanceIds, definition.terrainInstanceIds) || !same(r.sourceRegionIds, definition.sourceRegionIds))) {
      fail("LOGICAL_SURFACE_GROUP_PROFILE_MISMATCH", id);
    }
    return { terrainGroupId: id, rectangularRulesPieceIds: [...definition.rectangularRulesPieceIds].sort(),
      elevation: expectedHeight === "high_ground" ? "high" : expectedHeight === "mid_ground" ? "mid" : "ground",
      covered: officialRectangleUnionCoversBasesV1(rows.flatMap(row => row.footprintCells || [row.footprint]), bases) };
  });
  return { policy: "complete_base_and_rigid_sweep_inside_logical_surface_union_v1", groups,
    baseFootprintHashes: bases.map(b => b.footprintHash), fullPhysicalBaseChecked: true,
    internalRectangleSeamsAreNotBoundaries: true, holesAndOutsideBoundaryPreserved: true,
    terrainAccessOrElevationTransitionNotGranted: true, trainingTruth: false };
}
