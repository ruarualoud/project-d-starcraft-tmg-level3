const PUBLIC_ROOT = "/assets/client/battlefield/unit-comms/public-fallback";
const INTERNAL_PORTRAIT_ROOT =
  "/assets/client/battlefield/unit-comms/development-internal";
const INTERNAL_VOICE_ROOT =
  "/assets/client/battlefield/voice/development-internal";

const BATTLEFIELD_MAP_MEDIA = Object.freeze([
  ["sc1_lost_temple_v1", "Lost Temple", "brood_war", "Standard", 54, "lost-temple-display-v2.png"],
  ["sc1_fighting_spirit_1_4_v1", "Fighting Spirit", "brood_war", "Standard", 54, "fighting-spirit-display-v2.png"],
  ["sc1_circuit_breakers_v1", "Circuit Breakers", "brood_war", "Standard", 54, "circuit-breakers-display-v2.png"],
  ["sc1_python_1_3_v1", "Python", "brood_war", "Standard", 54, "python-display-v2.png"],
  ["sc1_blue_storm_1_2_v1", "Blue Storm", "brood_war", "Skirmish", 36, "blue-storm-display-v3.png"],
  ["sc1_tau_cross_1_1_v1", "Tau Cross", "brood_war", "Standard", 54, "tau-cross-display-v2.png"],
  ["sc1_destination_1_1_v1", "Destination", "brood_war", "Skirmish", 36, "destination-display-v2.png"],
  ["sc1_heartbreak_ridge_2_2_v1", "Heartbreak Ridge", "brood_war", "Skirmish", 36, "heartbreak-ridge-display-v2.png"],
  ["sc1_andromeda_1_2_v1", "Andromeda", "brood_war", "Standard", 54, "andromeda-display-v2.png"],
  ["sc1_match_point_1_4_v1", "Match Point", "brood_war", "Skirmish", 36, "match-point-display-v2.png"],
  ["sc2_metalopolis_v1", "Metalopolis", "starcraft_2", "Grand Offensive", 72, "metalopolis-display-v1.png"],
  ["sc2_shakuras_plateau_2_0_v1", "Shakuras Plateau", "starcraft_2", "Grand Offensive", 72, "shakuras-plateau-display-v1.png"],
  ["sc2_xelnaga_caverns_v1", "Xel'Naga Caverns", "starcraft_2", "Skirmish", 36, "xelnaga-caverns-display-v1.png"],
  ["sc2_daybreak_v1", "Daybreak", "starcraft_2", "Standard", 54, "daybreak-display-v1.png"],
  ["sc2_cloud_kingdom_v1", "Cloud Kingdom", "starcraft_2", "Standard", 54, "cloud-kingdom-display-v1.png"],
  ["sc2_antiga_shipyard_v1", "Antiga Shipyard", "starcraft_2", "Standard", 54, "antiga-shipyard-display-v1.png"],
  ["sc2_ohana_v1", "Ohana", "starcraft_2", "Skirmish", 36, "ohana-display-v1.png"],
  ["sc2_whirlwind_v1", "Whirlwind", "starcraft_2", "Grand Offensive", 72, "whirlwind-display-v1.png"],
  ["sc2_frost_le_v1", "Frost", "starcraft_2", "Grand Offensive", 72, "frost-display-v1.png"],
  ["sc2_abyssal_reef_le_v1", "Abyssal Reef", "starcraft_2", "Grand Offensive", 72, "abyssal-reef-display-v1.png"],
].map(([seedId, displayName, gameEra, engagementScale, widthInches, fileName]) =>
  Object.freeze({
    seedId,
    visualPresetId: `${seedId}:generated-original-art-v2`,
    displayName,
    era: gameEra,
    engagementScale,
    battlefield: Object.freeze({ widthInches, heightInches: 36 }),
    formalTaskRoomEligible: engagementScale !== "Grand Offensive",
    assetKey: seedId,
    path: `/assets/client/battlefield/maps/${gameEra === "brood_war"
      ? "brood-war" : "starcraft-2"}/${fileName}`,
  })));

const UNIT_KEYS = Object.freeze([
  "marine", "marauder", "medic", "goliath",
  "zergling", "roach", "hydralisk", "queen",
]);
const INTERNAL_PREFIXES = Object.freeze({
  marine: "TerranMarine",
  medic: "TerranMedic",
  goliath: "TerranGoliath",
  zergling: "ZergZergling",
  hydralisk: "ZergHydralisk",
  queen: "ZergQueen",
});

function normalizeUnitKey(value) {
  const candidate = String(value || "").trim().toLowerCase();
  if (UNIT_KEYS.includes(candidate)) return candidate;
  if (candidate.includes("marine")) return "marine";
  if (candidate.includes("zergling")) return "zergling";
  if (candidate.includes("roach")) return "roach";
  return null;
}

