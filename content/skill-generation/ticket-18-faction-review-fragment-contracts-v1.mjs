import { hash, seal } from '../../packages/skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';

const reason = { type: 'string', minLength: 1, maxLength: 16384 };
const verdict = values => ({ type: 'string', minLength: 7, maxLength: 11, enum: values });
const contract = (kind, properties) => createStarcraftTmgOutputContractV1({
  id: 'starcraft-tmg.faction-review-' + kind, version: '2026.09.08.1', schemaName: 'faction_review_' + kind + '_v1',
  providerSchema: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
  modelOwnedFields: Object.keys(properties),
  hostOwnedFields: ['targetId', 'targetSlot', 'title', 'coverageSlot', 'sourceRef', 'focusQuote', 'acceptanceStatus'],
  mapperRef: { id: 'faction_review_fragment_host_mapping', version: 'v1', hash: hash('faction_review_fragment_host_mapping_v1') },
  semanticValidatorRef: { id: 'validateTargetedFactionReviewV1', version: 'v1', hash: hash('fragment_full_review_downstream_validation_v1') },
  description: 'One independent ' + kind + ' judgment with the complete original rules and section. Host IDs and quotes cannot be authored by the model; semantic acceptance is downstream.',
});
export const FACTION_REVIEW_FRAGMENT_CONTRACTS_V1 = Object.freeze({
  target: contract('target', {
    focusPaths: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 100 }, minItems: 1, maxItems: 128, uniqueItems: true },
    verdict: verdict(['supported', 'unsupported', 'uncertain']), reason,
    sourceSlots: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 511 }, minItems: 1, maxItems: 128, uniqueItems: true },
  }),
  coverage: contract('coverage', {
    verdict: verdict(['covered', 'omitted', 'uncertain']), reason,
    recommendationSlots: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 7 }, minItems: 0, maxItems: 8, uniqueItems: true },
  }),
});
export const FACTION_REVIEW_FRAGMENT_CONTRACT_BINDING_V1 = seal({ version: 'faction_review_fragment_contracts_v1',
  contracts: Object.fromEntries(Object.entries(FACTION_REVIEW_FRAGMENT_CONTRACTS_V1)
    .map(([kind, value]) => [kind, outputContractRefStarcraftTmgV1(value)])),
  targetIdentityHostOwned: true, quoteTextHostOwned: true, allInputsRetained: true,
  originalResponseReconstructionClaimed: false, semanticAcceptanceInherited: false, trainingTruth: false });
