#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 } from "../content/source-registry-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgSkillGenerationJobManifest,
  STARCRAFT_TMG_DSH_BASELINE_V1,
} from "../packages/skill-generation/contracts-v1.mjs";
import {
  createStarcraftTmgDirectSkillControlAdapter,
  createStarcraftTmgDshSkillGenerationAdapter,
} from "../packages/skill-generation/offline-arm-adapter-v1.mjs";
import {
  createStarcraftTmgSourceRegistry,
  sealStarcraftTmgSourceSnapshot,
} from "../packages/source-data/source-registry-v1.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const LEGACY_PACK_PATH = path.join(PROJECT_ROOT, "starcraft-tmg-local", "data", "starcraft-tmg-data.json");
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "offline-skill-arms-v1", "report.json");
const STARTED_AT = "2026-08-24T08:00:00.000Z";
const ENDED_AT = "2026-08-24T08:00:10.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeCandidateEmission(job, snapshotRef, suffix) {
  return {
    skillArtifact: {
      skillId: `starcraft-tmg.legal-candidate-discipline.${suffix}.v1`,
      version: "1.0.0-candidate",
      skillType: "strategy",
      sourceRefs: [snapshotRef],
      appRuleEndpoints: ["POST /starcraft-tmg-level3/api/v1/rooms/:roomId/legal-space"],
      phase: "any_action_selection",
      preconditions: ["A current room projection and complete LegalSpace are available."],
      procedure: ["Read the current LegalSpace and compare enabled candidates without inventing coordinates."],
      legalityChecks: ["The selected candidateId exists and is enabled in the same LegalSpace hash."],
      illegalPatterns: ["Submitting a free-form action not returned by current LegalSpace."],
      examples: [],
      counterExamples: [],
      judgeTests: [
        { id: "enabled-candidate-only", expected: "reject_unknown_candidate" },
        { id: "memory-cannot-override-rules", expected: "rules_and_referee_win" },
      ],
      confidence: "unreviewed",
    },
    skillMarkdown: `# Legal candidate discipline (${suffix})\n\nGenerated candidate only. Select only an enabled candidate from the current sealed LegalSpace.\n`,
    provenance: {
      stagedInputHash: job.stagedInputHash,
      promptPackHash: job.promptPackRef.hash,
      executionArm: job.executionArm,
      rulesAuthority: "none_generated_candidate",
    },
    unresolvedClaims: ["No held-out gameplay or expert effect review has been run."],
    promotionBlockers: [
      "source snapshot is a legacy unreviewed Adapter input",
      "Fact/Judge/Cross-Time replay gates have not run",
      "human review and administrator promotion are absent",
    ],
    emittedAt: ENDED_AT,
  };
}

function createExecutor(snapshotRef, suffix, options = {}) {
  return {
    async execute(request) {
      assert(request.mayPublishSkill === false && request.mayReadOnlineRooms === false, "executor request gained online or publication authority");
      assert(request.exposedTools.join("/") === "read_staged_source/read_existing_skills/emit_candidate_skill", "executor tool allowlist mismatch");
      const job = request.jobManifest;
      const emissions = [makeCandidateEmission(job, snapshotRef, suffix)];
      if (options.duplicateEmission) emissions.push(makeCandidateEmission(job, snapshotRef, `${suffix}-duplicate`));
      if (options.leakCredential) return {
        providerAttempts: 1,
        usage: { inputTokens: 100 },
        candidateEmissions: emissions,
        debug: { authorization: "Bearer should-never-leave-worker" },
      };
      return {
        executionSessionId: `${job.executionArm}-session-verifier-1`,
        startedAt: STARTED_AT,
        endedAt: ENDED_AT,
        finishReason: "completed",
        exitStatus: 0,
        providerAttempts: 2,
        retryEvents: 0,
        usage: {
          inputTokens: 1200,
          cacheReadTokens: 100,
          cacheWriteTokens: 0,
          outputTokens: 240,
          reasoningTokens: 80,
        },
        estimatedCost: 0.02,
        sessionLogRef: `artifact://starcraft-tmg-skill/${job.jobId}/session-log`,
        sessionLogHash: hashStarcraftTmgContract({ jobId: job.jobId, arm: job.executionArm, events: 12 }),
        candidateEmissions: emissions,
      };
    },
  };
}

