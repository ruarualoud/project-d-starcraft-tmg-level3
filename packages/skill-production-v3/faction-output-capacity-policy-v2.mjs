import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as oldProfile } from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as profile } from '../../content/skill-generation/offline-provider-profile-v2.mjs';

export const FACTION_OUTPUT_CAPACITY_POLICY_V2 = seal({ version: 'faction_role_output_capacity_v2',
  previousProfileHash: oldProfile.integrity.hash, profileHash: profile.integrity.hash,
  providerMaximum: 8192, roleMaximum: { teach: 8192, narrative: 8192, review: 4096 },
  promptTargets: { teach: 2000, narrative: 3200, review: 2000 },
  outputLimitIsNotRequiredLength: true, sourceContextPreserved: true,
  semanticBatchingRequired: true, truncationAcceptanceAllowed: false,
  automaticCapacityRetryAllowed: false, sourceReviewWeakened: false,
  previousPaidArtifactsImmutable: true, liveCapabilityReceiptRequired: true,
  sourceRefreshPerformed: false, runtimeAccepted: false, trainingTruth: false });

export function factionRoleOutputCapacityV2({ kind, binding = FACTION_OUTPUT_CAPACITY_POLICY_V2 }) {
  verifySeal(binding);
  if (binding.hash !== FACTION_OUTPUT_CAPACITY_POLICY_V2.hash || !Object.hasOwn(binding.roleMaximum, kind))
    fail('FACTION_ROLE_CAPACITY_POLICY_INVALID');
  return seal({ kind, bindingHash: binding.hash, profileHash: binding.profileHash,
    maxOutputUnits: binding.roleMaximum[kind], promptTarget: binding.promptTargets[kind],
    automaticRetries: 0, requiresNewInvocationBinding: true, trainingTruth: false });
}
