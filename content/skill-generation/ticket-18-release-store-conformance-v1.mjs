import { STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_SQLITE_V1 } from
  "../provider/ticket-16-provider-attempt-store-sqlite-v1.mjs";
import { STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_POSTGRES_V1 } from
  "../provider/ticket-16-provider-attempt-store-postgres-v1.mjs";
import {
  STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS,
  STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
} from "../../packages/secure-provider-runtime/provider-attempt-store-contract-v1.mjs";
import {
  STARCRAFT_TMG_STRATEGY_RELEASE_STORE_METHODS,
  STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION,
} from "../../packages/strategy-skills/strategy-release-store-contract-v1.mjs";
import {
  STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
  STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_STORE_VERSION,
} from "../../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs";
import {
  STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
  STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION,
} from "../../packages/strategy-skills/postgres-strategy-release-store-v1.mjs";
import { seal } from "../../packages/skill-production/common.mjs";

export const STARCRAFT_TMG_TICKET_18_RELEASE_STORE_CONFORMANCE_V1 = seal({
  schema: "ticket18_release_store_conformance_contract_v1",
  ticket: 18,
  slice: 179,
  providerAttemptStore: {
    contractVersion: STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_VERSION,
    methods: [...STARCRAFT_TMG_PROVIDER_ATTEMPT_STORE_METHODS],
    sqlitePredecessorContractHash:
      STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_SQLITE_V1.contractHash,
    postgresPredecessorContractHash:
      STARCRAFT_TMG_TICKET_16_PROVIDER_ATTEMPT_STORE_POSTGRES_V1.contractHash,
    sqliteMode: "wal_full_begin_immediate",
    postgresMode: "serializable_select_for_update_zero_internal_retry",
    responsibilities: [
      "budget_reservation",
      "attempt_intent_before_egress",
      "known_usage_settlement",
      "pre_dispatch_abandonment",
      "post_dispatch_ambiguity",
      "audit_replay",
    ],
  },
  strategyReleaseStore: {
    contractVersion: STARCRAFT_TMG_STRATEGY_RELEASE_STORE_VERSION,
    methods: [...STARCRAFT_TMG_STRATEGY_RELEASE_STORE_METHODS],
    sqliteAdapterVersion: STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_STORE_VERSION,
    postgresAdapterVersion: STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_STORE_VERSION,
    sqliteSchemaFingerprint:
      STARCRAFT_TMG_SQLITE_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
    postgresSchemaFingerprint:
      STARCRAFT_TMG_POSTGRES_STRATEGY_RELEASE_SCHEMA_FINGERPRINT,
    semanticSchemaParityRequired: true,
    responsibilities: [
      "immutable_artifact_storage",
      "job_revision_compare_and_swap",
      "lease_owner_and_monotonic_fence",
      "expired_lease_requeue",
      "attempt_and_budget_receipt_hash_binding",
      "complete_output_hash_binding",
    ],
  },
  composition: {
    m1: "sqlite_strategy_release_store_plus_sqlite_provider_attempt_store",
    production:
      "postgres_strategy_release_store_plus_postgres_provider_attempt_store",
    sameSemanticScenarioRequired: true,
    internalDatabaseRetries: 0,
    automaticProviderRetries: 0,
    credentialPersistence: false,
    rawProviderMaterialPersistence: false,
  },
  versionPolicy: {
    artifactContentHashes: "identity_and_tamper_detection",
    sourceAndSkillHashes: "semantic_dependency_identity",
    adapterVersions: "storage_compatibility",
    implementationHashes: "diagnostic_only_never_startup_blocker",
    oldVersions: "immutable_and_explicitly_displayable",
    highestVersionGuessing: false,
    silentCompatibility: false,
  },
  acceptance: {
    portableFiveSkillPackRequired: true,
    buildPathDependencyForbidden: true,
    sqliteCloseReopenRequired: true,
    postgresProtocolDoubleRequired: true,
    expiredLeaseRecoveryRequired: true,
    staleFenceRejectionRequired: true,
    providerPreAndPostDispatchRecoveryRequired: true,
    predecessorReports176To178Required: true,
    realPostgresServerRequiredThisSlice: false,
    providerCallRequired: false,
  },
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  eligibleForTraining: false,
  trainingTruth: false,
});
