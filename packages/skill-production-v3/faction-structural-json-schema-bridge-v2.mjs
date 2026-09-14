import { hash, seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';
import { createStarcraftTmgContextCapsuleV1 } from '../structured-generation/context-capsule-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 as recoveryBinding } from '../structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { verifyFactionStructuredReviewSchemaRepairScopeV1 } from './faction-structured-review-runtime-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { createFactionReviewSourceExpansionV1 } from './faction-review-source-expansion-v1.mjs';
import { createFactionReviewSchemaRepairContextCapsuleV1,
  createFactionReviewHostContractRepairContextCapsuleV1 } from
  './faction-review-context-capsule-v1.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1, FACTION_PARSED_REVIEW_VALUE_BINDING_V2,
  inspectFactionParsedReviewValueV1, inspectFactionParsedReviewValueV2 }
  from './faction-parsed-review-value-v1.mjs';

export const FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2 = seal({
  version: 'faction_structural_json_schema_bridge_v2', recoveryBindingHash: recoveryBinding.hash,
  outputContractHash: contract.contractHash, completeOriginalContextRequired: true,
  nativeSuccessReceiptInvented: false, originalFailureAndUsageImmutable: true,
  maxAdditionalSchemaCorrectionAttempts: 1, exactInvalidPathsOnly: true,
  sameTargetParts: 'same_verdict_only_preserve_every_reason_focus_and_source',
  conflictingTargetPartsNeverCoalesced: true, originalPartsIncludedInCorrectionContext: true,
  schemaAcceptanceIsNotSourceAcceptance: true, semanticAcceptanceInherited: false,
  runtimeAccepted: false, trainingTruth: false });
const binding = FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2;
const invalid = code => fail('FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_' + code);

export function prepareFactionHostContractRepairPhaseV2({ phase,
  resolveArtifact }) {
  const repairScope = phase.result?.hostContractRepairScope;
  if (!repairScope) return null;
  verifySeal(repairScope);
  const rejectedRef = phase.result.initialStructuredIssueRef
    ?.rejectedCandidateRef;
  if (typeof resolveArtifact !== 'function')
    invalid('HOST_CONTRACT_PHASE_EVIDENCE_MISSING');
  // Current artifacts carry the exact rejected-candidate ref. A small set of
  // already-paid V1 artifacts retained the phase scope after a source
  // expansion but omitted that ref. Resolve those uniquely by the immutable
  // pre-repair context and role instead of rejecting usable paid work.
  const rejected = verifySeal(rejectedRef?.hash
    ? resolveArtifact(rejectedRef.hash)
    : resolveArtifact({ kind: 'rejected_candidate_by_context',
      contextHash: phase.capsule.hash,
      roleId: phase.capsule.roleRef.id }));
  if (rejectedRef?.hash && rejected.hash !== rejectedRef.hash
    || rejected.contextManifestRef?.hash !== phase.capsule.hash)
    invalid('HOST_CONTRACT_PHASE_EVIDENCE_DRIFT');
  const id = phase.capsule.roleRef.id + '.host-contract-repair.1';
  return {
    rejected,
    repairScope,
    roleRef: { id, version: 'structured-review-v1',
      hash: hash(id + '.structured-review-v1') },
  };
}

