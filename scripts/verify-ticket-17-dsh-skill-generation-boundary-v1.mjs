#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_16_LIVE_PROVIDER_CLOSURE_V1 as ticket16 } from
  "../content/provider/ticket-16-live-provider-closure-v1.mjs";
import { STARCRAFT_TMG_TICKET_17_DSH_SKILL_GENERATION_BOUNDARY_V1 as boundary } from
  "../content/skill-generation/ticket-17-dsh-skill-generation-boundary-v1.mjs";
import { STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 as currentFaq } from
  "../packages/client-domain/official-faq-current-client-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../packages/source-data/official-development-tranche-source-lock-v1.mjs";
import { STARCRAFT_TMG_DSH_BASELINE_V1 } from
  "../packages/skill-generation/contracts-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT,
  "build/ticket-17-slice-163-dsh-skill-generation-boundary-v1/report.json");
const checks = [];
const failures = [];

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

await check("boundary_is_hash_sealed_and_pins_ticket_16", () => {
  const { boundaryHash, ...body } = boundary;
  assert.equal(boundaryHash, hashStarcraftTmgContract(body));
  assert.equal(boundary.predecessor.contractHash, ticket16.contractHash);
  assert.equal(boundary.predecessor.directProviderLiveAccepted, true);
  assert.equal(boundary.predecessor.credentialReuseAllowed, false);
});

await check("nine_contiguous_slices_are_frozen_before_implementation", () => {
  assert.equal(boundary.denominator.totalSlices, 9);
  assert.deepEqual(boundary.slices.map((entry) => entry.slice),
    [163, 164, 165, 166, 167, 168, 169, 170, 171]);
  assert.equal(new Set(boundary.slices.map((entry) => entry.name)).size, 9);
  assert.equal(boundary.slices[0].status, "complete_in_this_change");
  assert(boundary.slices.slice(1).every((entry) => entry.status === "planned"));
  for (let index = 1; index < boundary.slices.length; index += 1) {
    assert.deepEqual(boundary.slices[index].dependencies,
      [boundary.slices[index - 1].slice]);
  }
});

await check("frozen_current_source_chain_replaces_the_legacy_skill_fixture", () => {
  assert.equal(boundary.officialSourceBoundary.sourceRefreshPerformed, false);
  assert.equal(boundary.officialSourceBoundary.refreshPolicy,
    "explicit_user_command_only");
  assert.deepEqual(boundary.officialSourceBoundary.commandCenterVersions,
    { units: "71", cards: "69", rules: "48" });
  assert.equal(boundary.officialSourceBoundary.commandCenter.sourceLockHash,
    OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH);
  assert.equal(boundary.officialSourceBoundary.commandCenter.sourceSnapshotHash,
    OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH);
  assert.equal(boundary.officialSourceBoundary.commandCenter.datasetHash,
    OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH);
  for (const field of [
    "rulesVersion", "sourceLockHash", "reconciliationHash", "aggregateHash",
    "catalogueHash", "runtimeHash", "graphHash",
  ]) assert.equal(boundary.officialSourceBoundary.currentFaq[field], currentFaq[field], field);
  assert.deepEqual(boundary.officialSourceBoundary.currentFaq.counts,
    currentFaq.counts);
  assert.equal(boundary.officialSourceBoundary.historicalRules.maySeedCurrentSkillCandidate,
    false);
});

await check("dsh_release_is_exactly_pinned_to_the_audited_npm_latest", () => {
  assert.equal(boundary.dshBaseline.packageName,
    STARCRAFT_TMG_DSH_BASELINE_V1.packageName);
  assert.equal(boundary.dshBaseline.version, STARCRAFT_TMG_DSH_BASELINE_V1.version);
  assert.equal(boundary.dshBaseline.commit, STARCRAFT_TMG_DSH_BASELINE_V1.commit);
  assert.equal(boundary.dshBaseline.registryObservation.latest, "0.1.1-rc.2");
  assert.equal(boundary.dshBaseline.registryObservation.next, "0.1.2-rc.1");
  assert.match(boundary.dshBaseline.npmIntegrity, /^sha512-[A-Za-z0-9+/=]+$/u);
  assert(boundary.dshBaseline.selectionPolicy.includes("never_follow_next"));
  assert(boundary.dshBaseline.updatePolicy.includes("explicit_migration"));
});

await check("host_observation_never_authorizes_an_unsandboxed_fallback", () => {
  assert.equal(boundary.hostIsolationObservation.dockerDaemonAvailable, false);
  assert.equal(boundary.hostIsolationObservation.macosSandboxExecPresent, true);
  assert.equal(boundary.hostIsolationObservation.observationIsNotRunAuthority, true);
  assert(boundary.hostIsolationObservation.acceptedM1Path.includes("behavioral"));
  assert(boundary.hostIsolationObservation.absencePolicy.includes("fail_closed"));
  assert(boundary.hostIsolationObservation.absencePolicy.includes("unsandboxed"));
});

