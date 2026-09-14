import { hash } from '../../packages/skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';

// Same two native Teach fields as validateTutorLessonV3. The provider enforces
// syntax; Host still checks the whole 64 KiB artifact and never blesses facts.
const strings = minimum => ({ type: 'array', minItems: minimum, maxItems: 128,
  items: { type: 'string', minLength: 1, maxLength: 16384 } });
export const FACTION_TEACH_OUTPUT_CONTRACT_V1 = createStarcraftTmgOutputContractV1({
  id: 'starcraft-tmg.faction-teach', version: '2026.09.08.1', schemaName: 'faction_teach_v1',
  providerSchema: { type: 'object', properties: { lesson: strings(1), uncertainties: strings(0) },
    required: ['lesson', 'uncertainties'], additionalProperties: false },
  modelOwnedFields: ['lesson', 'uncertainties'],
  hostOwnedFields: ['axis', 'sourceBinding', 'acceptance', 'runtimeAccepted'],
  mapperRef: { id: 'faction.teach.identity', version: '1.0.0', hash: hash('faction-teach-native-identity-v1') },
  semanticValidatorRef: { id: 'validateTutorLessonV3', version: '1.0.0', hash: hash('native-lesson-uncertainties-whole-64KiB-not-rule-truth') },
  description: 'Unverified conditional teaching notes, with complete sources supplied separately.' });
export const FACTION_TEACH_OUTPUT_CONTRACT_REF_V1 = outputContractRefStarcraftTmgV1(FACTION_TEACH_OUTPUT_CONTRACT_V1);
