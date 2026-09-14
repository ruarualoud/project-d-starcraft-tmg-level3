import { DatabaseSync } from 'node:sqlite';
import { fail, hash, safe, seal, verifySeal } from '../skill-production/common.mjs';
import { repairStrategyDecisionComparisonCoverageV1,
  repairAcceptedStrategyDecisionComparisonCoverageV1 } from './strategy-decision-local-repair-v1.mjs';
import { gradeStrategyDecisionV1 } from './strategy-case-compiler-v1.mjs';

const ACCEPTED_REVIEW_SCHEMA = 'strategy_evidence_review_artifact_v1';
const QUARANTINED_REVIEW_SCHEMA = 'strategy_evidence_review_quarantine_v1';
const AMBIGUOUS_CODE = 'STRUCTURED_PROVIDER_AMBIGUOUS_SEND';
const BODY_FIELDS = ['preparedHash', 'payloadHash', 'contractHash', 'executionPolicyHash', 'capabilityReceiptHash'];
const ROLE_BODY_FIELDS = ['inputHash', 'axis', 'stage', 'round', 'kind', 'payloadHash',
  'contractHash', 'executionPolicyHash', 'capabilityReceiptHash'];

function decode(raw) {
  return raw === null || raw === undefined ? null : verifySeal(JSON.parse(raw)).value;
}

function acceptedReview(row) {
  const artifact = decode(row.artifact);
  if (!artifact || artifact.schema !== ACCEPTED_REVIEW_SCHEMA) return null;
  verifySeal(artifact); verifySeal(artifact.evidence);
  const input = Object.fromEntries(BODY_FIELDS.map(field => [field, artifact[field]]));
  if (row.state !== 'complete' || row.id !== 'evidence-review.' + artifact.preparedHash.slice(0, 48)
    || row.input_hash !== hash(safe(input)) || artifact.runtimeAccepted !== false
    || artifact.trainingTruth !== false) fail('GENERAL_FINALIZATION_INHERITED_REVIEW_INVALID');
  return { id: row.id, inputHash: row.input_hash, input, artifact,
    artifactHash: artifact.hash, evidenceHash: artifact.evidence.hash };
}

