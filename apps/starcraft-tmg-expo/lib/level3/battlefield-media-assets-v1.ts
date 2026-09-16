import { Platform } from "react-native";

import {
  listStarcraftTmgBattlefieldMapMediaV2,
  resolveStarcraftTmgBattlefieldUnitMediaV1,
  type StarcraftTmgBattlefieldMapAssetKeyV2,
  type StarcraftTmgBattlefieldMapVisualPresetIdV2,
  type StarcraftTmgBattlefieldMediaReleaseChannelV1,
  type StarcraftTmgBattlefieldVoicePathsV1,
} from "../../../../packages/client-domain/battlefield-media-catalog-v1.mjs";

type PortraitSource = number | { uri: string };
type MapSource = number | { uri: string };

const PUBLIC_PORTRAITS: Record<string, { neutral: number; active: number }> = {
  marine: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/marine-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/marine-active.webp"),
  },
  marauder: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/marauder-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/marauder-active.webp"),
  },
  medic: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/medic-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/medic-active.webp"),
  },
  goliath: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/goliath-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/goliath-active.webp"),
  },
  zergling: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/zergling-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/zergling-active.webp"),
  },
  roach: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/roach-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/roach-active.webp"),
  },
  hydralisk: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/hydralisk-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/hydralisk-active.webp"),
  },
  queen: {
    neutral: require("../../../../assets/client/battlefield/unit-comms/public-fallback/queen-neutral.webp"),
    active: require("../../../../assets/client/battlefield/unit-comms/public-fallback/queen-active.webp"),
  },
};

export const STARCRAFT_TMG_BATTLEFIELD_MAP_SOURCE =
  require("../../../../assets/client/battlefield/alien-temple-map-v1.webp") as number;

const BATTLEFIELD_MAP_SOURCES: Partial<
  Record<StarcraftTmgBattlefieldMapAssetKeyV2, number>
> = {
  sc1_lost_temple_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/lost-temple-display-v2.png") as number,
  sc1_fighting_spirit_1_4_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/fighting-spirit-display-v2.png") as number,
  sc1_circuit_breakers_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/circuit-breakers-display-v2.png") as number,
  sc1_python_1_3_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/python-display-v2.png") as number,
  sc1_blue_storm_1_2_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/blue-storm-display-v3.png") as number,
  sc1_tau_cross_1_1_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/tau-cross-display-v2.png") as number,
  sc1_destination_1_1_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/destination-display-v2.png") as number,
  sc1_heartbreak_ridge_2_2_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/heartbreak-ridge-display-v2.png") as number,
  sc1_andromeda_1_2_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/andromeda-display-v2.png") as number,
  sc1_match_point_1_4_v1:
    require("../../../../assets/client/battlefield/maps/brood-war/match-point-display-v2.png") as number,
  sc2_metalopolis_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/metalopolis-display-v1.png") as number,
  sc2_shakuras_plateau_2_0_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/shakuras-plateau-display-v1.png") as number,
  sc2_xelnaga_caverns_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/xelnaga-caverns-display-v1.png") as number,
  sc2_daybreak_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/daybreak-display-v1.png") as number,
  sc2_cloud_kingdom_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/cloud-kingdom-display-v1.png") as number,
  sc2_antiga_shipyard_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/antiga-shipyard-display-v1.png") as number,
  sc2_ohana_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/ohana-display-v1.png") as number,
  sc2_whirlwind_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/whirlwind-display-v1.png") as number,
  sc2_frost_le_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/frost-display-v1.png") as number,
  sc2_abyssal_reef_le_v1:
    require("../../../../assets/client/battlefield/maps/starcraft-2/abyssal-reef-display-v1.png") as number,
};

const BATTLEFIELD_MAP_VARIANT_SOURCES: Record<string, number> = {
  "/assets/client/battlefield/maps/brood-war/blue-storm-display-classic-v2.png":
    require("../../../../assets/client/battlefield/maps/brood-war/blue-storm-display-classic-v2.png") as number,
};

