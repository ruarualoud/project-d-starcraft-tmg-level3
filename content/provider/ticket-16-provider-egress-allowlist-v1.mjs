import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_CREDENTIAL_WORKER_ISOLATION_V1 as predecessor } from
  "./ticket-16-credential-worker-isolation-v1.mjs";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const body = {
  schemaVersion: "starcraft_tmg_ticket_16_provider_egress_allowlist_v1",
  ticket: 16,
  slice: 156,
  preparedAt: "2026-09-04T01:00:00.000Z",
  predecessorContractHash: predecessor.contractHash,
  objective:
    "server_owned_provider_profile_registry_and_single_attempt_dns_pinned_https_egress_inside_the_credential_child",
  mtlSchedulingLineage: {
    repository: "https://github.com/ruarualoud/project-d-maze-tower-league",
    branch: "codex/mtl-character-agent-repair",
    commit: "50ef5c29c655c015335d76e78fb4a0ecb442252f",
    adopted: [
      "credential_broker_alone_owns_provider_transport",
      "parent_supplies_only_bounded_non_credential_request_packets",
      "transport_failure_is_typed_and_safe_without_raw_provider_material",
      "provider_attempt_usage_and_identity_are_receipted",
      "lifecycle_cancel_and_shutdown_abort_in_flight_transport",
    ],
    starcraftDifferences: [
      "no_online_automatic_retry_or_contract_repair_round",
      "no_rules_tool_bridge_inside_the_credential_worker",
      "no_doh_bypass_or_deepseek_specific_online_path",
      "four_online_roles_keep_ticket_15_capability_and_human_confirmation_boundaries",
      "dsh_remains_offline_skill_generation_only",
    ],
    copiedCode: false,
  },
  externalStandards: [
    {
      owner: "IANA",
      title: "IPv4 Special-Purpose Address Space",
      url: "https://www.iana.org/assignments/iana-ipv4-special-registry/",
      use: "conservative_non_global_ipv4_rejection",
    },
    {
      owner: "IANA",
      title: "IPv6 Special-Purpose Address Space",
      url: "https://www.iana.org/assignments/iana-ipv6-special-registry/",
      use: "conservative_non_global_ipv6_rejection",
    },
    {
      owner: "Node.js",
      title: "HTTPS API",
      url: "https://nodejs.org/api/https.html",
      use: "custom_lookup_sni_certificate_verification_and_no_agent_reuse",
    },
  ],
  registry: {
    version: "starcraft_tmg_provider_profile_registry_v1",
    serverOwnedInputs: [
      "provider_profile", "completion_path", "provider_allowlist", "port_allowlist",
    ],
    publicOperations: ["metadata", "resolve", "resolveEgressBinding", "listPublic"],
    clientEndpointModelHeaderOrRetryAuthority: false,
    exactProfileRefRequired: true,
    placeholderModelAllowed: false,
    onlineDshAllowed: false,
    physicalAttempts: 1,
  },
  egressPolicy: {
    version: "starcraft_tmg_provider_egress_policy_v1",
    remoteProtocol: "https_only",
    exactRegisteredAuthority: ["hostname", "port", "path", "model"],
    dns:
      "resolve_all_answers_reject_if_any_is_not_globally_routable_then_pin_one_answer_for_the_connection",
    addressClassifier:
      "conservative_IANA_special_purpose_deny_policy_may_overdeny_but_must_not_admit_known_non_global_ranges",
    tlsServerName: "exact_registered_hostname",
    tlsCertificateVerificationDisabled: false,
    redirectsAllowed: false,
    proxyAllowed: false,
    customAuthorizationHeadersAllowed: false,
    compressedResponsesAllowed: false,
    requestResponseHeaderAndTotalTimeBounds: true,
    physicalAttempts: 1,
    automaticRetryAllowed: false,
  },
  worker: {
    childVersion: "starcraft_tmg_provider_egress_worker_child_v1",
    portVersion: "starcraft_tmg_provider_egress_worker_port_v1",
    granularity: "one_child_per_attachment",
    environment: ["NODE_NO_WARNINGS"],
    applicationStdio: "ignored",
    providerTransportOwner: "credential_child_only",
    serverRegistryOwner: "trusted_parent_only",
    messages: ["initialize", "complete", "cancel", "shutdown"],
    singleFlightPerAttachment: true,
    parentBufferZeroed: true,
    childBufferZeroedOnLifecycleEnd: true,
    unexpectedExitRestarted: false,
    providerOutputMayConfirmOrApply: false,
  },
  safeResult: {
    output: "bounded_internal_structured_output_for_ticket_15_validation",
    receiptBinds: [
      "provider_profile_hash", "egress_policy_hash", "provider_id",
      "requested_model", "reported_model", "hashed_provider_request_id",
      "usage", "response_fingerprint", "hashed_dns_answer_set",
      "tls_server_name", "physical_attempt_count", "start_and_finish_time",
    ],
    rawProviderPacketRetained: false,
    rawProviderHeadersRetained: false,
    credentialOrCredentialHashReturned: false,
    publicRoomOrTrainingArtifact: false,
  },
  ownership: {
    rulesOwner: "rules_service",
    roomOwner: "room_runtime",
    confirmationOwner: "non_model_controller",
    promptResolutionOwner: "ticket_15_gateway_integration_at_slice_159",
    attemptDurabilityOwner: "provider_attempt_store_at_slices_157_and_158",
    workerMayReadRulesRoomSkillsOrMemory: false,
    workerMaySelectConfirmOrApply: false,
    workerMayGenerateSkills: false,
    dshAllowed: false,
    trainingTruth: false,
  },
  acceptance: {
    verifier: "scripts/verify-ticket-16-provider-egress-allowlist-v1.mjs",
    fixedAssertions: 40,
    actualCredentialChildRequired: true,
    syntheticCredentialOnly: true,
    injectedTransportRequired: true,
    externalProviderCallRequired: false,
    realApiKeyRequired: false,
  },
  harnessEvidence: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: [],
    uiTraceEvidence: "not_run_backend_egress_slice",
    agentDecisionEvidence: null,
    memoryTraceEvidence: { refs: [], writes: 0, crossModeIsolationChecked: false },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "reject_the_profile_before_attach_when_registry_or_policy_binding_drifts",
      "reject_all_dns_answers_when_any_answer_is_non_global",
      "kill_the_worker_on_unsafe_ipc_output_or_protocol_drift",
      "never_retry_a_failed_or_ambiguous_billable_attempt_automatically",
      "retain_ticket_15_injected_gateway_until_slice_162_live_acceptance",
    ],
    userVisibleChecks: "not_run_until_slice_160",
  },
  runTruth: {
    sourceRefreshPerformed: false,
    systemDnsProbePerformed: false,
    injectedDnsOnly: true,
    injectedHttpsOnly: true,
    providerCalled: false,
    userCredentialAccepted: false,
    syntheticCredentialExercised: true,
    actualCredentialChildSpawned: true,
    networkRequestMadeByActualChild: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  },
};

export const STARCRAFT_TMG_TICKET_16_PROVIDER_EGRESS_ALLOWLIST_V1 = freeze({
  ...body,
  contractHash: hashStarcraftTmgContract(body),
});