// An ambiguous request is never retried in-place. This inspection freezes the
// terminal parent, charges its full reservation, and exposes only successful,
// input-identical high-level review artifacts to a versioned child run.
export function inspectGeneralFinalizationContinuationV1({ filename, parentRunId,
  parentRecipe, parentReport, expectedInheritedReviews }) {
  [parentRecipe, parentReport].forEach(verifySeal);
  if (!Number.isSafeInteger(expectedInheritedReviews) || expectedInheritedReviews < 1
    || parentReport.schema !== 'ticket18_general_strategy_finalization_report_v1'
    || parentReport.runId !== parentRunId || parentReport.recipeHash !== parentRecipe.hash
    || parentReport.failure?.code !== AMBIGUOUS_CODE || parentReport.formalGeneralSkillCompleted !== false
    || parentReport.runtimeAccepted !== false || parentReport.trainingTruth !== false) {
    fail('GENERAL_FINALIZATION_CONTINUATION_PARENT_INVALID');
  }
  const db = new DatabaseSync(filename, { readOnly: true });
  let run, attempts, rows;
  try {
    run = db.prepare('SELECT * FROM runs WHERE id=?').get(parentRunId);
    attempts = db.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(parentRunId);
    rows = db.prepare("SELECT id,input_hash,state,artifact FROM steps WHERE run=? AND id LIKE 'evidence-review.%' ORDER BY id")
      .all(parentRunId);
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) {
      fail('GENERAL_FINALIZATION_CONTINUATION_PARENT_NOT_TERMINAL');
    }
  } finally { db.close(); }
  if (!run || run.recipe !== parentRecipe.hash || parentReport.ledger?.calls !== attempts.length
    || parentReport.sourceAxesAccepted.length * 3 !== expectedInheritedReviews
    || parentReport.sourceFieldsAccepted !== parentReport.sourceAxesAccepted.length * 11) {
    fail('GENERAL_FINALIZATION_CONTINUATION_PARENT_DRIFT');
  }
  const ambiguous = attempts.filter(row => row.state === 'failed' && row.code === AMBIGUOUS_CODE);
  if (ambiguous.length !== 1 || ambiguous[0].usage !== null || ambiguous[0].settled !== null) {
    fail('GENERAL_FINALIZATION_CONTINUATION_AMBIGUOUS_ATTEMPT_INVALID');
  }
  const failureReceipt = decode(ambiguous[0].response);
  if (failureReceipt?.code !== AMBIGUOUS_CODE || failureReceipt.requestDefinitelyNotSent !== false
    || failureReceipt.requestMayHaveBeenSent !== true || failureReceipt.physicalAttempts !== 1
    || failureReceipt.automaticRetries !== 0 || failureReceipt.usageKnown !== false) {
    fail('GENERAL_FINALIZATION_CONTINUATION_FAILURE_RECEIPT_INVALID');
  }
  const accepted = rows.map(acceptedReview).filter(Boolean);
  if (accepted.length !== expectedInheritedReviews
    || rows.filter(row => decode(row.artifact)?.schema === QUARANTINED_REVIEW_SCHEMA).length !== 1) {
    fail('GENERAL_FINALIZATION_CONTINUATION_REVIEW_DENOMINATOR_INVALID');
  }
  const steps = accepted.map(({ input, artifact, ...entry }) => entry);
  const manifest = seal({ schema: 'ticket18_general_finalization_continuation_manifest_v1',
    parentRunId, parentRecipeHash: parentRecipe.hash, parentReportHash: parentReport.hash,
    ambiguousAttemptId: ambiguous[0].id, ambiguousRequestHash: ambiguous[0].request_hash,
    ambiguousFailureReceiptHash: failureReceipt.receiptHash || failureReceipt.hash,
    ambiguousAttemptChargedAtFullReservation: true, ambiguousReservationMicros: ambiguous[0].reserve,
    automaticRetryPerformed: false, inheritedReviews: accepted.length, steps,
    quarantinedReviewsInherited: 0, sourceRefreshPerformed: false,
    runtimeAccepted: false, trainingTruth: false });
  return { manifest, inheritedSteps: new Map(accepted.map(entry => [entry.id, entry])) };
}

export function withGeneralFinalizationContinuationV1(store, continuation) {
  verifySeal(continuation.manifest);
  const inheritedSteps = continuation.inheritedSteps;
  if (!(inheritedSteps instanceof Map)
    || inheritedSteps.size !== continuation.manifest.inheritedReviews) {
    fail('GENERAL_FINALIZATION_CONTINUATION_MAP_INVALID');
  }
  const used = new Set();
  return Object.freeze({ ...store,
    acquire(id, input, ...rest) {
      const inherited = inheritedSteps.get(id);
      if (!inherited) return store.acquire(id, input, ...rest);
      if (hash(safe(input)) !== inherited.inputHash) fail('GENERAL_FINALIZATION_INHERITED_INPUT_DRIFT');
      const receiptInput = { continuationHash: continuation.manifest.hash,
        parentRunId: continuation.manifest.parentRunId, stepId: id,
        inputHash: inherited.inputHash, artifactHash: inherited.artifactHash };
      const receiptLease = store.acquire('inherited.' + id, receiptInput);
      if (!receiptLease.cached) store.finish(receiptLease, seal({
        schema: 'general_finalization_inherited_review_receipt_v1', ...receiptInput,
        sourceEvidenceHash: inherited.evidenceHash, providerCalls: 0,
        runtimeAccepted: false, trainingTruth: false }));
      const lease = store.acquire(id, input, ...rest);
      const artifact = lease.cached ? lease.artifact : store.finish(lease, inherited.artifact);
      if (artifact.hash !== inherited.artifactHash) fail('GENERAL_FINALIZATION_INHERITED_ARTIFACT_DRIFT');
      used.add(id);
      return { cached: true, artifact };
    },
    evidence() {
      const ids = [...used].sort();
      return seal({ schema: 'general_finalization_inheritance_evidence_v1',
        continuationManifestHash: continuation.manifest.hash,
        usedInheritedReviews: ids.length, stepIds: ids,
        providerCalls: 0, quarantinedReviewsInherited: 0,
        runtimeAccepted: false, trainingTruth: false });
    },
  });
}

