// Model-facing geometry facts. Search heuristics are not strategic utility or VP.
// Historical raw receipts remain unchanged; apply this at their read boundary too.
export function projectFormationMetricsForDecisionV1(metrics) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return metrics ?? null;
  const { solverScore: _searchHeuristic, ...facts } = structuredClone(metrics);
  return { ...facts, measurementSemantics: {
    advance: "orientation_of_followers_relative_to_leading_model_not_whole_unit_progress",
    visibleEnemyClearance: "base_edge_distance_not_expected_damage_or_safety",
    targetProximity: "distance_or_nearby_model_count_not_native_marker_control_or_victory_points",
    strategyRankingProvided: false,
  } };
}
