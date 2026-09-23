import { createProviderProfile } from
  "../../packages/character-agent/contracts-v1.mjs";
import { STARCRAFT_TMG_DEEPSEEK_CURRENT_PRICING_SNAPSHOT_V2 as pricing } from
  "../../packages/secure-provider-runtime/provider-pricing-v2.mjs";

// Separate from the frozen live-match Flash profile. The Student must return
// a full revised Foundation plus challenge answers; 8,192 output units were
// exhausted in a retained real response. Existing match rooms are unchanged.
export const STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V1 =
  createProviderProfile({
    providerProfileId: "starcraft-tmg.roster-teach.deepseek-v4-1-flash.v1",
    version: "2026.09.24-roster-teach.1",
    provider: "deepseek-openai-compatible-direct",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
    thinkingMode: "disabled",
    reasoningEffort: "low",
    temperature: 0,
    topP: 1,
    contextBudget: 1_000_000,
    outputBudget: 32_768,
    toolSupport: false,
    timeoutMs: 120_000,
    retryPolicy: {
      maxAttempts: 1,
      owner: "roster_teach_session_supervisor",
      internalRetry: false,
    },
    fallbackPolicy: "fail_closed",
    extensions: {
      officialModelRelease: "DeepSeek-V4.1-Flash",
      pricingSnapshotHash: pricing.snapshotHash,
      requestOutputCeilingEvidence:
        "https://api-docs.deepseek.com/quick_start/pricing/",
      fullFoundationAndAnswersRequireMoreThan8192: true,
    },
  });