await check("existing_starcraft_skill_scaffold_is_byte_frozen_and_not_relabelled", async () => {
  for (const entry of boundary.currentStarcraftAudit.frozenInputs) {
    assert.equal(sha256(await readFile(path.join(ROOT, entry.path))), entry.sha256,
      entry.path);
  }
  assert.equal(boundary.currentStarcraftAudit.migrationPolicy
    .modifyFrozenScaffoldInSlice163, false);
  assert.equal(boundary.currentStarcraftAudit.migrationPolicy
    .silentlyRelabelScaffoldAsComplete, false);
  assert(boundary.currentStarcraftAudit.provenOnlyAsScaffold.includes(
    "both_execution_ports_are_injected_fake_executors"));
  assert(boundary.currentStarcraftAudit.provenOnlyAsScaffold.includes(
    "the_process_memory_scheduler_and_promotion_module_are_ticket_18_scaffolds_not_production_authority"));
});

await check("mtl_lineage_is_commit_and_file_hash_pinned_without_copying_unsafe_transport", () => {
  assert.equal(boundary.mtlLineage.commit,
    "50ef5c29c655c015335d76e78fb4a0ecb442252f");
  assert.equal(boundary.mtlLineage.inspectedInputs.length, 6);
  assert(boundary.mtlLineage.inspectedInputs.every((entry) =>
    /^[a-f0-9]{64}$/u.test(entry.sha256)));
  assert.equal(boundary.mtlLineage.codeCopied, false);
  for (const rejected of [
    "inherit_the_complete_parent_process_environment",
    "pass_the_raw_provider_key_directly_in_the_dsh_environment",
    "disable_session_persistence_while_claiming_a_replayable_dsh_run",
    "report_usage_and_attempts_as_unavailable_zeroes",
  ]) assert(boundary.mtlLineage.rejectedOrReplaced.includes(rejected), rejected);
});

await check("four_skill_families_are_registry_driven_and_not_fixed_to_a_small_count", () => {
  assert.deepEqual(boundary.skillFamilies.map((entry) => entry.family),
    ["how_to_play", "mission", "faction", "matchup"]);
  assert(boundary.skillFamilies.find((entry) => entry.family === "mission")
    .cardinality.startsWith("registry_driven"));
  assert(boundary.skillFamilies.find((entry) => entry.family === "faction")
    .cardinality.startsWith("registry_driven"));
  assert(boundary.skillFamilies.find((entry) => entry.family === "matchup")
    .cardinality.includes("not_a_fixed_handwritten_limit"));
});

await check("teach_ctx2skill_roles_include_correction_and_cross_time_without_live_mutation", () => {
  for (const role of [
    "planner", "tutor", "student", "challenger", "reasoner",
    "fact_judge", "proposer", "generator", "cross_time_gate",
  ]) assert(boundary.roleWorkflow.generationRoles.includes(role), role);
  assert.equal(boundary.roleWorkflow.dshMayExecuteRolesOnlyInsideOfflineSkillJobs,
    true);
  assert.equal(boundary.roleWorkflow.liveAgentMayGenerateOrMutateSkills, false);
  assert.equal(boundary.roleWorkflow.rulesAndExecutableReceiptsBeatModelClaims,
    true);
  assert(boundary.roleWorkflow.correctionPolicy.includes("ticket_18"));
});

await check("paired_arms_are_identical_except_for_the_harness_under_test", () => {
  assert.deepEqual(boundary.armParity.arms,
    ["dsh", "direct_provider_control"]);
  for (const field of [
    "model_and_provider_profile", "staged_input_and_existing_skill_snapshot",
    "role_prompt_and_output_schema", "read_only_tool_capabilities",
    "provider_attempt_token_cost_and_wall_budgets",
    "candidate_contract_and_external_judges",
  ]) assert(boundary.armParity.identical.includes(field), field);
  assert.equal(boundary.armParity.qualityClaimBeforePairedEvaluation, "unknown");
});

await check("dsh_and_control_can_only_emit_unreviewed_candidates", () => {
  assert.equal(boundary.authority.dshScope,
    "offline_skill_candidate_generation_only");
  for (const field of [
    "dshMayAccessOnlineAgentSessions", "dshMayAccessRooms",
    "dshMayAccessRulesMutation", "dshMayPublishSkills", "dshMayWriteMemory",
    "dshMayWriteTrainingTruth", "directControlMayPublishSkills",
  ]) assert.equal(boundary.authority[field], false, field);
  assert.deepEqual(boundary.authority.candidateDefaults, {
    humanReviewed: false,
    canAffectStrategy: false,
    canAffectRules: false,
    promotionEligible: false,
    trainingTruth: false,
  });
});

