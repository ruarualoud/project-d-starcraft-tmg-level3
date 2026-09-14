import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { validateStrategyDraftV1 } from './strategy-contract-v1.mjs';
import { prepareStrategyEvidenceReviewV1, strategyFieldTargetsV1,
  reconcileStrategyReviewOpinionsV1, REVIEW_FIELDS } from './strategy-evidence-review-v1.mjs';

export const OPPONENT_RESPONSE_PARENT_POLICY_HASH_V1 = '3d10260170272a1f4ab5442a9aa3e94aa765ad0e8f538288095364040db2e52c';
const CLASSIFICATIONS = new Set(['contradicted_by_source', 'unsupported_rule_claim',
  'missing_exception', 'citation_mismatch', 'strategy_hypothesis_unlabelled', 'source_conflict']);
const AUTHORITIES = new Set(['exact_official_source', 'model_patch_requires_confirmation', 'human_adjudication_required']);

function resolveEvidence(input, rows) {
  if (!Array.isArray(rows) || !rows.length) fail('STRATEGY_SOURCE_AUDIT_EVIDENCE_REQUIRED');
  return rows.map(row => {
    const source = input.workspace.fullFrozenSources.sources.find(item => item.ref === row.ref);
    const passage = source?.passages.find(item => item.spanId === row.spanId
      && item.text.includes(row.requiredExcerpt));
    if (!source || !passage) fail('STRATEGY_SOURCE_AUDIT_EVIDENCE_DRIFT', { ref: row.ref, spanId: row.spanId });
    return seal({ ref: source.ref, sourceHash: hash(source), spanId: passage.spanId,
      textHash: hash(passage.text), requiredExcerptHash: hash(row.requiredExcerpt) });
  });
}

function validatePolicy(input, policy) {
  const { hash: omitted, ...contract } = input.contract;
  validateStrategyDraftV1({ policies: [policy] }, seal({ ...contract, requiredAxes: [policy.axis] }), {
    allowedRuleRefs: input.workspace.fullFrozenSources.sources.map(source => source.ref),
    allowedCaseIds: input.workspace.developmentCases.map(testCase => testCase.caseId),
  });
}

export function createBoundStrategySourceAuditV1({ input, candidate, checkedFields, findings, auditorClass }) {
  verifySeal(input); verifySeal(candidate);
  if (candidate.inputHash !== input.hash || !Array.isArray(checkedFields) || !checkedFields.length
    || new Set(checkedFields).size !== checkedFields.length || checkedFields.some(field => !REVIEW_FIELDS.includes(field))
    || !['independent_source_read', 'rules_oracle', 'human_review'].includes(auditorClass)
    || !Array.isArray(findings)) fail('STRATEGY_SOURCE_AUDIT_INPUT_INVALID');
  const materialized = findings.map((finding, index) => {
    if (!checkedFields.includes(finding.field) || !CLASSIFICATIONS.has(finding.classification)
      || !AUTHORITIES.has(finding.resolutionAuthority) || !finding.statement
      || !Array.isArray(finding.paths) || !finding.paths.length) fail('STRATEGY_SOURCE_AUDIT_FINDING_INVALID');
    return seal({ id: finding.id || `finding.${index}`, field: finding.field, paths: finding.paths,
      classification: finding.classification, statement: finding.statement,
      sourceEvidence: resolveEvidence(input, finding.sourceEvidence),
      resolutionAuthority: finding.resolutionAuthority, state: finding.resolutionAuthority === 'human_adjudication_required'
        ? 'open_human_adjudication' : 'open_source_correction', trainingTruth: false });
  });
  const fullCoverage = REVIEW_FIELDS.every(field => checkedFields.includes(field));
  const route = materialized.some(finding => finding.resolutionAuthority === 'human_adjudication_required')
    ? 'human_adjudication_required'
    : materialized.length && materialized.every(finding => finding.resolutionAuthority === 'exact_official_source')
      ? 'exact_host_field_patch_allowed'
      : materialized.length ? 'targeted_model_patch_then_confirmation' : fullCoverage
        ? 'audit_clear_pending_non_model_acceptance' : 'partial_audit_no_global_disposition';
  return seal({ schema: 'strategy_bound_source_audit_v1', inputHash: input.hash,
    candidateHash: candidate.hash, policyHash: hash(candidate.policy), axis: candidate.axis,
    checkedFields, fullCoverage, auditorClass, findings: materialized, route,
    sourceReviewPassed: false, mayTriggerAutomaticEdit: false,
    canAffectRules: false, runtimeAccepted: false, trainingTruth: false });
}

