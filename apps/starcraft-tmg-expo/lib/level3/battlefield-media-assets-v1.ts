import { Platform } from "react-native";

import {
  resolveStarcraftTmgBattlefieldUnitMediaV1,
  type StarcraftTmgBattlefieldMediaReleaseChannelV1,
  type StarcraftTmgBattlefieldVoicePathsV1,
} from "../../../../packages/client-domain/battlefield-media-catalog-v1.mjs";

type PortraitSource = number | { uri: string };

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

function releaseChannel(): StarcraftTmgBattlefieldMediaReleaseChannelV1 {
  return process.env.EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_RELEASE_CHANNEL ===
    "development_internal"
    ? "development_internal"
    : "public";
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
  const internalNeutral = selectedChannel === "development_internal"
    ? mediaUri(media.neutralPortraitPath)
    : null;
  const internalActive = selectedChannel === "development_internal"
    ? mediaUri(media.activePortraitPath)
    : null;
  return {
    unitKey: media.unitKey,
    neutralPortrait: internalNeutral ? { uri: internalNeutral } : fallback.neutral,
    activePortrait: internalActive ? { uri: internalActive } : fallback.active,
    portraitAnimated: Boolean(internalActive && media.portraitAnimated),
    voice: selectedChannel === "development_internal"
      ? resolvedVoicePaths(media.voice)
      : null,
    releaseChannel: internalActive ? "development_internal" : "public",
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