export function coalesceFactionParsedReviewPartsV2({ capsule, providerValue }) {
  verifySeal(capsule);
  const slots = capsule.localIssue.reviewTask.targetSlots.map(row => row.slot), groups = new Map();
  if (!Array.isArray(providerValue.verdicts)) invalid('TARGET_PARTS_INVALID');
  for (const row of providerValue.verdicts) {
    if (!Number.isInteger(row.targetSlot) || !slots.includes(row.targetSlot)) invalid('TARGET_PARTS_UNKNOWN_SLOT');
    const group = groups.get(row.targetSlot) || []; group.push(row); groups.set(row.targetSlot, group);
  }
  if (groups.size !== slots.length) invalid('TARGET_PARTS_MISSING_TARGET');
  const parts = [];
  const verdicts = slots.map(slot => {
    const rows = groups.get(slot);
    if (rows.length === 1) return structuredClone(rows[0]);
    if (new Set(rows.map(r => r.verdict)).size !== 1) invalid('TARGET_PARTS_CONFLICT');
    if (rows.some(r => typeof r.reason !== 'string' || !Array.isArray(r.focus) || !Array.isArray(r.sourceSlots)
      || Object.keys(r).some(k => !['targetSlot', 'verdict', 'reason', 'focus', 'sourceSlots'].includes(k))))
      invalid('TARGET_PARTS_SHAPE_INVALID');
    const unique = values => [...new Map(values.map(v => [hash(v), v])).values()];
    const merged = { targetSlot: slot, verdict: rows[0].verdict,
      reason: rows.map(r => r.reason).join('\n\n'), focus: unique(rows.flatMap(r => r.focus)),
      sourceSlots: unique(rows.flatMap(r => r.sourceSlots)) };
    parts.push({ targetSlot: slot, originalRowHashes: rows.map(hash), mergedRowHash: hash(merged) });
    return merged;
  });
  // No duplicate parts: preserve original row ordering as well as every value.
  const output = parts.length ? { ...structuredClone(providerValue), verdicts } : structuredClone(providerValue);
  return { output, receipt: seal({ version: 'faction_same_target_review_parts_v2',
    originalOutputHash: hash(providerValue), outputHash: hash(output), targetSlotsHash: hash(slots), parts,
    allReasonsPreserved: true, allFocusPreserved: true, allSourcesPreserved: true,
    conflictingVerdictsRejected: true, semanticAcceptanceInherited: false, trainingTruth: false }) };
}

