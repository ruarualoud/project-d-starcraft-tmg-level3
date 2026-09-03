export type StarcraftTmgBattlefieldMediaReleaseChannelV1 =
  | "public"
  | "public_user_authorized"
  | "development_internal";
export interface StarcraftTmgBattlefieldVoicePathsV1 {
  selected: readonly string[];
  confirm: readonly string[];
  damaged: readonly string[];
  destroyed: readonly string[];
}
export interface StarcraftTmgBattlefieldUnitMediaV1 {
  schemaVersion: "starcraft_tmg_battlefield_unit_media_v1";
  unitKey: string;
  neutralPortraitPath: string;
  activePortraitPath: string;
  portraitAnimated: boolean;
  voice: StarcraftTmgBattlefieldVoicePathsV1 | null;
  releaseChannel: StarcraftTmgBattlefieldMediaReleaseChannelV1;
  rightsGatePassedForPublicDistribution: boolean;
  authorizationBasis: string;
  independentThirdPartyRightsReviewCompleted: false;
  fallbackGeneratedOriginal: boolean;
  trainingTruth: false;
}
export const STARCRAFT_TMG_BATTLEFIELD_MEDIA_POLICY_V1: Readonly<{
  schemaVersion: "starcraft_tmg_battlefield_media_policy_v1";
  publicDistributionDefault: true;
  developmentInternalMediaRequiresExplicitChannel: true;
  bundledClassicBgm: false;
  bgmInput: "user_selected_local_audio";
  officialMusicInformationUrl: string;
  mediaAffectsAuthority: false;
  mediaAffectsTraining: false;
  userAuthorizedPublicProjectUseRecordedAt: "2026-09-03";
  independentThirdPartyRightsReviewCompleted: false;
  trainingTruth: false;
}>;
export function resolveStarcraftTmgBattlefieldUnitMediaV1(
  unitId: unknown,
  options?: { releaseChannel?: StarcraftTmgBattlefieldMediaReleaseChannelV1 },
): StarcraftTmgBattlefieldUnitMediaV1 | null;
export function starcraftTmgBattlefieldMapMediaV1(): Readonly<{
  schemaVersion: "starcraft_tmg_battlefield_map_media_v1";
  assetKey: "alien_temple_local_v1";
  path: string;
  generatedOriginal: true;
  displayOnly: true;
  rulesGeometryAuthority: false;
  trainingTruth: false;
}>;