export const STARCRAFT_TMG_BATTLEFIELD_MAP_OPTIONS =
  listStarcraftTmgBattlefieldMapMediaV2().map((entry) => ({
    visualPresetId: entry.visualPresetId,
    displayName: entry.displayName,
    assetKey: entry.assetKey,
    path: entry.path,
    gameEra: entry.era,
    engagementScale: entry.engagementScale,
    battlefield: entry.battlefield,
    formalTaskRoomEligible: entry.formalTaskRoomEligible,
    source: BATTLEFIELD_MAP_SOURCES[entry.assetKey]
      || (mediaUri(entry.path) ? { uri: mediaUri(entry.path) as string } : null),
  })) as readonly {
    visualPresetId: StarcraftTmgBattlefieldMapVisualPresetIdV2;
    displayName: string;
    assetKey: StarcraftTmgBattlefieldMapAssetKeyV2;
    path: string;
    gameEra: "brood_war" | "starcraft_2";
    engagementScale: "Skirmish" | "Standard" | "Grand Offensive";
    battlefield: Readonly<{ widthInches: 36 | 54 | 72; heightInches: 36 }>;
    formalTaskRoomEligible: boolean;
    source: MapSource | null;
  }[];

export function starcraftTmgBattlefieldMapSourceV2(
  visualPresetId: StarcraftTmgBattlefieldMapVisualPresetIdV2 | null | undefined,
  assetPath?: string | null,
): MapSource {
  if (assetPath && BATTLEFIELD_MAP_VARIANT_SOURCES[assetPath]) {
    return BATTLEFIELD_MAP_VARIANT_SOURCES[assetPath];
  }
  return STARCRAFT_TMG_BATTLEFIELD_MAP_OPTIONS.find((entry) => (
    entry.visualPresetId === visualPresetId
      || entry.assetKey === visualPresetId
  ))?.source || (assetPath && mediaUri(assetPath)
    ? { uri: mediaUri(assetPath) as string }
    : STARCRAFT_TMG_BATTLEFIELD_MAP_SOURCE);
}

function releaseChannel(): StarcraftTmgBattlefieldMediaReleaseChannelV1 {
  const configured = process.env.EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_RELEASE_CHANNEL;
  if (configured === "development_internal") return "development_internal";
  if (configured === "public") return "public";
  return "public_user_authorized";
}

function mediaOrigin() {
  if (Platform.OS === "web" && globalThis.window?.location?.origin) {
    return globalThis.window.location.origin;
  }
  const raw = process.env.EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_ORIGIN
    || process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function mediaUri(path: string) {
  const origin = mediaOrigin();
  return origin ? new URL(path, `${origin}/`).href : null;
}

function resolvedVoicePaths(
  voice: StarcraftTmgBattlefieldVoicePathsV1 | null,
): StarcraftTmgBattlefieldVoicePathsV1 | null {
  if (!voice) return null;
  const resolved = Object.fromEntries(Object.entries(voice).map(([intent, paths]) => [
    intent,
    (paths as readonly string[]).map(mediaUri)
      .filter((value: string | null): value is string => Boolean(value)),
  ])) as unknown as StarcraftTmgBattlefieldVoicePathsV1;
  return Object.values(resolved).some((paths) => paths.length > 0) ? resolved : null;
}

export function starcraftTmgBattlefieldUnitMediaAssetsV1(unitId: unknown): {
  unitKey: string;
  neutralPortrait: PortraitSource;
  activePortrait: PortraitSource;
  portraitAnimated: boolean;
  voice: StarcraftTmgBattlefieldVoicePathsV1 | null;
  releaseChannel: StarcraftTmgBattlefieldMediaReleaseChannelV1;
} | null {
  const selectedChannel = releaseChannel();
  const media = resolveStarcraftTmgBattlefieldUnitMediaV1(unitId, {
    releaseChannel: selectedChannel,
  });
  if (!media) return null;
  const fallback = PUBLIC_PORTRAITS[media.unitKey];
  if (!fallback) return null;
  const originalNeutral = selectedChannel !== "public"
    ? mediaUri(media.neutralPortraitPath)
    : null;
  const originalActive = selectedChannel !== "public"
    ? mediaUri(media.activePortraitPath)
    : null;
  return {
    unitKey: media.unitKey,
    neutralPortrait: originalNeutral ? { uri: originalNeutral } : fallback.neutral,
    activePortrait: originalActive ? { uri: originalActive } : fallback.active,
    portraitAnimated: Boolean(originalActive && media.portraitAnimated),
    voice: selectedChannel !== "public"
      ? resolvedVoicePaths(media.voice)
      : null,
    releaseChannel: originalActive ? selectedChannel : "public",
  };
}

export function randomStarcraftTmgPresentationMediaEntryV1(
  values: readonly string[],
): string | null {
  // This RNG is quarantined to optional presentation media. It never enters a
  // proposal, receipt, state hash, replay, rules decision, or training record.
  return values.length > 0
    ? values[Math.floor(Math.random() * values.length)]
    : null;
}
