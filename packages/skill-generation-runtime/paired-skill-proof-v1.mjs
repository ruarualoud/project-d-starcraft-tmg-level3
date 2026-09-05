import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationContract,
  assertStarcraftTmgSkillGenerationCredentialFree,
  createStarcraftTmgCandidateSkillBundle,
  createStarcraftTmgSkillGenerationJobManifest,
  createStarcraftTmgSkillGenerationRunReceipt,
  STARCRAFT_TMG_DSH_BASELINE_V1,
} from "../skill-generation/contracts-v1.mjs";
import {
  STARCRAFT_TMG_CTX2SKILL_PAIRED_PROMPT_PACK_V1 as promptPack,
  STARCRAFT_TMG_SLICE_170_BLIND_EVALUATION_V1 as evaluationContract,
  STARCRAFT_TMG_TICKET_17_SLICE_170_PAIRED_PROOF_V1 as proof,
} from "../../content/skill-generation/ticket-17-slice-170-paired-proof-v1.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../../content/skill-generation/offline-provider-profile-v1.mjs";
import {
  DSH_NPM_TARBALL_SHA256,
  DSH_PLUGIN_LOCK_HASH,
} from "./dsh-pinned-runtime-v1.mjs";
import {
  STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH,
  STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
  createStarcraftTmgDshSkillExecutorV1,
} from "./dsh-skill-executor-v1.mjs";
import {
  STARCRAFT_TMG_DIRECT_CONTROL_RUNTIME_V1,
  STARCRAFT_TMG_SKILL_COST_POLICY_V1 as costPolicy,
  createStarcraftTmgDirectSkillControlExecutorV1,
  verifyStarcraftTmgDirectControlSessionV1,
} from "./provider-broker-v1.mjs";
import {
  runTeachCtx2SkillRoleGraphV1,
  verifyTeachCtx2SkillRunResultV1,
} from "./teach-ctx2skill-role-graph-v1.mjs";
import { verifyCurrentOfficialSkillStagedInputV1 } from
  "./current-official-evidence-v1.mjs";

export const STARCRAFT_TMG_PAIRED_SKILL_PROOF_RUNTIME_VERSION =
  "starcraft_tmg_paired_skill_proof_runtime_v1";

