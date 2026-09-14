import { fail, seal, verifySeal } from '../skill-production/common.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V5 as contractRef } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';

export const FACTION_REVIEW_RECOVERY_BUDGET_BINDING_V2 = seal({
  version: 'faction_v5_recovery_output_budget_v2', outputContractRef: contractRef,
  maximumOutputUnits: 3072, reasonLengthPromptTarget: 600,
  fieldLimits: 'native_v5_schema_not_additional_hidden_compactness_limits',
  historicalV4LimitsUnchanged: true, sourceMembershipStillRequired: true,
  semanticAcceptanceInherited: false, trainingTruth: false });

export function verifyFactionReviewRecoveryBudgetV2({ value, outputUnits, outputContractRef, binding }) {
  verifySeal(binding);
  if (binding.hash !== FACTION_REVIEW_RECOVERY_BUDGET_BINDING_V2.hash
    || outputContractRef?.hash !== contractRef.hash) fail('FACTION_REVIEW_RECOVERY_BUDGET_BINDING_INVALID');
  if (!Number.isSafeInteger(outputUnits) || outputUnits < 1 || outputUnits > binding.maximumOutputUnits
    || !validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, value).ok)
    fail('FACTION_STRUCTURED_REVIEW_OUTPUT_CAP_RECOVERY_NOT_COMPACT');
  return true;
}
