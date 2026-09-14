import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { createStructuredFieldCodecV1, STRUCTURED_FIELD_CODEC_BINDING_V1 } from '../structured-generation/field-codec-v1.mjs';
import { createStarcraftTmgContextCapsuleV1, verifyStarcraftTmgContextCapsuleV1 } from '../structured-generation/context-capsule-v1.mjs';
import { outputContractRefStarcraftTmgV1 } from '../structured-generation/output-contract-registry-v1.mjs';

// A task compiler, not an egress/retry permission. Caller authenticates the
// original paid failure, registers the new output contract and capability,
// and charges the existing bounded attempt family before any model call.
export function createFactionFieldRepairTaskV1({ capsule, rejectedCandidate, contract }) {
  verifyStarcraftTmgContextCapsuleV1(capsule); verifySeal(rejectedCandidate);
  const codec = createStructuredFieldCodecV1(contract), contractRef = outputContractRefStarcraftTmgV1(contract);
  if (capsule.kind !== 'whole_section_review_context'
    || hash(capsule.outputContractRef) !== hash(contractRef)
    || hash(rejectedCandidate.outputContractRef) !== hash(contractRef)
    || rejectedCandidate.contextManifestRef.hash !== capsule.hash
    || hash(rejectedCandidate.roleRef) !== hash(capsule.roleRef)) fail('FACTION_FIELD_REPAIR_TASK_ORIGIN_DRIFT');
  const inspection = codec.inspect(rejectedCandidate.providerValue);
  if (hash(inspection.originalValidation) !== hash(rejectedCandidate.validation)) fail('FACTION_FIELD_REPAIR_TASK_ISSUE_DRIFT');
  if (inspection.status !== 'needs_values') fail('FACTION_FIELD_REPAIR_TASK_NOT_SEMANTIC_COMPLETION');
  const compiled = createStructuredFieldCodecV1(inspection.repairContract).compile();
  const id = capsule.roleRef.id + '.field-values-v1.' + inspection.hash.slice(0, 12);
  const context = createStarcraftTmgContextCapsuleV1({
    kind: 'local_proof_capsule',
    roleRef: { id, version: 'field-values-v1', hash: hash(id + '.field-values-v1') },
    outputContractRef: outputContractRefStarcraftTmgV1(inspection.repairContract),
    immutableBase: capsule.immutableBase, section: capsule.section,
    dependencyGraph: capsule.dependencyGraph, sourceIndexRef: capsule.sourceIndexRef,
    expansionToolRef: capsule.expansionToolRef, omittedDomains: capsule.omittedDomains,
    protectedFields: [...capsule.protectedFields,
      { path: 'originalRejectedCandidate', hash: rejectedCandidate.hash }],
    localIssue: { ...capsule.localIssue, fieldValueTask: {
      bindingHash: STRUCTURED_FIELD_CODEC_BINDING_V1.hash, originalContextHash: capsule.hash,
      rejectedCandidateHash: rejectedCandidate.hash, originalValue: rejectedCandidate.providerValue,
      inspectionHash: inspection.hash, validationIssues: inspection.validation.issues,
      jobs: inspection.jobs.map(({ key, pointer, issuePaths }) => ({ key, pointer, issuePaths })),
      outputResponsibility: 'replacement_values_only_host_owns_paths_and_assembly',
      missingJudgmentsAreNewContent: true, sourceReviewRequired: true,
    } },
    instructions: [
      'Complete only the requested field-value jobs using the supplied complete chapter and frozen source context.',
      'The original draft/review and its fields are input evidence, not the output format. Do not reprint already completed fields.',
      'The host maps each fieldN key to its supplied path; return no paths, IDs, hashes or acceptance flags.',
      'Missing coverage requires an actual source-bound coverage judgment, not an invented success or an empty placeholder.',
      'Use the task\'s declared uncertain outcome when evidence is insufficient. Do not turn an unsupported finding into agreement to satisfy formatting.',
      'Preserve source meaning, restrictions, timing and conditions; this is new unqualified content pending independent review.',
      compiled.instructions,
    ].join('\n'),
  });
  return seal({ version: 'faction_field_repair_task_v1', bindingHash: STRUCTURED_FIELD_CODEC_BINDING_V1.hash,
    originalContextHash: capsule.hash, rejectedCandidateHash: rejectedCandidate.hash,
    inspection, contract: inspection.repairContract, compilation: compiled, context,
    completeChapterAndSourceGraphPreserved: true, providerCalls: 0,
    capabilityRequiredBeforeSend: true, retryAuthorizationGranted: false,
    semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false });
}
