import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { factionExecutionProfileV1, factionProfileRefV1, FACTION_EXECUTION_MODEL_BINDING_V1 }
  from './faction-execution-model-v1.mjs';
import { DEEPSEEK_V41_FLASH_BETA_MODEL_V1 as betaModel,
  DEEPSEEK_V41_FLASH_BETA_LOCAL_STOP_V1 as localStop } from '../../content/skill-generation/offline-provider-profile-v3.mjs';

// Additive, explicit policy. Frozen execution-model V1 still forbids fallback.
// Model availability is not output quality and cannot pardon a rejected draft.
export const FACTION_MODEL_LIFECYCLE_BINDING_V1 = seal({
  version: 'faction_model_lifecycle_v1',
  authorization: 'user_2026_09_09_keep_terran_old_results_new_requests_beta_fallback_on_retirement',
  preferredModel: betaModel, fallbackModel: 'deepseek-v4-flash', localStop,
  localStopIsOfficialExpiry: false,
  fallbackTriggers: ['local_beta_window_closed', 'authenticated_model_unavailable_response'],
  modelListAbsenceIsNotRetirementProof: true,
  preserveAcceptedArtifactsAndActualOwner: true, preserveFullRequestContext: true,
  noQualityFallback: true, noAmbiguousSendRetry: true, automaticTransportRetries: 0,
  fallbackIsSticky: true, maximumFallbackTransitions: 1,
  requireDestinationCapabilityBeforeSend: true,
  preserveOriginalUnknownUsageReserve: true, accountingReset: false,
  canAffectRules: false, trainingTruth: false,
});
const binding = FACTION_MODEL_LIFECYCLE_BINDING_V1;
const invalid = suffix => fail('FACTION_MODEL_LIFECYCLE_' + suffix);
const stableProfile = ref => factionExecutionProfileV1({ legacyProfileRef: ref });

// Called at an authenticated transport boundary. This is a redacted observation,
// NOT self-authenticating evidence: consumers must re-read its actual owner and
// match request/body/status hashes via authenticateUnavailable below.
export function observeFactionModelUnavailableV1({ runId, requestId, model, endpointPath, transport }) {
  if (!/^[A-Za-z0-9._-]{4,120}$/u.test(runId || '') || !/^[A-Za-z0-9._-]{4,160}$/u.test(requestId || '')
    || model !== betaModel || !['/responses', '/chat/completions'].includes(endpointPath)) invalid('OBSERVATION_SCOPE');
  const payload = transport?.payload, error = payload?.error;
  if (transport?.delivery !== 'response_received' || transport.physicalAttempts !== 1
    || ![400, 404, 410].includes(transport.status) || !error || typeof error !== 'object' || Array.isArray(error)
    || !['model_not_found', 'model_not_available', 'model_retired'].includes(error.code)
    || ![undefined, null, 'model'].includes(error.param)
    || payload.output !== undefined || payload.choices !== undefined
    || payload.usage !== undefined && payload.usage !== null) return null;
  return seal({ version: 'faction_model_unavailable_observation_v1', bindingHash: binding.hash,
    runId, requestId, model, endpointPath, status: transport.status,
    providerErrorCode: error.code, payloadHash: hash(payload),
    disposition: 'http_rejected_unknown_usage_reserve_retained',
    providerCalls: 0, selfAuthenticating: false, trainingTruth: false });
}

function verifyDecision(decision, legacyProfileRef) {
  verifySeal(decision);
  const profile = decision.selection === 'beta'
    ? factionExecutionProfileV1({ binding: FACTION_EXECUTION_MODEL_BINDING_V1, legacyProfileRef })
    : decision.selection === 'stable_fallback' ? stableProfile(legacyProfileRef) : null;
  if (!profile || decision.version !== 'faction_model_selection_v1' || decision.bindingHash !== binding.hash
    || hash(decision.legacyProfileRef) !== hash(legacyProfileRef)
    || hash(decision.executionProfileRef) !== hash(factionProfileRefV1(profile)) || decision.model !== profile.model
    || decision.fallbackTransitions !== (decision.selection === 'beta' ? 0 : 1)
    || decision.fullContextPreserved !== true || decision.trainingTruth !== false
    || decision.selection === 'beta' && (decision.reason !== 'preferred_available' || decision.evidenceHash !== null)
    || decision.selection === 'stable_fallback' && !binding.fallbackTriggers.includes(decision.reason)
    || decision.reason === 'local_beta_window_closed' && decision.evidenceHash !== null
    || decision.reason === 'authenticated_model_unavailable_response' && !/^[a-f0-9]{64}$/u.test(decision.evidenceHash || ''))
    invalid('DECISION_DRIFT');
  return profile;
}

export function selectFactionExecutionModelV1({ selectedBinding, legacyProfileRef, now = new Date().toISOString(),
  priorDecision = null, unavailable = null, authenticateUnavailable = null, modalities = ['text'] }) {
  if (verifySeal(selectedBinding).hash !== binding.hash) invalid('BINDING_INVALID');
  const instant = Date.parse(now);
  if (!Number.isFinite(instant)) invalid('CLOCK_INVALID');
  if (!Array.isArray(modalities) || !modalities.length || modalities.some(m => m !== 'text'))
    invalid('MODALITY_UNSUPPORTED'); // Never silently discard visual input.
  if (priorDecision) {
    const profile = verifyDecision(priorDecision, legacyProfileRef);
    if (priorDecision.selection === 'stable_fallback') {
      // Callers load priorDecision from an authenticated durable task/recipe,
      // not model text. A source-error transition additionally needs its origin.
      if (priorDecision.reason === 'authenticated_model_unavailable_response'
        && (!unavailable || unavailable.hash !== priorDecision.evidenceHash)) invalid('EVIDENCE_REQUIRED');
      if (priorDecision.reason === 'local_beta_window_closed' && instant < Date.parse(localStop))
        invalid('CLOCK_ROLLBACK');
      if (!unavailable) return { decision: priorDecision, profile };
    }
  }
  let reason = instant >= Date.parse(localStop) ? 'local_beta_window_closed' : 'preferred_available';
  let evidenceHash = null;
  if (unavailable) {
    verifySeal(unavailable);
    if (typeof authenticateUnavailable !== 'function') invalid('EVIDENCE_REQUIRED');
    const fresh = authenticateUnavailable(unavailable);
    if (!fresh || verifySeal(fresh).hash !== unavailable.hash
      || unavailable.version !== 'faction_model_unavailable_observation_v1'
      || unavailable.bindingHash !== binding.hash || unavailable.model !== betaModel
      || unavailable.selfAuthenticating !== false) invalid('EVIDENCE_DRIFT');
    reason = 'authenticated_model_unavailable_response'; evidenceHash = unavailable.hash;
  }
  const fallback = reason !== 'preferred_available';
  const profile = fallback ? stableProfile(legacyProfileRef)
    : factionExecutionProfileV1({ binding: FACTION_EXECUTION_MODEL_BINDING_V1, legacyProfileRef });
  const decision = seal({ version: 'faction_model_selection_v1', bindingHash: binding.hash,
    legacyProfileRef, executionProfileRef: factionProfileRefV1(profile), model: profile.model,
    selection: fallback ? 'stable_fallback' : 'beta', reason, evidenceHash,
    fallbackTransitions: fallback ? 1 : 0, fullContextPreserved: true, trainingTruth: false });
  verifyDecision(decision, legacyProfileRef);
  if (priorDecision?.selection === 'stable_fallback' && priorDecision.hash !== decision.hash)
    invalid('SECOND_TRANSITION');
  return { decision, profile };
}
