import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as prior,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V5 as priorRef } from './ticket-18-faction-review-output-contract-v1.mjs';
import { createStarcraftTmgOutputContractV1, outputContractRefStarcraftTmgV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';
import { hash, seal } from '../../packages/skill-production/common.mjs';

// V1–V5 stay byte-exact. The model now uses the SAME finite target namespace
// for verdicts and coverage; only the Host may produce whole-draft indices.
const schema = structuredClone(prior.providerSchema);
const row = schema.properties.coverage.items;
delete row.properties.recommendationIndices;
row.properties.recommendationSlots = {
  type: 'array', items: { type: 'integer', minimum: 0, maximum: 1 },
  minItems: 0, maxItems: 2, uniqueItems: true,
  description: 'Select only supplied reviewTask.targetSlots, exactly the same local namespace as verdicts.targetSlot. Never return whole-draft indices.',
};
row.required = row.required.map(name => name === 'recommendationIndices' ? 'recommendationSlots' : name);
export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 = createStarcraftTmgOutputContractV1({
  id: prior.id, version: '2026.09.09.6', schemaName: 'faction_target_review_v6', providerSchema: schema,
  modelOwnedFields: prior.modelOwnedFields,
  hostOwnedFields: [...prior.hostOwnedFields, 'recommendationIndices'],
  mapperRef: { id: 'materializeFactionSlotReviewV1', version: 'v1', hash: hash('faction-review-local-target-slots-to-host-global-indices-v1') },
  semanticValidatorRef: prior.semanticValidatorRef,
  description: 'V6 removes the mixed coordinate contract. Coverage selects supplied local target slots; the Host validates source membership and maps exact whole-recommendation identities. No prose is parsed to select a native address; judgments are not promoted.',
});
export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6 = outputContractRefStarcraftTmgV1(STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6);
export const FACTION_REVIEW_SLOT_NAMESPACE_BINDING_V1 = seal({
  version: 'faction_review_slot_namespace_v1', prior: priorRef,
  current: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V6,
  nativeCoverageCoordinate: 'supplied_batch_local_target_slot',
  wholeDraftCoordinatesOwnedBy: 'host', nativeProseAddressInference: false,
  legacyRecovery: 'authenticated_complete_v5_output_with_explicit_targetSlot_and_unique_source_bound_mapping',
  originalProviderArtifactsPreserved: true, originalJudgmentsAndReasonsPreserved: true,
  fullSourceContextPreserved: true, semanticAcceptanceInherited: false,
  runtimeAccepted: false, trainingTruth: false,
});
