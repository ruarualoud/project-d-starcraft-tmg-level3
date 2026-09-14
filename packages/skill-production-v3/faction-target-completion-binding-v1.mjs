import { seal } from '../skill-production/common.mjs';
import { FACTION_REASONER_ANSWER_COMPLETION_BINDING_V1 as reasoner } from './faction-reasoner-answer-completion-v1.mjs';
import { FACTION_REVIEW_COVERAGE_ADDRESS_BINDING_V2 as coverageAddress } from './faction-review-coverage-address-v2.mjs';
import { FACTION_REVIEW_COMPLETE_OUTPUT_IMPORT_BINDING_V2 as reviewImport } from './faction-review-complete-output-import-v1.mjs';

export const FACTION_TARGET_COMPLETION_BINDING_V1 = seal({ version: 'faction_target_completion_binding_v1',
  reasoner, coverageAddress, reviewImport, frozenPriorProtocolsRetained: true,
  fullSourcesAndPriorContextRequired: true, semanticAcceptanceInherited: false, trainingTruth: false });
