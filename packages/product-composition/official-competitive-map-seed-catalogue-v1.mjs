import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_SEED_CATALOGUE_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_seed_catalogue_v1";

const ROWS = Object.freeze([
  {
    seedId: "sc1_lost_temple_v1", gameEra: "brood_war",
    displayName: "Lost Temple", sourceVariant: "classic_competitive_family",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Lost_Temple",
    topologySignature: ["four_outer_starts", "cliffed_naturals",
      "central_circulation", "island_pockets", "positional_asymmetry"],
    tabletopAdaptationGoal:
      "mirrored opposing seats with central high-ground pressure and two flank choices",
  },
  {
    seedId: "sc1_fighting_spirit_1_4_v1", gameEra: "brood_war",
    displayName: "Fighting Spirit", sourceVariant: "1.4",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Fighting_Spirit",
    topologySignature: ["four_corner_macro", "exposed_naturals",
      "narrow_third_routes", "risky_central_zone"],
    tabletopAdaptationGoal:
      "quadrant terrain around a contestable centre with current-base clearance",
  },
  {
    seedId: "sc1_circuit_breakers_v1", gameEra: "brood_war",
    displayName: "Circuit Breakers", sourceVariant: "competitive",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Circuit_Breakers",
    topologySignature: ["open_macro_centre", "paired_natural_bridges",
      "high_ground_thirds", "harassment_angles"],
    tabletopAdaptationGoal:
      "paired movement and fire lanes with reachable standable high ground",
  },
  {
    seedId: "sc1_python_1_3_v1", gameEra: "brood_war",
    displayName: "Python", sourceVariant: "1.3",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Python",
    topologySignature: ["wide_open_centre", "wide_third_chokes",
      "cliff_pressure", "blocked_corner_islands"],
    tabletopAdaptationGoal:
      "open-centre flanking with independently configurable island blockers",
  },
  {
    seedId: "sc1_blue_storm_1_2_v1", gameEra: "brood_war",
    displayName: "Blue Storm", sourceVariant: "1.2",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Blue_Storm",
    topologySignature: ["two_player_ravine", "short_small_unit_route",
      "long_main_route", "central_high_basilica", "natural_side_gap"],
    tabletopAdaptationGoal:
      "dual-route choice with an explicit configurable passage class",
  },
  {
    seedId: "sc1_tau_cross_1_1_v1", gameEra: "brood_war",
    displayName: "Tau Cross", sourceVariant: "1.1",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Tau_Cross",
    topologySignature: ["three_start_radial", "open_buildable_centre",
      "small_natural_choke", "long_rush_paths"],
    tabletopAdaptationGoal:
      "fair opposing-seat projection preserving open centre versus defensive mouth",
  },
  {
    seedId: "sc1_destination_1_1_v1", gameEra: "brood_war",
    displayName: "Destination", sourceVariant: "1.1",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Destination",
    topologySignature: ["double_natural_bridges", "mineral_back_door",
      "three_central_bridges", "natural_cliff", "distant_third"],
    tabletopAdaptationGoal:
      "toggleable back door and bridges plus a certified heavy-base route",
  },
  {
    seedId: "sc1_heartbreak_ridge_2_2_v1", gameEra: "brood_war",
    displayName: "Heartbreak Ridge", sourceVariant: "2.2",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Heartbreak_Ridge",
    topologySignature: ["parallel_central_ridges", "blocked_rear_routes",
      "fallback_lines", "high_ground_behind_natural"],
    tabletopAdaptationGoal:
      "staggered ridge fighting with optional opened back routes",
  },
  {
    seedId: "sc1_andromeda_1_2_v1", gameEra: "brood_war",
    displayName: "Andromeda", sourceVariant: "1.2",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Andromeda",
    topologySignature: ["open_macro_centre", "protected_inner_expansion",
      "island_expansions", "neutral_drop_cliffs"],
    tabletopAdaptationGoal:
      "protected side pockets and open centre with optional island authority",
  },
  {
    seedId: "sc1_match_point_1_4_v1", gameEra: "brood_war",
    displayName: "Match Point", sourceVariant: "1.4",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft/Match_Point",
    topologySignature: ["paired_raised_plateaus", "many_flank_routes",
      "exposed_naturals", "cliff_harassment", "short_direct_long_push"],
    tabletopAdaptationGoal:
      "multiple legible lanes with distinct passage classes and paired plateaus",
  },
  {
    seedId: "sc2_metalopolis_v1", gameEra: "starcraft_2",
    displayName: "Metalopolis", sourceVariant: "tournament_no_close_spawns",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Metalopolis",
    topologySignature: ["four_starts", "central_crossroads",
      "watch_platforms", "contested_centre", "smoke_sight_blockers"],
    tabletopAdaptationGoal:
      "crossed central lanes with sight-control pockets and no default close spawn",
  },
  {
    seedId: "sc2_shakuras_plateau_2_0_v1", gameEra: "starcraft_2",
    displayName: "Shakuras Plateau", sourceVariant: "2.0",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Shakuras_Plateau",
    topologySignature: ["long_shared_corridor", "rock_blocked_rear_routes",
      "watch_towers", "corridor_ledges"],
    tabletopAdaptationGoal:
      "corridor control with optional side routes and reachable ledges",
  },
  {
    seedId: "sc2_xelnaga_caverns_v1", gameEra: "starcraft_2",
    displayName: "Xel'Naga Caverns", sourceVariant: "1.5",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Xel%27Naga_Caverns",
    topologySignature: ["exposed_natural_back_door", "rock_blocked_third",
      "paired_central_towers", "split_chokes", "harassment_high_ground"],
    tabletopAdaptationGoal:
      "three-route pressure with configurable blockers and heavy-turn clearance",
  },
  {
    seedId: "sc2_daybreak_v1", gameEra: "starcraft_2",
    displayName: "Daybreak", sourceVariant: "ladder_edition",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Daybreak",
    topologySignature: ["two_player_diagonal", "twin_centre_towers",
      "central_rocks", "ramp_rocks", "run_by_fourth"],
    tabletopAdaptationGoal:
      "rock-defined positional stages with independently selectable rock groups",
  },
  {
    seedId: "sc2_cloud_kingdom_v1", gameEra: "starcraft_2",
    displayName: "Cloud Kingdom", sourceVariant: "ladder_edition",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Cloud_Kingdom",
    topologySignature: ["tiny_direct_chokes", "long_superior_routes",
      "wide_engagement_zones", "rock_narrowed_ramps"],
    tabletopAdaptationGoal:
      "direct-versus-long route trade-off without excluding current bases",
  },
  {
    seedId: "sc2_antiga_shipyard_v1", gameEra: "starcraft_2",
    displayName: "Antiga Shipyard", sourceVariant: "tournament_cross_spawns",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Antiga_Shipyard",
    topologySignature: ["safe_high_third", "risky_reward_zone",
      "close_naturals", "multi_route_thirds", "open_centre"],
    tabletopAdaptationGoal:
      "safe-versus-risky side choice with fair mirrored player geometry",
  },
  {
    seedId: "sc2_ohana_v1", gameEra: "starcraft_2",
    displayName: "Ohana", sourceVariant: "ladder_edition",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Ohana",
    topologySignature: ["compact_two_player", "direct_engagements",
      "paired_central_vision", "limited_counterattack_space"],
    tabletopAdaptationGoal:
      "constrained direct layout retaining fire lanes and heavy-base escape",
  },
  {
    seedId: "sc2_whirlwind_v1", gameEra: "starcraft_2",
    displayName: "Whirlwind", sourceVariant: "special_edition",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Whirlwind",
    topologySignature: ["large_four_start_macro", "central_vision_node",
      "entrance_depots", "optional_second_rocks"],
    tabletopAdaptationGoal:
      "broad open macro layout with optional centre sight and entry blockers",
  },
  {
    seedId: "sc2_frost_le_v1", gameEra: "starcraft_2",
    displayName: "Frost", sourceVariant: "ladder_edition",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Frost",
    topologySignature: ["four_equal_rush_starts", "two_viable_thirds",
      "paired_central_towers", "harassment_dead_space"],
    tabletopAdaptationGoal:
      "choose-a-flank identity with paired lateral routes and sight control",
  },
  {
    seedId: "sc2_abyssal_reef_le_v1", gameEra: "starcraft_2",
    displayName: "Abyssal Reef", sourceVariant: "ladder_edition",
    competitiveEvidenceUrl: "https://liquipedia.net/starcraft2/Abyssal_Reef_LE",
    topologySignature: ["two_player_reef", "rock_secured_territory",
      "exposed_flanks", "broad_central_engagement"],
    tabletopAdaptationGoal:
      "rock-controlled flank timing with optional reef-shelf authority",
  },
]);

