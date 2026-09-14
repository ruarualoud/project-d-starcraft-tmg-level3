import { seal } from '../skill-production/common.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V3 as coverageAddress } from './faction-review-coverage-address-v3.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V3 as reviewImport } from './faction-review-complete-output-import-v1.mjs';

export const FACTION_TARGET_ID_REVIEW_BINDING_V1 = seal({ version: 'faction_target_id_review_v1', coverageAddress, reviewImport,
  exactHostIdentityOnly: true, originalPaidOutputPreserved: true, fullContextPreserved: true,
  newProviderCallsForImport: 0, semanticAcceptanceInherited: false, trainingTruth: false });
