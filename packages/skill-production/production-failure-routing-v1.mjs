import { hash, seal, verifySeal, fail } from './common.mjs';
import { PHASED_DSH_SESSION_POLICY_V1 } from './session-lifecycle-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2, STRUCTURED_FAILURE_CLASSIFIER_BINDING_V2 } from '../structured-generation/failure-classifier-v2.mjs';

export const PRODUCTION_FAILURE_ROUTING_BINDING_V1 = seal({
  version: 'production_failure_routing_v1',
  structuredClassifierHash: STRUCTURED_FAILURE_CLASSIFIER_BINDING_V2.hash,
  lifecyclePolicyHash: PHASED_DSH_SESSION_POLICY_V1.hash,
  originalAttemptAndAccountingImmutable: true,
  paymentStopsAllWork: true,
  unknownDeliveryNeverReissued: true,
  localRecoveryDoesNotGrantProviderPermission: true,
  modelBridgeCountIsNotPhysicalProviderUsage: true,
  trainingTruth: false,
});
const safeCode = value => /^[A-Z0-9_]{3,120}$/u.test(value || '') ? value : 'PRODUCTION_FAILURE_UNKNOWN';
const paymentCode = code => ['PROVIDER_PAYMENT_REQUIRED', 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK'].includes(code);

function readLifecycle(value) {
  verifySeal(value);
  const phases = ['preparation', 'execution', 'finalization'];
  if (value.version !== 'phased_dsh_session_lifecycle_v1'
    || value.policyHash !== PHASED_DSH_SESSION_POLICY_V1.hash || value.status !== 'failed'
    || !phases.includes(value.phase) || !phases.includes(value.failedPhase)
    || value.timeoutPhase !== null && !phases.includes(value.timeoutPhase)
    || value.operationDrained !== true || value.trainingTruth !== false
    || phases.some(phase => !Number.isFinite(value.durationsMs?.[phase]) || value.durationsMs[phase] < 0
      || !Number.isSafeInteger(value.limitsMs?.[phase]) || value.limitsMs[phase] <= 0)
    || !Number.isFinite(value.totalMs)
    || Math.abs(phases.reduce((total, phase) => total + value.durationsMs[phase], 0) - value.totalMs) > 0.001)
    fail('PRODUCTION_FAILURE_LIFECYCLE_INVALID');
  return value;
}
function readSafeReceipt(value) {
  const { receiptHash, ...body } = value || {};
  if (hash(body) !== receiptHash) fail('PRODUCTION_FAILURE_RECEIPT_INVALID');
  return value;
}

// Resolves the original, persisted failure behind a DSH wrapper. It describes
// the next route; it never resends, settles, rewrites or accepts any output.
export function createProductionFailureRouterV1({ readArtifact, readAttempt, observeWireFailure = null }) {
  if (typeof readArtifact !== 'function' || typeof readAttempt !== 'function')
    throw new TypeError('Production failure routing requires read-only evidence resolvers');
  return Object.freeze({ binding: PRODUCTION_FAILURE_ROUTING_BINDING_V1,
    route(error, policy = {}) {
      const wrapperCode = safeCode(error?.code);
      let rootCode = wrapperCode, issueRef = null, originalAttemptId = null;
      let receipt = null, lifecycle = null, requestHash = null, wireObservation = null;
      const finish = classification => seal({ version: 'production_failure_route_v1',
        bindingHash: PRODUCTION_FAILURE_ROUTING_BINDING_V1.hash, wrapperCode, rootCode,
        issueRef, originalAttemptId, originalReceiptHash: receipt?.receiptHash || null,
        originalRequestHash: requestHash, usageKnown: receipt ? receipt.usageKnown === true : null,
        phase: lifecycle?.timeoutPhase || lifecycle?.failedPhase || null,
        lifecycleRef: lifecycle ? { hash: lifecycle.hash, policyHash: lifecycle.policyHash } : null,
        ...classification, originalFailurePreserved: true, providerRequestsReissued: 0,
        accountingWrites: 0, semanticAcceptance: false, trainingTruth: false });
      // A balance stop must not be hidden by a secondary malformed diagnostic.
      if (paymentCode(wrapperCode)) return finish({ class: 'payment_exhausted', status: 'stopped',
        scope: 'global', retryRoute: null, maxAdditionalProviderAttempts: 0 });
      try {
        if (error?.safeReceipt) receipt = readSafeReceipt(error.safeReceipt);
        if (error?.outcome?.issueRef) {
          const reference = error.outcome.issueRef;
          const issue = verifySeal(readArtifact(reference.id));
          if (issue.hash !== reference.hash || issue.class !== reference.class
            || !/^[a-f0-9]{64}$/u.test(issue.invocationHash || '')) fail('PRODUCTION_FAILURE_ISSUE_BINDING_INVALID');
          originalAttemptId = 'structured-' + issue.invocationHash.slice(0, 48);
          const attempt = readAttempt(originalAttemptId);
          if (!attempt || attempt.id !== originalAttemptId || attempt.state !== 'failed'
            || attempt.code !== issue.code || !attempt.response) fail('PRODUCTION_FAILURE_ATTEMPT_BINDING_INVALID');
          receipt = readSafeReceipt(verifySeal(JSON.parse(attempt.response)).value);
          if ((issue.safeReceiptHash || issue.originalProviderReceiptHash) !== receipt.receiptHash
            || receipt.code !== attempt.code) fail('PRODUCTION_FAILURE_ORIGINAL_RECEIPT_DRIFT');
          issueRef = { id: reference.id, hash: issue.hash };
          rootCode = safeCode(attempt.code); requestHash = attempt.request_hash;
          if (observeWireFailure && issue.class === 'wire_syntax')
            wireObservation = observeWireFailure({ issue, attempt, receipt });
        }
        if (paymentCode(rootCode)) return finish({ class: 'payment_exhausted', status: 'stopped',
          scope: 'global', retryRoute: null, maxAdditionalProviderAttempts: 0 });
        if (error?.lifecycle) lifecycle = readLifecycle(error.lifecycle);
      } catch (evidenceError) {
        return finish({ class: 'routing_evidence_invalid', status: 'stopped', scope: 'task',
          retryRoute: 'inspect_bound_failure_evidence', evidenceFailureCode: safeCode(evidenceError.code),
          maxAdditionalProviderAttempts: 0 });
      }
      if (paymentCode(rootCode)) return finish({ class: 'payment_exhausted', status: 'stopped',
        scope: 'global', retryRoute: null, maxAdditionalProviderAttempts: 0 });
      if (['PRODUCTION_BUDGET_EXHAUSTED', 'FACTION_RUN_WALL_EXHAUSTED'].includes(rootCode))
        return finish({ class: 'run_budget_exhausted', status: 'stopped', scope: 'run',
          retryRoute: 'await_explicit_budget_extension', maxAdditionalProviderAttempts: 0 });
      if (rootCode === 'AMBIGUOUS_EGRESS_NO_RETRY')
        return finish({ class: 'ambiguous_egress', status: 'stopped', scope: 'task',
          retryRoute: 'manual_provider_reconciliation', maxAdditionalProviderAttempts: 0 });
      const prior = classifyStarcraftTmgStructuredFailureV2({ code: rootCode, safeReceipt: receipt,
        requestHash, outputContractRef: receipt?.outputContractRef, policy });
      if (prior.class === 'wire_syntax' && wireObservation) {
        verifySeal(wireObservation);
        if (wireObservation.maxAdditionalProviderAttempts !== 0 || wireObservation.trainingTruth !== false)
          fail('PRODUCTION_FAILURE_WIRE_OBSERVATION_INVALID');
        return finish({ ...prior, scope: 'task', retryRoute: wireObservation.retryRoute,
          rawPayloadPersisted: wireObservation.rawPayloadPersisted,
          rawAccessRevalidationRequired: true, wireObservation });
      }
      // Provider ambiguity/terminal outcomes retain their proven priority over
      // local timing. A timeout alone cannot prove whether egress happened.
      if (prior.class !== 'unclassified') return finish({ ...prior,
        scope: prior.class === 'payment_exhausted' ? 'global'
          : prior.class === 'provider_terminal' ? 'provider' : 'task' });
      if (lifecycle && rootCode === 'DSH_PREPARATION_TIME_EXHAUSTED'
        && lifecycle.timeoutPhase === 'preparation' && lifecycle.durationsMs.execution === 0
        && lifecycle.finalCommandObserved === false) {
        return finish({ class: 'local_preparation_timeout', status: 'quarantined', scope: 'task',
          retryRoute: 'reprepare_same_task_without_provider', maxAdditionalProviderAttempts: 0 });
      }
      if (lifecycle && ((rootCode === 'SESSION_WALL_TIME_EXHAUSTED' && lifecycle.timeoutPhase === 'execution')
        || (rootCode === 'DSH_FINALIZATION_TIME_EXHAUSTED' && lifecycle.timeoutPhase === 'finalization'))) {
        return finish({ class: lifecycle.timeoutPhase === 'execution' ? 'execution_timeout' : 'local_finalization_timeout',
          status: 'quarantined', scope: 'task', retryRoute: 'inspect_attempt_ledger_and_recover_verified_output',
          maxAdditionalProviderAttempts: 0 });
      }
      return finish({ ...prior, scope: 'task' });
    },
  });
}
