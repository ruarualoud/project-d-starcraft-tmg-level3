import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCompetitiveMapSeedCatalogueV1,
  verifyOfficialCompetitiveMapSeedCatalogueV1,
} from "./official-competitive-map-seed-catalogue-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_TOPOLOGY_CATALOGUE_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_topology_catalogue_v1";

const RULES_MODES_BY_KIND = Object.freeze({
  blocking: Object.freeze(["blocking", "passable_difficult", "visual_only"]),
  high_ground: Object.freeze([
    "standable_high_ground", "cover", "passable_difficult", "visual_only",
  ]),
  sight: Object.freeze(["grass_sight", "cover", "visual_only"]),
  cover: Object.freeze(["cover", "passable_difficult", "visual_only"]),
  difficult: Object.freeze(["passable_difficult", "cover", "visual_only"]),
});

const CLEARANCE_CLASSES = new Set([
  "small", "standard", "single_heavy", "heavy_turn", "formation_fire_lane",
]);
const ROUTE_CLASSES = new Set(["direct", "flank", "back_door", "control"]);
const PORTAL_STATES = new Set(["open", "optional_open", "optional_blocked"]);

function topology(seedId, input) {
  return Object.freeze({ seedId, ...input });
}

// Coordinates are normalized source-composition coordinates in [0, 1000]. They are
// research/transcription data, never runtime board inches or Rules geometry.
const SPECS = Object.freeze([
  topology("sc1_lost_temple_v1", {
    symmetry: "adapted_mirror_y", playerAxis: "south_north",
    zones: [["p1", "deployment", 500, 90], ["p2", "deployment", 500, 910],
      ["centre", "contest", 500, 500], ["west", "flank", 185, 500],
      ["east", "flank", 815, 500], ["south_nat", "staging", 500, 260],
      ["north_nat", "staging", 500, 740]],
    lanes: [["temple_axis", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["west_arc", "p1", "p2", "flank", "heavy_turn", [[185, 360], [185, 640]]],
      ["east_arc", "p1", "p2", "flank", "heavy_turn", [[815, 360], [815, 640]]]],
    groups: [["central_temple", "high_ground", "standable_high_ground", "central temple plateau", [[500, 500, 180, 120, 0]]],
      ["natural_cliffs", "high_ground", "cover", "cliffs overlooking the adapted naturals", [[345, 275, 145, 75, -18], [655, 725, 145, 75, -18]]],
      ["island_pockets", "blocking", "visual_only", "outer island pockets", [[90, 500, 95, 180, 0], [910, 500, 95, 180, 0]]],
      ["temple_approach_sight", "sight", "grass_sight", "temple approach foliage", [[330, 500, 90, 70, 0], [670, 500, 90, 70, 0]]]],
    portals: [["west_mouth", "west_arc", "gap", "open", null],
      ["east_mouth", "east_arc", "gap", "open", null],
      ["temple_ramp_s", "temple_axis", "ramp", "open", "central_temple"],
      ["temple_ramp_n", "temple_axis", "ramp", "open", "central_temple"]],
    artCompositionHint: "jungle temple ring, four historic outer bases, cliffs and side islands",
  }),
  topology("sc1_fighting_spirit_1_4_v1", {
    symmetry: "adapted_rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 130, 130], ["p2", "deployment", 870, 870],
      ["centre", "contest", 500, 500], ["northwest", "flank", 240, 760],
      ["southeast", "flank", 760, 240], ["p1_third", "staging", 280, 260],
      ["p2_third", "staging", 720, 740]],
    lanes: [["diagonal_main", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["northwest_arc", "p1", "p2", "flank", "heavy_turn", [[210, 520], [360, 760]]],
      ["southeast_arc", "p1", "p2", "flank", "heavy_turn", [[640, 240], [790, 480]]]],
    groups: [["third_ramp_cliffs", "high_ground", "standable_high_ground", "paired defendable third-gas ridges", [[300, 300, 135, 80, 45], [700, 700, 135, 80, 45]]],
      ["central_risk", "cover", "cover", "risky middle expansion analogue", [[500, 500, 150, 110, 45]]],
      ["corner_foliage", "sight", "grass_sight", "four quadrant jungle sight breaks", [[235, 520, 90, 70, 0], [480, 765, 90, 70, 0], [520, 235, 90, 70, 0], [765, 480, 90, 70, 0]]],
      ["natural_exposure", "cover", "passable_difficult", "light cover beside exposed naturals", [[205, 205, 85, 55, 45], [795, 795, 85, 55, 45]]]],
    portals: [["p1_third_mouth", "diagonal_main", "ramp", "open", "third_ramp_cliffs"],
      ["p2_third_mouth", "diagonal_main", "ramp", "open", "third_ramp_cliffs"]],
    artCompositionHint: "lush four-corner macro map with a rivered central fighting field",
  }),
  topology("sc1_circuit_breakers_v1", {
    symmetry: "mirror_x", playerAxis: "west_east",
    zones: [["p1", "deployment", 90, 500], ["p2", "deployment", 910, 500],
      ["centre", "contest", 500, 500], ["north_bridge", "control", 500, 285],
      ["south_bridge", "control", 500, 715], ["p1_third", "staging", 275, 500],
      ["p2_third", "staging", 725, 500]],
    lanes: [["north_bridges", "p1", "p2", "flank", "formation_fire_lane", [[280, 285], [500, 285], [720, 285]]],
      ["south_bridges", "p1", "p2", "flank", "formation_fire_lane", [[280, 715], [500, 715], [720, 715]]],
      ["open_centre", "p1", "p2", "direct", "heavy_turn", [[500, 500]]]],
    groups: [["third_high_ground", "high_ground", "standable_high_ground", "large high ground before each third", [[285, 500, 150, 105, 90], [715, 500, 150, 105, 90]]],
      ["bridge_shoulders", "cover", "cover", "paired bridge shoulder cover", [[410, 285, 80, 60, 0], [590, 285, 80, 60, 0], [410, 715, 80, 60, 0], [590, 715, 80, 60, 0]]],
      ["central_buildable", "sight", "grass_sight", "partially buildable centre analogue", [[500, 440, 80, 70, 0], [500, 560, 80, 70, 0]]]],
    portals: [["north_bridge_w", "north_bridges", "bridge", "open", "bridge_shoulders"],
      ["north_bridge_e", "north_bridges", "bridge", "open", "bridge_shoulders"],
      ["south_bridge_w", "south_bridges", "bridge", "open", "bridge_shoulders"],
      ["south_bridge_e", "south_bridges", "bridge", "open", "bridge_shoulders"]],
    artCompositionHint: "space-platform circuit, paired north/south bridges and an open centre",
  }),
  topology("sc1_python_1_3_v1", {
    symmetry: "adapted_rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 130, 150], ["p2", "deployment", 870, 850],
      ["centre", "contest", 500, 500], ["west_third", "flank", 230, 600],
      ["east_third", "flank", 770, 400], ["north_island", "pocket", 825, 850],
      ["south_island", "pocket", 175, 150]],
    lanes: [["open_diagonal", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["west_wide_third", "p1", "p2", "flank", "heavy_turn", [[220, 520], [430, 720]]],
      ["east_wide_third", "p1", "p2", "flank", "heavy_turn", [[570, 280], [780, 480]]]],
    groups: [["corner_island_blocks", "blocking", "blocking", "mineral-blocked corner island analogues", [[125, 820, 100, 120, 0], [875, 180, 100, 120, 0]]],
      ["wide_third_ridges", "high_ground", "cover", "ridges behind wide third approaches", [[275, 640, 145, 80, 25], [725, 360, 145, 80, 25]]],
      ["python_centre", "sight", "grass_sight", "open-centre serpent motif", [[430, 470, 95, 65, -25], [570, 530, 95, 65, -25]]],
      ["natural_cliffs", "cover", "cover", "natural cliff pressure pockets", [[260, 235, 90, 60, 45], [740, 765, 90, 60, 45]]]],
    portals: [["west_third_mouth", "west_wide_third", "gap", "open", "wide_third_ridges"],
      ["east_third_mouth", "east_wide_third", "gap", "open", "wide_third_ridges"],
      ["north_island_gate", "east_wide_third", "back_door", "optional_blocked", "corner_island_blocks"],
      ["south_island_gate", "west_wide_third", "back_door", "optional_blocked", "corner_island_blocks"]],
    artCompositionHint: "jungle macro field with a broad centre, serpent motif and corner islands",
  }),
  topology("sc1_blue_storm_1_2_v1", {
    symmetry: "rotational_2", playerAxis: "west_east",
    zones: [["p1", "deployment", 90, 500], ["p2", "deployment", 910, 500],
      ["centre", "contest", 500, 500], ["short_route", "control", 500, 375],
      ["main_route", "control", 500, 690], ["north_basilica", "high_ground", 500, 215]],
    lanes: [["small_shortcut", "p1", "p2", "direct", "small", [[300, 375], [500, 375], [700, 375]]],
      ["southern_main", "p1", "p2", "flank", "formation_fire_lane", [[275, 690], [500, 690], [725, 690]]],
      ["basilica_control", "p1", "p2", "control", "single_heavy", [[360, 235], [500, 215], [640, 235]]]],
    groups: [["central_ravine", "blocking", "blocking", "ravine dividing the battlefield", [[500, 520, 110, 310, 0]]],
      ["high_basilica", "high_ground", "standable_high_ground", "central-north positional basilica", [[500, 215, 175, 105, 0]]],
      ["small_route_gates", "blocking", "passable_difficult", "small-unit shortcut mouths", [[330, 375, 70, 75, 0], [670, 375, 70, 75, 0]]],
      ["main_route_cover", "cover", "cover", "main-route defensive shoulders", [[365, 690, 90, 65, 0], [635, 690, 90, 65, 0]]]],
    portals: [["shortcut_w", "small_shortcut", "gap", "optional_open", "small_route_gates"],
      ["shortcut_e", "small_shortcut", "gap", "optional_open", "small_route_gates"],
      ["main_bridge_w", "southern_main", "bridge", "open", null],
      ["main_bridge_e", "southern_main", "bridge", "open", null]],
    artCompositionHint: "twilight ravine with a tiny northern shortcut and broad southern route",
  }),
  topology("sc1_tau_cross_1_1_v1", {
    symmetry: "adapted_radial_to_mirror", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 140, 150], ["p2", "deployment", 860, 850],
      ["centre", "contest", 500, 500], ["north_arc", "flank", 420, 785],
      ["south_arc", "flank", 580, 215], ["p1_mouth", "staging", 255, 270],
      ["p2_mouth", "staging", 745, 730]],
    lanes: [["open_cross", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["north_macro_arc", "p1", "p2", "flank", "heavy_turn", [[300, 655], [500, 790], [700, 655]]],
      ["south_macro_arc", "p1", "p2", "flank", "heavy_turn", [[300, 345], [500, 210], [700, 345]]]],
    groups: [["natural_mouths", "blocking", "passable_difficult", "small blockable natural mouths", [[255, 270, 80, 55, 45], [745, 730, 80, 55, 45]]],
      ["cliffed_naturals", "high_ground", "cover", "cliffed natural sides", [[210, 330, 120, 70, 20], [790, 670, 120, 70, 20]]],
      ["open_centre_breaks", "sight", "grass_sight", "sparse sight breaks in the open centre", [[410, 455, 80, 65, 0], [590, 545, 80, 65, 0]]],
      ["outer_arc_cover", "cover", "cover", "macro-arc cover", [[500, 790, 105, 70, 0], [500, 210, 105, 70, 0]]]],
    portals: [["p1_natural_mouth", "open_cross", "gap", "optional_open", "natural_mouths"],
      ["p2_natural_mouth", "open_cross", "gap", "optional_open", "natural_mouths"]],
    artCompositionHint: "icy radial macro map projected to two opposing seats and an open cross",
  }),
  topology("sc1_destination_1_1_v1", {
    symmetry: "rotational_2", playerAxis: "south_north",
    zones: [["p1", "deployment", 500, 85], ["p2", "deployment", 500, 915],
      ["centre", "contest", 500, 500], ["west_bridges", "control", 285, 500],
      ["east_bridges", "control", 715, 500], ["p1_backdoor", "back_door", 760, 220],
      ["p2_backdoor", "back_door", 240, 780]],
    lanes: [["central_three_bridges", "p1", "p2", "direct", "formation_fire_lane", [[500, 330], [500, 500], [500, 670]]],
      ["west_double_bridge", "p1", "p2", "flank", "single_heavy", [[285, 300], [285, 500], [285, 700]]],
      ["east_double_bridge", "p1", "p2", "flank", "single_heavy", [[715, 300], [715, 500], [715, 700]]],
      ["mineral_backdoors", "p1", "p2", "back_door", "heavy_turn", [[760, 220], [820, 500], [240, 780]]]],
    groups: [["natural_bridge_banks", "cover", "cover", "banks around the paired natural bridges", [[285, 330, 95, 65, 0], [715, 330, 95, 65, 0], [285, 670, 95, 65, 0], [715, 670, 95, 65, 0]]],
      ["mineral_backdoor_blocks", "blocking", "blocking", "mineable back-door analogues", [[760, 220, 90, 60, -30], [240, 780, 90, 60, -30]]],
      ["natural_overlooks", "high_ground", "standable_high_ground", "cliffs behind naturals", [[360, 205, 145, 80, 0], [640, 795, 145, 80, 0]]],
      ["centre_bridge_sight", "sight", "grass_sight", "sight breaks between central bridges", [[430, 500, 75, 65, 0], [570, 500, 75, 65, 0]]]],
    portals: [["west_bridge_s", "west_double_bridge", "bridge", "open", "natural_bridge_banks"],
      ["west_bridge_n", "west_double_bridge", "bridge", "open", "natural_bridge_banks"],
      ["east_bridge_s", "east_double_bridge", "bridge", "open", "natural_bridge_banks"],
      ["east_bridge_n", "east_double_bridge", "bridge", "open", "natural_bridge_banks"],
      ["backdoor_s", "mineral_backdoors", "back_door", "optional_blocked", "mineral_backdoor_blocks"],
      ["backdoor_n", "mineral_backdoors", "back_door", "optional_blocked", "mineral_backdoor_blocks"]],
    artCompositionHint: "badlands bridge network, twin naturals and mineral back doors",
  }),
  topology("sc1_heartbreak_ridge_2_2_v1", {
    symmetry: "rotational_2", playerAxis: "west_east",
    zones: [["p1", "deployment", 80, 500], ["p2", "deployment", 920, 500],
      ["centre", "contest", 500, 500], ["north_route", "flank", 500, 260],
      ["south_route", "flank", 500, 740], ["p1_rear", "back_door", 190, 720],
      ["p2_rear", "back_door", 810, 280]],
    lanes: [["ridge_chicane", "p1", "p2", "direct", "heavy_turn", [[300, 420], [500, 580], [700, 420]]],
      ["north_counter", "p1", "p2", "flank", "formation_fire_lane", [[300, 260], [500, 260], [700, 260]]],
      ["south_counter", "p1", "p2", "flank", "formation_fire_lane", [[300, 740], [500, 740], [700, 740]]],
      ["rear_route", "p1", "p2", "back_door", "single_heavy", [[190, 720], [500, 825], [810, 280]]]],
    groups: [["parallel_ridges", "high_ground", "standable_high_ground", "three defensive fallback ridges", [[350, 420, 135, 70, -20], [500, 580, 135, 70, 20], [650, 420, 135, 70, -20]]],
      ["rear_blocks", "blocking", "blocking", "neutral/mineral rear-route blocks", [[190, 720, 90, 60, 30], [810, 280, 90, 60, 30]]],
      ["natural_overlooks", "high_ground", "cover", "high ground behind naturals", [[220, 380, 115, 70, 0], [780, 620, 115, 70, 0]]],
      ["ridge_brush", "sight", "grass_sight", "brush between fallback lines", [[430, 430, 75, 60, 0], [570, 570, 75, 60, 0]]]],
    portals: [["rear_gate_p1", "rear_route", "back_door", "optional_blocked", "rear_blocks"],
      ["rear_gate_p2", "rear_route", "back_door", "optional_blocked", "rear_blocks"]],
    artCompositionHint: "jungle battlefield crossed by parallel ridges and optional rear paths",
  }),
  topology("sc1_andromeda_1_2_v1", {
    symmetry: "adapted_rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 120, 150], ["p2", "deployment", 880, 850],
      ["centre", "contest", 500, 500], ["inner_p1", "pocket", 300, 300],
      ["inner_p2", "pocket", 700, 700], ["north_island", "pocket", 760, 170],
      ["south_island", "pocket", 240, 830]],
    lanes: [["open_diagonal", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["north_outer", "p1", "p2", "flank", "heavy_turn", [[260, 650], [500, 820], [740, 650]]],
      ["south_outer", "p1", "p2", "flank", "heavy_turn", [[260, 350], [500, 180], [740, 350]]],
      ["protected_inner", "p1", "p2", "control", "single_heavy", [[300, 300], [500, 500], [700, 700]]]],
    groups: [["protected_inner_cover", "cover", "cover", "protected inner expansion analogues", [[300, 300, 120, 80, 45], [700, 700, 120, 80, 45]]],
      ["island_expansions", "blocking", "visual_only", "opposed island expansion motifs", [[760, 170, 115, 115, 0], [240, 830, 115, 115, 0]]],
      ["neutral_drop_cliffs", "high_ground", "standable_high_ground", "neutral-building drop cliffs", [[350, 650, 115, 75, -30], [650, 350, 115, 75, -30]]],
      ["open_centre_sight", "sight", "grass_sight", "sparse open-centre sight breaks", [[440, 500, 70, 60, 0], [560, 500, 70, 60, 0]]]],
    portals: [["inner_p1_mouth", "protected_inner", "gap", "open", "protected_inner_cover"],
      ["inner_p2_mouth", "protected_inner", "gap", "open", "protected_inner_cover"]],
    artCompositionHint: "space-platform macro field with inner pockets, open centre and islands",
  }),
  topology("sc1_match_point_1_4_v1", {
    symmetry: "rotational_2", playerAxis: "south_north",
    zones: [["p1", "deployment", 500, 80], ["p2", "deployment", 500, 920],
      ["centre", "contest", 500, 500], ["west_plateau", "high_ground", 260, 500],
      ["east_plateau", "high_ground", 740, 500], ["west_seep", "flank", 120, 500],
      ["east_seep", "flank", 880, 500]],
    lanes: [["short_middle", "p1", "p2", "direct", "single_heavy", [[500, 500]]],
      ["west_chicane", "p1", "p2", "flank", "heavy_turn", [[260, 300], [180, 500], [260, 700]]],
      ["east_chicane", "p1", "p2", "flank", "heavy_turn", [[740, 300], [820, 500], [740, 700]]],
      ["plateau_push", "p1", "p2", "control", "formation_fire_lane", [[380, 310], [260, 500], [620, 690]]]],
    groups: [["raised_plateaus", "high_ground", "standable_high_ground", "paired map-control plateaus", [[260, 500, 160, 120, 0], [740, 500, 160, 120, 0]]],
      ["seep_route_cover", "cover", "passable_difficult", "small seep and counterattack routes", [[150, 390, 85, 65, -20], [150, 610, 85, 65, 20], [850, 390, 85, 65, 20], [850, 610, 85, 65, -20]]],
      ["natural_cliff_edges", "high_ground", "cover", "harassable natural cliff edges", [[380, 220, 115, 65, 0], [620, 780, 115, 65, 0]]],
      ["middle_sight", "sight", "grass_sight", "sight breaks on the short middle", [[500, 430, 70, 55, 0], [500, 570, 70, 55, 0]]]],
    portals: [["west_seep_s", "west_chicane", "gap", "optional_open", "seep_route_cover"],
      ["west_seep_n", "west_chicane", "gap", "optional_open", "seep_route_cover"],
      ["east_seep_s", "east_chicane", "gap", "optional_open", "seep_route_cover"],
      ["east_seep_n", "east_chicane", "gap", "optional_open", "seep_route_cover"]],
    artCompositionHint: "space-platform chicanes around two dominant raised plateaus",
  }),
  topology("sc2_metalopolis_v1", {
    symmetry: "adapted_rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 120, 140], ["p2", "deployment", 880, 860],
      ["centre", "contest", 500, 500], ["north_watch", "control", 420, 650],
      ["south_watch", "control", 580, 350], ["west_gold", "pocket", 275, 500],
      ["east_gold", "pocket", 725, 500]],
    lanes: [["city_cross", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["north_city_arc", "p1", "p2", "flank", "heavy_turn", [[250, 620], [500, 760], [750, 620]]],
      ["south_city_arc", "p1", "p2", "flank", "heavy_turn", [[250, 380], [500, 240], [750, 380]]]],
    groups: [["watch_platforms", "high_ground", "standable_high_ground", "paired watch platforms", [[420, 650, 115, 85, 0], [580, 350, 115, 85, 0]]],
      ["gold_zone_cover", "cover", "cover", "contested centre-side resource platforms", [[275, 500, 120, 85, 90], [725, 500, 120, 85, 90]]],
      ["base_smoke", "sight", "grass_sight", "smoke sight blockers", [[230, 215, 80, 65, 45], [770, 785, 80, 65, 45]]],
      ["crossroad_rubble", "blocking", "passable_difficult", "ruined-city crossroad blockers", [[430, 500, 70, 70, 0], [570, 500, 70, 70, 0]]]],
    portals: [["north_crossroad", "north_city_arc", "gap", "open", "crossroad_rubble"],
      ["south_crossroad", "south_city_arc", "gap", "open", "crossroad_rubble"]],
    artCompositionHint: "ruined megacity crossroads with watch platforms and smoke pockets",
  }),
  topology("sc2_shakuras_plateau_2_0_v1", {
    symmetry: "mirror_x", playerAxis: "west_east",
    zones: [["p1", "deployment", 80, 500], ["p2", "deployment", 920, 500],
      ["centre", "contest", 500, 500], ["north_corridor", "control", 500, 350],
      ["south_corridor", "control", 500, 650], ["p1_rear", "back_door", 210, 760],
      ["p2_rear", "back_door", 790, 240]],
    lanes: [["shared_corridor", "p1", "p2", "direct", "formation_fire_lane", [[300, 500], [500, 500], [700, 500]]],
      ["north_ledge", "p1", "p2", "control", "single_heavy", [[300, 350], [500, 350], [700, 350]]],
      ["south_ledge", "p1", "p2", "control", "single_heavy", [[300, 650], [500, 650], [700, 650]]],
      ["rear_rock_route", "p1", "p2", "back_door", "heavy_turn", [[210, 760], [500, 840], [790, 240]]]],
    groups: [["corridor_ledges", "high_ground", "standable_high_ground", "area-control ledges beside the main corridor", [[390, 350, 145, 75, 0], [610, 650, 145, 75, 0]]],
      ["rear_rocks", "blocking", "blocking", "rock-blocked rear routes", [[210, 760, 100, 70, 30], [790, 240, 100, 70, 30]]],
      ["watch_terrain", "sight", "grass_sight", "watch-tower sight zones", [[500, 410, 85, 65, 0], [500, 590, 85, 65, 0]]],
      ["inside_expansion_cover", "cover", "cover", "inside expansion vulnerabilities", [[275, 430, 90, 65, 0], [725, 570, 90, 65, 0]]]],
    portals: [["rear_gate_p1", "rear_rock_route", "back_door", "optional_blocked", "rear_rocks"],
      ["rear_gate_p2", "rear_rock_route", "back_door", "optional_blocked", "rear_rocks"],
      ["ledge_ramp_n", "north_ledge", "ramp", "open", "corridor_ledges"],
      ["ledge_ramp_s", "south_ledge", "ramp", "open", "corridor_ledges"]],
    artCompositionHint: "violet plateau split by one long shared corridor and rock back doors",
  }),
  topology("sc2_xelnaga_caverns_v1", {
    symmetry: "rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 130, 130], ["p2", "deployment", 870, 870],
      ["centre", "contest", 500, 500], ["tower_w", "control", 370, 500],
      ["tower_e", "control", 630, 500], ["p1_backdoor", "back_door", 210, 330],
      ["p2_backdoor", "back_door", 790, 670]],
    lanes: [["main_diagonal", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["west_backdoor", "p1", "p2", "back_door", "heavy_turn", [[210, 330], [300, 650], [520, 800]]],
      ["east_backdoor", "p1", "p2", "back_door", "heavy_turn", [[480, 200], [700, 350], [790, 670]]],
      ["tower_split", "p1", "p2", "control", "single_heavy", [[370, 500], [630, 500]]]],
    groups: [["natural_backdoor_sight", "sight", "grass_sight", "sight-blocked natural back doors", [[210, 330, 90, 70, 35], [790, 670, 90, 70, 35]]],
      ["third_rocks", "blocking", "blocking", "rocks leading to alternate thirds", [[305, 690, 95, 70, -30], [695, 310, 95, 70, -30]]],
      ["tower_platforms", "high_ground", "cover", "paired Xel'Naga sight platforms", [[370, 500, 100, 80, 0], [630, 500, 100, 80, 0]]],
      ["third_overlooks", "high_ground", "standable_high_ground", "high ground behind third lines", [[240, 620, 125, 75, 0], [760, 380, 125, 75, 0]]]],
    portals: [["backdoor_p1", "west_backdoor", "back_door", "optional_open", "natural_backdoor_sight"],
      ["backdoor_p2", "east_backdoor", "back_door", "optional_open", "natural_backdoor_sight"],
      ["rock_gate_p1", "west_backdoor", "gap", "optional_blocked", "third_rocks"],
      ["rock_gate_p2", "east_backdoor", "gap", "optional_blocked", "third_rocks"]],
    artCompositionHint: "alien cavern diagonal with exposed back doors, twin towers and rock thirds",
  }),
  topology("sc2_daybreak_v1", {
    symmetry: "rotational_2", playerAxis: "south_north",
    zones: [["p1", "deployment", 500, 80], ["p2", "deployment", 500, 920],
      ["centre", "contest", 500, 500], ["tower_w", "control", 340, 500],
      ["tower_e", "control", 660, 500], ["west_runby", "flank", 150, 500],
      ["east_runby", "flank", 850, 500]],
    lanes: [["rock_axis", "p1", "p2", "direct", "heavy_turn", [[500, 300], [500, 500], [500, 700]]],
      ["west_runby", "p1", "p2", "flank", "formation_fire_lane", [[180, 300], [150, 500], [180, 700]]],
      ["east_runby", "p1", "p2", "flank", "formation_fire_lane", [[820, 300], [850, 500], [820, 700]]]],
    groups: [["central_rocks", "blocking", "blocking", "rocks dividing the central route", [[500, 430, 105, 70, 0], [500, 570, 105, 70, 0]]],
      ["natural_ramp_rocks", "blocking", "passable_difficult", "rocks narrowing natural ramps", [[390, 235, 85, 60, 15], [610, 765, 85, 60, 15]]],
      ["tower_sight", "sight", "grass_sight", "two central tower control zones", [[340, 500, 85, 70, 0], [660, 500, 85, 70, 0]]],
      ["third_cover", "cover", "cover", "defensible third-base shoulders", [[300, 300, 105, 70, 0], [700, 700, 105, 70, 0]]]],
    portals: [["central_rock_s", "rock_axis", "gap", "optional_blocked", "central_rocks"],
      ["central_rock_n", "rock_axis", "gap", "optional_blocked", "central_rocks"],
      ["natural_ramp_s", "rock_axis", "ramp", "optional_open", "natural_ramp_rocks"],
      ["natural_ramp_n", "rock_axis", "ramp", "optional_open", "natural_ramp_rocks"]],
    artCompositionHint: "industrial dawn map with twin sight towers and staged destructible rocks",
  }),
  topology("sc2_cloud_kingdom_v1", {
    symmetry: "rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 130, 140], ["p2", "deployment", 870, 860],
      ["centre", "contest", 500, 500], ["direct_choke", "control", 500, 500],
      ["north_long", "flank", 350, 760], ["south_long", "flank", 650, 240]],
    lanes: [["tiny_direct", "p1", "p2", "direct", "single_heavy", [[500, 500]]],
      ["north_position", "p1", "p2", "flank", "formation_fire_lane", [[250, 620], [420, 790], [720, 650]]],
      ["south_position", "p1", "p2", "flank", "formation_fire_lane", [[280, 350], [580, 210], [750, 380]]]],
    groups: [["direct_ramp_rocks", "blocking", "passable_difficult", "rocks narrowing the direct ramps", [[390, 430, 90, 65, 35], [610, 570, 90, 65, 35]]],
      ["long_route_highs", "high_ground", "standable_high_ground", "superior-position long-route high ground", [[350, 760, 140, 85, -20], [650, 240, 140, 85, -20]]],
      ["wide_zone_cover", "cover", "cover", "cover beside wide engagement zones", [[280, 520, 100, 70, 0], [720, 480, 100, 70, 0]]],
      ["cloud_sight", "sight", "grass_sight", "central sight breaks", [[450, 500, 70, 60, 0], [550, 500, 70, 60, 0]]]],
    portals: [["direct_ramp_p1", "tiny_direct", "ramp", "optional_open", "direct_ramp_rocks"],
      ["direct_ramp_p2", "tiny_direct", "ramp", "optional_open", "direct_ramp_rocks"]],
    artCompositionHint: "cloud-city high ground with a short narrow axis and longer flanking arcs",
  }),
  topology("sc2_antiga_shipyard_v1", {
    symmetry: "adapted_rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 130, 130], ["p2", "deployment", 870, 870],
      ["centre", "contest", 500, 500], ["safe_p1", "staging", 270, 330],
      ["safe_p2", "staging", 730, 670], ["risky_w", "pocket", 260, 650],
      ["risky_e", "pocket", 740, 350]],
    lanes: [["shipyard_axis", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["west_reward", "p1", "p2", "flank", "heavy_turn", [[260, 330], [260, 650], [600, 800]]],
      ["east_reward", "p1", "p2", "flank", "heavy_turn", [[400, 200], [740, 350], [740, 670]]]],
    groups: [["safe_high_thirds", "high_ground", "standable_high_ground", "safe high-ground third choices", [[270, 330, 135, 90, 45], [730, 670, 135, 90, 45]]],
      ["risky_reward_cover", "cover", "cover", "exposed reward-zone cover", [[260, 650, 110, 75, 0], [740, 350, 110, 75, 0]]],
      ["third_attack_sight", "sight", "grass_sight", "sight breaks on third attack routes", [[360, 580, 80, 65, -20], [640, 420, 80, 65, -20]]],
      ["shipyard_rubble", "blocking", "passable_difficult", "industrial central rubble", [[450, 500, 75, 70, 0], [550, 500, 75, 70, 0]]]],
    portals: [["safe_ramp_p1", "shipyard_axis", "ramp", "open", "safe_high_thirds"],
      ["safe_ramp_p2", "shipyard_axis", "ramp", "open", "safe_high_thirds"]],
    artCompositionHint: "industrial shipyard with safe high thirds and exposed gold-side routes",
  }),
  topology("sc2_ohana_v1", {
    symmetry: "rotational_2", playerAxis: "south_north",
    zones: [["p1", "deployment", 500, 70], ["p2", "deployment", 500, 930],
      ["centre", "contest", 500, 500], ["tower_w", "control", 385, 500],
      ["tower_e", "control", 615, 500], ["west_edge", "flank", 175, 500],
      ["east_edge", "flank", 825, 500]],
    lanes: [["compact_axis", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["west_edge", "p1", "p2", "flank", "single_heavy", [[200, 300], [175, 500], [200, 700]]],
      ["east_edge", "p1", "p2", "flank", "single_heavy", [[800, 300], [825, 500], [800, 700]]]],
    groups: [["central_tower_pair", "high_ground", "cover", "paired central vision positions", [[385, 500, 100, 80, 0], [615, 500, 100, 80, 0]]],
      ["compact_choke_shoulders", "blocking", "passable_difficult", "compact direct-engagement shoulders", [[430, 360, 85, 70, 0], [570, 640, 85, 70, 0]]],
      ["edge_sight", "sight", "grass_sight", "limited counterattack edge sight breaks", [[175, 430, 75, 60, 0], [825, 570, 75, 60, 0]]],
      ["third_cover", "cover", "cover", "hard-to-hold third cover", [[300, 280, 100, 65, 0], [700, 720, 100, 65, 0]]]],
    portals: [["compact_mouth_s", "compact_axis", "gap", "open", "compact_choke_shoulders"],
      ["compact_mouth_n", "compact_axis", "gap", "open", "compact_choke_shoulders"]],
    artCompositionHint: "compact tropical battlefield focused on direct central engagements",
  }),
  topology("sc2_whirlwind_v1", {
    symmetry: "adapted_rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 100, 120], ["p2", "deployment", 900, 880],
      ["centre", "contest", 500, 500], ["north_macro", "flank", 350, 800],
      ["south_macro", "flank", 650, 200], ["centre_watch", "control", 500, 500]],
    lanes: [["whirlwind_axis", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["north_macro_arc", "p1", "p2", "flank", "formation_fire_lane", [[220, 600], [450, 820], [760, 680]]],
      ["south_macro_arc", "p1", "p2", "flank", "formation_fire_lane", [[240, 320], [550, 180], [780, 400]]]],
    groups: [["central_watch", "high_ground", "cover", "single central vision node", [[500, 500, 125, 95, 0]]],
      ["second_rocks", "blocking", "blocking", "optional rocks at second expansions", [[280, 300, 95, 70, 35], [720, 700, 95, 70, 35]]],
      ["entrance_depots", "blocking", "passable_difficult", "entrance depot analogues", [[200, 205, 80, 60, 45], [800, 795, 80, 60, 45]]],
      ["macro_sight", "sight", "grass_sight", "widely spaced macro sight breaks", [[300, 650, 85, 65, 0], [700, 350, 85, 65, 0], [500, 760, 85, 65, 0], [500, 240, 85, 65, 0]]]],
    portals: [["second_gate_p1", "south_macro_arc", "gap", "optional_blocked", "second_rocks"],
      ["second_gate_p2", "north_macro_arc", "gap", "optional_blocked", "second_rocks"],
      ["entry_p1", "whirlwind_axis", "gap", "optional_open", "entrance_depots"],
      ["entry_p2", "whirlwind_axis", "gap", "optional_open", "entrance_depots"]],
    artCompositionHint: "large green macro map orbiting one central watch position",
  }),
  topology("sc2_frost_le_v1", {
    symmetry: "adapted_rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 110, 130], ["p2", "deployment", 890, 870],
      ["centre", "contest", 500, 500], ["tower_n", "control", 420, 620],
      ["tower_s", "control", 580, 380], ["third_w", "staging", 260, 560],
      ["third_e", "staging", 740, 440]],
    lanes: [["frost_axis", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["west_third_choice", "p1", "p2", "flank", "heavy_turn", [[260, 300], [260, 560], [620, 800]]],
      ["east_third_choice", "p1", "p2", "flank", "heavy_turn", [[380, 200], [740, 440], [740, 700]]]],
    groups: [["central_towers", "high_ground", "cover", "paired central watch positions", [[420, 620, 105, 80, 0], [580, 380, 105, 80, 0]]],
      ["third_choice_highs", "high_ground", "standable_high_ground", "high ground influencing alternate thirds", [[260, 560, 135, 85, 0], [740, 440, 135, 85, 0]]],
      ["harassment_deadspace", "blocking", "visual_only", "air dead-space motifs", [[135, 650, 90, 145, 0], [865, 350, 90, 145, 0]]],
      ["frost_sight", "sight", "grass_sight", "snowfield sight breaks", [[350, 450, 80, 65, 0], [650, 550, 80, 65, 0]]]],
    portals: [["third_ramp_w", "west_third_choice", "ramp", "open", "third_choice_highs"],
      ["third_ramp_e", "east_third_choice", "ramp", "open", "third_choice_highs"]],
    artCompositionHint: "four-start ice field with two viable third routes and paired watch points",
  }),
  topology("sc2_abyssal_reef_le_v1", {
    symmetry: "rotational_2", playerAxis: "southwest_northeast",
    zones: [["p1", "deployment", 130, 150], ["p2", "deployment", 870, 850],
      ["centre", "contest", 500, 500], ["north_shelf", "high_ground", 400, 720],
      ["south_shelf", "high_ground", 600, 280], ["west_flank", "flank", 220, 500],
      ["east_flank", "flank", 780, 500]],
    lanes: [["reef_centre", "p1", "p2", "direct", "formation_fire_lane", [[500, 500]]],
      ["west_reef_flank", "p1", "p2", "flank", "heavy_turn", [[220, 330], [220, 500], [500, 790]]],
      ["east_reef_flank", "p1", "p2", "flank", "heavy_turn", [[500, 210], [780, 500], [780, 670]]]],
    groups: [["flank_rocks", "blocking", "blocking", "rocks securing territory but exposing flanks", [[300, 600, 95, 70, -25], [700, 400, 95, 70, -25]]],
      ["reef_shelves", "high_ground", "standable_high_ground", "opposed reef-shelf high ground", [[400, 720, 140, 90, 0], [600, 280, 140, 90, 0]]],
      ["water_gaps", "blocking", "visual_only", "water-channel gaps", [[120, 500, 90, 190, 0], [880, 500, 90, 190, 0]]],
      ["coral_sight", "sight", "grass_sight", "luminous coral sight breaks", [[410, 500, 80, 70, 0], [590, 500, 80, 70, 0]]],
      ["centre_reef_cover", "cover", "cover", "broad-centre reef outcrops", [[500, 420, 90, 65, 0], [500, 580, 90, 65, 0]]]],
    portals: [["flank_rock_w", "west_reef_flank", "gap", "optional_blocked", "flank_rocks"],
      ["flank_rock_e", "east_reef_flank", "gap", "optional_blocked", "flank_rocks"],
      ["shelf_ramp_n", "west_reef_flank", "ramp", "open", "reef_shelves"],
      ["shelf_ramp_s", "east_reef_flank", "ramp", "open", "reef_shelves"]],
    artCompositionHint: "turquoise reef channels, dark coral shelves and rock-timed flanks",
  }),
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function zoneRow(row) {
  const [zoneId, role, x, y] = row;
  return { zoneId, role, centre: { x, y } };
}

function laneRow(row, zoneById) {
  const [laneId, fromZoneId, toZoneId, routeClass, clearanceClass, via = []] = row;
  const from = zoneById.get(fromZoneId);
  const to = zoneById.get(toZoneId);
  if (!from || !to) fail("COMPETITIVE_MAP_TOPOLOGY_LANE_ZONE_UNKNOWN", laneId);
  return { laneId, fromZoneId, toZoneId, routeClass, clearanceClass,
    centreline: [structuredClone(from.centre), ...via.map(([x, y]) => ({ x, y })),
      structuredClone(to.centre)] };
}

function groupRows(seedId, rows) {
  return rows.map(([sourceGroupId, sourceKind, defaultRulesMode, sourceFeature,
    instances]) => {
    const allowedRulesModes = RULES_MODES_BY_KIND[sourceKind];
    if (!allowedRulesModes || !allowedRulesModes.includes(defaultRulesMode)) {
      fail("COMPETITIVE_MAP_TOPOLOGY_GROUP_MODE_INVALID", `${seedId}:${sourceGroupId}`);
    }
    return { sourceGroupId, sourceKind, sourceFeature, defaultRulesMode,
      allowedRulesModes: [...allowedRulesModes], instances: instances.map(
        ([centreX, centreY, width, height, rotationDegrees], index) => ({
          elementId: `${seedId}:${sourceGroupId}:${index + 1}`,
          sourceGroupId, sourceKind, sourceFeature, retainByDefault: true,
          artRetainByDefault: true, userMayToggleArt: true,
          defaultRulesMode, allowedRulesModes: [...allowedRulesModes],
          rulesEnabledByDefault: defaultRulesMode !== "visual_only",
          userMayDisableRules: true,
          normalizedFootprint: { centreX, centreY, width, height, rotationDegrees },
          userMayOmit: true, userMayChangeRulesMode: true,
          rulesAuthorityBeforeCompilation: false, trainingTruth: false,
        })) };
  });
}

function topologyRecord(seed, spec) {
  const zones = spec.zones.map(zoneRow);
  const zoneById = new Map(zones.map((entry) => [entry.zoneId, entry]));
  const lanes = spec.lanes.map((entry) => laneRow(entry, zoneById));
  const groups = groupRows(seed.seedId, spec.groups);
  const elements = groups.flatMap((entry) => entry.instances);
  const portals = spec.portals.map(([portalId, laneId, portalKind, initialState,
    linkedElementGroupId]) => ({ portalId, laneId, portalKind, initialState,
    linkedElementGroupId }));
  const body = {
    schema: "starcraft_tmg_official_competitive_map_topology_v1",
    version: "1.1.0", seedId: seed.seedId, seedHash: seed.seedHash,
    topologyPresetId: seed.topologyPresetId, gameEra: seed.gameEra,
    displayName: seed.displayName,
    sourceMapDimensions: structuredClone(seed.sourceMapDimensions),
    sourceMapAreaTiles: seed.sourceMapAreaTiles,
    recommendedEngagementScale: seed.recommendedEngagementScale,
    scaleAssignmentBasis: seed.scaleAssignmentBasis,
    sizeEvidenceUrl: seed.sizeEvidenceUrl,
    symmetry: spec.symmetry,
    playerAxis: spec.playerAxis, normalizedCoordinateSpace: { width: 1000, height: 1000 },
    zones, lanes, portals, elements,
    sourceElementGroups: groups.map((entry) => ({
      sourceGroupId: entry.sourceGroupId, sourceKind: entry.sourceKind,
      sourceFeature: entry.sourceFeature,
      elementIds: entry.instances.map((value) => value.elementId),
    })),
    artCompositionHint: spec.artCompositionHint,
    runtimePixelInferenceAllowed: false,
    everyElementIndependentlyConfigurable: true,
    topologyRequiresTabletopCompilation: true,
    rulesAuthority: false, trainingTruth: false,
  };
  return { ...body, topologyHash: hashStarcraftTmgContract(body) };
}

function inBounds(value) { return Number.isFinite(value) && value >= 0 && value <= 1000; }

export function createOfficialCompetitiveMapTopologyCatalogueV1(input = {}) {
  const seedCatalogue = input.seedCatalogue
    || createOfficialCompetitiveMapSeedCatalogueV1();
  verifyOfficialCompetitiveMapSeedCatalogueV1(seedCatalogue);
  const specBySeedId = new Map(SPECS.map((entry) => [entry.seedId, entry]));
  const topologies = seedCatalogue.seeds.map((seed) => {
    const spec = specBySeedId.get(seed.seedId);
    if (!spec) fail("COMPETITIVE_MAP_TOPOLOGY_SPEC_MISSING", seed.seedId);
    return topologyRecord(seed, spec);
  });
  if (specBySeedId.size !== topologies.length) {
    fail("COMPETITIVE_MAP_TOPOLOGY_SPEC_DENOMINATOR_MISMATCH");
  }
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_TOPOLOGY_CATALOGUE_V1_SCHEMA,
    version: "1.1.0", seedCatalogueHash: seedCatalogue.catalogueHash,
    topologies,
    counts: { total: topologies.length,
      elements: topologies.reduce((sum, entry) => sum + entry.elements.length, 0),
      lanes: topologies.reduce((sum, entry) => sum + entry.lanes.length, 0),
      portals: topologies.reduce((sum, entry) => sum + entry.portals.length, 0) },
    normalizedCoordinatesAreRulesAuthority: false,
    runtimePixelInferenceAllowed: false,
    rulesTruth: "reviewed_source_topology_requires_tabletop_compilation",
    trainingTruth: false,
  };
  const catalogue = deepFreeze({ ...body,
    catalogueHash: hashStarcraftTmgContract(body) });
  verifyOfficialCompetitiveMapTopologyCatalogueV1(catalogue, seedCatalogue);
  return catalogue;
}

export function verifyOfficialCompetitiveMapTopologyCatalogueV1(catalogue,
  seedCatalogue = createOfficialCompetitiveMapSeedCatalogueV1()) {
  verifyOfficialCompetitiveMapSeedCatalogueV1(seedCatalogue);
  if (!catalogue
    || catalogue.schema !== OFFICIAL_COMPETITIVE_MAP_TOPOLOGY_CATALOGUE_V1_SCHEMA
    || catalogue.seedCatalogueHash !== seedCatalogue.catalogueHash
    || catalogue.topologies?.length !== 20
    || catalogue.normalizedCoordinatesAreRulesAuthority !== false
    || catalogue.runtimePixelInferenceAllowed !== false
    || catalogue.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_TOPOLOGY_CATALOGUE_INVALID");
  }
  const seedIds = new Set();
  for (const entry of catalogue.topologies) {
    const seed = seedCatalogue.seeds.find((value) => value.seedId === entry.seedId);
    const { topologyHash, ...body } = entry;
    if (!seed || seed.seedHash !== entry.seedHash || seedIds.has(entry.seedId)
      || entry.zones.length < 5 || entry.lanes.length < 3 || entry.elements.length < 5
      || entry.recommendedEngagementScale !== seed.recommendedEngagementScale
      || entry.sourceMapAreaTiles !== seed.sourceMapAreaTiles
      || entry.everyElementIndependentlyConfigurable !== true
      || entry.topologyRequiresTabletopCompilation !== true
      || entry.rulesAuthority !== false || entry.trainingTruth !== false
      || topologyHash !== hashStarcraftTmgContract(body)) {
      fail("COMPETITIVE_MAP_TOPOLOGY_INVALID", entry?.seedId);
    }
    const zoneIds = new Set(entry.zones.map((value) => value.zoneId));
    const laneIds = new Set();
    for (const lane of entry.lanes) {
      if (laneIds.has(lane.laneId) || !zoneIds.has(lane.fromZoneId)
        || !zoneIds.has(lane.toZoneId) || !ROUTE_CLASSES.has(lane.routeClass)
        || !CLEARANCE_CLASSES.has(lane.clearanceClass)
        || lane.centreline.some((point) => !inBounds(point.x) || !inBounds(point.y))) {
        fail("COMPETITIVE_MAP_TOPOLOGY_LANE_INVALID", `${entry.seedId}:${lane.laneId}`);
      }
      laneIds.add(lane.laneId);
    }
    const groupIds = new Set(entry.sourceElementGroups.map((value) => value.sourceGroupId));
    const elementIds = new Set();
    for (const element of entry.elements) {
      const footprint = element.normalizedFootprint;
      if (elementIds.has(element.elementId) || !groupIds.has(element.sourceGroupId)
        || !element.allowedRulesModes.includes(element.defaultRulesMode)
        || !element.allowedRulesModes.includes("visual_only")
        || element.userMayOmit !== true || element.userMayChangeRulesMode !== true
        || element.artRetainByDefault !== true || element.userMayToggleArt !== true
        || element.userMayDisableRules !== true
        || element.rulesEnabledByDefault !== (element.defaultRulesMode !== "visual_only")
        || !inBounds(footprint.centreX) || !inBounds(footprint.centreY)
        || !(footprint.width > 0) || !(footprint.height > 0)
        || footprint.centreX - footprint.width / 2 < 0
        || footprint.centreX + footprint.width / 2 > 1000
        || footprint.centreY - footprint.height / 2 < 0
        || footprint.centreY + footprint.height / 2 > 1000) {
        fail("COMPETITIVE_MAP_TOPOLOGY_ELEMENT_INVALID",
          `${entry.seedId}:${element.elementId}`);
      }
      elementIds.add(element.elementId);
    }
    const portalIds = new Set();
    for (const portal of entry.portals) {
      if (portalIds.has(portal.portalId) || !laneIds.has(portal.laneId)
        || !PORTAL_STATES.has(portal.initialState)
        || (portal.linkedElementGroupId && !groupIds.has(portal.linkedElementGroupId))) {
        fail("COMPETITIVE_MAP_TOPOLOGY_PORTAL_INVALID",
          `${entry.seedId}:${portal.portalId}`);
      }
      portalIds.add(portal.portalId);
    }
    seedIds.add(entry.seedId);
  }
  if (catalogue.counts.total !== 20
    || catalogue.counts.elements !== catalogue.topologies.reduce(
      (sum, entry) => sum + entry.elements.length, 0)
    || catalogue.counts.lanes !== catalogue.topologies.reduce(
      (sum, entry) => sum + entry.lanes.length, 0)
    || catalogue.counts.portals !== catalogue.topologies.reduce(
      (sum, entry) => sum + entry.portals.length, 0)) {
    fail("COMPETITIVE_MAP_TOPOLOGY_COUNTS_INVALID");
  }
  const { catalogueHash, ...body } = catalogue;
  if (catalogueHash !== hashStarcraftTmgContract(body)) {
    fail("COMPETITIVE_MAP_TOPOLOGY_CATALOGUE_HASH_INVALID");
  }
  return true;
}

export function getOfficialCompetitiveMapTopologyV1(catalogue, seedId) {
  const result = catalogue?.topologies?.find((entry) => entry.seedId === seedId);
  if (!result) fail("COMPETITIVE_MAP_TOPOLOGY_UNKNOWN", String(seedId || ""));
  return result;
}