export function inspectGeneralFinalizationSchemaRepairContinuationV1({ filename, parentRunId,
  parentRecipe, parentReport, input, compiled, policy, expectedInheritedReviews }) {
  [parentRecipe, parentReport, input, compiled].forEach(verifySeal);
  if (!Number.isSafeInteger(expectedInheritedReviews) || expectedInheritedReviews < 1
    || parentReport.schema !== 'ticket18_general_strategy_finalization_continuation_report_v1'
    || parentReport.runId !== parentRunId || parentReport.recipeHash !== parentRecipe.hash
    || parentReport.failure?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || parentReport.formalGeneralSkillCompleted !== false || parentReport.sourceAxesAccepted.length !== 7
    || parentReport.sourceFieldsAccepted !== 77 || parentReport.runtimeAccepted !== false
    || parentReport.trainingTruth !== false) fail('GENERAL_FINALIZATION_SCHEMA_PARENT_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  let run, attempts, reviewRows, roleRows;
  try {
    run = db.prepare('SELECT * FROM runs WHERE id=?').get(parentRunId);
    attempts = db.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(parentRunId);
    reviewRows = db.prepare("SELECT id,input_hash,state,artifact FROM steps WHERE run=? AND id LIKE 'evidence-review.%' ORDER BY id")
      .all(parentRunId);
    roleRows = db.prepare("SELECT id,input_hash,state,artifact FROM steps WHERE run=? AND id LIKE 'strategy-role.%' ORDER BY id")
      .all(parentRunId);
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) {
      fail('GENERAL_FINALIZATION_SCHEMA_PARENT_NOT_TERMINAL');
    }
  } finally { db.close(); }
  if (!run || run.recipe !== parentRecipe.hash || parentReport.ledger?.calls !== attempts.length) {
    fail('GENERAL_FINALIZATION_SCHEMA_PARENT_DRIFT');
  }
  const inherited = reviewRows.map(acceptedReview).filter(Boolean);
  if (inherited.length !== expectedInheritedReviews
    || reviewRows.some(row => decode(row.artifact)?.schema === QUARANTINED_REVIEW_SCHEMA)) {
    fail('GENERAL_FINALIZATION_SCHEMA_REVIEW_DENOMINATOR_INVALID');
  }
  const failures = attempts.filter(row => row.state === 'failed' && row.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID');
  if (failures.length !== 1 || failures[0].usage === null || failures[0].settled === null) {
    fail('GENERAL_FINALIZATION_SCHEMA_ATTEMPT_INVALID');
  }
  const failureReceipt = decode(failures[0].response);
  if (failureReceipt?.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID' || failureReceipt.status !== 200
    || failureReceipt.usageKnown !== true || failureReceipt.physicalAttempts !== 1
    || failureReceipt.automaticRetries !== 0 || failureReceipt.schemaIssues?.length !== 1
    || failureReceipt.schemaIssues[0].path !== '$.comparisons'
    || failureReceipt.schemaIssues[0].code !== 'array_too_short') {
    fail('GENERAL_FINALIZATION_SCHEMA_FAILURE_RECEIPT_INVALID');
  }
  const expectedRoleId = 'strategy-role.' + hash({ input: input.hash, axis: policy.axis,
    stage: 'decision-consumer', round: 0,
    evaluation: { case: compiled.prompt.hash, policy: hash(policy) } }).slice(0, 48);
  const roleRow = roleRows.find(row => row.id === expectedRoleId);
  const quarantine = roleRow ? decode(roleRow.artifact) : null;
  if (!quarantine || quarantine.schema !== 'strategy_role_quarantine_v1'
    || quarantine.status !== 'quarantined' || quarantine.code !== 'STRUCTURED_PROVIDER_SCHEMA_INVALID'
    || quarantine.inputHash !== input.hash || quarantine.axis !== policy.axis
    || quarantine.stage !== 'decision-consumer' || quarantine.kind !== 'decision'
    || quarantine.outcome?.issueRef?.rejectedCandidateRef?.id
      !== failures[0].id + '.rejected-candidate') fail('GENERAL_FINALIZATION_SCHEMA_ROLE_INVALID');
  const roleInput = Object.fromEntries(ROLE_BODY_FIELDS.map(field => [field, quarantine[field]]));
  if (roleRow.input_hash !== hash(safe(roleInput))) fail('GENERAL_FINALIZATION_SCHEMA_ROLE_INPUT_DRIFT');
  const db2 = new DatabaseSync(filename, { readOnly: true });
  let rejectedRow;
  try {
    rejectedRow = db2.prepare('SELECT id,input_hash,state,artifact FROM steps WHERE run=? AND id=?')
      .get(parentRunId, failures[0].id + '.rejected-candidate');
  } finally { db2.close(); }
  const rejected = rejectedRow ? decode(rejectedRow.artifact) : null;
  if (!rejected || rejectedRow.state !== 'complete'
    || rejected.hash !== quarantine.outcome.issueRef.rejectedCandidateRef.hash
    || rejected.safeReceiptHash !== failureReceipt.receiptHash) {
    fail('GENERAL_FINALIZATION_SCHEMA_REJECTED_CANDIDATE_INVALID');
  }
  const repair = repairStrategyDecisionComparisonCoverageV1({ compiled, rejectedCandidate: rejected });
  const artifact = seal({ schema: 'strategy_role_artifact_v1', ...roleInput, value: repair.value,
    structuredCandidateRef: { id: rejectedRow.id, hash: rejected.hash },
    receiptRef: quarantine.outcome.receiptRef, localRepairRef: repair.hash,
    runtimeAccepted: false, trainingTruth: false });
  const steps = inherited.map(({ input: omittedInput, artifact: omittedArtifact, ...entry }) => entry);
  const manifest = seal({ schema: 'ticket18_general_finalization_schema_repair_continuation_manifest_v1',
    parentRunId, parentRecipeHash: parentRecipe.hash, parentReportHash: parentReport.hash,
    failedAttemptId: failures[0].id, failureReceiptHash: failureReceipt.receiptHash,
    inheritedReviews: inherited.length, steps, locallyRepairedRoleId: expectedRoleId,
    localRepairHash: repair.hash, repairedFields: ['comparisons'], providerRegenerationCalls: 0,
    originalFailedAttemptReused: false, sourceRefreshPerformed: false,
    runtimeAccepted: false, trainingTruth: false });
  return { manifest, inheritedSteps: new Map(inherited.map(entry => [entry.id, entry])),
    localStep: { id: expectedRoleId, inputHash: roleRow.input_hash, input: roleInput, artifact, repair } };
}

export function withGeneralFinalizationSchemaRepairContinuationV1(store, continuation) {
  const inherited = withGeneralFinalizationContinuationV1(store, continuation);
  const local = continuation.localStep; let localUsed = false;
  return Object.freeze({ ...inherited,
    acquire(id, input, ...rest) {
      if (id !== local.id) return inherited.acquire(id, input, ...rest);
      if (hash(safe(input)) !== local.inputHash) fail('GENERAL_FINALIZATION_LOCAL_REPAIR_INPUT_DRIFT');
      const receiptInput = { continuationHash: continuation.manifest.hash,
        parentRunId: continuation.manifest.parentRunId, stepId: id,
        inputHash: local.inputHash, artifactHash: local.artifact.hash, localRepairHash: local.repair.hash };
      const receiptLease = store.acquire('locally-repaired.' + id, receiptInput);
      if (!receiptLease.cached) store.finish(receiptLease, seal({
        schema: 'ticket18_general_finalization_local_repair_inheritance_v1', ...receiptInput,
        providerCalls: 0, runtimeAccepted: false, trainingTruth: false }));

      const lease = store.acquire(id, input, ...rest);
      const artifact = lease.cached ? lease.artifact : store.finish(lease, local.artifact);
      if (artifact.hash !== local.artifact.hash) fail('GENERAL_FINALIZATION_LOCAL_REPAIR_ARTIFACT_DRIFT');
      localUsed = true; return { cached: true, artifact };
    },
    evidence() {
      const reviewEvidence = inherited.evidence();
      return seal({ schema: 'ticket18_general_finalization_schema_continuation_evidence_v1',
        continuationManifestHash: continuation.manifest.hash,
        usedInheritedReviews: reviewEvidence.usedInheritedReviews,
        inheritedReviewStepIds: reviewEvidence.inheritedReviewStepIds,
        localRepairUsed: localUsed, localRepairHash: local.repair.hash,
        locallyRepairedRoleId: local.id, providerRegenerationCalls: 0,
        runtimeAccepted: false, trainingTruth: false });
    },
  });
}

function roleStep(row) {
  const artifact = decode(row?.artifact);
  if (!artifact || artifact.schema !== 'strategy_role_artifact_v1' || row.state !== 'complete') {
    fail('GENERAL_FINALIZATION_DECISION_STEP_INVALID');
  }
  const input = Object.fromEntries(ROLE_BODY_FIELDS.map(field => [field, artifact[field]]));
  if (row.input_hash !== hash(safe(input))) fail('GENERAL_FINALIZATION_DECISION_STEP_INPUT_DRIFT');
  return { id: row.id, inputHash: row.input_hash, input, artifact, artifactHash: artifact.hash };
}

export function inspectGeneralFinalizationDynamicCoverageContinuationV1({ filename, parentRunId,
  parentRecipe, parentReport, input, corpus, candidates, expectedInheritedReviews }) {
  [parentRecipe, parentReport, input, corpus, ...candidates].forEach(verifySeal);
  if (parentReport.schema !== 'ticket18_general_strategy_finalization_schema_continuation_report_v1'
    || parentReport.runId !== parentRunId || parentReport.recipeHash !== parentRecipe.hash
    || parentReport.failure?.code !== 'STRATEGY_COMPARISON_INCOMPLETE'
    || parentReport.formalGeneralSkillCompleted !== false || parentReport.sourceAxesAccepted.length !== 7
    || parentReport.sourceFieldsAccepted !== 77 || parentReport.caseResults < 1
    || parentReport.runtimeAccepted !== false || parentReport.trainingTruth !== false) {
    fail('GENERAL_FINALIZATION_DYNAMIC_PARENT_INVALID');
  }
  const db = new DatabaseSync(filename, { readOnly: true });
  let run, attempts, reviewRows, roleRows;
  try {
    run = db.prepare('SELECT * FROM runs WHERE id=?').get(parentRunId);
    attempts = db.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(parentRunId);
    reviewRows = db.prepare("SELECT id,input_hash,state,artifact FROM steps WHERE run=? AND id LIKE 'evidence-review.%' ORDER BY id")
      .all(parentRunId);
    roleRows = db.prepare("SELECT id,input_hash,state,artifact FROM steps WHERE run=? AND id LIKE 'strategy-role.%' ORDER BY id")
      .all(parentRunId);
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) {
      fail('GENERAL_FINALIZATION_DYNAMIC_PARENT_NOT_TERMINAL');
    }
  } finally { db.close(); }
  if (!run || run.recipe !== parentRecipe.hash || parentReport.ledger?.calls !== attempts.length
    || attempts.some(row => row.state !== 'received')) fail('GENERAL_FINALIZATION_DYNAMIC_PARENT_DRIFT');
  const reviews = reviewRows.map(acceptedReview).filter(Boolean);
  if (reviews.length !== expectedInheritedReviews) fail('GENERAL_FINALIZATION_DYNAMIC_REVIEW_DENOMINATOR_INVALID');
  const flattened = corpus.cases.flatMap(compiled => compiled.prompt.policyAxes.map(axis => ({ compiled, axis })));
  const completed = flattened.slice(0, parentReport.caseResults);
  const failing = flattened[parentReport.caseResults];
  if (!failing) fail('GENERAL_FINALIZATION_DYNAMIC_CASE_DENOMINATOR_INVALID');
  const byId = new Map(roleRows.map(row => [row.id, row]));
  const expected = ({ compiled, axis }) => {
    const policy = candidates.find(row => row.axis === axis)?.policy;
    if (!policy) fail('GENERAL_FINALIZATION_DYNAMIC_POLICY_MISSING');
    const id = 'strategy-role.' + hash({ input: input.hash, axis, stage: 'decision-consumer', round: 0,
      evaluation: { case: compiled.prompt.hash, policy: hash(policy) } }).slice(0, 48);
    return { id, policy };
  };
  const passedDecisions = completed.map(entry => {
    const { id } = expected(entry); const step = roleStep(byId.get(id));
    const grade = gradeStrategyDecisionV1(entry.compiled, step.artifact.value);
    if (!grade.decisionPreferencePassed || !grade.legalCandidateSelected || !grade.rationaleStructurePassed) {
      fail('GENERAL_FINALIZATION_DYNAMIC_PRIOR_DECISION_FAILED');
    }
    return { ...step, caseId: entry.compiled.prompt.caseId, axis: entry.axis, gradeHash: grade.hash };
  });
  const failedExpected = expected(failing);
  const failedStep = roleStep(byId.get(failedExpected.id));
  const repair = repairAcceptedStrategyDecisionComparisonCoverageV1({ compiled: failing.compiled,
    roleArtifact: failedStep.artifact });
  const repairedArtifact = seal({ ...Object.fromEntries(Object.entries(failedStep.artifact)
    .filter(([key]) => key !== 'hash')), value: repair.value, localRepairRef: repair.hash,
    runtimeAccepted: false, trainingTruth: false });
  const inherited = [...reviews, ...passedDecisions];
  const steps = inherited.map(({ input: omittedInput, artifact: omittedArtifact, ...entry }) => entry);
  const manifest = seal({ schema: 'ticket18_general_finalization_dynamic_coverage_continuation_manifest_v1',
    parentRunId, parentRecipeHash: parentRecipe.hash, parentReportHash: parentReport.hash,
    inheritedReviews: reviews.length, inheritedPassedDecisions: passedDecisions.length, steps,
    locallyRepairedRoleId: failedStep.id, localRepairHash: repair.hash,
    failedCaseId: failing.compiled.prompt.caseId, failedAxis: failing.axis,
    providerRegenerationCalls: 0, repairedFields: ['comparisons'],
    runtimeAccepted: false, trainingTruth: false });
  return { manifest, inheritedSteps: new Map(inherited.map(entry => [entry.id, entry])),
    localStep: { ...failedStep, artifact: repairedArtifact, repair } };
}

