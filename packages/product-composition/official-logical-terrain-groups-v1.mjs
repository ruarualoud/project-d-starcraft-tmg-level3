// Ground-profile lifecycle adapter. Native rectangles are collision records,
// not independent physical Grass pieces. Only setup-authored groups may be
// expanded, using the complete member list preserved in the Room freeze.
// This has no geometry inference, state mutation or Line-of-Sight verdict.
export const OFFICIAL_LOGICAL_GRASS_REMOVAL_POLICY_V1 = "logical_grass_piece_union_v1";
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };
const sameStrings = (left, right) => Array.isArray(left) && Array.isArray(right)
  && JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

export function resolveOfficialLogicalGrassRemovalV1(state, contactTerrainIds) {
  const ids = [...new Set(contactTerrainIds)].sort();
  const terrain = state.board?.terrain || [];
  const byId = new Map(terrain.map(row => [row.id, row]));
  const groupedContacts = ids.map(id => byId.get(id)).filter(row =>
    row?.overlayRole === "premade_profile_actual_cell" && row.terrainGroupId);
  // Legacy single-record pieces retain exactly their prior removal list and
  // receipt shape. No synthetic group is inferred from name/shape/proximity.
  if (!groupedContacts.length) return { grassRemovedTerrainIds: ids };
  const receipt = state.officialCompetitiveMapRoomFreeze?.overlayReceipt;
  if (receipt?.schema !== "starcraft_tmg_official_premade_profile_room_overlay_v1"
    || receipt.terrainProfilePolicy !== "accepted_premade_group_rectangle_overlay_v1"
    || !Array.isArray(receipt.logicalTerrainGroups)
    || receipt.logicalTerrainGroupCount !== receipt.logicalTerrainGroups.length
    || byId.size !== terrain.length) fail("LOGICAL_GRASS_SETUP_GROUP_DENOMINATOR_REQUIRED");
  const catalogue = new Map(receipt.logicalTerrainGroups.map(group => [group.terrainGroupId, group]));
  if (catalogue.size !== receipt.logicalTerrainGroups.length) fail("LOGICAL_GRASS_GROUP_DUPLICATE");
  const removed = new Set(ids);
  const groups = [...new Set(groupedContacts.map(row => row.terrainGroupId))].sort().map(groupId => {
    const group = catalogue.get(groupId);
    const members = terrain.filter(row => row.terrainGroupId === groupId);
    if (!group || !Array.isArray(group.rectangularRulesPieceIds) || !group.rectangularRulesPieceIds.length
      || new Set(group.rectangularRulesPieceIds).size !== group.rectangularRulesPieceIds.length
      || !sameStrings(members.map(row => row.id), group.rectangularRulesPieceIds)) {
      fail("LOGICAL_GRASS_GROUP_MEMBER_DENOMINATOR_MISMATCH", groupId);
    }
    if (members.some(row => row.overlayRole !== "premade_profile_actual_cell"
      || row.terrainKind !== "grass" || row.size !== 2
      || row.standableHorizontalSurface !== false
      || !sameStrings(row.terrainInstanceIds, group.terrainInstanceIds)
      || !sameStrings(row.sourceRegionIds, group.sourceRegionIds))) {
      fail("LOGICAL_GRASS_GROUP_PROFILE_MISMATCH", groupId);
    }
    const contactedTerrainIds = ids.filter(id => byId.get(id)?.terrainGroupId === groupId);
    const removedTerrainIds = members.filter(row => row.isRemoved !== true && row.isDestroyed !== true)
      .map(row => row.id).sort();
    removedTerrainIds.forEach(id => removed.add(id));
    return { terrainGroupId: groupId, contactedTerrainIds, removedTerrainIds,
      completeGroupMemberCount: members.length };
  });
  return { grassRemovedTerrainIds: [...removed].sort(), logicalGrassRemoval: {
    policy: OFFICIAL_LOGICAL_GRASS_REMOVAL_POLICY_V1, groups,
    contactCellsAndPhysicalPiecesAreDistinct: true, completeAffectedGroupMembersChecked: true,
    trainingTruth: false,
  } };
}
