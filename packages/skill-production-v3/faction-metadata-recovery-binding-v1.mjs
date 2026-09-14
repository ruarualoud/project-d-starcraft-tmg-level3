import { seal } from '../skill-production/common.mjs';
import { FACTION_NATIVE_REFERENCE_SET_RECOVERY_BINDING_V1 as nativeReferenceSet } from './faction-native-reference-set-recovery-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V1 as coverageAddress } from './faction-review-coverage-address-v1.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V1 as completeReviewImport } from './faction-review-complete-output-import-v1.mjs';
export const FACTION_METADATA_RECOVERY_BINDING_V1 = seal({ version: 'faction_structured_metadata_recovery_v1',
  nativeReferenceSet, coverageAddress, completeReviewImport,
  paidArtifactsAndBillingPreserved: true, completeContextRequired: true,
  semanticAcceptanceInherited: false, sourceRefreshPerformed: false, trainingTruth: false });