export function withGeneralFinalizationDynamicCoverageContinuationV1(store, continuation) {
  verifySeal(continuation.manifest);
  const used = new Set(); let localUsed = false;
  const materialize = (entry, id, input, kind) => {
    if (hash(safe(input)) !== entry.inputHash) fail('GENERAL_FINALIZATION_DYNAMIC_INHERITED_INPUT_DRIFT');
    const receiptInput = { continuationHash: continuation.manifest.hash,
      parentRunId: continuation.manifest.parentRunId, stepId: id,
      inputHash: entry.inputHash, artifactHash: entry.artifact.hash, kind };
    const receiptLease = store.acquire(`${kind}.${id}`, receiptInput);
    if (!receiptLease.cached) store.finish(receiptLease, seal({
      schema: 'ticket18_general_finalization_dynamic_inheritance_v1', ...receiptInput,
      providerCalls: 0, runtimeAccepted: false, trainingTruth: false }));
    const lease = store.acquire(id, input);
    const artifact = lease.cached ? lease.artifact : store.finish(lease, entry.artifact);
    if (artifact.hash !== entry.artifact.hash) fail('GENERAL_FINALIZATION_DYNAMIC_ARTIFACT_DRIFT');
    return artifact;
  };
  return Object.freeze({ ...store,
    acquire(id, input, ...rest) {
      const inherited = continuation.inheritedSteps.get(id);
      if (inherited) { used.add(id); return { cached: true, artifact: materialize(inherited, id, input, 'inherited') }; }
      if (id === continuation.localStep.id) {
        localUsed = true;
        return { cached: true, artifact: materialize(continuation.localStep, id, input, 'locally-repaired') };
      }
      return store.acquire(id, input, ...rest);
    },
    evidence() {
      const reviewIds = new Set(continuation.manifest.steps.slice(0, continuation.manifest.inheritedReviews).map(row => row.id));
      return seal({ schema: 'ticket18_general_finalization_dynamic_continuation_evidence_v1',
        continuationManifestHash: continuation.manifest.hash,
        usedInheritedReviews: [...used].filter(id => reviewIds.has(id)).length,
        usedInheritedDecisions: [...used].filter(id => !reviewIds.has(id)).length,
        localRepairUsed: localUsed, localRepairHash: continuation.localStep.repair.hash,
        providerRegenerationCalls: 0, runtimeAccepted: false, trainingTruth: false });
    },
  });
}