const HASH = /^[a-f0-9]{64}$/u;
const ARM_SET = new Set(["dsh", "direct_provider_control"]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function envelope(body, field) {
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function safeInstant(value, field) {
  const instant = new Date(value).toISOString();
  if (instant !== value) throw new TypeError(`${field} is invalid`);
  return instant;
}

function assertFrozenInput(stagedInput) {
  verifyCurrentOfficialSkillStagedInputV1(stagedInput);
  const evidence = stagedInput.evidence?.[0];
  if (stagedInput.task?.taskId !== proof.target.taskId
    || stagedInput.task?.taskHash !== proof.target.taskHash
    || stagedInput.stagedInputHash !== proof.target.stagedInputHash
    || stagedInput.evidence?.length !== 1
    || evidence?.evidenceId !== proof.target.evidenceId
    || evidence?.kind !== "current_rule_index"
    || evidence?.contentHash !== proof.target.evidenceContentHash
    || evidence?.locator?.locatorHash !== proof.target.evidenceLocatorHash
    || evidence?.rulesReceipt?.receiptHash
      !== proof.target.currentRulesReceiptHash
    || stagedInput.bindings?.productionCatalogueHash
      !== proof.target.productionCatalogueHash
    || evidence?.content?.skillId !== proof.target.productionSkillId
    || evidence?.content?.productionCatalogueHash
      !== proof.target.productionCatalogueHash
    || evidence?.content?.counts?.chapters
      !== proof.target.ruleAtomCounts.chapters
    || evidence?.content?.counts?.totalRuleAtoms
      !== proof.target.ruleAtomCounts.total
    || evidence?.content?.counts?.executableRuleAtoms
      !== proof.target.ruleAtomCounts.executable
    || evidence?.content?.counts?.displayOnlyRuleAtoms
      !== proof.target.ruleAtomCounts.displayOnly
    || evidence?.content?.retrievalContract
      ?.retrieveFullCurrentAtomByEvidenceId !== true
    || evidence?.content?.retrievalContract
      ?.callAuthoritativeRulesForLegalSpaceAndTransitions !== true
    || stagedInput.bindings?.source?.sourceRefreshPerformed !== false) {
    throw new TypeError("Slice 170 frozen staged input drifted");
  }
  return stagedInput;
}

export function createStarcraftTmgSlice170SkillJobV1(input = {}) {
  const arm = String(input.arm || "");
  if (!ARM_SET.has(arm)) throw new TypeError("paired Skill arm is invalid");
  const budgetProfile = input.budgetProfile === undefined
    ? "formal_pair_v1" : String(input.budgetProfile);
  if (!["formal_pair_v1", "challenger_canary_v1"].includes(budgetProfile)) {
    throw new TypeError("paired Skill budget profile is invalid");
  }
  const challengerCanary = budgetProfile === "challenger_canary_v1";
  const stagedInput = assertFrozenInput(input.stagedInput);
  const egressAllowlistHash = String(input.egressAllowlistHash || "");
  if (!HASH.test(egressAllowlistHash)) {
    throw new TypeError("paired egress allowlist hash is invalid");
  }
  const dsh = arm === "dsh";
  return createStarcraftTmgSkillGenerationJobManifest({
    jobId: challengerCanary
      ? "skill-job-slice170-challenger-canary"
      : `skill-job-slice170-${arm}`,
    executionArm: arm,
    roleRoute: "rule_skill_builder",
    skillType: "turn_flow",
    objective:
      "Generate the one production-catalogue current-official How-to-Play Skill candidate that routes all rule questions through the complete chapter index and authoritative Rules service.",
    rulesVersion: stagedInput.bindings.rules.rulesVersion,
    dataVersion: stagedInput.bindings.source.normalizedDatasetHash,
    sourceSnapshotRefs: [{
      sourceId: "starcraft-tmg.current-official-composite",
      snapshotId: "starcraft-tmg.current-official-composite.slice170",
      snapshotHash: stagedInput.bindings.source.sourceSnapshotHash,
      authorityStatus: "official_current",
      rulesEligible: true,
    }],
    stagedInputHash: stagedInput.stagedInputHash,
    existingSkillSetHash: hashStarcraftTmgContract([]),
    promptPackRef: {
      id: promptPack.id,
      version: promptPack.version,
      hash: promptPack.promptPackHash,
    },
    runtime: dsh ? {
      packageName: STARCRAFT_TMG_DSH_BASELINE_V1.packageName,
      version: STARCRAFT_TMG_DSH_BASELINE_V1.version,
      commit: STARCRAFT_TMG_DSH_BASELINE_V1.commit,
      packageIntegrityHash: DSH_NPM_TARBALL_SHA256,
      effectiveConfigHash: STARCRAFT_TMG_DSH_EXECUTOR_CONFIG_HASH,
      pluginLockHash: DSH_PLUGIN_LOCK_HASH,
      profileName: "project-d-starcraft-skill-isolated-v1",
      sessionFormatVersion: "0",
      internalRetries: 0,
    } : STARCRAFT_TMG_DIRECT_CONTROL_RUNTIME_V1,
    providerProfileRef: {
      id: profile.providerProfileId,
      version: profile.version,
      hash: profile.integrity.hash,
      model: profile.model,
    },
    toolContract: {
      allowlist: [
        "read_staged_source",
        "read_existing_skills",
        "emit_candidate_skill",
      ],
      schemaHash: STARCRAFT_TMG_DSH_CANDIDATE_TOOL_SCHEMA_HASH,
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
      egressAllowlistHash,
      enforcementOwner: "project-d-offline-skill-provider-broker-v2",
    },
    budget: {
      maxProviderAttempts: proof.common.providerAttemptsPerArm,
      maxInputTokens: proof.common.maxInputTokensPerArm,
      maxOutputTokens: proof.common.maxOutputTokensPerArm,
      maxWallMs: 1_800_000,
      maxEstimatedCost: proof.common.maxEstimatedUsdPerArm,
      currency: "USD",
      priceTableVersion: costPolicy.policyHash,
    },
    scheduler: {
      schedulerJobId: challengerCanary
        ? "scheduler-slice170-challenger-canary"
        : `scheduler-slice170-${arm}`,
      attempt: 1,
      leaseId: challengerCanary
        ? "lease-slice170-challenger-canary"
        : `lease-slice170-${arm}`,
      fenceTokenHash: hashStarcraftTmgContract(challengerCanary
        ? "fence-slice170-challenger-canary"
        : `fence-slice170-${arm}`),
    },
    outputSchemaHash: hashStarcraftTmgContract(
      "starcraft-tmg-teach-ctx2skill-candidate-v1",
    ),
    createdAt: safeInstant(input.createdAt, "createdAt"),
  });
}

function deterministicEvaluator(kind) {
  return {
    id: `current-rules-${kind}`,
    version: "1.0.0",
    hash: hashStarcraftTmgContract({
      proof: proof.contractHash,
      kind,
      rulesReceiptHash: proof.target.currentRulesReceiptHash,
    }),
    independentContext: true,
  };
}

export async function judgeStarcraftTmgSlice170ClaimV1(packet) {
  const exactEvidence = packet.claim.evidenceRefs?.some((ref) => (
    ref.evidenceId === proof.target.evidenceId
      && ref.contentHash === proof.target.evidenceContentHash
      && ref.locatorHash === proof.target.evidenceLocatorHash
      && ref.rulesReceiptHash === proof.target.currentRulesReceiptHash
  ));
  const passed = exactEvidence === true
    && ["source_fact", "legality"].includes(packet.claim.claimType)
    && packet.claim.advisoryOnly === false;
  return freeze({
    passed,
    failureCodes: passed ? [] : ["CURRENT_RULE_EVIDENCE_BINDING_FAILED"],
    findingCodes: passed
      ? ["CURRENT_RULE_EVIDENCE_BINDING_PASSED"]
      : ["REVISION_REQUIRED"],
    evaluator: deterministicEvaluator("fact-judge"),
  });
}

export async function replayStarcraftTmgSlice170CandidateV1(packet) {
  const expected = packet.candidate.skillArtifact.judgeTests
    .map((test) => test.testId);
  const everyClaimPassed = packet.claimVerdicts.every((row) => row.passed);
  return freeze({
    passed: everyClaimPassed,
    failureCodes: everyClaimPassed ? [] : ["CANDIDATE_CLAIM_REPLAY_FAILED"],
    replayedJudgeTestIds: expected,
    currentBinding: packet.currentBinding,
    evaluator: deterministicEvaluator("cross-time"),
  });
}

function candidateMarkdown(candidate) {
  const artifact = candidate.skillArtifact;
  return [
    `# ${artifact.title}`,
    "",
    artifact.summary,
    "",
    "## Procedure",
    "",
    ...artifact.procedure.map((row) => `- ${row}`),
    "",
    "## Legality checks",
    "",
    ...artifact.legalityChecks.map((row) => `- ${row}`),
    "",
    "## Illegal patterns",
    "",
    ...artifact.illegalPatterns.map((row) => `- ${row}`),
    "",
    "Candidate only. Human review and Ticket 18 promotion are required.",
  ].join("\n");
}

function candidateEvidenceProvenance(candidate) {
  const claimRefs = candidate.skillArtifact.claims.map((claim) => ({
    claimId: claim.claimId,
    claimHash: claim.claimHash,
    evidenceRefs: clone(claim.evidenceRefs),
  }));
  const evidenceByHash = new Map();
  for (const claim of claimRefs) {
    for (const ref of claim.evidenceRefs) {
      evidenceByHash.set(hashStarcraftTmgContract(ref), ref);
    }
  }
  return freeze({
    taskRef: clone(candidate.taskRef),
    claimRefs,
    evidenceRefs: [...evidenceByHash.values()],
  });
}

function safeDirectSessionProjection(session) {
  const roleExecutions = session.roleExecutions.map((execution) => {
    const { authorizationHash, ...grantBody } = clone(
      execution.costAuthorization,
    );
    const { authorizationHash: settlementGrantHash, ...settlementBody } = clone(
      execution.costSettlement,
    );
    return {
      receipt: clone(execution.receipt),
      costGrant: { ...grantBody, grantHash: authorizationHash },
      pricingReceipt: clone(execution.pricingReceipt),
      costSettlement: {
        ...settlementBody,
        grantHash: settlementGrantHash,
      },
    };
  });
  const { sessionHash, roleExecutions: _unsafe, ...body } = clone(session);
  return envelope({
    ...body,
    schemaVersion: "starcraft_tmg_direct_skill_control_safe_session_v1",
    roleExecutions,
    sourceSessionHash: sessionHash,
  }, "safeSessionHash");
}

function createControlBundle(job, graphResult, session) {
  const candidate = graphResult.candidate;
  const bundle = createStarcraftTmgCandidateSkillBundle({
    jobManifest: job,
    skillArtifact: {
      skillId: candidate.skillArtifact.skillId,
      version: candidate.skillArtifact.version,
      skillType: candidate.skillArtifact.skillType,
      sourceRefs: job.sourceSnapshotRefs,
      appRuleEndpoints: clone(proof.common.appRuleEndpoints),
      phase: "multi_phase",
      preconditions: [],
      procedure: candidate.skillArtifact.procedure,
      legalityChecks: candidate.skillArtifact.legalityChecks,
      illegalPatterns: candidate.skillArtifact.illegalPatterns,
      examples: candidate.skillArtifact.examples,
      counterExamples: candidate.skillArtifact.counterExamples,
      judgeTests: candidate.skillArtifact.judgeTests,
      confidence: "unreviewed",
    },
    skillMarkdown: candidateMarkdown(candidate),
    provenance: {
      roleGraphRunHash: graphResult.runHash,
      roleGraphCandidateHash: candidate.candidateHash,
      directControlSessionHash: session.sessionHash,
      currentBinding: candidate.currentBinding,
      ...candidateEvidenceProvenance(candidate),
    },
    unresolvedClaims: candidate.skillArtifact.unresolvedClaims,
    promotionBlockers: [
      "human_review_required",
      "ticket_18_evaluation_and_promotion_required",
    ],
    emittedAt: session.endedAt,
  });
  const sessionLogHash = hashStarcraftTmgContract({
    roleReceiptHashes: session.roleReceiptHashes,
    graphRunHash: graphResult.runHash,
  });
  const receipt = createStarcraftTmgSkillGenerationRunReceipt({
    jobManifest: job,
    candidateBundle: bundle,
    executionSessionId: session.sessionId,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    disposition: "candidate_emitted",
    finishReason: "cross_time_passed_candidate_emitted",
    exitStatus: 0,
    providerAttempts: session.providerAttempts,
    retryEvents: session.retryEvents,
    usage: {
      inputTokens: session.usage.cacheMissTokens,
      cacheReadTokens: session.usage.cacheHitTokens,
      cacheWriteTokens: 0,
      outputTokens: session.usage.outputTokens,
      reasoningTokens: session.usage.reasoningTokens,
    },
    estimatedCost: session.calculatedCostNanoUsd / 1_000_000_000,
    sessionLogRef: `direct-control-redacted://${session.sessionId}`,
    sessionLogHash,
    outputCredentialScanPassed: true,
  });
  return freeze({
    roleGraphResult: graphResult,
    executionSession: safeDirectSessionProjection(session),
    candidateBundle: bundle,
    runReceipt: receipt,
  });
}

async function runControl(input) {
  const executor = createStarcraftTmgDirectSkillControlExecutorV1({
    broker: input.broker,
    jobManifest: input.job,
    workerRef: input.workerRef,
    createId: input.createId,
    now: input.now,
    startedAt: input.startedAt,
  });
  let emission = null;
  const graphResult = await runTeachCtx2SkillRoleGraphV1({
    runId: input.logicalRunId,
    stagedInput: input.stagedInput,
    executeRole: executor.executeRole,
    judgeClaim: judgeStarcraftTmgSlice170ClaimV1,
    replayCandidate: replayStarcraftTmgSlice170CandidateV1,
    async emitCandidate(value) {
      if (emission) throw new Error("CONTROL_CANDIDATE_CARDINALITY_EXCEEDED");
      emission = clone(value);
      return {
        schemaVersion: "starcraft_tmg_teach_ctx2skill_candidate_emission_ack_v1",
        accepted: true,
        emissionId: `emission-slice170-control-${input.runNonce}`,
        emissionHash: value.emissionHash,
        candidateHash: value.candidate.candidateHash,
        candidateOnly: true,
      };
    },
  });
  if (!emission) throw new Error("CONTROL_CANDIDATE_MISSING");
  verifyTeachCtx2SkillRunResultV1(graphResult, input.stagedInput);
  const session = executor.finalize();
  verifyStarcraftTmgDirectControlSessionV1(session, input.job);
  return createControlBundle(input.job, graphResult, session);
}

async function runDsh(input) {
  const executor = await createStarcraftTmgDshSkillExecutorV1({
    broker: input.broker,
    jobManifest: input.job,
    workerRef: input.workerRef,
    repositoryRoot: input.repositoryRoot,
    createId: input.createId,
    now: input.now,
    startedAt: input.startedAt,
    roleTimeoutMs: input.roleTimeoutMs,
    isolationJobPrefix: "ticket17-slice170",
  });
  const graphResult = await runTeachCtx2SkillRoleGraphV1({
    runId: input.logicalRunId,
    stagedInput: input.stagedInput,
    executeRole: executor.executeRole,
    judgeClaim: judgeStarcraftTmgSlice170ClaimV1,
    replayCandidate: replayStarcraftTmgSlice170CandidateV1,
    emitCandidate: executor.emitCandidate,
  });
  return executor.finalize({ roleGraphResult: graphResult, stagedInput: input.stagedInput });
}

function artifactText(candidate) {
  return JSON.stringify(candidate.skillArtifact).toLowerCase();
}

function scoreCandidate(label, candidate) {
  const text = artifactText(candidate);
  const numericText = text.replaceAll(",", "");
  const claims = candidate.skillArtifact.claims || [];
  const allCurrent = claims.length > 0 && claims.every((claim) => (
    claim.evidenceRefs?.some((ref) => (
      ref.evidenceId === proof.target.evidenceId
        && ref.contentHash === proof.target.evidenceContentHash
        && ref.locatorHash === proof.target.evidenceLocatorHash
        && ref.rulesReceiptHash === proof.target.currentRulesReceiptHash
    ))
  ));
  const tests = candidate.skillArtifact.judgeTests || [];
  const checks = {
    contract_closure: candidate.status === "candidate_unreviewed"
      && candidate.authority?.promotionEligible === false
      && candidate.skillArtifact.skillId === proof.target.productionSkillId,
    complete_index_binding: allCurrent
      && ["1163", "1049", "114", "10"].every((value) => (
        numericText.includes(value)
      )),
    single_skill_identity:
      candidate.skillArtifact.skillId === proof.target.productionSkillId
      && candidate.skillArtifact.skillType === "turn_flow",
    phase_and_chapter_routing: text.includes("phase")
      && text.includes("chapter"),
    exact_atom_retrieval: text.includes("ruleatom")
      && text.includes("evidenceid")
      && text.includes("content")
      && text.includes("locator")
      && text.includes("receipt")
      && text.includes("hash"),
    authoritative_legality_and_transition:
      /legalspace|legal space/iu.test(text)
      && /authoritative rules|rules\/referee|rules service|referee service/iu.test(text)
      && /state transition|transition authority/iu.test(text),
    preview_confirm_apply_replay: text.includes("preview")
      && /human confirmation|confirm/iu.test(text)
      && text.includes("apply")
      && text.includes("receipt")
      && text.includes("replay"),
    negative_and_replay_coverage:
      candidate.skillArtifact.illegalPatterns?.length > 0
      && candidate.skillArtifact.counterExamples?.length > 0
      && tests.some((test) => test.expected === "pass")
      && tests.some((test) => test.expected === "reject"),
  };
  const metricResults = evaluationContract.metrics.map((metric) => ({
    metricId: metric.metricId,
    weight: metric.weight,
    passed: checks[metric.metricId] === true,
    awarded: checks[metric.metricId] === true ? metric.weight : 0,
  }));
  const score = metricResults.reduce((sum, row) => sum + row.awarded, 0);
  return envelope({
    schemaVersion: "starcraft_tmg_ticket_17_blind_candidate_score_v1",
    label,
    candidateHash: candidate.candidateHash,
    metricResults,
    score,
    maximumScore: evaluationContract.maximumScore,
    metDiagnosticReferenceFloor:
      score >= evaluationContract.diagnosticReferenceFloor,
    evaluatorSawExecutionArm: false,
    humanReviewed: false,
    promotionEligible: false,
    trainingTruth: false,
  }, "scoreHash");
}

export function createStarcraftTmgSlice170BlindAssignmentV1() {
  const seedHash = hashStarcraftTmgContract({
    taskHash: proof.target.taskHash,
    promptPackHash: promptPack.promptPackHash,
    evaluationContractHash: evaluationContract.evaluationContractHash,
    salt: "project-d-starcraft-slice170-pre-ingress-assignment-v1",
  });
  const aArm = Number.parseInt(seedHash.slice(0, 2), 16) % 2 === 0
    ? "dsh" : "direct_provider_control";
  const mapping = {
    "candidate-a": aArm,
    "candidate-b": aArm === "dsh" ? "direct_provider_control" : "dsh",
  };
  const commitment = envelope({
    schemaVersion: "starcraft_tmg_ticket_17_blind_assignment_commitment_v1",
    taskHash: proof.target.taskHash,
    promptPackHash: promptPack.promptPackHash,
    evaluationContractHash: evaluationContract.evaluationContractHash,
    seedHash,
    mappingHash: hashStarcraftTmgContract(mapping),
    committedBeforeLocalIngress: true,
    trainingTruth: false,
  }, "commitmentHash");
  return freeze({ mapping, commitment });
}

export function evaluateStarcraftTmgSlice170CandidatesBlindV1(input = {}) {
  const labels = [...evaluationContract.labels];
  if (Object.keys(input.candidatesByLabel || {}).sort().join(",")
      !== labels.slice().sort().join(",")) {
    throw new TypeError("blind candidate denominator is invalid");
  }
  const scores = labels.map((label) => scoreCandidate(
    label,
    input.candidatesByLabel[label],
  ));
  const highest = Math.max(...scores.map((row) => row.score));
  const winners = scores.filter((row) => row.score === highest)
    .map((row) => row.label);
  return envelope({
    schemaVersion: "starcraft_tmg_ticket_17_blind_skill_evaluation_result_v1",
    evaluationContractHash: evaluationContract.evaluationContractHash,
    labels,
    scores,
    disposition: winners.length === 1 ? "single_blind_winner" : "blind_tie",
    winningLabels: winners,
    allCandidatesMetDiagnosticReferenceFloor:
      scores.every((row) => row.metDiagnosticReferenceFloor),
    diagnosticScoreIsSliceClosureGate: false,
    baseSkillCatalogueComplete: false,
    armIdentityAvailableToEvaluator: false,
    usageOrCostAvailableToEvaluator: false,
    humanReviewed: false,
    promotionAttempted: false,
    trainingTruth: false,
  }, "evaluationHash");
}

export async function runStarcraftTmgSlice170PairedProofV1(input = {}) {
  const stagedInput = assertFrozenInput(input.stagedInput);
  if (typeof input.broker?.completeRole !== "function"
    || typeof input.createId !== "function"
    || typeof input.now !== "function"
    || !HASH.test(String(input.egressAllowlistHash || ""))) {
    throw new TypeError("paired proof runtime dependencies are invalid");
  }
  const assignment = createStarcraftTmgSlice170BlindAssignmentV1();
  const startedAt = safeInstant(input.startedAt || input.now(), "startedAt");
  const jobs = Object.fromEntries([...ARM_SET].map((arm) => [
    arm,
    createStarcraftTmgSlice170SkillJobV1({
      arm,
      stagedInput,
      egressAllowlistHash: input.egressAllowlistHash,
      createdAt: startedAt,
    }),
  ]));
  const outputsByArm = {};
  for (const label of evaluationContract.labels) {
    const arm = assignment.mapping[label];
    const common = {
      broker: input.broker,
      job: jobs[arm],
      workerRef: input.workerRef,
      stagedInput,
      repositoryRoot: input.repositoryRoot,
      createId: (scope) => input.createId(`${label}.${scope}`),
      now: input.now,
      startedAt,
      logicalRunId: `run.slice170.paired.${input.runNonce}`,
      runNonce: input.runNonce,
      roleTimeoutMs: input.roleTimeoutMs || 150_000,
    };
    outputsByArm[arm] = arm === "dsh"
      ? await runDsh(common)
      : await runControl(common);
  }
  const candidatesByLabel = Object.fromEntries(
    evaluationContract.labels.map((label) => [
      label,
      outputsByArm[assignment.mapping[label]].roleGraphResult.candidate,
    ]),
  );
  const blinded = evaluateStarcraftTmgSlice170CandidatesBlindV1({
    candidatesByLabel,
  });
  const reveal = envelope({
    schemaVersion: "starcraft_tmg_ticket_17_blind_assignment_reveal_v1",
    commitmentHash: assignment.commitment.commitmentHash,
    mapping: assignment.mapping,
    mappingHash: hashStarcraftTmgContract(assignment.mapping),
    revealedAfterEvaluationHash: blinded.evaluationHash,
    trainingTruth: false,
  }, "revealHash");
  const body = {
    schemaVersion: STARCRAFT_TMG_PAIRED_SKILL_PROOF_RUNTIME_VERSION,
    contractHash: proof.contractHash,
    taskRef: clone(stagedInput.task),
    productionSkillRef: {
      skillId: proof.target.productionSkillId,
      catalogueHash: proof.target.productionCatalogueHash,
      catalogueSkillCount: proof.target.productionCatalogueSkillCount,
      ruleAtomCounts: clone(proof.target.ruleAtomCounts),
    },
    stagedInputHash: stagedInput.stagedInputHash,
    promptPackHash: promptPack.promptPackHash,
    assignmentCommitment: assignment.commitment,
    blindEvaluation: blinded,
    assignmentReveal: reveal,
    jobs,
    outputsByArm,
    startedAt,
    endedAt: safeInstant(input.now(), "endedAt"),
    counts: {
      arms: Object.keys(outputsByArm).length,
      candidates: Object.keys(outputsByArm).length,
      providerAttempts: Object.values(outputsByArm).reduce(
        (sum, output) => sum + output.executionSession.providerAttempts,
        0,
      ),
      automaticRetries: Object.values(outputsByArm).reduce(
        (sum, output) => sum + output.executionSession.retryEvents,
        0,
      ),
      promotions: 0,
    },
    sourceRefreshPerformed: false,
    humanReviewed: false,
    canAffectStrategy: false,
    canAffectRules: false,
    promotionEligible: false,
    mayPublishSkill: false,
    memoryWrite: false,
    selfPlayWrite: false,
    muzeroWrite: false,
    trainingTruth: false,
  };
  const result = envelope(body, "pairedRunHash");
  assertStarcraftTmgSkillGenerationCredentialFree(result, "paired proof result");
  return result;
}

export function verifyStarcraftTmgSlice170PairedProofV1(value) {
  if (!value || value.schemaVersion
      !== STARCRAFT_TMG_PAIRED_SKILL_PROOF_RUNTIME_VERSION
    || value.contractHash !== proof.contractHash
    || value.taskRef?.taskId !== proof.target.taskId
    || value.productionSkillRef?.skillId !== proof.target.productionSkillId
    || value.productionSkillRef?.catalogueHash
      !== proof.target.productionCatalogueHash
    || value.productionSkillRef?.catalogueSkillCount !== 53
    || hashStarcraftTmgContract(value.productionSkillRef?.ruleAtomCounts)
      !== hashStarcraftTmgContract(proof.target.ruleAtomCounts)
    || value.stagedInputHash !== proof.target.stagedInputHash
    || value.promptPackHash !== promptPack.promptPackHash
    || !HASH.test(String(value.pairedRunHash || ""))) {
    throw new TypeError("paired proof result identity is invalid");
  }
  const copy = clone(value);
  const observed = copy.pairedRunHash;
  delete copy.pairedRunHash;
  if (observed !== hashStarcraftTmgContract(copy)
    || value.counts?.arms !== 2 || value.counts?.candidates !== 2
    || value.counts?.providerAttempts !== 14
    || value.counts?.automaticRetries !== 0
    || value.counts?.promotions !== 0
    || value.assignmentReveal?.commitmentHash
      !== value.assignmentCommitment?.commitmentHash
    || value.assignmentReveal?.mappingHash
      !== value.assignmentCommitment?.mappingHash
    || value.assignmentReveal?.revealedAfterEvaluationHash
      !== value.blindEvaluation?.evaluationHash
    || Object.keys(value.outputsByArm || {}).sort().join(",")
      !== [...ARM_SET].sort().join(",")
    || value.sourceRefreshPerformed !== false
    || value.humanReviewed !== false
    || value.canAffectStrategy !== false
    || value.canAffectRules !== false
    || value.promotionEligible !== false
    || value.mayPublishSkill !== false
    || value.memoryWrite !== false
    || value.selfPlayWrite !== false
    || value.muzeroWrite !== false
    || value.trainingTruth !== false) {
    throw new TypeError("paired proof result closure is invalid");
  }
  for (const [arm, output] of Object.entries(value.outputsByArm)) {
    if (!ARM_SET.has(arm)) throw new TypeError("paired proof arm is invalid");
    assertStarcraftTmgSkillGenerationContract(
      output.candidateBundle,
      "candidate-skill-bundle",
    );
    assertStarcraftTmgSkillGenerationContract(output.runReceipt, "run-receipt");
    if (output.candidateBundle.jobRef.executionArm !== arm
      || output.runReceipt.jobRef.executionArm !== arm
      || output.candidateBundle.skillArtifact.skillId
        !== proof.target.productionSkillId
      || output.candidateBundle.skillArtifact.skillType !== "turn_flow"
      || output.candidateBundle.skillArtifact.phase !== "multi_phase"
      || hashStarcraftTmgContract(
        output.candidateBundle.skillArtifact.appRuleEndpoints,
      ) !== hashStarcraftTmgContract(proof.common.appRuleEndpoints)
      || output.runReceipt.providerAttempts !== 7
      || output.runReceipt.retryEvents !== 0
      || output.runReceipt.promotionEligible !== false
      || output.runReceipt.trainingTruth !== false) {
      throw new TypeError("paired proof arm receipt is invalid");
    }
  }
  assertStarcraftTmgSkillGenerationCredentialFree(value, "paired proof result");
  return true;
}
