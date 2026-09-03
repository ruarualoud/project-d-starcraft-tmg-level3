const PUBLIC_ROOT = "/assets/client/battlefield/unit-comms/public-fallback";
const INTERNAL_PORTRAIT_ROOT =
  "/assets/client/battlefield/unit-comms/development-internal";
const INTERNAL_VOICE_ROOT =
  "/assets/client/battlefield/voice/development-internal";

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
  trainingTruth: false,
});

export function resolveStarcraftTmgBattlefieldUnitMediaV1(unitId, options = {}) {
  const unitKey = normalizeUnitKey(unitId);
  if (!unitKey) return null;
  const developmentInternal = options.releaseChannel === "development_internal";
  const internalPrefix = INTERNAL_PREFIXES[unitKey];
  return Object.freeze({
    schemaVersion: "starcraft_tmg_battlefield_unit_media_v1",
    unitKey,
    neutralPortraitPath: developmentInternal && internalPrefix
      ? `${INTERNAL_PORTRAIT_ROOT}/${unitKey}-animated.webp`
      : `${PUBLIC_ROOT}/${unitKey}-neutral.webp`,
    activePortraitPath: developmentInternal && internalPrefix
      ? `${INTERNAL_PORTRAIT_ROOT}/${unitKey}-animated.webp`
      : `${PUBLIC_ROOT}/${unitKey}-active.webp`,
    portraitAnimated: Boolean(developmentInternal && internalPrefix),
    voice: developmentInternal ? voicePaths(unitKey) : null,
    releaseChannel: developmentInternal ? "development_internal" : "public",
    rightsGatePassedForPublicDistribution: !developmentInternal,
    fallbackGeneratedOriginal: !(developmentInternal && internalPrefix),
    trainingTruth: false,
  });
}

export function starcraftTmgBattlefieldMapMediaV1() {
  return Object.freeze({
    schemaVersion: "starcraft_tmg_battlefield_map_media_v1",
    assetKey: "alien_temple_local_v1",
    path: "/assets/client/battlefield/alien-temple-map-v1.webp",
    generatedOriginal: true,
    displayOnly: true,
    rulesGeometryAuthority: false,
    trainingTruth: false,
  });
}

