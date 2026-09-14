import { hash, seal, verifySeal, fail } from "../skill-production/common.mjs";
import { createStarcraftTmgOutputContractV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from "../structured-generation/output-contract-registry-v1.mjs";
import { createStrategyEvidenceReviewContractV1 } from "./strategy-evidence-review-v1.mjs";

export function createStrategyEvidenceReviewContractV2() {
  const old = createStrategyEvidenceReviewContractV1();
  const providerSchema = structuredClone(old.providerSchema);
  providerSchema.properties.checks.items.properties.currentSpanIds.maxItems = 128;
  providerSchema.properties.checks.items.properties.sourceSpanIds.maxItems = 128;
  return createStarcraftTmgOutputContractV1({ id: old.id, version: "2.0.0", schemaName: old.schemaName, providerSchema,
    modelOwnedFields: old.modelOwnedFields, hostOwnedFields: old.hostOwnedFields,
    mapperRef: old.mapperRef, semanticValidatorRef: old.semanticValidatorRef, description: old.description });
}

export function normalizeStrategyEvidenceReviewAnchorsV2(prepared, value) {
  verifySeal(prepared);
  const contract = createStrategyEvidenceReviewContractV2();
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(
    contract.providerSchema, value).ok
    || value.checks.length !== prepared.targets.length
    || new Set(value.checks.map(check => check.targetId)).size
      !== value.checks.length) {
    fail('STRATEGY_REVIEW_ANCHOR_NORMALIZATION_NOT_APPLICABLE');
  }
  const currentById = new Map(prepared.currentSpans.map(span => [span.id, span]));
  const sourceById = new Map(prepared.sourceSpans.map(span => [span.id, span]));
  const omitted = [];
  const normalizeIds = (ids, allowed, path) => {
    const seen = new Set(), retained = [];
    ids.forEach((id, index) => {
      const reason = !allowed.has(id) ? 'unknown_host_span'
        : seen.has(id) ? 'duplicate_span' : null;
      if (reason) omitted.push({ path: `${path}[${index}]`, idHash: hash(id), reason });
      else { seen.add(id); retained.push(id); }
    });
    return retained;
  };
  const normalizedValue = { checks: value.checks.map((check, checkIndex) => {
    const target = prepared.targets.find(row => row.targetId === check.targetId);
    if (!target) fail('STRATEGY_REVIEW_ANCHOR_NORMALIZATION_NOT_APPLICABLE');
    const currentSpanIds = normalizeIds(check.currentSpanIds, currentById,
      `$.checks[${checkIndex}].currentSpanIds`);
    const sourceSpanIds = normalizeIds(check.sourceSpanIds, sourceById,
      `$.checks[${checkIndex}].sourceSpanIds`);
    if (!currentSpanIds.some(id => currentById.get(id)?.field === target.field)) {
      fail('STRATEGY_REVIEW_TARGET_EVIDENCE_MISSING');
    }
    return { ...check, currentSpanIds, sourceSpanIds };
  }) };
  const accepted = validateStarcraftTmgProviderJsonSchemaValueV1(
    contract.providerSchema, normalizedValue);
  if (!accepted.ok) fail('STRATEGY_REVIEW_ANCHOR_NORMALIZATION_OUTPUT_INVALID');
  return seal({ schema: 'strategy_evidence_review_anchor_normalization_v1',
    preparedHash: prepared.hash,
    beforeValueHash: hash(value), afterValueHash: hash(normalizedValue),
    value: normalizedValue, omitted,
    changed: omitted.length > 0,
    verdictEdits: 0, explanationEdits: 0,
    providerRegenerationCalls: 0,
    semanticAcceptanceInherited: false,
    sourceReviewIndependentlyVerified: false,
    runtimeAccepted: false,
    trainingTruth: false });
}

export function materializeStrategyEvidenceReviewV2(prepared, value) {
  verifySeal(prepared);
  const contract = createStrategyEvidenceReviewContractV2();
  if (!validateStarcraftTmgProviderJsonSchemaValueV1(contract.providerSchema, value).ok) fail('STRATEGY_REVIEW_OUTPUT_SCHEMA_INVALID');
  if (value.checks.length !== prepared.targets.length || new Set(value.checks.map(c => c.targetId)).size !== value.checks.length) fail('STRATEGY_REVIEW_COVERAGE_INVALID');
  const checks = value.checks.map(check => {
    const target = prepared.targets.find(t => t.targetId === check.targetId);
    if (!target) fail('STRATEGY_REVIEW_COVERAGE_INVALID');
    const currentEvidence = check.currentSpanIds.map(id => prepared.currentSpans.find(s => s.id === id));
    const sourceEvidence = check.sourceSpanIds.map(id => prepared.sourceSpans.find(s => s.id === id));
    if (currentEvidence.some(s => !s) || sourceEvidence.some(s => !s)
      || new Set(check.currentSpanIds).size !== check.currentSpanIds.length
      || new Set(check.sourceSpanIds).size !== check.sourceSpanIds.length) fail('STRATEGY_REVIEW_ANCHOR_INVALID');
    if (!currentEvidence.some(s => s.field === target.field)) fail('STRATEGY_REVIEW_TARGET_EVIDENCE_MISSING');
    return seal({ target, verdict: check.verdict, explanation: check.explanation,
      currentEvidence, sourceEvidence, policyHash: prepared.policyHash,
      issueState: check.verdict === 'defect' ? 'alleged_open_needs_confirmation'
        : check.verdict === 'uncertain' ? 'unresolved' : 'model_reports_no_current_defect',
      mayTriggerAutomaticEdit: false, independentlyAdjudicated: false, trainingTruth: false });
  });
  return seal({ schema: 'strategy_evidence_review_result_v1', inputHash: prepared.inputHash,
    preparedHash: prepared.hash, policyHash: prepared.policyHash, checks,
    semanticCorrectnessProvenByAnchors: false, sourceReviewIndependentlyVerified: false,
    runtimeAccepted: false, trainingTruth: false });
}