function makeJob({ arm, snapshotRef, stagedInput, overrides = {} }) {
  const dsh = arm === "dsh";
  return createStarcraftTmgSkillGenerationJobManifest({
    jobId: `starcraft-tmg-skill-${arm}-verifier-1`,
    executionArm: arm,
    roleRoute: "strategy_skill_builder",
    skillType: "strategy",
    objective: "Generate a candidate that teaches current LegalSpace selection discipline without changing rule truth.",
    rulesVersion: "starcraft_tmg_rules_v0",
    dataVersion: "legacy-pack-67",
    sourceSnapshotRefs: [snapshotRef],
    stagedInputHash: hashStarcraftTmgContract(stagedInput),
    existingSkillSetHash: hashStarcraftTmgContract([]),
    promptPackRef: {
      id: "starcraft-tmg.ctx2skill.strategy-builder.v1",
      version: "1.0.0",
      hash: hashStarcraftTmgContract("ctx2skill-strategy-builder-v1"),
    },
    runtime: dsh ? {
      packageName: STARCRAFT_TMG_DSH_BASELINE_V1.packageName,
      version: STARCRAFT_TMG_DSH_BASELINE_V1.version,
      commit: STARCRAFT_TMG_DSH_BASELINE_V1.commit,
      packageIntegrityHash: hashStarcraftTmgContract("pinned-dsh-package-integrity-verifier"),
      effectiveConfigHash: hashStarcraftTmgContract("isolated-dsh-config-verifier"),
      pluginLockHash: hashStarcraftTmgContract("isolated-dsh-plugin-lock-verifier"),
      profileName: "project-d-starcraft-skill-isolated-v1",
      sessionFormatVersion: "dsh-session-v0",
      internalRetries: 0,
    } : {
      packageName: "project-d-direct-provider-skill-control",
      version: "1.0.0",
      commit: null,
      packageIntegrityHash: hashStarcraftTmgContract("direct-control-package-verifier"),
      effectiveConfigHash: hashStarcraftTmgContract("direct-control-config-verifier"),
      pluginLockHash: hashStarcraftTmgContract("direct-control-lock-verifier"),
      profileName: "project-d-starcraft-skill-control-v1",
      sessionFormatVersion: "project-d-provider-session-v1",
      internalRetries: 0,
    },
    providerProfileRef: {
      id: "paired-skill-provider-profile-v1",
      version: "1.0.0",
      hash: hashStarcraftTmgContract("paired-skill-provider-profile-v1"),
      model: "paired-model-v1",
    },
    toolContract: {
      allowlist: ["read_staged_source", "read_existing_skills", "emit_candidate_skill"],
      schemaHash: hashStarcraftTmgContract("starcraft-tmg-candidate-emission-tool-schema-v1"),
    },
    permissionProfile: {
      isolation: "disposable_container_or_microvm",
      repositoryMounted: false,
      productionSkillRegistryWrite: false,
      roomApiAccess: false,
      rulesMutationAccess: false,
      trainingTruthAccess: false,
      productionCredentialsMounted: false,
      telemetry: "disabled",
      egressMode: "provider_endpoint_allowlist_only",
      egressAllowlistHash: hashStarcraftTmgContract("paired-provider-egress-only"),
      enforcementOwner: "project-d-skill-worker-host",
    },
    budget: {
      maxProviderAttempts: 4,
      maxInputTokens: 10000,
      maxOutputTokens: 2000,
      maxWallMs: 60000,
      maxEstimatedCost: 0.25,
      currency: "USD",
      priceTableVersion: "verifier-price-table-v1",
    },
    scheduler: {
      schedulerJobId: `scheduler-${arm}-verifier-1`,
      attempt: 1,
      leaseId: `lease-${arm}-verifier-1`,
      fenceTokenHash: hashStarcraftTmgContract(`fence-${arm}-verifier-1`),
    },
    outputSchemaHash: hashStarcraftTmgContract("starcraft-tmg-candidate-skill-bundle-schema-v1"),
    createdAt: STARTED_AT,
    ...overrides,
  });
}

