import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  assertStarcraftTmgSkillGenerationContract,
  assertStarcraftTmgSkillGenerationCredentialFree,
  createStarcraftTmgCandidateSkillBundle,
  createStarcraftTmgSkillGenerationRunReceipt,
} from "./contracts-v1.mjs";

export const STARCRAFT_TMG_OFFLINE_SKILL_ARM_ADAPTER_VERSION = "starcraft_tmg_offline_skill_arm_adapter_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function failureCode(error) {
  const code = String(error?.code || "");
  return /^[A-Z][A-Z0-9_]{1,63}$/.test(code) ? code : "SKILL_EXECUTION_ARM_FAILED";
}

function createArmAdapter(options, expectedArm) {
  const executor = options.executor;
  if (!executor || typeof executor.execute !== "function") throw new Error("offline Skill executor port is required");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function run(input = {}) {
    const job = assertStarcraftTmgSkillGenerationContract(input.jobManifest, "job-manifest");
    if (job.executionArm !== expectedArm) throw new Error(`expected ${expectedArm} job, received ${job.executionArm}`);
    assertStarcraftTmgSkillGenerationCredentialFree(input.stagedInput, "stagedInput");
    const stagedInputHash = hashStarcraftTmgContract(input.stagedInput);
    if (stagedInputHash !== job.stagedInputHash) throw new Error("staged input hash mismatch");
    const adapterStartedAt = new Date(input.startedAt || now()).toISOString();
    let result;
    try {
      result = await executor.execute(Object.freeze({
        schemaVersion: `${STARCRAFT_TMG_OFFLINE_SKILL_ARM_ADAPTER_VERSION}.executor-request`,
        executionArm: expectedArm,
        jobManifest: clone(job),
        stagedInput: clone(input.stagedInput),
        exposedTools: clone(job.toolContract.allowlist),
        candidateEmissionTool: "emit_candidate_skill",
        mayPublishSkill: false,
        mayReadOnlineRooms: false,
        trainingTruth: false,
      }));
      assertStarcraftTmgSkillGenerationCredentialFree(result, "executorResult");
    } catch (error) {
      const endedAt = new Date(now()).toISOString();
      const credentialScanPassed = !String(error?.message || "").includes("contains credential material");
      const safeExecution = result && typeof result === "object"
        ? result
        : error?.safeExecution && typeof error.safeExecution === "object" ? error.safeExecution : {};
      const receipt = createStarcraftTmgSkillGenerationRunReceipt({
        jobManifest: job,
        startedAt: adapterStartedAt,
        endedAt,
        disposition: "failed",
        finishReason: "executor_failed",
        exitStatus: 1,
        failureCode: credentialScanPassed ? failureCode(error) : "OUTPUT_CREDENTIAL_SCAN_FAILED",
        providerAttempts: safeExecution.providerAttempts || 0,
        retryEvents: safeExecution.retryEvents || 0,
        usage: safeExecution.usage || {},
        estimatedCost: safeExecution.estimatedCost || 0,
        outputCredentialScanPassed: credentialScanPassed,
      });
      return Object.freeze({ ok: false, reason: "skill_execution_arm_failed", receipt });
    }

    const emissions = Array.isArray(result?.candidateEmissions) ? result.candidateEmissions : [];
    if (emissions.length !== 1) {
      const receipt = createStarcraftTmgSkillGenerationRunReceipt({
        jobManifest: job,
        executionSessionId: result?.executionSessionId || result?.dshSessionId,
        startedAt: result?.startedAt || adapterStartedAt,
        endedAt: result?.endedAt || now(),
        disposition: "failed",
        finishReason: "candidate_emission_cardinality_rejected",
        exitStatus: Number.isSafeInteger(result?.exitStatus) ? result.exitStatus : 1,
        failureCode: "CANDIDATE_EMISSION_CARDINALITY_REJECTED",
        providerAttempts: result?.providerAttempts || 0,
        retryEvents: result?.retryEvents || 0,
        usage: result?.usage || {},
        estimatedCost: result?.estimatedCost || 0,
        sessionLogRef: result?.sessionLogRef,
        sessionLogHash: result?.sessionLogHash,
        outputCredentialScanPassed: true,
      });
      return Object.freeze({ ok: false, reason: "candidate_emission_cardinality_rejected", receipt });
    }

    let candidate;
    try {
      candidate = createStarcraftTmgCandidateSkillBundle({
        jobManifest: job,
        ...clone(emissions[0]),
      });
    } catch (error) {
      const receipt = createStarcraftTmgSkillGenerationRunReceipt({
        jobManifest: job,
        executionSessionId: result?.executionSessionId || result?.dshSessionId,
        startedAt: result?.startedAt || adapterStartedAt,
        endedAt: result?.endedAt || now(),
        disposition: "failed",
        finishReason: "candidate_contract_rejected",
        exitStatus: 1,
        failureCode: "CANDIDATE_CONTRACT_REJECTED",
        providerAttempts: result?.providerAttempts || 0,
        retryEvents: result?.retryEvents || 0,
        usage: result?.usage || {},
        estimatedCost: result?.estimatedCost || 0,
        sessionLogRef: result?.sessionLogRef,
        sessionLogHash: result?.sessionLogHash,
        outputCredentialScanPassed: true,
      });
      return Object.freeze({ ok: false, reason: "candidate_contract_rejected", receipt });
    }

    const receipt = createStarcraftTmgSkillGenerationRunReceipt({
      jobManifest: job,
      candidateBundle: candidate,
      executionSessionId: result?.executionSessionId || result?.dshSessionId,
      startedAt: result?.startedAt || adapterStartedAt,
      endedAt: result?.endedAt || now(),
      disposition: "candidate_emitted",
      finishReason: result?.finishReason || "completed",
      exitStatus: result?.exitStatus || 0,
      providerAttempts: result?.providerAttempts || 0,
      retryEvents: result?.retryEvents || 0,
      usage: result?.usage || {},
      estimatedCost: result?.estimatedCost || 0,
      sessionLogRef: result?.sessionLogRef,
      sessionLogHash: result?.sessionLogHash,
      outputCredentialScanPassed: true,
    });
    return Object.freeze({
      ok: true,
      executionArm: expectedArm,
      candidate,
      receipt,
      mayPublishSkill: false,
      promotionEligible: false,
      trainingTruth: false,
    });
  }

  return Object.freeze({ run });
}

export function createStarcraftTmgDshSkillGenerationAdapter(options = {}) {
  return createArmAdapter(options, "dsh");
}

export function createStarcraftTmgDirectSkillControlAdapter(options = {}) {
  return createArmAdapter(options, "direct_provider_control");
}
