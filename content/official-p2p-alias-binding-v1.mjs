const SNAPSHOT_HASH = "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61";
const DATASET_HASH = "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63";
const SOURCE_MANIFEST_HASH = "298df219f7de531231d562c62b6efd0b83c740ea4dc69c5087946aeb9e924ed8";

const unitPages = [
  ["army_units:adept", "p2p-protoss-en", 1],
  ["army_units:artanis", "p2p-protoss-en", 2],
  ["army_units:praetor_guard__zealot_", "p2p-protoss-en", 3],
  ["army_units:pylon", "p2p-protoss-en", 4],
  ["army_units:sentry", "p2p-protoss-en", 5],
  ["army_units:stalker", "p2p-protoss-en", 6],
  ["army_units:zealot", "p2p-protoss-en", 7],
  ["army_units:marine", "p2p-terran-en", 1],
  ["army_units:marauder", "p2p-terran-en", 2],
  ["army_units:medic", "p2p-terran-en", 3],
  ["army_units:jim_raynor", "p2p-terran-en", 4],
  ["army_units:point_defense_drone", "p2p-terran-en", 5],
  ["army_units:raynor_s_raider__marine_", "p2p-terran-en", 6],
  ["army_units:goliath", "p2p-terran-en", 7],
  ["army_units:hydralisk", "p2p-zerg-en", 1],
  ["army_units:kerrigan", "p2p-zerg-en", 2],
  ["army_units:omega_worm", "p2p-zerg-en", 3],
  ["army_units:kerrigan_swarm_raptor__zergling_", "p2p-zerg-en", 4],
  ["army_units:queen", "p2p-zerg-en", 5],
  ["army_units:roach", "p2p-zerg-en", 6],
  ["army_units:corpser__roach_", "p2p-zerg-en", 7],
  ["army_units:roachling", "p2p-zerg-en", 8],
  ["army_units:vile__roach_", "p2p-zerg-en", 9],
  ["army_units:zergling", "p2p-zerg-en", 10],
  ["army_units:raptor__zergling_", "p2p-zerg-en", 11],
  ["army_units:swarmling__zergling_", "p2p-zerg-en", 12],
];

const tacticalPages = [
  ["tactical_cards:gate_chronoboosted", "p2p-protoss-en", 8],
  ["tactical_cards:gateway", "p2p-protoss-en", 8],
  ["tactical_cards:khalai", "p2p-protoss-en", 8],
  ["tactical_cards:warp_prism", "p2p-protoss-en", 8],
  ["tactical_cards:daelaam", "p2p-protoss-en", 9],
  ["tactical_cards:overcharged_nexus", "p2p-protoss-en", 9],
  ["tactical_cards:twilight_council", "p2p-protoss-en", 9],
  ["tactical_cards:warp_gate", "p2p-protoss-en", 9],
  ["tactical_cards:forge", "p2p-protoss-en", 10],
  ["tactical_cards:nexus", "p2p-protoss-en", 10],
  ["tactical_cards:observer", "p2p-protoss-en", 10],
  ["tactical_cards:power_field", "p2p-protoss-en", 10],
  ["tactical_cards:academy", "p2p-terran-en", 8],
  ["tactical_cards:barracks", "p2p-terran-en", 8],
  ["tactical_cards:engineering_bay", "p2p-terran-en", 8],
  ["tactical_cards:terran_armed_forces", "p2p-terran-en", 8],
  ["tactical_cards:dropship", "p2p-terran-en", 9],
  ["tactical_cards:orbital_command", "p2p-terran-en", 9],
  ["tactical_cards:raynor_s_raiders", "p2p-terran-en", 9],
  ["tactical_cards:supply_depot", "p2p-terran-en", 9],
  ["tactical_cards:armory", "p2p-terran-en", 10],
  ["tactical_cards:barracks__proxy_", "p2p-terran-en", 10],
  ["tactical_cards:barracks__tech_lab_", "p2p-terran-en", 10],
  ["tactical_cards:factory", "p2p-terran-en", 10],
  ["tactical_cards:evolution_chamber", "p2p-zerg-en", 13],
  ["tactical_cards:hatchery", "p2p-zerg-en", 13],
  ["tactical_cards:overseer", "p2p-zerg-en", 13],
  ["tactical_cards:zerg_swarm", "p2p-zerg-en", 13],
  ["tactical_cards:hydralisk_den", "p2p-zerg-en", 14],
  ["tactical_cards:kerrigan_s_swarm", "p2p-zerg-en", 14],
  ["tactical_cards:malignant_creep", "p2p-zerg-en", 14],
  ["tactical_cards:overlord", "p2p-zerg-en", 14],
  ["tactical_cards:accelerating_creep", "p2p-zerg-en", 15],
  ["tactical_cards:lair", "p2p-zerg-en", 15],
  ["tactical_cards:roach_warren", "p2p-zerg-en", 15],
  ["tactical_cards:spawning_pool__six_pool_", "p2p-zerg-en", 15],
  ["tactical_cards:spawning_pool", "p2p-zerg-en", 16],
];

