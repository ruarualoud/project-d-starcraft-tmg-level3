import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_SECURE_BYOK_PROVIDER_BOUNDARY_V1 as boundary } from
  "./ticket-16-secure-byok-provider-boundary-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_secure_byok_consent_v1",
  ticket: 16,
  slice: 154,
  preparedAt: "2026-09-03T15:00:00.000Z",
  predecessorBoundaryHash: boundary.boundaryHash,
  objective:
    "authenticated_explicit_consent_and_one_time_bounded_credential_ingress_without_persistence_or_provider_egress",
  deepModule: {
    owner: "packages/secure-provider-runtime",
    publicControlOperations: [
      "prepareAttachment",
      "attachCredentialBytes",
      "readAttachment",
      "detachAttachment",
    ],
    trustedLifecycleOperations: ["revokeSession", "sweepExpired", "close"],
    dependencies: [
      "ticket_15_authenticated_session_lifecycle",
      "ticket_15_provider_budget_supervisor",
      "server_owned_provider_profile_registry",
      "credential_attachment_port",
    ],
    owns: [
      "consent_receipt",
      "one_time_ingress_nonce",
      "credential_buffer_handoff_and_zeroization",
      "safe_attachment_projection",
      "explicit_and_lifecycle_detach",
    ],
    doesNotOwn: [
      "provider_transport_or_egress",
      "durable_attempts_or_budget_recovery",
      "rules_legality_room_state_rng_or_confirmation",
      "skills_dsh_memory_or_training_truth",
    ],
  },
  http: {
    prefix: "/starcraft-tmg-level3/provider/api/v1",
    publicRoutes: [
      "GET /health",
      "GET /metadata",
      "POST /attachments/intents",
      "PUT /attachments/:attachmentId/secret",
      "GET /attachments/:attachmentId",
      "DELETE /attachments/:attachmentId",
    ],
    consentMediaType: "application/json",
    credentialMediaType: "application/octet-stream",
    nonceHeader: "x-project-d-provider-ingress-nonce",
    transport: {
      production: "tls_required",
      localDevelopment: "explicit_loopback_only",
      forwardedHeadersGrantSecurity: false,
    },
    responses: {
      cache: "no_store",
      rawPrincipalOrWorkerReferenceAllowed: false,
      credentialOrCredentialHashAllowed: false,
    },
  },
  consent: {
    mustBeExplicit: true,
    disclosureNoticeVersion: "starcraft_tmg_provider_data_disclosure_v1",
    binds: [
      "authenticated_principal_scope",
      "room_and_online_session_binding",
      "connection_epoch_at_request",
      "server_owned_provider_profile_hash_provider_and_model",
      "current_server_budget_policy_hash_and_remaining_units",
      "no_automatic_retry",
    ],
    clientCannotSupply: [
      "principal_identity_or_scope_hash",
      "base_url_host_path_or_headers",
      "provider_or_model_outside_the_profile_reference",
      "budget_or_retry_policy",
      "worker_reference",
      "rule_room_confirmation_or_training_authority",
    ],
  },
  credentialBoundary: {
    ingressNonce: {
      entropyBytes: 32,
      lifetimeMaximumMs: 300000,
      singleUse: true,
      storedRepresentation: "sha256_digest_only",
      wrongNonceConsumesIntent: false,
      consumedBeforeWorkerHandoff: true,
    },
    parentRepresentation: "bounded_owned_buffer_only",
    jsonTextQueryHeaderOrLogRepresentationAllowed: false,
    bufferZeroedAfterSuccessFailureAndEarlyHttpRejection: true,
    rawCredentialPersisted: false,
    credentialHashPersisted: false,
    providerCalled: false,
    nextIsolationSlice: 155,
  },
  stateMachine: {
    states: [
      "awaiting_ingress",
      "attaching",
      "attached",
      "detaching",
      "detach_failed",
      "detached",
      "expired",
      "attach_failed",
    ],
    terminal: ["detached", "expired", "attach_failed"],
    oneActiveAttachmentPerSession: true,
    pendingConsentMayBeExplicitlySuperseded: true,
    attachedConsentRequiresDetachBeforeReplacement: true,
    reconnectPolicy: "same_authenticated_session_binding_with_current_epoch_may_read_and_detach",
    detachTriggers: [
      "explicit_user_detach",
      "session_ended",
      "principal_revoked",
      "attachment_expired",
      "control_plane_closed",
    ],
    failedWorkerDetachRemainsVisibleAndRetryable: true,
  },
  abuseAndFailureGates: [
    "unauthenticated_cross_principal_cross_room_and_stale_epoch_requests_fail_closed",
    "non_tls_non_loopback_requests_fail_closed",
    "body_media_type_encoding_length_and_size_are_bounded",
    "unknown_duplicate_and_client_authority_fields_fail_closed",
    "nonce_expiration_and_replay_fail_closed",
    "unsafe_worker_acknowledgements_fail_closed",
    "record_capacity_fails_without_silent_eviction",
    "detach_during_ingress_terminates_the_worker_after_acknowledgement",
    "public_responses_never_expose_nonce_after_prepare_or_opaque_worker_reference",
  ],
  authority: {
    rulesOwner: "rules_service",
    roomOwner: "room_runtime",
    confirmationOwner: "non_model_controller",
    providerMaySelectCurrentOpponentCandidate: false,
    providerMayConfirmOrApply: false,
    providerMayGenerateSkills: false,
    dshAllowed: false,
    trainingTruth: false,
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: [],
    uiTraceEvidence: "not_run_backend_control_slice",
    agentDecisionEvidence: null,
    memoryTraceEvidence: {
      refs: [],
      writes: 0,
      crossModeIsolationChecked: false,
    },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "reject_and_zero_the_ingress_buffer_on_any_boundary_failure",
      "detach_the_worker_on_explicit_or_trusted_lifecycle_revocation",
      "retain_ticket_15_injected_gateway_until_slice_162_live_acceptance",
      "never_promote_consent_or_attachment_events_to_training_truth",
    ],
    userVisibleChecks:
      "http_status_and_safe_attachment_state_only_no_battle_ui_until_slice_160",
  },
  acceptance: {
    verifier: "scripts/verify-ticket-16-secure-byok-consent-v1.mjs",
    fixedAssertions: 27,
    realApiKeyRequired: false,
    syntheticCredentialOnly: true,
    externalProviderCallRequired: false,
    fullTicketLiveCallSlice: 162,
  },
  runTruth: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticCredentialExercised: true,
    credentialWorkerIsolated: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_SECURE_BYOK_CONSENT_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
