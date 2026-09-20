import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_SPATIAL_PLAYER_PLANNING_CASE_SUITE_VERSION =
  "starcraft_tmg_spatial_player_planning_case_suite_v1";

const BLUEPRINTS = Object.freeze([
  {
    id: "footprint.dev.edge-containment",
    family: "footprints_and_formation",
    split: "development",
    independence: "south-edge-two-model-advance",
    situation: "A model centre fits near the south edge, but its complete base does not.",
    geometry: { board: [36000, 36000], baseRadii: [630, 630],
      positions: [[6000, 2500], [8500, 2500]] },
    candidates: [["centre_only_edge", [6000, 400]],
      ["complete_base_inset", [6000, 800]]],
    queries: [["edge_path", "legal_full_path_movement", "exact"],
      ["edge_coherency", "coherency_after_candidate_placement", "exact"]],
    preferred: ["complete_base_inset"],
    difference: "reject centre-only placement and preserve the complete base plus formation",
  },
  {
    id: "footprint.dev.formation-expansion",
    family: "footprints_and_formation",
    split: "development",
    independence: "three-model-fan-out",
    situation: "A faster lead model can reach the marker, but the expanded formation breaks coherency.",
    geometry: { board: [36000, 36000], baseRadii: [630, 630, 630],
      positions: [[9000, 9000], [11000, 9000], [13000, 9000]] },
    candidates: [["leader_reaches_marker", [[18000, 12000], [11000, 9000], [13000, 9000]]],
      ["compact_unit_advance", [[15000, 11000], [13500, 10000], [12000, 9500]]]],
    queries: [["fan_coherency", "coherency_after_candidate_placement", "exact"],
      ["fan_paths", "legal_full_path_movement", "exact"]],
    preferred: ["compact_unit_advance"],
    difference: "evaluate every model and the resulting formation rather than the leader centre",
  },
  {
    id: "footprint.heldout.north-edge-trailer",
    family: "footprints_and_formation",
    split: "heldout",
    independence: "north-edge-three-model-trailer",
    situation: "The first two bases fit after a northward move while the trailing base crosses the board.",
    geometry: { board: [36000, 36000], baseRadii: [787, 630, 630],
      positions: [[21000, 31000], [19000, 30000], [23000, 30000]] },
    candidates: [["front_pair_only", [[21000, 35300], [19000, 34700], [23000, 35500]]],
      ["whole_formation_inside", [[21000, 34500], [19000, 33800], [23000, 33800]]]],
    queries: [["north_paths", "legal_full_path_movement", "exact"],
      ["north_coherency", "coherency_after_candidate_placement", "exact"]],
    preferred: ["whole_formation_inside"],
    difference: "catch a non-leading model base crossing the opposite board edge",
  },
  {
    id: "footprint.heldout.doorway-trailing-base",
    family: "footprints_and_formation",
    split: "heldout",
    independence: "east-doorway-trailing-base",
    situation: "The leader's path clears a doorway, but one remaining model's proposed final placement clips the doorway corner.",
    geometry: { board: [36000, 36000], baseRadii: [630, 630, 630],
      positions: [[7000, 18000], [5500, 16800], [5500, 19200]],
      blockers: [[12000, 15000, 15000, 17400], [12000, 18600, 15000, 21000]] },
    candidates: [["leader_line_only", [[17000, 18000], [14500, 16800], [14500, 19200]]],
      ["formation_doorway_clear", [[17000, 18000], [14500, 17600], [14500, 18400]]]],
    queries: [["door_paths", "legal_full_path_movement", "exact"],
      ["door_blocking", "intervening_model_or_terrain_blocking", "exact"],
      ["door_coherency", "coherency_after_candidate_placement", "exact"]],
    preferred: ["formation_doorway_clear"],
    difference: "use the leading model's swept base and every remaining model's complete final-placement base without inventing follower paths",
  },
  {
    id: "screen.dev.choke-occupation",
    family: "blocking_and_screening",
    split: "development",
    independence: "central-choke-occupation",
    situation: "A durable model can occupy a narrow lane or chase damage away from the lane.",
    geometry: { board: [36000, 36000], baseRadii: [787, 630],
      positions: [[15000, 18000], [10000, 18000]],
      blockers: [[17000, 12000, 20500, 16500], [17000, 19500, 20500, 24000]] },
    candidates: [["occupy_choke", [18800, 18000]], ["chase_exposed_target", [22500, 15000]]],
    queries: [["choke_blocking", "intervening_model_or_terrain_blocking", "exact"],
      ["choke_score", "objective_score_after_candidate_action", "exact"]],
    preferred: ["occupy_choke"],
    difference: "prefer board control when the blocking position changes reachable lanes",
  },
  {
    id: "screen.dev.interposed-cover",
    family: "blocking_and_screening",
    split: "development",
    independence: "interposed-friendly-screen",
    situation: "A support model can be left in direct sight or screened by an interposed friendly base.",
    geometry: { board: [36000, 36000], baseRadii: [787, 630, 630],
      positions: [[12000, 18000], [9000, 18000], [25000, 18000]] },
    candidates: [["screen_support", [[17000, 18000], [14500, 18000]]],
      ["open_support_lane", [[17000, 15000], [14500, 18000]]]],
    queries: [["screen_los", "line_of_sight_cover_and_elevation", "exact"],
      ["screen_exchange", "fire_zone_exchange", "advisory_estimate"]],
    preferred: ["screen_support"],
    difference: "include the protected unit and retaliation cost, not only forward distance",
  },
  {
    id: "screen.heldout.escape-route",
    family: "blocking_and_screening",
    split: "heldout",
    independence: "offset-screen-with-retreat",
    situation: "A perfect body block also seals the unit's retreat; an offset screen preserves an exit.",
    geometry: { board: [36000, 36000], baseRadii: [787, 630],
      positions: [[16000, 17000], [13000, 17000]],
      blockers: [[10000, 13000, 15000, 15500], [10000, 18500, 15000, 21000]] },
    candidates: [["seal_both_sides", [15500, 17000]], ["offset_keep_exit", [16200, 17800]]],
    queries: [["retreat_path", "legal_full_path_movement", "exact"],
      ["retreat_blocking", "intervening_model_or_terrain_blocking", "exact"],
      ["retreat_exchange", "fire_zone_exchange", "advisory_estimate"]],
    preferred: ["offset_keep_exit"],
    difference: "screen the opponent without trapping the planned fallback route",
  },
  {
    id: "screen.heldout.detour-screen",
    family: "blocking_and_screening",
    split: "heldout",
    independence: "diagonal-charge-detour",
    situation: "Two legal screens differ in whether the enemy can take a direct or forced-detour approach.",
    geometry: { board: [36000, 36000], baseRadii: [630, 630],
      positions: [[14000, 14000], [24500, 22500]],
      blockers: [[17000, 15000, 20500, 19000]] },
    candidates: [["direct_body_block", [19000, 14500]], ["detour_screen", [16500, 19500]]],
    queries: [["detour_blocking", "intervening_model_or_terrain_blocking", "exact"],
      ["detour_threat", "action_specific_threat", "exact"],
      ["detour_path", "legal_full_path_movement", "exact"]],
    preferred: ["detour_screen"],
    difference: "measure the opponent's full legal approach after screening, including detour length",
  },
  {
    id: "threat.dev.stationary-versus-move-fire",
    family: "threat_boundaries",
    split: "development",
    independence: "stationary-moving-ranged-threat",
    situation: "A destination is outside stationary range but inside the same weapon's move-and-fire threat.",
    geometry: { board: [36000, 36000], baseRadii: [630, 630],
      positions: [[9000, 9000], [23000, 9000]] },
    candidates: [["outside_stationary_only", [15500, 9000]], ["outside_move_fire", [12500, 6000]]],
    queries: [["stationary_threat", "action_specific_threat", "exact"],
      ["move_fire_threat", "action_specific_threat", "exact"],
      ["ranged_los", "line_of_sight_cover_and_elevation", "exact"]],
    preferred: ["outside_move_fire"],
    difference: "distinguish stationary range from legal move-plus-weapon threat",
  },
  {
    id: "threat.dev.ranged-versus-charge",
    family: "threat_boundaries",
    split: "development",
    independence: "ranged-and-charge-threat",
    situation: "A position avoids the enemy weapon but remains inside its current charge envelope.",
    geometry: { board: [36000, 36000], baseRadii: [787, 630],
      positions: [[10000, 24000], [21000, 24000]] },
    candidates: [["weapon_safe_charge_exposed", [15000, 24000]], ["charge_safe_cover", [12500, 20500]]],
    queries: [["weapon_threat", "action_specific_threat", "exact"],
      ["charge_threat", "action_specific_threat", "exact"],
      ["charge_cover", "line_of_sight_cover_and_elevation", "exact"]],
    preferred: ["charge_safe_cover"],
    difference: "compare different legal action modes instead of drawing one generic threat radius",
  },
  {
    id: "threat.heldout.resource-extended-attack",
    family: "threat_boundaries",
    split: "heldout",
    independence: "resource-conditioned-threat-extension",
    situation: "A card or ability can extend an attack only while its current resource cost is payable.",
    geometry: { board: [36000, 36000], baseRadii: [630, 630],
      positions: [[8000, 28000], [24500, 28000]], resourceState: "payable" },
    candidates: [["ignore_resource_extension", [15500, 28000]],
      ["respect_resource_extension", [12500, 25000]]],
    queries: [["resource_threat", "action_specific_threat", "exact"],
      ["resource_exchange", "fire_zone_exchange", "advisory_estimate"]],
    preferred: ["respect_resource_extension"],
    difference: "condition threat on the actual ability/card/resource state at this revision",
  },
  {
    id: "threat.heldout.aggregate-overlap",
    family: "threat_boundaries",
    split: "heldout",
    independence: "two-enemy-overlapping-fire-zones",
    situation: "A model survives either enemy alone but enters their overlapping many-to-one fire zone.",
    geometry: { board: [36000, 36000], baseRadii: [630, 630, 630],
      positions: [[12000, 7000], [24000, 5000], [24000, 11000]] },
    candidates: [["single_enemy_safe", [17500, 8000]], ["outside_aggregate_overlap", [14500, 12000]]],
    queries: [["enemy_one_threat", "action_specific_threat", "exact"],
      ["enemy_two_threat", "action_specific_threat", "exact"],
      ["aggregate_exchange", "fire_zone_exchange", "advisory_estimate"]],
    preferred: ["outside_aggregate_overlap"],
    difference: "evaluate overlapping many-to-one fire rather than each enemy in isolation",
  },
]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function sourceBinding(value) {
  if (!object(value)) throw new TypeError("sourceBinding is required");
  return deepFreeze({
    dataVersion: required(value.dataVersion, "sourceBinding.dataVersion"),
    datasetHash: required(value.datasetHash, "sourceBinding.datasetHash"),
    rulesSourceHash: required(value.rulesSourceHash,
      "sourceBinding.rulesSourceHash"),
    faqSourceHash: required(value.faqSourceHash, "sourceBinding.faqSourceHash"),
    spatialRulesRuntimeBinding: "required_at_case_execution",
    sourceRefreshPerformed: false,
  });
}

function compileCase(blueprint, binding, suiteVersion) {
  const stateFixture = {
    schemaVersion: `${suiteVersion}.state`,
    independenceKey: blueprint.independence,
    playerVisibleGeometry: clone(blueprint.geometry),
    hiddenOpponentInformationIncluded: false,
    coordinateSystem: "battlefield_bottom_left_milli_inches",
  };
  const stateHash = hashStarcraftTmgContract(stateFixture);
  const actionCandidates = blueprint.candidates.map(([candidateId, placement]) => ({
    candidateId,
    proposal: { kind: "case_parameterized_action", placement: clone(placement) },
    currentRulesInstantiationRequired: true,
    currentPreviewRequired: true,
  }));
  const legalSpaceHash = hashStarcraftTmgContract({ stateHash, actionCandidates });
  const requiredQueries = blueprint.queries.map(([queryId, queryKind, minimumStatus]) => ({
    queryId,
    queryKind,
    minimumStatus,
    authority: { stateHash, legalSpaceHash },
    currentRulesQueryRequired: true,
  }));
  const prompt = seal({
    schemaVersion:
      `${suiteVersion}.prompt`,
    caseId: blueprint.id,
    familyId: blueprint.family,
    stateFixture,
    stateHash,
    legalSpaceHash,
    sourceBinding: clone(binding),
    situation: blueprint.situation,
    actionCandidates,
    requiredQueries,
    decisionContract: {
      planAssessmentRequired: true,
      currentGoalRequired: true,
      purposeAndPlanContinuityRequired: true,
      expectedOwnOutcomeRequired: true,
      predictedOpponentResponseAndOwnCounterResponseRequired: true,
      completeCandidateTradeoffComparisonRequired: true,
      stopOrReplanTriggersRequired: true,
    },
    oracleExcluded: true,
    confirmationAuthority: false,
    applyAuthority: false,
    trainingTruth: false,
  }, "promptHash");
  const oracle = seal({
    schemaVersion:
      `${suiteVersion}.oracle`,
    promptHash: prompt.promptHash,
    split: blueprint.split,
    independenceKey: blueprint.independence,
    preferredCandidateIds: clone(blueprint.preferred),
    requiredBehaviouralDifference: blueprint.difference,
    preferenceScope: "bounded_fixture_not_global_best_play",
    eligibleForTraining: false,
    trainingTruth: false,
  }, "oracleHash");
  return deepFreeze({ prompt, oracle });
}

function nonEmptyArray(value, field) {
  if (!Array.isArray(value) || !value.length) {
    throw new TypeError(`${field} requires at least one item`);
  }
  return value;
}

function validatePlayerDecision(entry, decision) {
  if (!object(decision) || decision.casePromptHash !== entry.prompt.promptHash) {
    throw new TypeError("decision does not match the spatial case prompt");
  }
  const candidateIds = entry.prompt.actionCandidates.map((item) => item.candidateId);
  if (!candidateIds.includes(decision.candidateId)) {
    throw new TypeError("decision candidate is outside the case ActionSpace");
  }
  if (!object(decision.planAssessment)
    || !["continue", "revise"].includes(decision.planAssessment.verdict)
    || !["sound", "at_risk"].includes(decision.planAssessment.health)
    || !decision.planAssessment.continuitySummary
    || !decision.planAssessment.nextDecisionFocus) {
    throw new TypeError("decision requires a current PlanAssessment");
  }
  for (const field of ["currentGoal", "purpose", "planContinuity",
    "expectedOwnOutcome"]) required(decision[field], `decision.${field}`);
  const responses = nonEmptyArray(decision.predictedOpponentResponses,
    "decision.predictedOpponentResponses");
  if (responses.some((item) => !object(item) || !item.opponentAction
    || !item.counterResponse || !item.counterPurpose)) {
    throw new TypeError("each opponent response requires an own counter-response");
  }
  const tradeoffs = nonEmptyArray(decision.tradeoffs, "decision.tradeoffs");
  if (tradeoffs.some((item) => !object(item) || !item.benefit
    || !item.cost || !item.acceptanceReason)) {
    throw new TypeError("each tradeoff requires benefit, cost and acceptance reason");
  }
  nonEmptyArray(decision.stopOrReplanTriggers,
    "decision.stopOrReplanTriggers");
  const comparisons = nonEmptyArray(decision.comparisons, "decision.comparisons");
  if (comparisons.length !== candidateIds.length
    || new Set(comparisons.map((item) => item.candidateId)).size
      !== candidateIds.length
    || comparisons.some((item) => !candidateIds.includes(item.candidateId)
      || !item.tradeoff || !Array.isArray(item.evidenceRefs))) {
    throw new TypeError("decision must compare every candidate with evidence refs");
  }
  return candidateIds;
}

function queryCoverage(entry, decision) {
  const receipts = nonEmptyArray(decision.queryReceipts,
    "decision.queryReceipts");
  const comparisonRefs = new Set(decision.comparisons.flatMap((comparison) =>
    comparison.evidenceRefs));
  return entry.prompt.requiredQueries.every((requiredQuery) => {
    if (!comparisonRefs.has(requiredQuery.queryId)) return false;
    const wrapper = receipts.find((item) => item.queryId === requiredQuery.queryId);
    const receipt = wrapper?.receipt;
    if (!object(receipt) || receipt.queryKind !== requiredQuery.queryKind
      || receipt.authority?.stateHash !== entry.prompt.stateHash
      || receipt.authority?.legalSpaceHash !== entry.prompt.legalSpaceHash
      || !receipt.queryReceiptHash) return false;
    const unsigned = clone(receipt);
    delete unsigned.queryReceiptHash;
    if (hashStarcraftTmgContract(unsigned) !== receipt.queryReceiptHash) return false;
    return requiredQuery.minimumStatus === "exact"
      ? receipt.status === "exact"
      : ["exact", "advisory_estimate"].includes(receipt.status);
  });
}

export function createStarcraftTmgSpatialPlayerPlanningCaseSuiteV1(options = {}) {
  const binding = sourceBinding(options.sourceBinding);
  const suiteVersion = required(options.suiteVersion
    || STARCRAFT_TMG_SPATIAL_PLAYER_PLANNING_CASE_SUITE_VERSION,
  "suiteVersion");
  const blueprints = options.blueprints === undefined
    ? BLUEPRINTS : options.blueprints;
  if (!Array.isArray(blueprints)) {
    throw new TypeError("spatial planning blueprints must be an array");
  }
  const entries = blueprints.map((blueprint) =>
    compileCase(blueprint, binding, suiteVersion));
  const byId = new Map(entries.map((entry) => [entry.prompt.caseId, entry]));
  const familyCounts = Object.fromEntries([...new Set(entries.map((entry) =>
    entry.prompt.familyId))].map((familyId) => [familyId, {
    development: entries.filter((entry) => entry.prompt.familyId === familyId
      && entry.oracle.split === "development").length,
    heldout: entries.filter((entry) => entry.prompt.familyId === familyId
      && entry.oracle.split === "heldout").length,
  }]));
  if (entries.length !== 12 || Object.values(familyCounts).some((count) =>
    count.development !== 2 || count.heldout !== 2)
    || new Set(entries.map((entry) => entry.oracle.independenceKey)).size
      !== entries.length) {
    throw new TypeError("spatial case partition is incomplete or leaked");
  }

  function project(input = {}) {
    const entry = byId.get(required(input.caseId, "caseId"));
    if (!entry) throw new TypeError("spatial planning case is unavailable");
    return entry.prompt;
  }

  function evaluate(input = {}) {
    const entry = byId.get(required(input.caseId, "caseId"));
    if (!entry) throw new TypeError("spatial planning case is unavailable");
    const candidateIds = validatePlayerDecision(entry, input.decision);
    const queryCoveragePassed = queryCoverage(entry, input.decision);
    const preferredCandidatePassed = entry.oracle.preferredCandidateIds
      .includes(input.decision.candidateId);
    return seal({
      schemaVersion:
        `${suiteVersion}.grade`,
      caseId: entry.prompt.caseId,
      familyId: entry.prompt.familyId,
      split: entry.oracle.split,
      promptHash: entry.prompt.promptHash,
      oracleHash: entry.oracle.oracleHash,
      decisionHash: hashStarcraftTmgContract(input.decision),
      candidateCount: candidateIds.length,
      queryCoveragePassed,
      preferredCandidatePassed,
      playerDecisionStructurePassed: true,
      passed: queryCoveragePassed && preferredCandidatePassed,
      rationaleSemanticsReviewed: false,
      strategyEffectivenessProven: false,
      fullMatchEvidence: false,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "gradeHash");
  }

  function manifest() {
    return seal({
      schemaVersion:
        `${suiteVersion}.manifest`,
      sourceBinding: clone(binding),
      caseCount: entries.length,
      familyCounts,
      cases: entries.map((entry) => ({
        caseId: entry.prompt.caseId,
        familyId: entry.prompt.familyId,
        split: entry.oracle.split,
        promptHash: entry.prompt.promptHash,
        oracleHash: entry.oracle.oracleHash,
      })),
      heldoutOracleExcludedFromProject: true,
      realProviderRuns: 0,
      fullMatchEvidence: false,
      trainingTruth: false,
    }, "manifestHash");
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion:
        `${suiteVersion}.metadata`,
      interface: ["project", "evaluate", "manifest"],
      families: Object.keys(familyCounts),
      developmentCases: 6,
      heldoutCases: 6,
      rulesQueriesRequired: true,
      mutationAuthority: false,
      trainingTruth: false,
    }),
    project,
    evaluate,
    manifest,
  });
}