await check("ticket_18_retains_scheduler_gate_promotion_and_rollback_authority", () => {
  assert(boundary.ticket18Boundary.ownsLater.includes(
    "persistent_sqlite_and_postgresql_skill_scheduler"));
  assert(boundary.ticket18Boundary.ownsLater.includes(
    "multi_round_correction_and_stopping_policy"));
  assert(boundary.ticket18Boundary.ownsLater.includes(
    "administrator_promotion_registry_pointer_cas_and_rollback"));
  assert(boundary.ticket18Boundary.ticket17MustNotClaim.includes(
    "published_runtime_skill_snapshot"));
  assert(boundary.ticket18Boundary.ticket17MustNotClaim.includes(
    "large_scale_skill_catalogue"));
});

await check("one_bounded_pair_is_not_a_hidden_large_scale_skill_run", () => {
  assert.equal(boundary.liveAcceptance.firstExternalProviderSlice, 170);
  assert(boundary.liveAcceptance.runCount.startsWith("one_dsh_and_one_direct"));
  assert.equal(boundary.liveAcceptance.countsAsLargeScaleProduction, false);
  assert(boundary.liveAcceptance.credentialPolicy.includes("fresh_local_secure"));
  assert(boundary.liveAcceptance.credentialPolicy.includes("never_reuse"));
  assert(boundary.liveAcceptance.authorizationPolicy.includes(
    "any_family_batch_or_catalogue_production_requires_new_user_confirmation"));
  assert.equal(boundary.liveAcceptance.outputStatus, "unreviewed_candidate_only");
});

await check("slice_163_performs_no_install_generation_provider_or_training_side_effect", () => {
  assert.deepEqual(boundary.runTruth, {
    sourceRefreshPerformed: false,
    dshInstalled: false,
    dshRun: false,
    externalProviderCalled: false,
    skillCandidateGenerated: false,
    skillPromoted: false,
    memoryWritten: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  });
});

await check("harness_round_is_observable_and_has_fail_closed_demotion_rules", () => {
  assert.equal(boundary.harnessEvidence.harnessLoopUsed, true);
  assert.deepEqual(boundary.harnessEvidence.targetGames, ["starcraft-tmg"]);
  assert.deepEqual(boundary.harnessEvidence.promptPackRoutes,
    ["rule_skill_builder_prompt"]);
  assert.deepEqual(boundary.harnessEvidence.harnessToolsCalled, []);
  assert.equal(boundary.harnessEvidence.memoryTraceEvidence.writes, 0);
  assert.equal(boundary.harnessEvidence.trainingTraceCandidates, 0);
  assert(boundary.harnessEvidence.rollbackOrDemotionRules.includes(
    "missing_os_isolation_blocks_dsh_execution"));
});

const reportBody = {
  schemaVersion:
    "starcraft_tmg_ticket_17_slice_163_dsh_skill_generation_boundary_verification_v1",
  generatedAt: "2026-09-04T12:00:00.000Z",
  ticket: 17,
  slice: 163,
  ok: failures.length === 0,
  checks,
  failures,
  evidence: {
    boundaryHash: boundary.boundaryHash,
    predecessorHash: boundary.predecessor.contractHash,
    sourceLockHash: boundary.officialSourceBoundary.commandCenter.sourceLockHash,
    faqSourceLockHash: boundary.officialSourceBoundary.currentFaq.sourceLockHash,
    faqRuntimeHash: boundary.officialSourceBoundary.currentFaq.runtimeHash,
    dshPackage: `${boundary.dshBaseline.packageName}@${boundary.dshBaseline.version}`,
    dshCommit: boundary.dshBaseline.commit,
    dshNpmIntegrity: boundary.dshBaseline.npmIntegrity,
    mtlCommit: boundary.mtlLineage.commit,
    sliceCount: boundary.denominator.totalSlices,
    completedSlices: failures.length === 0 ? 1 : 0,
    remainingSlices: failures.length === 0 ? 8 : 9,
    dshInstalled: false,
    dshRun: false,
    skillCandidates: 0,
    promotions: 0,
    providerCalls: 0,
    trainingTruth: false,
  },
  offlineSkillEvolution: {
    sourceBoundary:
      "frozen_command_center_71_69_48_plus_current_official_faq_v1_rules_chain",
    teachArtifactsGenerated: 0,
    questionTreeNodes: 0,
    candidateBundles: 0,
    mementoCandidates: 0,
    skillOptPatches: 0,
    heldOutScenariosRun: 0,
    completeGameAbRuns: 0,
    humanReviews: 0,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTestsRun: 0,
    crossTimeReplayResult: "not_run_boundary_only",
    promotions: 0,
    blocks: [
      "current_official_staged_evidence_not_built_until_slice_164",
      "os_isolation_not_proven_until_slice_166",
      "pinned_dsh_runtime_not_installed_until_slice_167",
      "real_paired_evaluation_not_run_until_slice_170",
    ],
    remainingRuleGaps: [],
  },
  harness: boundary.harnessEvidence,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