const SIZE_ASSIGNMENTS = Object.freeze({
  sc1_lost_temple_v1: [128, 128, "Standard", "medium_four_start_macro"],
  sc1_fighting_spirit_1_4_v1: [128, 128, "Standard", "medium_four_start_macro"],
  sc1_circuit_breakers_v1: [128, 128, "Standard", "medium_four_start_macro"],
  sc1_python_1_3_v1: [128, 128, "Standard", "medium_four_start_macro"],
  sc1_blue_storm_1_2_v1: [128, 96, "Skirmish", "compact_two_player_rectangle"],
  sc1_tau_cross_1_1_v1: [128, 128, "Standard", "medium_three_start_macro"],
  sc1_destination_1_1_v1: [128, 96, "Skirmish", "compact_two_player_rectangle"],
  sc1_heartbreak_ridge_2_2_v1: [128, 96, "Skirmish",
    "compact_two_player_rectangle"],
  sc1_andromeda_1_2_v1: [128, 128, "Standard", "medium_four_start_macro"],
  sc1_match_point_1_4_v1: [112, 128, "Skirmish", "compact_two_player_portrait"],
  sc2_metalopolis_v1: [140, 140, "Grand Offensive", "large_four_start_macro"],
  sc2_shakuras_plateau_2_0_v1: [156, 128, "Grand Offensive",
    "large_long_corridor_macro"],
  sc2_xelnaga_caverns_v1: [124, 124, "Skirmish", "compact_two_player_square"],
  sc2_daybreak_v1: [148, 120, "Standard", "medium_two_player_rectangle"],
  sc2_cloud_kingdom_v1: [126, 132, "Standard", "medium_two_player_square"],
  sc2_antiga_shipyard_v1: [132, 136, "Standard", "medium_four_start_macro"],
  sc2_ohana_v1: [128, 135, "Skirmish", "compact_direct_two_player"],
  sc2_whirlwind_v1: [160, 160, "Grand Offensive", "large_four_start_macro"],
  sc2_frost_le_v1: [158, 162, "Grand Offensive", "large_four_start_macro"],
  sc2_abyssal_reef_le_v1: [152, 136, "Grand Offensive",
    "large_two_player_rectangle"],
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function seed(row, ordinal) {
  const size = SIZE_ASSIGNMENTS[row.seedId];
  if (!size) fail("COMPETITIVE_MAP_SEED_SIZE_ASSIGNMENT_MISSING", row.seedId);
  const body = {
    schema: "starcraft_tmg_official_competitive_map_seed_v1",
    version: "1.1.0",
    ordinal,
    ...structuredClone(row),
    sourceMapDimensions: { widthTiles: size[0], heightTiles: size[1] },
    sourceMapAreaTiles: size[0] * size[1],
    recommendedEngagementScale: size[2],
    scaleAssignmentBasis: size[3],
    sizeEvidenceUrl: row.competitiveEvidenceUrl,
    topologyPresetId: `${row.seedId}_topology`,
    visualPresetId: `${row.seedId}_visual`,
    researchCapturedAt: "2026-09-16",
    sourceAuthority: "public_competitive_history_research",
    sourceImageBundled: false,
    redistributionPermissionClaimed: false,
    runtimePixelInferenceAllowed: false,
    rulesAuthority: false,
    trainingTruth: false,
  };
  return { ...body, seedHash: hashStarcraftTmgContract(body) };
}

export function createOfficialCompetitiveMapSeedCatalogueV1() {
  const seeds = ROWS.map((row, index) => seed(row, index + 1));
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_SEED_CATALOGUE_V1_SCHEMA,
    version: "1.1.0",
    researchCapturedAt: "2026-09-16",
    counts: {
      total: seeds.length,
      broodWar: seeds.filter((entry) => entry.gameEra === "brood_war").length,
      starcraft2: seeds.filter((entry) => entry.gameEra === "starcraft_2").length,
      byEngagementScale: Object.fromEntries(["Skirmish", "Standard",
        "Grand Offensive"].map((scale) => [scale, seeds.filter((entry) => (
        entry.recommendedEngagementScale === scale)).length])),
    },
    seeds,
    topologyTranscriptionRequiredBeforeVisualPromotion: true,
    genericSharedVisualTemplateAllowed: false,
    runtimePixelInferenceAllowed: false,
    rulesTruth: "research_seed_catalogue_only",
    trainingTruth: false,
  };
  const catalogue = deepFreeze({
    ...body,
    catalogueHash: hashStarcraftTmgContract(body),
  });
  verifyOfficialCompetitiveMapSeedCatalogueV1(catalogue);
  return catalogue;
}

export function verifyOfficialCompetitiveMapSeedCatalogueV1(catalogue) {
  if (!catalogue
    || catalogue.schema !== OFFICIAL_COMPETITIVE_MAP_SEED_CATALOGUE_V1_SCHEMA
    || catalogue.counts?.total !== 20
    || catalogue.counts?.broodWar !== 10
    || catalogue.counts?.starcraft2 !== 10
    || catalogue.counts?.byEngagementScale?.Skirmish < 5
    || catalogue.counts?.byEngagementScale?.Standard < 5
    || catalogue.counts?.byEngagementScale?.["Grand Offensive"] < 5
    || catalogue.topologyTranscriptionRequiredBeforeVisualPromotion !== true
    || catalogue.genericSharedVisualTemplateAllowed !== false
    || catalogue.runtimePixelInferenceAllowed !== false
    || catalogue.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_SEED_CATALOGUE_INVALID");
  }
  const seedIds = new Set();
  for (const entry of catalogue.seeds) {
    const { seedHash, ...body } = entry;
    if (!entry.seedId || seedIds.has(entry.seedId)
      || !["brood_war", "starcraft_2"].includes(entry.gameEra)
      || !Number.isSafeInteger(entry.sourceMapDimensions?.widthTiles)
      || !Number.isSafeInteger(entry.sourceMapDimensions?.heightTiles)
      || entry.sourceMapAreaTiles !== entry.sourceMapDimensions.widthTiles
        * entry.sourceMapDimensions.heightTiles
      || !["Skirmish", "Standard", "Grand Offensive"]
        .includes(entry.recommendedEngagementScale)
      || !URL.canParse(entry.competitiveEvidenceUrl)
      || !Array.isArray(entry.topologySignature)
      || entry.topologySignature.length < 4
      || entry.runtimePixelInferenceAllowed !== false
      || entry.rulesAuthority !== false
      || seedHash !== hashStarcraftTmgContract(body)) {
      fail("COMPETITIVE_MAP_SEED_INVALID", String(entry?.seedId || ""));
    }
    seedIds.add(entry.seedId);
  }
  const { catalogueHash, ...body } = catalogue;
  if (catalogueHash !== hashStarcraftTmgContract(body)) {
    fail("COMPETITIVE_MAP_SEED_CATALOGUE_HASH_INVALID");
  }
  return true;
}

export function getOfficialCompetitiveMapSeedV1(catalogue, seedId) {
  verifyOfficialCompetitiveMapSeedCatalogueV1(catalogue);
  const result = catalogue.seeds.find((entry) => entry.seedId === seedId);
  if (!result) fail("COMPETITIVE_MAP_SEED_UNKNOWN", String(seedId || ""));
  return result;
}
