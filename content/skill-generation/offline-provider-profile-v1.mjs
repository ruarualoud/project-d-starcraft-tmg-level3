import { createProviderProfile } from
  "../../packages/character-agent/contracts-v1.mjs";

// One server-owned profile is shared by both arms of the bounded Ticket 17
// experiment. A user can provide credential bytes to the existing isolated
// Provider Worker, but cannot replace this endpoint, model, sampling policy or
// retry contract.
export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 =
  createProviderProfile({
    providerProfileId: "starcraft-tmg.offline-skill.deepseek-v4-flash.v1",
    version: "2026.09.04-deepseek-v4-flash-0731.1",
    provider: "deepseek-openai-compatible-direct",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
    thinkingMode: "disabled",
    reasoningEffort: "low",
    temperature: 0,
    topP: 1,
    contextBudget: 1_000_000,
    outputBudget: 4_096,
    toolSupport: false,
    timeoutMs: 120_000,
    retryPolicy: {
      maxAttempts: 1,
      owner: "offline_skill_scheduler",
      internalRetry: false,
    },
    fallbackPolicy: "fail_closed",
  });