export function inspectGeneralFinalizationLastCaseAmbiguousContinuationV1({ filename, parentRunId,
  parentRecipe, parentReport, input, corpus, candidates }) {
  [parentRecipe, parentReport, input, corpus, ...candidates].forEach(verifySeal);
  if (parentReport.schema !== 'ticket18_general_strategy_finalization_dynamic_continuation_report_v1'
    || parentReport.runId !== parentRunId || parentReport.recipeHash !== parentRecipe.hash
    || parentReport.failure?.code !== AMBIGUOUS_CODE || parentReport.caseResults !== 16
    || parentReport.formalGeneralSkillCompleted !== false || parentReport.runtimeAccepted !== false
    || parentReport.trainingTruth !== false) fail('GENERAL_FINALIZATION_LAST_CASE_PARENT_INVALID');
  const db = new DatabaseSync(filename, { readOnly: true });
  let run, attempts, roleRows;
  try {
    run = db.prepare('SELECT * FROM runs WHERE id=?').get(parentRunId);
    attempts = db.prepare('SELECT * FROM attempts WHERE run=? ORDER BY id').all(parentRunId);
    roleRows = db.prepare("SELECT id,input_hash,state,artifact FROM steps WHERE run=? AND id LIKE 'strategy-role.%' ORDER BY id")
      .all(parentRunId);
    if (db.prepare("SELECT count(*) n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n
      || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(parentRunId).n) {
      fail('GENERAL_FINALIZATION_LAST_CASE_PARENT_NOT_TERMINAL');
    }
  } finally { db.close(); }
  if (!run || run.recipe !== parentRecipe.hash || parentReport.ledger?.calls !== attempts.length) {
    fail('GENERAL_FINALIZATION_LAST_CASE_PARENT_DRIFT');
  }
  const ambiguous = attempts.filter(row => row.state === 'failed' && row.code === AMBIGUOUS_CODE);
  if (ambiguous.length !== 1 || ambiguous[0].usage !== null || ambiguous[0].settled !== null) {
    fail('GENERAL_FINALIZATION_LAST_CASE_ATTEMPT_INVALID');
  }
  const failureReceipt = decode(ambiguous[0].response);
  if (failureReceipt?.code !== AMBIGUOUS_CODE || failureReceipt.requestMayHaveBeenSent !== true
    || failureReceipt.requestDefinitelyNotSent !== false || failureReceipt.usageKnown !== false
    || failureReceipt.physicalAttempts !== 1 || failureReceipt.automaticRetries !== 0) {
    fail('GENERAL_FINALIZATION_LAST_CASE_RECEIPT_INVALID');
  }
  const flattened = corpus.cases.flatMap(compiled => compiled.prompt.policyAxes.map(axis => ({ compiled, axis })));
  if (flattened.length !== 17) fail('GENERAL_FINALIZATION_LAST_CASE_DENOMINATOR_INVALID');
  const byId = new Map(roleRows.map(row => [row.id, row]));
  const expected = ({ compiled, axis }) => {
    const policy = candidates.find(row => row.axis === axis)?.policy;
    if (!policy) fail('GENERAL_FINALIZATION_LAST_CASE_POLICY_MISSING');
    const id = 'strategy-role.' + hash({ input: input.hash, axis, stage: 'decision-consumer', round: 0,
      evaluation: { case: compiled.prompt.hash, policy: hash(policy) } }).slice(0, 48);
    return { id, policy };
  };
  const passedDecisions = flattened.slice(0, 16).map(entry => {
    const { id } = expected(entry); const step = roleStep(byId.get(id));
    const grade = gradeStrategyDecisionV1(entry.compiled, step.artifact.value);
    if (!grade.decisionPreferencePassed || !grade.legalCandidateSelected || !grade.rationaleStructurePassed) {
      fail('GENERAL_FINALIZATION_LAST_CASE_PRIOR_DECISION_FAILED');
    }
    return { ...step, caseId: entry.compiled.prompt.caseId, axis: entry.axis, gradeHash: grade.hash };
  });
  const last = flattened[16], lastExpected = expected(last), quarantineRow = byId.get(lastExpected.id);
  const quarantine = quarantineRow ? decode(quarantineRow.artifact) : null;
  if (!quarantine || quarantine.schema !== 'strategy_role_quarantine_v1'
    || quarantine.code !== AMBIGUOUS_CODE || quarantine.status !== 'quarantined'
    || quarantine.outcome?.status !== 'stopped'
    || quarantine.outcome?.issueRef?.class !== 'ambiguous_send'
    || quarantine.outcome?.issueRef?.rejectedCandidateRef !== null
    || quarantine.diagnostic?.code !== AMBIGUOUS_CODE) {
    fail('GENERAL_FINALIZATION_LAST_CASE_QUARANTINE_INVALID');
  }
  const manifest = seal({ schema: 'ticket18_general_finalization_last_case_ambiguous_continuation_manifest_v1',
    parentRunId, parentRecipeHash: parentRecipe.hash, parentReportHash: parentReport.hash,
    ambiguousAttemptId: ambiguous[0].id, ambiguousFailureReceiptHash: failureReceipt.receiptHash,
    ambiguousAttemptChargedAtFullReservation: true, ambiguousReservationMicros: ambiguous[0].reserve,
    inheritedPassedDecisions: passedDecisions.length,
    finalCaseId: last.compiled.prompt.caseId, finalAxis: last.axis, finalRoleId: lastExpected.id,
    automaticRetryPerformed: false, runtimeAccepted: false, trainingTruth: false });
  return { manifest, inheritedSteps: new Map(passedDecisions.map(entry => [entry.id, entry])) };
}

export function withGeneralFinalizationLastCaseContinuationV1(store, continuation) {
  verifySeal(continuation.manifest); const used = new Set();
  return Object.freeze({ ...store,
    acquire(id, input, ...rest) {
      const entry = continuation.inheritedSteps.get(id);
      if (!entry) return store.acquire(id, input, ...rest);
      if (hash(safe(input)) !== entry.inputHash) fail('GENERAL_FINALIZATION_LAST_CASE_INPUT_DRIFT');
      const receiptInput = { continuationHash: continuation.manifest.hash,
        parentRunId: continuation.manifest.parentRunId, stepId: id,
        inputHash: entry.inputHash, artifactHash: entry.artifact.hash };
      const receiptLease = store.acquire('inherited.' + id, receiptInput);
      if (!receiptLease.cached) store.finish(receiptLease, seal({
        schema: 'ticket18_general_finalization_last_case_inheritance_v1', ...receiptInput,
        providerCalls: 0, runtimeAccepted: false, trainingTruth: false }));
      const lease = store.acquire(id, input);
      const artifact = lease.cached ? lease.artifact : store.finish(lease, entry.artifact);
      if (artifact.hash !== entry.artifact.hash) fail('GENERAL_FINALIZATION_LAST_CASE_ARTIFACT_DRIFT');
      used.add(id); return { cached: true, artifact };
    },
    evidence: () => seal({ schema: 'ticket18_general_finalization_last_case_continuation_evidence_v1',
      continuationManifestHash: continuation.manifest.hash, usedInheritedDecisions: used.size,
      providerRegenerationCallsForAmbiguousRequest: 1,
      runtimeAccepted: false, trainingTruth: false }),
  });
}