const missionPages = [
  ["faction_cards:mission_supply_drop", 11],
  ["faction_cards:mission_supply_drop__skirmish_", 11],
  ["faction_cards:mission_hold_position", 11],
  ["faction_cards:mission_hold_position__skirmish_", 11],
  ["faction_cards:mission_frontlines", 12],
  ["faction_cards:mission_frontlines__skirmish_", 12],
  ["faction_cards:mission_gather_the_resources", 12],
  ["faction_cards:mission_gather_the_resources__skirmish_", 12],
  ["faction_cards:mission_divide_and_conquer", 12],
  ["faction_cards:mission_divide_and_conquer__skirmish_", 12],
];

const deploymentPages = [
  ["faction_cards:2NdngLtIeZAprsWr25hM", 13],
  ["faction_cards:Kqz626cBnNVxqdBJePDC", 13],
  ["faction_cards:Nwd5bN4pLjjol85hdyBU", 13],
  ["faction_cards:xxcLAuwGbNzHzggnAGLW", 13],
  ["faction_cards:BM1fW5aRzwYA8aKrXd6L", 14],
  ["faction_cards:BRp1aN4Ebvu3Wuc8afJj", 14],
  ["faction_cards:E2Sv30MQfeLbO6Yqgx0l", 14],
  ["faction_cards:a7Ax3InF4uueg3gZ308P", 14],
  ["faction_cards:cW3aQQikqXLZlFEPLa4j", 14],
  ["faction_cards:yQ2mHJMUvEaupcdRVwjm", 14],
];

const factionScenarioPages = Object.freeze({
  "p2p-protoss-en": Object.freeze({ missionOffset: 0, deploymentOffset: 0 }),
  "p2p-terran-en": Object.freeze({ missionOffset: 0, deploymentOffset: 0 }),
  "p2p-zerg-en": Object.freeze({ missionOffset: 6, deploymentOffset: 6 }),
});

function directAlias([recordKey, sourceId, pdfPage], matchBasis) {
  return { recordKey, locators: [{ sourceId, pdfPage, matchBasis }] };
}

function repeatedScenarioAlias([recordKey, protossPage], matchBasis, kind) {
  return {
    recordKey,
    locators: Object.entries(factionScenarioPages).map(([sourceId, offsets]) => ({
      sourceId,
      pdfPage: protossPage + offsets[kind],
      matchBasis,
    })),
  };
}

export const OFFICIAL_P2P_ALIAS_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_p2p_reviewed_alias_binding_v1",
  sourceSnapshotHash: SNAPSHOT_HASH,
  normalizedDatasetHash: DATASET_HASH,
  sourceManifestHash: SOURCE_MANIFEST_HASH,
  reviewMethod: "official_record_identity_to_p2p_card_or_scenario_page",
  valueParityClaimed: false,
  aliases: Object.freeze([
    ...unitPages.map((entry) => directAlias(entry, "reviewed_unit_card_title")),
    ...tacticalPages.map((entry) => directAlias(entry, "reviewed_card_title")),
    ...missionPages.map((entry) => repeatedScenarioAlias(entry, "reviewed_mission_title_and_ref", "missionOffset")),
    ...deploymentPages.map((entry) => repeatedScenarioAlias(entry, "reviewed_deployment_map_title", "deploymentOffset")),
  ]),
});
