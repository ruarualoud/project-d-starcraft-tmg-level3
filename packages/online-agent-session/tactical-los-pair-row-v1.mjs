// Shared exact projection for synchronous graphs and their private CPU workers.
// Native full pair results remain sealed in the owning kernel/worker.
export function projectStarcraftTmgTacticalLosPairRowV1(result,
  attackerModelId, targetModelId, adapter) {
  const assessments = result.assessments || result.grassAssessments || [];
  return {
    attackerModelId,
    targetModelId,
    visible: result.visible,
    baseEdgeDistanceMilliInches: result.modelEdgeDistanceMilliInches,
    blockingTerrainIds: result.blockingTerrainIds === undefined
      ? undefined : structuredClone(result.blockingTerrainIds),
    coverAssessments: assessments.filter(entry =>
      entry.blockingTerrainTrace || entry.attackerDirectCover
        || entry.targetDirectCover || entry.elevationDeadZoneBlocks)
      .map(entry => ({
        terrainId: entry.terrainId,
        attackerDirectCover: entry.attackerDirectCover,
        targetDirectCover: entry.targetDirectCover,
        closeQuarters: entry.closeQuarters,
        elevationDeadZoneBlocks: entry.elevationDeadZoneBlocks,
        blocksLineOfSight: entry.blocksLineOfSight,
      })),
    resultHash: result.resultHash,
    adapter,
    precision: "exact_current_geometry",
  };
}
