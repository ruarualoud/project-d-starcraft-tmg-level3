import { seal } from '../skill-production/common.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V5 as coverageAddress } from './faction-review-coverage-address-v5.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V5 as reviewImport } from './faction-review-complete-output-import-v1.mjs';

export const FACTION_DUAL_COORDINATE_REVIEW_BINDING_V1 = seal({ version: 'faction_dual_coordinate_review_v1',
  coverageAddress, reviewImport, originalPaidOutputPreserved: true, fullContextPreserved: true,
  hostSourceAndExplicitCoordinatesRequired: true, sourceRefEchoInProseRequired: false,
  newProviderCallsForImport: 0, semanticAcceptanceInherited: false, trainingTruth: false });
