import { createProviderProfile } from
  "../../packages/character-agent/contracts-v1.mjs";
import { STARCRAFT_TMG_DEEPSEEK_CURRENT_PRICING_SNAPSHOT_V2 as pricing } from
  "../../packages/secure-provider-runtime/provider-pricing-v2.mjs";

export const STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 =
  createProviderProfile({
    providerProfileId: "starcraft-tmg.live-opponent.deepseek-v4-1-flash.v1",
    version: "2026.09.14-deepseek-v4.1-flash.1",
    provider: "deepseek-openai-compatible-direct",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
    thinkingMode: "disabled",
    reasoningEffort: "low",
    temperature: 0,
    topP: 1,
    contextBudget: 1_000_000,
    outputBudget: 8_192,
    toolSupport: false,
    timeoutMs: 120_000,
    retryPolicy: {
      maxAttempts: 1,
      owner: "live_match_session_supervisor",
      internalRetry: false,
    },
    fallbackPolicy: "pre_match_only",
    extensions: {
      officialModelRelease: "DeepSeek-V4.1-Flash",
      pricingSnapshotHash: pricing.snapshotHash,
      modelListCheckedAt: "match_preflight",
    },
  });

export const STARCRAFT_TMG_TICKET_23_V4_PRO_FALLBACK_PROVIDER_PROFILE_V1 =
  createProviderProfile({
    providerProfileId: "starcraft-tmg.live-opponent.deepseek-v4-pro-fallback.v1",
    version: "2026.09.14-deepseek-v4-pro-0813.1",
    provider: "deepseek-openai-compatible-direct",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    thinkingMode: "disabled",
    reasoningEffort: "low",
    temperature: 0,
    topP: 1,
    contextBudget: 1_000_000,
    outputBudget: 8_192,
    toolSupport: false,
    timeoutMs: 120_000,
    retryPolicy: {
      maxAttempts: 1,
      owner: "live_match_session_supervisor",
      internalRetry: false,
    },
    fallbackPolicy: "fail_closed",
    extensions: {
      officialModelRelease: "DeepSeek-V4-Pro-0813",
      pricingSnapshotHash: pricing.snapshotHash,
      fallbackAllowedOnlyBeforeMatchOpen: true,
    },
  });

export const STARCRAFT_TMG_TICKET_23_LIVE_PROVIDER_PROFILES_V1 = Object.freeze([
  STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1,
  STARCRAFT_TMG_TICKET_23_V4_PRO_FALLBACK_PROVIDER_PROFILE_V1,
]);
