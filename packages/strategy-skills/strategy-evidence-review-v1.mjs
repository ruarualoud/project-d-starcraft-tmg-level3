import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { createStarcraftTmgOutputContractV1, validateStarcraftTmgProviderJsonSchemaValueV1 } from '../structured-generation/output-contract-registry-v1.mjs';

export const REVIEW_FIELDS = Object.freeze(['title', 'when', 'objective', 'decisionProcedure', 'alternatives',
  'opponentBranches', 'risk', 'reviseIf', 'requiredQueries', 'ruleRefs', 'caseIds']);
const string = { type: 'string', minLength: 1, maxLength: 16000 };
const id = { type: 'string', minLength: 1, maxLength: 160 };
const array = (items, minItems, maxItems) => ({ type: 'array', items, minItems, maxItems });
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export function createStrategyEvidenceReviewContractV1() {
  return createStarcraftTmgOutputContractV1({ id: 'strategy.evidence-review', version: '1.0.0',
    schemaName: 'strategy_evidence_review', providerSchema: object({ checks: array(object({ targetId: id,
      verdict: { ...id, enum: ['defect', 'no_defect', 'uncertain'] },
      currentSpanIds: array(id, 1, 8), sourceSpanIds: array(id, 0, 4), explanation: string }), 1, 4) }),
    modelOwnedFields: ['checks'], hostOwnedFields: ['policyHash', 'field', 'sources', 'status', 'runtimeAccepted'],
    mapperRef: { id: 'strategy.evidence-review.materializer', version: '1.0.0', hash: hash('strategy-evidence-review-materializer-v1') },
    semanticValidatorRef: { id: 'strategy.evidence-review.anchors', version: '1.0.0', hash: hash('strategy-evidence-review-anchors-v1') },
    description: 'Current snapshot evidence and opinion, never source truth or autonomous repair authority.' });
}

export function strategyCurrentSpansV1(policy) {
  const spans = [];
  function walk(value, location, field) {
    if (typeof value === 'string') spans.push({ id: location, field, text: value, valueHash: hash(value) });
    else if (Array.isArray(value)) {
      if (!value.length) spans.push({ id: location, field, text: '[]', valueHash: hash(value) });
      else value.forEach((v, i) => walk(v, location + '.' + i, field));
    } else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, location + '.' + k, field));
    else fail('STRATEGY_REVIEW_POLICY_FIELD_INVALID');
  }
  for (const field of REVIEW_FIELDS) walk(policy[field], field, field);
  return spans;
}

export function strategyHistoricalTargetsV1(review) {
  verifySeal(review);
  return review.value.findings.map((finding, index) => ({ targetId: 'issue.' + index,
    kind: 'historical_issue', field: finding.field, allegation: finding.evidence,
    originalFindingHash: hash(finding), originalReviewHash: review.hash,
    priorOpinionAuthority: 'untrusted_requires_current_reassessment' }));
}
export function strategyFieldTargetsV1() {
  return REVIEW_FIELDS.map(field => ({ targetId: 'field.' + field, kind: 'field_audit', field,
    allegation: 'Inspect this current field for concrete source contradictions or decision-content defects. Missing whole-game evidence is a limitation, not permission to invent a rule error.' }));
}

export function prepareStrategyEvidenceReviewV1({ input, policy, history = [], targets }) {
  verifySeal(input);
  if (!Array.isArray(targets) || !targets.length || targets.length > 4
    || new Set(targets.map(t => t.targetId)).size !== targets.length
    || targets.some(t => !REVIEW_FIELDS.includes(t.field) || !['historical_issue', 'field_audit'].includes(t.kind))) fail('STRATEGY_REVIEW_TARGETS_INVALID');
  const currentSpans = strategyCurrentSpansV1(policy);
  const sources = input.workspace.fullFrozenSources.sources;
  const sourceSpans = sources.flatMap((source, i) => source.passages.map((passage, j) => ({
    id: `s${i}.p${j}`, ref: source.ref, spanId: passage.spanId, sourceHash: hash(source), textHash: hash(passage.text), text: passage.text })));
  const body = {
    // Full frozen rules, rules-reference and development context retained.
    workspace: input.workspace,
    historicalArchive: { purpose: 'Audit trail only. Earlier opinions are NOT current facts. Never copy their verdicts.', artifacts: history },
    sourceSpanIndex: sourceSpans.map(({ text, ...span }) => span),
    hostTask: { stage: 'evidence-review', axis: policy.axis,
      instruction: 'Judge ONLY the authoritativeCurrentSnapshot at the END of this request. For a historical_issue, defect means its allegation is STILL TRUE now; no_defect means it is refuted/resolved by the current text. For field_audit, independently inspect that field. Read the complete current field AND related fields, not a truncated quotation or earlier draft. Compare source constraints, exceptions and planning timing. Do not turn missing validation evidence, stylistic preferences or conditional heuristics into rule defects. If not sure, use uncertain. Select existing span IDs rather than retyping quotations or inventing source refs. Give a concise evidence-based explanation in Chinese. An output is an opinion, not permission to edit. Return each requested target exactly once.',
      currentIdentity: hash(policy), historicalOpinionsAreRuleAuthority: false },
    // Deliberately last: current identity, complete current text, and actual targets.
    authoritativeCurrentSnapshot: { policyHash: hash(policy), policy, currentSpans, targets },
  };
  const payload = JSON.stringify(body);
  if (Buffer.byteLength(payload) > 1536 * 1024) fail('STRATEGY_REVIEW_CONTEXT_TOO_LARGE');
  return seal({ schema: 'strategy_evidence_review_input_v1', inputHash: input.hash, policyHash: hash(policy),
    sourceBinding: input.contract.sourceBinding, targets, currentSpans, sourceSpans, payload,
    payloadHash: hash(payload), historyHash: hash(history), trainingTruth: false });
}

export function materializeStrategyEvidenceReviewV1(prepared, value) {
  verifySeal(prepared);
  const contract = createStrategyEvidenceReviewContractV1();
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

// A historical issue gets a new evidence event per candidate, never a mutable
// global "resolved" bit. A changed candidate cannot inherit its disposition.
export function reconcileStrategyReviewOpinionsV1(reports, expectedPolicyHash) {
  const events = [], ids = new Set();
  for (const report of reports) {
    verifySeal(report);
    if (report.policyHash !== expectedPolicyHash) fail('STRATEGY_REVIEW_CANDIDATE_DRIFT');
    for (const check of report.checks) {
      verifySeal(check);
      if (check.policyHash !== expectedPolicyHash || ids.has(check.target.targetId)) fail('STRATEGY_REVIEW_COVERAGE_INVALID');
      ids.add(check.target.targetId);
      events.push(seal({ targetId: check.target.targetId, originalFindingHash: check.target.originalFindingHash || null,
        policyHash: expectedPolicyHash, evidenceHash: check.hash, state: check.issueState,
        mayTriggerAutomaticEdit: false, trainingTruth: false }));
    }
  }
  return seal({ schema: 'strategy_review_issue_events_v1', policyHash: expectedPolicyHash, events,
    open: events.filter(e => e.state === 'alleged_open_needs_confirmation').length,
    uncertain: events.filter(e => e.state === 'unresolved').length,
    modelReportedClear: events.filter(e => e.state === 'model_reports_no_current_defect').length,
    automaticRepairFields: [], runtimeAccepted: false, trainingTruth: false });
}