// Pure preparation only. Caller MUST obtain `authenticated` from a fresh
// read of the actual paid owner/raw boundary, not the artifact being verified.
export function prepareFactionStructuralJsonSchemaRepairV2({ capsule, authenticated }) {
  [capsule, authenticated].forEach(verifySeal);
  const proof = authenticated;
  const validation = validate(contract.providerSchema, proof.providerValue);
  if (proof.version !== recoveryBinding.version + '.authenticated' || proof.bindingHash !== recoveryBinding.hash
    || capsule.kind !== 'whole_section_review_context' || capsule.outputContractRef.hash !== contract.contractHash
    || proof.outputContractRef.hash !== contract.contractHash || proof.contextManifestRef.hash !== capsule.hash
    || hash(proof.invocation.roleRef) !== hash(capsule.roleRef)
    || proof.invocation.contextManifestRef.hash !== capsule.hash
    || proof.normalization.outputHash !== hash(proof.providerValue)
    || proof.normalization.localSchemaValidationHash !== hash(validation)
    || proof.normalization.schemaPassed !== false || proof.normalization.fieldsRemoved !== 0
    || proof.normalization.scalarEdits !== 0 || proof.normalization.appendedCharacters !== 0
    || proof.normalization.parsedValueCount !== 1 || proof.normalization.exhaustiveSearchCompleted !== true
    || validation.ok || hash(validation) !== hash(proof.validation)
    || proof.additionalProviderAttempts !== 0 || proof.originalFailurePreserved !== true
    || proof.nativeSuccessReceiptInvented !== false || proof.semanticAcceptanceInherited !== false
    || proof.runtimeAccepted !== false || proof.trainingTruth !== false) invalid('ORIGIN_INVALID');
  const coalesced = coalesceFactionParsedReviewPartsV2({ capsule, providerValue: proof.providerValue });
  const candidateValidation = validate(contract.providerSchema, coalesced.output);
  if (candidateValidation.ok) invalid('NO_SCHEMA_CORRECTION_NEEDED');
  const rejected = seal({ version: binding.version + '.parsed_rejected_candidate',
    recoveryProofHash: proof.hash, invocationHash: hash(proof.invocation), roleRef: capsule.roleRef,
    contextManifestRef: proof.contextManifestRef, outputContractRef: proof.outputContractRef,
    providerValue: coalesced.output, validation: candidateValidation, originalProviderReceiptHash: proof.originalProviderReceiptHash,
    originalParsedOutputHash: hash(proof.providerValue), targetPartsReceipt: coalesced.receipt,
    nativeRejectedCandidateInvented: false, semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
  const id = capsule.roleRef.id + '.structural-json-v2.schema-repair.1';
  const roleRef = { id, version: 'structured-review-v1', hash: hash(id + '.structured-review-v1') };
  const context = createStarcraftTmgContextCapsuleV1({
    kind: capsule.kind, roleRef, outputContractRef: capsule.outputContractRef,
    immutableBase: capsule.immutableBase, section: capsule.section,
    localIssue: { ...capsule.localIssue, schemaRepair: {
      rejectedCandidateHash: rejected.hash, providerValue: rejected.providerValue,
      validationIssues: candidateValidation.issues, allowedChanges: [...new Set(candidateValidation.issues.map(row => row.path))],
      policy: 'change_only_exact_invalid_paths_preserve_every_other_value' },
    structuralJsonRecovery: { bindingHash: binding.hash, authenticatedProofHash: proof.hash,
      originalWireIssueHash: proof.originalWireIssueHash, originalOutputTextHash: proof.outputTextHash,
      originalProviderValue: proof.providerValue, targetPartsReceipt: coalesced.receipt,
      representationOnly: true, nativeSuccessReceiptInvented: false } },
    protectedFields: [...capsule.protectedFields, { path: 'schemaRepair.rejectedCandidate', hash: rejected.hash },
      { path: 'structuralJsonRecovery.authenticatedProof', hash: proof.hash }],
    dependencyGraph: capsule.dependencyGraph, sourceIndexRef: capsule.sourceIndexRef,
    expansionToolRef: capsule.expansionToolRef, omittedDomains: capsule.omittedDomains,
    instructions: [capsule.instructions,
      'The original paid output failed JSON syntax. Authenticated, typed grammar recovery preserved every scalar and field; the parsed candidate below is still rejected by the schema.',
      'If the model split one supplied target into several same-verdict parts, the Host has coalesced them while preserving every original reason, focus and source. The original parts remain supplied as evidence. Conflicting judgments or missing targets are never merged into acceptance.',
      `Exact machine constraints: ${JSON.stringify(candidateValidation.issues)}.`,
      'Return the complete corrected schema object. Change only the listed invalid paths; preserve all other parsed values, verdicts, reasons, sourceSlots and recommendationSlots exactly.',
      'Remove only properties explicitly marked additional_property_forbidden. For length/cardinality corrections obey the exact reported constraint, not a generic source-count limit. Never add, remove or renumber unaffected citations.',
      'The full original rules, FAQ, source bodies, draft and targets are still provided. This is one bounded representation correction, not a fresh source judgment or strategy acceptance.',
    ].join('\n'),
  });
  return seal({ version: binding.version + '.preparation', bindingHash: binding.hash,
    originalContextHash: capsule.hash, recoveryProofHash: proof.hash, rejected, context,
    allowedChangedPaths: candidateValidation.issues.map(row => row.path), fullContextPreserved: true,
    originalAttemptResendPermitted: false, semanticAcceptanceInherited: false, trainingTruth: false });
}

export function verifyFactionStructuralJsonSchemaCorrectionV2({ preparation, capsule, authenticated, correctedOutput }) {
  verifySeal(preparation);
  const rebuilt = prepareFactionStructuralJsonSchemaRepairV2({ capsule, authenticated });
  if (preparation.hash !== rebuilt.hash || hash(preparation) !== hash(rebuilt)) invalid('PREPARATION_DRIFT');
  const validation = validate(contract.providerSchema, correctedOutput);
  if (!validation.ok) invalid('CORRECTION_SCHEMA_INVALID');
  const scope = verifyFactionStructuredReviewSchemaRepairScopeV1({ rejectedCandidate: rebuilt.rejected, repairedOutput: correctedOutput });
  return seal({ version: binding.version + '.correction_scope', bindingHash: binding.hash,
    preparationHash: rebuilt.hash, correctedOutputHash: hash(correctedOutput), scope,
    sourceJudgmentReperformed: false, actualProviderExecutionProven: false,
    semanticAcceptanceInherited: false, runtimeAccepted: false, trainingTruth: false });
}

// A record proves the composition of parsed-origin -> exact-path correction
// -> DSH. The independent consumer must additionally read the actual corrected
// paid candidate/receipt; an embedded loop is not its own Provider authority.
export function verifyFactionParsedWireCorrectionRecordV2({ record, capsule, authenticated, dshBindingHash, parsedReviewValue = null }) {
  [record, capsule, authenticated].forEach(verifySeal);
  if (record.version !== 'faction_parsed_wire_correction_record_v2' || record.bindingHash !== binding.hash
    || record.originalContextHash !== capsule.hash || hash(record.authenticatedProof) !== hash(authenticated)
    || record.originalRequestResent !== false || record.nativeSuccessReceiptInvented !== false
    || record.semanticAcceptanceInherited !== false || record.trainingTruth !== false) invalid('RECORD_DRIFT');
  let materializationReceiptHash;
  if (record.correctedParsedReviewValueRef) {
    if (!parsedReviewValue || verifySeal(parsedReviewValue).hash !== record.correctedParsedReviewValueRef.hash
      || record.correctedCandidateRef || record.correctedRuntimeReceiptRef
      || hash(record.loop) !== hash(parsedReviewValue.loop)) invalid('PARSED_CORRECTION_DRIFT');
    // This is composition checking only. Runtime and cold consumer separately
    // reauthenticate the second paid wire before accepting its value record.
    if (parsedReviewValue.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.version
      && parsedReviewValue.bindingHash === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.hash)
      inspectFactionParsedReviewValueV1({ capsule: record.preparation.context,
        authenticated: parsedReviewValue.authenticatedProof });
    else if (parsedReviewValue.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version
      && parsedReviewValue.bindingHash === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.hash)
      inspectFactionParsedReviewValueV2({ capsule: record.preparation.context,
        authenticated: parsedReviewValue.authenticatedProof });
    else invalid('PARSED_CORRECTION_DRIFT');
    materializationReceiptHash = parsedReviewValue.authenticatedProof.hash;
  } else {
    if (parsedReviewValue || !/^[a-f0-9]{64}$/u.test(record.correctedCandidateRef?.hash || '')
      || !/^[a-f0-9]{64}$/u.test(record.correctedRuntimeReceiptRef?.hash || '')) invalid('RECORD_DRIFT');
    materializationReceiptHash = record.correctedRuntimeReceiptRef.hash;
  }
  const loop = verifySeal(record.loop), command = { action: 'finish', content: loop.final };
  if (loop.runtimeBinding?.hash !== dshBindingHash || !loop.sandboxReceipt || loop.calls !== 1
    || loop.toolTrace.length || loop.transcript.length !== 1 || loop.transcript[0].call !== 1
    || loop.transcript[0].receiptHash !== materializationReceiptHash
    || loop.transcript[0].commandHash !== sha256(JSON.stringify(command))
    || loop.directNetworkUsed !== false || loop.trainingTruth !== false) invalid('DSH_DRIFT');
  const correction = verifyFactionStructuralJsonSchemaCorrectionV2({ preparation: record.preparation,
    capsule, authenticated, correctedOutput: loop.final });
  if (hash(correction) !== hash(record.correction)) invalid('CORRECTION_RECORD_DRIFT');
  return { context: record.preparation.context, correction,
    mapping: { baseCapsule: capsule, authenticated, preparationHash: record.preparation.hash } };
}

export function factionParsedWirePhaseCapsuleV2({ input, baseCapsule, value, record, resolveArtifact = null }) {
  [baseCapsule, record].forEach(verifySeal);
  if (record.originalContextHash === baseCapsule.hash) return baseCapsule;
  const expansion = value.sourceContextExpansion;
  let legacyTriggerHostRepair = false;
  if (expansion && value.hostContractRepairScope
    && !value.initialStructuredIssueRef
    && expansion.trigger?.parsedReviewValueRef) {
    const triggerRecord = value.parsedReviewValues?.find(row =>
      row.hash === expansion.trigger.parsedReviewValueRef.hash);
    legacyTriggerHostRepair = triggerRecord?.originalContextHash
        === expansion.trigger.contextCapsuleHash
      && triggerRecord.authenticatedProof?.invocation?.roleRef?.id
        === baseCapsule.roleRef.id + '.host-contract-repair.1';
  }
  const baseResult = legacyTriggerHostRepair
    ? { ...expansion.trigger,
      hostContractRepairScope: value.hostContractRepairScope }
    : expansion?.trigger || value;
  const phases = [{ capsule: baseCapsule, result: baseResult }];
  if (expansion) {
    verifySeal(expansion);
    const triggerOutput = expansion.trigger?.fieldValueSourceHandoff?.completion?.value || expansion.trigger?.loop?.final;
    if (!triggerOutput) invalid('PHASE_CONTEXT_MISSING');
    const triggerParsed = expansion.trigger?.parsedReviewValueRef
      ? value.parsedReviewValues?.find(record => record.hash === expansion.trigger.parsedReviewValueRef.hash) : null;
    const prepared = createFactionReviewSourceExpansionV1({ input, baseCapsule, triggerOutput,
      narrativeCapacityProof: triggerParsed?.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V2.version
        ? triggerParsed.capacityProof : null });
    if (!prepared || prepared.hash !== expansion.preparationHash) invalid('PHASE_CONTEXT_DRIFT');
    // The legacy scope above belongs to the trigger phase, not the fresh
    // expanded-source phase. New artifacts persist the scope on the trigger.
    const expandedResult = legacyTriggerHostRepair
      ? Object.fromEntries(Object.entries(value).filter(([key]) =>
        key !== 'hostContractRepairScope'))
      : value;
    phases.push({ capsule: prepared.context, result: expandedResult });
  }
  // Resolve the requested record against already reconstructed phases before
  // asking for evidence that belongs only to a later Host-repair phase. A
  // source-expansion trigger must not depend on an unrelated final repair.
  const existingPhase = phases.find(phase =>
    phase.capsule.hash === record.originalContextHash);
  if (existingPhase) return existingPhase.capsule;
  for (const phase of [...phases]) {
    const hostRepair = prepareFactionHostContractRepairPhaseV2({ phase,
      resolveArtifact });
    if (!hostRepair) continue;
    const repaired = createFactionReviewHostContractRepairContextCapsuleV1({
      capsule: phase.capsule,
      rejectedCandidate: hostRepair.rejected,
      repairScope: hostRepair.repairScope,
      roleRef: hostRepair.roleRef,
    });
    phases.push({ capsule: repaired, result: value });
  }
  for (const phase of phases) {
    if (phase.capsule.hash === record.originalContextHash) return phase.capsule;
    const prior = value.parsedWireRecoveries?.find(r => r.originalContextHash === phase.capsule.hash);
    if (prior) {
      const prepared = prepareFactionStructuralJsonSchemaRepairV2({ capsule: phase.capsule, authenticated: prior.authenticatedProof });
      if (prepared.context.hash === record.originalContextHash) return prepared.context;
    } else if (phase.result.schemaRepairScope && resolveArtifact) {
      const rejectedCandidate = verifySeal(resolveArtifact(phase.result.schemaRepairScope.rejectedCandidateHash));
      const id = phase.capsule.roleRef.id + '.schema-repair.1';
      const repaired = createFactionReviewSchemaRepairContextCapsuleV1({ capsule: phase.capsule, rejectedCandidate,
        roleRef: { id, version: 'structured-review-v1', hash: hash(id + '.structured-review-v1') } });
      if (repaired.hash === record.originalContextHash) return repaired;
    }
  }
  invalid('PHASE_CONTEXT_DRIFT');
}
