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

// Opt-in successor for the exact-budget roster experiment. A live Foundation
// request reached the old 120-second transport deadline without a usable
// response; this version allows one longer, still single-flight attempt.
// Historical V1 sessions and their profile hash remain unchanged.
export const STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2 =
  createProviderProfile({
    providerProfileId: "starcraft-tmg.roster-teach.deepseek-v4-1-flash.v2",
    version: "2026.09.25-roster-teach.2",
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
    timeoutMs: 240_000,
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
      transportDeadlineExperiment: "single_attempt_240_seconds_v1",
    },
  });

// Explicit offline recovery experiment only; the default factory stays V2.
// Pick model-affecting fields, not the sealed contract's credential metadata.
const offlineRecoveryBase = Object.fromEntries([
  'provider', 'baseUrl', 'model', 'thinkingMode', 'reasoningEffort',
  'temperature', 'topP', 'contextBudget', 'outputBudget', 'toolSupport',
  'retryPolicy', 'fallbackPolicy',
].map(key => [key, STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2[key]]));
export const STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 =
  createProviderProfile({ ...offlineRecoveryBase,
    providerProfileId: 'starcraft-tmg.roster-teach.deepseek-v4-1-flash.v3',
    version: '2026.10.15-roster-teach.3', timeoutMs: 600_000,
    extensions: { ...STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2.extensions,
      transportDeadlineExperiment: 'explicit_offline_single_attempt_600_seconds_v1' },
  });