function voicePaths(unitKey) {
  const prefix = INTERNAL_PREFIXES[unitKey];
  if (!prefix) return null;
  const file = (cue) => `${INTERNAL_VOICE_ROOT}/${unitKey}/${prefix}${cue}SC1.ogg`;
  return Object.freeze({
    selected: Object.freeze([file("What00"), file("What01")]),
    confirm: Object.freeze([file("Yes00"), file("Yes01")]),
    damaged: Object.freeze([file("Pissed00"), file("Pissed01")]),
    destroyed: Object.freeze([file("Death00")]),
  });
}

export const STARCRAFT_TMG_BATTLEFIELD_MEDIA_POLICY_V1 = Object.freeze({
  schemaVersion: "starcraft_tmg_battlefield_media_policy_v1",
  publicDistributionDefault: true,
  developmentInternalMediaRequiresExplicitChannel: true,
  bundledClassicBgm: false,
  bgmInput: "user_selected_local_audio",
  officialMusicInformationUrl:
    "https://news.blizzard.com/en-us/article/20722027/the-sounds-of-koprulu",
  mediaAffectsAuthority: false,
  mediaAffectsTraining: false,
  userAuthorizedPublicProjectUseRecordedAt: "2026-09-03",
  independentThirdPartyRightsReviewCompleted: false,
  trainingTruth: false,
});

export function resolveStarcraftTmgBattlefieldUnitMediaV1(unitId, options = {}) {
  const unitKey = normalizeUnitKey(unitId);
  if (!unitKey) return null;
  const developmentInternal = options.releaseChannel === "development_internal";
  const userAuthorizedPublic = options.releaseChannel === "public_user_authorized";
  const originalMedia = developmentInternal || userAuthorizedPublic;
  const internalPrefix = INTERNAL_PREFIXES[unitKey];
  return Object.freeze({
    schemaVersion: "starcraft_tmg_battlefield_unit_media_v1",
    unitKey,
    neutralPortraitPath: originalMedia && internalPrefix
      ? `${INTERNAL_PORTRAIT_ROOT}/${unitKey}-animated.webp`
      : `${PUBLIC_ROOT}/${unitKey}-neutral.webp`,
    activePortraitPath: originalMedia && internalPrefix
      ? `${INTERNAL_PORTRAIT_ROOT}/${unitKey}-animated.webp`
      : `${PUBLIC_ROOT}/${unitKey}-active.webp`,
    portraitAnimated: Boolean(originalMedia && internalPrefix),
    voice: originalMedia ? voicePaths(unitKey) : null,
    releaseChannel: developmentInternal
      ? "development_internal" : userAuthorizedPublic ? "public_user_authorized" : "public",
    rightsGatePassedForPublicDistribution: !developmentInternal,
    authorizationBasis: userAuthorizedPublic
      ? "user_authorized_project_publication_2026-09-03"
      : developmentInternal ? "development_internal_only" : "generated_original_public_fallback",
    independentThirdPartyRightsReviewCompleted: false,
    fallbackGeneratedOriginal: !(originalMedia && internalPrefix),
    trainingTruth: false,
  });
}

export function starcraftTmgBattlefieldMapMediaV1() {
  const media = BATTLEFIELD_MAP_MEDIA[0];
  return Object.freeze({
    schemaVersion: "starcraft_tmg_battlefield_map_media_v1",
    assetKey: media.assetKey,
    path: media.path,
    generatedOriginal: true,
    displayOnly: true,
    rulesGeometryAuthority: false,
    trainingTruth: false,
  });
}

export function listStarcraftTmgBattlefieldMapMediaV2() {
  return Object.freeze(BATTLEFIELD_MAP_MEDIA.map((entry) => Object.freeze({
    schemaVersion: "starcraft_tmg_battlefield_map_media_v2",
    ...entry,
    generatedOriginal: true,
    displayOnly: true,
    rulesGeometryAuthority: false,
    bundledOriginalGameScreenshot: false,
    trainingTruth: false,
  })));
}

export function resolveStarcraftTmgBattlefieldMapMediaV2(visualPresetId) {
  const normalized = String(visualPresetId || "").trim();
  const legacySeedId = normalized === "lost_temple_inspired_v1"
    ? "sc1_lost_temple_v1"
    : normalized === "fighting_spirit_inspired_v1"
      ? "sc1_fighting_spirit_1_4_v1" : null;
  return listStarcraftTmgBattlefieldMapMediaV2().find((entry) => (
    entry.visualPresetId === normalized || entry.seedId === normalized
      || entry.seedId === legacySeedId
  )) || null;
}
