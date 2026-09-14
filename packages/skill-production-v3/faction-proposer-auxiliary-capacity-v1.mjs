import { seal, verifySeal, fail } from '../skill-production/common.mjs';

// Host-only acceptance envelope for complete, preserved auxiliary notes.
// V1 Provider schema and request identities remain byte-frozen. Recovery
// requires separate paid-failure provenance; this binding is not a receipt.
export const FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1 = seal({ version: 'faction_proposer_auxiliary_capacity_v1',
  acceptedOverflowPaths: ['$.uncertainties'], maximumUncertainties: 128, maximumUncertaintyLength: 240,
  substantivePlanLimitsChanged: false, providerContractChanged: false, allOriginalTextPreserved: true,
  originalFailureRelabelled: false, automaticWholeRoleRetries: 0, semanticAcceptanceInherited: false, trainingTruth: false });

// Explicit V2 Host envelope. 600 remains the frozen Provider's writing target;
// a complete slightly longer plan need not be rewritten for presentation only.
// This never increases the number of plans or relaxes source/target checks.
export const FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2 = seal({ version: 'faction_proposer_envelope_capacity_v2',
  acceptedOverflowPaths: ['$.uncertainties', '$.plans[*].text'],
  maximumUncertainties: 128, maximumUncertaintyLength: 240, maximumPlanTextLength: 1600,
  planTextWritingTarget: 600, maximumPlans: 2, sourceAndTargetLimitsChanged: false,
  providerContractChanged: false, allOriginalTextPreserved: true, originalFailureRelabelled: false,
  automaticWholeRoleRetries: 0, semanticAcceptanceInherited: false, trainingTruth: false });

export function validateFactionProposerAuxiliaryCapacityV1(binding) {
  if (![FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1.hash, FACTION_PROPOSER_ENVELOPE_CAPACITY_BINDING_V2.hash].includes(verifySeal(binding).hash))
    fail('FACTION_PROPOSER_AUXILIARY_BINDING_INVALID');
  return binding;
}