export function prepareStrategySourceCorrectionV1({ input, candidate, audit, proposedPolicy,
  proposalAuthorship = 'host_exact_source', priorPolicyHashes = [] }) {
  verifySeal(input); verifySeal(candidate); verifySeal(audit);
  if (audit.inputHash !== input.hash || audit.candidateHash !== candidate.hash
    || audit.policyHash !== hash(candidate.policy) || audit.axis !== candidate.axis
    || !['host_exact_source', 'model_field_patch'].includes(proposalAuthorship)
    || !audit.findings.length) fail('STRATEGY_SOURCE_CORRECTION_BINDING_DRIFT');
  if (audit.findings.some(finding => finding.resolutionAuthority === 'human_adjudication_required')) {
    fail('STRATEGY_SOURCE_ADJUDICATION_REQUIRED');
  }
  if (proposalAuthorship === 'host_exact_source'
    && audit.findings.some(finding => finding.resolutionAuthority !== 'exact_official_source')) {
    fail('STRATEGY_SOURCE_CORRECTION_AUTHORITY_INVALID');
  }
  validatePolicy(input, proposedPolicy);
  const authorizedFields = [...new Set(audit.findings.map(finding => finding.field))];
  const changedFields = Object.keys(candidate.policy)
    .filter(field => hash(candidate.policy[field]) !== hash(proposedPolicy[field]));
  if (hash(changedFields) !== hash(authorizedFields) || !changedFields.length
    || priorPolicyHashes.includes(hash(proposedPolicy))) fail('STRATEGY_SOURCE_CORRECTION_SCOPE_INVALID');
  return seal({ schema: 'strategy_source_correction_plan_v1', inputHash: input.hash,
    candidateHash: candidate.hash, parentPolicyHash: hash(candidate.policy), auditHash: audit.hash,
    proposalAuthorship, authorizedFields, changedFields,
    beforeValueHashes: Object.fromEntries(changedFields.map(field => [field, hash(candidate.policy[field])])),
    afterValueHashes: Object.fromEntries(changedFields.map(field => [field, hash(proposedPolicy[field])])),
    policy: proposedPolicy, state: 're_audit_required', sourceReviewPassed: false,
    semanticAcceptanceInherited: false, canAffectRules: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function prepareOpponentResponsePassCorrectionV1({ input, candidate }) {
  if (candidate.axis !== 'opponent_response' || hash(candidate.policy) !== OPPONENT_RESPONSE_PARENT_POLICY_HASH_V1) {
    fail('OPPONENT_RESPONSE_PARENT_DRIFT');
  }
  const audit = createBoundStrategySourceAuditV1({ input, candidate,
    checkedFields: ['opponentBranches'], auditorClass: 'independent_source_read', findings: [{
      id: 'opponent-pass-next-phase-marker', field: 'opponentBranches', paths: ['opponentBranches.0'],
      classification: 'contradicted_by_source',
      statement: 'The wording implies that passing changes the current activation order and lets the passer act first; the official rule grants the marker for the following phase and its holder chooses the first actor.',
      sourceEvidence: [
        { ref: 'core.iuUyObNTQ2M8xK4IUqzC.items.2.subItems.0', spanId: 'p1',
          requiredExcerpt: 'The first player to Pass in a Phase takes the First Player Marker for the next Phase.' },
        { ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.26', spanId: 'p1',
          requiredExcerpt: 'The holder of the First Player Marker chooses which player activates first at the start of each Phase.' },
      ], resolutionAuthority: 'exact_official_source',
    }] });
  const policy = structuredClone(candidate.policy);
  policy.opponentBranches[0] = {
    response: '对手首先Pass并取得下一阶段First Player Marker，随后在下一阶段选择首个行动方',
    adaptation: '本阶段完成仍有价值的剩余合法激活；进入下一阶段后，不假设己方先行动，并在标记持有者选择首个行动方后重新评估下一步',
  };
  const correction = prepareStrategySourceCorrectionV1({ input, candidate, audit,
    proposedPolicy: policy, proposalAuthorship: 'host_exact_source', priorPolicyHashes: [hash(candidate.policy)] });
  return seal({ schema: 'strategy_opponent_pass_correction_v1', audit, correction,
    sourceReviewPassed: false, runtimeAccepted: false, trainingTruth: false });
}

export function createStrategySourceCorrectionWorkflowV1({ input, reviewer, store }) {
  if (typeof reviewer?.review !== 'function' || typeof store?.acquire !== 'function') fail('STRATEGY_RUNTIME_PORTS_REQUIRED');
  async function repairOpponentResponsePass(candidate) {
    const preparedCorrection = prepareOpponentResponsePassCorrectionV1({ input, candidate });
    const history = [...candidate.roleHistory, ...(candidate.reviews || []), candidate.lifecycle,
      preparedCorrection.audit, preparedCorrection.correction];
    const reviews = [], targets = strategyFieldTargetsV1();
    for (let start = 0; start < targets.length; start += 4) {
      const prepared = prepareStrategyEvidenceReviewV1({ input, policy: preparedCorrection.correction.policy,
        history, targets: targets.slice(start, start + 4) });
      const result = await reviewer.review(prepared); verifySeal(result); verifySeal(result.evidence);
      if (result.preparedHash !== prepared.hash
        || result.evidence.policyHash !== hash(preparedCorrection.correction.policy)) {
        fail('STRATEGY_SOURCE_CORRECTION_REVIEW_DRIFT');
      }
      reviews.push(result);
    }
    const lifecycle = reconcileStrategyReviewOpinionsV1(reviews.map(result => result.evidence),
      hash(preparedCorrection.correction.policy));
    const result = seal({ schema: 'strategy_source_corrected_candidate_v1', inputHash: input.hash,
      axis: candidate.axis, policy: preparedCorrection.correction.policy,
      parentCandidateHash: candidate.hash, roleHistory: history, reviews, lifecycle,
      auditHash: preparedCorrection.audit.hash, correctionHash: preparedCorrection.correction.hash,
      status: lifecycle.open || lifecycle.uncertain ? 'needs_independent_adjudication'
        : 'model_review_clear_pending_independent_validation',
      targetedSourceRepairVerified: true, sourceReviewIndependentlyVerified: false,
      strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
    const lease = store.acquire('source-corrected-candidate.' + result.hash.slice(0, 48), { candidateHash: result.hash });
    return lease.cached ? lease.artifact : store.finish(lease, result);
  }
  return Object.freeze({ repairOpponentResponsePass });
}
