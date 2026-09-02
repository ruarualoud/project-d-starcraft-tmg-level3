export const STARCRAFT_TMG_ROOM_ACCESS_VERSION: string;
export const STARCRAFT_TMG_ROOM_ACCESS_SCHEME: "projectd-starcraft-tmg";

export type StarcraftTmgRoomAccessKind = "invite" | "recovery";

export class StarcraftTmgRoomAccessError extends Error {
  code: string;
  details: Record<string, unknown>;
}

export interface StarcraftTmgParsedRoomAccess {
  schemaVersion: string;
  locator: { roomId: string };
  access: {
    kind: StarcraftTmgRoomAccessKind;
    token: string;
    ephemeral: true;
  } | null;
  accessFingerprint: string;
  accessStatus: {
    kind: StarcraftTmgRoomAccessKind | null;
    present: boolean;
    ephemeral: boolean;
  };
  originKind: "custom_scheme" | "loopback" | "trusted_https";
  ignoredClaims: ReadonlyArray<{
    location: "query" | "fragment";
    key: string;
    reason: "url_claim_is_not_authority";
  }>;
  scrubbedWebPath: string | null;
  authority: Record<string, false>;
  trainingTruth: false;
}

export function parseStarcraftTmgRoomAccessUrl(
  rawUrl: string,
  options?: {
    trustedOrigins?: Iterable<string>;
    environment?: "development" | "production";
  },
): StarcraftTmgParsedRoomAccess;
export function isStarcraftTmgRoomAccessCandidate(rawUrl: string): boolean;
export function scrubStarcraftTmgSensitiveWebUrl(rawUrl: string): string | null;
export function normalizeStarcraftTmgTrustedHttpsOrigin(value: string): string;
export function buildStarcraftTmgRoomAccessUrl(input: {
  roomId: string;
  origin?: string;
  trustedOrigins?: Iterable<string>;
  environment?: "development" | "production";
  access: { kind: StarcraftTmgRoomAccessKind; token: string };
}): string;