async function main() {
  const checks = [];
  const failures = [];
  const raw = await readFile(LEGACY_PACK_PATH, "utf8");
  const registry = createStarcraftTmgSourceRegistry({ sources: STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 });
  const snapshot = sealStarcraftTmgSourceSnapshot({
    source: registry.get("project-d.starcraft-tmg.legacy-data-pack-v0"),
    rawContent: raw,
    capturedAt: STARTED_AT,
    mediaType: "application/json",
    rawContentStored: true,
    reviewStatus: "legacy_adapter_unreviewed",
    retrieval: { kind: "workspace_file", relativePath: "starcraft-tmg-local/data/starcraft-tmg-data.json" },
  });
  const snapshotRef = {
    sourceId: snapshot.sourceRef.id,
    snapshotId: snapshot.snapshotId,
    snapshotHash: snapshot.snapshotHash,
    authorityStatus: "legacy_adapter_unreviewed",
    rulesEligible: false,
  };
  const stagedInput = {
    schemaVersion: "starcraft_tmg_skill_staged_input_v1",
    sourceSnapshotRef: snapshotRef,
    neutralObservations: [
      "The Level-3 mutation interface accepts only enabled candidates from the current sealed LegalSpace.",
      "Generated strategy advice cannot override the Rules or Referee.",
    ],
    existingSkills: [],
    questionTree: [
      { id: "q1", question: "What evidence proves a proposed candidate belongs to the current LegalSpace?" },
      { id: "q2", question: "How must advisory memory behave when it conflicts with Rules?" },
    ],
    sourceAuthority: "mixed_platform_contract_and_unreviewed_legacy_adapter",
    canAffectRules: false,
    trainingTruth: false,
  };
  const dshJob = makeJob({ arm: "dsh", snapshotRef, stagedInput });
  const controlJob = makeJob({ arm: "direct_provider_control", snapshotRef, stagedInput });
  let dshResult = null;
  let controlResult = null;

  async function check(id, fn) {
    try {
      await fn();
      checks.push({ id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, ok: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  await check("job_contract_pins_dsh_and_forbids_online_or_publication_capabilities", () => {
    assert(dshJob.runtime.version === "0.1.1-rc.2" && dshJob.runtime.internalRetries === 0, "DSH baseline/retry policy mismatch");
    assert(dshJob.permissionProfile.isolation === "disposable_container_or_microvm", "OS isolation requirement missing");
    assert(!dshJob.mayReadOnlineRooms && !dshJob.mayPublishSkill && !dshJob.trainingTruth, "DSH job gained online/publication/training authority");
    let unsafeRejected = false;
    try {
      makeJob({ arm: "dsh", snapshotRef, stagedInput, overrides: { permissionProfile: { ...dshJob.permissionProfile, roomApiAccess: true } } });
    } catch {
      unsafeRejected = true;
    }
    assert(unsafeRejected, "DSH job accepted Room access");
    let floatingRejected = false;
    try {
      makeJob({ arm: "dsh", snapshotRef, stagedInput, overrides: { runtime: { ...dshJob.runtime, version: "latest" } } });
    } catch {
      floatingRejected = true;
    }
    assert(floatingRejected, "floating DSH runtime was accepted");
  });

  await check("dsh_arm_emits_one_sealed_candidate_and_a_budgeted_run_receipt", async () => {
    const adapter = createStarcraftTmgDshSkillGenerationAdapter({
      executor: createExecutor(snapshotRef, "dsh"),
      now: () => ENDED_AT,
    });
    dshResult = await adapter.run({ jobManifest: dshJob, stagedInput, startedAt: STARTED_AT });
    assert(dshResult.ok && dshResult.receipt.disposition === "candidate_emitted", "DSH arm did not emit a candidate");
    assert(dshResult.receipt.dshSessionId === "dsh-session-verifier-1", "DSH session identity was not retained");
    assert(dshResult.receipt.providerAttempts === 2 && dshResult.receipt.retryEvents === 0, "DSH attempt accounting mismatch");
    assert(dshResult.receipt.candidateBundleHash === dshResult.candidate.integrity.hash, "candidate/run binding mismatch");
    assert(dshResult.candidate.skillArtifact.judgeTests.length === 2, "candidate judge tests missing");
    assert(dshResult.candidate.promotionBlockers.length === 3, "candidate promotion blockers missing");
    assert(!dshResult.candidate.canAffectRules && !dshResult.candidate.promotionEligible && !dshResult.candidate.trainingTruth, "DSH candidate self-promoted");
  });

  await check("direct_provider_control_uses_the_same_input_model_tools_and_output_contract", async () => {
    const adapter = createStarcraftTmgDirectSkillControlAdapter({
      executor: createExecutor(snapshotRef, "control"),
      now: () => ENDED_AT,
    });
    controlResult = await adapter.run({ jobManifest: controlJob, stagedInput, startedAt: STARTED_AT });
    assert(controlResult.ok, "direct-provider control arm failed");
    assert(controlJob.stagedInputHash === dshJob.stagedInputHash, "paired arms used different staged input");
    assert(controlJob.providerProfileRef.hash === dshJob.providerProfileRef.hash && controlJob.providerProfileRef.model === dshJob.providerProfileRef.model, "paired arms used different Provider/model");
    assert(controlJob.toolContract.schemaHash === dshJob.toolContract.schemaHash, "paired arms used different tool schema");
    assert(controlJob.budget.maxInputTokens === dshJob.budget.maxInputTokens && controlJob.budget.maxOutputTokens === dshJob.budget.maxOutputTokens, "paired arms used different Token budgets");
    assert(controlResult.receipt.dshSessionId === null && !controlResult.candidate.promotionEligible, "control arm loaded DSH or self-promoted");
  });

  await check("candidate_emission_cardinality_and_worker_output_credentials_fail_closed", async () => {
    const duplicateAdapter = createStarcraftTmgDshSkillGenerationAdapter({ executor: createExecutor(snapshotRef, "duplicate", { duplicateEmission: true }), now: () => ENDED_AT });
    const duplicate = await duplicateAdapter.run({ jobManifest: dshJob, stagedInput, startedAt: STARTED_AT });
    assert(!duplicate.ok && duplicate.reason === "candidate_emission_cardinality_rejected", "multiple candidate emissions were accepted");
    assert(!duplicate.receipt.promotionEligible && duplicate.receipt.candidateBundleHash === null, "cardinality failure published a candidate");

    const leakingAdapter = createStarcraftTmgDshSkillGenerationAdapter({ executor: createExecutor(snapshotRef, "leak", { leakCredential: true }), now: () => ENDED_AT });
    const leaked = await leakingAdapter.run({ jobManifest: dshJob, stagedInput, startedAt: STARTED_AT });
    assert(!leaked.ok && leaked.receipt.failureCode === "OUTPUT_CREDENTIAL_SCAN_FAILED", "credential-bearing worker output was accepted");
    assert(leaked.receipt.outputCredentialScanPassed === false && !JSON.stringify(leaked).includes("should-never-leave-worker"), "credential failure receipt leaked output material");
  });

  await check("staged_input_credentials_are_rejected_before_executor_invocation", async () => {
    let executorCalled = false;
    const adapter = createStarcraftTmgDshSkillGenerationAdapter({
      executor: { async execute() { executorCalled = true; return {}; } },
      now: () => ENDED_AT,
    });
    let rejected = false;
    try {
      await adapter.run({
        jobManifest: dshJob,
        stagedInput: { ...stagedInput, providerSecret: "sk-never-stage-this-value" },
        startedAt: STARTED_AT,
      });
    } catch {
      rejected = true;
    }
    assert(rejected && !executorCalled, "credential-bearing staged input reached executor");
  });

  const report = {
    schemaVersion: "starcraft_tmg_offline_skill_arms_verifier_v1",
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    checks,
    failures,
    evidence: {
      sourceSnapshotHash: snapshot.snapshotHash,
      stagedInputHash: dshJob.stagedInputHash,
      dshJobHash: dshJob.integrity.hash,
      directControlJobHash: controlJob.integrity.hash,
      dshCandidateHash: dshResult?.candidate?.integrity?.hash || null,
      directControlCandidateHash: controlResult?.candidate?.integrity?.hash || null,
      dshRunReceiptHash: dshResult?.receipt?.integrity?.hash || null,
      directControlRunReceiptHash: controlResult?.receipt?.integrity?.hash || null,
      executorEvidence: "injected_fake_execution_ports_only_dsh_not_installed_or_run",
      pairedQualityClaim: "not_evaluated",
      promotions: 0,
      canAffectRules: false,
      productionReady: false,
      trainingTruth: false,
    },
    offlineSkillEvolution: {
      sourceBoundary: "legacy_adapter_unreviewed_plus_platform_authority_contract",
      teachArtifactsGenerated: 0,
      questionTreeNodes: stagedInput.questionTree.length,
      candidateBundles: 2,
      mementoCandidates: 0,
      skillOptPatches: 0,
      heldOutScenariosRun: 0,
      completeGameAbRuns: 0,
      humanReviews: 0,
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["strategy_skill_builder"],
      skillsRead: 0,
      skillsGenerated: 2,
      judgeTestsRun: 0,
      crossTimeReplayResult: "not_run",
      promotions: 0,
      blocks: ["unreviewed source", "Fact/Judge/Cross-Time gates not run", "human promotion absent"],
      remainingRuleGaps: ["official rulebook/source snapshots are not bound", "no executable held-out effect evidence"],
    },
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.ok) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
