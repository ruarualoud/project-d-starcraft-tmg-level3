import { createProviderProfile } from '../../packages/character-agent/contracts-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as prior } from './offline-provider-profile-v2.mjs';

// Explicit user-selected short-lived beta. V1/V2 remain historical identities.
// Context/output values below are our operating bounds, NOT beta capability proof.
export const DEEPSEEK_V41_FLASH_BETA_MODEL_V1 = 'deepseek-v4.1-flash-expires-on-0910';
// Conservative local stop at the START of September 10 in Asia/Shanghai.
// The exact upstream expiry time/timezone has not been verified.
export const DEEPSEEK_V41_FLASH_BETA_LOCAL_STOP_V1 = '2026-09-09T16:00:00.000Z';
const inherited = Object.fromEntries(['provider', 'baseUrl', 'thinkingMode', 'reasoningEffort',
  'temperature', 'topP', 'contextBudget', 'outputBudget', 'toolSupport', 'timeoutMs',
  'retryPolicy', 'fallbackPolicy'].map(key => [key, prior[key]]));
export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V3 = createProviderProfile({
  ...inherited,
  providerProfileId: 'starcraft-tmg.offline-skill.deepseek-v4.1-flash-beta.v3',
  version: '2026.09.08-beta-expires-on-0910.1',
  model: DEEPSEEK_V41_FLASH_BETA_MODEL_V1,
});

export function assertDeepSeekV41BetaWindowV1(now = new Date().toISOString()) {
  const instant = Date.parse(now);
  if (!Number.isFinite(instant) || instant >= Date.parse(DEEPSEEK_V41_FLASH_BETA_LOCAL_STOP_V1)) {
    throw Object.assign(new Error('DEEPSEEK_V41_BETA_LOCAL_WINDOW_CLOSED'),
      { code: 'DEEPSEEK_V41_BETA_LOCAL_WINDOW_CLOSED' });
  }
}
