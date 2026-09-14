import { createProviderProfile } from '../../packages/character-agent/contracts-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as prior } from './offline-provider-profile-v1.mjs';

// New capacity identity; the V1 profile and all paid receipts remain frozen.
// Role execution policies can still select 4096 for small review batches.
// This profile alone is NOT proof of a live 8192-token request/capability.
const inherited = Object.fromEntries(['provider', 'baseUrl', 'model', 'thinkingMode', 'reasoningEffort',
  'temperature', 'topP', 'contextBudget', 'toolSupport', 'timeoutMs', 'retryPolicy', 'fallbackPolicy']
  .map(key => [key, prior[key]]));
export const STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 = createProviderProfile({
  ...inherited, providerProfileId: 'starcraft-tmg.offline-skill.deepseek-v4-flash.v2',
  version: '2026.09.08-output-capacity-8192.1', outputBudget: 8192,
});
